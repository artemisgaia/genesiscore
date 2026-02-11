(function () {
  var ORDERS_KEY = 'genesis_core_orders_v1';
  var PENDING_ORDER_KEY = 'genesis_core_pending_order_v1';

  function readOrders() {
    try {
      var parsed = JSON.parse(localStorage.getItem(ORDERS_KEY));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeOrders(orders) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }

  function savePendingOrder(order) {
    try {
      localStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(order || null));
    } catch (error) {
      // no-op
    }
  }

  function clearPendingOrder() {
    try {
      localStorage.removeItem(PENDING_ORDER_KEY);
    } catch (error) {
      // no-op
    }
  }

  function createOrderId() {
    var date = new Date();
    var dayStamp =
      String(date.getFullYear()) +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0');
    return 'GC-' + dayStamp + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
  }

  function setFeedback(message, isError) {
    var node = document.querySelector('[data-checkout-feedback]');
    if (!node) {
      return;
    }

    node.textContent = message || '';
    node.style.color = isError ? 'var(--accent)' : 'var(--success)';
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value || 0));
  }

  function round2(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  function mapOrderItems(cart) {
    return cart
      .map(function (line) {
        var product = window.GenesisCore.getProductById(line.id);
        if (!product) {
          return null;
        }

        return {
          id: product.id,
          name: product.name,
          price: Number(product.price || 0),
          quantity: Number(line.quantity || 0)
        };
      })
      .filter(Boolean);
  }

  function inferUnitWeightLb(product) {
    var format = String((product && product.format) || '').toLowerCase();
    var servings = Number((product && product.servings) || 0);
    var base = 0.3;

    if (format.indexOf('powder') !== -1) base = 1.0;
    else if (format.indexOf('liquid') !== -1) base = 0.85;
    else if (format.indexOf('gumm') !== -1) base = 0.5;
    else if (format.indexOf('tea') !== -1) base = 0.15;
    else if (
      format.indexOf('caps') !== -1 ||
      format.indexOf('softgel') !== -1 ||
      format.indexOf('tablet') !== -1 ||
      format.indexOf('chew') !== -1
    ) {
      base = 0.25;
    }

    if (servings >= 90) base += 0.1;
    if (servings >= 120) base += 0.1;

    return round2(base);
  }

  function estimateParcelWeightLb(cart) {
    var total = cart.reduce(function (sum, line) {
      var product = window.GenesisCore.getProductById(line.id);
      if (!product) {
        return sum;
      }

      var unitWeight = inferUnitWeightLb(product);
      var quantity = Number(line.quantity || 0);
      return sum + unitWeight * quantity;
    }, 0);

    return round2(total);
  }

  function restrictedItemsForDestination(cart, country) {
    var destination = String(country || '').trim();
    if (!destination || destination === 'United States') {
      return [];
    }

    return cart
      .map(function (line) {
        var product = window.GenesisCore.getProductById(line.id);
        if (!product) return null;
        if (String(product.shippingScope || '').toUpperCase() !== 'US_ONLY') return null;
        return product;
      })
      .filter(Boolean);
  }

  function usOnlyItemsInCart(cart) {
    return cart
      .map(function (line) {
        var product = window.GenesisCore.getProductById(line.id);
        if (!product) return null;
        if (String(product.shippingScope || '').toUpperCase() !== 'US_ONLY') return null;
        return product;
      })
      .filter(Boolean);
  }

  function resolveCountryZone(countrySelect, country) {
    var value = String(country || '').trim();
    if (!value || !countrySelect) return null;
    if (value === 'United States') return 'US';

    var options = Array.prototype.slice.call(countrySelect.options || []);
    var option = options.find(function (entry) {
      return entry.value === value;
    });
    if (!option) return null;

    var parent = option.parentElement;
    if (!parent || parent.tagName !== 'OPTGROUP') return null;
    var label = String(parent.label || '').toLowerCase();
    if (label.indexOf('zone 1') !== -1) return 'ZONE1';
    if (label.indexOf('zone 2') !== -1) return 'ZONE2';
    if (label.indexOf('zone 3') !== -1) return 'ZONE3';
    if (label.indexOf('currently unavailable') !== -1) return 'ZONE3';
    return null;
  }

  function isExtendedZoneDestination(countrySelect, country) {
    var value = String(country || '').trim();
    if (!value || !countrySelect) return false;
    var options = Array.prototype.slice.call(countrySelect.options || []);
    var option = options.find(function (entry) {
      return entry.value === value;
    });
    if (!option) return false;
    var parent = option.parentElement;
    if (!parent || parent.tagName !== 'OPTGROUP') return false;
    var label = String(parent.label || '').toLowerCase();
    return label.indexOf('zone 3 extended') !== -1 || label.indexOf('currently unavailable') !== -1;
  }

  function isNonContiguousUS(cityRegion) {
    var text = String(cityRegion || '').toLowerCase();
    if (!text) return false;
    if (text.indexOf('alaska') !== -1 || text.indexOf('hawaii') !== -1) return true;
    if (/\bak\b/.test(text) || /\bhi\b/.test(text)) return true;
    return false;
  }

  function domesticRate(weightLb, nonContiguous) {
    if (weightLb <= 1) return nonContiguous ? 16.99 : 5.99;
    if (weightLb <= 5) return nonContiguous ? 34.99 : 11.99;
    if (weightLb <= 10) return nonContiguous ? 59.99 : 16.99;
    if (weightLb <= 15) return nonContiguous ? 89.99 : 24.99;
    if (weightLb <= 20) return nonContiguous ? 119.99 : 35.0;
    return null;
  }

  function internationalRate(zone, service, weightLb) {
    var regularRates = {
      ZONE1: { upTo2: 11.99, upTo4: 21.99 },
      ZONE2: { upTo2: 11.99, upTo4: 22.99 },
      ZONE3: { upTo2: 14.99, upTo4: 26.99 }
    };
    var expressRates = {
      ZONE1: { upTo2: 29.99, upTo4: 44.99 },
      ZONE2: { upTo2: 31.99, upTo4: 46.99 },
      ZONE3: { upTo2: 38.99, upTo4: 57.99 }
    };

    var table = service === 'express' ? expressRates : regularRates;
    var zoneRates = table[zone];
    if (!zoneRates) return null;
    if (weightLb <= 2) return zoneRates.upTo2;
    if (weightLb <= 4) return zoneRates.upTo4;
    return null;
  }

  function resolveUSRegionMode(usRegionValue, cityRegion) {
    var mode = String(usRegionValue || 'auto').toLowerCase();
    if (mode === 'lower-48') return false;
    if (mode === 'alaska-hawaii') return true;
    return isNonContiguousUS(cityRegion);
  }

  function calculateShipping(cart, country, cityRegion, usRegionValue, shippingService, countrySelect) {
    var weightLb = estimateParcelWeightLb(cart);
    var destination = String(country || '').trim();
    var requestedService = String(shippingService || 'regular').toLowerCase() === 'express' ? 'express' : 'regular';
    var zone = resolveCountryZone(countrySelect, destination);
    var extendedZone = isExtendedZoneDestination(countrySelect, destination);

    if (!destination) {
      return {
        status: 'pending',
        amount: 0,
        label: 'Select shipping destination',
        reasonCode: 'DESTINATION_REQUIRED',
        zone: null,
        service: requestedService,
        weightLb: weightLb
      };
    }

    var restrictedItems = restrictedItemsForDestination(cart, destination);
    if (restrictedItems.length) {
      var blockedNames = restrictedItems
        .slice(0, 3)
        .map(function (product) {
          return product.name;
        })
        .join(', ');
      var suffix = restrictedItems.length > 3 ? ' and ' + (restrictedItems.length - 3) + ' more' : '';
      return {
        status: 'blocked',
        amount: 0,
        label: 'US-only items in cart',
        reasonCode: 'US_ONLY_PRODUCT',
        message:
          'Shipping constraint: ' +
          restrictedItems.length +
          ' item(s) are US-only (' +
          blockedNames +
          suffix +
          '). Select United States or remove these items.',
        zone: zone,
        service: requestedService,
        weightLb: weightLb
      };
    }

    if (!zone) {
      return {
        status: 'blocked',
        amount: 0,
        label: 'Destination unavailable',
        reasonCode: 'DESTINATION_UNSUPPORTED',
        message: destination + ' is not available for automated shipping yet.',
        zone: null,
        service: requestedService,
        weightLb: weightLb
      };
    }

    if (zone === 'US') {
      var nonContiguous = resolveUSRegionMode(usRegionValue, cityRegion);
      var domestic = domesticRate(weightLb, nonContiguous);
      if (domestic == null) {
        return {
          status: 'quote',
          amount: 0,
          label: 'Custom quote required',
          reasonCode: 'WEIGHT_LIMIT',
          message: 'US shipments over 20 lb require a manual shipping quote.',
          zone: zone,
          service: 'regular',
          weightLb: weightLb
        };
      }
      return {
        status: 'ok',
        amount: domestic,
        label: nonContiguous ? 'US standard (Alaska/Hawaii)' : 'US standard (Lower 48)',
        reasonCode: null,
        zone: zone,
        service: 'regular',
        weightLb: weightLb
      };
    }

    var international = internationalRate(zone, requestedService, weightLb);
    if (international == null) {
      return {
        status: 'quote',
        amount: 0,
        label: 'Custom quote required',
        reasonCode: 'WEIGHT_LIMIT',
        message: 'International parcels above 4 lb require a manual shipping quote.',
        zone: zone,
        service: requestedService,
        weightLb: weightLb
      };
    }

    return {
      status: 'ok',
      amount: international,
      label:
        zone +
        (extendedZone ? ' extended' : '') +
        ' ' +
        (requestedService === 'express' ? 'express' : 'regular'),
      reasonCode: null,
      zone: zone,
      service: requestedService,
      weightLb: weightLb
    };
  }

  function prefillFromAccount() {
    var nameInput = document.querySelector('input[name="full_name"]');
    var emailInput = document.querySelector('input[name="email"]');
    var countrySelect = document.querySelector('select[name="country"]');

    if (window.GenesisAccount && window.GenesisAccount.getCurrentUser) {
      var user = window.GenesisAccount.getCurrentUser();
      if (user) {
        if (nameInput && !nameInput.value) {
          nameInput.value = user.name || '';
        }
        if (emailInput && !emailInput.value) {
          emailInput.value = user.email || '';
        }
        if (countrySelect && user.country) {
          countrySelect.value = user.country;
          return;
        }
      }
    }

    if (countrySelect && window.GenesisCore && window.GenesisCore.getDeliveryCountry) {
      countrySelect.value = window.GenesisCore.getDeliveryCountry();
    }
  }

  function toggleServiceOptions(countrySelect, serviceSelect) {
    if (!countrySelect || !serviceSelect) return;

    var zone = resolveCountryZone(countrySelect, countrySelect.value);
    var expressOption = serviceSelect.querySelector('option[value="express"]');

    if (!expressOption) return;

    if (zone === 'US') {
      expressOption.disabled = true;
      if (serviceSelect.value === 'express') {
        serviceSelect.value = 'regular';
      }
    } else {
      expressOption.disabled = false;
    }
  }

  function toggleUSRegionControl(countrySelect, usRegionSelect) {
    if (!countrySelect || !usRegionSelect) return;
    var zone = resolveCountryZone(countrySelect, countrySelect.value);
    var enabled = zone === 'US';
    usRegionSelect.disabled = !enabled;
    if (!enabled) {
      usRegionSelect.value = 'auto';
    }
  }

  function fetchJson(url, options) {
    return fetch(url, options).then(function (response) {
      return response
        .json()
        .catch(function () {
          return {};
        })
        .then(function (payload) {
          if (!response.ok) {
            throw new Error(payload && payload.error ? payload.error : 'Request failed');
          }
          return payload;
        });
    });
  }

  document.addEventListener('DOMContentLoaded', async function () {
    if (!window.GenesisCore) {
      return;
    }

    var form = document.querySelector('[data-checkout-form]');
    var subtotalNode = document.querySelector('[data-checkout-subtotal]');
    var discountNode = document.querySelector('[data-checkout-discount]');
    var shippingNode = document.querySelector('[data-checkout-shipping]');
    var taxNode = document.querySelector('[data-checkout-tax]');
    var totalNode = document.querySelector('[data-checkout-total]');
    var shippingNoteNode = document.querySelector('[data-checkout-shipping-note]');
    var usOnlyNoticeNode = document.querySelector('[data-us-only-checkout-note]');
    var countrySelect = document.querySelector('select[name="country"]');
    var usRegionSelect = document.querySelector('select[name="us_region"]');
    var addressInput = document.querySelector('input[name="address"]');
    var cityRegionInput = document.querySelector('input[name="city_region"]');
    var postalCodeInput = document.querySelector('input[name="postal_code"]');
    var serviceSelect = document.querySelector('select[name="shipping_service"]');
    var removeUnavailableButton = document.querySelector('[data-remove-unavailable-checkout]');
    var submitButton = document.querySelector('[data-checkout-submit]') || (form ? form.querySelector('button[type="submit"]') : null);
    var stripePaymentMount = document.querySelector('[data-stripe-card]');
    var stripeAddressBlock = document.querySelector('[data-stripe-address-block]');
    var stripeAddressMount = document.querySelector('[data-stripe-address]');
    var stripeFeedbackNode = document.querySelector('[data-stripe-feedback]');
    var stripeState = {
      stripe: null,
      elements: null,
      paymentElement: null,
      addressElement: null,
      ready: false,
      paymentElementReady: false,
      activeSignature: '',
      activePaymentIntentId: '',
      activeClientSecret: ''
    };
    var latestSummary = null;
    var isSubmitting = false;
    var refreshPaymentTimer = null;
    var checkoutOrderDraftId = createOrderId();

    if (!form || !subtotalNode || !shippingNode || !taxNode || !totalNode || !countrySelect || !serviceSelect) {
      return;
    }

    function setStripeFeedback(message, isError) {
      if (!stripeFeedbackNode) return;
      stripeFeedbackNode.textContent = message || '';
      stripeFeedbackNode.style.color = isError ? 'var(--accent)' : 'var(--success)';
    }

    function serializeOrderItems(items) {
      var raw = (Array.isArray(items) ? items : [])
        .map(function (item) {
          return String(item.id || '').trim() + ':' + Number(item.quantity || 0);
        })
        .filter(Boolean)
        .join('|');
      return raw.slice(0, 480);
    }

    function getPaymentSignature(summary, cartItems, country, service) {
      var amountCents = Math.round(Number(summary && summary.total || 0) * 100);
      var itemSignature = serializeOrderItems(cartItems);
      return [amountCents, String(country || ''), String(service || ''), itemSignature].join('::');
    }

    function clearPaymentElementState() {
      if (stripeState.paymentElement) {
        try {
          stripeState.paymentElement.unmount();
        } catch (error) {
          // no-op
        }
      }
      stripeState.paymentElement = null;
      if (stripeState.addressElement) {
        try {
          stripeState.addressElement.unmount();
        } catch (error) {
          // no-op
        }
      }
      stripeState.addressElement = null;
      stripeState.elements = null;
      stripeState.paymentElementReady = false;
      stripeState.activeSignature = '';
      stripeState.activePaymentIntentId = '';
      stripeState.activeClientSecret = '';
      if (stripePaymentMount) {
        stripePaymentMount.innerHTML = '';
      }
      if (stripeAddressMount) {
        stripeAddressMount.innerHTML = '';
      }
      if (stripeAddressBlock) {
        stripeAddressBlock.hidden = true;
      }
    }

    function applyAddressFromStripe(address) {
      var payload = address && typeof address === 'object' ? address : {};
      var line = [payload.line1, payload.line2].filter(Boolean).join(' ').trim();
      var cityRegion = [payload.city, payload.state].filter(Boolean).join(', ').trim();
      var postal = String(payload.postal_code || '').trim();

      if (addressInput && line) {
        addressInput.value = line;
      }
      if (cityRegionInput && cityRegion) {
        cityRegionInput.value = cityRegion;
        cityRegionInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (postalCodeInput && postal) {
        postalCodeInput.value = postal;
      }
    }

    function updateSubmitButton(summary) {
      if (!submitButton) return;
      var baseLabel = summary && summary.total != null ? 'Pay ' + formatCurrency(summary.total) : 'Place Order';
      submitButton.textContent = isSubmitting ? 'Processing...' : baseLabel;
      var canSubmit =
        !isSubmitting &&
        summary &&
        summary.subtotal > 0 &&
        summary.shipping &&
        summary.shipping.status === 'ok' &&
        stripeState.paymentElementReady;
      submitButton.disabled = !canSubmit;
    }

    async function initializeStripe() {
      if (!window.Stripe) {
        setStripeFeedback('Stripe SDK did not load. Refresh and try again.', true);
        return;
      }
      if (!stripePaymentMount) {
        setStripeFeedback('Payment field missing on page.', true);
        return;
      }

      try {
        var config = await fetchJson('/api/stripe-config', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store'
        });
        if (!config || !config.publishableKey) {
          setStripeFeedback('Card checkout unavailable. Stripe keys are not configured yet.', true);
          return;
        }

        stripeState.stripe = window.Stripe(config.publishableKey);
        stripeState.ready = true;
      } catch (error) {
        setStripeFeedback(error && error.message ? error.message : 'Unable to initialize Stripe.', true);
      }
    }

    async function ensurePaymentElement(summary, options) {
      var opts = options || {};
      if (!stripeState.ready || !stripeState.stripe) {
        stripeState.paymentElementReady = false;
        updateSubmitButton(summary);
        return false;
      }

      if (!summary || !summary.shipping || summary.shipping.status !== 'ok' || summary.total == null) {
        clearPaymentElementState();
        updateSubmitButton(summary);
        return false;
      }

      var cart = window.GenesisCore.readCart();
      var cartItems = mapOrderItems(cart);
      var country = String(countrySelect.value || '').trim();
      var service = String(serviceSelect.value || 'regular').trim();
      var signature = getPaymentSignature(summary, cartItems, country, service);

      if (!opts.force && signature && signature === stripeState.activeSignature && stripeState.paymentElementReady) {
        return true;
      }

      try {
        stripeState.paymentElementReady = false;
        updateSubmitButton(summary);
        setStripeFeedback('Loading payment methods...', false);

        var payload = await fetchJson('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            amountCents: Math.round(Number(summary.total || 0) * 100),
            currency: 'usd',
            email: String((document.querySelector('input[name="email"]') || {}).value || '').trim(),
            orderDraftId: checkoutOrderDraftId,
            country: country,
            shippingLabel: summary.shipping.label,
            shippingService: summary.shipping.service,
            items: cartItems
          })
        });

        clearPaymentElementState();
        stripeState.elements = stripeState.stripe.elements({
          clientSecret: payload.clientSecret
        });
        stripeState.paymentElement = stripeState.elements.create('payment', {
          layout: 'tabs'
        });
        stripeState.paymentElement.mount(stripePaymentMount);
        stripeState.paymentElement.on('change', function (event) {
          if (event && event.error) {
            setStripeFeedback(event.error.message || 'Payment details are invalid.', true);
            return;
          }
          setStripeFeedback('', false);
        });

        if (stripeAddressBlock) {
          stripeAddressBlock.hidden = country !== 'United States';
        }
        if (country === 'United States' && stripeAddressMount) {
          stripeState.addressElement = stripeState.elements.create('address', {
            mode: 'shipping',
            allowedCountries: ['US'],
            fields: {
              phone: 'never'
            }
          });
          stripeState.addressElement.mount(stripeAddressMount);
          stripeState.addressElement.on('change', function (event) {
            if (event && event.error) {
              setStripeFeedback(event.error.message || 'Address is invalid.', true);
              return;
            }
            if (event && event.value && event.value.address) {
              applyAddressFromStripe(event.value.address);
            }
          });
        }

        stripeState.activePaymentIntentId = String(payload.paymentIntentId || '');
        stripeState.activeClientSecret = String(payload.clientSecret || '');
        stripeState.activeSignature = signature;
        stripeState.paymentElementReady = true;
        setStripeFeedback('Payment methods ready.', false);
        updateSubmitButton(summary);
        return true;
      } catch (error) {
        clearPaymentElementState();
        setStripeFeedback(error && error.message ? error.message : 'Unable to load payment methods.', true);
        updateSubmitButton(summary);
        return false;
      }
    }

    function schedulePaymentElementRefresh(force) {
      if (refreshPaymentTimer) {
        clearTimeout(refreshPaymentTimer);
      }
      refreshPaymentTimer = setTimeout(async function () {
        await ensurePaymentElement(latestSummary, { force: Boolean(force) });
        latestSummary = renderSummary();
      }, 220);
    }

    prefillFromAccount();
    toggleServiceOptions(countrySelect, serviceSelect);
    toggleUSRegionControl(countrySelect, usRegionSelect);

    function renderUSOnlyNotice(cart) {
      if (!usOnlyNoticeNode) {
        return;
      }

      var usOnly = usOnlyItemsInCart(cart);
      if (!usOnly.length) {
        usOnlyNoticeNode.textContent = '';
        return;
      }

      var uniqueNames = [];
      usOnly.forEach(function (item) {
        if (uniqueNames.indexOf(item.name) === -1) {
          uniqueNames.push(item.name);
        }
      });

      var namePreview = uniqueNames.slice(0, 2).join(', ');
      var suffix = uniqueNames.length > 2 ? ' +' + (uniqueNames.length - 2) + ' more' : '';
      usOnlyNoticeNode.textContent =
        'Shipping constraint: ' +
        uniqueNames.length +
        ' item(s) are US shipping only (' +
        namePreview +
        suffix +
        '). Non-US checkout is blocked until removed.';
    }

    function renderSummary() {
      var cart = window.GenesisCore.readCart();
      renderUSOnlyNotice(cart);
      if (!cart.length) {
        subtotalNode.textContent = formatCurrency(0);
        if (discountNode) discountNode.textContent = formatCurrency(0);
        shippingNode.textContent = '--';
        taxNode.textContent = formatCurrency(0);
        totalNode.textContent = '--';
        if (shippingNoteNode) {
          shippingNoteNode.textContent = 'Cart is empty. Add products to continue.';
        }
        var emptySummary = {
          subtotal: 0,
          discount: 0,
          baseSubtotal: 0,
          tax: 0,
          shipping: {
            status: 'empty',
            amount: 0,
            label: 'Cart empty',
            reasonCode: 'EMPTY_CART',
            message: 'Add at least one product to continue.',
            zone: null,
            service: String(serviceSelect.value || 'regular'),
            weightLb: 0
          },
          total: null
        };
        updateSubmitButton(emptySummary);
        return emptySummary;
      }

      var pricing = window.GenesisCore.getCartPricing
        ? window.GenesisCore.getCartPricing(cart)
        : { baseSubtotal: 0, promoDiscount: 0, subtotal: 0 };
      var subtotal = round2(pricing.subtotal);
      var discount = round2(pricing.promoDiscount);
      var country = String(countrySelect.value || '').trim();
      var cityRegion = cityRegionInput ? String(cityRegionInput.value || '').trim() : '';
      var usRegionValue = usRegionSelect ? String(usRegionSelect.value || 'auto') : 'auto';
      var service = String(serviceSelect.value || 'regular');
      var shippingQuote = calculateShipping(cart, country, cityRegion, usRegionValue, service, countrySelect);
      var tax = 0;

      subtotalNode.textContent = formatCurrency(subtotal);
      if (discountNode) {
        discountNode.textContent = discount > 0 ? '-' + formatCurrency(discount) : formatCurrency(0);
      }
      taxNode.textContent = formatCurrency(tax);

      if (shippingQuote.status === 'ok') {
        var grandTotal = round2(subtotal + shippingQuote.amount + tax);
        shippingNode.textContent = formatCurrency(shippingQuote.amount);
        totalNode.textContent = formatCurrency(grandTotal);
        if (shippingNoteNode) {
          shippingNoteNode.textContent =
            shippingQuote.label +
            ' | Est. parcel weight: ' +
            shippingQuote.weightLb.toFixed(2) +
            ' lb';
          if (shippingQuote.label.indexOf('extended') !== -1) {
            shippingNoteNode.textContent += ' | Extended zone estimate. Final carrier acceptance may vary.';
          }
        }
        if (removeUnavailableButton) removeUnavailableButton.hidden = true;
      } else if (shippingQuote.status === 'pending') {
        shippingNode.textContent = '--';
        totalNode.textContent = formatCurrency(subtotal);
        if (shippingNoteNode) {
          shippingNoteNode.textContent = 'Select destination fields to calculate shipping.';
        }
        if (removeUnavailableButton) removeUnavailableButton.hidden = true;
      } else if (shippingQuote.status === 'quote') {
        shippingNode.textContent = 'Custom quote';
        totalNode.textContent = '--';
        if (shippingNoteNode) {
          shippingNoteNode.textContent =
            shippingQuote.message +
            ' Est. parcel weight: ' +
            shippingQuote.weightLb.toFixed(2) +
            ' lb.';
        }
        if (removeUnavailableButton) removeUnavailableButton.hidden = true;
      } else {
        shippingNode.textContent = 'Unavailable';
        totalNode.textContent = '--';
        if (shippingNoteNode) {
          shippingNoteNode.textContent = shippingQuote.message || 'Shipping unavailable for selected destination.';
        }
        if (removeUnavailableButton) {
          removeUnavailableButton.hidden = shippingQuote.reasonCode !== 'US_ONLY_PRODUCT';
        }
      }

      var summary = {
        subtotal: subtotal,
        discount: discount,
        baseSubtotal: round2(pricing.baseSubtotal),
        tax: tax,
        shipping: shippingQuote,
        total:
          shippingQuote.status === 'ok'
            ? round2(subtotal + shippingQuote.amount + tax)
            : null
      };
      updateSubmitButton(summary);
      return summary;
    }

    latestSummary = renderSummary();
    await initializeStripe();
    await ensurePaymentElement(latestSummary, { force: true });
    latestSummary = renderSummary();

    function onShippingInputChange() {
      toggleServiceOptions(countrySelect, serviceSelect);
      toggleUSRegionControl(countrySelect, usRegionSelect);
      if (stripeAddressBlock) {
        stripeAddressBlock.hidden = String(countrySelect.value || '').trim() !== 'United States';
      }
      setFeedback('', false);
      setStripeFeedback('', false);
      latestSummary = renderSummary();
      schedulePaymentElementRefresh(false);
    }

    countrySelect.addEventListener('change', onShippingInputChange);
    serviceSelect.addEventListener('change', onShippingInputChange);
    if (cityRegionInput) {
      cityRegionInput.addEventListener('input', onShippingInputChange);
    }
    if (usRegionSelect) {
      usRegionSelect.addEventListener('change', onShippingInputChange);
    }

    if (removeUnavailableButton) {
      removeUnavailableButton.addEventListener('click', function () {
        if (!window.GenesisCore || !window.GenesisCore.removeUnavailableCartItems) {
          return;
        }
        var removedCount = window.GenesisCore.removeUnavailableCartItems(String(countrySelect.value || '').trim());
        if (removedCount > 0) {
          setFeedback(
            'Removed ' + removedCount + ' undeliverable item(s) for ' + String(countrySelect.value || '').trim() + '.',
            false
          );
        } else {
          setFeedback('No undeliverable items found for this country.', false);
        }
        latestSummary = renderSummary();
        schedulePaymentElementRefresh(true);
      });
    }

    window.addEventListener('genesiscore:locationchange', function (event) {
      if (!countrySelect) return;
      var country = (event && event.detail && event.detail.country) || '';
      if (country) {
        countrySelect.value = country;
        onShippingInputChange();
      }
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();

      if (isSubmitting) {
        return;
      }

      var currentCart = window.GenesisCore.readCart();
      if (!currentCart.length) {
        setFeedback('Cart is empty. Add products before checkout.', true);
        return;
      }

      var summary = renderSummary();
      latestSummary = summary;
      var paymentReady = await ensurePaymentElement(summary, { force: false });
      latestSummary = renderSummary();
      if (!paymentReady || !stripeState.ready || !stripeState.stripe || !stripeState.paymentElement || !stripeState.elements) {
        setFeedback('Payment methods are unavailable. Configure Stripe and retry.', true);
        return;
      }

      if (summary.shipping.status === 'blocked') {
        if (summary.shipping.reasonCode === 'US_ONLY_PRODUCT') {
          setFeedback(summary.shipping.message || 'Selected destination cannot receive US-only items in cart.', true);
        } else if (summary.shipping.reasonCode === 'DESTINATION_UNSUPPORTED') {
          setFeedback(summary.shipping.message || 'Selected destination is not supported for automated shipping.', true);
        } else {
          setFeedback(summary.shipping.message || 'Shipping could not be estimated for the selected destination.', true);
        }
        return;
      }
      if (summary.shipping.status === 'quote') {
        setFeedback(summary.shipping.message || 'Manual shipping quote required before checkout.', true);
        return;
      }
      if (summary.total == null) {
        setFeedback('Select destination details to calculate shipping before placing order.', true);
        return;
      }

      var formData = new FormData(form);
      var orderId = checkoutOrderDraftId;
      var name = String(formData.get('full_name') || '').trim();
      var email = String(formData.get('email') || '').trim();
      var country = String(formData.get('country') || '').trim();
      var address = String(formData.get('address') || '').trim();
      var cityRegion = String(formData.get('city_region') || '').trim();
      var postalCode = String(formData.get('postal_code') || '').trim();

      isSubmitting = true;
      updateSubmitButton(summary);
      setFeedback('', false);
      setStripeFeedback('', false);

      try {
        var pendingOrder = {
          id: orderId,
          createdAt: new Date().toISOString(),
          userId:
            window.GenesisAccount && window.GenesisAccount.getCurrentUser
              ? (window.GenesisAccount.getCurrentUser() || {}).id || null
              : null,
          name: name,
          email: email,
          country: country,
          usRegionMode: String(formData.get('us_region') || 'auto').trim(),
          shippingService: summary.shipping.service,
          shippingZone: summary.shipping.zone,
          shippingLabel: summary.shipping.label,
          estimatedWeightLb: summary.shipping.weightLb,
          address: address,
          cityRegion: cityRegion,
          postalCode: postalCode,
          items: mapOrderItems(currentCart),
          baseSubtotal: summary.baseSubtotal,
          subtotal: summary.subtotal,
          discount: summary.discount,
          shipping: round2(summary.shipping.amount),
          tax: summary.tax,
          total: summary.total,
          status: 'pending_payment',
          paymentIntentId: stripeState.activePaymentIntentId
        };
        savePendingOrder(pendingOrder);

        var returnUrl =
          window.location.origin +
          '/order-confirmation.html?order=' +
          encodeURIComponent(orderId);

        var confirmation = await stripeState.stripe.confirmPayment({
          elements: stripeState.elements,
          confirmParams: {
            return_url: returnUrl,
            receipt_email: email
          },
          redirect: 'if_required'
        });

        if (confirmation.error) {
          throw new Error(confirmation.error.message || 'Payment was not authorized.');
        }

        var paymentIntent = confirmation.paymentIntent;
        if (
          !paymentIntent ||
          ['succeeded', 'processing', 'requires_capture'].indexOf(String(paymentIntent.status || '')) === -1
        ) {
          throw new Error('Payment did not complete. Status: ' + (paymentIntent ? paymentIntent.status : 'unknown'));
        }

        var order = Object.assign({}, pendingOrder, {
          paymentStatus: paymentIntent.status,
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status === 'succeeded' ? 'paid' : 'processing'
        });

        var orders = readOrders();
        orders.unshift(order);
        writeOrders(orders.slice(0, 200));
        clearPendingOrder();

        if (window.GenesisNotifications) {
          window.GenesisNotifications.queueOrderFlow({
            orderId: order.id,
            email: order.email,
            total: formatCurrency(order.total),
            country: order.country
          });
        }

        if (window.GenesisCore.clearCart) {
          window.GenesisCore.clearCart();
        }

        window.location.href = 'order-confirmation.html?order=' + encodeURIComponent(order.id);
      } catch (error) {
        setFeedback(error && error.message ? error.message : 'Payment could not be completed.', true);
        clearPendingOrder();
      } finally {
        isSubmitting = false;
        latestSummary = renderSummary();
      }
    });
  });
})();

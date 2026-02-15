(function () {
  var CART_STORAGE_KEY = 'genesis_core_cart_v1';
  var THEME_STORAGE_KEY = 'genesis_core_theme_v1';
  var LOCATION_STORAGE_KEY = 'genesis_core_location_v1';
  var PROMO_STORAGE_KEY = 'genesis_core_promos_v1';

  var SHIPPING_COUNTRIES = [
    { name: 'United States', code: 'US', zone: 'US' },
    { name: 'Canada', code: 'CA', zone: 'ZONE1' },
    { name: 'Mexico', code: 'MX', zone: 'ZONE1' },
    { name: 'Australia', code: 'AU', zone: 'ZONE2' },
    { name: 'Austria', code: 'AT', zone: 'ZONE2' },
    { name: 'Belgium', code: 'BE', zone: 'ZONE2' },
    { name: 'Bulgaria', code: 'BG', zone: 'ZONE2' },
    { name: 'Croatia', code: 'HR', zone: 'ZONE2' },
    { name: 'Cyprus', code: 'CY', zone: 'ZONE2' },
    { name: 'Czechia', code: 'CZ', zone: 'ZONE2' },
    { name: 'Denmark', code: 'DK', zone: 'ZONE2' },
    { name: 'Estonia', code: 'EE', zone: 'ZONE2' },
    { name: 'Finland', code: 'FI', zone: 'ZONE2' },
    { name: 'France', code: 'FR', zone: 'ZONE2' },
    { name: 'Germany', code: 'DE', zone: 'ZONE2' },
    { name: 'Greece', code: 'GR', zone: 'ZONE2' },
    { name: 'Hungary', code: 'HU', zone: 'ZONE2' },
    { name: 'Ireland', code: 'IE', zone: 'ZONE2' },
    { name: 'Italy', code: 'IT', zone: 'ZONE2' },
    { name: 'Latvia', code: 'LV', zone: 'ZONE2' },
    { name: 'Lithuania', code: 'LT', zone: 'ZONE2' },
    { name: 'Luxembourg', code: 'LU', zone: 'ZONE2' },
    { name: 'Malta', code: 'MT', zone: 'ZONE2' },
    { name: 'Netherlands', code: 'NL', zone: 'ZONE2' },
    { name: 'Norway', code: 'NO', zone: 'ZONE2' },
    { name: 'Poland', code: 'PL', zone: 'ZONE2' },
    { name: 'Portugal', code: 'PT', zone: 'ZONE2' },
    { name: 'Romania', code: 'RO', zone: 'ZONE2' },
    { name: 'Slovakia', code: 'SK', zone: 'ZONE2' },
    { name: 'Slovenia', code: 'SI', zone: 'ZONE2' },
    { name: 'Sweden', code: 'SE', zone: 'ZONE2' },
    { name: 'Switzerland', code: 'CH', zone: 'ZONE2' },
    { name: 'United Kingdom', code: 'GB', zone: 'ZONE2' },
    { name: 'Albania', code: 'AL', zone: 'ZONE3' },
    { name: 'Bosnia and Herzegovina', code: 'BA', zone: 'ZONE3' },
    { name: 'Georgia', code: 'GE', zone: 'ZONE3' },
    { name: 'Gibraltar', code: 'GI', zone: 'ZONE3' },
    { name: 'Iceland', code: 'IS', zone: 'ZONE3' },
    { name: 'Liechtenstein', code: 'LI', zone: 'ZONE3' },
    { name: 'North Macedonia', code: 'MK', zone: 'ZONE3' },
    { name: 'Montenegro', code: 'ME', zone: 'ZONE3' },
    { name: 'Serbia', code: 'RS', zone: 'ZONE3' },
    { name: 'Turkey', code: 'TR', zone: 'ZONE3' },
    { name: 'Moldova', code: 'MD', zone: 'ZONE3_EXT' },
    { name: 'Spain', code: 'ES', zone: 'ZONE3_EXT' },
    { name: 'Saudi Arabia', code: 'SA', zone: 'ZONE3_EXT' },
    { name: 'United Arab Emirates', code: 'AE', zone: 'ZONE3_EXT' },
    { name: 'Egypt', code: 'EG', zone: 'ZONE3_EXT' },
    { name: 'Israel', code: 'IL', zone: 'ZONE3_EXT' },
    { name: 'Japan', code: 'JP', zone: 'ZONE3_EXT' },
    { name: 'South Korea', code: 'KR', zone: 'ZONE3_EXT' },
    { name: 'Thailand', code: 'TH', zone: 'ZONE3_EXT' },
    { name: 'Qatar', code: 'QA', zone: 'ZONE3_EXT' },
    { name: 'Philippines', code: 'PH', zone: 'ZONE3_EXT' }
  ];

  function getProducts() {
    return Array.isArray(window.GENESIS_PRODUCTS) ? window.GENESIS_PRODUCTS : [];
  }

  function getBundles() {
    return Array.isArray(window.GENESIS_BUNDLES) ? window.GENESIS_BUNDLES : [];
  }

  function getProductById(productId) {
    return getProducts().find(function (product) {
      return product.id === productId;
    });
  }

  function findProductByName(name) {
    return getProducts().find(function (product) {
      return product.name === name;
    });
  }

  function getProductHref(product) {
    if (product && product.url) {
      return product.url;
    }
    return 'product.html?id=' + product.id;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  }

  function shippingScopeLabel(product) {
    return String(product && product.shippingScope || '').toUpperCase() === 'US_ONLY'
      ? 'US shipping only'
      : 'Ships to supported destinations';
  }

  function shippingScopeClass(product) {
    return String(product && product.shippingScope || '').toUpperCase() === 'US_ONLY'
      ? 'shipping-note shipping-note--us-only'
      : 'shipping-note';
  }

  function getCountryByName(name) {
    var target = String(name || '').trim().toLowerCase();
    return SHIPPING_COUNTRIES.find(function (entry) {
      return entry.name.toLowerCase() === target;
    }) || null;
  }

  function getCountryByCode(code) {
    var target = String(code || '').trim().toUpperCase();
    return SHIPPING_COUNTRIES.find(function (entry) {
      return entry.code === target;
    }) || null;
  }

  function getStoredLocation() {
    try {
      var parsed = JSON.parse(localStorage.getItem(LOCATION_STORAGE_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return null;
      if (!getCountryByName(parsed.country)) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function detectCountryCodeFromLocale() {
    var languages = [];
    if (Array.isArray(navigator.languages)) {
      languages = navigator.languages.slice();
    }
    if (navigator.language) {
      languages.push(navigator.language);
    }

    for (var i = 0; i < languages.length; i += 1) {
      var raw = String(languages[i] || '');
      if (!raw) continue;
      var parts = raw.split(/[-_]/);
      var region = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
      if (!region) continue;
      if (region === 'UK') region = 'GB';
      if (getCountryByCode(region)) return region;
    }
    return '';
  }

  function normalizeCountryCode(code) {
    var value = String(code || '').trim().toUpperCase();
    if (value === 'UK') value = 'GB';
    return /^[A-Z]{2}$/.test(value) ? value : '';
  }

  function extractGeoCountry(payload) {
    if (!payload || typeof payload !== 'object') return '';

    var codeCandidates = [
      payload.country_code,
      payload.countryCode,
      payload.countryCode2,
      payload.country_iso_code,
      payload.countryCodeIso2
    ];

    if (payload.country && typeof payload.country === 'object') {
      codeCandidates.push(payload.country.code, payload.country.iso_code, payload.country.isoCode);
    }

    if (payload.location && typeof payload.location === 'object') {
      codeCandidates.push(payload.location.country_code, payload.location.countryCode);
      if (payload.location.country && typeof payload.location.country === 'object') {
        codeCandidates.push(payload.location.country.code, payload.location.country.iso_code);
      }
    }

    for (var i = 0; i < codeCandidates.length; i += 1) {
      var normalizedCode = normalizeCountryCode(codeCandidates[i]);
      var byCode = getCountryByCode(normalizedCode);
      if (byCode) return byCode.name;
    }

    var nameCandidates = [payload.country_name, payload.countryName, payload.country];
    if (payload.location && typeof payload.location === 'object') {
      nameCandidates.push(payload.location.country_name, payload.location.countryName, payload.location.country);
    }

    for (var j = 0; j < nameCandidates.length; j += 1) {
      var byName = getCountryByName(nameCandidates[j]);
      if (byName) return byName.name;
    }

    return '';
  }

  function fetchGeoCountry(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var controller = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = setTimeout(function () {
        if (settled) return;
        if (controller) {
          try {
            controller.abort();
          } catch (error) {
            // Ignore abort errors and resolve via fallback endpoint.
          }
        }
        settled = true;
        reject(new Error('Geo request timeout'));
      }, timeoutMs || 2500);

      fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'omit',
        cache: 'no-store',
        signal: controller ? controller.signal : undefined
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Geo response status ' + response.status);
          }
          return response.json();
        })
        .then(function (payload) {
          if (settled) return;
          clearTimeout(timer);
          settled = true;
          var country = extractGeoCountry(payload);
          if (!country) {
            reject(new Error('No supported country in geo payload'));
            return;
          }
          resolve(country);
        })
        .catch(function (error) {
          if (settled) return;
          clearTimeout(timer);
          settled = true;
          reject(error);
        });
    });
  }

  function detectCountryFromEndpoint() {
    var endpoints = ['/api/geo', 'https://ipapi.co/json/', 'https://ipwho.is/'];
    var index = 0;

    return new Promise(function (resolve) {
      function next() {
        if (index >= endpoints.length) {
          resolve('');
          return;
        }
        var endpoint = endpoints[index];
        index += 1;
        fetchGeoCountry(endpoint, 2400)
          .then(function (country) {
            resolve(country);
          })
          .catch(function () {
            next();
          });
      }
      next();
    });
  }

  function detectCountryCodeFromTimezone() {
    var timezone = '';
    try {
      timezone = String(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
    } catch (error) {
      timezone = '';
    }
    if (!timezone) return '';

    var map = {
      'Europe/Madrid': 'ES',
      'Europe/London': 'GB',
      'Europe/Paris': 'FR',
      'Europe/Berlin': 'DE',
      'Europe/Rome': 'IT',
      'Europe/Amsterdam': 'NL',
      'Europe/Warsaw': 'PL',
      'Europe/Stockholm': 'SE',
      'Europe/Zurich': 'CH',
      'America/Toronto': 'CA',
      'America/Vancouver': 'CA',
      'America/Mexico_City': 'MX',
      'Australia/Sydney': 'AU',
      'Asia/Tokyo': 'JP',
      'Asia/Seoul': 'KR',
      'Asia/Dubai': 'AE',
      'Asia/Jerusalem': 'IL',
      'Asia/Manila': 'PH',
      'Asia/Bangkok': 'TH'
    };
    return map[timezone] || '';
  }

  function getAutoDetectedCountryName() {
    var localeCode = detectCountryCodeFromLocale();
    var timezoneCode = detectCountryCodeFromTimezone();
    var byLocale = getCountryByCode(localeCode);
    if (byLocale) return byLocale.name;
    var byTimezone = getCountryByCode(timezoneCode);
    if (byTimezone) return byTimezone.name;
    return 'United States';
  }

  function getLocationState() {
    var stored = getStoredLocation();
    if (stored) return stored;
    return {
      country: getAutoDetectedCountryName(),
      source: 'auto',
      confirmed: false
    };
  }

  function getDeliveryCountry() {
    return getLocationState().country || 'United States';
  }

  function setDeliveryCountry(country, source, confirmed) {
    var entry = getCountryByName(country);
    var payload = {
      country: entry ? entry.name : 'United States',
      source: source || 'manual',
      confirmed: confirmed !== false,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(
      new CustomEvent('genesiscore:locationchange', {
        detail: payload
      })
    );
    return payload;
  }

  function isProductAvailableForCountry(product, country) {
    if (!product) return false;
    var targetCountry = String(country || '').trim() || getDeliveryCountry();
    if (String(product.shippingScope || '').toUpperCase() !== 'US_ONLY') return true;
    return targetCountry === 'United States';
  }

  function getAvailableProducts(products, country) {
    var list = Array.isArray(products) ? products : getProducts();
    var targetCountry = String(country || '').trim() || getDeliveryCountry();
    return list.filter(function (product) {
      return isProductAvailableForCountry(product, targetCountry);
    });
  }

  function readCart() {
    try {
      var parsed = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function readPromotions() {
    try {
      var parsed = JSON.parse(localStorage.getItem(PROMO_STORAGE_KEY));
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map(function (entry) {
          if (!entry || typeof entry !== 'object') return null;
          var itemIds = Array.isArray(entry.itemIds)
            ? entry.itemIds
                .map(function (itemId) {
                  return String(itemId || '').trim();
                })
                .filter(Boolean)
            : [];
          itemIds = Array.from(new Set(itemIds)).filter(function (itemId) {
            return Boolean(getProductById(itemId));
          });
          var discountAmount = roundMoney(entry.discountAmount);
          if (!itemIds.length || discountAmount <= 0) return null;
          return {
            id: String(entry.id || 'promo-' + Math.random().toString(36).slice(2, 10)),
            type: String(entry.type || 'stack'),
            sourceId: String(entry.sourceId || ''),
            label: String(entry.label || 'Stack savings'),
            itemIds: itemIds,
            discountAmount: discountAmount,
            createdAt: String(entry.createdAt || new Date().toISOString())
          };
        })
        .filter(Boolean)
        .slice(-60);
    } catch (error) {
      return [];
    }
  }

  function writePromotions(promotions) {
    var list = Array.isArray(promotions) ? promotions.slice(-60) : [];
    localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(list));
  }

  function clearPromotions() {
    writePromotions([]);
  }

  function writeCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }

  function roundMoney(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  function getProductsTotalByIds(itemIds) {
    return roundMoney(
      (Array.isArray(itemIds) ? itemIds : []).reduce(function (sum, itemId) {
        var product = getProductById(itemId);
        return product ? sum + Number(product.price || 0) : sum;
      }, 0)
    );
  }

  function buildCartQuantityMap(cart) {
    var map = {};
    (Array.isArray(cart) ? cart : []).forEach(function (line) {
      var id = String(line && line.id || '').trim();
      var quantity = Math.max(0, Number(line && line.quantity || 0));
      if (!id || !quantity) return;
      map[id] = (map[id] || 0) + quantity;
    });
    return map;
  }

  function calculateCartPricing(cart, promotions) {
    var lines = Array.isArray(cart) ? cart : [];
    var baseSubtotal = roundMoney(
      lines.reduce(function (sum, item) {
        var product = getProductById(item.id);
        return product ? sum + Number(product.price || 0) * Number(item.quantity || 0) : sum;
      }, 0)
    );

    var activePromotions = Array.isArray(promotions) ? promotions : readPromotions();
    var availableQty = buildCartQuantityMap(lines);
    var appliedPromotions = [];
    var promoDiscount = 0;

    activePromotions.forEach(function (promo) {
      if (!promo || !Array.isArray(promo.itemIds) || !promo.itemIds.length) return;
      var setCount = Infinity;
      promo.itemIds.forEach(function (itemId) {
        setCount = Math.min(setCount, Math.floor(availableQty[itemId] || 0));
      });
      if (!isFinite(setCount) || setCount <= 0) return;

      var setDiscount = roundMoney(Number(promo.discountAmount || 0) * setCount);
      if (setDiscount <= 0) return;

      promo.itemIds.forEach(function (itemId) {
        availableQty[itemId] = Math.max(0, (availableQty[itemId] || 0) - setCount);
      });

      promoDiscount = roundMoney(promoDiscount + setDiscount);
      appliedPromotions.push({
        id: promo.id,
        label: promo.label,
        type: promo.type,
        sourceId: promo.sourceId,
        setCount: setCount,
        discount: setDiscount
      });
    });

    promoDiscount = Math.min(promoDiscount, baseSubtotal);

    return {
      baseSubtotal: baseSubtotal,
      promoDiscount: roundMoney(promoDiscount),
      subtotal: roundMoney(baseSubtotal - promoDiscount),
      appliedPromotions: appliedPromotions
    };
  }

  function addPromotionRecord(record) {
    if (!record || typeof record !== 'object') return;
    var itemIds = Array.isArray(record.itemIds)
      ? Array.from(
          new Set(
            record.itemIds
              .map(function (itemId) {
                return String(itemId || '').trim();
              })
              .filter(Boolean)
          )
        ).filter(function (itemId) {
          return Boolean(getProductById(itemId));
        })
      : [];

    var discountAmount = roundMoney(record.discountAmount);
    if (itemIds.length < 2 || discountAmount <= 0) return;

    var promotions = readPromotions();
    promotions.push({
      id: String(record.id || 'promo-' + Math.random().toString(36).slice(2, 10)),
      type: String(record.type || 'stack'),
      sourceId: String(record.sourceId || ''),
      label: String(record.label || 'Stack savings'),
      itemIds: itemIds,
      discountAmount: discountAmount,
      createdAt: new Date().toISOString()
    });
    writePromotions(promotions);
  }

  function registerBundlePromotion(bundle, itemIds) {
    var ids = Array.isArray(itemIds) ? itemIds.slice() : [];
    if (ids.length < 2 || !bundle) return;
    var compareAt = getProductsTotalByIds(ids);
    if (compareAt <= 0) return;

    var targetPrice = Number(bundle.price || 0);
    if (!(targetPrice > 0 && targetPrice < compareAt)) {
      var pct = Number(bundle.discountPct || 0);
      targetPrice = roundMoney(compareAt * (1 - pct / 100));
    }
    var discountAmount = roundMoney(compareAt - targetPrice);
    if (discountAmount <= 0) return;

    addPromotionRecord({
      id: 'bundle-' + String(bundle.id || 'stack') + '-' + Date.now().toString(36),
      type: 'bundle',
      sourceId: String(bundle.id || ''),
      label: String(bundle.name || 'Bundle savings'),
      itemIds: ids,
      discountAmount: discountAmount
    });
  }

  function registerStackPromotion(itemIds, discountPct) {
    var ids = Array.isArray(itemIds)
      ? itemIds.filter(function (itemId) {
          return Boolean(getProductById(itemId));
        })
      : [];
    if (ids.length < 2) return;

    var compareAt = getProductsTotalByIds(ids);
    if (compareAt <= 0) return;

    var pct = Number(discountPct);
    if (!(pct > 0 && pct < 100)) pct = 10;
    var discounted = roundMoney(compareAt * (1 - pct / 100));
    var discountAmount = roundMoney(compareAt - discounted);
    if (discountAmount <= 0) return;

    addPromotionRecord({
      id: 'stack-' + Date.now().toString(36),
      type: 'stack',
      sourceId: 'quiz-stack',
      label: 'Recommended stack',
      itemIds: ids,
      discountAmount: discountAmount
    });
  }

  function addItemsToCart(productIds, quantity, skipRefresh) {
    var cart = readCart();
    var qty = Math.max(1, Number(quantity || 1));
    (Array.isArray(productIds) ? productIds : []).forEach(function (productId) {
      var id = String(productId || '').trim();
      if (!id || !getProductById(id)) return;
      var index = cart.findIndex(function (line) {
        return line.id === id;
      });
      if (index >= 0) {
        cart[index].quantity += qty;
      } else {
        cart.push({ id: id, quantity: qty });
      }
    });
    writeCart(cart);
    if (!skipRefresh) {
      refreshCartUI();
    }
  }

  function clearCart() {
    writeCart([]);
    clearPromotions();
    refreshCartUI();
  }

  function getCartCount(cart) {
    return cart.reduce(function (sum, item) {
      return sum + item.quantity;
    }, 0);
  }

  function calculateTotal(cart) {
    return calculateCartPricing(cart).subtotal;
  }

  function isCheckoutHref(href) {
    var value = String(href || '').trim();
    if (!value) return false;
    return /(^|\/)checkout\.html(?:$|[?#])/.test(value);
  }

  function setCheckoutGateMessage(message) {
    var nodes = document.querySelectorAll('[data-checkout-gate-message]');
    nodes.forEach(function (node) {
      if (!node.dataset.defaultText) {
        node.dataset.defaultText = node.textContent || '';
      }
      var baseText = node.dataset.defaultText || '';
      node.textContent = message ? (baseText ? baseText + ' ' + message : message) : baseText;
    });
    return nodes.length;
  }

  function ensureGlobalNoticeRegion() {
    var region = document.querySelector('[data-global-notices]');
    if (region) return region;

    region = document.createElement('div');
    region.className = 'global-notices';
    region.setAttribute('data-global-notices', 'true');
    document.body.appendChild(region);
    return region;
  }

  function showGlobalNotice(message, tone, durationMs) {
    if (!message) return;

    var region = ensureGlobalNoticeRegion();
    var notice = document.createElement('div');
    notice.className = 'global-notice global-notice--' + (tone || 'info');
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');

    var text = document.createElement('p');
    text.textContent = message;
    notice.appendChild(text);

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'global-notice__close';
    close.setAttribute('aria-label', 'Dismiss notification');
    close.textContent = 'Close';
    notice.appendChild(close);

    var removed = false;
    function removeNotice() {
      if (removed) return;
      removed = true;
      notice.classList.remove('is-visible');
      window.setTimeout(function () {
        notice.remove();
      }, 180);
    }

    close.addEventListener('click', removeNotice);
    region.appendChild(notice);
    window.requestAnimationFrame(function () {
      notice.classList.add('is-visible');
    });

    window.setTimeout(removeNotice, Number(durationMs) || 4600);
  }

  function notifyUser(message, tone) {
    var notifiedInline = setCheckoutGateMessage(message);
    if (!notifiedInline) {
      showGlobalNotice(message, tone || 'warning');
    }
  }

  function usOnlyItemsInCart(cart) {
    return cart
      .map(function (line) {
        var product = getProductById(line.id);
        if (!product) return null;
        return String(product.shippingScope || '').toUpperCase() === 'US_ONLY' ? product : null;
      })
      .filter(Boolean);
  }

  function unavailableItemsForCountry(cart, country) {
    var targetCountry = String(country || '').trim() || getDeliveryCountry();
    return cart
      .map(function (line) {
        var product = getProductById(line.id);
        if (!product) return null;
        return isProductAvailableForCountry(product, targetCountry) ? null : product;
      })
      .filter(Boolean);
  }

  function removeUnavailableCartItems(country) {
    var targetCountry = String(country || '').trim() || getDeliveryCountry();
    var cart = readCart();
    var kept = cart.filter(function (line) {
      var product = getProductById(line.id);
      return product && isProductAvailableForCountry(product, targetCountry);
    });
    writeCart(kept);
    refreshCartUI();
    return cart.length - kept.length;
  }

  function updateCheckoutGate(cart) {
    var isEmpty = getCartCount(cart) === 0;
    var deliveryCountry = getDeliveryCountry();
    var usOnly = usOnlyItemsInCart(cart);
    var unavailable = unavailableItemsForCountry(cart, deliveryCountry);
    var message = '';

    if (isEmpty) {
      message = 'Checkout paused. Add at least one product to continue.';
    } else if (unavailable.length) {
      message =
        'Checkout paused. ' +
        unavailable.length +
        ' item(s) do not ship to ' +
        deliveryCountry +
        '. Remove them to continue.';
    } else if (usOnly.length) {
      message = 'Shipping notice: this cart includes US-only products.';
    }

    document.querySelectorAll('a[href]').forEach(function (link) {
      if (!isCheckoutHref(link.getAttribute('href'))) {
        return;
      }

      link.setAttribute('data-checkout-action', 'true');
      if (isEmpty) {
        link.setAttribute('aria-disabled', 'true');
        link.classList.add('is-disabled');
        link.setAttribute('title', 'Add products to cart before checkout');
      } else {
        link.removeAttribute('aria-disabled');
        link.classList.remove('is-disabled');
        link.removeAttribute('title');
      }
    });

    setCheckoutGateMessage(message);

    document.querySelectorAll('[data-remove-unavailable]').forEach(function (button) {
      button.hidden = isEmpty || unavailable.length === 0;
      button.disabled = unavailable.length === 0;
    });
  }

  function updateCartCountUI(cart) {
    var count = getCartCount(cart);
    document.querySelectorAll('[data-cart-count]').forEach(function (node) {
      node.textContent = String(count);
      node.setAttribute('aria-hidden', 'true');

      var button = node.closest('[data-open-cart]');
      if (button) {
        button.setAttribute('aria-label', 'Open cart, ' + count + (count === 1 ? ' item' : ' items'));
      }
    });
  }

  function addToCart(productId, qty) {
    var quantity = Number(qty) || 1;
    var product = getProductById(productId);
    if (!product) {
      return;
    }
    if (!isProductAvailableForCountry(product, getDeliveryCountry())) {
      notifyUser(
        product.name + ' does not ship to ' + getDeliveryCountry() + '. Update location or choose another product.',
        'warning'
      );
      return;
    }

    addItemsToCart([productId], quantity);
  }

  function removeFromCart(productId) {
    var cart = readCart().filter(function (line) {
      return line.id !== productId;
    });

    writeCart(cart);
    refreshCartUI();
  }

  function changeQuantity(productId, delta) {
    var cart = readCart();
    var index = cart.findIndex(function (line) {
      return line.id === productId;
    });

    if (index === -1) {
      return;
    }

    cart[index].quantity += delta;
    if (cart[index].quantity <= 0) {
      cart = cart.filter(function (line) {
        return line.id !== productId;
      });
    }

    writeCart(cart);
    refreshCartUI();
  }

  function renderCartDrawer(cart) {
    var list = document.querySelector('[data-cart-items]');
    var empty = document.querySelector('[data-cart-empty]');
    var total = document.querySelector('[data-cart-total]');

    if (!list || !empty || !total) {
      return;
    }

    list.innerHTML = '';

    if (cart.length === 0) {
      empty.hidden = false;
      total.textContent = formatCurrency(0);
      var emptyDiscountNote = document.querySelector('[data-cart-drawer-discount-note]');
      if (emptyDiscountNote) emptyDiscountNote.remove();
      return;
    }

    empty.hidden = true;

    cart.forEach(function (line) {
      var product = getProductById(line.id);
      if (!product) {
        return;
      }

      var item = document.createElement('article');
      item.className = 'cart-item';
      item.innerHTML =
        '<img src="' +
        product.image +
        '" alt="' +
        product.name +
        '" loading="lazy" width="76" height="66">' +
        '<div class="cart-item__meta">' +
        '<h4>' +
        product.name +
        '</h4>' +
        '<p>' +
        formatCurrency(product.price) +
        ' x ' +
        line.quantity +
        '</p>' +
        '<p class="' +
        shippingScopeClass(product) +
        '">' +
        shippingScopeLabel(product) +
        '</p>' +
        '</div>' +
        '<button type="button" class="btn btn-ghost cart-item__remove" data-remove-item="' +
        line.id +
        '">Remove</button>';

      list.appendChild(item);
    });

    var pricing = calculateCartPricing(cart);
    total.textContent = formatCurrency(pricing.subtotal);

    var footer = total.closest('.cart-footer');
    if (footer) {
      var discountNote = footer.querySelector('[data-cart-drawer-discount-note]');
      if (pricing.promoDiscount > 0) {
        if (!discountNote) {
          discountNote = document.createElement('p');
          discountNote.className = 'cart-note cart-discount-note';
          discountNote.setAttribute('data-cart-drawer-discount-note', 'true');
          footer.insertBefore(discountNote, footer.querySelector('.cart-note') || null);
        }
        discountNote.textContent = 'Stack savings applied: -' + formatCurrency(pricing.promoDiscount);
      } else if (discountNote) {
        discountNote.remove();
      }
    }
  }

  function renderCartPage(cart) {
    var list = document.querySelector('[data-cart-page-items]');
    var total = document.querySelector('[data-cart-page-total]');
    var empty = document.querySelector('[data-cart-page-empty]');
    if (!list || !total || !empty) {
      return;
    }

    list.innerHTML = '';

    if (cart.length === 0) {
      empty.hidden = false;
      total.textContent = formatCurrency(0);
      var emptyPageDiscount = document.querySelector('[data-cart-page-discount]');
      if (emptyPageDiscount) {
        emptyPageDiscount.hidden = true;
        emptyPageDiscount.textContent = '';
      }
      return;
    }

    empty.hidden = true;

    cart.forEach(function (line) {
      var product = getProductById(line.id);
      if (!product) {
        return;
      }

      var row = document.createElement('article');
      row.className = 'cart-page-item';
      row.innerHTML =
        '<img src="' +
        product.image +
        '" alt="' +
        product.name +
        '" width="90" height="76" loading="lazy">' +
        '<div class="cart-page-item__info">' +
        '<h3><a href="' +
        getProductHref(product) +
        '">' +
        product.name +
        '</a></h3>' +
        '<p>' +
        product.category +
        ' | ' +
        formatCurrency(product.price) +
        '</p>' +
        '<p class="' +
        shippingScopeClass(product) +
        '">' +
        shippingScopeLabel(product) +
        '</p>' +
        '</div>' +
        '<div class="cart-page-item__qty">' +
        '<button type="button" class="btn btn-ghost" data-qty-change="-1" data-product-id="' +
        product.id +
        '">-</button>' +
        '<span>' +
        line.quantity +
        '</span>' +
        '<button type="button" class="btn btn-ghost" data-qty-change="1" data-product-id="' +
        product.id +
        '">+</button>' +
        '</div>' +
        '<button type="button" class="btn btn-outline" data-remove-item="' +
        product.id +
        '">Remove</button>';

      list.appendChild(row);
    });

    var pricing = calculateCartPricing(cart);
    total.textContent = formatCurrency(pricing.subtotal);

    var pageDiscount = document.querySelector('[data-cart-page-discount]');
    if (pageDiscount) {
      if (pricing.promoDiscount > 0) {
        pageDiscount.hidden = false;
        pageDiscount.textContent = 'Stack savings: -' + formatCurrency(pricing.promoDiscount);
      } else {
        pageDiscount.hidden = true;
        pageDiscount.textContent = '';
      }
    }
  }

  function refreshCartUI() {
    var cart = readCart();
    if (getCartCount(cart) === 0 && readPromotions().length) {
      clearPromotions();
    }
    updateCartCountUI(cart);
    renderCartDrawer(cart);
    renderCartPage(cart);
    updateCheckoutGate(cart);
  }

  function getTimeBasedTheme() {
    return 'dark';
  }

  function getStoredTheme() {
    try {
      var saved = localStorage.getItem(THEME_STORAGE_KEY);
      return saved === 'light' || saved === 'dark' ? saved : null;
    } catch (error) {
      return null;
    }
  }

  function applyTheme(theme, persist) {
    var nextTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', nextTheme);

    // Use dark logo in light theme and light logo in dark theme for contrast.
    document.querySelectorAll('[data-brand-logo]').forEach(function (image) {
      image.src = nextTheme === 'dark' ? '/assets/logo-light.svg' : '/assets/logo-dark.svg';
    });

    if (persist) {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    }

    document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
      var target = nextTheme === 'dark' ? 'light' : 'dark';
      button.textContent = target === 'dark' ? 'Dark Mode' : 'Light Mode';
      button.setAttribute('aria-label', 'Switch to ' + target + ' mode');
    });
  }

  function setupTheme() {
    var storedTheme = getStoredTheme();
    var initialTheme = storedTheme || 'dark';
    applyTheme(initialTheme, false);

    document.querySelectorAll('[data-mobile-menu]').forEach(function (menu) {
      if (menu.querySelector('.mobile-theme-toggle')) {
        return;
      }

      var mobileToggle = document.createElement('button');
      mobileToggle.type = 'button';
      mobileToggle.className = 'btn btn-outline theme-toggle mobile-theme-toggle';
      mobileToggle.setAttribute('data-theme-toggle', '');
      mobileToggle.textContent = 'Light Mode';
      menu.appendChild(mobileToggle);
    });

    document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
      button.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark', true);
      });
    });
  }

  function setupCartDrawer() {
    var drawer = document.querySelector('[data-cart-drawer]');
    var backdrop = document.querySelector('[data-cart-backdrop]');
    var lastTrigger = null;

    if (!drawer || !backdrop) {
      return;
    }

    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('tabindex', '-1');

    function getFocusableNodes() {
      return Array.from(
        drawer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
      );
    }

    function trapFocus(event) {
      if (event.key !== 'Tab') {
        return;
      }

      var focusables = getFocusableNodes();
      if (!focusables.length) {
        event.preventDefault();
        return;
      }

      var first = focusables[0];
      var last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function openDrawer(trigger) {
      lastTrigger = trigger || document.activeElement;
      drawer.classList.add('is-open');
      backdrop.classList.add('is-open');
      document.body.classList.add('lock-scroll');
      drawer.setAttribute('aria-hidden', 'false');
      var focusables = getFocusableNodes();
      if (focusables.length) {
        focusables[0].focus();
      } else {
        drawer.focus();
      }
    }

    function closeDrawer() {
      drawer.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      document.body.classList.remove('lock-scroll');
      drawer.setAttribute('aria-hidden', 'true');
      if (lastTrigger && typeof lastTrigger.focus === 'function') {
        lastTrigger.focus();
      }
    }

    document.querySelectorAll('[data-open-cart]').forEach(function (button) {
      if (!button.getAttribute('aria-label')) {
        button.setAttribute('aria-label', 'Open cart');
      }
      button.addEventListener('click', function () {
        openDrawer(button);
      });
    });

    document.querySelectorAll('[data-close-cart]').forEach(function (button) {
      button.addEventListener('click', closeDrawer);
    });

    backdrop.addEventListener('click', closeDrawer);
    drawer.addEventListener('keydown', trapFocus);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && drawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });
  }

  function setupGlobalClickEvents() {
    document.addEventListener('click', function (event) {
      var checkoutLink = event.target.closest('a[href]');
      if (checkoutLink && isCheckoutHref(checkoutLink.getAttribute('href'))) {
        var cart = readCart();
        if (getCartCount(cart) === 0) {
          event.preventDefault();
          notifyUser('Checkout paused. Add at least one product to continue.', 'warning');
          return;
        }
      }

      var addProductButton = event.target.closest('[data-add-to-cart]');
      if (addProductButton) {
        addToCart(addProductButton.getAttribute('data-add-to-cart'), 1);
        return;
      }

      var removeUnavailableButton = event.target.closest('[data-remove-unavailable]');
      if (removeUnavailableButton) {
        var removedCount = removeUnavailableCartItems(getDeliveryCountry());
        var message = removedCount
          ? 'Removed ' + removedCount + ' item(s) that cannot ship to ' + getDeliveryCountry() + '.'
          : 'All cart items are deliverable to ' + getDeliveryCountry() + '.';
        notifyUser(message, removedCount ? 'success' : 'info');
        return;
      }

      var removeButton = event.target.closest('[data-remove-item]');
      if (removeButton) {
        removeFromCart(removeButton.getAttribute('data-remove-item'));
        return;
      }

      var qtyButton = event.target.closest('[data-qty-change]');
      if (qtyButton) {
        var delta = Number(qtyButton.getAttribute('data-qty-change'));
        var productId = qtyButton.getAttribute('data-product-id');
        changeQuantity(productId, delta);
        return;
      }

      var addBundleButton = event.target.closest('[data-add-bundle]');
      if (addBundleButton) {
        var bundleId = addBundleButton.getAttribute('data-add-bundle');
        var bundle = getBundles().find(function (item) {
          return item.id === bundleId;
        });

        if (!bundle) {
          return;
        }

        var productIds = Array.isArray(bundle.items)
          ? bundle.items.slice()
          : bundle.includes
              .map(function (productName) {
                var product = findProductByName(productName);
                return product ? product.id : null;
              })
              .filter(Boolean);

        var deliveryCountry = getDeliveryCountry();
        var availableIds = productIds.filter(function (productId) {
          return isProductAvailableForCountry(getProductById(productId), deliveryCountry);
        });

        if (availableIds.length) {
          addItemsToCart(availableIds, 1, true);
          registerBundlePromotion(bundle, availableIds);
          refreshCartUI();
        }

        if (availableIds.length < productIds.length) {
          notifyUser(
            'Bundle added with deliverable items only for ' + deliveryCountry + '.',
            'info'
          );
        }
        return;
      }

      var addStackButton = event.target.closest('[data-add-stack]');
      if (addStackButton) {
        var stackIds = String(addStackButton.getAttribute('data-add-stack') || '')
          .split(',')
          .map(function (id) {
            return id.trim();
          })
          .filter(Boolean);

        var stackDiscountPct = Number(addStackButton.getAttribute('data-stack-discount') || 10);
        var deliveryCountry = getDeliveryCountry();
        var availableIds = stackIds.filter(function (productId) {
          return isProductAvailableForCountry(getProductById(productId), deliveryCountry);
        });
        if (availableIds.length) {
          addItemsToCart(availableIds, 1, true);
          registerStackPromotion(availableIds, stackDiscountPct);
          refreshCartUI();
        }
        if (availableIds.length < stackIds.length) {
          notifyUser(
            'Recommended stack added with deliverable items only for ' + deliveryCountry + '.',
            'info'
          );
        }
      }
    });
  }

  function renderFeaturedProducts() {
    var container = document.querySelector('[data-featured-products]');
    if (!container) {
      return;
    }

    var featured = getAvailableProducts(getProducts(), getDeliveryCountry()).filter(function (product) {
      return product.featured;
    });

    container.innerHTML = featured
      .map(function (product) {
        return (
          '<article class="product-card">' +
          '<a class="product-card__image-wrap" href="' +
          getProductHref(product) +
          '">' +
          '<img src="' +
          product.image +
          '" alt="' +
          product.name +
          '" loading="lazy" width="320" height="260">' +
          '<span class="pill">' +
          product.badge +
          '</span>' +
          '</a>' +
          '<div class="product-card__content">' +
          '<p class="product-card__category">' +
          product.category +
          '</p>' +
          '<h3><a href="' +
          getProductHref(product) +
          '">' +
          product.name +
          '</a></h3>' +
          '<p>' +
          product.tagline +
          '</p>' +
          '<p class="' +
          shippingScopeClass(product) +
          '" style="margin-top:.35rem">' +
          shippingScopeLabel(product) +
          '</p>' +
          '<div class="product-card__meta">' +
          '<span>' +
          product.servings +
          ' servings</span>' +
          '<span>' +
          formatCurrency(product.price) +
          '</span>' +
          '</div>' +
          '<div class="product-card__actions">' +
          '<a href="' +
          getProductHref(product) +
          '" class="btn btn-outline">View Spec</a>' +
          '<button type="button" class="btn btn-primary" data-add-to-cart="' +
          product.id +
          '">Add</button>' +
          '</div>' +
          '</div>' +
          '</article>'
        );
      })
      .join('');
    applyAvailabilityFilters();
  }

  function renderBundles() {
    var container = document.querySelector('[data-bundle-cards]');
    if (!container) {
      return;
    }

    var byId = new Map(getProducts().map(function (product) {
      return [product.id, product];
    }));
    var deliveryCountry = getDeliveryCountry();

    container.innerHTML = getBundles()
      .map(function (bundle) {
        var availableItems = (bundle.items || []).filter(function (itemId) {
          return isProductAvailableForCountry(byId.get(itemId), deliveryCountry);
        });
        if (availableItems.length < 2) {
          return '';
        }
        var availableNames = availableItems.map(function (itemId) {
          var product = byId.get(itemId);
          return product ? product.name : itemId;
        });
        var compareAt = availableItems.reduce(function (sum, itemId) {
          var product = byId.get(itemId);
          return product ? sum + Number(product.price || 0) : sum;
        }, 0);
        var discountPct = Number(bundle.discountPct || 0);
        if (!(discountPct > 0 && discountPct < 100)) {
          discountPct = 10;
        }
        var isCompleteBundle = availableItems.length === Number((bundle.items || []).length || 0);
        var configuredPrice = Number(bundle.price || 0);
        var computedPrice = Math.round(compareAt * (1 - discountPct / 100));
        var price =
          isCompleteBundle && configuredPrice > 0 && configuredPrice < compareAt
            ? configuredPrice
            : Math.max(39, computedPrice);
        var savings = Math.max(0, Math.round((compareAt - price) * 100) / 100);
        var savingsPct = compareAt > 0 ? Math.round((savings / compareAt) * 100) : 0;
        return {
          bundle: bundle,
          includes: availableNames,
          itemIds: availableItems,
          compareAt: compareAt,
          price: price,
          savings: savings,
          savingsPct: savingsPct
        };
      })
      .filter(Boolean)
      .map(function (bundle) {
        return (
          '<article class="bundle-card">' +
          '<div>' +
          '<p class="bundle-card__label">Stack</p>' +
          '<h3>' +
          bundle.bundle.name +
          '</h3>' +
          '<p>' +
          bundle.bundle.tagline +
          '</p>' +
          '<p class="bundle-card__includes">Includes: ' +
          bundle.includes.join(' | ') +
          '</p>' +
          '</div>' +
          '<div class="bundle-card__footer">' +
          '<div class="bundle-card__pricing">' +
          '<p><strong>' +
          formatCurrency(bundle.price) +
          '</strong> <span>' +
          formatCurrency(bundle.compareAt) +
          '</span></p>' +
          '<p class="bundle-card__savings">Save ' +
          formatCurrency(bundle.savings) +
          ' (' +
          String(bundle.savingsPct) +
          '%)</p>' +
          '</div>' +
          '<button type="button" class="btn btn-primary" data-add-bundle="' +
          bundle.bundle.id +
          '">Add Stack</button>' +
          '</div>' +
          '</article>'
        );
      })
      .join('');
    applyAvailabilityFilters();
  }

  function getCountryCode(countryName) {
    var entry = getCountryByName(countryName);
    return entry ? entry.code : 'US';
  }

  function updateLocationLabels() {
    var country = getDeliveryCountry();
    var code = getCountryCode(country);
    var label = 'Ship to ' + code;
    document.querySelectorAll('[data-location-label]').forEach(function (node) {
      node.textContent = label;
      node.setAttribute('aria-label', 'Shipping destination: ' + country + '. Change location');
      node.setAttribute('title', 'Shipping destination: ' + country);
    });
    document.querySelectorAll('[data-location-country]').forEach(function (node) {
      node.textContent = country;
    });
  }

  function buildCountryOptions(selectedCountry) {
    return SHIPPING_COUNTRIES.map(function (country) {
      var selected = country.name === selectedCountry ? ' selected' : '';
      return '<option value="' + country.name + '"' + selected + '>' + country.name + '</option>';
    }).join('');
  }

  function ensureLocationModal() {
    var existing = document.querySelector('[data-location-modal]');
    if (existing) return existing;

    var wrapper = document.createElement('div');
    wrapper.className = 'location-modal';
    wrapper.setAttribute('data-location-modal', 'true');
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.innerHTML =
      '<div class="location-modal__backdrop" data-location-close></div>' +
      '<div class="location-modal__panel" role="dialog" aria-modal="true" aria-labelledby="location-modal-title">' +
      '<p class="eyebrow">Delivery Region</p>' +
      '<h3 id="location-modal-title">Select shipping country</h3>' +
      '<p class="form-note">Detected: <strong data-location-country></strong>. Update if needed.</p>' +
      '<label class="sr-only" for="location-country-select">Shipping country</label>' +
      '<select id="location-country-select" data-location-country-select>' +
      buildCountryOptions(getDeliveryCountry()) +
      '</select>' +
      '<div class="location-modal__actions">' +
      '<button type="button" class="btn btn-outline" data-location-use-detected>Use detected</button>' +
      '<button type="button" class="btn btn-primary" data-location-save>Save</button>' +
      '</div>' +
      '<button type="button" class="btn btn-ghost location-modal__close" data-location-close>Close</button>' +
      '</div>';
    document.body.appendChild(wrapper);
    return wrapper;
  }

  function openLocationModal() {
    var modal = ensureLocationModal();
    var select = modal.querySelector('[data-location-country-select]');
    if (select) {
      select.innerHTML = buildCountryOptions(getDeliveryCountry());
      select.value = getDeliveryCountry();
      select.focus();
    }
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lock-scroll');
    updateLocationLabels();
  }

  function closeLocationModal(confirmCurrent) {
    if (confirmCurrent) {
      var state = getLocationState();
      localStorage.setItem(
        LOCATION_STORAGE_KEY,
        JSON.stringify({
          country: state.country,
          source: state.source || 'auto',
          confirmed: true,
          updatedAt: new Date().toISOString()
        })
      );
    }
    var modal = ensureLocationModal();
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lock-scroll');
  }

  function applyAvailabilityFilters() {
    var country = getDeliveryCountry();

    document.querySelectorAll('.form-note, .shipping-note, .pdp-meta span').forEach(function (node) {
      var text = String(node.textContent || '').toLowerCase();
      if (text.indexOf('us shipping only') !== -1) {
        node.classList.add('shipping-note', 'shipping-note--us-only');
      }
    });

    document.querySelectorAll('.product-card').forEach(function (card) {
      var addButton = card.querySelector('[data-add-to-cart]');
      if (!addButton) return;
      var product = getProductById(addButton.getAttribute('data-add-to-cart'));
      if (!product) return;
      var available = isProductAvailableForCountry(product, country);
      card.classList.toggle('is-location-hidden', !available);
    });

    document.querySelectorAll('.product-grid').forEach(function (grid) {
      var cards = Array.prototype.slice.call(grid.querySelectorAll('.product-card'));
      if (!cards.length) return;
      var visibleCount = cards.filter(function (card) {
        return !card.classList.contains('is-location-hidden');
      }).length;
      var note = grid.querySelector('.location-grid-note');
      if (!visibleCount) {
        if (!note) {
          note = document.createElement('p');
          note.className = 'location-grid-note form-note';
          grid.appendChild(note);
        }
        note.textContent = 'No products in this section ship to ' + country + '.';
      } else if (note) {
        note.remove();
      }
    });

    var pdpCore = document.querySelector('.pdp-core');
    if (pdpCore) {
      var primaryButton = pdpCore.querySelector('[data-add-to-cart]');
      if (primaryButton) {
        var product = getProductById(primaryButton.getAttribute('data-add-to-cart'));
        var available = isProductAvailableForCountry(product, country);
        var notice = pdpCore.querySelector('.pdp-availability-note');
        pdpCore.querySelectorAll('[data-add-to-cart]').forEach(function (button) {
          button.disabled = !available;
          button.classList.toggle('is-disabled', !available);
        });
        document.querySelectorAll('.pdp-sticky-bar [data-add-to-cart]').forEach(function (button) {
          button.disabled = !available;
          button.classList.toggle('is-disabled', !available);
        });
        if (!available) {
          if (!notice) {
            notice = document.createElement('p');
            notice.className = 'form-note shipping-note shipping-note--us-only pdp-availability-note';
            pdpCore.insertBefore(notice, pdpCore.querySelector('.pdp-actions') || null);
          }
          notice.textContent =
            (product ? product.name : 'This product') +
            ' does not ship to ' +
            country +
            '. Change location or choose an available product.';
        } else if (notice) {
          notice.remove();
        }
      }
    }
  }

  function setupLocationControls() {
    var current = getStoredLocation();
    if (!current) {
      var seeded = {
        country: getAutoDetectedCountryName(),
        source: 'auto',
        confirmed: false,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(seeded));
    }

    document.querySelectorAll('.nav-actions').forEach(function (actions) {
      var button = actions.querySelector('[data-location-label]');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-outline location-trigger';
        button.setAttribute('data-location-label', 'true');
        var first = actions.firstElementChild;
        actions.insertBefore(button, first || null);
      }
      button.addEventListener('click', openLocationModal);
    });

    document.querySelectorAll('[data-mobile-menu]').forEach(function (menu) {
      var button = menu.querySelector('[data-location-label-mobile]');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-outline location-trigger mobile-location-trigger';
        button.setAttribute('data-location-label-mobile', 'true');
        button.setAttribute('data-location-label', 'true');
        menu.appendChild(button);
      }
      button.addEventListener('click', function () {
        openLocationModal();
      });
    });

    var modal = ensureLocationModal();
    modal.addEventListener('click', function (event) {
      if (event.target.closest('[data-location-close]')) {
        closeLocationModal(true);
        return;
      }
      if (event.target.closest('[data-location-use-detected]')) {
        var state = getLocationState();
        setDeliveryCountry(state.country, state.source || 'auto', true);
        closeLocationModal(false);
        return;
      }
      if (event.target.closest('[data-location-save]')) {
        var select = modal.querySelector('[data-location-country-select]');
        if (select && select.value) {
          setDeliveryCountry(select.value, 'manual', true);
          closeLocationModal(false);
        }
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && modal.classList.contains('is-open')) {
        closeLocationModal(true);
      }
    });

    var state = getStoredLocation();
    if (!state || !state.confirmed) {
      openLocationModal();
    } else {
      updateLocationLabels();
    }

    if (!state || !state.confirmed) {
      detectCountryFromEndpoint().then(function (detectedCountry) {
        if (!detectedCountry) return;
        var liveState = getStoredLocation();
        if (liveState && liveState.confirmed) return;
        if (!liveState || !getCountryByName(liveState.country)) return;
        if (liveState.country === detectedCountry && liveState.source === 'geo') return;

        setDeliveryCountry(detectedCountry, 'geo', false);
        var modalSelect = modal.querySelector('[data-location-country-select]');
        if (modalSelect) {
          modalSelect.value = detectedCountry;
        }
      });
    }

    window.addEventListener('genesiscore:locationchange', function () {
      updateLocationLabels();
      applyAvailabilityFilters();
      refreshCartUI();
      renderFeaturedProducts();
      renderBundles();
    });
  }

  function setupMobileMenu() {
    var menuButton = document.querySelector('[data-menu-toggle]');
    var menu = document.querySelector('[data-mobile-menu]');

    if (!menuButton || !menu) {
      return;
    }

    if (!menuButton.getAttribute('aria-label')) {
      menuButton.setAttribute('aria-label', 'Open menu');
    }

    if (!menu.id) {
      menu.id = 'mobile-menu';
    }
    menuButton.setAttribute('aria-controls', menu.id);
    menu.hidden = true;

    function closeMenu() {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Open menu');
      menu.classList.remove('is-open');
      menu.hidden = true;
    }

    menuButton.addEventListener('click', function () {
      var expanded = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!expanded));
      menuButton.setAttribute('aria-label', expanded ? 'Open menu' : 'Close menu');
      menu.classList.toggle('is-open');
      menu.hidden = expanded;
    });

    document.addEventListener('click', function (event) {
      if (menu.hidden || !menu.classList.contains('is-open')) {
        return;
      }
      if (event.target === menuButton || menuButton.contains(event.target) || menu.contains(event.target)) {
        return;
      }
      closeMenu();
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 1024) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeMenu();
      }
    });
  }

  function setupAccordion() {
    document.querySelectorAll('[data-accordion-button]').forEach(function (button) {
      var item = button.closest('.faq-item');
      var answer = item ? item.querySelector('.faq-answer') : null;
      if (answer && !answer.id) {
        answer.id = 'faq-answer-' + Math.random().toString(36).slice(2, 9);
      }
      button.setAttribute('aria-expanded', item && item.classList.contains('is-open') ? 'true' : 'false');
      if (answer) {
        button.setAttribute('aria-controls', answer.id);
      }

      button.addEventListener('click', function () {
        var item = button.closest('.faq-item');
        if (item) {
          item.classList.toggle('is-open');
          button.setAttribute('aria-expanded', item.classList.contains('is-open') ? 'true' : 'false');
        }
      });
    });
  }

  function setupLeadForms() {
    document.querySelectorAll('[data-lead-form]').forEach(function (form) {
      var feedback = form.querySelector('[data-form-feedback]');
      if (feedback) {
        feedback.setAttribute('aria-live', 'polite');
      }
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        if (feedback) {
          feedback.textContent = 'Request received. Concierge will reply shortly.';
        }
        form.reset();
      });
    });
  }

  function getShareUrl() {
    try {
      return new URL(window.location.href).toString();
    } catch (error) {
      return window.location.href;
    }
  }

  function writeLinkToClipboard(url) {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      return Promise.reject(new Error('Clipboard API unavailable'));
    }
    return navigator.clipboard.writeText(url);
  }

  function fallbackPromptCopy(url) {
    window.prompt('Copy this link:', url);
  }

  function shareCurrentPage() {
    var url = getShareUrl();
    var pageTitle = (document.title || 'Genesis Core').trim();
    var payload = {
      title: pageTitle,
      text: 'Genesis Core',
      url: url
    };

    if (typeof navigator.share === 'function') {
      return navigator
        .share(payload)
        .then(function () {
          return 'shared';
        })
        .catch(function (error) {
          if (String(error && error.name || '') === 'AbortError') {
            return 'cancelled';
          }
          return writeLinkToClipboard(url)
            .then(function () {
              return 'copied';
            })
            .catch(function () {
              fallbackPromptCopy(url);
              return 'prompted';
            });
        });
    }

    return writeLinkToClipboard(url)
      .then(function () {
        return 'copied';
      })
      .catch(function () {
        fallbackPromptCopy(url);
        return 'prompted';
      });
  }

  function bindShareAction(button) {
    if (!button || button.dataset.shareBound === 'true') return;
    button.dataset.shareBound = 'true';
    button.addEventListener('click', function () {
      shareCurrentPage().then(function (result) {
        if (result === 'cancelled') return;
        if (result === 'shared') {
          notifyUser('Share panel opened.', 'success');
          return;
        }
        if (result === 'copied') {
          notifyUser('Link copied. Ready to share.', 'success');
          return;
        }
        notifyUser('Link ready. Paste from the copy prompt.', 'info');
      });
    });
  }

  function setupShareEntry() {
    document.querySelectorAll('.nav-actions').forEach(function (actions) {
      var shareButton = actions.querySelector('[data-share-link]');
      if (!shareButton) {
        shareButton = document.createElement('button');
        shareButton.type = 'button';
        shareButton.className = 'btn btn-outline share-trigger';
        shareButton.setAttribute('data-share-link', 'true');
        shareButton.setAttribute('aria-label', 'Share this page');
        shareButton.textContent = 'Share';

        var accountButton = actions.querySelector('[data-account-icon]');
        var cartButton = actions.querySelector('.cart-trigger');
        var anchor = accountButton || cartButton;
        if (anchor) {
          actions.insertBefore(shareButton, anchor);
        } else {
          actions.appendChild(shareButton);
        }
      }
      bindShareAction(shareButton);
    });

    document.querySelectorAll('[data-mobile-menu]').forEach(function (menu) {
      var mobileShare = menu.querySelector('[data-share-link-mobile]');
      if (!mobileShare) {
        mobileShare = document.createElement('button');
        mobileShare.type = 'button';
        mobileShare.className = 'btn btn-outline mobile-share-trigger';
        mobileShare.setAttribute('data-share-link-mobile', 'true');
        mobileShare.setAttribute('aria-label', 'Share this page');
        mobileShare.textContent = 'Share This Page';
        menu.insertBefore(mobileShare, menu.firstChild || null);
      }
      bindShareAction(mobileShare);
    });
  }

  function setYear() {
    document.querySelectorAll('[data-year]').forEach(function (node) {
      node.textContent = String(new Date().getFullYear());
    });
  }

  function setupFooterPaymentRail() {
    document.querySelectorAll('.site-footer .container').forEach(function (container) {
      if (container.querySelector('[data-payment-rail]')) {
        return;
      }

      var rail = document.createElement('section');
      rail.className = 'payment-rail';
      rail.setAttribute('data-payment-rail', 'true');
      rail.setAttribute('aria-label', 'Accepted payment methods');
      rail.innerHTML =
        '<p class="payment-rail__label">Accepted payments</p>' +
        '<div class="payment-rail__list">' +
        '<span class="payment-chip">Card</span>' +
        '<span class="payment-chip">Apple Pay</span>' +
        '<span class="payment-chip">Google Pay</span>' +
        '<span class="payment-chip">Link</span>' +
        '<span class="payment-chip">Klarna</span>' +
        '</div>';

      var footerBottom = container.querySelector('.footer-bottom');
      if (footerBottom) {
        container.insertBefore(rail, footerBottom);
      } else {
        container.appendChild(rail);
      }
    });
  }

  function enhancePDPExperience() {
    var pdp = document.querySelector('.pdp-core');
    if (!pdp) return;

    if (!pdp.querySelector('.pdp-conversion-strip')) {
      var strip = document.createElement('div');
      strip.className = 'pdp-conversion-strip';
      strip.innerHTML =
        '<span>Third-party lot checks</span>' +
        '<span>Encrypted Stripe checkout</span>' +
        '<span>Pause/skip/cancel subscription</span>';
      var actions = pdp.querySelector('.pdp-actions');
      if (actions) {
        actions.insertAdjacentElement('afterend', strip);
      } else {
        pdp.appendChild(strip);
      }
    }

    document.querySelectorAll('.pdp-related-grid .product-card').forEach(function (card) {
      card.classList.add('pdp-related-card');
    });
  }

  function setupSkipLink() {
    var main = document.querySelector('main');
    if (!main) {
      return;
    }

    if (!main.id) {
      main.id = 'main-content';
    }

    if (document.querySelector('.skip-link')) {
      return;
    }

    var link = document.createElement('a');
    link.className = 'skip-link';
    link.href = '#' + main.id;
    link.textContent = 'Skip to main content';
    document.body.insertBefore(link, document.body.firstChild);
  }

  function setupFormAccessibility() {
    document.querySelectorAll('input, select, textarea').forEach(function (field, index) {
      if (!field.id) {
        field.id = 'field-' + index + '-' + Math.random().toString(36).slice(2, 7);
      }

      var explicitLabel = document.querySelector('label[for="' + field.id + '"]');
      if (!explicitLabel && !field.getAttribute('aria-label')) {
        var fallbackLabel = field.getAttribute('placeholder') || field.getAttribute('name') || 'Input';
        field.setAttribute('aria-label', fallbackLabel);
      }
    });
  }

  function optimizeImages() {
    var priorityImage = document.querySelector('.hero img');
    if (priorityImage) {
      priorityImage.setAttribute('fetchpriority', 'high');
      priorityImage.setAttribute('decoding', 'async');
    }

    document.querySelectorAll('img').forEach(function (image) {
      if (!image.closest('.hero') && !image.closest('.site-header')) {
        image.setAttribute('loading', image.getAttribute('loading') || 'lazy');
      }
      image.setAttribute('decoding', image.getAttribute('decoding') || 'async');
    });
  }

  function tunePdpLongformReadability() {
    if (!document.querySelector('.pdp-core')) {
      return;
    }

    if (!window.matchMedia || !window.matchMedia('(max-width: 390px)').matches) {
      return;
    }

    document.querySelectorAll('.pdp-points li').forEach(function (item) {
      var text = String(item.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!text) return;

      text = text.replace(
        /^(What it is:|What it does:|How to use:)\s*/i,
        function (_, label) {
          return label + '\n';
        }
      );
      text = text.replace(/;\s+/g, ';\n');
      text = text.replace(/\. (Do not exceed labeled serving size\.)/i, '.\n$1');
      item.textContent = text;
      item.style.whiteSpace = 'pre-line';
    });
  }

  function markStickyPDP() {
    if (document.querySelector('[data-pdp-sticky]')) {
      document.body.classList.add('pdp-has-sticky');
    }
  }

  function setupAccountEntry() {
    var user = null;
    try {
      var session = JSON.parse(localStorage.getItem('genesis_core_session_v1') || 'null');
      var users = JSON.parse(localStorage.getItem('genesis_core_users_v1') || '[]');
      if (session && session.userId && session.expiresAt && Date.now() < new Date(session.expiresAt).getTime() && Array.isArray(users)) {
        user = users.find(function (entry) {
          return entry.id === session.userId;
        });
      }
    } catch (error) {
      user = null;
    }

    var isAuthenticated = Boolean(user);
    var href = isAuthenticated ? '/dashboard.html' : '/signin.html';
    var label = isAuthenticated ? 'Account' : 'Sign in or create account';
    var state = isAuthenticated ? 'account' : 'auth';

    document.querySelectorAll('.nav-actions').forEach(function (actions) {
      var link = actions.querySelector('[data-account-icon]');
      if (!link) {
        link = document.createElement('a');
        link.className = 'btn btn-outline account-trigger';
        link.setAttribute('data-account-icon', 'true');
        var cartButton = actions.querySelector('.cart-trigger');
        if (cartButton) {
          actions.insertBefore(link, cartButton);
        } else {
          actions.appendChild(link);
        }
      }

      link.href = href;
      link.title = label;
      link.textContent = label;
      link.setAttribute('aria-label', label);
      link.setAttribute('data-account-state', state);
    });

    document.querySelectorAll('[data-mobile-menu]').forEach(function (menu) {
      var link = menu.querySelector('[data-account-entry-mobile]');
      if (!link) {
        link = document.createElement('a');
        link.setAttribute('data-account-entry-mobile', 'true');
        menu.appendChild(link);
      }
      link.href = href;
      link.textContent = isAuthenticated ? 'Account' : 'Sign In / Sign Up';
    });
  }

  function runWhenIdle(task) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(task, { timeout: 1800 });
      return;
    }
    window.setTimeout(task, 1);
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupSkipLink();
    setupFormAccessibility();
    optimizeImages();
    tunePdpLongformReadability();
    markStickyPDP();
    enhancePDPExperience();
    setupAccountEntry();
    setupLocationControls();
    setupTheme();
    setupShareEntry();
    setupMobileMenu();
    setupCartDrawer();
    setupGlobalClickEvents();
    setupAccordion();
    setupLeadForms();
    refreshCartUI();
    applyAvailabilityFilters();
    setupFooterPaymentRail();
    setYear();
    runWhenIdle(renderFeaturedProducts);
    runWhenIdle(renderBundles);
  });

  window.GenesisCore = {
    addToCart: addToCart,
    removeFromCart: removeFromCart,
    changeQuantity: changeQuantity,
    clearCart: clearCart,
    getProducts: getProducts,
    getBundles: getBundles,
    getProductById: getProductById,
    formatCurrency: formatCurrency,
    readCart: readCart,
    getCartPricing: function (cart) {
      return calculateCartPricing(Array.isArray(cart) ? cart : readCart());
    },
    getDeliveryCountry: getDeliveryCountry,
    setDeliveryCountry: setDeliveryCountry,
    isProductAvailableForCountry: isProductAvailableForCountry,
    getAvailableProducts: getAvailableProducts,
    removeUnavailableCartItems: removeUnavailableCartItems
  };
})();

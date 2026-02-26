(function () {
  function getProductIdFromQuery() {
    try {
      var params = new URLSearchParams(window.location.search);
      return params.get('id');
    } catch (error) {
      return null;
    }
  }

  function setText(selector, value) {
    var node = document.querySelector(selector);
    if (node) {
      node.textContent = value;
    }
  }

  function getProductHref(product) {
    if (product && product.url) {
      return product.url;
    }
    return 'product.html?id=' + product.id;
  }

  function renderList(selector, entries) {
    var container = document.querySelector(selector);
    if (!container) {
      return;
    }

    container.innerHTML = entries
      .map(function (entry) {
        return '<li>' + entry + '</li>';
      })
      .join('');
  }

  function renderFAQ(faqEntries) {
    var container = document.querySelector('[data-product-faq]');
    if (!container) {
      return;
    }

    container.innerHTML = faqEntries
      .map(function (item) {
        var answerId = 'faq-answer-' + Math.random().toString(36).slice(2, 9);
        return (
          '<article class="faq-item">' +
          '<button type="button" data-accordion-button aria-expanded="false" aria-controls="' +
          answerId +
          '">' +
          item.q +
          '</button>' +
          '<div class="faq-answer" id="' +
          answerId +
          '">' +
          item.a +
          '</div>' +
          '</article>'
        );
      })
      .join('');

    container.querySelectorAll('[data-accordion-button]').forEach(function (button) {
      button.addEventListener('click', function () {
        var item = button.closest('.faq-item');
        if (item) {
          item.classList.toggle('is-open');
          button.setAttribute('aria-expanded', item.classList.contains('is-open') ? 'true' : 'false');
        }
      });
    });
  }

  function renderRelated(product) {
    var container = document.querySelector('[data-related-products]');
    if (!container || !window.GenesisCore) {
      return;
    }

    var products = window.GenesisCore
      .getProducts()
      .filter(function (entry) {
        return entry.id !== product.id && (entry.category === product.category || entry.featured);
      })
      .slice(0, 3);

    container.innerHTML = products
      .map(function (entry) {
        return (
          '<article class="product-card">' +
          '<a class="product-card__image-wrap" href="' +
          getProductHref(entry) +
          '">' +
          '<img src="' +
          entry.image +
          '" alt="' +
          entry.name +
          '" loading="lazy" width="320" height="260">' +
          '</a>' +
          '<div class="product-card__content">' +
          '<p class="product-card__category">' +
          entry.category +
          '</p>' +
          '<h3><a href="' +
          getProductHref(entry) +
          '">' +
          entry.name +
          '</a></h3>' +
          '<p>' +
          entry.tagline +
          '</p>' +
          '<div class="product-card__meta"><span>' +
          entry.servings +
          ' servings</span><span>' +
          window.GenesisCore.formatCurrency(entry.price) +
          '</span></div>' +
          '<div class="product-card__actions">' +
          '<a class="btn btn-outline" href="' +
          getProductHref(entry) +
          '">View Spec</a>' +
          '<button type="button" class="btn btn-primary" data-add-to-cart="' +
          entry.id +
          '">Add</button>' +
          '</div>' +
          '</div>' +
          '</article>'
        );
      })
      .join('');
  }

  function setupPurchaseMode(basePrice) {
    var modeInputs = document.querySelectorAll('input[name="purchase-mode"]');
    var display = document.querySelector('[data-product-price]');

    if (!modeInputs.length || !display || !window.GenesisCore) {
      return;
    }

    function update() {
      var active = document.querySelector('input[name="purchase-mode"]:checked');
      var price = basePrice;
      if (active && active.value === 'subscribe') {
        price = Math.round(basePrice * 0.88);
      }
      display.textContent = window.GenesisCore.formatCurrency(price);
    }

    modeInputs.forEach(function (input) {
      input.addEventListener('change', update);
    });

    update();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.GenesisCore) {
      return;
    }

    var productId = getProductIdFromQuery();
    var product = window.GenesisCore.getProductById(productId);

    if (!product) {
      var fallback = document.querySelector('[data-product-shell]');
      if (fallback) {
        fallback.innerHTML =
          '<div class="empty-state"><h2>Product Not Found</h2><p>Please return to the shop and select a valid product.</p><a class="btn btn-primary" href="shop.html">Back to Shop</a></div>';
      }
      return;
    }

    document.title = product.name + ' | Genesis Core';
    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && product.url) {
      canonical.href = 'https://genesiscore.com' + product.url;
    }

    setText('[data-product-name]', product.name);
    setText('[data-product-tagline]', product.tagline);
    setText('[data-product-category]', product.category);
    setText('[data-product-format]', product.format + ' | ' + product.servings + ' servings');
    setText('[data-product-summary]', product.whatItIs);
    setText('[data-product-benefits]', product.whatItDoes);
    setText('[data-product-usage]', product.howToUse);
    setText('[data-product-who]', product.whoItsFor || product.tagline);
    setText('[data-product-when]', product.whenToUse || product.howToUse);
    setText(
      '[data-product-stack]',
      product.stackGuidance || 'Stack with Core Base and one targeted module aligned to your objective.'
    );
    setText('[data-product-ingredients]', product.ingredients);
    setText('[data-product-testing]', product.testing);
    setText('[data-product-cautions]', product.cautions);

    var image = document.querySelector('[data-product-image]');
    if (image) {
      image.src = product.image;
      image.alt = product.name;
    }

    var price = document.querySelector('[data-product-price]');
    if (price) {
      price.textContent = window.GenesisCore.formatCurrency(product.price);
    }

    var addButton = document.querySelector('[data-product-add]');
    if (addButton) {
      addButton.setAttribute('data-add-to-cart', product.id);
    }

    var addButtonSticky = document.querySelector('[data-product-add-sticky]');
    if (addButtonSticky) {
      addButtonSticky.setAttribute('data-add-to-cart', product.id);
    }

    var stickyPrice = document.querySelector('[data-product-price-sticky]');
    if (stickyPrice) {
      stickyPrice.textContent = window.GenesisCore.formatCurrency(product.price);
    }

    setText('[data-product-name-sticky]', product.name);

    renderList('[data-product-points]', [
      'What it is: ' + product.whatItIs,
      'What it does: ' + product.whatItDoes,
      'How to use: ' + product.howToUse
    ]);

    renderFAQ([
      {
        q: 'When should I take this product?',
        a: product.howToUse
      },
      {
        q: 'How does this fit into a stack?',
        a: 'This product is modular and can be combined with Core Base, Focus, Recovery, or Performance items based on your objective.'
      },
      {
        q: 'What quality controls apply?',
        a: product.testing
      }
    ]);

    renderRelated(product);
    setupPurchaseMode(product.price);
  });
})();

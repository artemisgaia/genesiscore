(function () {
  var STACK_DISCOUNT_PCT = 10;

  function productHref(product) {
    if (product && product.url) {
      return product.url;
    }
    return 'product.html?id=' + product.id;
  }

  function formatPrice(value) {
    if (!window.GenesisCore) {
      return '$' + String(value || 0);
    }
    return window.GenesisCore.formatCurrency(value || 0);
  }

  function collectAnswers(form) {
    var formData = new FormData(form);
    return {
      goal: formData.get('goal'),
      stress: formData.get('stress'),
      sleep: formData.get('sleep'),
      training: formData.get('training'),
      foundation: formData.get('foundation')
    };
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

  function renderResult(result) {
    var container = document.querySelector('[data-quiz-result]');
    if (!container) {
      return;
    }

    var products = result.products || [];
    var notes = (result.rationale && result.rationale.notes) || [];
    var total = products.reduce(function (sum, product) {
      return sum + Number(product.price || 0);
    }, 0);
    var stackPrice = Math.round(total * (1 - STACK_DISCOUNT_PCT / 100));
    var stackSavings = Math.max(0, Math.round((total - stackPrice) * 100) / 100);

    if (!products.length) {
      container.hidden = false;
      container.innerHTML =
        '<article class="panel">' +
        '<span class="eyebrow">AI Protocol Output</span>' +
        '<h3>No deliverable stack for current location</h3>' +
        '<p>Change your shipping country from the header to view recommendations available to your destination.</p>' +
        '</article>';
      return;
    }

    container.hidden = false;
    container.innerHTML =
      '<article class="panel">' +
      '<span class="eyebrow">AI Protocol Output</span>' +
      '<h3>Core Stack Recommendation</h3>' +
      '<p>Generated from your five inputs using weighted protocol logic across baseline, stress, sleep, and training demand.</p>' +
      '<div class="quiz-ai-note">Model mode: deterministic stack engine | Delivery filter: ' +
      ((window.GenesisCore && window.GenesisCore.getDeliveryCountry && window.GenesisCore.getDeliveryCountry()) || 'United States') +
      '</div>' +
      '<ul class="pdp-points" style="margin-top:1rem;">' +
      notes
        .map(function (note) {
          return '<li>' + note + '</li>';
        })
        .join('') +
      '</ul>' +
      '<p class="bundle-card__includes" style="margin-top:1rem;">Module subtotal: ' +
      formatPrice(total) +
      '</p>' +
      '<p class="bundle-card__includes" style="margin-top:.25rem;">Protocol savings: ' +
      formatPrice(stackSavings) +
      ' (' +
      STACK_DISCOUNT_PCT +
      '%)</p>' +
      '<p class="bundle-card__includes" style="margin-top:.25rem;">Protocol price (' +
      STACK_DISCOUNT_PCT +
      '% stack): ' +
      formatPrice(stackPrice) +
      '</p>' +
      '<div class="product-card__actions" style="margin-top:1rem;">' +
      '<button type="button" class="btn btn-primary" data-add-stack="' +
      result.productIds.join(',') +
      '" data-stack-discount="' +
      STACK_DISCOUNT_PCT +
      '">Add Recommended Stack</button>' +
      '<a class="btn btn-outline" href="shop.html">Refine In Shop</a>' +
      '</div>' +
      '</article>' +
      '<div class="product-grid" style="margin-top:1rem;">' +
      products
        .map(function (product) {
          return (
            '<article class="product-card">' +
            '<a class="product-card__image-wrap" href="' +
            productHref(product) +
            '">' +
            '<img src="' +
            product.image +
            '" alt="' +
            product.name +
            '" loading="lazy" width="320" height="260"></a>' +
            '<div class="product-card__content">' +
            '<p class="product-card__category">' +
            product.category +
            '</p>' +
            '<h3><a href="' +
            productHref(product) +
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
            '<div class="product-card__meta"><span>' +
            product.servings +
            ' servings</span><span>' +
            formatPrice(product.price) +
            '</span></div>' +
            '<div class="product-card__actions"><button type="button" class="btn btn-primary" data-add-to-cart="' +
            product.id +
            '">Add</button></div>' +
            '</div></article>'
          );
        })
        .join('') +
      '</div>';

    try {
      localStorage.setItem('genesis_core_last_stack_ids', JSON.stringify(result.productIds));
      localStorage.setItem('genesis_core_last_stack_answers', JSON.stringify(result.answers));
    } catch (error) {
      // no-op
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.querySelector('[data-core-quiz]');
    if (!form) {
      return;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      if (!window.GenesisCore || !window.GenesisQuizEngine) {
        return;
      }

      var answers = collectAnswers(form);
      var products = window.GenesisCore.getAvailableProducts
        ? window.GenesisCore.getAvailableProducts(window.GenesisCore.getProducts(), window.GenesisCore.getDeliveryCountry())
        : window.GenesisCore.getProducts();
      var result = window.GenesisQuizEngine.recommendStack(products, answers);
      renderResult(result);
    });

    window.addEventListener('genesiscore:locationchange', function () {
      var resultNode = document.querySelector('[data-quiz-result]');
      if (resultNode && !resultNode.hidden) {
        resultNode.hidden = true;
        resultNode.innerHTML = '';
      }
    });
  });
})();

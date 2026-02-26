(function () {
  function getProducts() {
    var all = Array.isArray(window.GENESIS_PRODUCTS) ? window.GENESIS_PRODUCTS.slice() : [];
    if (window.GenesisCore && typeof window.GenesisCore.getAvailableProducts === 'function') {
      return window.GenesisCore.getAvailableProducts(all, window.GenesisCore.getDeliveryCountry());
    }
    return all;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  }

  function productHref(product) {
    if (product && product.url) {
      return product.url;
    }
    return 'product.html?id=' + product.id;
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

  function getCategoryFromQuery() {
    try {
      var params = new URLSearchParams(window.location.search);
      return params.get('category');
    } catch (error) {
      return null;
    }
  }

  function getSearchFromQuery() {
    try {
      var params = new URLSearchParams(window.location.search);
      return params.get('q');
    } catch (error) {
      return null;
    }
  }

  function renderFilters(products) {
    var select = document.querySelector('[data-filter-category]');
    if (!select) {
      return;
    }

    var categories = Array.from(
      new Set(
        products.map(function (product) {
          return product.category;
        })
      )
    ).sort();

    categories.forEach(function (category) {
      var option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });

    var queryCategory = getCategoryFromQuery();
    if (queryCategory && categories.indexOf(queryCategory) >= 0) {
      select.value = queryCategory;
    }

    var queryText = getSearchFromQuery();
    var queryInput = document.querySelector('[data-search-products]');
    if (queryInput && queryText) {
      queryInput.value = queryText;
    }
  }

  function productCard(product) {
    return (
      '<article class="product-card">' +
      '<a class="product-card__image-wrap" href="' +
      productHref(product) +
      '">' +
      '<img src="' +
      product.image +
      '" alt="' +
      product.name +
      '" loading="lazy" width="320" height="260">' +
      '<span class="pill">' +
      product.format +
      '</span>' +
      '</a>' +
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
      productHref(product) +
      '" class="btn btn-outline">View Spec</a>' +
      '<button type="button" class="btn btn-primary" data-add-to-cart="' +
      product.id +
      '">Add</button>' +
      '</div>' +
      '</div>' +
      '</article>'
    );
  }

  function applyFilters(products) {
    var category = document.querySelector('[data-filter-category]')
      ? document.querySelector('[data-filter-category]').value
      : 'all';
    var query = document.querySelector('[data-search-products]')
      ? document.querySelector('[data-search-products]').value.trim().toLowerCase()
      : '';
    var sort = document.querySelector('[data-sort-products]')
      ? document.querySelector('[data-sort-products]').value
      : 'featured';

    var filtered = products.filter(function (product) {
      var matchesCategory = category === 'all' || product.category === category;
      var matchesQuery =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.tagline.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);

      return matchesCategory && matchesQuery;
    });

    if (sort === 'price-asc') {
      filtered.sort(function (a, b) {
        return a.price - b.price;
      });
    } else if (sort === 'price-desc') {
      filtered.sort(function (a, b) {
        return b.price - a.price;
      });
    } else {
      filtered.sort(function (a, b) {
        return Number(b.featured) - Number(a.featured);
      });
    }

    return filtered;
  }

  function renderGrid(products) {
    var grid = document.querySelector('[data-shop-grid]');
    var count = document.querySelector('[data-results-count]');

    if (!grid || !count) {
      return;
    }

    var filtered = applyFilters(products);
    count.textContent = String(filtered.length);

    if (filtered.length === 0) {
      grid.innerHTML =
        '<div class="empty-state"><h3>No products found</h3><p>Try another category, search term, or sort setting.</p></div>';
      return;
    }

    grid.innerHTML = filtered.map(productCard).join('');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var products = getProducts();
    if (products.length) {
      renderFilters(products);
      renderGrid(products);
    }

    ['[data-filter-category]', '[data-sort-products]', '[data-search-products]'].forEach(function (selector) {
      var node = document.querySelector(selector);
      if (!node) {
        return;
      }

      var eventName = selector === '[data-search-products]' ? 'input' : 'change';
      node.addEventListener(eventName, function () {
        renderGrid(getProducts());
      });
    });

    window.addEventListener('genesiscore:locationchange', function () {
      var locationProducts = getProducts();
      var select = document.querySelector('[data-filter-category]');
      if (select) {
        select.innerHTML = '<option value="all">All categories</option>';
      }
      renderFilters(locationProducts);
      renderGrid(locationProducts);
    });
  });
})();

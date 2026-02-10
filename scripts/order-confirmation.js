(function () {
  var ORDERS_KEY = 'genesis_core_orders_v1';

  function readOrders() {
    try {
      var parsed = JSON.parse(localStorage.getItem(ORDERS_KEY));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  }

  function getOrderIdFromQuery() {
    try {
      var params = new URLSearchParams(window.location.search);
      return params.get('order');
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

  document.addEventListener('DOMContentLoaded', function () {
    var orderId = getOrderIdFromQuery();
    if (!orderId) {
      return;
    }

    var order = readOrders().find(function (entry) {
      return entry.id === orderId;
    });

    if (!order) {
      return;
    }

    setText('[data-order-id]', order.id);
    setText('[data-order-total]', formatCurrency(order.total || 0));
    setText('[data-order-email]', order.email || '-');
    setText('[data-order-country]', order.country || '-');

    var itemsNode = document.querySelector('[data-order-items]');
    if (itemsNode && Array.isArray(order.items)) {
      itemsNode.innerHTML = order.items
        .map(function (item) {
          return '<li>' + item.name + ' x ' + item.quantity + '</li>';
        })
        .join('');
    }
  });
})();

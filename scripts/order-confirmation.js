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

  function readPendingOrder() {
    try {
      return JSON.parse(localStorage.getItem(PENDING_ORDER_KEY) || 'null');
    } catch (error) {
      return null;
    }
  }

  function clearPendingOrder() {
    try {
      localStorage.removeItem(PENDING_ORDER_KEY);
    } catch (error) {
      // no-op
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

  function getQueryParams() {
    try {
      return new URLSearchParams(window.location.search);
    } catch (error) {
      return new URLSearchParams();
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

    var orders = readOrders();
    var order = orders.find(function (entry) {
      return entry.id === orderId;
    });

    if (!order) {
      var params = getQueryParams();
      var redirectStatus = String(params.get('redirect_status') || '').toLowerCase();
      var paymentIntentId = String(params.get('payment_intent') || '').trim();
      var pending = readPendingOrder();

      if (
        pending &&
        pending.id === orderId &&
        ['succeeded', 'processing', 'requires_capture'].indexOf(redirectStatus) !== -1
      ) {
        order = Object.assign({}, pending, {
          paymentStatus: redirectStatus,
          paymentIntentId: paymentIntentId || pending.paymentIntentId || '',
          status: redirectStatus === 'succeeded' ? 'paid' : 'processing'
        });
        orders.unshift(order);
        writeOrders(orders.slice(0, 200));
        clearPendingOrder();
        if (window.GenesisCore && window.GenesisCore.clearCart) {
          window.GenesisCore.clearCart();
        }
      }
    }

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

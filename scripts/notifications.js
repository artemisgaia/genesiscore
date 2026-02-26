(function () {
  var QUEUE_KEY = 'genesis_core_email_queue_v1';
  var HISTORY_KEY = 'genesis_core_email_history_v1';

  function readJSON(key, fallback) {
    try {
      var parsed = JSON.parse(localStorage.getItem(key));
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function createId(prefix) {
    return prefix + '-' + Math.random().toString(36).slice(2, 10);
  }

  function formatDate(dateISO) {
    try {
      return new Date(dateISO).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return dateISO;
    }
  }

  function readQueue() {
    return readJSON(QUEUE_KEY, []);
  }

  function writeQueue(queue) {
    writeJSON(QUEUE_KEY, queue);
  }

  function readHistory() {
    return readJSON(HISTORY_KEY, []);
  }

  function writeHistory(history) {
    writeJSON(HISTORY_KEY, history);
  }

  function queueEmail(payload) {
    var queue = readQueue();
    var item = {
      id: createId('email'),
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      type: payload.type,
      dedupeKey: payload.dedupeKey || null,
      status: 'queued',
      createdAt: new Date().toISOString(),
      sendAt: payload.sendAt || new Date().toISOString()
    };

    if (item.dedupeKey) {
      var exists = queue.some(function (queued) {
        return queued.dedupeKey === item.dedupeKey;
      });
      if (exists) {
        return;
      }
    }

    queue.push(item);
    writeQueue(queue);
  }

  function compileEmail(type, data) {
    if (type === 'welcome') {
      return {
        subject: 'Welcome to Genesis Core',
        text:
          'Welcome ' +
          data.customerName +
          '. Your account is active and your routine controls are ready in the dashboard.',
        html:
          '<h2>Welcome to Genesis Core</h2><p>' +
          data.customerName +
          ', your account is active and your routine controls are ready in your dashboard.</p>'
      };
    }

    if (type === 'order-confirmation') {
      return {
        subject: 'Order Confirmed: ' + data.orderId,
        text:
          'Order ' +
          data.orderId +
          ' is confirmed. Total: ' +
          data.total +
          '. Shipping destination: ' +
          data.country +
          '.',
        html:
          '<h2>Order Confirmed</h2><p>Order <strong>' +
          data.orderId +
          '</strong> is confirmed.</p><p>Total: ' +
          data.total +
          '</p><p>Shipping destination: ' +
          data.country +
          '</p>'
      };
    }

    if (type === 'shipping-update') {
      return {
        subject: data.stage + ' - Order ' + data.orderId,
        text: 'Order ' + data.orderId + ': ' + data.stage + '.',
        html: '<h2>' + data.stage + '</h2><p>Order <strong>' + data.orderId + '</strong> update.</p>'
      };
    }

    if (type === 'subscription-event') {
      return {
        subject: 'Subscription Update: ' + data.productName,
        text:
          'Subscription action: ' +
          data.action +
          '. Product: ' +
          data.productName +
          '. Next shipment: ' +
          formatDate(data.nextShipDate) +
          '.',
        html:
          '<h2>Subscription Updated</h2><p>Action: ' +
          data.action +
          '</p><p>Product: ' +
          data.productName +
          '</p><p>Next shipment: ' +
          formatDate(data.nextShipDate) +
          '</p>'
      };
    }

    if (type === 'subscription-reminder') {
      return {
        subject: 'Upcoming Shipment Reminder: ' + data.productName,
        text:
          'Reminder: your ' +
          data.productName +
          ' subscription renews soon. Next shipment date: ' +
          formatDate(data.nextShipDate) +
          '.',
        html:
          '<h2>Upcoming Shipment Reminder</h2><p>Your <strong>' +
          data.productName +
          '</strong> subscription renews soon.</p><p>Next shipment: ' +
          formatDate(data.nextShipDate) +
          '</p>'
      };
    }

    return {
      subject: 'Genesis Core Update',
      text: 'Your account has a new update.',
      html: '<p>Your account has a new update.</p>'
    };
  }

  async function dispatchEmail(item) {
    if (!(window.fetch && window.navigator && window.navigator.onLine)) {
      return false;
    }

    try {
      var response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(item)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async function processQueue() {
    var queue = readQueue();
    if (!queue.length) {
      return;
    }

    var now = Date.now();
    var history = readHistory();
    var remaining = [];

    for (var i = 0; i < queue.length; i += 1) {
      var item = queue[i];
      if (now < new Date(item.sendAt).getTime()) {
        remaining.push(item);
        continue;
      }

      var sent = await dispatchEmail(item);
      if (sent) {
        item.status = 'sent';
      } else {
        item.status = 'staged';
      }

      item.processedAt = new Date().toISOString();
      history.unshift(item);
    }

    writeHistory(history.slice(0, 120));
    writeQueue(remaining);
  }

  function queueWelcomeEmail(payload) {
    var compiled = compileEmail('welcome', payload);
    queueEmail({
      to: payload.email,
      type: 'welcome',
      subject: compiled.subject,
      text: compiled.text,
      html: compiled.html,
      dedupeKey: 'welcome-' + payload.email
    });
  }

  function queueOrderFlow(payload) {
    var confirmed = compileEmail('order-confirmation', payload);
    queueEmail({
      to: payload.email,
      type: 'order-confirmation',
      subject: confirmed.subject,
      text: confirmed.text,
      html: confirmed.html,
      dedupeKey: 'order-confirmation-' + payload.orderId
    });

    var inTransit = compileEmail('shipping-update', {
      orderId: payload.orderId,
      stage: 'Shipment In Transit'
    });
    queueEmail({
      to: payload.email,
      type: 'shipping-update',
      subject: inTransit.subject,
      text: inTransit.text,
      html: inTransit.html,
      sendAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      dedupeKey: 'shipping-update-transit-' + payload.orderId
    });

    var delivered = compileEmail('shipping-update', {
      orderId: payload.orderId,
      stage: 'Out for Delivery'
    });
    queueEmail({
      to: payload.email,
      type: 'shipping-update',
      subject: delivered.subject,
      text: delivered.text,
      html: delivered.html,
      sendAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      dedupeKey: 'shipping-update-delivery-' + payload.orderId
    });
  }

  function queueSubscriptionEvent(payload) {
    var compiled = compileEmail('subscription-event', payload);
    queueEmail({
      to: payload.email,
      type: 'subscription-event',
      subject: compiled.subject,
      text: compiled.text,
      html: compiled.html,
      dedupeKey: 'subscription-event-' + payload.email + '-' + payload.productName + '-' + payload.action + '-' + formatDate(payload.nextShipDate)
    });
  }

  function queueSubscriptionReminder(payload) {
    var sendAt = new Date(payload.nextShipDate).getTime() - 3 * 24 * 60 * 60 * 1000;
    var compiled = compileEmail('subscription-reminder', payload);
    queueEmail({
      to: payload.email,
      type: 'subscription-reminder',
      subject: compiled.subject,
      text: compiled.text,
      html: compiled.html,
      sendAt: new Date(Math.max(Date.now(), sendAt)).toISOString(),
      dedupeKey: 'subscription-reminder-' + payload.email + '-' + payload.productName + '-' + formatDate(payload.nextShipDate)
    });
  }

  function getOutbox() {
    return {
      queued: readQueue(),
      history: readHistory()
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    processQueue();
  });

  window.GenesisNotifications = {
    queueWelcomeEmail: queueWelcomeEmail,
    queueOrderFlow: queueOrderFlow,
    queueSubscriptionEvent: queueSubscriptionEvent,
    queueSubscriptionReminder: queueSubscriptionReminder,
    processQueue: processQueue,
    getOutbox: getOutbox
  };
})();

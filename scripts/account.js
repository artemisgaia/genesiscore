(function () {
  var USERS_KEY = 'genesis_core_users_v1';
  var SESSION_KEY = 'genesis_core_session_v1';
  var SUBSCRIPTIONS_KEY = 'genesis_core_subscriptions_v1';
  var SESSION_DAYS = 14;

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

  function toBase64(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function fromBase64(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  function randomId(prefix) {
    return prefix + '-' + Math.random().toString(36).slice(2, 10);
  }

  function createSalt() {
    if (window.crypto && window.crypto.getRandomValues) {
      var salt = new Uint8Array(16);
      window.crypto.getRandomValues(salt);
      return toBase64(salt);
    }

    var fallback = new Uint8Array(16);
    for (var i = 0; i < fallback.length; i += 1) {
      fallback[i] = Math.floor(Math.random() * 256);
    }
    return toBase64(fallback);
  }

  async function hashPassword(password, saltBase64, iterations) {
    var salt = fromBase64(saltBase64);
    var rounds = iterations || 120000;

    if (!(window.crypto && window.crypto.subtle && window.TextEncoder)) {
      return btoa(password + ':' + saltBase64 + ':' + String(rounds));
    }

    var encoder = new TextEncoder();
    var keyMaterial = await window.crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);

    var derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: rounds,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    return toBase64(new Uint8Array(derivedBits));
  }

  async function createPasswordRecord(password) {
    var salt = createSalt();
    var iterations = 120000;
    var hash = await hashPassword(password, salt, iterations);

    return {
      algorithm: 'PBKDF2-SHA256',
      iterations: iterations,
      salt: salt,
      hash: hash
    };
  }

  async function verifyPassword(password, passwordRecord) {
    if (!passwordRecord || !passwordRecord.salt || !passwordRecord.hash) {
      return false;
    }

    var hash = await hashPassword(password, passwordRecord.salt, passwordRecord.iterations || 120000);
    return hash === passwordRecord.hash;
  }

  function getUsers() {
    return readJSON(USERS_KEY, []);
  }

  function saveUsers(users) {
    writeJSON(USERS_KEY, users);
  }

  function getUserByEmail(email) {
    var normalized = String(email || '').trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    return (
      getUsers().find(function (user) {
        return user.email === normalized;
      }) || null
    );
  }

  function getUserById(userId) {
    return (
      getUsers().find(function (user) {
        return user.id === userId;
      }) || null
    );
  }

  function createSession(userId) {
    var expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    writeJSON(SESSION_KEY, {
      userId: userId,
      expiresAt: expiresAt
    });
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function getSession() {
    var session = readJSON(SESSION_KEY, null);
    if (!session || !session.userId || !session.expiresAt) {
      return null;
    }

    if (Date.now() > new Date(session.expiresAt).getTime()) {
      clearSession();
      return null;
    }

    return session;
  }

  function getCurrentUser() {
    var session = getSession();
    if (!session) {
      return null;
    }

    return getUserById(session.userId);
  }

  function getSubscriptionsMap() {
    return readJSON(SUBSCRIPTIONS_KEY, {});
  }

  function saveSubscriptionsMap(map) {
    writeJSON(SUBSCRIPTIONS_KEY, map);
  }

  function getUserSubscriptions(userId) {
    var map = getSubscriptionsMap();
    return Array.isArray(map[userId]) ? map[userId] : [];
  }

  function saveUserSubscriptions(userId, subscriptions) {
    var map = getSubscriptionsMap();
    map[userId] = subscriptions;
    saveSubscriptionsMap(map);
  }

  function addDays(dateISO, days) {
    var date = new Date(dateISO);
    date.setDate(date.getDate() + days);
    return date.toISOString();
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

  function getProductNameById(productId) {
    if (!window.GenesisCore || !window.GenesisCore.getProductById) {
      return productId;
    }
    var product = window.GenesisCore.getProductById(productId);
    return product ? product.name : productId;
  }

  function createStarterSubscriptions(userId) {
    var now = new Date().toISOString();
    var starter = [
      {
        id: randomId('sub'),
        userId: userId,
        productId: 'core-multi',
        intervalDays: 30,
        nextShipDate: addDays(now, 30),
        status: 'active',
        createdAt: now,
        updatedAt: now
      },
      {
        id: randomId('sub'),
        userId: userId,
        productId: 'omega-3-tg',
        intervalDays: 30,
        nextShipDate: addDays(now, 30),
        status: 'active',
        createdAt: now,
        updatedAt: now
      }
    ];

    saveUserSubscriptions(userId, starter);
    return starter;
  }

  function setFeedback(node, message, isError) {
    if (!node) {
      return;
    }

    node.textContent = message || '';
    node.style.color = isError ? 'var(--accent)' : 'var(--success)';
  }

  function queueSubscriptionEmails(user, subscription, actionLabel) {
    if (!window.GenesisNotifications || !user) {
      return;
    }

    window.GenesisNotifications.queueSubscriptionEvent({
      email: user.email,
      customerName: user.name,
      action: actionLabel,
      productName: getProductNameById(subscription.productId),
      nextShipDate: subscription.nextShipDate
    });

    if (subscription.status === 'active') {
      window.GenesisNotifications.queueSubscriptionReminder({
        email: user.email,
        customerName: user.name,
        productName: getProductNameById(subscription.productId),
        nextShipDate: subscription.nextShipDate
      });
    }
  }

  function renderAccountSummary(user) {
    document.querySelectorAll('[data-account-name]').forEach(function (node) {
      node.textContent = user ? user.name : 'Guest';
    });
    document.querySelectorAll('[data-account-email]').forEach(function (node) {
      node.textContent = user ? user.email : 'Not signed in';
    });
    document.querySelectorAll('[data-account-country]').forEach(function (node) {
      node.textContent = user ? user.country : 'Not set';
    });
    document.querySelectorAll('[data-account-created]').forEach(function (node) {
      node.textContent = user ? formatDate(user.createdAt) : '-';
    });
  }

  function setupSignOut() {
    document.querySelectorAll('[data-signout-btn]').forEach(function (button) {
      button.addEventListener('click', function () {
        clearSession();
        window.location.href = 'signin.html';
      });
    });
  }

  function setupRegionForm(user) {
    var form = document.querySelector('[data-region-form]');
    var select = document.querySelector('[data-region-select]');
    var feedback = document.querySelector('[data-account-feedback]');

    if (!form || !select || !user) {
      return;
    }

    select.value = user.country || '';

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var users = getUsers();
      var index = users.findIndex(function (entry) {
        return entry.id === user.id;
      });

      if (index === -1) {
        setFeedback(feedback, 'Account record was not found.', true);
        return;
      }

      users[index].country = select.value;
      users[index].updatedAt = new Date().toISOString();
      saveUsers(users);
      setFeedback(feedback, 'Shipping region updated.');
      renderAccountSummary(users[index]);
    });
  }

  function renderSubscriptions(user) {
    var list = document.querySelector('[data-subscriptions-list]');
    var empty = document.querySelector('[data-subscriptions-empty]');

    if (!list || !empty || !user) {
      return;
    }

    var subscriptions = getUserSubscriptions(user.id);
    list.innerHTML = '';

    if (!subscriptions.length) {
      empty.hidden = false;
      return;
    }

    empty.hidden = true;

    subscriptions.forEach(function (subscription) {
      var card = document.createElement('article');
      card.className = 'panel';
      card.innerHTML =
        '<p class="policy-kicker">' +
        (subscription.status === 'active' ? 'Active' : subscription.status === 'paused' ? 'Paused' : 'Canceled') +
        '</p>' +
        '<h3>' +
        getProductNameById(subscription.productId) +
        '</h3>' +
        '<p>Next shipment: ' +
        formatDate(subscription.nextShipDate) +
        '</p>' +
        '<p class="form-note">Every ' +
        subscription.intervalDays +
        ' days</p>' +
        '<div class="product-card__actions" style="margin-top:0.8rem;">' +
        (subscription.status === 'active'
          ? '<button type="button" class="btn btn-outline" data-subscription-action="pause" data-subscription-id="' +
            subscription.id +
            '">Pause</button><button type="button" class="btn btn-outline" data-subscription-action="skip" data-subscription-id="' +
            subscription.id +
            '">Skip Next</button><button type="button" class="btn btn-ghost" data-subscription-action="cancel" data-subscription-id="' +
            subscription.id +
            '">Cancel</button>'
          : subscription.status === 'paused'
            ? '<button type="button" class="btn btn-outline" data-subscription-action="resume" data-subscription-id="' +
              subscription.id +
              '">Resume</button><button type="button" class="btn btn-ghost" data-subscription-action="cancel" data-subscription-id="' +
              subscription.id +
              '">Cancel</button>'
            : '<button type="button" class="btn btn-outline" data-subscription-action="resume" data-subscription-id="' +
              subscription.id +
              '">Reactivate</button>') +
        '</div>';

      list.appendChild(card);
    });
  }

  function setupSubscriptions(user) {
    var page = document.querySelector('[data-subscriptions-page]');
    var feedback = document.querySelector('[data-subscriptions-feedback]');

    if (!page || !user) {
      return;
    }

    renderSubscriptions(user);

    page.addEventListener('click', function (event) {
      var actionButton = event.target.closest('[data-subscription-action]');
      if (!actionButton) {
        return;
      }

      var action = actionButton.getAttribute('data-subscription-action');
      var subscriptionId = actionButton.getAttribute('data-subscription-id');
      var subscriptions = getUserSubscriptions(user.id);
      var index = subscriptions.findIndex(function (item) {
        return item.id === subscriptionId;
      });

      if (index === -1) {
        setFeedback(feedback, 'Subscription record not found.', true);
        return;
      }

      var now = new Date().toISOString();
      if (action === 'pause') {
        subscriptions[index].status = 'paused';
        subscriptions[index].nextShipDate = addDays(subscriptions[index].nextShipDate, 30);
      } else if (action === 'resume') {
        subscriptions[index].status = 'active';
        if (Date.now() > new Date(subscriptions[index].nextShipDate).getTime()) {
          subscriptions[index].nextShipDate = addDays(now, 3);
        }
      } else if (action === 'skip') {
        subscriptions[index].nextShipDate = addDays(subscriptions[index].nextShipDate, subscriptions[index].intervalDays);
      } else if (action === 'cancel') {
        subscriptions[index].status = 'canceled';
      }

      subscriptions[index].updatedAt = now;
      saveUserSubscriptions(user.id, subscriptions);
      queueSubscriptionEmails(user, subscriptions[index], action);
      renderSubscriptions(user);
      setFeedback(feedback, 'Subscription updated.');
    });

    var addStarter = document.querySelector('[data-add-starter-subscriptions]');
    if (addStarter) {
      addStarter.addEventListener('click', function () {
        var current = getUserSubscriptions(user.id);
        if (current.length) {
          setFeedback(feedback, 'Subscriptions already exist for this account.', true);
          return;
        }
        createStarterSubscriptions(user.id);
        renderSubscriptions(user);
        setFeedback(feedback, 'Starter subscriptions created.');
      });
    }
  }

  function renderNotificationSummary(user) {
    var summaryNode = document.querySelector('[data-email-summary]');
    if (!summaryNode || !window.GenesisNotifications || !user) {
      return;
    }

    var outbox = window.GenesisNotifications.getOutbox();
    var queued = outbox.queued.filter(function (item) {
      return item.to === user.email;
    }).length;
    var processed = outbox.history.filter(function (item) {
      return item.to === user.email;
    }).length;

    summaryNode.textContent = 'Queued: ' + queued + ' | Processed: ' + processed;
  }

  async function setupAuthForms() {
    var signinForm = document.querySelector('[data-signin-form]');
    var signupForm = document.querySelector('[data-signup-form]');
    var signinFeedback = document.querySelector('[data-auth-feedback]');
    var signupFeedback = document.querySelector('[data-signup-feedback]');

    if (signinForm) {
      signinForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        var email = String(signinForm.querySelector('input[name="email"]').value || '').trim().toLowerCase();
        var password = String(signinForm.querySelector('input[name="password"]').value || '');

        var user = getUserByEmail(email);
        if (!user) {
          setFeedback(signinFeedback, 'Invalid email or password.', true);
          return;
        }

        var verified = await verifyPassword(password, user.passwordRecord);
        if (!verified) {
          setFeedback(signinFeedback, 'Invalid email or password.', true);
          return;
        }

        createSession(user.id);
        setFeedback(signinFeedback, 'Signed in successfully. Redirecting...');
        window.setTimeout(function () {
          window.location.href = 'dashboard.html';
        }, 250);
      });
    }

    if (signupForm) {
      signupForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        var name = String(signupForm.querySelector('input[name="name"]').value || '').trim();
        var email = String(signupForm.querySelector('input[name="email"]').value || '').trim().toLowerCase();
        var country = String(signupForm.querySelector('select[name="country"]').value || '').trim();
        var password = String(signupForm.querySelector('input[name="password"]').value || '');

        if (name.length < 2) {
          setFeedback(signupFeedback, 'Please enter your full name.', true);
          return;
        }

        if (!email || email.indexOf('@') === -1) {
          setFeedback(signupFeedback, 'Please enter a valid email.', true);
          return;
        }

        if (password.length < 8) {
          setFeedback(signupFeedback, 'Password must be at least 8 characters.', true);
          return;
        }

        if (getUserByEmail(email)) {
          setFeedback(signupFeedback, 'An account with this email already exists.', true);
          return;
        }

        var passwordRecord = await createPasswordRecord(password);
        var user = {
          id: randomId('user'),
          name: name,
          email: email,
          country: country,
          passwordRecord: passwordRecord,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        var users = getUsers();
        users.push(user);
        saveUsers(users);
        createStarterSubscriptions(user.id);

        if (window.GenesisNotifications) {
          window.GenesisNotifications.queueWelcomeEmail({
            email: user.email,
            customerName: user.name
          });
        }

        createSession(user.id);
        setFeedback(signupFeedback, 'Account created. Redirecting...');

        window.setTimeout(function () {
          window.location.href = 'dashboard.html';
        }, 250);
      });
    }
  }

  function enforceProtectedRoutes(user) {
    var protectedPage = document.querySelector('[data-account-dashboard]') || document.querySelector('[data-subscriptions-page]');
    if (!protectedPage || user) {
      return false;
    }

    window.location.href = 'signin.html';
    return true;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var user = getCurrentUser();

    if (enforceProtectedRoutes(user)) {
      return;
    }
    if (!getCurrentUser()) {
      setupAuthForms();
      setupSignOut();
      return;
    }

    user = getCurrentUser();
    renderAccountSummary(user);
    setupRegionForm(user);
    setupSubscriptions(user);
    renderNotificationSummary(user);
    setupSignOut();
    setupAuthForms();
  });

  window.GenesisAccount = {
    getCurrentUser: getCurrentUser,
    clearSession: clearSession,
    getUserSubscriptions: getUserSubscriptions,
    saveUserSubscriptions: saveUserSubscriptions
  };
})();

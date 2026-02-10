#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const productsPath = path.resolve(process.cwd(), 'catalog/generated-products.json');
const productDir = path.resolve(process.cwd(), 'products');
const collectionsDir = path.resolve(process.cwd(), 'collections');
const sitemapPath = path.resolve(process.cwd(), 'sitemap.xml');

if (!fs.existsSync(productsPath)) {
  console.error('Missing catalog/generated-products.json. Run build-catalog first.');
  process.exit(1);
}

const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

const CATEGORY_ORDER = ['Foundational', 'Focus', 'Energy', 'Immunity', 'Sleep', 'Recovery', 'Performance'];

const CATEGORY_COPY = {
  Foundational:
    'Core Base modules for daily baseline coverage: broad-spectrum micronutrients, structural lipids, and routine anchors.',
  Focus:
    'Cognitive support modules engineered for concentration quality, composure under load, and clean daytime execution.',
  Energy:
    'Metabolic and daytime drive modules for stable output without routine complexity.',
  Immunity:
    'Daily resilience modules focused on immune readiness and seasonal consistency.',
  Sleep: 'Night protocol modules designed for sleep quality, recovery depth, and circadian consistency.',
  Recovery:
    'Recovery modules supporting hydration, connective tissue comfort, and post-training restoration.',
  Performance:
    'Performance modules for training blocks, strength output, and repeatable recovery architecture.'
};

const STARTER_PREFS = {
  Foundational: ['daily gummy multi', 'magnesium glycinate', 'coq10', 'probiotic', 'super greens'],
  Focus: ['brain & memory', 'lion', 'neuro powder', 'ginkgo', 'l-theanine'],
  Energy: ['metabolic burn', 'keto drops', 'l-carnitine', 'surge', 'mct'],
  Immunity: ['daily defense', 'zinc defense', 'd3 + k2', 'quercetin', 'elderberry'],
  Sleep: ['night drops', 'deep sleep complex', 'gaba', 'l-theanine', 'valerian'],
  Recovery: ['curcumin', 'joint', 'collagen', 'tart cherry', 'colostrum'],
  Performance: ['creatine mono', 'whey', 'hydrate electrolytes', 'pre-fx', 'bcaa']
};

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plainText(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function shippingScopeLabel(scope) {
  const value = String(scope || 'ALL_SUPPORTED_DESTINATIONS').toUpperCase();
  if (value === 'US_ONLY') return 'US shipping only';
  return 'Ships to supported destinations';
}

function categorySlug(category) {
  return String(category || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function categoryDisplayName(category) {
  if (category === 'Foundational') return 'Core Base';
  if (category === 'Performance') return 'Core Performance';
  return category;
}

function productPath(product) {
  return '/products/' + product.id + '.html';
}

function categoryPath(category) {
  return '/collections/' + categorySlug(category) + '.html';
}

function absoluteUrl(relative) {
  return 'https://genesiscore.com' + relative;
}

function splitClaims(text) {
  return String(text || '')
    .split(';')
    .map((item) => item.replace(/\.$/, '').trim())
    .filter(Boolean)
    .slice(0, 4);
}

function getCategories(allProducts) {
  const unique = Array.from(new Set(allProducts.map((product) => product.category)));
  return unique.sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    const aRank = ai === -1 ? 999 : ai;
    const bRank = bi === -1 ? 999 : bi;
    if (aRank !== bRank) return aRank - bRank;
    return String(a).localeCompare(String(b));
  });
}

function sortProductsByName(list) {
  return list.slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function createFaqEntries(product) {
  return [
    {
      q: 'How should this be used in a routine?',
      a: plainText(product.howToUse)
    },
    {
      q: 'Can this be stacked with other Genesis Core products?',
      a: 'Yes. This module is designed for stack architecture and can be combined with foundational and targeted products based on your objective.'
    },
    {
      q: 'What quality controls are applied?',
      a: plainText(product.testing)
    }
  ];
}

function organizationJsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Genesis Core',
    url: 'https://genesiscore.com',
    logo: 'https://genesiscore.com/assets/logo-dark.svg',
    sameAs: ['https://www.instagram.com/genesiscore', 'https://www.linkedin.com/company/genesiscore'],
    description: 'Bio-tech minimalist supplement house engineered for consistency and performance hygiene.'
  });
}

function webSiteJsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Genesis Core',
    url: 'https://genesiscore.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://genesiscore.com/shop.html?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  });
}

function breadcrumbJsonLd(items) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url)
    }))
  });
}

function productJsonLd(product) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: plainText(product.whatItIs + ' ' + product.whatItDoes),
    image: [absoluteUrl(product.image)],
    brand: {
      '@type': 'Brand',
      name: 'Genesis Core'
    },
    sku: product.id,
    category: product.category,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: String(product.price),
      availability: 'https://schema.org/InStock',
      url: absoluteUrl(productPath(product))
    }
  });
}

function faqJsonLd(faqEntries) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqEntries.map((entry) => ({
      '@type': 'Question',
      name: entry.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.a
      }
    }))
  });
}

function itemListJsonLd(category, categoryProducts) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Genesis Core ' + categoryDisplayName(category) + ' Collection',
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: categoryProducts.length,
    itemListElement: categoryProducts.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(productPath(product)),
      name: product.name
    }))
  });
}

function renderHeader() {
  return `
    <header class="site-header">
      <div class="container nav">
        <a href="/index.html" class="brand" aria-label="Genesis Core home">
          <img src="/assets/logo-dark.svg" data-brand-logo="true" alt="Genesis Core" width="260" height="62" />
        </a>
        <nav class="nav-links" aria-label="Primary">
          <a href="/index.html">Home</a>
          <a href="/shop.html">Shop</a>
          <a href="/science.html">Science</a>
          <a href="/quality.html">Quality</a>
          <a href="/quiz.html">Core Quiz</a>
          <a href="/about.html">About</a>
          <a href="/contact.html">Contact</a>
        </nav>
        <div class="nav-actions">
          <button class="btn btn-outline theme-toggle" type="button" data-theme-toggle>Dark Mode</button>
          <button class="btn btn-outline cart-trigger" type="button" data-open-cart>Cart <span class="cart-count" data-cart-count>0</span></button>
          <button class="btn btn-outline menu-toggle" type="button" data-menu-toggle aria-expanded="false">Menu</button>
        </div>
      </div>
      <div class="container mobile-menu" data-mobile-menu>
        <a href="/index.html">Home</a>
        <a href="/shop.html">Shop</a>
        <a href="/science.html">Science</a>
        <a href="/quality.html">Quality</a>
        <a href="/quiz.html">Core Quiz</a>
        <a href="/about.html">About</a>
        <a href="/contact.html">Contact</a>
      </div>
    </header>`;
}

function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <img src="/assets/logo-dark.svg" data-brand-logo="true" alt="Genesis Core" width="260" height="62" />
            <p>Bio-tech minimalist supplement systems for consistent performance hygiene.</p>
          </div>
          <div>
            <h3 class="footer-title">Commerce</h3>
            <nav class="footer-links">
              <a href="/shop.html">All Products</a>
              <a href="/quiz.html">Core Quiz</a>
              <a href="/science.html">Science / Standards</a>
              <a href="/quality.html">Quality & Testing</a>
            </nav>
          </div>
          <div>
            <h3 class="footer-title">Brand</h3>
            <nav class="footer-links">
              <a href="/about.html">About Genesis Core</a>
              <a href="/contact.html">Contact</a>
              <a href="/index.html#faq">FAQ</a>
            </nav>
          </div>
          <div>
            <h3 class="footer-title">Policies</h3>
            <nav class="footer-links">
              <a href="/shipping.html">Shipping</a>
              <a href="/returns.html">Returns</a>
              <a href="/privacy.html">Privacy</a>
              <a href="/terms.html">Terms</a>
              <a href="/disclaimer.html">Supplement Disclaimer</a>
            </nav>
          </div>
        </div>
        <div class="footer-bottom">
          <span>(c) <span data-year></span> Genesis Core. All rights reserved.</span>
          <span>What it is / What it does / How to use</span>
        </div>
      </div>
    </footer>`;
}

function renderCartDrawer() {
  return `
    <div class="cart-backdrop" data-cart-backdrop></div>
    <aside class="cart-drawer" data-cart-drawer aria-label="Shopping cart">
      <div class="cart-header"><h2 class="cart-title">Your Cart</h2><button type="button" class="btn btn-ghost" data-close-cart>Close</button></div>
      <div class="cart-body"><p class="cart-empty" data-cart-empty>Your cart is currently empty.</p><div class="cart-items" data-cart-items></div></div>
      <div class="cart-footer">
        <div class="cart-total"><span>Subtotal</span><strong data-cart-total>$0</strong></div>
        <a href="/cart.html" class="btn btn-outline">Open Cart</a>
        <a href="/checkout.html" class="btn btn-primary">Checkout</a>
        <p class="cart-note">Taxes and shipping are calculated at checkout.</p>
      </div>
    </aside>`;
}

function renderBreadcrumbs(items) {
  const html = items
    .map((item, index) => {
      const last = index === items.length - 1;
      if (last) return '<span aria-current="page">' + escapeHtml(item.name) + '</span>';
      return '<a href="' + escapeHtml(item.url) + '">' + escapeHtml(item.name) + '</a>';
    })
    .join(' <span>/</span> ');

  return '<nav aria-label="Breadcrumb" style="margin-bottom:1rem;font-size:.9rem;opacity:.9">' + html + '</nav>';
}

function renderCategoryHubLinks(categories, currentCategory) {
  return (
    '<div class="category-links">' +
    categories
      .map((category) => {
        const attrs = category === currentCategory ? ' aria-current="page"' : '';
        return (
          '<a href="' +
          categoryPath(category) +
          '"' +
          attrs +
          '>' +
          escapeHtml(categoryDisplayName(category)) +
          '</a>'
        );
      })
      .join('') +
    '</div>'
  );
}

function renderFaqHtml(product, faqEntries) {
  return faqEntries
    .map((entry, index) => {
      const answerId = 'faq-' + product.id + '-' + index;
      return (
        '<article class="faq-item">' +
        '<button type="button" data-accordion-button aria-expanded="false" aria-controls="' +
        answerId +
        '">' +
        escapeHtml(entry.q) +
        '</button>' +
        '<div class="faq-answer" id="' +
        answerId +
        '">' +
        escapeHtml(entry.a) +
        '</div>' +
        '</article>'
      );
    })
    .join('');
}

function renderProductCards(list) {
  if (!list.length) return '<p>No products available in this section.</p>';

  return list
    .map((product) => {
      return (
        '<article class="product-card">' +
        '<a class="product-card__image-wrap" href="' +
        productPath(product) +
        '">' +
        '<img src="' +
        escapeHtml(product.image) +
        '" alt="' +
        escapeHtml(product.name) +
        '" loading="lazy" width="320" height="260"></a>' +
        '<div class="product-card__content">' +
        '<p class="product-card__category">' +
        escapeHtml(product.category) +
        '</p>' +
        '<h3><a href="' +
        productPath(product) +
        '">' +
        escapeHtml(product.name) +
        '</a></h3>' +
        '<p>' +
        escapeHtml(product.tagline) +
        '</p>' +
        '<div class="product-card__meta"><span>' +
        escapeHtml(product.servings) +
        ' servings</span><span>$' +
        escapeHtml(product.price) +
        '</span></div>' +
        '<p class="' +
        (String(product.shippingScope || '').toUpperCase() === 'US_ONLY'
          ? 'shipping-note shipping-note--us-only'
          : 'shipping-note') +
        '" style="margin-top:.35rem">' +
        escapeHtml(shippingScopeLabel(product.shippingScope)) +
        '</p>' +
        '<div class="product-card__actions">' +
        '<a class="btn btn-outline" href="' +
        productPath(product) +
        '">View Spec</a>' +
        '<button type="button" class="btn btn-primary" data-add-to-cart="' +
        escapeHtml(product.id) +
        '">Add</button>' +
        '</div>' +
        '</div>' +
        '</article>'
      );
    })
    .join('');
}

function includesAnyName(product, terms) {
  const text = String(product.name || '').toLowerCase();
  return terms.some((term) => text.includes(String(term).toLowerCase()));
}

function starterStackForCategory(category, categoryProducts) {
  const prefs = STARTER_PREFS[category] || [];
  const selected = [];
  const used = new Set();

  prefs.forEach((term) => {
    if (selected.length >= 3) return;
    const match = categoryProducts.find((product) => !used.has(product.id) && includesAnyName(product, [term]));
    if (match) {
      used.add(match.id);
      selected.push(match);
    }
  });

  categoryProducts.forEach((product) => {
    if (selected.length >= 3) return;
    if (!used.has(product.id)) {
      used.add(product.id);
      selected.push(product);
    }
  });

  return selected.slice(0, 3);
}

function renderStarterStack(category, starter) {
  const ids = starter.map((product) => product.id).join(',');
  const sum = starter.reduce((total, product) => total + Number(product.price || 0), 0);

  return (
    '<article class="panel" style="margin-top:1rem">' +
    '<span class="eyebrow">Starter Stack</span>' +
    '<h3>Recommended ' +
    escapeHtml(categoryDisplayName(category)) +
    ' starter set</h3>' +
    '<p>Entry stack engineered to create a clean baseline in this category before adding more modules.</p>' +
    '<p class="bundle-card__includes" style="margin-top:.65rem">Includes: ' +
    starter.map((product) => escapeHtml(product.name)).join(' | ') +
    '</p>' +
    '<div class="product-card__actions" style="margin-top:.75rem">' +
    '<button type="button" class="btn btn-primary" data-add-stack="' +
    ids +
    '">Add Starter Stack</button>' +
    '<span style="font-size:.85rem;color:var(--text-muted)">Total: $' +
    sum +
    '</span>' +
    '</div>' +
    '</article>'
  );
}

function renderProductPage(product, allProducts, categories) {
  const title = product.name + ' | Genesis Core';
  const description = plainText(product.whatItIs + ' ' + product.whatItDoes).slice(0, 156);
  const canonical = absoluteUrl(productPath(product));
  const related = sortProductsByName(allProducts.filter((candidate) => candidate.id !== product.id && candidate.category === product.category)).slice(0, 3);
  const faqEntries = createFaqEntries(product);
  const breadcrumbItems = [
    { name: 'Home', url: '/index.html' },
    { name: 'Shop', url: '/shop.html' },
    { name: categoryDisplayName(product.category), url: categoryPath(product.category) },
    { name: product.name, url: productPath(product) }
  ];
  const claims = splitClaims(product.whatItDoes);
  const points = [
    'What it is: ' + plainText(product.whatItIs),
    'What it does: ' + (claims.length ? claims.join('; ') : plainText(product.whatItDoes)),
    'How to use: ' + plainText(product.howToUse)
  ];

  return `<!doctype html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="product" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${absoluteUrl(product.image)}" />
    <meta name="theme-color" content="#0f151b" />
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
    <script>
      (function () {
        try {
          var key = "genesis_core_theme_v1";
          var saved = localStorage.getItem(key);
          var hour = new Date().getHours();
          var autoTheme = hour >= 7 && hour < 19 ? "light" : "dark";
          var theme = saved === "light" || saved === "dark" ? saved : autoTheme;
          document.documentElement.setAttribute("data-theme", theme);
        } catch (error) {
          document.documentElement.setAttribute("data-theme", "light");
        }
      })();
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@500;600;700&family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/styles/main.css" />
    <script type="application/ld+json">${organizationJsonLd()}</script>
    <script type="application/ld+json">${webSiteJsonLd()}</script>
    <script type="application/ld+json">${productJsonLd(product)}</script>
    <script type="application/ld+json">${faqJsonLd(faqEntries)}</script>
    <script type="application/ld+json">${breadcrumbJsonLd(breadcrumbItems)}</script>
  </head>
  <body>
    <div class="announcement">
      <div class="container"><span>Product Specification Page: Standardized Clinical Detail</span></div>
    </div>
    ${renderHeader()}
    <main>
      <section class="page-hero">
        <div class="container">${renderBreadcrumbs(breadcrumbItems)}</div>
        <div class="container pdp-grid">
          <article class="pdp-media"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" width="640" height="520" /></article>
          <article class="pdp-core">
            <span class="eyebrow">${escapeHtml(product.category)}</span>
            <h1>${escapeHtml(product.name)}</h1>
            <p>${escapeHtml(product.tagline)}</p>
            <div class="pdp-meta"><span>${escapeHtml(product.format)} | ${escapeHtml(product.servings)} servings</span><span class="${
    String(product.shippingScope || '').toUpperCase() === 'US_ONLY' ? 'shipping-note shipping-note--us-only' : 'shipping-note'
  }">${escapeHtml(shippingScopeLabel(product.shippingScope))}</span></div>
            <div class="pdp-price"><strong>$${escapeHtml(product.price)}</strong><span>USD</span></div>
            <div class="pdp-actions">
              <button type="button" class="btn btn-primary" data-add-to-cart="${escapeHtml(product.id)}">Add To Cart</button>
              <a href="/quiz.html" class="btn btn-outline">Build My Stack</a>
            </div>
            <p class="form-note" style="margin-top:.65rem">Subscribe and save 12%. Pause, skip, or cancel anytime from your account. <a href="/subscriptions.html">Manage subscriptions</a>.</p>
            <ul class="pdp-points">${points.map((point) => '<li>' + escapeHtml(point) + '</li>').join('')}</ul>
          </article>
        </div>
      </section>
      <section class="section">
        <div class="container pdp-grid--details">
          <article class="pdp-card"><h3>What it is</h3><p>${escapeHtml(product.whatItIs)}</p></article>
          <article class="pdp-card"><h3>What it does</h3><p>${escapeHtml(product.whatItDoes)}</p></article>
          <article class="pdp-card"><h3>How to use</h3><p>${escapeHtml(product.howToUse)}</p></article>
        </div>
        <div class="container pdp-grid--details" style="margin-top:1rem">
          <article class="pdp-card"><h3>Who it is for</h3><p>${escapeHtml(product.whoItsFor || product.tagline)}</p></article>
          <article class="pdp-card"><h3>When to use</h3><p>${escapeHtml(product.whenToUse || product.howToUse)}</p></article>
          <article class="pdp-card"><h3>Stack guidance</h3><p>${escapeHtml(product.stackGuidance || 'Stack with Core Base and one targeted module aligned to your objective.')}</p></article>
        </div>
      </section>
      <section class="section">
        <div class="container split-grid">
          <article class="panel">
            <span class="eyebrow">Ingredient Panel</span>
            <h3>Composition</h3>
            <p>${escapeHtml(product.ingredients)}</p>
          </article>
          <article class="panel">
            <span class="eyebrow">Testing / Quality</span>
            <h3>Standards</h3>
            <p>${escapeHtml(product.testing)}</p>
            <p style="margin-top:.75rem"><a href="/quality.html" class="btn btn-outline">View Quality Protocol</a></p>
          </article>
        </div>
      </section>
      <section class="section">
        <div class="container">
          <article class="panel">
            <span class="eyebrow">Category Hubs</span>
            <h3>Explore adjacent modules by objective</h3>
            <p>Move across category hubs to compare complementary modules in the same system architecture.</p>
            ${renderCategoryHubLinks(categories, product.category)}
          </article>
        </div>
      </section>
      <section class="section">
        <div class="container split-grid">
          <article class="panel">
            <span class="eyebrow">FAQ + Cautions</span>
            <h3>Before you use this product</h3>
            <p>${escapeHtml(product.cautions)}</p>
            <div class="faq-grid" style="margin-top:1rem">${renderFaqHtml(product, faqEntries)}</div>
          </article>
          <article class="panel">
            <span class="eyebrow">Related Products</span>
            <h3>Compatible modules</h3>
            <div class="product-grid pdp-related-grid">${renderProductCards(related)}</div>
          </article>
        </div>
      </section>
    </main>
    ${renderFooter()}
    ${renderCartDrawer()}
    <div class="pdp-sticky-bar" data-pdp-sticky>
      <div class="pdp-sticky-bar__meta"><strong>$${escapeHtml(product.price)}</strong><span>${escapeHtml(product.name)}</span></div>
      <button type="button" class="btn btn-primary" data-add-to-cart="${escapeHtml(product.id)}">Add To Cart</button>
    </div>
    <script src="/scripts/products.js" defer></script>
    <script src="/scripts/main.js" defer></script>
  </body>
</html>
`;
}

function renderCategoryPage(category, categoryProducts, categories) {
  const heading = categoryDisplayName(category) + ' Collection';
  const description = CATEGORY_COPY[category] || 'Modular products grouped by objective and routine architecture.';
  const canonical = absoluteUrl(categoryPath(category));
  const breadcrumbItems = [
    { name: 'Home', url: '/index.html' },
    { name: 'Shop', url: '/shop.html' },
    { name: categoryDisplayName(category), url: categoryPath(category) }
  ];
  const starter = starterStackForCategory(category, categoryProducts);

  return `<!doctype html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(heading)} | Genesis Core</title>
    <meta name="description" content="${escapeHtml(plainText(description))}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(heading)} | Genesis Core" />
    <meta property="og:description" content="${escapeHtml(plainText(description))}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="https://genesiscore.com/assets/logo-dark.svg" />
    <meta name="theme-color" content="#0f151b" />
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
    <script>
      (function () {
        try {
          var key = "genesis_core_theme_v1";
          var saved = localStorage.getItem(key);
          var hour = new Date().getHours();
          var autoTheme = hour >= 7 && hour < 19 ? "light" : "dark";
          var theme = saved === "light" || saved === "dark" ? saved : autoTheme;
          document.documentElement.setAttribute("data-theme", theme);
        } catch (error) {
          document.documentElement.setAttribute("data-theme", "light");
        }
      })();
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@500;600;700&family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/styles/main.css" />
    <script type="application/ld+json">${organizationJsonLd()}</script>
    <script type="application/ld+json">${webSiteJsonLd()}</script>
    <script type="application/ld+json">${itemListJsonLd(category, categoryProducts)}</script>
    <script type="application/ld+json">${breadcrumbJsonLd(breadcrumbItems)}</script>
  </head>
  <body>
    <div class="announcement"><div class="container"><span>Category Hub: ${escapeHtml(categoryDisplayName(category))}</span></div></div>
    ${renderHeader()}
    <main>
      <section class="page-hero">
        <div class="container">
          ${renderBreadcrumbs(breadcrumbItems)}
          <span class="eyebrow">Collection</span>
          <h1>${escapeHtml(heading)}</h1>
          <p class="section-copy">${escapeHtml(description)}</p>
          ${renderCategoryHubLinks(categories, category)}
          ${renderStarterStack(category, starter)}
        </div>
      </section>
      <section class="section">
        <div class="container">
          <p class="results-row"><strong>${categoryProducts.length}</strong> products available</p>
          <div class="product-grid">${renderProductCards(categoryProducts)}</div>
        </div>
      </section>
    </main>
    ${renderFooter()}
    ${renderCartDrawer()}
    <script src="/scripts/products.js" defer></script>
    <script src="/scripts/main.js" defer></script>
  </body>
</html>
`;
}

function writeProductPages(allProducts, categories) {
  if (!fs.existsSync(productDir)) fs.mkdirSync(productDir, { recursive: true });

  fs.readdirSync(productDir)
    .filter((file) => file.endsWith('.html'))
    .forEach((file) => {
      fs.unlinkSync(path.join(productDir, file));
    });

  allProducts.forEach((product) => {
    const html = renderProductPage(product, allProducts, categories);
    fs.writeFileSync(path.join(productDir, product.id + '.html'), html, 'utf8');
  });
}

function writeCategoryPages(allProducts, categories) {
  if (!fs.existsSync(collectionsDir)) fs.mkdirSync(collectionsDir, { recursive: true });

  categories.forEach((category) => {
    const categoryProducts = sortProductsByName(allProducts.filter((product) => product.category === category));
    const html = renderCategoryPage(category, categoryProducts, categories);
    fs.writeFileSync(path.join(collectionsDir, categorySlug(category) + '.html'), html, 'utf8');
  });
}

function writeSitemap(allProducts, categories) {
  const basePages = [
    '/',
    '/shop.html',
    '/quiz.html',
    '/science.html',
    '/quality.html',
    '/ingredients.html',
    '/about.html',
    '/contact.html',
    '/cart.html',
    '/checkout.html',
    '/order-confirmation.html',
    '/signin.html',
    '/dashboard.html',
    '/subscriptions.html',
    '/shipping.html',
    '/returns.html',
    '/privacy.html',
    '/terms.html',
    '/disclaimer.html'
  ];

  const categoryPages = categories.map((category) => categoryPath(category));
  const productPages = allProducts.map((product) => productPath(product));
  const urls = basePages.concat(categoryPages, productPages);

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((relative) => '  <url><loc>' + absoluteUrl(relative) + '</loc></url>').join('\n') +
    '\n</urlset>\n';

  fs.writeFileSync(sitemapPath, body, 'utf8');
}

const categories = getCategories(products);
writeProductPages(products, categories);
writeCategoryPages(products, categories);
writeSitemap(products, categories);

console.log('Generated ' + products.length + ' static PDP pages in /products.');
console.log('Generated ' + categories.length + ' category hub pages in /collections.');
console.log('Updated sitemap.xml with product and collection URLs.');

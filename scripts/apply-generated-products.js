#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const generatedPath = path.resolve(process.cwd(), 'catalog/generated-products.json');
const productsJsPath = path.resolve(process.cwd(), 'scripts/products.js');

if (!fs.existsSync(generatedPath)) {
  console.error('Missing generated products file: ' + generatedPath);
  process.exit(1);
}

if (!fs.existsSync(productsJsPath)) {
  console.error('Missing target file: ' + productsJsPath);
  process.exit(1);
}

const generated = JSON.parse(fs.readFileSync(generatedPath, 'utf8'));

const FEATURED_RULES = {
  Foundational: ['multi', 'omega', 'magnesium', 'probiotic', 'coq10', 'vitamin'],
  Focus: ['focus', 'brain', 'methylene', 'lion', 'ginkgo', 'ashwagandha'],
  Energy: ['energy', 'metabolic', 'keto', 'berberine', 'green coffee', 'mct'],
  Immunity: ['immune', 'elderberry', 'zinc', 'd3', 'quercetin', 'respiratory'],
  Sleep: ['sleep', 'melatonin', 'night', 'gaba', 'valerian', 'calm'],
  Recovery: ['recovery', 'collagen', 'joint', 'digest', 'dental', 'turmeric'],
  Performance: ['creatine', 'whey', 'protein', 'electrolyte', 'pre-workout', 'bcaa']
};

function includesAny(text, keywords) {
  const haystack = String(text || '').toLowerCase();
  return keywords.some((keyword) => haystack.includes(String(keyword).toLowerCase()));
}

function pickCategoryProducts(products, category, preferredKeywords, limit, usedIds) {
  const pool = products.filter((product) => product.category === category && !usedIds.has(product.id));
  const picks = [];

  preferredKeywords.forEach((keyword) => {
    if (picks.length >= limit) return;
    const hit = pool.find((product) => !usedIds.has(product.id) && includesAny(product.name, [keyword]));
    if (hit) {
      usedIds.add(hit.id);
      picks.push(hit);
    }
  });

  pool.forEach((product) => {
    if (picks.length >= limit) return;
    if (usedIds.has(product.id)) return;
    usedIds.add(product.id);
    picks.push(product);
  });

  return picks;
}

function merchandisedProducts(products) {
  const usedIds = new Set();
  const featuredIds = new Set();

  Object.keys(FEATURED_RULES).forEach((category) => {
    const picks = pickCategoryProducts(products, category, FEATURED_RULES[category], 2, usedIds);
    picks.forEach((product) => featuredIds.add(product.id));
  });

  return products.map((product) => ({
    ...product,
    featured: featuredIds.has(product.id)
  }));
}

function buildBundleFromIds(id, name, tagline, products, itemIds, discountPct) {
  const byId = new Map(products.map((product) => [product.id, product]));
  const selected = itemIds.map((itemId) => byId.get(itemId)).filter(Boolean);
  const compareAt = selected.reduce((sum, product) => sum + Number(product.price || 0), 0);
  const pct = Number.isFinite(Number(discountPct)) ? Number(discountPct) : 10;
  let price = Math.round(compareAt * (1 - pct / 100));
  if (price < 39) price = 39;

  return {
    id,
    name,
    includes: selected.map((product) => product.name),
    items: selected.map((product) => product.id),
    discountPct: pct,
    price,
    compareAt,
    tagline
  };
}

function buildBundles(products) {
  const used = new Set();
  const foundational = pickCategoryProducts(products, 'Foundational', FEATURED_RULES.Foundational, 4, used);
  const focus = pickCategoryProducts(products, 'Focus', FEATURED_RULES.Focus, 4, used);
  const sleep = pickCategoryProducts(products, 'Sleep', FEATURED_RULES.Sleep, 2, used);
  const recovery = pickCategoryProducts(products, 'Recovery', FEATURED_RULES.Recovery, 2, used);
  const performance = pickCategoryProducts(products, 'Performance', FEATURED_RULES.Performance, 4, used);

  return [
    buildBundleFromIds(
      'bundle-core-base',
      'Core Base Protocol',
      'Baseline daily architecture for micronutrients, gut support, and consistency.',
      products,
      foundational.map((product) => product.id),
      10
    ),
    buildBundleFromIds(
      'bundle-core-focus',
      'Core Focus Protocol',
      'Clean cognition stack for high-output work blocks without noise.',
      products,
      focus.map((product) => product.id),
      10
    ),
    buildBundleFromIds(
      'bundle-core-recovery',
      'Core Sleep + Recovery Protocol',
      'Night-depth and tissue-repair modules for repeatable next-day readiness.',
      products,
      sleep.concat(recovery).map((product) => product.id),
      12
    ),
    buildBundleFromIds(
      'bundle-core-performance',
      'Core Performance Protocol',
      'Training stack for output, hydration, and repeatable session quality.',
      products,
      performance.map((product) => product.id),
      8
    )
  ];
}

const products = merchandisedProducts(generated);
const bundles = buildBundles(products);
const next =
  'window.GENESIS_PRODUCTS = ' +
  JSON.stringify(products, null, 2) +
  ';\n\nwindow.GENESIS_BUNDLES = ' +
  JSON.stringify(bundles, null, 2) +
  ';\n';

fs.writeFileSync(productsJsPath, next, 'utf8');
console.log('Updated scripts/products.js with ' + products.length + ' generated products.');
console.log('Updated scripts/products.js with ' + bundles.length + ' generated bundles.');

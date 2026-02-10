#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const engine = require('./quiz-engine.js');

const productsPath = path.resolve(process.cwd(), 'catalog/generated-products.json');
if (!fs.existsSync(productsPath)) {
  console.error('Missing catalog/generated-products.json. Run build-catalog first.');
  process.exit(1);
}

const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const combos = engine.generateAnswerCombinations();
const productById = new Map(products.map((product) => [product.id, product]));

function categoriesFor(result) {
  return result.productIds
    .map((id) => productById.get(id))
    .filter(Boolean)
    .map((product) => product.category);
}

function assert(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

let failures = [];

combos.forEach((answers, index) => {
  const result = engine.recommendStack(products, answers);
  const ids = result.productIds || [];
  const unique = new Set(ids);
  const categories = categoriesFor(result);

  const prefix = 'Combo #' + (index + 1) + ' ' + JSON.stringify(answers) + ': ';

  assert(ids.length >= 3, prefix + 'stack contains fewer than 3 products', failures);
  assert(unique.size === ids.length, prefix + 'stack contains duplicate product IDs', failures);
  assert(ids.every((id) => productById.has(id)), prefix + 'stack contains unknown product IDs', failures);

  if (answers.goal === 'focus') {
    assert(categories.includes('Focus'), prefix + 'focus goal missing Focus category', failures);
  }
  if (answers.goal === 'energy') {
    assert(
      categories.includes('Energy') || categories.includes('Performance'),
      prefix + 'energy goal missing Energy/Performance category',
      failures
    );
  }
  if (answers.goal === 'sleep') {
    assert(categories.includes('Sleep'), prefix + 'sleep goal missing Sleep category', failures);
  }
  if (answers.goal === 'immunity') {
    assert(categories.includes('Immunity'), prefix + 'immunity goal missing Immunity category', failures);
  }
  if (answers.goal === 'foundation') {
    assert(categories.includes('Foundational'), prefix + 'foundation goal missing Foundational category', failures);
  }

  if (answers.foundation === 'none') {
    const foundationalCount = categories.filter((category) => category === 'Foundational').length;
    assert(foundationalCount >= 2, prefix + 'foundation=none missing two Foundational modules', failures);
  }

  if (answers.sleep === 'poor') {
    assert(categories.includes('Sleep'), prefix + 'sleep=poor missing Sleep module', failures);
  }

  if (answers.training === 'high') {
    assert(categories.includes('Performance'), prefix + 'training=high missing Performance module', failures);
  }

  if (answers.stress === 'high') {
    assert(
      categories.includes('Recovery') || categories.includes('Sleep'),
      prefix + 'stress=high missing Recovery/Sleep module',
      failures
    );
  }
});

if (failures.length) {
  console.error('Quiz engine validation failed. Total issues: ' + failures.length);
  failures.slice(0, 50).forEach((failure) => {
    console.error('- ' + failure);
  });
  process.exit(1);
}

console.log('Quiz engine validation passed for ' + combos.length + ' answer combinations.');

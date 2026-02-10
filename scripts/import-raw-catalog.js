#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const HEADERS = [
  'source_sku',
  'source_name',
  'form',
  'functional_area',
  'category',
  'servings',
  'cost_usd',
  'srp_usd',
  'active_ingredients',
  'primary_benefits',
  'usage',
  'cautions',
  'image_file'
];

function escapeCSV(value) {
  const text = String(value == null ? '' : value);
  if (/[",\n]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

function toCSV(rows, headers) {
  const lines = [headers.map(escapeCSV).join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((header) => escapeCSV(row[header])).join(','));
  });
  return lines.join('\n') + '\n';
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

function splitEntries(raw) {
  return raw
    .split(/\n(?=\d+\.\s+)/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseEntry(block) {
  const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
  const first = lines[0] || '';
  const match = first.match(/^(\d+)\.\s+(.+)$/);
  const index = match ? Number(match[1]) : null;
  const name = match ? match[2].trim() : first;

  const fields = {
    index,
    name,
    basePrice: '',
    srp: '',
    amount: '',
    benefits: '',
    scienceFacts: '',
    ingredients: '',
    flavorType: '',
    weight: ''
  };

  const mapping = {
    'Base Price': 'basePrice',
    SRP: 'srp',
    Amount: 'amount',
    Benefits: 'benefits',
    'Science Facts': 'scienceFacts',
    Ingredients: 'ingredients',
    'Flavor/Type': 'flavorType',
    Weight: 'weight'
  };

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    const keyMatch = line.match(/^([^:]+):\s*(.*)$/);
    if (!keyMatch) {
      continue;
    }

    const key = keyMatch[1].trim();
    const value = keyMatch[2].trim();
    const mapped = mapping[key];
    if (mapped) {
      fields[mapped] = value;
    }
  }

  return fields;
}

function inferForm(name, amount) {
  const text = (name + ' ' + amount).toLowerCase();
  if (text.includes('gummies') || text.includes('gummy')) return 'Gummies';
  if (text.includes('capsules') || text.includes('capsule')) return 'Capsules';
  if (text.includes('softgels') || text.includes('softgel')) return 'Softgels';
  if (text.includes('tablets') || text.includes('tablet')) return 'Tablets';
  if (text.includes('chewables') || text.includes('chewable')) return 'Chewables';
  if (text.includes('bags') || text.includes('tea')) return 'Tea Bags';
  if (text.includes('powder') || text.includes('protein') || text.includes('pre-workout') || text.includes('post-workout') || text.includes('bcaa')) return 'Powder';
  if (text.includes('oz') || text.includes('oil')) return 'Liquid';
  return 'Capsules';
}

function parseServings(amount, form) {
  const numberMatch = String(amount || '').match(/(\d+)/);
  const value = numberMatch ? Number(numberMatch[1]) : 30;
  if (form === 'Liquid' && /oz/i.test(amount || '')) {
    return value;
  }
  return value;
}

function inferFunctionalArea(name, benefits, scienceFacts) {
  const text = (name + ' ' + benefits + ' ' + scienceFacts).toLowerCase();
  if (
    /multivitamin|vitamin|omega|b12|biotin|iron|selenium|chromium|iodine|potassium|niacin|folate|coq10|resveratrol|dhea/.test(
      text
    )
  )
    return 'foundational';
  if (/sleep|melatonin|valerian|gaba|5-htp|st\.? john|holy basil/.test(text)) return 'sleep';
  if (/brain|nootropic|focus|memory|cognitive|rhodiola|bacopa|lions?\s*mane|ginkgo|ginseng/.test(text))
    return 'focus';
  if (/immune|elderberry|echinacea|olive leaf|goldenseal|astragalus|zinc|vitamin c|quercetin/.test(text)) return 'immunity';
  if (/joint|turmeric|muscle relief|post-workout|tart cherry|glucosamine|hyaluronic/.test(text)) return 'recovery';
  if (/whey|pre-workout|bcaa|creatine|l-arginine|electrolyte|beetroot|endurance|strength/.test(text)) return 'performance';
  if (/fat burner|keto|garcinia|green coffee|raspberry ketones|forskolin|cla|metabolism|berberine/.test(text)) return 'energy';
  if (/probiotic|digestive|apple cider|charcoal|psyllium|papaya|detox/.test(text)) return 'gut';
  if (/hair|skin|nails|collagen|silica|beauty/.test(text)) return 'beauty';
  return 'foundational';
}

function inferCategory(functionalArea) {
  if (functionalArea === 'sleep') return 'Sleep';
  if (functionalArea === 'focus') return 'Focus';
  if (functionalArea === 'immunity') return 'Immunity';
  if (functionalArea === 'recovery' || functionalArea === 'gut' || functionalArea === 'beauty') return 'Recovery';
  if (functionalArea === 'performance') return 'Performance';
  if (functionalArea === 'energy') return 'Energy';
  return 'Foundational';
}

function inferUsage(form) {
  if (form === 'Gummies' || form === 'Chewables') return 'Take 2 servings daily with food and water.';
  if (form === 'Powder') return 'Mix one serving with water once daily or as directed on label.';
  if (form === 'Tea Bags') return 'Steep one tea bag in hot water for 5 to 7 minutes.';
  if (form === 'Liquid') return 'Shake well and use daily as directed on product label.';
  return 'Take 2 capsules or softgels daily with food and water unless otherwise directed on label.';
}

function parsePrice(text) {
  const cleaned = String(text || '').replace(/[$,]/g, '');
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : '';
}

function inferImageFile(functionalArea, sourceName) {
  const name = String(sourceName || '').toLowerCase();
  if (name.includes("men's") || name.includes('mens')) return 'assets/product-men.svg';
  if (name.includes("women's") || name.includes('womens')) return 'assets/product-women.svg';

  const map = {
    sleep: 'assets/product-sleep.svg',
    focus: 'assets/product-focus.svg',
    immunity: 'assets/product-immune.svg',
    recovery: 'assets/product-joint.svg',
    performance: 'assets/product-energy.svg',
    energy: 'assets/product-energy.svg',
    gut: 'assets/product-gut.svg',
    beauty: 'assets/product-collagen.svg',
    foundational: 'assets/product-omega.svg'
  };

  return map[functionalArea] || 'assets/product-greens.svg';
}

function buildRow(entry) {
  const form = inferForm(entry.name, entry.amount);
  const servings = parseServings(entry.amount, form);
  const functionalArea = inferFunctionalArea(entry.name, entry.benefits, entry.scienceFacts);
  const category = inferCategory(functionalArea);
  const sku = 'CAT-' + String(entry.index || 0).padStart(3, '0');
  const caution = 'Consult a qualified healthcare professional before use if pregnant, nursing, taking medication, or managing a medical condition.';

  return {
    source_sku: sku,
    source_name: entry.name,
    form,
    functional_area: functionalArea,
    category,
    servings,
    cost_usd: parsePrice(entry.basePrice),
    srp_usd: parsePrice(entry.srp),
    active_ingredients: entry.ingredients,
    primary_benefits: entry.benefits,
    usage: inferUsage(form),
    cautions: caution,
    image_file: inferImageFile(functionalArea, entry.name)
  };
}

function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3] || 'catalog/full-product-intake.csv';

  if (!inputPath) {
    console.error('Usage: node scripts/import-raw-catalog.js <raw-text-file> [output-csv]');
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(process.cwd(), inputPath), 'utf8');
  const entries = splitEntries(raw).map(parseEntry);
  const rows = entries.map(buildRow);

  fs.writeFileSync(path.resolve(process.cwd(), outputPath), toCSV(rows, HEADERS), 'utf8');
  console.log('Parsed entries: ' + rows.length);
  console.log('Output CSV: ' + outputPath);
}

main();

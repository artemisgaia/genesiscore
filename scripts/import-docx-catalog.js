#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const INPUT_TEXT = process.argv[2] || '/tmp/genesis_all_products.txt';
const OUTPUT_CSV = process.argv[3] || 'catalog/full-product-intake.csv';
const OUTPUT_MAPPING = process.argv[4] || 'catalog/product-name-mapping.csv';
const HTML_ONE = process.argv[5] || '/Users/adamblack/Downloads/Catalog _ Supliful vita 1.html';
const HTML_TWO = process.argv[6] || '/Users/adamblack/Downloads/Catalog _ Supliful vita 2.html';

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

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\t+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeForMatch(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cleanLine(value) {
  return normalizeWhitespace(String(value || '').replace(/^[\u200b\u200e\u200f\u202a-\u202e]+/, ''));
}

function readLines(filePath) {
  const raw = fs
    .readFileSync(filePath, 'utf8')
    .replace(/\r/g, '\n')
    .replace(/\u2028/g, '\n')
    .replace(/\u2029/g, '\n')
    .replace(/\u0085/g, '\n');

  return raw.split('\n').map(cleanLine);
}

function previousMeaningful(lines, startIndex) {
  for (let i = startIndex; i >= 0; i -= 1) {
    const line = cleanLine(lines[i]);
    if (!line) continue;
    if (/^_+$/.test(line)) continue;
    return { index: i, value: line };
  }
  return { index: -1, value: '' };
}

function parseMoney(line) {
  const text = cleanLine(line);
  const match = text.match(/([0-9]+(?:\.[0-9]{1,2})?)/);
  return match ? Number.parseFloat(match[1]) : '';
}

function findCurrency(lines, start, end) {
  for (let i = start; i < end; i += 1) {
    const value = parseMoney(lines[i]);
    if (value !== '') {
      return value;
    }
  }
  return '';
}

function findPriceBelowLabel(lines, labelIndex, endIndex) {
  for (let i = labelIndex + 1; i < Math.min(labelIndex + 6, endIndex); i += 1) {
    const line = cleanLine(lines[i]);
    if (!line) continue;
    if (/^range$/i.test(line)) break;
    const value = parseMoney(line);
    if (value !== '') {
      return value;
    }
  }
  return '';
}

function findSrp(lines, start, end) {
  for (let k = start; k < end; k += 1) {
    if (/^suggested retail price$/i.test(cleanLine(lines[k]))) {
      for (let i = k + 1; i < Math.min(k + 6, end); i += 1) {
        const line = cleanLine(lines[i]);
        if (!line) continue;
        const value = parseMoney(line);
        if (value !== '') {
          return value;
        }
      }
      return '';
    }
  }
  return '';
}

function findYourPrice(lines, marker, end) {
  for (let i = marker + 1; i < Math.min(marker + 6, end); i += 1) {
    const line = cleanLine(lines[i]);
    if (!line) continue;
    if (/^range$/i.test(line)) break;
    const value = parseMoney(line);
    if (value !== '') {
      return value;
    }
  }
  return '';
}

function startsNewField(value) {
  const line = cleanLine(value);
  if (!line) return false;
  if (/^science behind this product$/i.test(line)) return true;
  if (/^use these facts/i.test(line)) return true;
  if (/^source$/i.test(line)) return true;
  if (/^your price$/i.test(line)) return true;
  if (/^suggested retail price$/i.test(line)) return true;
  if (/^ships (exclusively to us|to all destinations\.?)$/i.test(line)) return true;
  if (/^[a-z][a-z0-9 '&()\/.+-]{1,45}:/i.test(line)) return true;
  return false;
}

function extractField(segmentLines, fieldRegex) {
  for (let i = 0; i < segmentLines.length; i += 1) {
    const line = cleanLine(segmentLines[i]);
    if (!fieldRegex.test(line)) continue;

    let value = normalizeWhitespace(line.replace(fieldRegex, '').trim());
    for (let j = i + 1; j < segmentLines.length; j += 1) {
      const next = cleanLine(segmentLines[j]);
      if (!next) break;
      if (startsNewField(next)) break;
      value = normalizeWhitespace(value + ' ' + next);
    }
    return value;
  }
  return '';
}

function getFirstMeaningfulDescription(segmentLines) {
  let shippingSeen = false;
  for (let i = 0; i < segmentLines.length; i += 1) {
    const line = cleanLine(segmentLines[i]);
    if (!line) continue;

    if (/^ships (exclusively to us|to all destinations\.?)$/i.test(line)) {
      shippingSeen = true;
      continue;
    }

    if (!shippingSeen) continue;
    if (/^(ingredients|manufacturer|product amount|gross weight|suggested use|warning|caution|science behind this product)/i.test(line))
      continue;
    if (/^\*these statements have not been evaluated/i.test(line)) continue;
    if (/^key features$/i.test(line)) continue;
    if (/^source$/i.test(line)) continue;
    if (/^use these facts/i.test(line)) continue;
    if (line.length < 24) continue;

    return line;
  }
  return '';
}

function parseBenefits(segmentLines, fallbackDescription) {
  const bullets = segmentLines
    .map((line) => cleanLine(line))
    .filter((line) => /^•\s*/.test(line))
    .map((line) => normalizeWhitespace(line.replace(/^•\s*/, '').replace(/^\-\s*/, '').replace(/\*+$/, '')))
    .filter(Boolean);

  if (bullets.length) {
    return bullets.slice(0, 4).join('; ');
  }

  const sentenceSeed = normalizeWhitespace(fallbackDescription).replace(/\*+$/, '');
  if (!sentenceSeed) {
    return 'Daily wellness support';
  }
  return sentenceSeed
    .split(/(?<=[.!?])\s+/)
    .map((s) => normalizeWhitespace(s.replace(/\*+$/, '')))
    .filter(Boolean)
    .slice(0, 2)
    .join('; ');
}

function inferForm(sourceName, productAmount, ingredientsText) {
  const seed = [sourceName, productAmount, ingredientsText].join(' ').toLowerCase();
  if (/strip/.test(seed)) return 'Strips';
  if (/chewable/.test(seed)) return 'Chewables';
  if (/gumm/.test(seed)) return 'Gummies';
  if (/softgel/.test(seed)) return 'Softgels';
  if (/capsule|\bcaps\b/.test(seed)) return 'Capsules';
  if (/tablet/.test(seed)) return 'Tablets';
  if (/drops?|serum|oil|liquid|gel|moisturizer|soap/.test(seed)) return 'Liquid';
  if (/powder|protein|coffee|tea/.test(seed)) return 'Powder';
  return 'Capsules';
}

function inferServings(productAmount, sourceName, form) {
  const seed = normalizeWhitespace([productAmount, sourceName].join(' '));
  const servingMatch = seed.match(
    /(\d+)\s*(servings?|capsules?|caps|softgels?|gummies?|tablets?|chewables?|strips?|bags?|pods?|sachets?)/i
  );
  if (servingMatch) {
    return Number.parseInt(servingMatch[1], 10);
  }
  if (/fl oz|ml/i.test(seed) || form === 'Liquid') {
    return 30;
  }
  return 60;
}

function inferCategory(sourceCategory, sourceName, ingredients, description) {
  const heading = normalizeWhitespace(sourceCategory).toLowerCase();
  const text = normalizeWhitespace([sourceName, ingredients, description].join(' ')).toLowerCase();

  if (/sleep|insomnia|melatonin|valerian|5-htp|gaba|night|calm/.test(text)) return 'Sleep';
  if (/creatine|whey|protein|bcaa|pre-workout|post-workout|electrolyte|hydration|muscle|testosterone|tribulus|arginine|beetroot/.test(text))
    return 'Performance';
  if (/brain|focus|memory|nootropic|lion's mane|lions mane|rhodiola|bacopa|ginkgo|ginseng|ashwagandha|methylene/.test(text))
    return 'Focus';
  if (/immune|elderberry|zinc|vitamin d3|quercetin|nac|glutathione|olive leaf|grape seed|pine bark|respiratory|lung|echinacea|goldenseal|astragalus|sea moss/.test(text))
    return 'Immunity';
  if (/fat burner|keto|berberine|garcinia|green coffee|raspberry ketones|cla|apple cider vinegar|blood sugar|metabolic|mct|carnitine|weight management/.test(text))
    return 'Energy';
  if (/joint|turmeric|collagen|glucosamine|krill|digest|probiotic|detox|hair|skin|nails|beauty|dental|oral|liver|kidney/.test(text))
    return 'Recovery';

  if (/muscle/.test(heading)) return 'Performance';
  if (/brain/.test(heading)) return 'Focus';
  if (/sleep/.test(heading)) return 'Sleep';
  if (/immun/.test(heading)) return 'Immunity';
  if (/weight/.test(heading)) return 'Energy';
  if (/skin|hair|nail/.test(heading)) return 'Recovery';
  if (/heart|vitamin|mineral|essential/.test(heading)) return 'Foundational';

  return 'Foundational';
}

function categoryToFunctionalArea(category) {
  if (category === 'Foundational') return 'foundational';
  if (category === 'Focus') return 'focus';
  if (category === 'Energy') return 'energy';
  if (category === 'Sleep') return 'sleep';
  if (category === 'Recovery') return 'recovery';
  if (category === 'Performance') return 'performance';
  if (category === 'Immunity') return 'immunity';
  return 'foundational';
}

function imageByCategory(category) {
  if (category === 'Sleep') return 'assets/product-sleep.svg';
  if (category === 'Focus') return 'assets/product-focus.svg';
  if (category === 'Energy') return 'assets/product-energy.svg';
  if (category === 'Immunity') return 'assets/product-immune.svg';
  if (category === 'Recovery') return 'assets/product-joint.svg';
  if (category === 'Performance') return 'assets/product-energy.svg';
  return 'assets/product-omega.svg';
}

function normalizeWord(word) {
  const acronyms = new Set([
    'BCAA',
    'CBD',
    'CLA',
    'COQ10',
    'D3',
    'DHEA',
    'GABA',
    'K2',
    'MCT',
    'NAC',
    'USP',
    'KSM-66'
  ]);
  const upper = word.toUpperCase();
  if (acronyms.has(upper)) return upper;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function cleanDescriptor(sourceName) {
  return normalizeWhitespace(
    String(sourceName || '')
      .replace(/\(([^)]+)\)/g, ' $1 ')
      .replace(/[’']/g, '')
      .replace(/&/g, ' and ')
      .replace(/\s+/g, ' ')
  )
    .split(' ')
    .map(normalizeWord)
    .join(' ')
    .trim();
}

function prefixByCategory(category) {
  if (category === 'Foundational') return 'Core Base';
  if (category === 'Focus') return 'Core Focus';
  if (category === 'Energy') return 'Core Energy';
  if (category === 'Sleep') return 'Core Sleep';
  if (category === 'Recovery') return 'Core Recovery';
  if (category === 'Performance') return 'Core Performance';
  if (category === 'Immunity') return 'Core Immunity';
  return 'Core Base';
}

function buildName(sourceName, category, form, usedNames) {
  const prefix = prefixByCategory(category);
  const descriptor = cleanDescriptor(sourceName);
  let candidate = normalizeWhitespace(prefix + ' ' + descriptor);

  if (usedNames.has(candidate.toLowerCase())) {
    candidate = normalizeWhitespace(candidate + ' ' + form);
  }

  let n = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    candidate = normalizeWhitespace(prefix + ' ' + descriptor + ' ' + form + ' ' + n);
    n += 1;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function parseAvailabilityMap(htmlPath) {
  if (!fs.existsSync(htmlPath)) return new Map();
  const html = fs.readFileSync(htmlPath, 'utf8');
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return new Map();
  let data = null;
  try {
    data = JSON.parse(match[1]);
  } catch (error) {
    return new Map();
  }
  const rows = data?.props?.pageProps?.products;
  if (!Array.isArray(rows)) return new Map();

  const map = new Map();
  rows.forEach((row) => {
    const key = normalizeForMatch(row.name);
    const availability = Array.isArray(row.availability) ? row.availability : [];
    const scope =
      availability.length === 1 && String(availability[0]).toUpperCase() === 'US'
        ? 'US_ONLY'
        : 'ALL_SUPPORTED_DESTINATIONS';
    map.set(key, scope);
  });
  return map;
}

function mergeAvailabilityMaps() {
  const one = parseAvailabilityMap(HTML_ONE);
  const two = parseAvailabilityMap(HTML_TWO);
  const merged = new Map();
  one.forEach((value, key) => merged.set(key, value));
  two.forEach((value, key) => merged.set(key, value));
  return merged;
}

function main() {
  if (!fs.existsSync(INPUT_TEXT)) {
    console.error('Input text file not found: ' + INPUT_TEXT);
    process.exit(1);
  }

  const lines = readLines(INPUT_TEXT);
  const availabilityMap = mergeAvailabilityMaps();
  const usedNames = new Set();

  const priceRows = [];
  lines.forEach((line, idx) => {
    if (/^your price$/i.test(cleanLine(line))) {
      priceRows.push(idx);
    }
  });

  const rows = [];
  const mappingRows = [];

  for (let i = 0; i < priceRows.length; i += 1) {
    const marker = priceRows[i];
    const end = i + 1 < priceRows.length ? priceRows[i + 1] : lines.length;
    const segment = lines.slice(marker, end).map(cleanLine);
    const previousName = previousMeaningful(lines, marker - 1);
    const previousCategory = previousMeaningful(lines, previousName.index - 1);

    const sourceName = previousName.value;
    if (!sourceName) continue;

    const sourceCategory = previousCategory.value;
    const cost = findYourPrice(lines, marker, end);
    const srp = findSrp(lines, marker, end);

    let shippingScope = '';
    segment.forEach((entry) => {
      if (/^ships exclusively to us$/i.test(entry)) {
        shippingScope = 'US_ONLY';
      } else if (/^ships to all destinations\.?$/i.test(entry)) {
        shippingScope = 'ALL_SUPPORTED_DESTINATIONS';
      }
    });

    if (!shippingScope) {
      shippingScope = availabilityMap.get(normalizeForMatch(sourceName)) || 'ALL_SUPPORTED_DESTINATIONS';
    }

    const description = getFirstMeaningfulDescription(segment);
    const ingredients = extractField(segment, /^ingredients?:/i) || 'See Supplement Facts panel for active ingredients.';
    const productAmount = extractField(segment, /^product amount/i);
    const suggestedUse = extractField(segment, /^suggested use:/i);
    const warning = extractField(segment, /^warning:/i);
    const caution = extractField(segment, /^caution:/i) || extractField(segment, /^cautions?:/i) || extractField(segment, /^CAUTION:/i);
    const cautions = normalizeWhitespace([warning, caution].filter(Boolean).join(' '));
    const form = inferForm(sourceName, productAmount, ingredients);
    const servings = inferServings(productAmount, sourceName, form);
    const category = inferCategory(sourceCategory, sourceName, ingredients, description);
    const functionalArea = categoryToFunctionalArea(category);
    const benefits = parseBenefits(segment, description);
    const brandName = buildName(sourceName, category, form, usedNames);

    const fallbackUsageByForm = {
      Gummies: 'Take 2 gummies daily with food and water.',
      Chewables: 'Chew 1 serving daily after meals.',
      Powder: 'Mix one serving daily with water.',
      Softgels: 'Take 2 softgels daily with food and water.',
      Capsules: 'Take 2 capsules daily with food and water.',
      Tablets: 'Take 1 tablet daily with food and water.',
      Strips: 'Place one strip on the tongue daily and allow it to dissolve.',
      Liquid: 'Use once daily as directed on the product label.'
    };

    const usage = suggestedUse || fallbackUsageByForm[form] || 'Use only as directed on the label.';

    const row = {
      source_sku: 'GCN-' + String(i + 1).padStart(3, '0'),
      source_name: sourceName,
      brand_name: brandName,
      form,
      functional_area: functionalArea,
      category,
      servings,
      cost_usd: cost,
      srp_usd: srp,
      active_ingredients: ingredients,
      primary_benefits: benefits,
      usage,
      cautions:
        cautions ||
        'Consult a qualified healthcare professional before use if pregnant, nursing, taking medication, or managing a medical condition.',
      image_file: imageByCategory(category),
      shipping_scope: shippingScope,
      source_category: sourceCategory
    };

    rows.push(row);
    mappingRows.push({
      '#': i + 1,
      'Original Product Name': sourceName,
      'New Genesis Core Name': brandName
    });
  }

  const outputCsvPath = path.resolve(process.cwd(), OUTPUT_CSV);
  const outputMappingPath = path.resolve(process.cwd(), OUTPUT_MAPPING);

  const csvHeaders = [
    'source_sku',
    'source_name',
    'brand_name',
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
    'image_file',
    'shipping_scope',
    'source_category'
  ];

  fs.writeFileSync(outputCsvPath, toCSV(rows, csvHeaders), 'utf8');
  fs.writeFileSync(
    outputMappingPath,
    toCSV(mappingRows, ['#', 'Original Product Name', 'New Genesis Core Name']),
    'utf8'
  );

  const usOnly = rows.filter((row) => row.shipping_scope === 'US_ONLY').length;
  const global = rows.filter((row) => row.shipping_scope === 'ALL_SUPPORTED_DESTINATIONS').length;

  console.log('Imported products: ' + rows.length);
  console.log('US only: ' + usOnly + ' | All supported destinations: ' + global);
  console.log('Wrote: ' + OUTPUT_CSV);
  console.log('Wrote: ' + OUTPUT_MAPPING);
}

main();

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    if (ch !== '\r') {
      field += ch;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map((h) => String(h || '').trim());
  return rows.slice(1).filter((r) => r.some((v) => String(v || '').trim())).map((r) => {
    const out = {};
    headers.forEach((h, idx) => {
      out[h] = String(r[idx] || '').trim();
    });
    return out;
  });
}

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
    lines.push(headers.map((h) => escapeCSV(row[h])).join(','));
  });
  return lines.join('\n') + '\n';
}

function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function smartTitle(value) {
  const acronyms = new Set([
    'B12',
    'B3',
    'B5',
    'BCAA',
    'CBD',
    'CLA',
    'COQ10',
    'D3',
    'DHEA',
    'DHA',
    'EPA',
    'GABA',
    'K2',
    'MCT',
    'NAD',
    'NADP',
    'NGF',
    'PMS',
    'TCM',
    'HTP'
  ]);

  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const clean = word.replace(/[^a-zA-Z0-9-]/g, '');
      const upper = clean.toUpperCase();

      if (acronyms.has(upper)) {
        return word.replace(clean, upper);
      }

      if (/^[0-9]+-[a-z]+$/i.test(clean)) {
        return word.replace(clean, clean.toUpperCase());
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function pick(row, keys) {
  for (const key of keys) {
    if (row[key]) {
      return row[key];
    }
  }
  return '';
}

function normalizeFunctionalArea(raw, sourceName) {
  const text = (raw || sourceName || '').toLowerCase();
  if (
    /multivitamin|vitamin|omega|b12|biotin|iron|selenium|chromium|iodine|potassium|niacin|folate|coq10|resveratrol|dhea/.test(
      text
    )
  )
    return 'foundational';
  if (/sleep|night|rest/.test(text)) return 'sleep';
  if (/focus|cogn|brain|mind/.test(text)) return 'focus';
  if (/energy|stim/.test(text)) return 'energy';
  if (/immun|defense/.test(text)) return 'immunity';
  if (/joint|mobility|turmeric/.test(text)) return 'joint';
  if (/recover|hydration|electrolyte/.test(text)) return 'recovery';
  if (/perform|creatine|strength/.test(text)) return 'performance';
  if (/gut|digest|fiber/.test(text)) return 'gut';
  if (/beauty|skin|hair/.test(text)) return 'beauty';
  if (/stress|calm|adaptogen/.test(text)) return 'stress';
  if (/base|foundational|daily|multi|omega|vitamin/.test(text)) return 'foundational';
  return 'general';
}

function mapCategory(functionalArea, fallbackCategory) {
  const normalized = String(functionalArea || '').toLowerCase();
  const fromFallback = String(fallbackCategory || '').toLowerCase();

  const source = normalized || fromFallback;
  if (/sleep/.test(source)) return 'Sleep';
  if (/focus|stress/.test(source)) return 'Focus';
  if (/energy/.test(source)) return 'Energy';
  if (/perform/.test(source)) return 'Performance';
  if (/immun/.test(source)) return 'Immunity';
  if (/recover|joint|gut|beauty/.test(source)) return 'Recovery';
  if (/foundational|base|daily/.test(source)) return 'Foundational';
  return 'Foundational';
}

function mapCategoryFromBrandName(brandName) {
  const source = String(brandName || '').toLowerCase().trim();
  if (!source) return '';
  if (source.startsWith('core sleep')) return 'Sleep';
  if (source.startsWith('core recovery')) return 'Recovery';
  if (source.startsWith('core focus')) return 'Focus';
  if (source.startsWith('core energy')) return 'Energy';
  if (source.startsWith('core immunity')) return 'Immunity';
  if (source.startsWith('core performance')) return 'Performance';
  if (source.startsWith('core base')) return 'Foundational';
  return '';
}

function mapBadge(category) {
  const c = String(category || 'Foundational');
  if (c === 'Foundational') return 'Core Base';
  if (c === 'Immunity') return 'Core Immunity';
  if (c === 'Focus') return 'Core Focus';
  if (c === 'Energy') return 'Core Energy';
  if (c === 'Sleep') return 'Core Sleep';
  if (c === 'Recovery') return 'Core Recovery';
  if (c === 'Performance') return 'Core Performance';
  return 'Core Base';
}

function mapPrefixByCategory(category) {
  const c = String(category || 'Foundational');
  if (c === 'Foundational') return 'Core Base';
  if (c === 'Immunity') return 'Core Immunity';
  if (c === 'Focus') return 'Core Focus';
  if (c === 'Energy') return 'Core Energy';
  if (c === 'Sleep') return 'Core Sleep';
  if (c === 'Recovery') return 'Core Recovery';
  if (c === 'Performance') return 'Core Performance';
  return 'Core Base';
}

function mapFormSuffix(form) {
  const text = String(form || '').toLowerCase();
  if (text.includes('gumm')) return 'Gummies';
  if (text.includes('caps')) return 'Capsules';
  if (text.includes('softgel')) return 'Softgels';
  if (text.includes('powder')) return 'Powder';
  if (text.includes('tablet')) return 'Tablets';
  if (text.includes('liquid')) return 'Liquid';
  if (text.includes('tea')) return 'Tea';
  if (text.includes('chew')) return 'Chewables';
  return titleCase(form || 'Formula');
}

function inferFormat(sourceName, brandName, fallbackForm) {
  const seed = [fallbackForm, sourceName, brandName].join(' ').toLowerCase();
  if (seed.includes('gumm')) return 'Gummies';
  if (seed.includes('softgel')) return 'Softgels';
  if (seed.includes('caps')) return 'Capsules';
  if (seed.includes('powder')) return 'Powder';
  if (seed.includes('tablet')) return 'Tablets';
  if (seed.includes('chew')) return 'Chewables';
  if (seed.includes('tea')) return 'Tea';
  if (seed.includes('drop') || seed.includes('liquid') || seed.includes('oil') || seed.includes('serum'))
    return 'Liquid';
  return titleCase(fallbackForm || 'Formula');
}

function sourceDescriptor(sourceName) {
  const aliasMap = [
    [/^cholesterol control$/i, 'Lipid Balance'],
    [/^muscle relief \(cbd\)$/i, 'CBD Muscle Relief'],
    [/^testo support$/i, 'Testosterone Balance'],
    [/^fat burner$/i, 'Metabolic Ignite'],
    [/^keto support$/i, 'Keto Balance'],
    [/^hair,?\s*skin\s*&\s*nails$/i, 'Hair Skin and Nails'],
    [/^joint support$/i, 'Joint Matrix'],
    [/^immune support$/i, 'Immune Matrix'],
    [/^eye health$/i, 'Vision Matrix'],
    [/^liver support$/i, 'Liver Matrix'],
    [/^kidney support$/i, 'Kidney Matrix'],
    [/^prostate support$/i, 'Prostate Matrix'],
    [/^men.?s multivitamin$/i, 'Mens Daily Multi'],
    [/^women.?s multivitamin$/i, 'Womens Daily Multi'],
    [/^nootropic brain support$/i, 'Nootropic Brain'],
    [/^apple cider vinegar \(capsules\)$/i, 'Apple Cider Vinegar'],
    [/^sleep gummies \(melatonin\)$/i, 'Melatonin Sleep'],
    [/^pre-workout \(blue raz\)$/i, 'Pre Workout Blue Raz'],
    [/^pre-workout \(fruit punch\)$/i, 'Pre Workout Fruit Punch'],
    [/^whey protein \(vanilla\)$/i, 'Whey Protein Vanilla'],
    [/^whey protein \(chocolate\)$/i, 'Whey Protein Chocolate']
  ];

  const raw = String(sourceName || '').trim();
  for (const [pattern, replacement] of aliasMap) {
    if (pattern.test(raw)) {
      return replacement;
    }
  }

  return raw
    .replace(/\(([^)]+)\)/g, ' $1 ')
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' Plus ')
    .replace(/[,/]/g, ' ')
    .replace(
      /\b(capsules?|gummies?|softgels?|tablets?|powder|complex|support|control|relief|extract|tea|chewables?|supplement)\b/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function buildBrandedName(sourceName, activeIngredients, form, category) {
  const prefix = mapPrefixByCategory(category);
  let descriptor = sourceDescriptor(sourceName);
  if (!descriptor) {
    descriptor = String(activeIngredients || 'Daily Formula')
      .split(',')[0]
      .replace(/\s+/g, ' ')
      .trim();
  }

  descriptor = smartTitle(descriptor);
  const suffix = mapFormSuffix(form);

  const name = [prefix, descriptor, suffix]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return name;
}

function suggestPrice(costRaw, srpRaw, form, servingsRaw, functionalArea, category) {
  const cost = Number.parseFloat(costRaw);
  const srp = Number.parseFloat(srpRaw);
  if (Number.isFinite(srp) && srp > 0) {
    return Math.max(10, Math.round(srp));
  }
  if (Number.isFinite(cost) && cost > 0) {
    return Math.max(10, Math.round(cost * 2.8));
  }
  return 29;
}

function normalizeShippingScope(value) {
  const raw = String(value || '')
    .trim()
    .toUpperCase();
  if (raw === 'US_ONLY' || raw === 'US-ONLY' || raw === 'US ONLY') return 'US_ONLY';
  if (raw === 'ALL_SUPPORTED_DESTINATIONS' || raw === 'ALL SUPPORTED DESTINATIONS') {
    return 'ALL_SUPPORTED_DESTINATIONS';
  }
  return 'ALL_SUPPORTED_DESTINATIONS';
}

function cleanSentence(text, fallback) {
  const value = String(text || '').trim();
  if (!value) {
    return fallback;
  }
  if (!/[.!?]$/.test(value)) {
    return value + '.';
  }
  return value;
}

function splitBenefitPhrases(benefits) {
  return String(benefits || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeClaimText(text) {
  return String(text || '')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function sentenceCase(text) {
  const value = String(text || '').trim();
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function sanitizeBenefitPhrase(phrase, functionalArea) {
  const lower = normalizeClaimText(phrase).toLowerCase();
  if (!lower) {
    return '';
  }

  if (/cholesterol/.test(lower)) return 'supports healthy cholesterol levels already within the normal range';
  if (/blood pressure/.test(lower)) return 'supports healthy blood pressure already within the normal range';
  if (/blood sugar|insulin/.test(lower)) return 'supports healthy glucose metabolism already within the normal range';
  if (/immune|seasonal|defense|throat/.test(lower)) return 'supports normal immune function';
  if (/sleep|circadian|jet lag|restful|sedative/.test(lower)) return 'supports restful sleep quality and circadian rhythm';
  if (/focus|memory|brain|cognitive|clarity|neuro|mental/.test(lower))
    return 'supports cognitive performance, focus, and mental clarity';
  if (/joint|cartilage|mobility|flexibility|muscle relief|sore muscles/.test(lower))
    return 'supports joint comfort, mobility, and post-training recovery';
  if (/muscle|strength|endurance|performance|atp|nitric oxide|workout/.test(lower))
    return 'supports exercise performance, strength output, and recovery capacity';
  if (/digest|gut|microbiome|bloating|regularity|heartburn|enzyme/.test(lower))
    return 'supports digestive comfort, gut function, and nutrient utilization';
  if (/hair|skin|nail|keratin|elasticity|hydration|radiance|collagen/.test(lower))
    return 'supports healthy skin, hair, and nail structure';
  if (/energy|fatigue|vitality|stamina|metabolism|thermogenesis/.test(lower))
    return 'supports cellular energy metabolism and daily vitality';
  if (/heart|cardio|circulation|vascular/.test(lower)) return 'supports cardiovascular function and circulation';
  if (/liver|kidney|detox|urinary|bile/.test(lower))
    return 'supports normal liver, kidney, and metabolic clearance pathways';
  if (/hormone|testosterone|libido|prostate|pms|men.?s|women.?s/.test(lower))
    return 'supports hormonal and reproductive health markers';
  if (/bone|calcium/.test(lower)) return 'supports bone mineral support and structural health';
  if (/antioxidant|oxidative/.test(lower)) return 'provides antioxidant support against oxidative stress';

  const fallbackByArea = {
    foundational: 'supports foundational daily wellness and nutrient coverage',
    focus: 'supports cognitive performance and stress resilience',
    sleep: 'supports nightly recovery and sleep quality',
    recovery: 'supports recovery, hydration, and tissue resilience',
    performance: 'supports exercise performance and recovery',
    energy: 'supports stable energy and metabolic efficiency',
    immunity: 'supports immune readiness and daily resilience',
    joint: 'supports joint comfort and mobility',
    gut: 'supports digestive function and gastrointestinal comfort',
    beauty: 'supports skin, hair, and nail health',
    stress: 'supports stress response and mental composure',
    general: 'supports daily wellness and routine consistency'
  };

  return fallbackByArea[functionalArea] || fallbackByArea.general;
}

function uniqueClaims(claims) {
  const seen = new Set();
  return claims.filter((claim) => {
    const key = claim.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSafeClaims(benefits, functionalArea) {
  const phrases = splitBenefitPhrases(benefits);
  const safe = uniqueClaims(
    phrases
      .map((phrase) => sanitizeBenefitPhrase(phrase, functionalArea))
      .map((claim) => sentenceCase(claim))
      .filter(Boolean)
  );

  if (safe.length) {
    return safe.slice(0, 3);
  }

  const fallback = {
    foundational: 'Supports foundational daily wellness and nutrient coverage',
    focus: 'Supports cognitive performance and stress resilience',
    sleep: 'Supports nightly recovery and sleep quality',
    recovery: 'Supports recovery, hydration, and tissue resilience',
    performance: 'Supports exercise performance and recovery',
    energy: 'Supports stable energy and metabolic efficiency',
    immunity: 'Supports immune readiness and daily resilience',
    joint: 'Supports joint comfort and mobility',
    gut: 'Supports digestive function and gastrointestinal comfort',
    beauty: 'Supports skin, hair, and nail health',
    stress: 'Supports stress response and mental composure',
    general: 'Supports daily wellness and routine consistency'
  };

  return [fallback[functionalArea] || fallback.general];
}

function makeTagline(safeClaims) {
  return cleanSentence(safeClaims[0], 'Supports daily wellness and routine consistency');
}

function makeWhatItIs(form, category) {
  const formText = String(form || 'formula').toLowerCase();
  const categoryText = String(category || 'foundational').toLowerCase();
  return cleanSentence(
    '',
    'A premium ' +
      formText +
      ' formula engineered for ' +
      categoryText +
      ' routine architecture and long-term consistency'
  );
}

function makeWhatItDoes(safeClaims) {
  return safeClaims.join('; ') + '.';
}

function makeHowToUse(usage) {
  const base = cleanSentence(usage, 'Use only as directed on the product label.');
  if (/do not exceed/i.test(base)) {
    return base;
  }
  return base + ' Do not exceed labeled serving size.';
}

function buildCautions(cautions) {
  const base = cleanSentence(
    cautions,
    'Consult a qualified healthcare professional before use if pregnant, nursing, taking medication, or managing a medical condition.'
  );
  const standard =
    'Keep out of reach of children. Do not use if safety seal is damaged. This product is not intended to diagnose, treat, cure, or prevent any disease.';

  if (base.toLowerCase().includes('not intended to diagnose')) {
    return base;
  }
  return base + ' ' + standard;
}

function makeWhoItsFor(sourceName, category, functionalArea) {
  const subject = sourceName || 'this formula';
  const area = String(functionalArea || '').toLowerCase();

  if (area === 'sleep') {
    return cleanSentence(
      '',
      'Built for adults who need a more stable night protocol and consistent next-day readiness using ' + subject
    );
  }
  if (area === 'performance') {
    return cleanSentence(
      '',
      'Built for active routines and training blocks where measurable output and recovery discipline matter'
    );
  }
  if (area === 'focus') {
    return cleanSentence(
      '',
      'Built for high-cognitive workloads that require sustained attention, composure, and consistent execution'
    );
  }
  if (area === 'immunity') {
    return cleanSentence(
      '',
      'Built for year-round baseline resilience and seasonal routine support with ingredient-level clarity'
    );
  }
  if (area === 'energy') {
    return cleanSentence(
      '',
      'Built for routines prioritizing stable daytime drive and metabolic consistency over short spikes'
    );
  }
  if (area === 'recovery' || area === 'joint' || area === 'gut' || area === 'beauty') {
    return cleanSentence(
      '',
      'Built for individuals optimizing tissue recovery, hydration, digestion, and system repair cadence'
    );
  }
  if (category === 'Foundational') {
    return cleanSentence(
      '',
      'Built for baseline daily architecture when the goal is long-term consistency, not occasional supplementation'
    );
  }
  return cleanSentence('', 'Built for structured daily routines where health inputs are treated like infrastructure');
}

function makeWhenToUse(functionalArea, usage) {
  const area = String(functionalArea || '').toLowerCase();
  const base = cleanSentence(usage, 'Use only as directed on the product label.');

  if (area === 'sleep') {
    return cleanSentence('', 'Use in the evening as part of a fixed wind-down protocol. ' + base);
  }
  if (area === 'performance') {
    return cleanSentence('', 'Use around training windows according to label directions. ' + base);
  }
  if (area === 'focus' || area === 'energy') {
    return cleanSentence('', 'Use in daytime routine blocks where cognitive or output demand is highest. ' + base);
  }
  return cleanSentence('', 'Use on a consistent daily schedule with hydration and food context. ' + base);
}

function makeStackGuidance(category, functionalArea, sourceName) {
  const area = String(functionalArea || '').toLowerCase();
  const name = sourceName || 'this formula';

  if (category === 'Foundational') {
    return cleanSentence(
      '',
      name + ' pairs with Focus, Recovery, or Performance modules as the baseline layer of a Core Stack'
    );
  }
  if (area === 'sleep') {
    return cleanSentence(
      '',
      'Stack with Core Base daily essentials and one Recovery module to support sleep depth and next-day consistency'
    );
  }
  if (area === 'focus' || area === 'energy') {
    return cleanSentence(
      '',
      'Stack with a Core Base anchor and a Sleep or Recovery module to maintain output without system drift'
    );
  }
  if (area === 'performance') {
    return cleanSentence(
      '',
      'Stack with hydration and foundational support to sustain training quality across repeated sessions'
    );
  }
  return cleanSentence('', 'Stack with Core Base and one targeted module aligned to your primary objective');
}

function pickPackshotPalette(category) {
  const byCategory = {
    Foundational: { shell: '#dce3ea', label: '#ffffff', stripe: '#ff6a2a', text: '#111824' },
    Focus: { shell: '#d8e6f5', label: '#f7fbff', stripe: '#2f7bd8', text: '#0f1d2f' },
    Energy: { shell: '#f2e1d8', label: '#fff8f4', stripe: '#ff6a2a', text: '#2a1a10' },
    Immunity: { shell: '#e0eadf', label: '#f6fbf5', stripe: '#2f9155', text: '#132417' },
    Sleep: { shell: '#e2dff0', label: '#faf8ff', stripe: '#625fb5', text: '#1f1e33' },
    Recovery: { shell: '#dce7e4', label: '#f8fbfa', stripe: '#2f8f82', text: '#122523' },
    Performance: { shell: '#e7dfda', label: '#fbf9f8', stripe: '#9a5a33', text: '#21160f' }
  };

  return byCategory[category] || byCategory.Foundational;
}

function splitPackshotLines(name) {
  const words = String(name || '')
    .replace(/^Core\s+(Base|Focus|Recovery|Performance)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);

  const lines = [];
  let line = '';

  words.forEach((word) => {
    const candidate = (line + ' ' + word).trim();
    if (candidate.length > 18 && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });

  if (line) {
    lines.push(line);
  }

  return lines.slice(0, 3);
}

function escapeXML(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildPackshotSVG(product) {
  const palette = pickPackshotPalette(product.category);
  const lines = splitPackshotLines(product.name);
  const safeLines = lines.map(escapeXML);
  const yStart = safeLines.length === 1 ? 180 : safeLines.length === 2 ? 172 : 164;
  const textBlocks = safeLines
    .map((line, index) => {
      return (
        '<text x="420" y="' +
        (yStart + index * 26) +
        '" text-anchor="middle" font-size="19" font-weight="700" fill="' +
        palette.text +
        '">' +
        line +
        '</text>'
      );
    })
    .join('');

  const subtitle = escapeXML(product.format + ' | ' + product.servings + ' servings');
  const category = escapeXML(product.category.toUpperCase());

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="840" height="840" viewBox="0 0 840 840" role="img" aria-label="' +
    escapeXML(product.name) +
    '">' +
    '<defs>' +
    '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f7fafc"/><stop offset="100%" stop-color="#eaf0f5"/></linearGradient>' +
    '<linearGradient id="glass" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="' +
    palette.shell +
    '"/><stop offset="100%" stop-color="#cfd8e2"/></linearGradient>' +
    '</defs>' +
    '<rect width="840" height="840" fill="url(#bg)"/>' +
    '<rect x="290" y="120" rx="36" ry="36" width="260" height="84" fill="#1b2733"/>' +
    '<rect x="250" y="190" rx="56" ry="56" width="340" height="520" fill="url(#glass)" stroke="#b7c3cf" stroke-width="4"/>' +
    '<rect x="278" y="250" rx="30" ry="30" width="284" height="340" fill="' +
    palette.label +
    '" stroke="#c7d1db" stroke-width="3"/>' +
    '<rect x="278" y="250" width="284" height="56" fill="' +
    palette.stripe +
    '"/>' +
    '<text x="420" y="286" text-anchor="middle" font-size="18" font-weight="700" letter-spacing="1.6" fill="#ffffff">' +
    category +
    '</text>' +
    textBlocks +
    '<text x="420" y="546" text-anchor="middle" font-size="14" fill="#5f6b78">' +
    subtitle +
    '</text>' +
    '<circle cx="540" cy="515" r="18" fill="' +
    palette.stripe +
    '" opacity="0.85"/>' +
    '<text x="540" y="521" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">GC</text>' +
    '<rect x="314" y="620" rx="18" ry="18" width="212" height="42" fill="#1c2a38"/>' +
    '<text x="420" y="647" text-anchor="middle" font-size="13" letter-spacing="1.1" font-weight="700" fill="#edf2f7">GENESIS CORE</text>' +
    '</svg>'
  );
}

function writePackshots(products) {
  const packshotDir = path.resolve(process.cwd(), 'assets', 'packshots');
  if (!fs.existsSync(packshotDir)) {
    fs.mkdirSync(packshotDir, { recursive: true });
  }

  products.forEach((product) => {
    if (!String(product.image || '').startsWith('/assets/packshots/')) {
      return;
    }
    const target = path.resolve(process.cwd(), '.' + product.image);
    fs.writeFileSync(target, buildPackshotSVG(product), 'utf8');
  });
}

function parseServings(value) {
  const n = Number.parseInt(String(value || '').replace(/[^0-9]/g, ''), 10);
  if (Number.isFinite(n) && n > 0) {
    return n;
  }
  return 30;
}

function normalizeAssetPath(value) {
  var pathValue = String(value || '').trim();
  if (!pathValue) {
    return '/assets/product-greens.svg';
  }
  if (pathValue.startsWith('/')) {
    return pathValue;
  }
  if (pathValue.startsWith('assets/')) {
    return '/' + pathValue;
  }
  return pathValue;
}

function uniqueId(base, taken) {
  let id = base || 'core-product';
  let i = 2;
  while (taken.has(id)) {
    id = base + '-' + i;
    i += 1;
  }
  taken.add(id);
  return id;
}

function buildProduct(row, takenIds) {
  const sourceName = pick(row, ['source_name', 'name', 'product_name']);
  const providedBrandName = pick(row, ['brand_name', 'new_genesis_core_name', 'new_name', 'name_override']);
  const form = pick(row, ['form']);
  const activeIngredients = pick(row, ['active_ingredients', 'ingredients']);
  const benefits = pick(row, ['primary_benefits', 'benefits']);
  const usage = pick(row, ['usage', 'how_to_use']);
  const cautions = pick(row, ['cautions']);
  const brandCategory = mapCategoryFromBrandName(providedBrandName);
  const categorySignal = pick(row, ['category']) || brandCategory;
  const suppliedFunctionalArea = pick(row, ['functional_area']) || (brandCategory ? brandCategory.toLowerCase() : '');
  const functionalArea = normalizeFunctionalArea(
    suppliedFunctionalArea,
    sourceName + ' ' + categorySignal + ' ' + providedBrandName
  );
  const category = brandCategory || mapCategory(functionalArea, categorySignal);
  const name = String(providedBrandName || buildBrandedName(sourceName, activeIngredients, form, category))
    .replace(/\s+/g, ' ')
    .trim();
  const format = inferFormat(sourceName, name, form);
  const id = uniqueId(slugify(name), takenIds);
  const servings = parseServings(pick(row, ['servings']));
  const price = suggestPrice(
    pick(row, ['cost_usd']),
    pick(row, ['srp_usd', 'source_srp', 'srp']),
    format,
    servings,
    functionalArea,
    category
  );
  const badge = mapBadge(category);
  const providedImage = normalizeAssetPath(pick(row, ['image_file']) || '');
  const usePackshot = !providedImage || providedImage.startsWith('/assets/product-');
  const imageFile = usePackshot ? '/assets/packshots/' + id + '.svg' : providedImage;
  const safeClaims = buildSafeClaims(benefits, functionalArea);
  const whoItsFor = makeWhoItsFor(sourceName, category, functionalArea);
  const whenToUse = makeWhenToUse(functionalArea, usage);
  const stackGuidance = makeStackGuidance(category, functionalArea, sourceName);
  const shippingScope = normalizeShippingScope(pick(row, ['shipping_scope']));
  const sourceCategory = pick(row, ['source_category']) || categorySignal || '';

  const product = {
    id,
    name,
    sourceName,
    category,
    format,
    servings,
    price,
    tagline: makeTagline(safeClaims),
    featured: false,
    badge,
    image: imageFile,
    url: '/products/' + id + '.html',
    shippingScope,
    sourceCategory,
    whatItIs: cleanSentence(pick(row, ['what_it_is']), makeWhatItIs(format, category)),
    whatItDoes: cleanSentence(pick(row, ['what_it_does']), makeWhatItDoes(safeClaims)),
    howToUse: makeHowToUse(usage),
    whoItsFor: whoItsFor,
    whenToUse: whenToUse,
    stackGuidance: stackGuidance,
    ingredients: activeIngredients || 'See label for full active ingredient panel',
    testing: 'Third-party verified identity, potency, and contaminant controls on every production lot.',
    cautions: buildCautions(cautions)
  };

  const reviewNotes = [];
  if (!sourceName) reviewNotes.push('Missing source_name');
  if (!providedBrandName) reviewNotes.push('Missing brand_name');
  if (!activeIngredients) reviewNotes.push('Missing active_ingredients');
  if (!benefits) reviewNotes.push('Missing primary_benefits');
  if (!usage) reviewNotes.push('Missing usage');
  if (!cautions) reviewNotes.push('Missing cautions');
  if (!pick(row, ['cost_usd'])) reviewNotes.push('Missing cost_usd');
  if (!pick(row, ['srp_usd', 'source_srp', 'srp'])) reviewNotes.push('Missing srp_usd');
  if (functionalArea === 'general') reviewNotes.push('Functional area guessed from generic signal');

  return {
    source_sku: pick(row, ['source_sku', 'sku']),
    source_name: sourceName,
    functional_area: functionalArea,
    suggested_price_usd: price,
    product,
    review_notes: reviewNotes.join('; ')
  };
}

function buildCanvaRow(entry) {
  const p = entry.product;
  return {
    source_sku: entry.source_sku,
    source_name: entry.source_name,
    product_id: p.id,
    brand_name: p.name,
    category: p.category,
    badge: p.badge,
    suggested_price_usd: p.price,
    hero_headline: p.name,
    hero_subheadline: p.tagline,
    what_it_is: p.whatItIs,
    what_it_does: p.whatItDoes,
    how_to_use: p.howToUse,
    key_ingredients: p.ingredients,
    testing_copy: p.testing,
    cautions_copy: p.cautions,
    cta_primary: 'Add to Cart',
    cta_secondary: 'Build My Stack',
    image_file: p.image
  };
}

function main() {
  const inputPath = process.argv[2] || 'catalog/product-intake-template.csv';
  const absoluteInput = path.resolve(process.cwd(), inputPath);

  if (!fs.existsSync(absoluteInput)) {
    console.error('Input file not found: ' + absoluteInput);
    process.exit(1);
  }

  const csv = fs.readFileSync(absoluteInput, 'utf8');
  const rows = parseCSV(csv);

  if (!rows.length) {
    console.error('No product rows found in input CSV.');
    process.exit(1);
  }

  const takenIds = new Set();
  const entries = rows.map((row) => buildProduct(row, takenIds));
  const products = entries.map((entry) => entry.product);
  const canvaRows = entries.map(buildCanvaRow);
  const reviewRows = entries.filter((entry) => entry.review_notes).map((entry) => ({
    source_sku: entry.source_sku,
    source_name: entry.source_name,
    generated_name: entry.product.name,
    review_notes: entry.review_notes
  }));

  const outDir = path.resolve(process.cwd(), 'catalog');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outDir, 'generated-products.json'), JSON.stringify(products, null, 2) + '\n', 'utf8');
  writePackshots(products);
  fs.writeFileSync(
    path.join(outDir, 'generated-products.js'),
    'window.GENESIS_IMPORTED_PRODUCTS = ' + JSON.stringify(products, null, 2) + ';\n',
    'utf8'
  );

  fs.writeFileSync(
    path.join(outDir, 'canva-product-pages.csv'),
    toCSV(canvaRows, [
      'source_sku',
      'source_name',
      'product_id',
      'brand_name',
      'category',
      'badge',
      'suggested_price_usd',
      'hero_headline',
      'hero_subheadline',
      'what_it_is',
      'what_it_does',
      'how_to_use',
      'key_ingredients',
      'testing_copy',
      'cautions_copy',
      'cta_primary',
      'cta_secondary',
      'image_file'
    ]),
    'utf8'
  );

  fs.writeFileSync(
    path.join(outDir, 'review-queue.csv'),
    toCSV(reviewRows, ['source_sku', 'source_name', 'generated_name', 'review_notes']),
    'utf8'
  );

  console.log('Generated ' + products.length + ' products.');
  console.log('Output: catalog/generated-products.json');
  console.log('Output: catalog/generated-products.js');
  console.log('Output: assets/packshots/*.svg');
  console.log('Output: catalog/canva-product-pages.csv');
  console.log('Output: catalog/review-queue.csv');
}

main();

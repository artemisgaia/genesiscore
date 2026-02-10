const COUNTRY_HEADER_KEYS = ['x-vercel-ip-country', 'cf-ipcountry', 'x-country-code', 'x-geo-country'];

function normalizeCountryCode(value) {
  const code = String(value || '').trim().toUpperCase();
  if (code === 'UK') return 'GB';
  return /^[A-Z]{2}$/.test(code) ? code : '';
}

function fromAcceptLanguage(headerValue) {
  const raw = String(headerValue || '');
  const tokens = raw.split(',');
  for (let i = 0; i < tokens.length; i += 1) {
    const locale = tokens[i].split(';')[0].trim();
    const parts = locale.split(/[-_]/);
    if (parts.length < 2) continue;
    const region = normalizeCountryCode(parts[parts.length - 1]);
    if (region) return region;
  }
  return '';
}

module.exports = function geoHandler(req, res) {
  let countryCode = '';
  for (let i = 0; i < COUNTRY_HEADER_KEYS.length; i += 1) {
    const key = COUNTRY_HEADER_KEYS[i];
    const candidate = req.headers ? req.headers[key] : '';
    countryCode = normalizeCountryCode(candidate);
    if (countryCode) break;
  }

  if (!countryCode) {
    countryCode = fromAcceptLanguage(req.headers && req.headers['accept-language']);
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).json({
    countryCode: countryCode || null,
    source: countryCode ? 'edge-header' : 'accept-language-fallback'
  });
};

// Utilities for resolving API key header(s)
function parseHeaderList(envValue) {
  return (envValue || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.toLowerCase());
}

function getApiKeyHeaderNames() {
  const primary = (process.env.API_AUTH_HEADER || 'x-nectarstudio-api-key').toLowerCase();
  const aliases = parseHeaderList(process.env.API_HEADER_ALIASES);
  // Preserve legacy alias if not explicitly configured
  if (!aliases.includes('x-nectarstudio-string-api-key')) {
    aliases.push('x-nectarstudio-string-api-key');
  }
  // Ensure uniqueness and preserve order: primary first
  const set = new Set([primary, ...aliases]);
  return Array.from(set);
}

function getHeaderCaseInsensitive(headers, name) {
  const lower = name.toLowerCase();
  if (headers[name]) return headers[name];
  for (const [k, v] of Object.entries(headers || {})) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

function getConfiguredApiKey(req) {
  const names = getApiKeyHeaderNames();
  for (const n of names) {
    const val = getHeaderCaseInsensitive(req.headers, n);
    if (val) return { apiKey: val, headerUsed: n };
  }
  if (req && req.query && req.query.api_key) {
    return { apiKey: req.query.api_key, headerUsed: 'query:api_key' };
  }
  return { apiKey: null, headerUsed: null };
}

module.exports = {
  getApiKeyHeaderNames,
  getConfiguredApiKey,
};

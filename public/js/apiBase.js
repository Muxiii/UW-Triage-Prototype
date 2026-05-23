/** Normalize API base for fetch() — Safari rejects hostnames without http(s):// */
function normalizeApiBase(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return '/api';
  if (value.startsWith('/')) return value.replace(/\/+$/, '') || '/api';
  let absolute = value.replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(absolute)) absolute = `https://${absolute}`;
  return absolute.endsWith('/api') ? absolute : `${absolute}/api`;
}

// `var` + window: Babel standalone scripts (type="text/babel") do not see `const` from other files.
var API_BASE = normalizeApiBase(
  typeof window !== 'undefined' ? window.__RUNTIME_CONFIG__?.apiBase : undefined,
);
if (typeof window !== 'undefined') window.API_BASE = API_BASE;

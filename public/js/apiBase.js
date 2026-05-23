/** Normalize API base for fetch() — Safari rejects hostnames without http(s):// */
function normalizeApiBase(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return '/api';
  if (value.startsWith('/')) return value.replace(/\/+$/, '') || '/api';
  let absolute = value.replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(absolute)) absolute = `https://${absolute}`;
  return absolute.endsWith('/api') ? absolute : `${absolute}/api`;
}

// Babel `type="text/babel"` bundles run in strict IIFE — use window.API_BASE in those files.
if (typeof window !== 'undefined') {
  window.API_BASE = normalizeApiBase(window.__RUNTIME_CONFIG__?.apiBase ?? window.API_BASE);
}

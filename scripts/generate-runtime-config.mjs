/**
 * Vercel build step: bake VITE_API_BASE into public/js/runtime-config.js
 * so the static frontend knows where Render API lives.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '..', 'public', 'js', 'runtime-config.js');

function normalizeApiBase(raw) {
  const value = String(raw || '').trim();
  if (!value) return '/api';
  if (value.startsWith('/')) return value.replace(/\/+$/, '') || '/api';
  let absolute = value.replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(absolute)) absolute = `https://${absolute}`;
  return absolute.endsWith('/api') ? absolute : `${absolute}/api`;
}

const apiBase = normalizeApiBase(process.env.VITE_API_BASE);
if (process.env.VERCEL && (!process.env.VITE_API_BASE || apiBase === '/api')) {
  console.warn(
    '[generate-runtime-config] WARNING: VITE_API_BASE is not set on Vercel. '
    + 'The browser will call /api on Vercel (no backend). Set VITE_API_BASE=https://YOUR-SERVICE.onrender.com/api',
  );
}
const content = `// Auto-generated at deploy time from VITE_API_BASE. Local default: /api
window.__RUNTIME_CONFIG__ = { apiBase: ${JSON.stringify(apiBase)} };
window.API_BASE = window.__RUNTIME_CONFIG__.apiBase;
`;

await writeFile(outPath, content, 'utf8');
console.log(`[generate-runtime-config] apiBase=${apiBase}`);

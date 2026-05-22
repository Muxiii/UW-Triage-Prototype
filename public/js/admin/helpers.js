const { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, useReducer } = React;

// ── Icons ────────────────────────────────────────────────────
const Icon = {
  Dashboard: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
    </svg>
  ),
  Inbox: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  ),
  Flow: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="3" width="7" height="5"/><rect x="14" y="16" width="7" height="5"/><rect x="3" y="16" width="7" height="5"/><path d="M10 5.5h6a2 2 0 0 1 2 2V16"/><path d="M6.5 8v8"/>
    </svg>
  ),
  Msg: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Search: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Bell: (p) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  Help: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 2-2.5 2-2.5 4"/><line x1="12" y1="17" x2="12" y2="17.01"/>
    </svg>
  ),
  Settings: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.03V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8.6 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.03-.33H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1.03V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15.4 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.37.36.7.64.97.28.28.66.44 1.05.44H21a2 2 0 0 1 0 4h-.09c-.39 0-.77.16-1.05.44-.28.27-.5.6-.64.97z"/>
    </svg>
  ),
  Plus: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}>
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Share: (p) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  ),
  Upload: (p) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  Send: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Paperclip: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
    </svg>
  ),
  Sparkles: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3l1.9 4.7L18.5 9.5l-4.6 1.8L12 16l-1.9-4.7L5.5 9.5l4.6-1.8z"/><path d="M19 14l.7 1.7 1.8.7-1.8.7-.7 1.7-.7-1.7-1.8-.7 1.8-.7z"/>
    </svg>
  ),
  RefreshCw: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
    </svg>
  ),
  Dots: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
    </svg>
  ),
  X: (p) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  ChevRight: (p) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Check: (p) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Alert: (p) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="17" x2="12" y2="17.01"/>
    </svg>
  ),
  Trash: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  LogOut: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Copy: (p) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  Link: (p) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  Lock: (p) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  ZoomIn: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  ),
  ZoomOut: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  ),
  Fit: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 7V4a1 1 0 0 1 1-1h3"/><path d="M17 3h3a1 1 0 0 1 1 1v3"/><path d="M21 17v3a1 1 0 0 1-1 1h-3"/><path d="M7 21H4a1 1 0 0 1-1-1v-3"/>
    </svg>
  ),
  Undo: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
    </svg>
  ),
  Redo: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
  File: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  Bot: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="8" width="18" height="12" rx="2"/><circle cx="8.5" cy="14" r="1"/><circle cx="15.5" cy="14" r="1"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1"/>
    </svg>
  ),
  Globe: (p) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18"/>
    </svg>
  ),
  People: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Play: (p) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none" {...p}>
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  Eye: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  EyeOff: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ),
};

const AVATAR_COLORS = [
  'linear-gradient(135deg, oklch(0.60 0.18 300), oklch(0.45 0.17 300))',
  'linear-gradient(135deg, oklch(0.65 0.16 200), oklch(0.50 0.16 210))',
  'linear-gradient(135deg, oklch(0.70 0.14 145), oklch(0.55 0.14 155))',
  'linear-gradient(135deg, oklch(0.72 0.14 55), oklch(0.58 0.14 45))',
  'linear-gradient(135deg, oklch(0.65 0.18 20), oklch(0.52 0.18 15))',
  'linear-gradient(135deg, oklch(0.66 0.15 260), oklch(0.50 0.16 265))',
];

const colorFor = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

// ── Canvas ───────────────────────────────────────────────────
const SEED_NODES = [];
const SEED_EDGES = [];

const DEFAULT_DEFINITION_NODE = {
  id: 'def-default',
  type: 'definition',
  x: -310, y: 80,
  title: 'Definition',
  body: '',
  locked: true,
};

function ensureDefinitionNode(nodes) {
  if (!nodes) return [DEFAULT_DEFINITION_NODE];
  if (nodes.some(n => n.type === 'definition')) return nodes;
  return [{ ...DEFAULT_DEFINITION_NODE, id: 'def-' + Date.now() }, ...nodes];
}

// Returns the pan offset (at zoom=1) that places the definition node at the top-left
// with MARGIN px of breathing room.
function panForDefinition(nodes) {
  const MARGIN = 32;
  const def = (nodes || []).find(n => n.type === 'definition');
  if (!def) return { x: MARGIN, y: MARGIN };
  return { x: -def.x + MARGIN, y: -def.y + MARGIN };
}

const NODE_W = 240;
const API_BASE = '/api';

/**
 * Plain text from an uploaded file for AI / POST /api/flows.
 * .docx is a ZIP of XML — never use File.text() on it (that sends binary garbage to the model).
 * .pdf uses pdf.js (admin.html). Legacy .doc uses POST /api/extract-doc-text.
 */
function fileToBase64DataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || '');
      const i = s.indexOf(',');
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.onerror = () => reject(new Error('Could not read file.'));
    r.readAsDataURL(file);
  });
}

async function extractPdfTextWithPdfJs(file) {
  if (typeof pdfjsLib === 'undefined') {
    throw new Error('PDF reader failed to load (pdf.js). Check network, refresh the page, or paste text in Description.');
  }
  const data = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
  const pdf = await loadingTask.promise;
  const parts = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const line = tc.items.map((it) => (it && 'str' in it ? it.str : '')).join(' ');
    parts.push(line);
  }
  const text = parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!text) {
    throw new Error('No extractable text in this PDF (may be image-only). Paste text in Description or use OCR.');
  }
  return text;
}

async function extractLegacyDocViaApi(file) {
  const base64 = await fileToBase64DataUrl(file);
  const res = await fetch(`${API_BASE}/extract-doc-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name || 'upload.doc', base64 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Could not read .doc (${res.status}). Save as .docx or paste text.`);
  }
  const text = String(data.text || '').trim();
  if (!text) {
    throw new Error('No text extracted from .doc. Save as .docx or paste in Description.');
  }
  return text;
}

async function extractUploadTextForAi(file) {
  if (!file) return '';
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.txt')) return file.text();
  if (name.endsWith('.docx')) {
    if (typeof mammoth === 'undefined') {
      throw new Error('DOCX reader failed to load (mammoth). Check network, refresh the page, or paste text in Description.');
    }
    const ab = await file.arrayBuffer();
    const { value, messages } = await mammoth.extractRawText({ arrayBuffer: ab });
    if (messages && messages.length) console.warn('mammoth:', messages);
    const text = String(value || '').trim();
    if (!text) {
      throw new Error('No readable text in this DOCX (empty, scanned images only, or unsupported). Paste text in Description or use .txt.');
    }
    return text;
  }
  if (name.endsWith('.doc')) {
    return extractLegacyDocViaApi(file);
  }
  if (name.endsWith('.pdf')) {
    return extractPdfTextWithPdfJs(file);
  }
  return file.text();
}

/** Fetch a public http(s) page and return plain text (server-side HTML → text). */
async function extractUrlTextForAi(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  const res = await fetch(`${API_BASE}/extract-url-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: trimmed }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Could not read URL (${res.status}). Paste text in Description instead.`);
  }
  const text = String(data.text || '').trim();
  if (!text) {
    throw new Error('No extractable text at this URL. Paste content in Description or upload a file.');
  }
  return text;
}

/**
 * Merge description, uploaded file text, and one-or-more URL pages for
 * file2flow / AI Assistant. At least one input must yield non-empty text.
 *
 * Accepts either `urls: string[]` (new) or `url: string` (legacy single).
 * Empty / duplicate URLs are removed before fetching.
 */
async function buildFile2flowSourceText({ desc = '', file = null, urls = [], url = '' }) {
  const parts = [];
  const description = String(desc || '').trim();
  if (description) parts.push(description);

  if (file) {
    const fileText = await extractUploadTextForAi(file);
    if (fileText) parts.push(fileText);
  }

  let urlList = Array.isArray(urls) ? urls : [];
  urlList = urlList.map((u) => String(u || '').trim()).filter(Boolean);
  if (!urlList.length && url) {
    const single = String(url || '').trim();
    if (single) urlList = [single];
  }
  urlList = [...new Set(urlList)]; // de-dupe so the same URL isn't fetched twice

  for (const u of urlList) {
    const urlText = await extractUrlTextForAi(u);
    if (urlText) {
      parts.push(`--- Content from ${u} ---\n\n${urlText}`);
    }
  }

  return parts.join('\n\n').trim();
}

/** First non-empty URL in a list, or null. Used to set sourceUrl metadata. */
function firstUrlFromList(urls, fallbackUrl = '') {
  if (Array.isArray(urls)) {
    for (const u of urls) {
      const t = String(u || '').trim();
      if (t) return t;
    }
  }
  const f = String(fallbackUrl || '').trim();
  return f || null;
}

/** Backend / AI may store `materials` as a single object or string; builder always uses an array. */
function ensureMaterialsArray(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') return [raw];
  if (typeof raw === 'string' && String(raw).trim()) {
    return [{ id: `mat-${Math.random().toString(36).slice(2)}`, label: String(raw).trim(), attachKind: null, attachValue: '' }];
  }
  return [];
}

function backendFlowToBuilderGraph(flow) {
  if (!flow) return { nodes: SEED_NODES, edges: SEED_EDGES };
  const nodes = (flow.nodes || []).map((node) => {
    const base = {
      id: node.id,
      x: typeof node.posX === 'number' ? node.posX : 0,
      y: typeof node.posY === 'number' ? node.posY : 0,
    };
    if (node.type === 'DEFINITION') {
      return {
        ...base,
        type: 'definition',
        title: node.label || flow.name || 'Definition',
        body: node.content?.description || flow.description || '',
        relatedOffices: node.content?.relatedOffices || [],
        templates: node.content?.templates || [],
        resources: node.content?.resources || [],
        isDeletable: false,
      };
    }
    if (node.type === 'DECISION') {
      return {
        ...base,
        type: 'decision',
        title: node.content?.question || node.label || 'Decision',
        answers: (node.answers || []).map((answer) => ({
          id: answer.id,
          label: answer.text,
          rationale: answer.rationale != null ? String(answer.rationale) : '',
        })),
      };
    }
    if (node.type === 'ACTION') {
      return {
        ...base,
        type: 'action',
        title: node.content?.title || node.label || 'Action',
        description: node.content?.description || '',
        assignee: node.content?.assignee || '',
        materials: ensureMaterialsArray(node.content?.materials).map((material) => ({
          id: material.id || `mat-${Math.random()}`,
          label: material.label || 'Material',
          attachKind: material.attachKind || null,
          attachValue: material.attachValue || '',
        })),
      };
    }
    if (node.type === 'HANDLER') {
      return {
        ...base,
        type: 'handler',
        name: node.content?.name || node.label || 'Contact',
        role: node.content?.department || '',
        email: node.content?.email || '',
        hiddenFromResearchers: Boolean(node.content?.hiddenFromResearchers),
      };
    }
    return { ...base, type: 'action', title: node.label || 'Action', description: '' };
  });
  // Bug 1 fix: build a type lookup so edge normalization can detect DEFINITION sources.
  const backendTypeById = {};
  (flow.nodes || []).forEach(function(n) { backendTypeById[n.id] = n.type; });

  const edges = (flow.edges || []).map((edge) => ({
    id: edge.id,
    from: edge.sourceNodeId,
    // DEFINITION nodes have exactly one output port ('out'). Some AI-generated flows store a
    // non-null sourceAnswerId on the definition→decision edge, which is a generation artifact.
    // Normalise it here so the edge always targets the registered 'out' port on the canvas.
    fromPort: backendTypeById[edge.sourceNodeId] === 'DEFINITION' ? 'out' : (edge.sourceAnswerId || 'out'),
    to: edge.targetNodeId,
    toPort: 'in',
    locked: edge.isDeletable === false,
  }));
  return autoLayoutBuilderGraph({ nodes, edges });
}

// Normalize node Y positions using ONLY DOM-measured heights (el.offsetHeight).
// No formulas, no constants, no per-type values.
// Called from FlowCanvas after render — never pre-render.
// heightsById: Map<nodeId, number> built from el.offsetHeight in useLayoutEffect.
function normalizeNodesWithMeasuredHeights(nodes, heightsById) {
  var PADDING = 20;
  // Group nodes by exact X (same column = same graph level).
  var cols = new Map();
  nodes.forEach(function(n) {
    var colX = n.x != null ? n.x : 0;
    if (!cols.has(colX)) cols.set(colX, []);
    cols.get(colX).push(n);
  });
  var result = [];
  cols.forEach(function(col) {
    var sorted = col.slice().sort(function(a, b) { return (a.y || 0) - (b.y || 0); });
    // Only push nodes DOWN on overlap; preserve auto-layout's parent-centering Y values.
    var prevBottom = -Infinity;
    sorted.forEach(function(node) {
      var h = heightsById[node.id];
      if (!h) {
        console.error('[Normalize] node has no measured height — skipped:', node.id, node.type);
        result.push(node);
        prevBottom = (node.y || 0) + 200;
        return;
      }
      var minY = prevBottom + PADDING;
      var origY = node.y == null ? minY : node.y;
      var y = Math.max(origY, minY);
      result.push(Object.assign({}, node, { y: y }));
      prevBottom = y + h;
    });
  });
  return result;
}

/**
 * Tidy-tree auto-layout for builder graphs.
 *
 * Pipeline:
 *   1. BFS from definition → column index per node (people nodes excluded).
 *   2. For each parent, resolve its children in a semantic order:
 *        - decision: ordered by node.answers[] index (top answer → top branch)
 *        - other:    edge creation order
 *      This keeps each subtree as a contiguous block in its column, which is
 *      what prevents edge crossings on tree-shaped flows.
 *   3. DFS post-order Y placement: leaves stack tightly with ROW_GAP; each
 *      parent is centered on its children's anchor midpoint (tidy-tree).
 *   4. Unreachable / DAG remainders stack below the main tree.
 *   5. PEOPLE nodes keep saved positions; otherwise stack at the bottom-left
 *      row in horizontal sequence.
 *
 * Definition is always pinned to (X_OFFSET, Y_OFFSET) regardless of the
 * subtree layout, so panForDefinition() always lands the canvas the same way.
 *
 * Post-render `normalizeNodesWithMeasuredHeights` only pushes down on overlap,
 * so the parent-centering computed here is preserved when DOM heights differ
 * from estimated heights.
 */
function autoLayoutBuilderGraph(graph) {
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const definition = nodes.find((node) => node.type === 'definition');
  if (!definition) return graph;

  const COL_W = 330;
  const X_OFFSET = -310;
  const Y_OFFSET = 80;
  const ROW_GAP = 24;
  const PEOPLE_Y_FALLBACK = 576;
  const PEOPLE_X_STRIDE = 220;

  function estHeight(n) { return Math.max(nodeHeight(n), 96); }

  // ── Phase 1 — BFS column assignment (people excluded from main flow)
  const levels = new Map([[definition.id, 0]]);
  const queue = [definition.id];
  while (queue.length) {
    const current = queue.shift();
    const level = levels.get(current);
    edges.filter((e) => e.from === current).forEach((e) => {
      const target = byId.get(e.to);
      if (!target || target.type === 'handler') return;
      if (levels.has(e.to)) return;
      levels.set(e.to, level + 1);
      queue.push(e.to);
    });
  }
  let maxLevel = 0;
  levels.forEach((l) => { if (l > maxLevel) maxLevel = l; });
  // Orphans (unreachable from definition) get their own stray column past the rightmost.
  nodes.forEach((n) => {
    if (n.type === 'handler' || n.type === 'definition') return;
    if (!levels.has(n.id)) levels.set(n.id, maxLevel + 1);
  });

  // ── Phase 2 — resolve each parent's children in semantic order
  function orderedChildren(nodeId) {
    const node = byId.get(nodeId);
    if (!node) return [];
    const outs = edges.filter((e) => e.from === nodeId);
    const result = [];
    const consider = (e) => {
      const t = byId.get(e.to);
      if (!t || t.type === 'handler') return;
      if (!result.includes(e.to)) result.push(e.to);
    };
    if (node.type === 'decision' && Array.isArray(node.answers)) {
      // Top answer first → top branch. fromPort holds the answer id.
      const byPort = new Map();
      outs.forEach((e) => { if (!byPort.has(e.fromPort)) byPort.set(e.fromPort, e); });
      node.answers.forEach((a) => { const e = byPort.get(a.id); if (e) consider(e); });
      outs.forEach(consider); // append any edges not matched to an answer (data anomalies)
    } else {
      outs.forEach(consider);
    }
    return result;
  }

  // ── Phase 3 — tidy-tree DFS Y assignment
  const positions = new Map(); // nodeId → { x, y, h }
  const visited = new Set();

  function layoutSubtree(nodeId, startY) {
    if (visited.has(nodeId)) {
      const p = positions.get(nodeId);
      return p ? { top: p.y, bottom: p.y + p.h, anchor: p.y + p.h / 2 } : null;
    }
    visited.add(nodeId);
    const node = byId.get(nodeId);
    if (!node) return null;
    const x = X_OFFSET + (levels.get(nodeId) || 0) * COL_W;
    const h = estHeight(node);
    const children = orderedChildren(nodeId);
    if (children.length === 0) {
      positions.set(nodeId, { x, y: startY, h });
      return { top: startY, bottom: startY + h, anchor: startY + h / 2 };
    }
    let y = startY;
    let firstAnchor = null;
    let lastAnchor = null;
    children.forEach((cid) => {
      const sub = layoutSubtree(cid, y);
      if (!sub) return;
      if (firstAnchor == null) firstAnchor = sub.anchor;
      lastAnchor = sub.anchor;
      y = sub.bottom + ROW_GAP;
    });
    const anchorY = firstAnchor != null ? (firstAnchor + lastAnchor) / 2 : startY + h / 2;
    const myY = anchorY - h / 2;
    positions.set(nodeId, { x, y: myY, h });
    return { top: Math.min(startY, myY), bottom: Math.max(y - ROW_GAP, myY + h), anchor: anchorY };
  }

  layoutSubtree(definition.id, Y_OFFSET);

  // Tidy-tree centering can push a parent above Y_OFFSET when its subtree is
  // bottom-heavy (centered against children whose first sibling is at Y_OFFSET).
  // Definition is pinned to (X_OFFSET, Y_OFFSET) — keep everything else below it.
  let minPlacedY = Y_OFFSET;
  positions.forEach((p) => { if (p.y < minPlacedY) minPlacedY = p.y; });
  if (minPlacedY < Y_OFFSET) {
    const shift = Y_OFFSET - minPlacedY;
    positions.forEach((p) => { p.y += shift; });
  }

  // ── Phase 4 — stragglers (reachable but not visited via the main subtree, e.g. DAG fragments)
  let strayY = Y_OFFSET;
  positions.forEach((p) => { if (p.y + p.h + ROW_GAP > strayY) strayY = p.y + p.h + ROW_GAP; });
  nodes.forEach((n) => {
    if (n.type === 'handler' || n.type === 'definition' || positions.has(n.id)) return;
    const x = X_OFFSET + (levels.get(n.id) || (maxLevel + 1)) * COL_W;
    const h = estHeight(n);
    positions.set(n.id, { x, y: strayY, h });
    strayY += h + ROW_GAP;
  });

  // ── Phase 5 — PEOPLE nodes (keep saved positions; default to a row below the flow)
  const peopleY = Math.max(strayY, Y_OFFSET + PEOPLE_Y_FALLBACK);
  let peopleIdx = 0;
  nodes.filter((n) => n.type === 'handler').forEach((n) => {
    if (positions.has(n.id)) return;
    const hasSaved = (typeof n.x === 'number' && typeof n.y === 'number' && (n.x !== 0 || n.y !== 0));
    if (hasSaved) {
      positions.set(n.id, { x: n.x, y: n.y, h: estHeight(n) });
    } else {
      positions.set(n.id, { x: 80 + peopleIdx * PEOPLE_X_STRIDE, y: peopleY, h: estHeight(n) });
      peopleIdx += 1;
    }
  });

  const laidOut = nodes.map((n) => {
    if (n.type === 'definition') return { ...n, x: X_OFFSET, y: Y_OFFSET };
    const p = positions.get(n.id);
    return p ? { ...n, x: p.x, y: p.y } : n;
  });

  // Post-render normalization in FlowCanvas only pushes nodes down on overlap.
  return { nodes: laidOut, edges };
}

function builderGraphToBackendFlow(currentFlow, nodes, edges) {
  if (!currentFlow) return null;
  return {
    ...currentFlow,
    nodes: nodes.map((node) => {
      if (node.type === 'definition') {
        return {
          id: node.id,
          type: 'DEFINITION',
          label: node.title || currentFlow.name,
          content: {
            description: node.body || '',
            relatedOffices: node.relatedOffices || [],
            templates: node.templates || [],
            resources: node.resources || [],
          },
          posX: node.x,
          posY: node.y,
          isDeletable: false,
          answers: [],
        };
      }
      if (node.type === 'decision') {
        return {
          id: node.id,
          type: 'DECISION',
          label: node.title || 'Decision',
          content: { question: node.title || 'Decision' },
          posX: node.x,
          posY: node.y,
          isDeletable: true,
          answers: (node.answers || []).map((answer, order) => {
            const row = { id: answer.id, text: answer.label, order };
            const rat = String(answer.rationale || '').trim();
            if (rat) row.rationale = rat;
            return row;
          }),
        };
      }
      if (node.type === 'handler') {
        return {
          id: node.id,
          type: 'HANDLER',
          label: node.name || 'Contact',
          content: {
            name: node.name || '',
            department: node.role || '',
            email: node.email || '',
            hiddenFromResearchers: Boolean(node.hiddenFromResearchers),
          },
          posX: node.x,
          posY: node.y,
          isDeletable: true,
          answers: [],
        };
      }
      return {
        id: node.id,
        type: 'ACTION',
        label: node.title || 'Action',
        content: {
          title: node.title || 'Action',
          description: node.description || '',
          assigneeKind: String(node.assignee || '').includes('@') ? 'email' : 'office',
          assignee: node.assignee || '',
          materials: ensureMaterialsArray(node.materials).map((material) => ({
            id: material.id || `mat-${Math.random()}`,
            label: material.label || 'Material',
            attachKind: material.attachKind || null,
            attachValue: material.attachValue || '',
          })),
        },
        posX: node.x,
        posY: node.y,
        isDeletable: true,
        answers: [],
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      sourceNodeId: edge.from,
      sourceAnswerId: edge.fromPort === 'out' ? null : edge.fromPort,
      targetNodeId: edge.to,
      isDeletable: edge.locked !== true,
    })),
  };
}

/** One DECISION branch row: label (44px) + one-line rationale preview (18px), optional expanded rationale editor (+72px). */
function decisionSegmentHeight(answer) {
  const base = 62;
  const extra = answer && answer.rationaleExpanded ? 72 : 0;
  return base + extra;
}

/** Vertical center of the label row’s output port (matches NodeView `.node-answer-main`). */
function decisionPortLocalCenterY(node, idx) {
  const answers = node.answers || [];
  let y = 71;
  for (let k = 0; k < idx; k += 1) y += decisionSegmentHeight(answers[k]);
  return y + 22;
}

const nodeHeight = (node) => {
  if (node.type === 'start') return 72;
  if (node.type === 'definition') return 300;
  if (node.type === 'action') { const m = ensureMaterialsArray(node.materials).length; return 104 + (node.assignee ? 32 : 0) + 28 + m * 28 + 26; }
  if (node.type === 'publish') return 80;
  if (node.type === 'handler') return node.email ? 138 : 140;
  if (node.type === 'decision') {
    const sum = (node.answers || []).reduce((s, a) => s + decisionSegmentHeight(a), 0);
    return 71 + sum + 30;
  }
  return 72 + (node.answers?.length || 0) * 44 + 30;
};

// Compute zoom+pan to fit all nodes centered in the viewport.
function computeFitViewport(nodes, wrapEl, padding) {
  padding = padding == null ? 60 : padding;
  if (!nodes || !nodes.length || !wrapEl) return null;
  const wrapW = wrapEl.clientWidth;
  const wrapH = wrapEl.clientHeight;
  const xs = nodes.map(function(n) { return n.x; });
  const ys = nodes.map(function(n) { return n.y; });
  const xe = nodes.map(function(n) { return n.x + NODE_W; });
  const ye = nodes.map(function(n) { return n.y + nodeHeight(n); });
  const minX = Math.min.apply(null, xs);
  const minY = Math.min.apply(null, ys);
  const maxX = Math.max.apply(null, xe);
  const maxY = Math.max.apply(null, ye);
  const contentW = maxX - minX;
  const contentH = maxY - minY;
  if (contentW <= 0 || contentH <= 0) return null;
  const nextZoom = Math.min(1.5, Math.max(0.35, Math.min((wrapW - padding * 2) / contentW, (wrapH - padding * 2) / contentH)));
  return {
    zoom: nextZoom,
    pan: {
      x: wrapW / 2 - (minX + contentW / 2) * nextZoom,
      y: wrapH / 2 - (minY + contentH / 2) * nextZoom,
    },
  };
}

const portPos = (node, portId) => {
  const h = nodeHeight(node);
  if (portId === 'in') {
    return { x: node.x, y: node.y + h / 2 };
  }
  if (portId === 'out') {
    return { x: node.x + NODE_W, y: node.y + h / 2 };
  }
  const idx = node.answers?.findIndex(a => a.id === portId);
  if (idx < 0) return { x: node.x + NODE_W, y: node.y + h / 2 };
  return { x: node.x + NODE_W, y: node.y + decisionPortLocalCenterY(node, idx) };
};

const bezier = (a, b) => {
  const dx = Math.max(40, Math.abs(b.x - a.x) * 0.5);
  return `M ${a.x},${a.y} C ${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
};

/** Compact graph summary for AI assistant prompts. */
function graphToAssistantContext(graph) {
  const nodes = graph?.nodes || [];
  const edges = graph?.edges || [];
  return {
    nodes: nodes.map((n) => {
      const base = { id: n.id, type: n.type, x: n.x, y: n.y };
      if (n.type === 'definition') {
        return { ...base, title: n.title, body: (n.body || '').slice(0, 800) };
      }
      if (n.type === 'decision') {
        return {
          ...base,
          title: n.title,
          answers: (n.answers || []).map((a) => ({
            id: a.id,
            label: a.label,
            rationale: (a.rationale || '').slice(0, 200),
          })),
        };
      }
      if (n.type === 'handler') {
        return { ...base, name: n.name, role: n.role, email: n.email };
      }
      if (n.type === 'action') {
        return {
          ...base,
          title: n.title,
          description: (n.description || '').slice(0, 400),
          assignee: n.assignee,
        };
      }
      return { ...base, title: n.title || n.name };
    }),
    edges: edges.map((e) => ({
      id: e.id,
      from: e.from,
      fromPort: e.fromPort,
      to: e.to,
    })),
  };
}

function resolveAssistantNodeRef(ref, idMap, nodes) {
  if (!ref) return null;
  if (idMap[ref]) return idMap[ref];
  if (nodes.some((n) => n.id === ref)) return ref;
  return null;
}

function buildAssistantNodeFromPayload(payload, fallbackX, fallbackY) {
  const type = payload.type || 'action';
  const base = {
    id: payload.id || `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    x: typeof payload.x === 'number' ? payload.x : fallbackX,
    y: typeof payload.y === 'number' ? payload.y : fallbackY,
  };
  if (type === 'decision') {
    const answers = (payload.answers || [{ label: 'Yes' }, { label: 'No' }]).map((a, i) => ({
      id: a.id || `a_${Date.now()}_${i}`,
      label: a.label || `Option ${i + 1}`,
      rationale: a.rationale != null ? String(a.rationale) : '',
    }));
    return { ...base, type: 'decision', title: payload.title || 'New decision?', answers };
  }
  if (type === 'handler') {
    return {
      ...base,
      type: 'handler',
      name: payload.name || payload.title || 'Contact',
      role: payload.role || '',
      email: payload.email || '',
      hiddenFromResearchers: Boolean(payload.hiddenFromResearchers),
    };
  }
  return {
    ...base,
    type: 'action',
    title: payload.title || 'New action',
    description: payload.description || '',
    assignee: payload.assignee || '',
    materials: ensureMaterialsArray(payload.materials),
  };
}

/**
 * Apply assistant operation list to a builder graph. Returns { nodes, edges, applied, skipped }.
 */
function applyAssistantOperationsToGraph(nodes, edges, operations) {
  let nextNodes = nodes.map((n) => ({ ...n, answers: n.answers?.map((a) => ({ ...a })) }));
  let nextEdges = edges.map((e) => ({ ...e }));
  const idMap = {};
  let applied = 0;
  const skipped = [];
  const maxX = nextNodes.reduce((m, n) => Math.max(m, n.x || 0), -310);
  let spawnY = 80;

  for (const raw of operations || []) {
    const op = raw?.op || raw?.type;
    try {
      if (op === 'add_node') {
        const payload = raw.node || raw.payload?.node || {};
        const node = buildAssistantNodeFromPayload(payload, maxX + 330, spawnY);
        spawnY += 120;
        nextNodes.push(node);
        if (raw.tempId) idMap[raw.tempId] = node.id;
        if (payload.tempId) idMap[payload.tempId] = node.id;
        applied += 1;
      } else if (op === 'update_node') {
        const nodeId = resolveAssistantNodeRef(raw.nodeId || raw.id, idMap, nextNodes);
        const fields = raw.fields || raw.patch || raw.payload?.fields || {};
        if (!nodeId) throw new Error('Unknown node');
        const idx = nextNodes.findIndex((n) => n.id === nodeId);
        if (idx < 0) throw new Error('Node not found');
        const cur = nextNodes[idx];
        if (cur.type === 'definition') {
          nextNodes[idx] = {
            ...cur,
            title: fields.title ?? cur.title,
            body: fields.body ?? fields.description ?? cur.body,
            relatedOffices: fields.relatedOffices ?? cur.relatedOffices,
            templates: fields.templates ?? cur.templates,
            resources: fields.resources ?? cur.resources,
          };
        } else if (cur.type === 'decision') {
          let answers = cur.answers;
          if (Array.isArray(fields.answers)) {
            answers = fields.answers.map((a, i) => ({
              id: a.id || cur.answers?.[i]?.id || `a_${Date.now()}_${i}`,
              label: a.label ?? a.text ?? `Option ${i + 1}`,
              rationale: a.rationale != null ? String(a.rationale) : '',
            }));
          }
          nextNodes[idx] = { ...cur, title: fields.title ?? cur.title, answers };
        } else if (cur.type === 'handler') {
          nextNodes[idx] = {
            ...cur,
            name: fields.name ?? cur.name,
            role: fields.role ?? cur.role,
            email: fields.email ?? cur.email,
            hiddenFromResearchers: fields.hiddenFromResearchers ?? cur.hiddenFromResearchers,
          };
        } else {
          nextNodes[idx] = {
            ...cur,
            title: fields.title ?? cur.title,
            description: fields.description ?? cur.description,
            assignee: fields.assignee ?? cur.assignee,
            materials: fields.materials != null ? ensureMaterialsArray(fields.materials) : cur.materials,
          };
        }
        applied += 1;
      } else if (op === 'delete_node') {
        const nodeId = resolveAssistantNodeRef(raw.nodeId || raw.id, idMap, nextNodes);
        if (!nodeId) throw new Error('Unknown node');
        const target = nextNodes.find((n) => n.id === nodeId);
        if (target?.type === 'definition') throw new Error('Cannot delete definition node');
        nextNodes = nextNodes.filter((n) => n.id !== nodeId);
        nextEdges = nextEdges.filter((e) => e.from !== nodeId && e.to !== nodeId);
        applied += 1;
      } else if (op === 'add_edge' || op === 'connect') {
        const from = resolveAssistantNodeRef(raw.from, idMap, nextNodes);
        const to = resolveAssistantNodeRef(raw.to, idMap, nextNodes);
        if (!from || !to) throw new Error('Unknown edge endpoint');
        const fromPort = raw.fromPort || 'out';
        nextEdges = nextEdges.filter((e) => !(e.from === from && e.fromPort === fromPort));
        nextEdges.push({
          id: raw.edgeId || `e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          from,
          fromPort,
          to,
          toPort: raw.toPort || 'in',
        });
        applied += 1;
      } else if (op === 'remove_edge' || op === 'delete_edge') {
        if (raw.edgeId) {
          nextEdges = nextEdges.filter((e) => e.id !== raw.edgeId);
        } else {
          const from = resolveAssistantNodeRef(raw.from, idMap, nextNodes);
          const to = resolveAssistantNodeRef(raw.to, idMap, nextNodes);
          const fromPort = raw.fromPort;
          nextEdges = nextEdges.filter(
            (e) => !(e.from === from && e.to === to && (fromPort == null || e.fromPort === fromPort)),
          );
        }
        applied += 1;
      } else {
        skipped.push({ op, reason: `Unknown operation: ${op}` });
      }
    } catch (e) {
      skipped.push({ op, reason: e.message || String(e) });
    }
  }

  return {
    nodes: ensureDefinitionNode(nextNodes),
    edges: nextEdges,
    applied,
    skipped,
  };
}


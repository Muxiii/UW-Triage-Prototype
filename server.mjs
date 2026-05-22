import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const WordExtractorCtor = require('word-extractor');

const DB_PATH = path.join(__dirname, 'data', 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 3100);
/** Max completion tokens (output). No app-side floor; set env to cap. Provider still enforces model max. */
function envOutputTokens(primaryEnv, fallbackDefault) {
  const v = Number(process.env[primaryEnv]) || Number(process.env.AI_MAX_OUTPUT_TOKENS);
  if (Number.isFinite(v) && v >= 1) return Math.floor(v);
  return fallbackDefault;
}
const claude128kBetaOn =
  process.env.CLAUDE_OUTPUT_128K_BETA !== '0' && process.env.CLAUDE_OUTPUT_128K_BETA !== 'false';
// Defaults: large output for file→flow. Claude uses 128k-output beta when enabled (see callClaude).
const AI_MAX_OUTPUT_TOKENS_CLAUDE = envOutputTokens('AI_MAX_OUTPUT_TOKENS_CLAUDE', claude128kBetaOn ? 128000 : 8192);
const AI_MAX_OUTPUT_TOKENS_OPENAI = envOutputTokens('AI_MAX_OUTPUT_TOKENS_OPENAI', 262144);
const SUPPORTED_AI_PROVIDERS = ['openai', 'claude', 'kimi'];
let aiConfig = null;

const FlowStatus = {
  DRAFT: 'DRAFT',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  PUBLISHED: 'PUBLISHED',
};

const PublishScope = {
  INTERNAL: 'INTERNAL',
  PUBLIC: 'PUBLIC',
};

const NodeType = {
  DEFINITION: 'DEFINITION',
  DECISION: 'DECISION',
  ACTION: 'ACTION',
  HANDLER: 'HANDLER',
};

function id(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function now() {
  return new Date().toISOString();
}

async function readDb() {
  if (!existsSync(DB_PATH)) return { flows: [], publishedSnapshots: [] };
  return JSON.parse(await readFile(DB_PATH, 'utf8'));
}

async function writeDb(db) {
  await writeFile(DB_PATH, `${JSON.stringify(db, null, 2)}\n`, 'utf8');
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'content-type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    ...headers,
  });
  res.end(payload);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function summarizeText(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'Agreement routing flow generated from an uploaded source document.';
  return clean.slice(0, 240) + (clean.length > 240 ? '...' : '');
}

function inferFlowName(name, sourceFile, sourceText) {
  if (name?.trim()) return name.trim();
  if (sourceFile?.trim()) return sourceFile.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  const match = String(sourceText || '').match(/\b(MTA|NDA|Data Use Agreement|DUA|Material Transfer Agreement)\b/i);
  return match ? `${match[0].toUpperCase()} Triage Flow` : 'Generated Agreement Flow';
}

function makeMaterial(label) {
  return { id: id('mat'), label, attachKind: null, attachValue: '' };
}

async function ensureAiConfigInteractive() {
  if (process.env.AI_PROVIDER && process.env.AI_API_KEY) {
    const provider = process.env.AI_PROVIDER.toLowerCase();
    aiConfig = {
      provider,
      apiKey: process.env.AI_API_KEY,
      model: process.env.AI_MODEL || defaultModelForProvider(provider),
    };
    return;
  }

  const rl = readline.createInterface({ input, output });
  const providerAnswer = await rl.question('Choose AI provider (openai/claude/kimi): ');
  const provider = (providerAnswer.trim() || 'claude').toLowerCase();
  const apiKey = (await rl.question('Enter API key (required for AI analysis): ')).trim();
  const modelAnswer = await rl.question(`Model (optional, default ${defaultModelForProvider(provider)}): `);
  rl.close();

  aiConfig = {
    provider,
    apiKey,
    model: modelAnswer.trim() || defaultModelForProvider(provider),
  };
}

function defaultModelForProvider(provider) {
  if (provider === 'openai') return 'gpt-4o-mini';
  if (provider === 'kimi') return 'moonshot-v1-auto';
  return 'claude-3-5-sonnet-latest';
}

function requireAiConfig() {
  if (!aiConfig || !SUPPORTED_AI_PROVIDERS.includes(aiConfig.provider)) {
    throw new Error(`AI provider is required and must be one of: ${SUPPORTED_AI_PROVIDERS.join(', ')}.`);
  }
  if (!aiConfig.apiKey) {
    throw new Error('AI API key is required. Restart the dev server and enter an API key.');
  }
  return aiConfig;
}

const FILE2FLOW_SEGMENT_CANDIDATES_PATH = path.join(__dirname, 'data', 'file2flow-segments-candidates-last.json');
const FILE2FLOW_PROMPTS_DIR = path.join(__dirname, 'prompts', 'file2flow');

/** Remove HTML comments so README-style notes can live inside .md prompt files. */
function stripHtmlCommentsFromPrompt(raw) {
  return String(raw || '').replace(/<!--[\s\S]*?-->/g, '').trim();
}

async function loadFile2flowPrompt(filename) {
  const full = path.join(FILE2FLOW_PROMPTS_DIR, filename);
  try {
    const raw = await readFile(full, 'utf8');
    return stripHtmlCommentsFromPrompt(raw);
  } catch (e) {
    throw new Error(`Missing or unreadable File2Flow prompt file "${filename}" (${full}): ${e.message}`);
  }
}

function fillFile2flowPromptPlaceholders(template, vars) {
  let out = template;
  for (const [key, val] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(String(val ?? ''));
  }
  const unreplaced = [...out.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((m) => m[1]);
  if (unreplaced.length) {
    console.warn('[file2flow prompts] unreplaced placeholders:', [...new Set(unreplaced)].join(', '));
  }
  return out;
}

/** Heuristic only: more markers ⇒ higher chance the slice is procedural (not used to extract points). */
function markerLikelihoodForSegmentText(text) {
  const t = String(text || '');
  let score = 0;
  if (/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/.test(t)) score += 3;
  if (/\(\s*\d{1,2}\s*\)/.test(t)) score += 2;
  if (/^\d{1,2}\.\s/m.test(t) || /\n\d{1,2}\.\s/.test(t)) score += 1;
  if (/^\d+\.\d+\s/m.test(t)) score += 1;
  if (/^[a-zA-Z]\.\s/m.test(t)) score += 1;
  if (/(若|如果|当|在[^。\n]{0,30}情况).{0,120}?(应|须|必须)/.test(t)) score += 2;
  if (/\b(if|when)\b/i.test(t) && /\b(must|should|shall)\b/i.test(t)) score += 1;
  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  if (score >= 1) return 'low';
  return 'none';
}

const FILE2FLOW_LLM_SEGMENT_MAX_SOURCE_CHARS = (() => {
  const v = Number(process.env.FILE2FLOW_LLM_SEGMENT_MAX_SOURCE_CHARS);
  if (Number.isFinite(v) && v >= 4096) return Math.floor(v);
  return 48000;
})();

function mergeAdjacentSmallestUntilMaxSegmentRanges(segs, full, maxSegments) {
  let out = segs.map((s) => ({ start: s.start, end: s.end, text: s.text }));
  while (out.length > maxSegments) {
    let bestI = 0;
    let bestLen = Infinity;
    for (let i = 0; i < out.length - 1; i += 1) {
      const len = out[i].text.length + out[i + 1].text.length;
      if (len < bestLen) {
        bestLen = len;
        bestI = i;
      }
    }
    const a = out[bestI];
    const b = out[bestI + 1];
    out.splice(bestI, 2, {
      start: a.start,
      end: b.end,
      text: full.slice(a.start, b.end),
    });
  }
  return out;
}

function rangeSegmentsToFinalOutput(ranges) {
  return ranges.map((s, i) => ({
    id: `seg-${String(i + 1).padStart(4, '0')}`,
    start: s.start,
    end: s.end,
    text: s.text,
    markerHint: markerLikelihoodForSegmentText(s.text),
  }));
}

function verifySegmentCoverageOrWarn(out, n, label) {
  let cov = 0;
  for (const s of out) {
    if (s.start !== cov) {
      console.warn(`[${label}] coverage gap`, cov, s.start);
    }
    cov = s.end;
  }
  if (cov !== n) console.warn(`[${label}] coverage end`, cov, n);
}

function parseLlmSegmentationPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const raw = Array.isArray(parsed.segments)
    ? parsed.segments
    : Array.isArray(parsed.parts)
      ? parsed.parts
      : null;
  if (!raw) return null;
  return raw.map((item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && item.text != null) return String(item.text);
    return '';
  });
}

function buildRangesFromSegmentTextsOrNull(full, texts) {
  if (!Array.isArray(texts) || texts.length === 0) return null;
  if (texts.join('') !== full) return null;
  let pos = 0;
  const ranges = [];
  for (const t of texts) {
    const slice = full.slice(pos, pos + t.length);
    if (slice !== t) return null;
    ranges.push({ start: pos, end: pos + t.length, text: t });
    pos += t.length;
  }
  if (pos !== full.length) return null;
  return ranges;
}

async function repairLlmSegmentationJoinMismatch(fullSource, badTexts, config) {
  const tpl = await loadFile2flowPrompt('00-source-segmentation-fix-join.md');
  const badJson = JSON.stringify({ segments: badTexts.map((text) => ({ text })) });
  const maxBad = 100000;
  const badSlice = badJson.length > maxBad ? `${badJson.slice(0, maxBad)}\n…(truncated, ${badJson.length} chars total)` : badJson;
  const prompt = fillFile2flowPromptPlaceholders(tpl, {
    SOURCE_LENGTH: String(fullSource.length),
    SOURCE_TEXT: fullSource,
    BAD_SEGMENTS_JSON: badSlice,
  });
  const rawAi = await callAi(prompt, config);
  let jsonText = extractJsonCandidate(rawAi);
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    const repaired = await repairJsonWithAi(jsonText, e.message, config, 'LLM segmentation fix JSON with segments[].text');
    jsonText = extractJsonCandidate(repaired);
    parsed = JSON.parse(jsonText);
  }
  return parseLlmSegmentationPayload(parsed);
}

/**
 * Primary: LLM splits SOURCE_TEXT into contiguous segments (lossless join).
 * Fallback: `segmentSourceTextHeuristic` on parse/join failure or oversize source.
 */
async function segmentSourceTextWithLlm(fullSource, config) {
  const full = String(fullSource || '');
  const n = full.length;
  if (!n) return { segments: [], debug: { mode: 'empty' } };

  if (process.env.FILE2FLOW_USE_HEURISTIC_SEGMENTS === '1') {
    const segments = segmentSourceTextHeuristic(full);
    return { segments, debug: { mode: 'heuristic_env', reason: 'FILE2FLOW_USE_HEURISTIC_SEGMENTS=1' } };
  }

  if (n > FILE2FLOW_LLM_SEGMENT_MAX_SOURCE_CHARS) {
    console.warn(
      `[file2flow] source length ${n} exceeds FILE2FLOW_LLM_SEGMENT_MAX_SOURCE_CHARS (${FILE2FLOW_LLM_SEGMENT_MAX_SOURCE_CHARS}); using heuristic segmentation.`,
    );
    const segments = segmentSourceTextHeuristic(full);
    return {
      segments,
      debug: { mode: 'heuristic_oversize', cap: FILE2FLOW_LLM_SEGMENT_MAX_SOURCE_CHARS, sourceLength: n },
    };
  }

  if (n < 64) {
    const ranges = [{ start: 0, end: n, text: full }];
    return {
      segments: rangeSegmentsToFinalOutput(ranges),
      debug: { mode: 'short_no_llm', sourceLength: n },
    };
  }

  const tpl = await loadFile2flowPrompt('00-source-segmentation.md');
  const prompt = fillFile2flowPromptPlaceholders(tpl, {
    SOURCE_LENGTH: String(n),
    SOURCE_TEXT: full,
  });

  let rawAi = null;
  let texts = null;
  let parseNote = null;

  try {
    rawAi = await callAi(prompt, config);
    let jsonText = extractJsonCandidate(rawAi);
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      const repaired = await repairJsonWithAi(
        jsonText,
        e.message,
        config,
        'LLM document segmentation JSON with top-level segments array of objects {text}',
      );
      jsonText = extractJsonCandidate(repaired);
      parsed = JSON.parse(jsonText);
      parseNote = `json_repair:${e.message}`;
    }
    texts = parseLlmSegmentationPayload(parsed);
    if (!texts || texts.length === 0) {
      throw new Error('LLM returned no segments');
    }
    if (texts.join('') !== full) {
      const retried = await repairLlmSegmentationJoinMismatch(full, texts, config);
      if (Array.isArray(retried) && retried.join('') === full) {
        texts = retried;
        parseNote = (parseNote ? `${parseNote};` : '') + 'join_repair_ok';
      }
    }
  } catch (e) {
    console.warn('[file2flow] LLM segmentation failed:', e?.message || e);
    const segments = segmentSourceTextHeuristic(full);
    return {
      segments,
      debug: {
        mode: 'heuristic_fallback',
        error: String(e?.message || e),
        rawAiPrefix: rawAi ? String(rawAi).slice(0, 800) : null,
      },
    };
  }

  if (!texts || texts.join('') !== full) {
    console.warn('[file2flow] LLM segments do not concatenate to source; using heuristic segmentation.');
    const segments = segmentSourceTextHeuristic(full);
    return {
      segments,
      debug: {
        mode: 'heuristic_join_mismatch',
        parseNote,
        rawAiPrefix: rawAi ? String(rawAi).slice(0, 800) : null,
      },
    };
  }

  let ranges = buildRangesFromSegmentTextsOrNull(full, texts);
  if (!ranges) {
    const segments = segmentSourceTextHeuristic(full);
    return { segments, debug: { mode: 'heuristic_range_build_failed', parseNote } };
  }
  ranges = mergeAdjacentSmallestUntilMaxSegmentRanges(ranges, full, 96);
  const segments = rangeSegmentsToFinalOutput(ranges);
  verifySegmentCoverageOrWarn(segments, n, 'segmentSourceTextWithLlm');
  return {
    segments,
    debug: {
      mode: 'llm',
      segmentCount: segments.length,
      parseNote: parseNote || null,
      rawAiPrefix: rawAi ? String(rawAi).slice(0, 400) : null,
    },
  };
}

/**
 * Heuristic fallback: paragraph boundaries, sentence-ish splits, tiny merges, cap 96 segments.
 * Used when LLM segmentation fails or source exceeds FILE2FLOW_LLM_SEGMENT_MAX_SOURCE_CHARS.
 */
function segmentSourceTextHeuristic(sourceText) {
  const full = String(sourceText || '').replace(/\r\n/g, '\n');
  const n = full.length;
  if (!n) return [];

  const MAX_CHUNK = 980;
  const MIN_CHUNK = 52;
  const MAX_SEGMENTS = 96;

  const parts = [];
  let pos = 0;
  while (pos < n) {
    const idx = full.indexOf('\n\n', pos);
    if (idx === -1) {
      parts.push([pos, n]);
      break;
    }
    parts.push([pos, idx + 2]);
    pos = idx + 2;
  }

  const rawSegs = [];
  for (const [a, b] of parts) {
    if (a >= b) continue;
    if (b - a <= MAX_CHUNK) {
      rawSegs.push({ start: a, end: b, text: full.slice(a, b) });
      continue;
    }
    let p = a;
    while (p < b) {
      const hardEnd = Math.min(b, p + MAX_CHUNK);
      if (hardEnd >= b) {
        rawSegs.push({ start: p, end: b, text: full.slice(p, b) });
        break;
      }
      const slice = full.slice(p, hardEnd);
      const punct = /[。！？!?]\s*|\n+/g;
      let lastCut = -1;
      let m;
      while ((m = punct.exec(slice)) !== null) {
        const cut = p + m.index + m[0].length;
        if (cut - p >= MIN_CHUNK) lastCut = cut;
      }
      const cutAt = lastCut > p ? lastCut : hardEnd;
      rawSegs.push({ start: p, end: cutAt, text: full.slice(p, cutAt) });
      p = cutAt;
    }
  }

  const mergedTiny = [];
  for (const s of rawSegs) {
    if (mergedTiny.length && mergedTiny[mergedTiny.length - 1].text.length < MIN_CHUNK) {
      const prev = mergedTiny.pop();
      mergedTiny.push({
        start: prev.start,
        end: s.end,
        text: full.slice(prev.start, s.end),
      });
    } else {
      mergedTiny.push({ ...s });
    }
  }
  if (mergedTiny.length >= 2 && mergedTiny[mergedTiny.length - 1].text.length < MIN_CHUNK) {
    const last = mergedTiny.pop();
    const prev = mergedTiny.pop();
    mergedTiny.push({ start: prev.start, end: last.end, text: full.slice(prev.start, last.end) });
  }

  let segs = mergedTiny.map((s) => ({ start: s.start, end: s.end, text: s.text }));
  segs = mergeAdjacentSmallestUntilMaxSegmentRanges(segs, full, MAX_SEGMENTS);

  const out = rangeSegmentsToFinalOutput(segs);

  verifySegmentCoverageOrWarn(out, n, 'segmentSourceTextHeuristic');

  return out;
}

function formatDocumentSegmentsForPrompt(segments) {
  const lines = ['=== DOCUMENT SEGMENTS (server; contiguous; cover entire file; each char appears once) ==='];
  for (const s of segments) {
    lines.push(`<<< ${s.id} chars ${s.start}-${s.end} markerHint=${s.markerHint} >>>`);
    lines.push(s.text);
    lines.push(`<<< end ${s.id} >>>`);
  }
  return `${lines.join('\n')}\n`;
}

async function writeFile2flowSegmentCandidates(payload) {
  await writeFile(FILE2FLOW_SEGMENT_CANDIDATES_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

/** Optional pass-1: structure dossier for the graph LLM (candidate points, branch linkage). */
async function buildSourceTextAnalysisPrompt(input) {
  const tpl = await loadFile2flowPrompt('02-source-preprocess.md');
  return fillFile2flowPromptPlaceholders(tpl, {
    FLOW_NAME: input.name || '',
    SOURCE_URL: input.sourceUrl || '',
    SOURCE_FILE: input.sourceFile || '',
    SOURCE_TEXT: String(input.sourceText || ''),
  });
}

/** Keep candidatePoints JSON intact for graph step — was losing tail when dossier hit char cap. */
const FILE2FLOW_DOSSIER_MAX_CHARS = 52000;
const FILE2FLOW_DOSSIER_CANDIDATE_POINTS_MAX_CHARS = 28000;

function formatPreprocessDossier(obj) {
  if (!obj || typeof obj !== 'object') return '';
  const brief = String(obj.graphBuilderBrief || '').trim();
  const forks = Array.isArray(obj.earlyForks) ? JSON.stringify(obj.earlyForks) : '';
  const audit = Array.isArray(obj.decisionOutgoingAudit) ? JSON.stringify(obj.decisionOutgoingAudit) : '';
  const seg = Array.isArray(obj.segmentation) ? JSON.stringify(obj.segmentation) : '';
  const chain = Array.isArray(obj.candidatePoints) ? JSON.stringify(obj.candidatePoints) : '';
  const completionNotes = String(obj.candidatePointCompletionNotes || '').trim();
  const parts = [];
  /** candidatePoints first so truncation never clips the node list */
  const chainChunk = chain.slice(0, FILE2FLOW_DOSSIER_CANDIDATE_POINTS_MAX_CHARS);
  if (chainChunk) parts.push('## candidatePoints (JSON) — emit one graph node per entry; use tempId = id\n' + chainChunk);
  if (completionNotes) parts.push('## candidatePointCompletionNotes\n' + completionNotes.slice(0, 4000));
  if (brief) parts.push('## graphBuilderBrief\n' + brief.slice(0, 12000));
  if (seg) parts.push('## segmentation (JSON)\n' + seg.slice(0, 8000));
  if (forks) parts.push('## earlyForks (JSON)\n' + forks.slice(0, 12000));
  if (audit) parts.push('## decisionOutgoingAudit (JSON)\n' + audit.slice(0, 8000));
  return parts.join('\n\n').slice(0, FILE2FLOW_DOSSIER_MAX_CHARS);
}

function sanitizeCompletedCandidatePoints(points) {
  if (!Array.isArray(points)) return [];
  const out = [];
  const seen = new Set();
  for (const raw of points) {
    if (!raw || typeof raw !== 'object') continue;
    const pointId = String(raw.id || '').trim();
    if (!pointId || seen.has(pointId)) continue;
    seen.add(pointId);
    const pred =
      raw.predecessorId == null || raw.predecessorId === ''
        ? null
        : String(raw.predecessorId).trim() || null;
    out.push({
      id: pointId,
      title: String(raw.title || '').trim() || pointId,
      likelyKind: String(raw.likelyKind || 'UNKNOWN').trim().toUpperCase() || 'UNKNOWN',
      predecessorId: pred,
      rationale: String(raw.rationale || '').trim(),
    });
  }
  const ids = new Set(out.map((p) => p.id));
  for (const p of out) {
    if (p.predecessorId && !ids.has(p.predecessorId)) p.predecessorId = null;
    if (p.predecessorId === p.id) p.predecessorId = null;
  }
  return out;
}

function mergePreprocessWithCandidateCompletion(preprocessParsed, completionParsed) {
  if (!preprocessParsed || typeof preprocessParsed !== 'object') return preprocessParsed;
  if (!completionParsed || typeof completionParsed !== 'object') return preprocessParsed;
  const points = sanitizeCompletedCandidatePoints(completionParsed.candidatePoints);
  if (!points.length) return preprocessParsed;
  return {
    ...preprocessParsed,
    candidatePoints: points,
    candidatePointCompletionNotes: String(completionParsed.completionNotes || '').trim() || undefined,
  };
}

async function buildCompleteCandidatePointsPrompt(originalSource, restatedSource, candidatePoints, input) {
  const tpl = await loadFile2flowPrompt('03-complete-candidate-points.md');
  return fillFile2flowPromptPlaceholders(tpl, {
    FLOW_NAME: input.name || '',
    SOURCE_FILE: input.sourceFile || '',
    ORIGINAL_SOURCE_TEXT: String(originalSource || ''),
    RESTATED_SOURCE_TEXT: String(restatedSource || ''),
    CANDIDATE_POINTS_JSON: JSON.stringify(candidatePoints, null, 2).slice(0, 14000),
  });
}

/**
 * Pass between preprocess and graph: fill predecessorId on headless candidate points using original text.
 * @returns {Promise<{
 *   skipped: boolean,
 *   reason?: string,
 *   prompt: string,
 *   rawAi: string|null,
 *   extractedJsonText: string|null,
 *   parsed: object|null,
 *   parseNote?: string|null,
 *   repairRawAi?: string|null,
 *   candidatePointsBefore?: object[]|null,
 * }>}
 */
async function completeCandidatePointsWithLlm(originalSource, restatedSource, preprocessParsed, input, config) {
  const points = Array.isArray(preprocessParsed?.candidatePoints) ? preprocessParsed.candidatePoints : [];
  const prompt = await buildCompleteCandidatePointsPrompt(originalSource, restatedSource, points, input);
  if (!points.length) {
    return {
      skipped: true,
      reason: 'no candidatePoints from preprocess',
      prompt,
      rawAi: null,
      extractedJsonText: null,
      parsed: null,
      candidatePointsBefore: points,
    };
  }
  const original = String(originalSource || '').trim();
  if (original.length < 32) {
    return {
      skipped: true,
      reason: 'original source shorter than 32 characters',
      prompt,
      rawAi: null,
      extractedJsonText: null,
      parsed: null,
      candidatePointsBefore: points,
    };
  }
  const rawAi = await callAi(prompt, config);
  let extractedJsonText = extractJsonCandidate(rawAi);
  let parsed = null;
  let parseNote = null;
  let repairRawAi = null;
  try {
    parsed = JSON.parse(extractedJsonText);
  } catch (e) {
    try {
      repairRawAi = await repairJsonWithAi(
        extractedJsonText,
        e.message,
        config,
        'candidate point completion JSON (candidatePoints, completionNotes)'
      );
      extractedJsonText = extractJsonCandidate(repairRawAi);
      parsed = JSON.parse(extractedJsonText);
      parseNote = `JSON repair pass after: ${e.message}`;
    } catch (e2) {
      try {
        extractedJsonText = repairCommonJsonIssues(extractedJsonText);
        parsed = JSON.parse(extractedJsonText);
        parseNote = `Local JSON cleanup after: ${e2.message}`;
      } catch (e3) {
        parseNote = `Parse failed: ${e.message}; AI repair: ${e2.message}; local: ${e3.message}`;
        parsed = null;
      }
    }
  }
  if (parsed?.candidatePoints) {
    parsed = {
      ...parsed,
      candidatePoints: sanitizeCompletedCandidatePoints(parsed.candidatePoints),
    };
  }
  return {
    skipped: false,
    prompt,
    rawAi,
    extractedJsonText,
    parsed,
    parseNote,
    repairRawAi: repairRawAi || undefined,
    candidatePointsBefore: points,
  };
}

/**
 * @returns {{
 *   skipped: boolean,
 *   reason?: string,
 *   prompt: string,
 *   rawAi: string|null,
 *   extractedJsonText: string|null,
 *   parsed: object|null,
 *   parseNote?: string|null,
 *   repairRawAi?: string|null,
 * }}
 */
async function analyzeSourceTextStructure(input, config) {
  const sourceText = String(input.sourceText || '').trim();
  const prompt = await buildSourceTextAnalysisPrompt(input);
  if (sourceText.length < 64) {
    return {
      skipped: true,
      reason: 'sourceText shorter than 64 characters; preprocess LLM not called.',
      prompt,
      rawAi: null,
      extractedJsonText: null,
      parsed: null,
    };
  }
  const rawAi = await callAi(prompt, config);
  let extractedJsonText = extractJsonCandidate(rawAi);
  let parsed = null;
  let parseNote = null;
  let repairRawAi = null;
  try {
    parsed = JSON.parse(extractedJsonText);
  } catch (e) {
    try {
      repairRawAi = await repairJsonWithAi(
        extractedJsonText,
        e.message,
        config,
        'a SOURCE STRUCTURE analysis dossier (candidatePoints, segmentation, earlyForks, decisionOutgoingAudit, graphBuilderBrief)'
      );
      extractedJsonText = extractJsonCandidate(repairRawAi);
      parsed = JSON.parse(extractedJsonText);
      parseNote = `JSON repair pass after: ${e.message}`;
    } catch (e2) {
      try {
        extractedJsonText = repairCommonJsonIssues(extractedJsonText);
        parsed = JSON.parse(extractedJsonText);
        parseNote = `Local JSON cleanup after: ${e2.message}`;
      } catch (e3) {
        parseNote = `Parse failed: ${e.message}; AI repair: ${e2.message}; local: ${e3.message}`;
        parsed = null;
      }
    }
  }
  return {
    skipped: false,
    prompt,
    rawAi,
    extractedJsonText,
    parsed,
    parseNote,
    repairRawAi: repairRawAi || undefined,
  };
}

async function buildGraphPrompt(input, preprocessDossier = '') {
  const tpl = await loadFile2flowPrompt('04-graph-from-source.md');
  const sourceText = String(input.sourceText || '');
  const preprocessDossierSection = preprocessDossier.trim()
    ? `\n---\nStructured document analysis (pass-1 **candidatePoints** and branch linkage — **one graph node per candidatePoint** where possible; branches may be non-adjacent; graph need not be fully connected; missing incoming edges are OK; do not omit nodes to force connectivity):\n${preprocessDossier}\n`
    : '';
  return fillFile2flowPromptPlaceholders(tpl, {
    FLOW_NAME: input.name || '',
    SOURCE_URL: input.sourceUrl || '',
    SOURCE_FILE: input.sourceFile || '',
    SOURCE_TEXT: sourceText,
    PREPROCESS_DOSSIER_SECTION: preprocessDossierSection,
  });
}

function extractJsonCandidate(text) {
  const fenced = String(text || '').match(/```json\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = String(text || '').indexOf('{');
  const end = String(text || '').lastIndexOf('}');
  if (start !== -1 && end > start) return String(text).slice(start, end + 1).trim();
  return String(text || '').trim();
}

async function callClaude(prompt, config) {
  const maxTokens = AI_MAX_OUTPUT_TOKENS_CLAUDE;
  const headers = {
    'content-type': 'application/json',
    'x-api-key': config.apiKey,
    'anthropic-version': '2023-06-01',
  };
  if (claude128kBetaOn && maxTokens > 8192) {
    headers['anthropic-beta'] = 'output-128k-2025-02-19';
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `Claude API failed with ${response.status}`);
  return (data.content || []).map((part) => part.text || '').join('\n');
}

async function callOpenAICompatible(prompt, config, baseURL = 'https://api.openai.com/v1') {
  const body = {
    model: config.model,
    temperature: 0,
    max_tokens: AI_MAX_OUTPUT_TOKENS_OPENAI,
    messages: [{ role: 'user', content: prompt }],
  };
  if (config.provider === 'openai') {
    body.response_format = { type: 'json_object' };
  }
  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `AI API failed with ${response.status}`);
  return data.choices?.[0]?.message?.content || '{}';
}

async function callAi(prompt, config) {
  if (config.provider === 'claude') return callClaude(prompt, config);
  if (config.provider === 'openai') return callOpenAICompatible(prompt, config);
  if (config.provider === 'kimi') return callOpenAICompatible(prompt, config, 'https://api.moonshot.ai/v1');
  throw new Error(`Unsupported AI provider: ${config.provider}`);
}

function generateFallbackGraph({ name, sourceFile, sourceText }) {
  const flowName = inferFlowName(name, sourceFile, sourceText);
  const defId = id('node');
  const docTypeId = id('node');
  const humanId = id('node');
  const irbId = id('node');
  const legalId = id('node');
  const manualId = id('node');
  const peopleId = id('node');
  const ansMta = id('ans');
  const ansNda = id('ans');
  const ansOther = id('ans');
  const ansHumanYes = id('ans');
  const ansHumanNo = id('ans');

  const description = summarizeText(sourceText);
  const nodes = [
    {
      id: defId,
      type: NodeType.DEFINITION,
      label: flowName,
      content: {
        description,
        relatedOffices: [
          { name: 'UW CoMotion', contact: 'comotion@uw.edu' },
          { name: 'Office of Sponsored Programs', contact: 'osp@uw.edu' },
        ],
        templates: [
          { label: `${flowName} intake template`, url: '' },
          { label: 'Agreement checklist', url: '' },
        ],
        resources: [
          { label: 'UW agreement guidance', url: '' },
        ],
      },
      posX: 0,
      posY: 0,
      isDeletable: false,
      answers: [],
    },
    {
      id: docTypeId,
      type: NodeType.DECISION,
      label: 'What kind of agreement is this?',
      content: { question: 'What kind of agreement is this?' },
      posX: 340,
      posY: 40,
      isDeletable: true,
      answers: [
        { id: ansMta, text: 'Material Transfer Agreement', order: 0 },
        { id: ansNda, text: 'Non-disclosure Agreement', order: 1 },
        { id: ansOther, text: 'Other or unsure', order: 2 },
      ],
    },
    {
      id: humanId,
      type: NodeType.DECISION,
      label: 'Does it involve human subjects?',
      content: { question: 'Does it involve human subjects?' },
      posX: 700,
      posY: 40,
      isDeletable: true,
      answers: [
        { id: ansHumanYes, text: 'Yes', order: 0 },
        { id: ansHumanNo, text: 'No', order: 1 },
      ],
    },
    {
      id: irbId,
      type: NodeType.ACTION,
      label: 'Route to IRB review',
      content: {
        title: 'Route to IRB review',
        description: 'Send the agreement package to the IRB coordinator before legal routing.',
        assigneeKind: 'office',
        assignee: 'IRB Office',
        materials: [makeMaterial('Draft agreement'), makeMaterial('IRB protocol number')],
      },
      posX: 1060,
      posY: -20,
      isDeletable: true,
      answers: [],
    },
    {
      id: legalId,
      type: NodeType.ACTION,
      label: 'Route to CoMotion legal',
      content: {
        title: 'Route to CoMotion legal',
        description: 'Prepare the standard agreement packet for CoMotion legal review.',
        assigneeKind: 'office',
        assignee: 'UW CoMotion Legal',
        materials: [makeMaterial('Draft agreement'), makeMaterial('Statement of work or project summary')],
      },
      posX: 1060,
      posY: 220,
      isDeletable: true,
      answers: [],
    },
    {
      id: manualId,
      type: NodeType.ACTION,
      label: 'Manual triage',
      content: {
        title: 'Manual triage',
        description: 'Ask an agreement specialist to classify the document and confirm next steps.',
        assigneeKind: 'email',
        assignee: 'comotion@uw.edu',
        materials: [makeMaterial('Uploaded agreement'), makeMaterial('Short explanation of request')],
      },
      posX: 700,
      posY: 320,
      isDeletable: true,
      answers: [],
    },
    {
      id: peopleId,
      type: NodeType.HANDLER,
      label: 'CoMotion contact',
      content: {
        name: 'CoMotion Agreements',
        department: 'UW CoMotion',
        email: 'comotion@uw.edu',
        hiddenFromResearchers: false,
      },
      posX: 0,
      posY: 360,
      isDeletable: true,
      answers: [],
    },
  ];

  const edges = [
    { id: id('edge'), sourceNodeId: defId, sourceAnswerId: null, targetNodeId: docTypeId, isDeletable: false },
    { id: id('edge'), sourceNodeId: docTypeId, sourceAnswerId: ansMta, targetNodeId: humanId, isDeletable: true },
    { id: id('edge'), sourceNodeId: docTypeId, sourceAnswerId: ansNda, targetNodeId: legalId, isDeletable: true },
    { id: id('edge'), sourceNodeId: docTypeId, sourceAnswerId: ansOther, targetNodeId: manualId, isDeletable: true },
    { id: id('edge'), sourceNodeId: humanId, sourceAnswerId: ansHumanYes, targetNodeId: irbId, isDeletable: true },
    { id: id('edge'), sourceNodeId: humanId, sourceAnswerId: ansHumanNo, targetNodeId: legalId, isDeletable: true },
  ];

  return { flowName, description, nodes, edges };
}

const FILE2FLOW_DEBUG_PATH = path.join(__dirname, 'data', 'file2flow-debug-last.json');

const FILE2FLOW_SMART_EXPLORE_MAX_CANDIDATES = 8;
const FILE2FLOW_SMART_EXPLORE_MAX_FOLLOW = 3;
const FILE2FLOW_SMART_EXPLORE_SOURCE_PREVIEW_CHARS = 8000;

/**
 * Step 0 — smart URL exploration (one round only, no recursion).
 *
 * Scans the merged source text for http(s) URLs, asks the LLM which (if any)
 * are worth fetching for additional context, fetches the chosen ones, and
 * returns the augmented source text. URLs already inlined by the client
 * (e.g. `[label](url)` from htmlToPlainText) and bare URLs are both picked up.
 *
 * Returns:
 *   {
 *     skipped: boolean,
 *     reason?: string,
 *     candidates: string[],
 *     prompt?: string,
 *     rawAi?: string,
 *     llmDecision?: { follow, skip, reasoning } | null,
 *     parseError?: string,
 *     followed: string[],
 *     fetchErrors: { url, error }[],
 *     appendedChars: number,
 *     augmentedSourceText: string,
 *   }
 */
async function smartExploreUrlsInSourceText(sourceText, config) {
  const original = String(sourceText || '');
  if (process.env.AI_SKIP_SMART_URL_EXPLORATION === '1') {
    return {
      skipped: true,
      reason: 'AI_SKIP_SMART_URL_EXPLORATION=1',
      candidates: [],
      followed: [],
      fetchErrors: [],
      appendedChars: 0,
      augmentedSourceText: original,
    };
  }

  // Strip trailing punctuation that's commonly stuck to URLs in prose.
  const URL_RE = /https?:\/\/[^\s)\]"'<>]+/gi;
  const found = new Set();
  let m;
  while ((m = URL_RE.exec(original)) !== null) {
    const u = m[0].replace(/[.,;:!?)\]]+$/, '');
    if (u) found.add(u);
  }
  const candidates = [...found].slice(0, FILE2FLOW_SMART_EXPLORE_MAX_CANDIDATES);
  if (candidates.length === 0) {
    return {
      skipped: true,
      reason: 'no candidate URLs in source',
      candidates: [],
      followed: [],
      fetchErrors: [],
      appendedChars: 0,
      augmentedSourceText: original,
    };
  }

  // Ask the LLM which to follow.
  const tpl = await loadFile2flowPrompt('00-smart-url-exploration.md');
  const prompt = fillFile2flowPromptPlaceholders(tpl, {
    SOURCE_TEXT_PREVIEW: original.slice(0, FILE2FLOW_SMART_EXPLORE_SOURCE_PREVIEW_CHARS),
    CANDIDATE_URLS_JSON: JSON.stringify(candidates, null, 2),
  });

  let rawAi = null;
  let llmDecision = null;
  let parseError = null;
  try {
    rawAi = await callAi(prompt, config);
    const jsonText = extractJsonCandidate(rawAi);
    llmDecision = JSON.parse(jsonText);
  } catch (e) {
    parseError = String(e?.message || e);
    console.warn('[smart-url-exploration] LLM call / parse failed:', parseError);
  }

  let toFollow = [];
  if (llmDecision && Array.isArray(llmDecision.follow)) {
    toFollow = llmDecision.follow
      .map((u) => String(u || '').trim())
      .filter((u) => candidates.includes(u))
      .slice(0, FILE2FLOW_SMART_EXPLORE_MAX_FOLLOW);
    // De-dupe in case the model repeated entries.
    toFollow = [...new Set(toFollow)];
  }

  const followed = [];
  const fetchErrors = [];
  const appendedSections = [];
  for (const u of toFollow) {
    try {
      const r = await fetchUrlAsText(u);
      const text = String(r.text || '').trim();
      if (!text) {
        fetchErrors.push({ url: u, error: 'page returned no extractable text' });
        continue;
      }
      followed.push(u);
      appendedSections.push(`--- Followed link ${u} ---\n\n${text}`);
    } catch (e) {
      fetchErrors.push({ url: u, error: String(e?.message || e) });
    }
  }

  const augmented = appendedSections.length
    ? `${original}\n\n${appendedSections.join('\n\n')}`
    : original;

  return {
    skipped: false,
    candidates,
    prompt,
    rawAi,
    llmDecision: llmDecision || null,
    parseError,
    followed,
    fetchErrors,
    appendedChars: augmented.length - original.length,
    augmentedSourceText: augmented,
  };
}

/**
 * Pass 0: natural-language restatement of signing process (prompt file is fixed; source appended after).
 * @returns {{ restatedText: string, prompt: string, rawAi: string, skipped: boolean, reason?: string }}
 */
async function restateSourceTextForFile2flow(fullSource, config) {
  const source = String(fullSource || '').trim();
  if (!source) {
    return { restatedText: '', prompt: '', rawAi: null, skipped: true, reason: 'empty sourceText' };
  }
  if (process.env.AI_SKIP_SOURCE_RESTATEMENT === '1') {
    return {
      restatedText: source,
      prompt: '',
      rawAi: null,
      skipped: true,
      reason: 'AI_SKIP_SOURCE_RESTATEMENT=1',
    };
  }
  const instruction = await loadFile2flowPrompt('01-source-restatement.md');
  const prompt = `${instruction}\n\n---\n\n${source}`;
  const rawAi = await callAi(prompt, config);
  const restatedText = String(rawAi || '').trim();
  if (!restatedText) {
    throw new Error('Source restatement LLM returned empty text.');
  }
  return { restatedText, prompt, rawAi, skipped: false };
}

function clampSuggestedFlowTitle(s) {
  let t = String(s || '')
    .replace(/\s+/g, ' ')
    .trim();
  t = t.replace(/^[\s"'“”‘’`]+|[\s"'“”‘’`]+$/g, '');
  if (t.length > 120) t = `${t.slice(0, 117)}...`;
  return t;
}

/** First non-empty line from model output; strips bullets / wrapping quotes. */
function parseFlowTitleFromAiResponse(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  let line = raw
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('#'));
  if (!line) return '';
  line = line.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s+/, '');
  const tick = line.match(/^`([^`]+)`$/);
  if (tick) line = tick[1];
  return clampSuggestedFlowTitle(line);
}

/**
 * After restatement: short list-friendly flow name with document-type keywords.
 * @returns {Promise<{ title: string|null, prompt: string, rawAi: string|null }>}
 */
async function suggestFlowTitleFromRestatement(restatedText, input, config) {
  const source = String(restatedText || '').trim();
  const tpl = await loadFile2flowPrompt('01b-flow-title-from-restatement.md');
  const prompt = fillFile2flowPromptPlaceholders(tpl, {
    DRAFT_TITLE: String(input.name || '').trim(),
    SOURCE_FILE: String(input.sourceFile || '').trim(),
    RESTATED_TEXT: source.slice(0, 12000),
  });
  const rawAi = await callAi(prompt, config);
  const title = parseFlowTitleFromAiResponse(rawAi) || null;
  return { title, prompt, rawAi };
}

async function generateGraph(input, debugFile2flow = false, onEvent = () => {}) {
  const rawSource = String(input.sourceText || '');
  const config = requireAiConfig();
  const emit = (id, status, meta) => {
    try { onEvent({ type: 'step', id, status, ...(meta ? { meta } : {}) }); } catch { /* never let UI break a step */ }
  };

  // ── Step 0 — smart URL exploration (no recursion). One LLM call to decide
  //    which URLs in the source text to fetch, then up to 3 fetches appended
  //    to the source. Fails open: any error leaves the source untouched.
  emit('smart_explore', 'start');
  let smartExplore;
  try {
    smartExplore = await smartExploreUrlsInSourceText(rawSource, config);
  } catch (e) {
    console.warn('[file2flow] smart URL exploration failed:', e?.message || e);
    smartExplore = {
      skipped: true,
      reason: `error: ${String(e?.message || e)}`,
      candidates: [],
      followed: [],
      fetchErrors: [],
      appendedChars: 0,
      augmentedSourceText: rawSource,
    };
  }
  if (!smartExplore.skipped && smartExplore.followed.length) {
    console.log(
      `[file2flow] smart-explore followed ${smartExplore.followed.length}/${smartExplore.candidates.length} candidate URL(s); appended ${smartExplore.appendedChars} chars`
    );
  }
  if (smartExplore.skipped) {
    emit('smart_explore', 'skipped', { reason: smartExplore.reason || null });
  } else {
    emit('smart_explore', 'done', {
      candidates: smartExplore.candidates.length,
      followed: smartExplore.followed.length,
      appendedChars: smartExplore.appendedChars,
    });
  }
  const fullSource = smartExplore.augmentedSourceText;

  emit('restate', 'start');
  const restatement = await restateSourceTextForFile2flow(fullSource, config);
  const pipelineSource = restatement.restatedText;
  if (restatement.skipped) {
    emit('restate', 'skipped', { reason: restatement.reason || null });
  } else {
    emit('restate', 'done', { chars: pipelineSource.length });
  }

  let suggestedFlowTitle = null;
  let flowTitleBundle = null;
  if (process.env.AI_SKIP_FLOW_TITLE_FROM_RESTATEMENT === '1') {
    flowTitleBundle = { skipped: true, reason: 'AI_SKIP_FLOW_TITLE_FROM_RESTATEMENT=1' };
  } else if (!String(pipelineSource || '').trim() || String(pipelineSource).trim().length < 48) {
    flowTitleBundle = {
      skipped: true,
      reason: 'restatedText shorter than 48 characters',
    };
  } else {
    try {
      flowTitleBundle = await suggestFlowTitleFromRestatement(pipelineSource, input, config);
      suggestedFlowTitle = flowTitleBundle.title || null;
    } catch (e) {
      console.warn('[flow title from restatement]', e?.message || e);
      flowTitleBundle = { error: String(e?.message || e) };
    }
  }

  const pipelineInput = {
    ...input,
    sourceText: pipelineSource,
    name: suggestedFlowTitle || input.name,
  };

  const snap = debugFile2flow
    ? {
        generatedAt: now(),
        step1_inputEcho: {
          name: input.name ?? null,
          sourceFile: input.sourceFile ?? null,
          sourceUrl: input.sourceUrl ?? null,
          sourceText: rawSource,
        },
        step0_smartUrlExploration: {
          skipped: smartExplore.skipped,
          reason: smartExplore.reason ?? null,
          candidates: smartExplore.candidates,
          llmDecision: smartExplore.llmDecision,
          parseError: smartExplore.parseError ?? null,
          followed: smartExplore.followed,
          fetchErrors: smartExplore.fetchErrors,
          appendedChars: smartExplore.appendedChars,
          augmentedSourceText: smartExplore.augmentedSourceText,
        },
        step1b_restatement: {
          skipped: restatement.skipped,
          reason: restatement.reason ?? null,
          prompt: restatement.prompt,
          rawAi: restatement.rawAi,
          restatedText: pipelineSource,
        },
        step1c_flowTitle: flowTitleBundle
          ? {
              skipped: flowTitleBundle.skipped,
              reason: flowTitleBundle.reason ?? null,
              error: flowTitleBundle.error ?? null,
              prompt: flowTitleBundle.prompt ?? null,
              rawAi: flowTitleBundle.rawAi ?? null,
              suggestedFlowTitle,
            }
          : null,
      }
    : null;
  let preprocessDossier = '';
  /** @type {{ candidatePoints?: object[], earlyForks?: object[] } | null} */
  let preprocessMergedParsed = null;
  emit('nodes', 'start');
  if (process.env.AI_SKIP_SOURCE_PREPROCESS === '1') {
    if (snap) snap.step2_preprocess = { skippedByEnv: 'AI_SKIP_SOURCE_PREPROCESS=1' };
    emit('nodes', 'skipped', { reason: 'AI_SKIP_SOURCE_PREPROCESS=1' });
    emit('complete', 'skipped', { reason: 'preprocess skipped' });
    try {
      await writeFile2flowSegmentCandidates({
        generatedAt: now(),
        phase: 'preprocess_skipped_by_env',
        sourceMeta: {
          name: input.name,
          sourceFile: input.sourceFile,
          sourceUrl: input.sourceUrl,
          sourceLength: fullSource.length,
          restatedLength: pipelineSource.length,
        },
        restatement: {
          skipped: restatement.skipped,
          reason: restatement.reason ?? null,
          rawAi: restatement.rawAi,
        },
        restatedText: pipelineSource,
      });
    } catch {
      /* ignore */
    }
  } else {
    try {
      const bundle = await analyzeSourceTextStructure(pipelineInput, config);
      let mergedParsed = bundle?.parsed ?? null;
      const candidatesCount = Array.isArray(mergedParsed?.candidatePoints) ? mergedParsed.candidatePoints.length : 0;
      if (bundle?.skipped) {
        emit('nodes', 'skipped', { reason: bundle.reason || 'preprocess skipped' });
      } else {
        emit('nodes', 'done', { candidatePoints: candidatesCount });
      }
      let completionBundle = null;
      emit('complete', 'start');
      if (
        mergedParsed &&
        Array.isArray(mergedParsed.candidatePoints) &&
        mergedParsed.candidatePoints.length > 0 &&
        process.env.AI_SKIP_CANDIDATE_POINT_COMPLETION !== '1'
      ) {
        try {
          completionBundle = await completeCandidatePointsWithLlm(
            fullSource,
            pipelineSource,
            mergedParsed,
            pipelineInput,
            config
          );
          if (completionBundle?.parsed) {
            mergedParsed = mergePreprocessWithCandidateCompletion(mergedParsed, completionBundle.parsed);
          }
          emit('complete', 'done', { candidatePoints: Array.isArray(mergedParsed?.candidatePoints) ? mergedParsed.candidatePoints.length : candidatesCount });
        } catch (completionErr) {
          console.warn('[candidate point completion]', completionErr?.message || completionErr);
          completionBundle = { error: String(completionErr?.message || completionErr) };
          emit('complete', 'done', { error: String(completionErr?.message || completionErr) });
        }
      } else if (process.env.AI_SKIP_CANDIDATE_POINT_COMPLETION === '1') {
        completionBundle = { skippedByEnv: 'AI_SKIP_CANDIDATE_POINT_COMPLETION=1' };
        emit('complete', 'skipped', { reason: 'AI_SKIP_CANDIDATE_POINT_COMPLETION=1' });
      } else {
        emit('complete', 'skipped', { reason: 'no candidate points to complete' });
      }
      preprocessDossier = formatPreprocessDossier(mergedParsed);
      preprocessMergedParsed = mergedParsed;
      if (snap) snap.step2_preprocess = bundle;
      if (snap) snap.step2d_candidatePointCompletion = completionBundle;
      if (snap) snap.step2c_dossierStringInjectedIntoGraphPrompt = preprocessDossier;
      try {
        await writeFile2flowSegmentCandidates({
          generatedAt: now(),
          phase: 'after_candidate_point_completion',
          sourceMeta: {
            name: input.name ?? null,
            sourceFile: input.sourceFile ?? null,
            sourceUrl: input.sourceUrl ?? null,
            sourceLength: fullSource.length,
            restatedLength: pipelineSource.length,
          },
          restatement: {
            skipped: restatement.skipped,
            reason: restatement.reason ?? null,
            rawAi: restatement.rawAi,
          },
          restatedText: pipelineSource,
          preprocess: {
            skipped: bundle.skipped,
            parseNote: bundle.parseNote,
            rawAi: bundle.rawAi,
            extractedJsonText: bundle.extractedJsonText,
            parsed: bundle.parsed,
          },
          candidatePointCompletion: completionBundle
            ? {
                skipped: completionBundle.skipped,
                reason: completionBundle.reason ?? null,
                parseNote: completionBundle.parseNote ?? null,
                rawAi: completionBundle.rawAi ?? null,
                extractedJsonText: completionBundle.extractedJsonText ?? null,
                parsed: completionBundle.parsed ?? null,
                candidatePointsBefore: completionBundle.candidatePointsBefore ?? null,
                error: completionBundle.error ?? null,
                skippedByEnv: completionBundle.skippedByEnv ?? null,
              }
            : null,
          mergedPreprocessParsed: mergedParsed,
          dossierInjected: preprocessDossier,
        });
      } catch (e) {
        console.warn('[file2flow segment candidates file]', e?.message || e);
      }
    } catch (e) {
      console.warn('[source preprocess]', e?.message || e);
      emit('nodes', 'done', { error: String(e?.message || e) });
      emit('complete', 'skipped', { reason: 'preprocess errored' });
      if (snap) snap.step2_preprocess = { error: String(e?.message || e) };
      try {
        await writeFile2flowSegmentCandidates({
          generatedAt: now(),
          phase: 'preprocess_error',
          sourceMeta: {
            name: input.name ?? null,
            sourceFile: input.sourceFile ?? null,
            sourceUrl: input.sourceUrl ?? null,
            sourceLength: fullSource.length,
            restatedLength: pipelineSource.length,
          },
          restatement: {
            skipped: restatement.skipped,
            reason: restatement.reason ?? null,
            rawAi: restatement.rawAi,
          },
          restatedText: pipelineSource,
          error: String(e?.message || e),
        });
      } catch {
        /* ignore */
      }
    }
  }

  emit('graph', 'start');
  const graphPrompt = await buildGraphPrompt(pipelineInput, preprocessDossier);
  if (snap) snap.step3_graphPrompt = graphPrompt;

  const graphRawAi = await callAi(graphPrompt, config);
  if (snap) snap.step3_graphRawAiText = graphRawAi;

  let jsonText = stripJsStyleJsonComments(extractJsonCandidate(graphRawAi));
  if (snap) {
    snap.step3_graphExtractedJsonCandidate = jsonText;
    snap.step3_graphRepairLog = [];
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    if (snap) snap.step3_graphRepairLog.push({ stage: 'firstParse', error: error.message });
    try {
      const repaired = await repairJsonWithAi(jsonText, error.message, config, 'a UW agreement triage graph');
      if (snap) snap.step3_graphRepairLog.push({ stage: 'aiRepairRaw', text: repaired });
      jsonText = stripJsStyleJsonComments(extractJsonCandidate(repaired));
      if (snap) {
        snap.step3_graphExtractedJsonAfterAiRepair = jsonText;
      }
      parsed = JSON.parse(jsonText);
    } catch (repairError) {
      if (snap) snap.step3_graphRepairLog.push({ stage: 'aiRepairParse', error: repairError.message });
      try {
        parsed = JSON.parse(repairCommonJsonIssues(stripJsStyleJsonComments(jsonText)));
        if (snap) snap.step3_graphRepairLog.push({ stage: 'localRepair', note: 'repairCommonJsonIssues applied' });
      } catch (localRepairError) {
        if (snap) {
          snap.step_error = {
            message: `AI returned invalid JSON and repair failed. Original: ${error.message}. Repair: ${repairError.message}. Local: ${localRepairError.message}`,
            rawPrefix: String(graphRawAi || '').slice(0, 1200),
          };
          try {
            await writeFile(FILE2FLOW_DEBUG_PATH, `${JSON.stringify(snap, null, 2)}\n`, 'utf8');
          } catch {
            /* ignore */
          }
        }
        throw new Error(
          `AI returned invalid JSON and repair failed. Original parse error: ${error.message}. Repair error: ${repairError.message}. Local cleanup error: ${localRepairError.message}. Returned text starts with: ${String(graphRawAi || '').slice(0, 700)}`
        );
      }
    }
  }

  const candidatePoints = preprocessMergedParsed?.candidatePoints;
  if (Array.isArray(candidatePoints) && candidatePoints.length > 0) {
    const mergeResult = mergeParsedGraphWithCandidatePoints(
      parsed,
      candidatePoints,
      preprocessMergedParsed?.earlyForks,
      pipelineInput
    );
    parsed = mergeResult.merged;
    if (mergeResult.note?.addedNodes > 0) {
      console.warn(
        `[file2flow] merged ${mergeResult.note.addedNodes} missing node(s) from candidatePoints (${mergeResult.note.parsedCount} → ${mergeResult.note.mergedCount})`
      );
    }
    if (snap) snap.step3_candidatePointsMerge = mergeResult.note;
  }

  if (snap) snap.step3_graphParsedJson = parsed;

  let normalized;
  try {
    normalized = normalizeAiGraph(parsed, pipelineInput);
  } catch (normErr) {
    if (snap) {
      snap.step_normalize_error = String(normErr?.message || normErr);
      try {
        await writeFile(FILE2FLOW_DEBUG_PATH, `${JSON.stringify(snap, null, 2)}\n`, 'utf8');
      } catch {
        /* ignore */
      }
    }
    throw normErr;
  }

  if (suggestedFlowTitle) {
    normalized.flowName = suggestedFlowTitle;
    const defNode = normalized.nodes.find((n) => n.type === NodeType.DEFINITION);
    if (defNode) defNode.label = suggestedFlowTitle;
  }

  if (snap) {
    snap.step4_normalizedGraph = {
      flowName: normalized.flowName,
      description: normalized.description,
      nodes: normalized.nodes,
      edges: normalized.edges,
      synthesizedNodeTypes: normalized.synthesized || [],
    };
    await writeFile(FILE2FLOW_DEBUG_PATH, `${JSON.stringify(snap, null, 2)}\n`, 'utf8');
  }
  emit('graph', 'done', {
    nodes: normalized.nodes.length,
    edges: normalized.edges.length,
    synthesized: normalized.synthesized || [],
  });

  // ── Step 5: enforce researcher contract — decisions strictly before actions on every path.
  //    No LLM call; only runs when a violation is detected. If the original is already
  //    compliant, the graph passes through untouched.
  emit('reorder', 'start');
  if (process.env.AI_SKIP_DECISION_REORDER !== '1') {
    const restructureResult = restructureDecisionsBeforeActions({
      flowName: normalized.flowName,
      description: normalized.description,
      nodes: normalized.nodes,
      edges: normalized.edges,
    });
    if (restructureResult.changed) {
      console.log(
        `[file2flow] restructured: ${restructureResult.violations.length} violation(s), ` +
        `${restructureResult.pathCount} path(s), cloned ${restructureResult.cloneCount} action(s)`
      );
      normalized.nodes = restructureResult.graph.nodes;
      normalized.edges = restructureResult.graph.edges;
    }
    if (snap) {
      snap.step5_restructure = {
        skipped: false,
        changed: restructureResult.changed,
        violations: restructureResult.violations,
        pathCount: restructureResult.pathCount,
        cloneCount: restructureResult.cloneCount,
        pathsDeduped: restructureResult.pathsDeduped ?? 0,
        constraintNotes: restructureResult.constraintNotes ?? [],
        graphAfter: restructureResult.changed
          ? { nodes: normalized.nodes, edges: normalized.edges }
          : null,
      };
      await writeFile(FILE2FLOW_DEBUG_PATH, `${JSON.stringify(snap, null, 2)}\n`, 'utf8');
    }
    emit('reorder', 'done', {
      changed: restructureResult.changed,
      violations: restructureResult.violations.length,
      pathCount: restructureResult.pathCount,
      cloneCount: restructureResult.cloneCount,
    });
  } else {
    if (snap) {
      snap.step5_restructure = { skipped: true, reason: 'AI_SKIP_DECISION_REORDER=1' };
      await writeFile(FILE2FLOW_DEBUG_PATH, `${JSON.stringify(snap, null, 2)}\n`, 'utf8');
    }
    emit('reorder', 'skipped', { reason: 'AI_SKIP_DECISION_REORDER=1' });
  }

  return normalized;
}

/** Strip `//` line comments (common when the model elides nodes with "..."). */
function stripJsStyleJsonComments(text) {
  let fixed = String(text || '');
  fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');
  fixed = fixed.replace(/^\s*\/\/[^\n]*/gm, '');
  fixed = fixed.replace(/,\s*\/\/[^\n]*/g, '');
  fixed = fixed.replace(/,\s*([}\]])/g, '$1');
  return fixed;
}

function likelyKindToNodeType(likelyKind) {
  const k = String(likelyKind || '').toUpperCase();
  if (k === 'DEFINITION') return NodeType.DEFINITION;
  if (k === 'DECISION') return NodeType.DECISION;
  if (k === 'PEOPLE') return NodeType.PEOPLE;
  return NodeType.ACTION;
}

function scaffoldContentForNodeType(type, cp) {
  const title = String(cp.title || '').trim();
  const rationale = String(cp.rationale || '').trim();
  if (type === NodeType.DEFINITION) {
    return { description: rationale || title, relatedOffices: [], templates: [], resources: [] };
  }
  if (type === NodeType.DECISION) {
    return { question: title || 'Next step?' };
  }
  return { title, description: rationale, assigneeKind: '', assignee: '', materials: [] };
}

function branchHintForChildPoint(childCp, branches) {
  const title = String(childCp?.title || '').toLowerCase();
  const rat = String(childCp?.rationale || '').toLowerCase();
  const blob = `${title} ${rat}`;
  if (/comotion|intellectual property|innovation|cda guideline/i.test(blob)) {
    return branches.find((b) => /comotion/i.test(String(b.answerTextHint || ''))) || branches[1];
  }
  if (/dean|副院长|dua|dtua|patient data|som/i.test(blob)) {
    return branches.find((b) => /dean|som/i.test(String(b.answerTextHint || ''))) || branches[2];
  }
  if (/osp|sage|template|naa|egc1|sponsored/i.test(blob)) {
    return branches.find((b) => /osp|sage/i.test(String(b.answerTextHint || ''))) || branches[0];
  }
  return null;
}

function buildDecisionAnswersForChildren(parentId, childIds, childById, earlyForks) {
  if (childIds.length === 1) {
    const onlyChild = childIds[0];
    return [
      {
        tempId: `${parentId}-a1`,
        text: 'Continue',
        order: 1,
        rationale: String(childById.get(onlyChild)?.rationale || '').trim(),
        _childId: onlyChild,
      },
    ];
  }
  const fork = (earlyForks || []).find((f) => Array.isArray(f.branches) && f.branches.length >= childIds.length) ||
    (earlyForks || [])[0];
  const branches = fork?.branches || [];
  const usedBranchKeys = new Set();
  const ordered = childIds.map((childId, idx) => {
    const childCp = childById.get(childId);
    let branch = childCp ? branchHintForChildPoint(childCp, branches) : null;
    if (branch?.branchKey) usedBranchKeys.add(branch.branchKey);
    if (!branch) branch = branches[idx] || { answerTextHint: `Option ${idx + 1}`, earlyEvidence: '' };
    return { childId, branch, order: idx + 1 };
  });
  return ordered.map(({ childId, branch, order }) => ({
    tempId: `${parentId}-a${order}`,
    text: String(branch.answerTextHint || branch.branchKey || `Option ${order}`),
    order,
    rationale: String(branch.earlyEvidence || branch.notes || '').trim(),
    _childId: childId,
  }));
}

function buildGraphScaffoldFromCandidatePoints(candidatePoints, earlyForks = []) {
  const points = candidatePoints.filter((cp) => cp && cp.id);
  const childById = new Map(points.map((cp) => [String(cp.id), cp]));
  const childrenByParent = new Map();
  for (const cp of points) {
    if (!cp.predecessorId) continue;
    const p = String(cp.predecessorId);
    if (!childrenByParent.has(p)) childrenByParent.set(p, []);
    childrenByParent.get(p).push(String(cp.id));
  }

  const nodes = points.map((cp) => {
    const tempId = String(cp.id);
    const type = likelyKindToNodeType(cp.likelyKind);
    const childIds = childrenByParent.get(tempId) || [];
    let answers = [];
    if (type === NodeType.DECISION && childIds.length > 0) {
      answers = buildDecisionAnswersForChildren(tempId, childIds, childById, earlyForks).map(
        ({ tempId: aId, text, order, rationale }) => ({ tempId: aId, text, order, rationale })
      );
    } else if (type === NodeType.DECISION) {
      answers = [{ tempId: `${tempId}-a1`, text: 'Continue', order: 1, rationale: '' }];
    }
    return {
      tempId,
      type,
      label: String(cp.title || tempId),
      content: scaffoldContentForNodeType(type, cp),
      answers,
    };
  });

  const answerByChild = new Map();
  for (const n of nodes) {
    if (n.type !== NodeType.DECISION) continue;
    const childIds = childrenByParent.get(n.tempId) || [];
    if (!childIds.length) continue;
    const built = buildDecisionAnswersForChildren(n.tempId, childIds, childById, earlyForks);
    built.forEach((a) => {
      if (a._childId) answerByChild.set(`${n.tempId}|${a._childId}`, a.tempId);
    });
    n.answers = built.map(({ tempId, text, order, rationale }) => ({ tempId, text, order, rationale }));
  }

  const edges = [];
  for (const cp of points) {
    if (!cp.predecessorId) continue;
    const parentId = String(cp.predecessorId);
    const childId = String(cp.id);
    const parentNode = nodes.find((n) => n.tempId === parentId);
    let sourceAnswerTempId = null;
    if (parentNode?.type === NodeType.DECISION) {
      sourceAnswerTempId = answerByChild.get(`${parentId}|${childId}`) || parentNode.answers[0]?.tempId || null;
    }
    edges.push({ sourceNodeTempId: parentId, sourceAnswerTempId, targetNodeTempId: childId });
  }

  return { nodes, edges };
}

function mergeParsedGraphWithCandidatePoints(parsed, candidatePoints, earlyForks, input) {
  const expected = candidatePoints.length;
  const scaffold = buildGraphScaffoldFromCandidatePoints(candidatePoints, earlyForks);
  const parsedNodes = Array.isArray(parsed?.nodes) ? parsed.nodes : [];
  const byTemp = new Map();
  parsedNodes.forEach((n) => {
    const key = n.tempId || n.id;
    if (key) byTemp.set(String(key), n);
  });

  const mergedNodes = scaffold.nodes.map((sn) => {
    const existing = byTemp.get(sn.tempId);
    if (!existing) return { ...sn };
    const content =
      existing.content && typeof existing.content === 'object'
        ? { ...sn.content, ...existing.content }
        : sn.content;
    const answers =
      Array.isArray(existing.answers) && existing.answers.length >= (sn.answers?.length || 0)
        ? existing.answers
        : sn.answers;
    return {
      ...sn,
      type: existing.type || sn.type,
      label: existing.label || sn.label,
      content,
      answers,
    };
  });

  const edgeKey = (e) =>
    `${e.sourceNodeTempId}|${e.sourceAnswerTempId ?? ''}|${e.targetNodeTempId}`;
  const edgeMap = new Map();
  scaffold.edges.forEach((e) => edgeMap.set(edgeKey(e), e));
  (Array.isArray(parsed?.edges) ? parsed.edges : []).forEach((e) => edgeMap.set(edgeKey(e), e));

  const merged = {
    flowName: parsed?.flowName || input?.name || 'Generated flow',
    description: parsed?.description || '',
    nodes: mergedNodes,
    edges: Array.from(edgeMap.values()),
  };

  return {
    merged,
    note: {
      expected,
      parsedCount: parsedNodes.length,
      mergedCount: mergedNodes.length,
      addedNodes: Math.max(0, mergedNodes.length - parsedNodes.length),
    },
  };
}

async function repairJsonWithAi(badJson, parseError, config, schemaHint = 'a UW agreement triage graph') {
  const tpl = await loadFile2flowPrompt('05-json-repair.md');
  const repairPrompt = fillFile2flowPromptPlaceholders(tpl, {
    SCHEMA_HINT: schemaHint,
    PARSE_ERROR: parseError,
    BAD_JSON: String(badJson || ''),
  });
  return callAi(repairPrompt, config);
}

function repairCommonJsonIssues(text) {
  let fixed = stripJsStyleJsonComments(String(text || '').trim());
  fixed = fixed.replace(/,\s*([}\]])/g, '$1');
  fixed = fixed.replace(/}\s*{/g, '},{');
  fixed = fixed.replace(/]\s*"/g, '],"');
  fixed = fixed.replace(/"\s*\n\s*"/g, '",\n"');
  fixed = fixed.replace(/}\s*\n\s*"/g, '},\n"');
  fixed = fixed.replace(/]\s*\n\s*"/g, '],\n"');
  fixed = fixed.replace(/(true|false|null|\d)\s*\n\s*"/g, '$1,\n"');
  return fixed;
}

/** AI may return `materials` as one object, a string, or null — never assume it is an array. */
function normalizeActionMaterialsForNode(materials) {
  let list = [];
  if (materials == null) list = [];
  else if (Array.isArray(materials)) list = materials;
  else if (typeof materials === 'object') list = [materials];
  else if (typeof materials === 'string' && materials.trim()) list = [{ label: materials.trim() }];
  return list.map((mat, i) => ({
    id: mat && mat.id ? String(mat.id) : id('mat'),
    label: String((mat && (mat.label ?? mat.name)) || `Material ${i + 1}`),
    attachKind: mat && mat.attachKind != null ? mat.attachKind : null,
    attachValue: mat && mat.attachValue != null ? String(mat.attachValue) : '',
  }));
}

/** Outgoing-edge key: at most one edge per (sourceNodeId, sourceAnswerId). */
function edgeOutletKey(sourceNodeId, sourceAnswerId) {
  return `${sourceNodeId}|${sourceAnswerId ?? ''}`;
}

/**
 * Hard structural limits before / after graph build:
 * - exactly one DEFINITION node
 * - at most one outgoing edge per DECISION answer (and per DEFINITION / ACTION outlet)
 */
function enforceGraphStructuralConstraints(nodes, edges) {
  const notes = [];
  let n = Array.isArray(nodes) ? [...nodes] : [];
  let e = Array.isArray(edges) ? [...edges] : [];
  const byId = () => new Map(n.map((x) => [x.id, x]));

  const defs = n.filter((x) => x.type === NodeType.DEFINITION);
  if (defs.length > 1) {
    const keep = defs[0];
    const drop = new Set(defs.slice(1).map((d) => d.id));
    notes.push(`removed_extra_definitions:${drop.size}`);
    n = n.filter((x) => !drop.has(x.id));
    const next = [];
    for (const edge of e) {
      if (drop.has(edge.sourceNodeId) && drop.has(edge.targetNodeId)) continue;
      const copy = { ...edge };
      if (drop.has(copy.sourceNodeId)) copy.sourceNodeId = keep.id;
      if (drop.has(copy.targetNodeId)) continue;
      next.push(copy);
    }
    e = next;
  }

  const nodeMap = byId();
  const seenOutlet = new Set();
  const pruned = [];
  for (const edge of e) {
    if (!nodeMap.get(edge.sourceNodeId) || !nodeMap.get(edge.targetNodeId)) continue;
    const key = edgeOutletKey(edge.sourceNodeId, edge.sourceAnswerId);
    if (seenOutlet.has(key)) {
      notes.push(`dropped_duplicate_outlet:${key}`);
      continue;
    }
    seenOutlet.add(key);
    pruned.push(edge);
  }
  e = pruned;

  return { nodes: n, edges: e, notes, changed: notes.length > 0 };
}

function findActionToDecisionViolations(nodes, edges, definitionId) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const isAction = (t) => t === NodeType.ACTION || t === NodeType.HANDLER;
  const isDecision = (t) => t === NodeType.DECISION;
  const violations = [];
  const seenState = new Set();
  const stack = [{ nodeId: definitionId, seenAction: false }];
  while (stack.length) {
    const { nodeId, seenAction } = stack.pop();
    const stateKey = `${nodeId}|${seenAction ? '1' : '0'}`;
    if (seenState.has(stateKey)) continue;
    seenState.add(stateKey);
    const node = byId.get(nodeId);
    if (!node) continue;
    const nextSeenAction = seenAction || isAction(node.type);
    edges.filter((e) => e.sourceNodeId === nodeId).forEach((edge) => {
      const target = byId.get(edge.targetNodeId);
      if (!target) return;
      if (nextSeenAction && isDecision(target.type)) {
        violations.push({ from: nodeId, to: edge.targetNodeId, edgeKey: edgeOutletKey(edge.sourceNodeId, edge.sourceAnswerId) });
      }
      stack.push({ nodeId: edge.targetNodeId, seenAction: nextSeenAction });
    });
  }
  return violations;
}

function pathTraversalSignature(path, byId) {
  const isAction = (t) => t === NodeType.ACTION || t === NodeType.HANDLER;
  const isDecision = (t) => t === NodeType.DECISION;
  const parts = [];
  for (const step of path) {
    const node = byId.get(step.nodeId);
    if (!node || node.type === NodeType.DEFINITION) continue;
    if (isDecision(node.type)) parts.push(`D:${step.nodeId}:${step.portToNext ?? ''}`);
    else if (isAction(node.type)) parts.push(`A:${step.nodeId}`);
  }
  return parts.join('>');
}

/**
 * Enforces the researcher-portal contract:
 *   every path from DEFINITION must look like DEFINITION → DECISION* → (ACTION|PEOPLE)*
 *
 * Algorithm (pure, no LLM):
 *   0. enforceGraphStructuralConstraints (single DEFINITION, one edge per answer outlet)
 *   1. Walk the graph; if no path violates the constraint, return graph (possibly after step 0 only).
 *   2. Enumerate simple paths from DEFINITION to leaves; dedupe identical traversals.
 *   3. For each unique path, split into decisions + actions, rebuild def → decisions → actions.
 *   4. DECISION nodes shared; ACTION clones deduped per identical action sequence on a path.
 *
 * Returns { graph, changed, violations, pathCount, cloneCount, pathsDeduped, constraintNotes }.
 */
function restructureDecisionsBeforeActions(graph) {
  let nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  let edges = Array.isArray(graph?.edges) ? graph.edges : [];
  const enforced = enforceGraphStructuralConstraints(nodes, edges);
  nodes = enforced.nodes;
  edges = enforced.edges;
  const constraintNotes = enforced.notes;

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const definition = nodes.find((n) => n.type === NodeType.DEFINITION);
  if (!definition) {
    return {
      graph: { ...graph, nodes, edges },
      changed: enforced.changed,
      violations: [],
      pathCount: 0,
      cloneCount: 0,
      pathsDeduped: 0,
      constraintNotes,
    };
  }

  const isAction = (t) => t === NodeType.ACTION || t === NodeType.HANDLER;
  const isDecision = (t) => t === NodeType.DECISION;

  let violations = findActionToDecisionViolations(nodes, edges, definition.id);

  // Drop edges that jump back to a DECISION after an ACTION ancestor (common AI/scaffold artifact).
  if (violations.length > 0) {
    const prunedEdges = edges.filter((e) => {
      const key = edgeOutletKey(e.sourceNodeId, e.sourceAnswerId);
      return !violations.some((v) => v.from === e.sourceNodeId && v.to === e.targetNodeId && v.edgeKey === key);
    });
    if (prunedEdges.length < edges.length) {
      constraintNotes.push(`pruned_action_to_decision_edges:${edges.length - prunedEdges.length}`);
      edges = prunedEdges;
      violations = findActionToDecisionViolations(nodes, edges, definition.id);
    }
  }

  if (violations.length === 0) {
    return {
      graph: { ...graph, nodes, edges },
      changed: enforced.changed || constraintNotes.length > 0,
      violations: [],
      pathCount: 0,
      cloneCount: 0,
      pathsDeduped: 0,
      constraintNotes,
    };
  }

  // ── 2) Enumerate simple paths from definition to every leaf (or to a cycle re-entry).
  const outgoing = new Map();
  edges.forEach((e) => {
    if (!outgoing.has(e.sourceNodeId)) outgoing.set(e.sourceNodeId, []);
    outgoing.get(e.sourceNodeId).push(e);
  });

  const paths = [];
  const dfsStackLimit = 4000; // generous safety limit
  let dfsSteps = 0;
  function dfs(currentId, pathAcc, visitedInPath) {
    if (++dfsSteps > dfsStackLimit) return;
    const outs = outgoing.get(currentId) || [];
    if (outs.length === 0) {
      paths.push([...pathAcc, { nodeId: currentId, portToNext: null }]);
      return;
    }
    if (visitedInPath.has(currentId)) {
      paths.push([...pathAcc, { nodeId: currentId, portToNext: null }]);
      return;
    }
    visitedInPath.add(currentId);
    for (const e of outs) {
      pathAcc.push({ nodeId: currentId, portToNext: e.sourceAnswerId || null });
      dfs(e.targetNodeId, pathAcc, visitedInPath);
      pathAcc.pop();
    }
    visitedInPath.delete(currentId);
  }
  dfs(definition.id, [], new Set());

  const pathsBeforeDedupe = paths.length;
  const sigSeen = new Set();
  const uniquePaths = [];
  for (const path of paths) {
    const sig = pathTraversalSignature(path, byId);
    if (sigSeen.has(sig)) continue;
    sigSeen.add(sig);
    uniquePaths.push(path);
  }
  const pathsDeduped = pathsBeforeDedupe - uniquePaths.length;
  if (pathsDeduped > 0) {
    console.warn(`[file2flow] restructure: dropped ${pathsDeduped} duplicate path(s) before cloning`);
  }

  // ── 3) Rebuild each path: decisions in original order, then actions in original order.
  //      Decisions shared by id; actions cloned per path with deterministic suffix.
  const sharedDecisions = new Map(); // id -> node
  const actionClones = []; // cloned ACTION/PEOPLE node copies
  const finalEdges = [];
  const edgeKeySeen = new Set();

  function pushEdge(sourceId, sourceAnswerId, targetId) {
    const key = `${sourceId}|${sourceAnswerId || ''}|${targetId}`;
    if (edgeKeySeen.has(key)) return;
    edgeKeySeen.add(key);
    finalEdges.push({
      id: id('edge'),
      sourceNodeId: sourceId,
      sourceAnswerId: sourceAnswerId || null,
      targetNodeId: targetId,
      isDeletable: true,
    });
  }

  function deepClone(orig, newId) {
    const c = { ...orig, id: newId };
    if (orig && orig.content && typeof orig.content === 'object') {
      c.content = { ...orig.content };
      if (Array.isArray(orig.content.materials)) {
        c.content.materials = orig.content.materials.map((m) => ({ ...m }));
      }
    }
    if (Array.isArray(orig.answers)) c.answers = orig.answers.map((a) => ({ ...a }));
    return c;
  }

  const actionCloneStepsBySeq = new Map();

  uniquePaths.forEach((path, pathIdx) => {
    const decisions = [];
    const actions = [];
    for (const step of path) {
      const node = byId.get(step.nodeId);
      if (!node) continue;
      if (node.type === NodeType.DEFINITION) continue;
      if (isDecision(node.type)) decisions.push({ nodeId: step.nodeId, portToNext: step.portToNext });
      else if (isAction(node.type)) actions.push({ origNodeId: step.nodeId, portToNext: step.portToNext });
    }

    decisions.forEach((d) => {
      if (!sharedDecisions.has(d.nodeId) && byId.has(d.nodeId)) {
        sharedDecisions.set(d.nodeId, byId.get(d.nodeId));
      }
    });

    const actionSeqKey = actions.map((a) => a.origNodeId).join('|');
    let clonedActionSteps = actionCloneStepsBySeq.get(actionSeqKey);
    if (!clonedActionSteps) {
      clonedActionSteps = actions.map((a, i) => {
        const orig = byId.get(a.origNodeId);
        const cloneId = `${orig.id}__p${actionCloneStepsBySeq.size}_${i}`;
        const clone = deepClone(orig, cloneId);
        actionClones.push(clone);
        return { nodeId: cloneId };
      });
      actionCloneStepsBySeq.set(actionSeqKey, clonedActionSteps);
    }

    const seq = [
      { nodeId: definition.id, type: NodeType.DEFINITION, portToNext: null },
      ...decisions.map((d) => ({ nodeId: d.nodeId, type: NodeType.DECISION, portToNext: d.portToNext })),
      ...clonedActionSteps.map((a) => ({ nodeId: a.nodeId, type: 'ACTION_CLONE', portToNext: null })),
    ];

    for (let i = 0; i < seq.length - 1; i++) {
      const from = seq[i];
      const to = seq[i + 1];
      const sourceAnswerId = from.type === NodeType.DECISION ? from.portToNext : null;
      pushEdge(from.nodeId, sourceAnswerId, to.nodeId);
    }
  });

  // ── 4) Assemble final node list: definition + shared decisions + action clones + orphans.
  const placedIds = new Set([definition.id]);
  sharedDecisions.forEach((_, k) => placedIds.add(k));
  // Mark every ORIGINAL action/people id that participated in any path — these are replaced
  // by clones, so they should NOT survive in the final graph.
  const replacedOrigIds = new Set();
  uniquePaths.forEach((path) => {
    for (const step of path) {
      const n = byId.get(step.nodeId);
      if (n && isAction(n.type)) replacedOrigIds.add(step.nodeId);
    }
  });

  const orphans = nodes.filter(
    (n) => !placedIds.has(n.id) && !replacedOrigIds.has(n.id) && n.type !== NodeType.DEFINITION
  );

  const finalNodes = [
    definition,
    ...Array.from(sharedDecisions.values()),
    ...actionClones,
    ...orphans,
  ];

  return {
    graph: { ...graph, nodes: finalNodes, edges: finalEdges },
    changed: true,
    violations,
    pathCount: uniquePaths.length,
    cloneCount: actionClones.length,
    pathsDeduped,
    constraintNotes,
  };
}

function normalizeAiGraph(raw, input) {
  if (!raw || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) {
    throw new Error('AI response did not include valid nodes[] and edges[].');
  }
  const nodeIdByTemp = new Map();
  const answerIdByTemp = new Map();
  const nodes = raw.nodes.map((n, index) => {
    const nodeId = id('node');
    const nodeRef = n.tempId || n.id || n.nodeId || n.label || `n${index}`;
    [nodeRef, n.id, n.tempId, n.nodeId].filter(Boolean).forEach((key) => nodeIdByTemp.set(key, nodeId));
    const rawType = String(n.type || '').toUpperCase();
    const type = Object.values(NodeType).includes(rawType) ? rawType : NodeType.ACTION;
    const answers = (n.answers || []).map((a, order) => {
      const answerId = id('ans');
      const answerRef = a.tempId || a.id || a.answerId || a.text || `${nodeRef}-a${order}`;
      [answerRef, a.id, a.tempId, a.answerId].filter(Boolean).forEach((key) => answerIdByTemp.set(key, answerId));
      const ratRaw = a.rationale ?? a.basis ?? a.criteria ?? '';
      const rat = String(ratRaw || '').trim();
      const row = { id: answerId, text: String(a.text || `Answer ${order + 1}`), order: Number.isFinite(a.order) ? a.order : order };
      if (rat) row.rationale = rat;
      return row;
    });
    const content = n.content && typeof n.content === 'object' ? { ...n.content } : {};
    if (type === NodeType.ACTION) {
      content.materials = normalizeActionMaterialsForNode(content.materials);
    }
    if (type === NodeType.DECISION && !content.question) {
      content.question = String(n.label || n.content?.title || 'Next step');
    }
    return {
      id: nodeId,
      type,
      label: String(n.label || n.content?.title || n.content?.question || type),
      content,
      posX: type === NodeType.DEFINITION ? 0 : 340 + (index % 3) * 360,
      posY: type === NodeType.DEFINITION ? 0 : Math.floor(index / 3) * 220 + 40,
      isDeletable: type !== NodeType.DEFINITION,
      answers,
    };
  });
  const edges = raw.edges.map((e) => {
    const resolvedSourceId = nodeIdByTemp.get(e.sourceNodeTempId || e.sourceNodeId || e.from || e.source);
    const resolvedTargetId = nodeIdByTemp.get(e.targetNodeTempId || e.targetNodeId || e.to || e.target);
    const sourceNode = nodes.find((n) => n.id === resolvedSourceId);
    return {
      id: id('edge'),
      sourceNodeId: resolvedSourceId,
      sourceAnswerId: (e.sourceAnswerTempId || e.sourceAnswerId || e.answer || e.condition)
        ? answerIdByTemp.get(e.sourceAnswerTempId || e.sourceAnswerId || e.answer || e.condition) || null
        : null,
      targetNodeId: resolvedTargetId,
      isDeletable: sourceNode?.type !== NodeType.DEFINITION,
    };
  }).filter((e) => e.sourceNodeId && e.targetNodeId);
  // ── Backup: don't block flow generation on small structural issues.
  //    If the AI omitted a required node type, synthesize a minimal valid one
  //    rather than throwing — the user can refine it in the builder.
  const synthesized = [];

  let definitionNode = nodes.find((n) => n.type === NodeType.DEFINITION);
  if (!definitionNode) {
    definitionNode = {
      id: id('node'),
      type: NodeType.DEFINITION,
      label: input.name || raw.flowName || inferFlowName(input.name, input.sourceFile, input.sourceText),
      content: {
        description: raw.description || summarizeText(input.sourceText),
        relatedOffices: [],
        templates: [],
        resources: [],
      },
      posX: 0,
      posY: 0,
      isDeletable: false,
      answers: [],
    };
    // Wire to a sensible entry: a non-people node with no incoming edges;
    // prefer DECISION (most flows start with a question), else any candidate.
    const hasIncoming = new Set(edges.map((e) => e.targetNodeId));
    const rootCandidates = nodes.filter((n) => !hasIncoming.has(n.id) && n.type !== NodeType.PEOPLE);
    const entry =
      rootCandidates.find((n) => n.type === NodeType.DECISION) ||
      rootCandidates[0] ||
      nodes.find((n) => n.type !== NodeType.PEOPLE);
    nodes.unshift(definitionNode);
    if (entry) {
      edges.unshift({
        id: id('edge'),
        sourceNodeId: definitionNode.id,
        sourceAnswerId: null,
        targetNodeId: entry.id,
        isDeletable: false,
      });
    }
    console.warn(`[file2flow] AI omitted DEFINITION node — auto-synthesized "${definitionNode.label}".`);
    synthesized.push('DEFINITION');
  }

  if (!nodes.some((n) => n.type === NodeType.ACTION)) {
    const placeholder = {
      id: id('node'),
      type: NodeType.ACTION,
      label: 'Action — to be defined',
      content: {
        title: 'Action — to be defined',
        description: 'Auto-generated placeholder; replace with the real action step.',
        assignee: '',
        materials: [],
      },
      posX: 680,
      posY: 80,
      isDeletable: true,
      answers: [],
    };
    // Prefer wiring to a decision answer that has no outgoing edge ("dead branch").
    const usedAnswerOuts = new Set(
      edges.filter((e) => e.sourceAnswerId).map((e) => `${e.sourceNodeId}|${e.sourceAnswerId}`)
    );
    let wired = false;
    for (const node of nodes) {
      if (node.type !== NodeType.DECISION || !Array.isArray(node.answers)) continue;
      for (const ans of node.answers) {
        if (!usedAnswerOuts.has(`${node.id}|${ans.id}`)) {
          edges.push({
            id: id('edge'),
            sourceNodeId: node.id,
            sourceAnswerId: ans.id,
            targetNodeId: placeholder.id,
            isDeletable: true,
          });
          wired = true;
          break;
        }
      }
      if (wired) break;
    }
    if (!wired) {
      // No dead decision-answer: hang it directly off the definition.
      edges.push({
        id: id('edge'),
        sourceNodeId: definitionNode.id,
        sourceAnswerId: null,
        targetNodeId: placeholder.id,
        isDeletable: false,
      });
    }
    nodes.push(placeholder);
    console.warn('[file2flow] AI omitted ACTION node — auto-synthesized placeholder.');
    synthesized.push('ACTION');
  }

  return {
    flowName: raw.flowName || inferFlowName(input.name, input.sourceFile, input.sourceText),
    description: raw.description || summarizeText(input.sourceText),
    nodes,
    edges,
    synthesized,
  };
}

function validateFlow(flow) {
  const errors = [];
  const warnings = [];
  const nodes = flow.nodes || [];
  const edges = flow.edges || [];
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const definitionNodes = nodes.filter((n) => n.type === NodeType.DEFINITION);
  const decisionNodes = nodes.filter((n) => n.type === NodeType.DECISION);
  const actionNodes = nodes.filter((n) => n.type === NodeType.ACTION);

  if (definitionNodes.length !== 1) errors.push('Exactly one DEFINITION node is required.');
  const definition = definitionNodes[0];
  if (definition) {
    const defOut = edges.filter((e) => e.sourceNodeId === definition.id);
    const defIn = edges.filter((e) => e.targetNodeId === definition.id);
    if (defIn.length) errors.push('DEFINITION node cannot have incoming edges.');
    if (defOut.length !== 1) errors.push('DEFINITION node must have exactly one outgoing edge.');
    if (defOut[0]) {
      const tgtType = nodeById.get(defOut[0].targetNodeId)?.type;
      if (!tgtType) errors.push('DEFINITION outgoing edge must target a valid node.');
      else if (tgtType === NodeType.DEFINITION) errors.push('DEFINITION cannot point to another DEFINITION.');
    }
  }

  for (const node of nodes) {
    const incoming = edges.filter((e) => e.targetNodeId === node.id);
    const outgoing = edges.filter((e) => e.sourceNodeId === node.id);
    if (![NodeType.DEFINITION, NodeType.HANDLER].includes(node.type) && incoming.length === 0 && outgoing.length === 0) {
      warnings.push(`${node.label} has no incoming or outgoing edges (on canvas only).`);
    }
    if ([NodeType.ACTION, NodeType.DECISION].includes(node.type) && incoming.length === 0) {
      warnings.push(`${node.label} has no incoming edge (allowed for partial or parallel paths).`);
    }
    if (node.type === NodeType.ACTION && outgoing.length > 1) {
      errors.push(`${node.label}: ACTION may have at most one outgoing edge (found ${outgoing.length}).`);
    }
    if (node.type === NodeType.ACTION && !node.content?.assignee) {
      warnings.push(`${node.label} has no assignee.`);
    }
    if (node.type === NodeType.DECISION && (node.answers || []).length >= 2 && outgoing.length < 2) {
      warnings.push(`${node.label}: DECISION has multiple answers but fewer than two outgoing edges; check wiring.`);
    }
    if (node.type === NodeType.DECISION) {
      for (const answer of node.answers || []) {
        const outs = edges.filter((e) => e.sourceNodeId === node.id && e.sourceAnswerId === answer.id);
        if (!outs.length) {
          errors.push(`${node.label} has a dead branch: ${answer.text}.`);
        } else if (outs.length > 1) {
          errors.push(`${node.label}: answer "${answer.text}" has ${outs.length} outgoing edges (max 1).`);
        }
      }
      if (/new decision|placeholder/i.test(node.label || node.content?.question || '')) {
        warnings.push(`${node.label} still looks like placeholder text.`);
      }
    }
  }

  if (!actionNodes.length) errors.push('At least one ACTION node is required.');
  if (!isAnyActionReachable(flow)) {
    warnings.push('No ACTION node is reachable from DEFINITION along edges (other ACTION nodes may still be on the canvas).');
  }

  // Node-order validation: traverse all branch paths and enforce DEFINITION→DECISION(s)→ACTION(s)→PEOPLE(s)
  if (definition) {
    const rootEdge = edges.find((e) => e.sourceNodeId === definition.id);
    if (rootEdge) {
      const rootNode = nodeById.get(rootEdge.targetNodeId);
      const orderErrors = [];
      const emitted = new Set();
      function checkOrder(node, seenDecision, seenAction, pathIds, visited) {
        if (!node || visited.has(node.id)) return;
        const nv = new Set(visited);
        nv.add(node.id);
        const path = [...pathIds, node.id];
        const key = (k) => `${node.id}:${k}`;

        if (node.type === NodeType.DECISION && seenAction && !emitted.has(key('daa'))) {
          emitted.add(key('daa'));
          orderErrors.push(`[ERROR] DECISION node "${node.label}" appears after an ACTION node on this branch (path: ${path.map(id => id.slice(-6)).join('→')}). Move this decision before the first ACTION, or restructure as a separate branch.`);
          return;
        }
        if (node.type === NodeType.ACTION && !seenDecision && !emitted.has(key('and'))) {
          emitted.add(key('and'));
          orderErrors.push(`[ERROR] ACTION node "${node.label}" is reached with no DECISION node preceding it on this branch. Add a decision question upstream.`);
        }
        if (node.type === NodeType.HANDLER && !node.content?.hiddenFromResearchers && !seenAction && !emitted.has(key('pba'))) {
          emitted.add(key('pba'));
          orderErrors.push(`[ERROR] HANDLER node "${node.label}" appears before any ACTION node on this branch. Handler nodes must follow at least one ACTION.`);
        }
        const nextSeenDecision = seenDecision || node.type === NodeType.DECISION;
        const nextSeenAction = seenAction || node.type === NodeType.ACTION;
        const outs = edges.filter((e) => e.sourceNodeId === node.id);
        if (!outs.length && !nextSeenAction && ![NodeType.HANDLER, NodeType.DEFINITION].includes(node.type) && !emitted.has(key('bat'))) {
          emitted.add(key('bat'));
          orderErrors.push(`[ERROR] Branch terminates at "${node.label || node.id}" (${node.type}) without reaching any ACTION node.`);
          return;
        }
        for (const edge of outs) {
          checkOrder(nodeById.get(edge.targetNodeId), nextSeenDecision, nextSeenAction, path, nv);
        }
      }
      checkOrder(rootNode, false, false, [], new Set());
      errors.push(...orderErrors);
    }
  }

  return { errors, warnings };
}

function isAnyActionReachable(flow) {
  const nodes = flow.nodes || [];
  const edges = flow.edges || [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const definition = nodes.find((n) => n.type === NodeType.DEFINITION);
  if (!definition) return false;
  const first = edges.find((e) => e.sourceNodeId === definition.id);
  if (!first) return false;
  const seen = new Set();
  const stack = [first.targetNodeId];
  while (stack.length) {
    const nodeId = stack.pop();
    if (seen.has(nodeId)) continue;
    seen.add(nodeId);
    const node = byId.get(nodeId);
    if (node?.type === NodeType.ACTION) return true;
    edges.filter((e) => e.sourceNodeId === nodeId).forEach((e) => stack.push(e.targetNodeId));
  }
  return false;
}

function createSnapshot(flow, scope) {
  const hiddenPeople = new Set(flow.nodes.filter((n) => n.type === NodeType.HANDLER && n.content?.hiddenFromResearchers).map((n) => n.id));
  return {
    id: id('snapshot'),
    flowId: flow.id,
    version: flow.version,
    publishScope: scope,
    snapshotJson: {
      flow: {
        id: flow.id,
        name: flow.name,
        description: flow.description,
        version: flow.version,
      },
      nodes: flow.nodes.filter((n) => !hiddenPeople.has(n.id)),
      edges: flow.edges.filter((e) => !hiddenPeople.has(e.sourceNodeId) && !hiddenPeople.has(e.targetNodeId)),
    },
    publishedAt: now(),
  };
}

const MAX_EXTRACT_DOC_BYTES = 18 * 1024 * 1024;

/** Browser sends legacy .doc as base64; server uses word-extractor (OLE binary not readable in-browser). */
async function parseAssistantResponse(rawAi, config) {
  let jsonText = extractJsonCandidate(rawAi);
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    const repaired = await callAi(
      `Fix this to valid JSON only (no markdown). Output a single JSON object with keys "plan" (string) and "operations" (array).\n\n${jsonText.slice(0, 12000)}`,
      config,
    );
    jsonText = extractJsonCandidate(repaired);
    parsed = JSON.parse(jsonText);
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Assistant returned invalid JSON.');
  const operations = Array.isArray(parsed.operations) ? parsed.operations : [];
  const plan = String(parsed.plan || parsed.summary || '').trim();
  return { plan, operations };
}

async function generateAssistantEdits(body) {
  if (!aiConfig?.apiKey) throw new Error('AI is not configured. Restart the dev server.');

  const sourceText = String(body.sourceText || '').trim();
  if (!sourceText) throw new Error('Please provide text, a file, or instructions.');

  const graph = body.graph || {};
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  if (!nodes.length) throw new Error('Workflow has no nodes to edit.');

  const sourceUrl = body.sourceUrl ? String(body.sourceUrl).trim() : '';
  const flowName = body.flowName ? String(body.flowName).trim() : 'Current flow';
  const combinedInput = [
    sourceUrl ? `Source URL: ${sourceUrl}` : '',
    sourceText,
  ]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 28000);

  const graphJson = JSON.stringify({ nodes, edges }, null, 2).slice(0, 24000);

  const prompt = `You edit an EXISTING UW triage workflow (do NOT rebuild from scratch).

FLOW NAME: ${flowName}

CURRENT WORKFLOW (builder graph JSON — node ids and answer ids must be reused when updating/connecting):
${graphJson}

USER MATERIALS (policy text, instructions, file excerpt):
${combinedInput}

TASK:
1. Read the materials and the current graph.
2. Decide minimal edits: add/update/delete nodes, add/remove connections.
3. Output JSON only with this exact shape:
{
  "plan": "2-6 sentences in English describing what you will change and where in the flow",
  "operations": [
    { "op": "add_node", "tempId": "optional_temp_1", "node": { "type": "decision|action|handler", "title": "...", "x": number, "y": number, "answers": [{"label":"..."}], "description": "...", "assignee": "...", "name": "...", "role": "...", "email": "..." } },
    { "op": "update_node", "nodeId": "existing_id", "fields": { "title": "...", "body": "...", "answers": [{"id":"existing_answer_id","label":"..."}] } },
    { "op": "delete_node", "nodeId": "existing_id" },
    { "op": "connect", "from": "node_id_or_tempId", "fromPort": "answer_id_or_out", "to": "node_id_or_tempId" },
    { "op": "remove_edge", "from": "...", "fromPort": "...", "to": "..." }
  ]
}

RULES:
- Never delete the definition node (type definition).
- Prefer update_node over delete+add when possible.
- For decision nodes, each answer needs a stable id; reuse existing answer ids when updating.
- fromPort on definition nodes is always "out".
- When adding nodes, place x/y to the right of existing content (x increases left-to-right).
- Use tempId on add_node when you need to connect to a new node in a later connect op.
- Keep operations under 20 steps.
- If materials do not justify changes, return "plan" explaining that and "operations": [].`;

  const rawAi = await callAi(prompt, aiConfig);
  return parseAssistantResponse(rawAi, aiConfig);
}

async function handleFlowAssistant(req, res) {
  try {
    const body = await readJson(req);
    const result = await generateAssistantEdits(body);
    return send(res, 200, result);
  } catch (error) {
    console.warn('[assistant]', error?.message || error);
    return send(res, 500, { error: error.message || 'Assistant request failed.' });
  }
}

const MAX_URL_FETCH_BYTES = 2_000_000;
const URL_FETCH_TIMEOUT_MS = 20_000;

function normalizeUrlForFetch(raw) {
  const s = String(raw || '').trim();
  if (!s) throw new Error('URL is required.');
  let parsed;
  try {
    parsed = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    throw new Error('Invalid URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are supported.');
  }
  return parsed.href;
}

/**
 * Strip HTML to plain text. Preserves `<a href>` hyperlinks as Markdown-style
 * `[label](resolved_url)` so the downstream LLM keeps the link information at
 * its original textual position (for smart URL exploration and graph context).
 *
 * @param html     raw HTML string
 * @param baseUrl  page URL — used to resolve relative hrefs (optional)
 */
function htmlToPlainText(html, baseUrl = '') {
  let t = String(html || '');
  t = t.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  t = t.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  t = t.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  t = t.replace(/<!--[\s\S]*?-->/g, ' ');
  // Convert <a href="X">label</a> → [label](resolved_url). Must run BEFORE
  // the generic tag stripper. Skips mailto: / javascript: / fragment-only hrefs
  // (those keep just the label text, no parenthetical).
  t = t.replace(
    /<a\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, inner) => {
      const label = String(inner).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const cleanHref = String(href || '').trim();
      if (!cleanHref || /^(mailto:|javascript:|tel:|#)/i.test(cleanHref)) {
        return label ? ` ${label} ` : ' ';
      }
      let resolved = cleanHref;
      if (baseUrl) {
        try { resolved = new URL(cleanHref, baseUrl).href; } catch { /* keep raw */ }
      }
      if (!label) return ` ${resolved} `;
      if (label === resolved) return ` ${resolved} `;
      return ` [${label}](${resolved}) `;
    }
  );
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<\/(p|div|h[1-6]|li|tr|section|article)>/gi, '\n');
  t = t.replace(/<[^>]+>/g, ' ');
  t = t
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) && code > 0 && code < 65536 ? String.fromCharCode(code) : ' ';
    });
  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ');
  return t.trim();
}

async function fetchUrlAsText(url) {
  const href = normalizeUrlForFetch(url);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), URL_FETCH_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(href, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'UW-Triage-Prototype/1.0 (file2flow)',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
      },
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('URL fetch timed out. Try again or paste text in Description.');
    throw new Error(e?.message || 'Could not fetch URL.');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw new Error(`URL fetch failed (HTTP ${res.status}). Check the link or paste text manually.`);
  }
  const ctype = (res.headers.get('content-type') || '').toLowerCase();
  if (ctype.includes('application/pdf')) {
    throw new Error('This URL points to a PDF. Download the file and upload it under "Upload a document".');
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_URL_FETCH_BYTES) {
    throw new Error('Page is too large to extract (over 2 MB). Paste key sections in Description.');
  }
  const body = buf.toString('utf8');
  let text = '';
  if (ctype.includes('text/html') || /<html[\s>]/i.test(body) || /<body[\s>]/i.test(body)) {
    text = htmlToPlainText(body, href);
  } else {
    text = body.replace(/\r\n/g, '\n').trim();
  }
  if (!text) throw new Error('No readable text found at this URL.');
  return { text: text.slice(0, 120_000), url: href, contentType: ctype || 'unknown' };
}

async function handleExtractUrlText(req, res) {
  try {
    const body = await readJson(req);
    const result = await fetchUrlAsText(body.url);
    return send(res, 200, result);
  } catch (e) {
    console.warn('[extract-url-text]', e?.message || e);
    const msg = e?.message || 'URL extraction failed.';
    const status = /required|invalid|only http/i.test(msg) ? 400 : /too large|pdf/i.test(msg) ? 422 : 500;
    return send(res, status, { error: msg });
  }
}

async function handleExtractDocText(req, res) {
  try {
    const body = await readJson(req);
    const filename = String(body.filename || 'upload.doc').toLowerCase();
    const b64 = body.base64;
    if (!filename.endsWith('.doc')) {
      return send(res, 400, { error: 'This endpoint only accepts legacy .doc files.' });
    }
    if (!b64 || typeof b64 !== 'string') {
      return send(res, 400, { error: 'Missing base64 document body.' });
    }
    const estBytes = Math.floor((b64.length * 3) / 4);
    if (estBytes > MAX_EXTRACT_DOC_BYTES) {
      return send(res, 413, { error: 'Document too large for extraction (max ~18 MB).' });
    }
    let buf;
    try {
      buf = Buffer.from(b64, 'base64');
    } catch {
      return send(res, 400, { error: 'Invalid base64.' });
    }
    if (buf.length > MAX_EXTRACT_DOC_BYTES) {
      return send(res, 413, { error: 'Document too large for extraction.' });
    }
    try {
      const Extractor = WordExtractorCtor.default || WordExtractorCtor;
      const extractor = new Extractor();
      const extracted = await extractor.extract(buf);
      const text = String(extracted.getBody() || '').trim();
      if (!text) {
        return send(res, 422, { error: 'No readable text in this .doc (empty or unsupported).' });
      }
      return send(res, 200, { text });
    } catch (e) {
      console.warn('[extract-doc-text] extract', e?.message || e);
      return send(res, 422, { error: e?.message || 'Failed to read .doc binary.' });
    }
  } catch (e) {
    console.warn('[extract-doc-text]', e?.message || e);
    return send(res, 500, { error: e?.message || 'Extraction failed.' });
  }
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  const db = await readDb();

  if (req.method === 'POST' && url.pathname === '/api/extract-doc-text') {
    return handleExtractDocText(req, res);
  }

  if (req.method === 'POST' && url.pathname === '/api/extract-url-text') {
    return handleExtractUrlText(req, res);
  }

  if (req.method === 'POST' && url.pathname === '/api/assistant') {
    return handleFlowAssistant(req, res);
  }

  if (req.method === 'GET' && url.pathname === '/api/flows') {
    const includeTrash = url.searchParams.get('trash') === '1';
    const flows = (db.flows || []).filter((flow) => includeTrash ? flow.trashedAt : !flow.trashedAt);
    return send(res, 200, { flows });
  }

  if (req.method === 'POST' && url.pathname === '/api/flows') {
    const body = await readJson(req);
    const debugFile2flow = body.debugFile2flow === true;
    if (debugFile2flow) delete body.debugFile2flow;
    // Clients that opt in to streaming get NDJSON events for each pipeline step
    // followed by a final {type:'result'} (or {type:'error'}) event. Without the
    // flag, behaviour is unchanged: one JSON response on completion.
    const wantsStream = url.searchParams.get('stream') === '1';

    if (wantsStream) {
      res.writeHead(201, {
        'content-type': 'application/x-ndjson; charset=utf-8',
        'cache-control': 'no-cache',
        'x-accel-buffering': 'no', // hint nginx/cloud proxies not to buffer
      });
      const writeEvent = (event) => {
        try { res.write(`${JSON.stringify(event)}\n`); } catch { /* socket closed */ }
      };
      writeEvent({ type: 'start', ts: now() });
      try {
        const graph = await generateGraph(body, debugFile2flow, writeEvent);
        const time = now();
        const flow = {
          id: id('flow'),
          name: graph.flowName,
          description: graph.description,
          status: FlowStatus.DRAFT,
          publishScope: null,
          aiStatus: 'AI_READY',
          aiError: null,
          version: 1,
          sourceUrl: body.sourceUrl || null,
          sourceFile: body.sourceFile || null,
          createdById: 'demo-admin',
          nodes: graph.nodes,
          edges: graph.edges,
          createdAt: time,
          updatedAt: time,
        };
        writeEvent({ type: 'step', id: 'validate', status: 'start' });
        const issues = validateFlow(flow);
        writeEvent({ type: 'step', id: 'validate', status: 'done', meta: { errors: issues.errors?.length || 0, warnings: issues.warnings?.length || 0 } });
        db.flows.unshift(flow);
        await writeDb(db);
        const resultEvent = { type: 'result', flow, issues };
        if (debugFile2flow) {
          resultEvent.file2flowDebugPath = 'data/file2flow-debug-last.json';
          resultEvent.file2flowDebugNote =
            'Full prompts, raw LLM strings, extracted JSON candidates, and normalized graph are in that file (written on server disk).';
        }
        writeEvent(resultEvent);
      } catch (error) {
        writeEvent({ type: 'error', message: error?.message || 'Generation failed.' });
      } finally {
        res.end();
      }
      return;
    }

    const graph = await generateGraph(body, debugFile2flow);
    const time = now();
    const flow = {
      id: id('flow'),
      name: graph.flowName,
      description: graph.description,
      status: FlowStatus.DRAFT,
      publishScope: null,
      aiStatus: 'AI_READY',
      aiError: null,
      version: 1,
      sourceUrl: body.sourceUrl || null,
      sourceFile: body.sourceFile || null,
      createdById: 'demo-admin',
      nodes: graph.nodes,
      edges: graph.edges,
      createdAt: time,
      updatedAt: time,
    };
    const issues = validateFlow(flow);
    db.flows.unshift(flow);
    await writeDb(db);
    const payload = { flow, issues };
    if (debugFile2flow) {
      payload.file2flowDebugPath = 'data/file2flow-debug-last.json';
      payload.file2flowDebugNote =
        'Full prompts, raw LLM strings, extracted JSON candidates, and normalized graph are in that file (written on server disk).';
    }
    return send(res, 201, payload);
  }

  const flowMatch = url.pathname.match(/^\/api\/flows\/([^/]+)$/);
  if (req.method === 'GET' && flowMatch) {
    const flow = db.flows.find((f) => f.id === flowMatch[1]);
    if (!flow) return send(res, 404, { error: 'Flow not found.' });
    return send(res, 200, { flow, issues: validateFlow(flow) });
  }

  if (req.method === 'PUT' && flowMatch) {
    const flow = db.flows.find((f) => f.id === flowMatch[1]);
    if (!flow) return send(res, 404, { error: 'Flow not found.' });
    const body = await readJson(req);
    flow.name = body.name ?? flow.name;
    flow.description = body.description ?? flow.description;
    flow.nodes = Array.isArray(body.nodes) ? body.nodes : flow.nodes;
    flow.edges = Array.isArray(body.edges) ? body.edges : flow.edges;
    flow.version += 1;
    flow.updatedAt = now();
    await writeDb(db);
    return send(res, 200, { flow, issues: validateFlow(flow) });
  }

  if (req.method === 'DELETE' && flowMatch) {
    const flowId = flowMatch[1];
    const flow = db.flows.find((f) => f.id === flowId);
    if (!flow) return send(res, 404, { error: 'Flow not found.' });
    flow.trashedAt = now();
    flow.status = FlowStatus.DRAFT;
    flow.publishScope = null;
    flow.updatedAt = now();
    db.publishedSnapshots = db.publishedSnapshots.filter((s) => s.flowId !== flowId);
    await writeDb(db);
    return send(res, 200, { trashed: true, flowId, flow });
  }

  const restoreMatch = url.pathname.match(/^\/api\/flows\/([^/]+)\/restore$/);
  if (req.method === 'POST' && restoreMatch) {
    const flow = db.flows.find((f) => f.id === restoreMatch[1]);
    if (!flow) return send(res, 404, { error: 'Flow not found.' });
    flow.trashedAt = undefined;
    flow.status = FlowStatus.DRAFT;
    flow.updatedAt = now();
    await writeDb(db);
    return send(res, 200, { flow });
  }

  const permanentDeleteMatch = url.pathname.match(/^\/api\/flows\/([^/]+)\/permanent$/);
  if (req.method === 'DELETE' && permanentDeleteMatch) {
    const flowId = permanentDeleteMatch[1];
    db.flows = db.flows.filter((f) => f.id !== flowId);
    db.publishedSnapshots = db.publishedSnapshots.filter((s) => s.flowId !== flowId);
    await writeDb(db);
    return send(res, 200, { deleted: true, flowId });
  }

  const validateMatch = url.pathname.match(/^\/api\/flows\/([^/]+)\/validate$/);
  if (req.method === 'GET' && validateMatch) {
    const flow = db.flows.find((f) => f.id === validateMatch[1]);
    if (!flow) return send(res, 404, { error: 'Flow not found.' });
    return send(res, 200, { issues: validateFlow(flow) });
  }

  const publishMatch = url.pathname.match(/^\/api\/flows\/([^/]+)\/publish$/);
  if (req.method === 'POST' && publishMatch) {
    const flow = db.flows.find((f) => f.id === publishMatch[1]);
    if (!flow) return send(res, 404, { error: 'Flow not found.' });
    const body = await readJson(req);
    const scope = body.publishScope === PublishScope.INTERNAL ? PublishScope.INTERNAL : PublishScope.PUBLIC;
    const issues = validateFlow(flow);
    if (issues.errors.length) return send(res, 400, { error: 'Cannot publish until blocking errors are fixed.', issues });
    flow.status = FlowStatus.PUBLISHED;
    flow.publishScope = scope;
    flow.updatedAt = now();
    const snapshot = createSnapshot(flow, scope);
    db.publishedSnapshots = db.publishedSnapshots.filter((s) => s.flowId !== flow.id);
    db.publishedSnapshots.unshift(snapshot);
    await writeDb(db);
    return send(res, 200, { flow, snapshot });
  }

  const unpublishMatch = url.pathname.match(/^\/api\/flows\/([^/]+)\/unpublish$/);
  if (req.method === 'POST' && unpublishMatch) {
    const flow = db.flows.find((f) => f.id === unpublishMatch[1]);
    if (!flow) return send(res, 404, { error: 'Flow not found.' });
    flow.publishScope = null;
    flow.status = FlowStatus.DRAFT;
    flow.updatedAt = now();
    db.publishedSnapshots = db.publishedSnapshots.filter((s) => s.flowId !== flow.id);
    await writeDb(db);
    return send(res, 200, { flow });
  }

  if (req.method === 'GET' && url.pathname === '/api/knowledge-base') {
    const publicSnapshots = db.publishedSnapshots.filter((s) => s.publishScope === PublishScope.PUBLIC);
    const items = publicSnapshots.map((s) => ({
      id: s.flowId,
      name: s.snapshotJson.flow.name,
      description: s.snapshotJson.flow.description,
      version: s.version,
      publishedAt: s.publishedAt,
    }));
    return send(res, 200, { items });
  }

  const kbMatch = url.pathname.match(/^\/api\/knowledge-base\/([^/]+)$/);
  if (req.method === 'GET' && kbMatch) {
    const snapshot = db.publishedSnapshots.find((s) => s.flowId === kbMatch[1] && s.publishScope === PublishScope.PUBLIC);
    if (!snapshot) return send(res, 404, { error: 'Public flow not found.' });
    return send(res, 200, { snapshot });
  }

  return send(res, 404, { error: 'API route not found.' });
}

async function serveStatic(req, res, url) {
  let filePath = url.pathname;
  if (filePath === '/') filePath = '/admin.html';
  if (filePath === '/admin') filePath = '/admin.html';
  if (filePath === '/researcher') filePath = '/researcher.html';
  const abs = path.normalize(path.join(PUBLIC_DIR, filePath));
  if (!abs.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden');
  try {
    const data = await readFile(abs);
    const ext = path.extname(abs);
    const type = ext === '.html' ? 'text/html; charset=utf-8' : ext === '.css' ? 'text/css; charset=utf-8' : 'application/octet-stream';
    res.writeHead(200, { 'content-type': type });
    res.end(data);
  } catch {
    send(res, 404, 'Not found');
  }
}

async function start() {
  await ensureAiConfigInteractive();

  createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
      return await serveStatic(req, res, url);
    } catch (error) {
      send(res, 500, { error: error.message || 'Server error.' });
    }
  }).listen(PORT, () => {
    console.log(`AI provider: ${aiConfig?.provider || 'not configured'}`);
    console.log(`AI model: ${aiConfig?.model || 'not configured'}`);
    console.log(`UW Triage DOCX prototype running at http://localhost:${PORT}`);
    console.log(`Admin: http://localhost:${PORT}/admin`);
    console.log(`Researcher: http://localhost:${PORT}/researcher`);
  });
}

start().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

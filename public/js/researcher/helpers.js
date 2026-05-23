const { useState, useMemo, useEffect, useRef } = React;

const Hairline = ({ style }) => (
  <div style={{ height: 1, background: "var(--ink-200)", ...style }} />
);

const Mono = ({ children, style }) => (
  <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", ...style }}>{children}</span>
);

const Pill = ({ children, tone = "neutral", style, onClick }) => {
  const tones = {
    neutral: { bg: "var(--ink-200)", fg: "var(--ink-700)", bd: "transparent" },
    accent:  { bg: "var(--purple-100)", fg: "var(--purple-700)", bd: "transparent" },
    success: { bg: "rgba(46,109,72,0.10)", fg: "#2E6D48", bd: "transparent" },
    outline: { bg: "transparent", fg: "var(--ink-900)", bd: "var(--ink-200)" },
    soft:    { bg: "var(--ink-100)", fg: "var(--ink-700)", bd: "transparent" },
  };
  const t = tones[tone];
  return (
    <span onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 9px", borderRadius: 999,
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
      fontSize: 11, fontWeight: 500, letterSpacing: 0.1,
      cursor: onClick ? "pointer" : "default",
      ...style
    }}>{children}</span>
  );
};

const primaryBtn = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "7px 14px", borderRadius: 6,
  background: "var(--purple-700)", color: "white", border: "none",
  fontSize: 12.5, fontWeight: 600, cursor: "pointer", textDecoration: "none",
  fontFamily: "inherit", letterSpacing: "-0.005em",
};
const ghostBtn = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "7px 14px", borderRadius: 6,
  background: "white", color: "var(--ink-900)", border: "1px solid var(--ink-300)",
  fontSize: 12.5, fontWeight: 500, cursor: "pointer",
  fontFamily: "inherit",
};
const linkBtn = {
  background: "none", border: "none", padding: 0,
  color: "var(--purple-700)", fontSize: 12.5, fontWeight: 500,
  cursor: "pointer", fontFamily: "inherit",
  display: "inline-flex", alignItems: "center", gap: 6,
};

const Icon = {
  Search: (p) => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}>
      <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M9.2 9.2L12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Arrow: (p) => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}>
      <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Back: (p) => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}>
      <path d="M11 7H3M6.5 10.5L3 7l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Check: (p) => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" {...p}>
      <path d="M2.5 6.2l2.4 2.3L9.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Mail: (p) => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}>
      <rect x="1.5" y="3" width="11" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M2 4l5 3.5L12 4" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
  Phone: (p) => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}>
      <path d="M3 3.5C3 3 3.4 2.5 3.9 2.5h1.4c.4 0 .8.3.9.7l.5 1.7c.1.4 0 .8-.3 1l-.7.6c.7 1.3 1.7 2.3 3 3l.6-.7c.2-.3.6-.4 1-.3l1.7.5c.4.1.7.5.7.9v1.4c0 .5-.5.9-1 .9C5.4 12.2 1.8 8.6 3 3.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
    </svg>
  ),
  Pin: (p) => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}>
      <path d="M7 12.5c2.2-2.7 4-4.7 4-7a4 4 0 10-8 0c0 2.3 1.8 4.3 4 7z" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="7" cy="5.5" r="1.4" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  Doc: (p) => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}>
      <path d="M3 1.5h5l3 3V12c0 .3-.2.5-.5.5h-7.5c-.3 0-.5-.2-.5-.5V2c0-.3.2-.5.5-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M8 1.5V4.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
  Download: (p) => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}>
      <path d="M7 1.5v8M3.5 6.5L7 10l3.5-3.5M2 12.5h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Refresh: (p) => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" {...p}>
      <path d="M2 7a5 5 0 018.8-3.2M12 7a5 5 0 01-8.8 3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M11 1.5v2.7H8.3M3 12.5V9.8h2.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Chevron: (p) => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" {...p}>
      <path d="M3.5 4.5L6 7l2.5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Edit: (p) => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" {...p}>
      <path d="M8.5 1.8l1.7 1.7L4 9.7l-2.2.5.5-2.2 6.2-6.2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
  Plus: (p) => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" {...p}>
      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Person: (p) => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" {...p}>
      <circle cx="6.5" cy="4" r="2.3" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1.5 11.5c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  Link: (p) => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" {...p}>
      <path d="M5.5 7.5a3.5 3.5 0 005 0l1.5-1.5a3.5 3.5 0 00-5-5L6 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M7.5 5.5a3.5 3.5 0 00-5 0L1 7a3.5 3.5 0 005 5L7 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
};

// Build offices dict from snapshot ACTION nodes (unique assignees from first ACTION per branch).
// Returns { [assignee]: { name } }
function buildOfficesFromSnapshot(nodes, edges) {
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const definition = nodes.find((n) => n.type === "DEFINITION");
  const rootEdge = edges.find((e) => e.sourceNodeId === definition?.id);
  const rootNode = rootEdge ? nodeById[rootEdge.targetNodeId] : null;
  if (!rootNode) return {};
  const offices = {};
  function traverse(node, visited) {
    if (!node || visited.has(node.id)) return;
    const nv = new Set(visited);
    nv.add(node.id);
    if (node.type === "ACTION") {
      const assignee = (node.content?.assignee || "").trim();
      if (assignee && !offices[assignee]) offices[assignee] = { name: assignee };
      return; // only first ACTION per branch
    }
    for (const edge of edges.filter((e) => e.sourceNodeId === node.id)) {
      traverse(nodeById[edge.targetNodeId], nv);
    }
  }
  traverse(rootNode, new Set());
  return offices;
}

// Build innerContacts dict from snapshot PEOPLE nodes.
// Returns { [nodeId]: { name, role, email, visible } }
function buildInnerContacts(nodes) {
  const contacts = {};
  for (const n of nodes) {
    if (n.type !== "PEOPLE") continue;
    contacts[n.id] = {
      name: n.content?.name || n.label || "Contact",
      role: n.content?.role || "",
      email: n.content?.email || "",
      visible: !n.content?.hiddenFromResearchers,
    };
  }
  return contacts;
}

function ContactRow({ icon, label, value, link, borderTop }) {
  const inner = (
    <div style={{
      padding: "14px 18px",
      display: "flex", alignItems: "flex-start", gap: 12,
      borderTop: borderTop ? "1px solid var(--ink-200)" : "none",
    }}>
      <div style={{ color: "var(--ink-500)", marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-500)", letterSpacing: 0.6, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 13, color: link ? "var(--purple-700)" : "var(--ink-900)", marginTop: 2, wordBreak: "break-all" }}>{value}</div>
      </div>
    </div>
  );
  if (link) return <a href={link} style={{ textDecoration: "none" }}>{inner}</a>;
  return inner;
}

function Avatar({ name, size = 38 }) {
  const initials = name.split(" ").slice(0, 2).map((n) => n[0]).join("");
  const fontSize = size <= 32 ? 11 : size <= 44 ? 13 : size <= 56 ? 16 : 20;
  return (
    <div style={{
      width: size, height: size, borderRadius: 6,
      background: "linear-gradient(135deg, var(--purple-500), var(--purple-700))",
      color: "white",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "inherit", fontSize, fontWeight: 600, letterSpacing: "-0.01em",
      flexShrink: 0,
    }}>{initials}</div>
  );
}

// ─────────────────────────────────────────────
// documents.jsx — document type definitions
// ─────────────────────────────────────────────

const DOC_TYPES = [];

const DOC_BY_ID = Object.fromEntries(DOC_TYPES.map((d) => [d.id, d]));
// API_BASE is defined in /js/apiBase.js (loaded before this file)

function snapshotToDoc(snapshot) {
  const graph = snapshot?.snapshotJson || {};
  const flow = graph.flow || {};
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  const definition = nodes.find((n) => n.type === "DEFINITION");
  const definitionContent = definition?.content || {};
  const decisions = nodes.filter((n) => n.type === "DECISION");
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const abbrev = (flow.name || "DOC").split(/\s+/).map((w) => w[0]).join("").slice(0, 4).toUpperCase();

  const officesMap = buildOfficesFromSnapshot(nodes, edges);
  const offices = Object.keys(officesMap);
  const innerContacts = buildInnerContacts(nodes);

  return {
    id: flow.id || snapshot.flowId,
    name: flow.name || "Published Flow",
    abbrev,
    summary: flow.description || definitionContent.description || "",
    definition: definitionContent.description || flow.description || "",
    offices,
    officesMap,
    innerContacts,
    templates: (definitionContent.templates || []).map((template) => ({
      name: template.label,
      format: template.url ? "Link" : "Pending",
      size: template.url || "Attachment pending",
    })),
    flow: {
      questions: decisions.map((node) => ({
        id: node.id,
        title: node.content?.question || node.label,
        options: (node.answers || []).map((answer) => {
          const rat = String(answer.rationale || "").trim();
          return { value: answer.id, label: answer.text, ...(rat ? { sub: rat } : {}) };
        }),
      })),
      compute(answers) {
        const steps = [];
        const definitionEdge = edges.find((edge) => edge.sourceNodeId === definition?.id);
        let current = nodeById[definitionEdge?.targetNodeId];
        const visited = new Set();
        while (current && !visited.has(current.id)) {
          visited.add(current.id);
          if (current.type === "ACTION") {
            steps.push({
              type: "action",
              office: current.content?.assignee || "UW CoMotion",
              action: current.content?.title || current.label,
              description: current.content?.description || "",
              materials: (current.content?.materials || []).map((m) => ({ label: m.label, attachKind: m.attachKind || null, attachValue: m.attachValue || "" })).filter((m) => m.label),
            });
            const nextEdge = edges.find((edge) => edge.sourceNodeId === current.id && (edge.sourceAnswerId == null || edge.sourceAnswerId === ""))
              || edges.find((edge) => edge.sourceNodeId === current.id);
            if (!nextEdge) break;
            current = nodeById[nextEdge.targetNodeId];
            continue;
          }
          if (current.type === "PEOPLE" && !current.content?.hiddenFromResearchers) {
            steps.push({
              type: "contact",
              name: current.content?.name || current.label,
              role: current.content?.role || "",
              email: current.content?.email || "",
            });
            const nextEdge = edges.find((edge) => edge.sourceNodeId === current.id);
            if (!nextEdge) break;
            current = nodeById[nextEdge.targetNodeId];
            continue;
          }
          if (current.type !== "DECISION") break;
          const selected = answers[current.id] || current.answers?.[0]?.id;
          const nextEdge = edges.find((edge) => edge.sourceNodeId === current.id && edge.sourceAnswerId === selected);
          current = nodeById[nextEdge?.targetNodeId];
        }
        return steps;
      },
    },
    _snapshot: snapshot,
  };
}


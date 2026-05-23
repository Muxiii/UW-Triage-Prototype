Return only strict JSON for a UW agreement triage graph with nodes and edges. Use this schema:
{
  "flowName": string,
  "description": string,
  "nodes": [
    {"tempId": string, "type": "DEFINITION|DECISION|ACTION|PEOPLE", "label": string, "content": object, "answers": [{"tempId": string, "text": string, "order": number, "rationale": string}]}
  ],
  "edges": [{"sourceNodeTempId": string, "sourceAnswerTempId": string|null, "targetNodeTempId": string}]
}
Rules:
- **candidatePoints lockstep (mandatory when ## candidatePoints appears below):** Emit **exactly one** `nodes[]` entry per candidate point, in the **same order** as the JSON list. Set each node's **`tempId` to that point's `id`** (e.g. `pt-1`, `pt-2`). **Do not merge, skip, or summarize** multiple points into one node. If a point is `likelyKind` DEFINITION|DECISION|ACTION|PEOPLE|UNKNOWN, map to the graph type (UNKNOWN → best guess ACTION or DECISION).
- **Edges from `predecessorId`:** For every point with non-null `predecessorId` = P, add **one** directed edge **from** node tempId P **to** this node's tempId. Source convention: from DEFINITION or ACTION use `sourceAnswerTempId` null. From a DECISION with multiple children sharing the same predecessor, create **one DECISION answer per distinct child** (each answer text reflects that branch) and set each edge's `sourceAnswerTempId` to the answer that leads to that child. When one DECISION forks to K children in candidatePoints, the DECISION node must have **at least K answers** and **K outgoing edges** (one per answer to the matching child tempId).
- **Exactly one DEFINITION node** in the entire graph (one candidate point with `likelyKind` DEFINITION; its `tempId` becomes that node). Never emit a second DEFINITION.
- DEFINITION content must include description, relatedOffices, templates, and resources
- DEFINITION has exactly one outgoing edge to the next node (DECISION, ACTION, or PEOPLE as appropriate). A flow may have zero DECISION nodes if the process is linear or single-outcome.
- **Every DECISION must be reachable from DEFINITION** by following directed edges (no “floating” decisions that only have outgoing edges into the middle of the flow). Wire each DECISION using `predecessorId` / edges so the spine is DEFINITION → … → DECISION (if any) → ACTION… — never only DECISION → ACTION with no upstream path from DEFINITION.
- If you include DECISION nodes, each DECISION answer must have an outgoing edge
- ACTION nodes may have **0 or 1** outgoing edge only. Use sourceAnswerTempId null on that edge (same convention as from DEFINITION). 0 = terminal outcome for that path; 1 = continue to the next ACTION, DECISION, or PEOPLE. Never attach more than one outgoing edge from the same ACTION.
- DECISION nodes represent branching: use **two or more answers** when the source document has a real fork; a **single-answer** DECISION is allowed only for linear "continue" steps. **Each DECISION answer may have at most one outgoing edge** (never two edges from the same `sourceAnswerTempId`). Allowed flows include ACTION→ACTION, ACTION→DECISION, DECISION→ACTION, and DECISION→DECISION.
- For each DECISION answer, include **"rationale"**: a short sentence (判断依据) citing how the document supports choosing that branch; use empty string "" if none.
- ACTION content must include title, description, assigneeKind, assignee, and materials
- ACTION content.materials must be a JSON array (possibly empty) of objects like {"label":"..."}; never a single object or string at the top level
- materials attachKind must be null and attachValue must be empty
- Include at least one ACTION result.
- DECISION nodes must set content.question (string) for the end-user wizard; keep node.label aligned with that question when possible.
- **Coverage over connectivity:** With **candidatePoints lockstep** above, **`nodes.length` must equal the number of candidate points** in the JSON. **Do not drop nodes** to simplify.
- **If there is no candidatePoints block** below: still connect DECISION nodes into the main chain from DEFINITION (do not leave decisions with only downstream edges into ACTION). ACTION may be linear without DECISION when the source has no branches. With candidatePoints + `predecessorId`, wire every non-root point from its predecessor as above.
- Linear procedures: chain ACTION→ACTION or ACTION→DECISION with at most one edge per ACTION when you do wire them; use multi-answer DECISION only for branches (typically 2+ options). Prefer explicit stages rather than merging unrelated obligations into one node.
- Use double-quoted JSON keys and string values only. **No `//` or `/* */` comments.** Never use ellipsis placeholders such as `// ... (other nodes)` — write **every** node and edge object in full. No trailing commas.

Flow name: {{FLOW_NAME}}
Source URL: {{SOURCE_URL}}
Source file: {{SOURCE_FILE}}
Text:
{{SOURCE_TEXT}}{{PREPROCESS_DOSSIER_SECTION}}

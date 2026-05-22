Fix this malformed JSON for {{SCHEMA_HINT}}.

Return ONLY valid strict JSON. No markdown, no comments, no explanation.
Keep the same schema and intent. Do not add trailing commas.
If the malformed JSON references **candidatePoints** (`pt-1`, `pt-2`, …) or a `## candidatePoints` block, the repaired output must include **one complete node per candidate point** and all edges implied by `predecessorId` — never truncate to a prefix or use `// ...` elision.

Parse error:
{{PARSE_ERROR}}

Malformed JSON:
{{BAD_JSON}}

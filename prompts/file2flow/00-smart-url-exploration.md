<!--
PROMPT: Smart URL exploration (one round only).

Runs at the very start of generateGraph (BEFORE the 01 restatement step).
The pipeline scans the merged source text for http(s) URLs and asks this
prompt to decide which ones are worth fetching for additional context.

Inputs (placeholders filled by server.mjs):
  {{SOURCE_TEXT_PREVIEW}} — first ~8 KB of the merged sourceText so the LLM can
                            see where each URL appears and what surrounding text says.
  {{CANDIDATE_URLS_JSON}} — JSON array of unique URLs already discovered in the text
                            (up to FILE2FLOW_SMART_EXPLORE_MAX_CANDIDATES).

Output: ONE JSON object, no prose. The server caps `follow` at
FILE2FLOW_SMART_EXPLORE_MAX_FOLLOW (default 6).

Notes for the model:
  - We will follow each chosen URL exactly once (no recursive expansion).
  - URLs that look like PDFs, login pages, contact pages, terms / privacy /
    cookie banners, or social-media links should NOT be followed.
  - Prefer URLs that the source text explicitly directs the reader to consult
    (e.g. "see Y", "details at Z", "complete steps from this link").
-->

You are deciding whether to follow URLs that appear in a workflow source document.
Following a URL means fetching its page content and adding it to the source so the
downstream graph builder has more context.

# Source text excerpt (truncated)

```
{{SOURCE_TEXT_PREVIEW}}
```

# Candidate URLs found in the source

```json
{{CANDIDATE_URLS_JSON}}
```

# Decision rules

Mark a URL as **follow** when ANY of these apply:

- The surrounding text explicitly points the reader to that URL for additional
  procedure / sub-steps / forms / definitions (e.g. *"see details at …"*,
  *"steps available here"*, *"refer to …"*).
- The URL appears inline within a procedural step, instruction, or requirement —
  even without explicit "go here" language — suggesting it is part of the workflow.
- The URL hostname or path suggests it hosts official process documentation,
  portals, forms, or policy pages relevant to the workflow domain
  (e.g. a government site, an internal company domain, a known document system).
- The source text references the URL in a context that implies the reader needs
  it to complete a task (e.g. a link labeled with an action verb, a form name,
  or a system/tool name).

Mark as **skip** when:

- The URL is clearly a footer, citation, terms-of-service, privacy policy,
  cookie banner, contact page, login/signup, calendar, map, or pure marketing link.
- The URL points to a PDF, image, video, or downloadable binary file.
- The URL is a social-media or third-party site unrelated to the workflow
  (Twitter / X, LinkedIn, YouTube, Facebook, Instagram, etc.).
- The URL is a duplicate or fragment of one you already chose to follow.
- The source text already fully explains everything the URL would add.

When in doubt, **follow**: incomplete workflow context is more harmful than
fetching a marginally relevant page. We only do one exploration round — prefer
capturing useful content over being conservative.

# Output

Return exactly **one** JSON object with these three fields, and nothing else:

```json
{
  "follow": ["<url1>", "<url2>"],
  "skip":   ["<url3>", "<url4>"],
  "reasoning": "one short paragraph explaining the picks"
}
```

The strings in `follow` and `skip` must be exact, character-for-character copies
of URLs from the candidate list above. Do not invent new URLs. The maximum size
of `follow` is **6** — if more would be useful, pick the 6 highest-value ones.

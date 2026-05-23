# UW Triage DOCX Prototype

This is an isolated working prototype based on `JXYZ_Dev_Guide_v5.docx`.

It does not modify the existing reference demos.

## Run

```bash
npm run dev
```

Open:

- Admin prototype: http://localhost:3100/admin
- Researcher prototype: http://localhost:3100/researcher

## Prototype Scope

- Uses the DOCX graph model: `Flow`, `Node`, `Answer`, `Edge`, `PublishedSnapshot`.
- Uses local JSON persistence in `data/db.json` by default, or **Supabase** when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set (see [docs/SUPABASE.md](docs/SUPABASE.md)).
- Serves copied versions of the existing Builder Admin and Researcher HTML demos as the UI shell.
- Keeps the copied UI layout/menu/canvas/modal structure intact; backend work is wired behind existing controls.
- Generates a DOCX-shaped initial graph from uploaded/pasted text through the existing Create New Flow modal.
- Supports validation, publish scope, public knowledge base, and researcher wizard traversal.
- Has optional Anthropic support if `ANTHROPIC_API_KEY` is set; otherwise falls back to deterministic mock graph generation.

This is intentionally lightweight so it can run without dependency installation.

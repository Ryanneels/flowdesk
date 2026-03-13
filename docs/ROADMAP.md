# FlowDesk — Build roadmap

Single web app: **Email** · **Calendar & Tasks** · **Company OS** · **Projects** — sharing one Supabase DB.

---

## Current state

| Phase | Status | Notes |
|-------|--------|--------|
| **Phase 1 — Foundation** | ✅ | NextAuth + Supabase, Google OAuth, Gmail API, app shell |
| **Phase 2 — Email (Module 1)** | 🟡 Partial | GPS + DRIP labeling (Gemini), Gmail UI; **next:** save to `emails_processed`, Claude/Gemini draft reply, sidebar filters, split view |
| **Phase 3 — Company OS** | 🔲 | Rocks, milestones → auto-tasks, Scorecard, Issues, L10, V/TO |
| **Phase 4 — Projects** | 🔲 | Projects CRUD, Kanban, List, “from OS” tasks |
| **Phase 5 — Calendar & AI scheduling** | 🔲 | Google Calendar, weekly view, AI schedule engine, focus/habits |
| **Phase 6 — My Tasks** | 🔲 | Unified task list across sources |

---

## Shared schema (Supabase)

- **`tasks`** — Universal task record (`source`: `os_rock` \| `project` \| `email` \| `manual`).
- **`emails_processed`** — Gmail messages with GPS/DRIP, `ai_draft`, `summary`, `confidence_score`.
- **`rocks`** / **`rock_milestones`** — Company OS quarterly goals; milestone insert trigger creates a `tasks` row.
- **`projects`** — Project management.
- **`scorecard_metrics`** / **`scorecard_entries`** — Company OS scorecard.

Run: `supabase/migrations/20250611000000_flowdesk_shared_schema.sql` in Supabase SQL Editor.

---

## Tech alignment

| Spec | Current | Action |
|------|---------|--------|
| AI for email | Claude (claude-sonnet-4-20250514) | Using **Gemini** for GPS/DRIP; add **Anthropic** for draft reply + optional reclassification |
| Auth | NextAuth + Supabase adapter | ✅ |
| DB | Supabase (PostgreSQL) | ✅; `user_id` → `next_auth.users(id)` |

---

## Navigation (target)

```
FlowDesk
├── Email
├── Calendar & Tasks
├── Company OS → V/TO, Chart, Rocks, Scorecard, Issues, Meetings, To-Dos
├── Projects → [Project] → Board | List | Timeline
└── My Tasks
```

---

## Next implementation steps

1. **Run shared schema migration** in Supabase (tables above + rock_milestone → task trigger).
2. **`POST /api/email/process`** — Fetch new Gmail, classify (GPS + DRIP), optionally call Claude for draft/summary, upsert into `emails_processed`.
3. **Email inbox UI** — Sidebar filters (GPS), stat cards, default = Action Required, split view (email + AI draft, Send/Edit).
4. **Company OS** — Companies + Rocks CRUD, milestone → task trigger verified, then Scorecard, Issues, L10.
5. **Projects** — CRUD, then Board/List views and task `source` tagging.
6. **Calendar** — Google Calendar API, weekly view, then AI scheduling and focus/habit blocks.
7. **My Tasks** — Single list from `tasks` with filters and source badges.

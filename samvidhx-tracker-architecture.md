# SamvidhX Contribution Tracker — Architecture

**Version:** 0.2 (spec — Claude Code CLI build target)
**Owner:** SamvidhX Systems LLP
**Purpose:** Track partner effort across a Project → Milestone → Epic → Task hierarchy, score each task on time/complexity/impact (agile-style), roll scores up to per-partner quarterly totals, and output a *suggested* residual-profit-share % as evidence for the annual LLP review.

> The tracker produces **evidence, not a verdict**. The suggested % feeds the partner review conversation; the final ratio is decided by consensus and filed via MCA Form 3.

---

## 1. Scope & non-goals

**In scope**
- Hierarchy: Project ▸ Milestone ▸ Epic ▸ Task, with bi-directional roll-up of contribution points.
- Uniform E×C×I scoring on every task (streams are reporting labels only, not separate scoring rules).
- Task attribution to one **or more** partners, with an explicit contribution-weight split.
- Per-partner totals at task, epic, milestone, project, and portfolio level.
- Suggested effort-share calculator for a selectable review period.
- Persistent, partner-shared storage (survives sessions).
- Dark SamvidhX-themed single-file app.

**Out of scope (handled outside the tracker)**
- Capital accounting and **interest on capital** — credited before profit split, not scored here.
- Fixed partner remuneration/salary.
- Legal filing (Form 3) — the tracker only exports a summary for the meeting.
- Pump calibration data and other trade-secret R&D content (never stored here).

---

## 2. Domain model

Six entities. Tasks carry the score; everything above is a roll-up.

```
Partner
Project ──< Milestone ──< Epic ──< Task
                                    └─ scored, shared across contributors
Config (singleton)
```

### 2.1 Partner

| Field | Type | Notes |
|---|---|---|
| `id` | string | `p_` + uid |
| `name` | string | Display name |
| `role` | string | e.g. "R&D", "BD", "Ops" — label only |
| `active` | bool | Inactive partners excluded from share calc |
| `capitalContributed` | number \| null | Reference only; **not** scored |
| `color` | string | Hex, for charts/avatars |
| `createdAt` | ISO string | |

### 2.2 Project

| Field | Type | Notes |
|---|---|---|
| `id` | string | `prj_` + uid |
| `name` | string | e.g. "PanelCrystal", "CatchPLC" |
| `description` | string | |
| `status` | enum | `active` \| `paused` \| `done` |
| `startDate` | ISO string | |
| `targetProfit` | number \| null | Optional, ₹ |
| `createdAt` | ISO string | |
| *derived* `points` | number | Σ of child milestone points |
| *derived* `pointsByPartner` | map | `{partnerId: points}` |

### 2.3 Milestone

A shippable version or release of the project. Display label is free-text so the term can evolve without a schema change — use `"Milestone 1"`, `"Milestone 2"` consistently, or switch to `"v1.0"`, `"Pilot Batch"`, `"C&I Release"` as the product matures. The entity is always called a **Milestone** in the system.

| Field | Type | Notes |
|---|---|---|
| `id` | string | `mls_` + uid |
| `projectId` | string | FK ▸ Project |
| `label` | string | Free-text display name: "Milestone 1", "v1.0", "Pilot Batch", etc. |
| `description` | string | What this milestone delivers / acceptance criteria |
| `targetDate` | ISO string \| null | Planned ship date |
| `status` | enum | `planned` \| `in_progress` \| `shipped` \| `cancelled` |
| `createdAt` | ISO string | |
| *derived* `points` | number | Σ of child epic points |
| *derived* `pointsByPartner` | map | `{partnerId: points}` |

### 2.4 Epic

| Field | Type | Notes |
|---|---|---|
| `id` | string | `epc_` + uid |
| `milestoneId` | string | FK ▸ Milestone |
| `name` | string | e.g. "Camera-based contamination mapping" |
| `description` | string | |
| `primaryStream` | enum | Reporting label, default for child tasks: `execution` \| `bizdev` \| `ip` \| `ops` |
| `status` | enum | `backlog` \| `in_progress` \| `done` \| `blocked` |
| `createdAt` | ISO string | |
| *derived* `points` | number | Σ of completed child task scores |
| *derived* `pointsByPartner` | map | `{partnerId: points}` |

### 2.5 Task (the scored unit)

| Field | Type | Notes |
|---|---|---|
| `id` | string | `tsk_` + uid |
| `epicId` | string | FK ▸ Epic |
| `title` | string | |
| `description` | string | |
| `stream` | enum | Reporting label only: `execution` \| `bizdev` \| `ip` \| `ops` (defaults from epic) |
| `contributors` | array | `[{ partnerId, weight }]` — weights sum to 1.0. Solo task = single entry at 1.0 (see §3.1) |
| `status` | enum | `backlog` \| `in_progress` \| `done` \| `blocked` |
| `deadline` | ISO string \| null | Optional target date — drives sorting and due-soon highlighting (§6, §9); never affects score |
| `effortPoints` | number | Fibonacci 1,2,3,5,8,13 — size/time of the task |
| `complexityBand` | number | 1 / 1.5 / 2 — skill scarcity of the task |
| `impactTier` | number | 1 / 2 / 3 — business impact of the task |
| *derived* `score` | number | `E × C × I` (see §3) — the task's total value, before the contributor split |
| `estimatedAt` | ISO string | When E/C/I were set (ideally before assignment) |
| `completedAt` | ISO string \| null | Determines which review period the score counts in |
| `createdAt` | ISO string | |

### 2.6 Config (singleton)

Holds the tunable scoring scales so the model can change without code edits.

```jsonc
{
  "fibonacci": [1, 2, 3, 5, 8, 13],
  "complexityBands": { "routine": 1, "skilled": 1.5, "specialized": 2 },
  "impactTiers": { "low": 1, "medium": 2, "critical": 3 },
  "impactCap": 3,
  "countOnlyCompleted": true,    // only `done` tasks feed the share calc
  "currentPeriod": { "label": "Q1 FY26", "start": "2026-04-01", "end": "2026-06-30" }
}
```

---

## 3. Scoring engine

One formula for every task, regardless of stream. `scoreTask(task, config) -> number`:

```
score = effortPoints × complexityBand × min(impactTier, impactCap)
```

- **Effort (E)** = Fibonacci — bundles time + uncertainty (size of the task).
- **Complexity (C)** = skill scarcity (routine ×1 · skilled ×1.5 · specialized ×2).
- **Impact (I)** = business movement (low ×1 · medium ×2 · critical ×3, capped at ×3).

Multiplicative so high-skill/high-impact work dominates; capped so it can't explode. BD and IP work scores on the same scale — a closed deal or a filed patent is usually low effort but high impact (e.g. `E=2 × C=2 × I=3 = 12`), so its value shows up through the impact tier rather than a separate rule.

**Rule:** if `countOnlyCompleted` is true, only `status === 'done'` tasks contribute to the share calc; in-progress tasks are shown separately as "pipeline".

### 3.1 Collaborative tasks (multiple contributors)

A task's E×C×I is a **fixed pie** — its value to the business doesn't change with how many people worked on it. When two (or more) partners do a task together, you split that fixed pie; you never give each partner the full score (that double-counts and inflates the portfolio total, breaking the share math).

Each task carries a `contributors` array:

```jsonc
"contributors": [
  { "partnerId": "p_aarav",  "weight": 0.6 },
  { "partnerId": "p_neha",   "weight": 0.4 }
]
// weights must sum to 1.0
```

A partner's credit for the task = `score × weight`. A solo task is just `[{ partnerId, weight: 1.0 }]`, which the UI sets by default so the common case needs no extra input.

**Setting the weight fairly**
- Agree it at completion as a quick consensus (like a one-line retro), not a negotiation. Default the UI to an **equal split** across contributors, then let them nudge it.
- Complexity and impact stay properties of the *task*, not the person — the weight is the only per-partner lever. So if one partner carried the specialized part and the other did support, that shows up as e.g. 70/30, not as two different complexity bands.
- If the work was genuinely separable (one partner built X, the other built Y), prefer **two tasks** instead of one split task — cleaner attribution and a better audit trail. Reserve the split for work that was truly joint.

**Alternative (only if you need more rigor):** give each contributor their own `effortPoints` while sharing C and I, so `partnerCredit = E_partner × C × I`. This makes the task's total = sum of contributor efforts rather than a fixed pie. More precise, more bookkeeping — not recommended unless weight disputes become frequent.

---

## 4. Roll-up & suggested-share computation

Recompute in memory on load and after every mutation (storage is source of truth).

```
taskScore             = scoreTask(task)                    // the fixed pie
epic.points           = Σ taskScore for completed tasks in epic
milestone.points      = Σ epic.points for epics in milestone
project.points        = Σ milestone.points for milestones in project
partnerTotal[p]       = Σ ( taskScore × weight[p] ) over completed tasks
                        where p ∈ task.contributors
                        AND completedAt ∈ currentPeriod
portfolioTotal        = Σ partnerTotal[p] for active partners

suggestedShare[p]     = partnerTotal[p] / portfolioTotal × 100
```

Because every task's contributor weights sum to 1.0, `Σ partnerTotal` equals `Σ taskScore` — no double-counting, the suggested shares always total 100%.

Display `suggestedShare[p]` next to the **current** ratio with a highlighted delta. State explicitly that this is the **residual** profit share (after interest on capital + fixed remuneration), so no one reads it as the whole pie.

---

## 5. Storage schema

Uses the artifact key-value storage API (`window.storage`). **No `localStorage`.** Data is partner-shared so all partners see one dataset → `shared = true` on every key (note in-app: visible to everyone the artifact is shared with; treat as internal).

| Key | Scope | Value |
|---|---|---|
| `config` | shared | Config singleton (§2.6) |
| `partners` | shared | `Partner[]` (one small array) |
| `projects` | shared | `Project[]` (metadata only, no derived fields) |
| `milestones` | shared | `Milestone[]` (each carries `projectId`) |
| `epics` | shared | `Epic[]` (each carries `milestoneId`) |
| `tasks:{epicId}` | shared | `Task[]` for that epic — partitioned to localise writes and stay under the 5 MB/key limit |
| `meta` | shared | `{ schemaVersion, lastUpdated }` |

**Read pattern:** load `config`, `partners`, `projects`, `milestones`, `epics`; then `storage.list('tasks:')` and fetch each epic's task array (or lazy-load tasks per epic on drill-in).
**Write pattern:** mutate the smallest key possible (a single `tasks:{epicId}` array), not the whole dataset. Re-read that key immediately before writing to reduce last-write-wins collisions between partners.

---

## 6. Views / screens

Dark SamvidhX theme — chip-frame motif, blue primary (`#2BA8E0`-ish), orange spark accent (`#F5871F`-ish), near-black surfaces. Wire interactivity via `addEventListener` inside `DOMContentLoaded` (inline `onclick`/`oninput` are blocked in the sandboxed iframe — use React `onClick` props only if built as a React artifact).

1. **Dashboard** — period selector; per-partner points (bar); suggested share vs current ratio with delta; active-project summary; pipeline (in-progress) points; **on-time delivery panel** — for each active partner, the % of their period-completed tasks (that carried a deadline) delivered on time, with each such task listed as on-time ✓ or delayed ⚑ (see §9 for definitions).
2. **Projects** — card/list of projects with rolled-up points and status; create/edit.
3. **Project detail** — its milestones (list with status, target date, rolled-up points); each milestone card shows a **progress bar** (% of its tasks done) and a red **⚑ n** count when any of its tasks missed a deadline; project-level per-partner breakdown.
4. **Milestone detail** — its epics (list or kanban by status); the milestone header shows its **progress bar**, and each epic card shows a mini progress bar plus a red **⚑ n** missed-deadline count; milestone-level per-partner breakdown; label + target date editable inline.
5. **Epic detail** — its tasks; add/edit task; epic roll-up; the epic header shows its **progress bar**, and any task that missed its deadline carries a red **⚑** flag on its row. Each task row also has a **Copy** action: opens the task editor pre-filled with the source task's title (suffixed "(copy)"), description, stream, E/C/I, and contributors; saving creates a **new** task in the same epic with a fresh `id`/`createdAt`, status `backlog`, `completedAt` null, and `deadline` cleared.
6. **Task editor (modal)** — E/C/I inputs (sliders or selects); a `stream` label dropdown; status; an optional **deadline** date input; and a **contributors** row where you add one or more partners with weight sliders that auto-normalise to 100%. Live-shows the resulting `score` and each partner's split. When opened **without an epic context** (i.e. from Partner detail), it additionally shows cascading **Project → Milestone → Epic** dropdowns to place the task; every task must still land in an epic.
7. **Partners** — manage partners, colors, capital reference. Each partner card is clickable and navigates to Partner detail (7a).

7a. **Partner detail** (route `/partners/:partnerId`, `PartnerDetail.jsx`) — all tasks where the partner is a contributor, across all projects, each row showing project ▸ milestone ▸ epic breadcrumb, status, deadline, and the partner's credit (`score × weight`). Sorted by `deadline` ascending; tasks without a deadline sort last. Tasks due within the next **10 days** (`DUE_SOON_DAYS`) get a soft pulsing glow using `--accent-orng`; overdue tasks pulse red; `done` tasks never pulse. An **Add Task** button opens the task editor with this partner pre-filled as sole contributor (weight 1.0) and the cascading Project → Milestone → Epic picker enabled. Each row also has an **Edit** action opening the task editor pre-filled with that task; the task stays in its epic (no placement picker), and edits flow through the normal roll-up recompute. If an edit removes this partner from the contributors, the task simply drops off the list.
8. **Settings** — edit Config: complexity bands, impact tiers, impact cap, `countOnlyCompleted`, period dates.
9. **Review** — suggested-share calculator for the period + **Export summary** (copy-to-clipboard block for the partner meeting / Form 3 prep).

---

## 7. Computation flow

```
Task saved
  → recompute task.score
  → recompute parent Epic roll-up (points, pointsByPartner)
  → recompute parent Milestone roll-up
  → recompute parent Project roll-up
  → recompute portfolio partnerTotals + suggestedShare
  → re-render affected views
```

Derived fields are never persisted — always recomputed from stored tasks to avoid stale roll-ups.

---

## 8. Tech stack

Built with Claude Code CLI. Deployed to Cloudflare Pages. No artifact sandbox constraints apply here.

| Layer | Choice | Reason |
|---|---|---|
| **Frontend framework** | React 18 + Vite | Fast scaffold, HMR in dev, clean CF Pages build output |
| **Styling** | Tailwind CSS | Already used on samvidhx.com — consistent tokens, dark theme easy |
| **Routing** | React Router v6 (hash mode) | Simple, no server-side routing needed, works on Pages |
| **Charts** | Recharts | Composable, Tailwind-friendly, no canvas quirks |
| **Backend** | Cloudflare Pages Functions | Zero extra service — co-located with the frontend in the same repo |
| **Database** | Cloudflare KV | See §11 — maps 1:1 to the §5 schema |
| **Auth** | Cloudflare Access (Zero Trust) | Free ≤50 users, gates the subdomain without any auth code in the app |
| **Local dev** | Wrangler CLI | Simulates KV and Pages Functions locally via `wrangler pages dev` |
| **Package manager** | npm | Standard, no friction |

**Design tokens (SamvidhX dark theme)**

```css
--bg-base:     #0A0F1E;   /* near-black navy */
--bg-surface:  #111827;   /* card surface */
--bg-border:   #1F2937;   /* subtle border */
--accent-blue: #1564F9;   /* primary actions */
--sky-blue:    #60A5FA;   /* secondary / highlights */
--accent-orng: #F5871F;   /* spark accent */
--text-pri:    #F9FAFB;
--text-sec:    #9CA3AF;
```

**Currency:** ₹ — display everywhere points translate to business value.
**Effort scale:** Fibonacci (1, 2, 3, 5, 8, 13) — baked into the scoring UI as discrete selects, not free-text.

---

## 9. Edge cases & integrity

- **Cascade delete:** deleting a Project confirms, then removes its Milestones, their Epics, and their `tasks:{epicId}` keys. Deleting a Milestone removes its Epics and tasks. Deleting an Epic removes its `tasks:{epicId}` key.
- **Reassignment / re-weighting:** changing a task's contributors or weights recomputes partner totals. The editor blocks save unless weights sum to 1.0.
- **Inactive contributor:** if a partner on a task is later marked inactive, their weighted credit stays attributed to the period it was earned in, but they're excluded from future `portfolioTotal`.
- **Period attribution:** a task counts toward the period containing its `completedAt`.
- **Estimate-before-assign:** prompt to set E/C/I at creation (planning-poker style) to reduce self-rating bias.
- **Concurrency:** last-write-wins; partition by epic; re-read before write.
- **Audit:** keep `createdAt` / `estimatedAt` / `completedAt` on every task — the trail is what keeps the annual review calm.
- **Deadlines:** `deadline` is optional and display/sort-only — it never enters scoring, roll-ups, or period attribution. **Due-soon** = deadline within the next 10 calendar days (`DUE_SOON_DAYS = 10`) and status ≠ `done`. **Overdue** = deadline in the past and status ≠ `done`. Both are computed at render time, never persisted.
- **Missed deadline (red flag ⚑):** a task misses its deadline when it is overdue (open with deadline past), **or** when it is `done` with `completedAt` after `deadline` ("completed late"). Comparison is at date granularity — completing on the deadline day is on time. A `done` task with no `completedAt` is excluded (can't be judged). Epic/milestone cards surface a red `⚑ n` count of missed-deadline tasks beneath them.
- **Progress %:** epic progress = `done tasks ÷ total tasks × 100` in that epic (count-based, not points — "planned tasks completed"); milestone progress = same ratio across all tasks of its epics. Rendered as a bar; computed at render time from tasks, never persisted; entities with zero tasks show no bar.
- **On-time delivery (Dashboard):** per active partner, over tasks completed in the current period that carry a deadline: `onTime = completedAt ≤ deadline`, `delayed = completedAt > deadline`, `onTime% = onTime ÷ (onTime + delayed) × 100`. Tasks without deadlines are excluded from the %. A multi-contributor task counts for every contributor (this is a delivery metric, not a points split — weights are irrelevant here).
- **Task copy:** copying a task (§6.5) duplicates `title` (+" (copy)"), `description`, `stream`, `effortPoints`, `complexityBand`, `impactTier`, and `contributors`; it generates a fresh `id`, sets `createdAt`/`estimatedAt` to now, resets status to `backlog`, and clears `completedAt` and `deadline`. The copy is a new task in the same epic — it earns points independently once completed.

---

## 10. Build roadmap (Claude Code CLI)

**How to use this with Claude Code:** Open the repo in Claude Code CLI. Paste this architecture doc into the conversation or reference it as a project file. Claude Code will scaffold, implement, and iterate based on these specs. Give one phase at a time.

| Phase | Claude Code prompt focus | Delivers |
|---|---|---|
| **0 — Scaffold** | "Scaffold a React + Vite + Tailwind project for Cloudflare Pages. Add React Router v6 hash mode. Add wrangler.toml for KV binding named TRACKER_KV. Create the folder structure from §12." | Runnable shell, `npm run dev` works |
| **1 — Data + storage** | "Implement the domain model from §2 and the storage module from §11.5. Implement scoreTask() from §3. Write the Pages Function from §11.3 Step 2." | Data layer complete, testable via curl |
| **2 — CRUD views** | "Build views: Projects, ProjectDetail, MilestoneDetail, EpicDetail, TaskModal. Use design tokens from §8. Hook all creates/edits to the storage module." | All entities can be created and browsed |
| **3 — Scoring + roll-ups** | "Implement the roll-up computation from §4. Show derived points on every entity view. Add the contributors weight UI on TaskModal." | Points flow from Task → Epic → Milestone → Project |
| **4 — Dashboard + Review** | "Build Dashboard (partner bar chart, suggested share vs current ratio, pipeline). Build Review view with export summary." | Core business value visible |
| **5 — Polish + deploy** | "Settings view, config editor, cascade delete, empty states, mobile layout. Then deploy to Cloudflare Pages with KV binding and Access policy." | Production on tracker.samvidhx.com |

---

### Appendix — default scoring quick reference

- **Effort (E):** 1, 2, 3, 5, 8, 13
- **Complexity (C):** routine ×1 · skilled ×1.5 · specialized ×2
- **Impact (I):** low ×1 · medium ×2 · critical ×3 (cap ×3)
- **Task score:** `E × C × I` (same for every stream)
- **Partner credit on a task:** `score × contributorWeight` (weights sum to 1.0)
- **Suggested share:** `partnerTotal ÷ portfolioTotal × 100` (always totals 100%)

---

## 11. Database & free Cloudflare deployment

### 11.1 Database choice — Cloudflare KV

The storage schema designed in §5 is already a key-value schema (`config`, `partners`, `milestones`, `tasks:{epicId}`, etc.). **Cloudflare KV maps to it 1:1** — no translation layer, no ORM, no SQL schema to design. It is the right database for this app at this scale.

| | Cloudflare KV | Cloudflare D1 (SQLite) |
|---|---|---|
| **Model** | Key → JSON blob | Relational tables + SQL |
| **Fit to architecture** | Exact match to §5 schema | Requires schema redesign |
| **Free tier reads** | 100,000/day | 5 million rows/day |
| **Free tier writes** | 1,000/day | 100,000 rows/day |
| **Free storage** | 1 GB | 5 GB |
| **For 4 partners** | ~100 ops/day — well within limits | Also fine but overkill |
| **Setup effort** | ~1 hour | ~1 day (schema + migrations) |

**Use KV.** Switch to D1 only if you later need cross-entity SQL queries (e.g. "all tasks by partner across all projects in a date range") without loading everything into memory first.

### 11.2 Full free stack on Cloudflare

Everything you need is already available in Cloudflare's free tier. No credit card required. No new accounts — you already have a Cloudflare account from the Pages deployment at samvidhx.com.

```
tracker.samvidhx.com  (new Cloudflare Pages project)
├── index.html / app.jsx         ← static frontend
└── functions/
    └── api/
        └── storage.js           ← Pages Function (~50 lines)
                                    reads/writes Cloudflare KV

Cloudflare KV namespace: samvidhx-tracker-db
Cloudflare Access (Zero Trust): gates the subdomain to partner emails only
```

**Free tier limits and actual headroom for 4 partners:**

| Service | Free allowance | Your expected usage |
|---|---|---|
| Pages hosting | Unlimited | Static file ~50 KB |
| Pages builds | 500/month | ~10–20 deploys |
| Workers (Pages Functions) | 100,000 req/day | ~200–500 req/day |
| KV reads | 100,000/day | ~200–500/day |
| KV writes | 1,000/day | ~50–100/day |
| KV storage | 1 GB | < 1 MB |
| Cloudflare Access | Free ≤ 50 users | 4 partners |

You will not hit any limit in a month. You will not hit any limit in a year at 4 partners.

### 11.3 What it takes to deploy

**Step 1 — Create a KV namespace (5 min)**
Cloudflare dashboard → Workers & Pages → KV → Create namespace → name it `samvidhx-tracker-db`.

**Step 2 — Write the Pages Function (~50 lines, 1–2 hrs)**
Create `functions/api/storage.js` in the repo. It exposes four operations:

```
GET  /api/storage?key=partners          → { value }
POST /api/storage  { key, value }       → { ok }
DELETE /api/storage?key=partners        → { ok }
GET  /api/storage/list?prefix=tasks:    → { keys[] }
```

The Function reads/writes using `env.TRACKER_KV`. Every `window.storage` call in the app becomes a `fetch('/api/storage?...')` call. That is the **only change** to app logic — scoring, roll-ups, and UI are untouched.

**Step 3 — Bind KV to the Pages project (5 min)**
Pages → Settings → Functions → KV namespace bindings → add `TRACKER_KV` → `samvidhx-tracker-db`.

**Step 4 — Auth via Cloudflare Access (30 min)**
Zero Trust → Access → Applications → add `tracker.samvidhx.com` → policy: allow only the four partner email addresses. Partners log in via one-time email code. No passwords, no auth code in the app.

**Step 5 — Deploy**
`git push` to the repo. Pages builds and deploys automatically, same as the main site.

### 11.4 Subdomain

Deploy as a separate Pages project at `tracker.samvidhx.com` — keeps tracker and marketing site codebases independent. In Cloudflare DNS add a CNAME `tracker` → new Pages project hostname. Same DNS panel you already use.

### 11.5 Storage abstraction (clean two-environment swap)

Wrap all storage calls in one module so switching from the Claude artifact sandbox to production KV is a one-line change:

```js
// lib/storage.js
// In artifact:    use window.storage directly
// In production:  set BASE = '' and calls hit /api/storage (KV-backed)

export const db = {
  get:    (key)        => fetch(`/api/storage?key=${key}`).then(r => r.json()),
  set:    (key, value) => fetch(`/api/storage`, { method: 'POST',
                            body: JSON.stringify({ key, value }),
                            headers: { 'Content-Type': 'application/json' }}),
  delete: (key)        => fetch(`/api/storage?key=${key}`, { method: 'DELETE' }),
  list:   (prefix)     => fetch(`/api/storage/list?prefix=${encodeURIComponent(prefix)}`).then(r => r.json()),
};
```

Build first in the Claude artifact, validate all UI and logic with `window.storage`, then drop in this module and deploy. Zero changes to scoring, roll-up, or UI code.

---

## 12. Project structure

```
samvidhx-tracker/
├── CLAUDE.md                        ← instructions for Claude Code (see §13)
├── package.json
├── vite.config.js
├── tailwind.config.js
├── wrangler.toml                    ← KV binding + Pages config
├── .dev.vars                        ← local secrets (gitignored)
├── .gitignore
│
├── public/
│   └── favicon.ico
│
├── src/
│   ├── main.jsx                     ← React root, router setup
│   ├── App.jsx                      ← layout shell + route definitions
│   │
│   ├── lib/
│   │   ├── storage.js               ← KV abstraction (§11.5) — only file that knows about fetch
│   │   ├── scoring.js               ← scoreTask(task, config), rollUp(tasks, epics, ...)
│   │   ├── deadlines.js             ← daysUntil, deadlineState, isMissedDeadline, progressOf — pure date/progress helpers (§9)
│   │   ├── uid.js                   ← generateId(prefix) → "prj_xxxx"
│   │   └── constants.js             ← FIBONACCI, COMPLEXITY_BANDS, IMPACT_TIERS, STREAMS, DUE_SOON_DAYS (=10)
│   │
│   ├── hooks/
│   │   ├── useAppData.js            ← loads all entities from storage on mount, exposes mutators
│   │   └── usePeriodFilter.js       ← filters tasks to currentPeriod
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Badge.jsx            ← status chips (backlog / in_progress / done / blocked)
│   │   │   ├── Card.jsx
│   │   │   ├── ProgressBar.jsx      ← done/total % bar (blue, green at 100%)
│   │   │   └── PartnerAvatar.jsx    ← coloured initials circle
│   │   └── charts/
│   │       ├── PartnerBar.jsx       ← horizontal bar per partner (recharts)
│   │       └── ShareDelta.jsx       ← suggested % vs current % with delta highlight
│   │
│   ├── views/
│   │   ├── Dashboard.jsx            ← screen 1
│   │   ├── Projects.jsx             ← screen 2
│   │   ├── ProjectDetail.jsx        ← screen 3
│   │   ├── MilestoneDetail.jsx      ← screen 4
│   │   ├── EpicDetail.jsx           ← screen 5
│   │   ├── TaskModal.jsx            ← screen 6 (modal, not a route)
│   │   ├── Partners.jsx             ← screen 7
│   │   ├── PartnerDetail.jsx        ← screen 7a — per-partner task list (deadline sort, due-soon pulse, add task)
│   │   ├── Settings.jsx             ← screen 8
│   │   └── Review.jsx               ← screen 9
│   │
│   └── styles/
│       └── globals.css              ← Tailwind base + CSS custom properties (design tokens)
│
└── functions/
    └── api/
        └── storage.js               ← Cloudflare Pages Function: GET/POST/DELETE/list for KV
```

**Key files explained**

`lib/storage.js` is the only file that knows about `fetch('/api/storage')`. Every other file imports `db.get / db.set / db.delete / db.list` from here. Swapping the backend (e.g. switching from KV to D1) means editing one file.

`lib/scoring.js` exports two pure functions — `scoreTask(task, config)` and `rollUp(allTasks, allEpics, allMilestones, config)` — that return a computed state object. No side effects, easy to unit test.

`hooks/useAppData.js` is the single source of truth for in-memory state during a session. It loads all entities from storage on mount, exposes typed mutators (`addTask`, `updateTask`, `deleteEpic`, etc.), and triggers a full roll-up recompute after every mutation.

`wrangler.toml` example:
```toml
name = "samvidhx-tracker"
compatibility_date = "2024-01-01"
pages_build_output_dir = "dist"

[[kv_namespaces]]
binding = "TRACKER_KV"
id = "PASTE_KV_NAMESPACE_ID_HERE"
preview_id = "PASTE_KV_PREVIEW_ID_HERE"
```

`.dev.vars` (local only, gitignored):
```
# No secrets needed — KV is handled by wrangler's local simulation
```

---

## 13. CLAUDE.md (paste this into the project root)

```markdown
# SamvidhX Contribution Tracker — Claude Code Instructions

## What this app is
Internal tool for SamvidhX Systems LLP partners to track effort contributions
and generate a suggested profit-share ratio for annual review.
Full architecture spec: see `ARCHITECTURE.md` in this repo.

## Hierarchy
Project → Milestone → Epic → Task
Tasks are the only scored unit. Everything above is a roll-up.

## Scoring (uniform, no exceptions)
score = effortPoints × complexityBand × impactTier
- effortPoints: Fibonacci only — 1, 2, 3, 5, 8, 13
- complexityBand: 1 (routine) | 1.5 (skilled) | 2 (specialized)
- impactTier: 1 (low) | 2 (medium) | 3 (critical) — cap at 3
- All streams (execution, bizdev, ip, ops) use the SAME formula.

## Multi-contributor tasks
contributors: [{ partnerId, weight }] — weights MUST sum to 1.0
Partner credit = score × weight. Never give each partner the full score.
UI defaults to equal split; lets user nudge weights; blocks save if weights ≠ 1.0.

## Storage rules
- NEVER use localStorage or sessionStorage.
- ONLY use db.get / db.set / db.delete / db.list from src/lib/storage.js.
- Derived fields (score, roll-up points) are NEVER persisted — always recomputed.
- Re-read a key immediately before writing to it.

## Design system
Dark SamvidhX theme. Use CSS custom properties from src/styles/globals.css:
--bg-base, --bg-surface, --bg-border, --accent-blue, --sky-blue, --accent-orng
Do not hardcode hex values in components — always use the CSS variable.

## Project structure
See §12 of ARCHITECTURE.md for the full file tree and explanation of each file.

## What NOT to do
- Do not add a fourth scoring mode or any alternative to E×C×I.
- Do not skip the Milestone level — every Epic must have a milestoneId.
- Do not store capital contributions as scored points.
- Do not change the profit share ratio in the app — it only suggests; partners decide.
- Do not add user authentication code — auth is handled by Cloudflare Access externally.
```

# Build Task — SamvidhX Contribution Tracker

Read ARCHITECTURE.md and CLAUDE.md before writing any code.

Build the full application in the phases below. 
After each phase: run the dev server, confirm no errors, then commit with a message like "phase-1: data layer complete".

---

## Phase 0 — Scaffold

- React 18 + Vite + Tailwind CSS + React Router v6 (hash mode) + Recharts
- Create the exact folder structure from §12 of ARCHITECTURE.md
- Create src/styles/globals.css with all design tokens from §8
- Create wrangler.toml with:
    name = "samvidhx-tracker"
    compatibility_date = "2024-01-01"
    pages_build_output_dir = "dist"
    [[kv_namespaces]]
    binding = "TRACKER_KV"
    id = "PLACEHOLDER_PROD_ID"
    preview_id = "PLACEHOLDER_PREVIEW_ID"
- Run npm install
- Confirm npm run dev starts on localhost:5173 with a blank dark page

---

## Phase 1 — Data layer

- src/lib/uid.js — generateId(prefix) → "prj_xxxx"
- src/lib/constants.js — FIBONACCI, COMPLEXITY_BANDS, IMPACT_TIERS, STREAMS
- src/lib/scoring.js — scoreTask(task, config) and rollUp(...) as pure functions per §3 and §4
- src/lib/storage.js — db module (get, set, delete, list) using fetch('/api/storage')
- functions/api/storage.js — Cloudflare Pages Function handling GET/POST/DELETE/list for env.TRACKER_KV
- src/hooks/useAppData.js — loads all entities on mount, exposes typed mutators for all entities, recomputes rollUp after every mutation

---

## Phase 2 — CRUD views

Build these views using design tokens only (no hardcoded hex):
- Projects.jsx — list, status badge, create/edit
- ProjectDetail.jsx — milestone cards
- MilestoneDetail.jsx — epic kanban by status
- EpicDetail.jsx — task list with score visible
- TaskModal.jsx — create/edit task with E/C/I selectors (Fibonacci only), 
  stream label, status, contributors section with weight sliders 
  that auto-normalise to 1.0 and block save if not equal to 1.0,
  live score preview showing E × C × I as values change
- Partners.jsx — list, add/edit partner with color picker

Wire all forms to useAppData mutators.
Add React Router hash routes for all views.

---

## Phase 3 — Dashboard and Review

Dashboard.jsx:
- Period selector (from config)
- Per-partner horizontal bar chart (Recharts)
- Suggested share % vs current ratio with delta (green/red)
- Active projects summary
- Pipeline section (in-progress tasks, separate from share calc)

Review.jsx:
- Period selector
- Table: partner | points | suggested % | current % | delta
- Note: "Residual share only. Requires partner consensus and MCA Form 3 filing."
- Export button: copies plain-text summary to clipboard

---

## Phase 4 — Settings and polish

- Settings.jsx — editable config: complexity bands, impact tiers, impact cap, 
  countOnlyCompleted toggle, current period dates. Saves to db.set('config')
- Empty states on every list view
- Cascade delete with confirmation dialog per §9 of ARCHITECTURE.md
- Loading spinners during storage calls
- Mobile layout check and fixes

---

When all phases are done, run `npm run build` and confirm dist/ folder is generated cleanly with no errors.

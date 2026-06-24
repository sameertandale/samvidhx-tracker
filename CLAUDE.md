# SamvidhX Contribution Tracker — Claude Code Instructions

## What this app is
Internal tool for SamvidhX Systems LLP partners to track effort contributions
and generate a suggested profit-share ratio for annual review.
Full architecture spec: see ARCHITECTURE.md in this repo.

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
UI defaults to equal split. Blocks save if weights ≠ 1.0.

## Storage rules
- NEVER use localStorage or sessionStorage.
- ONLY use db.get / db.set / db.delete / db.list from src/lib/storage.js.
- Derived fields (score, roll-up points) are NEVER persisted — always recomputed.
- Re-read a key immediately before writing to it.

## Design tokens — always use these CSS variables, never hardcode hex
--bg-base:     #0A0F1E
--bg-surface:  #111827
--bg-border:   #1F2937
--accent-blue: #1564F9
--sky-blue:    #60A5FA
--accent-orng: #F5871F
--text-pri:    #F9FAFB
--text-sec:    #9CA3AF

## What NOT to do
- Do not add any scoring mode other than E×C×I.
- Do not skip the Milestone level — every Epic must have a milestoneId.
- Do not store capital contributions as scored points.
- Do not add auth code — auth is handled externally by Cloudflare Access.
- Do not use localStorage anywhere.

# Contributing to Klara

Quick reference for how we work on this repo. Keep it tight, follow the
patterns, and PRs ship clean.

## Commits — Conventional Commits

```
<type>(<scope>): <short imperative description>

<optional body explaining the why — the code already shows the what>
```

The optional scope captures **which phase** the change belongs to, so the
git history and PR list double as a portfolio narrative:

| Scope      | When                                                                               |
| ---------- | ---------------------------------------------------------------------------------- |
| `phase-N`  | Anything that ships as part of an implementation-plan phase (`feat(phase-4): ...`) |
| (no scope) | One-off fixes or chores between phases (`fix: ...`, `chore: ...`)                  |

| Type       | When                                         |
| ---------- | -------------------------------------------- |
| `feat`     | New user-visible feature                     |
| `fix`      | Bug fix                                      |
| `refactor` | Code change without altering behaviour       |
| `chore`    | Tooling, deps, config, scripts               |
| `docs`     | Documentation only                           |
| `test`     | Tests only                                   |
| `style`    | Formatting (Prettier, whitespace) — no logic |
| `perf`     | Performance improvement                      |
| `ci`       | CI / GitHub Actions changes                  |

Rules:

- Subject ≤ 72 characters, imperative mood (`add`, not `added`).
- No trailing period in the subject.
- Body is optional; when present, focus on **why**, not what.

Good:

```
feat(phase-5): add daily goals and macro rings
fix: prevent meal delete from removing the favorite
refactor: extract macros calc into a pure helper
chore: bump prisma to 6.20.0
```

Bad: `WIP`, `update files`, `bug fix`, `arreglo`.

## Branches

Name: `<type>/<scope-or-slug>` — lowercase with dashes. Phase-scoped
branches mirror the commits.

| Example                     | Type          |
| --------------------------- | ------------- |
| `feat/phase-4-meal-logging` | phase feature |
| `fix/dropdown-overflow`     | bug fix       |
| `chore/upgrade-next`        | maintenance   |

Branches are deleted automatically on merge (configured at the repo
level). No need to delete by hand.

## Pull Requests

Title: same Conventional-Commit shape as the commit.

### Labels and milestones

Before opening a PR (or right after, before merge), set the metadata.
This is what makes the PR list double as a portfolio: anyone landing
on `/pulls` or `/milestones` can read the progress at a glance.

**Labels** — pick exactly one type label per PR:

| Label     | When                                                              |
| --------- | ----------------------------------------------------------------- |
| `feature` | New user-visible functionality                                    |
| `polish`  | UX/UI refinement of something that already ships                  |
| `fix`     | Bug fix                                                           |
| `chore`   | Tooling, deps, internal cleanup                                   |
| `docs`    | Documentation only                                                |

**Milestone** — the phase this PR ships under (`Phase 4`, `Phase 5`, …).
Sub-phase PRs (`Phase 3.5`, `Phase 2.1`, …) attach to the parent phase
milestone, with the sub-phase reflected in the PR title and commit
scope. Close the milestone right after the last PR for that phase
merges.

CLI shortcuts:

```
gh pr edit <num> --add-label feature --milestone "Phase 6"
gh api repos/:owner/:repo/milestones -X POST -f title="Phase 7"
```

Body — four short sections:

```markdown
## What

1–3 lines describing what the PR resolves.

## Changes

- Main change bullet
- Another bullet
- ... (5–8 max)

## Test plan

- [ ] CI green
- [ ] Manual steps to verify

## Notes (optional)

Trade-offs, follow-ups, deferred work.
```

Rules:

- No long prose paragraphs in the body.
- Screenshots only for visual changes.
- If you need more than 8 change bullets, the PR is probably too big —
  split it.

## Merge strategy

- **Squash and merge** only — main stays linear.
- All status checks must pass (lint, typecheck, tests, build).
- One PR = one logical change. Bundles get noisy.

## Local hygiene

```
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # Vitest
npm run format      # Prettier write
```

Run those before opening a PR. CI runs the same checks; failing locally
saves a round trip.

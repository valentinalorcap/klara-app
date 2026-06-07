# Klara

> A personal nutrition coach for the people who don't want to weigh every nacho — built with Next.js + Postgres + Claude.

Log a meal in one tap, get an honest take from your AI coach, see the
month at a glance — and when something falls outside your repertoire,
just describe it in prose and Klara estimates the macros. Vegetarian
by design, but works for anyone.

**Live demo:** https://klara-app.vercel.app

<!-- TODO: add screenshots in docs/screenshots/ and link them here -->
<!--
<p align="center">
  <img src="docs/screenshots/today.png" width="240" alt="Today tab — macro rings and Klara's take" />
  <img src="docs/screenshots/history.png" width="240" alt="History tab — month calendar with per-day rings" />
  <img src="docs/screenshots/chat.png" width="240" alt="Chat tab — streaming conversation with Klara" />
</p>
-->

## What's inside

- **Log meals fast.** Pick from your own products + recipes, paste a
  prose description, or batch a whole social-event session in one go.
- **See where you stand.** A hero kcal ring + three macro rings on
  Today, a colour-coded month grid + week-by-week line on History.
  Days that hit the target glow in the macro's colour; over-target
  days flip to red. Tap a day to see the breakdown and edit
  retroactively.
- **Get an honest take, not noise.** After every meal, Klara writes a
  one-paragraph evaluation in your chosen tone (direct / motivational
  / neutral). It anchors on the day-vs-targets status, never the meal
  in isolation, so it doesn't tell an over-on-protein user to "add
  more protein".
- **Talk to her.** The Chat tab is a streaming conversation that
  rebuilds full context every turn: your profile, your daily goals,
  today's totals + meals, and a rolling seven-day summary. Ask "how
  am I doing on protein?" and the answer references your actual
  numbers.
- **AI does the boring work.**
  - Scan a label with your camera → Claude Sonnet reads the macros.
  - Type "1 avocado, half a cup of oats" → Haiku estimates grams + macros.
  - Type a whole meal in prose → Sonnet parses it into structured entries.
  - Star a meal once → it becomes a one-tap favourite.

## Tech stack

| Layer     | What we use                                                                     |
| --------- | ------------------------------------------------------------------------------- |
| Framework | Next.js 16 (App Router, RSC, Server Actions, `after()`, streaming routes)       |
| Language  | TypeScript                                                                      |
| Styling   | Tailwind CSS 4 + custom CSS-variable design system (dark + violet + glass)      |
| Animation | Framer Motion (swipe-to-delete, sheet handle, drag interactions)                |
| Database  | PostgreSQL on Neon                                                              |
| ORM       | Prisma 6 — single `schema.prisma` source of truth                               |
| Auth      | Auth.js v5 with Google OAuth (split config for Edge vs Node)                    |
| AI        | Anthropic Claude — Sonnet 4.6 for vision + complex; Haiku 4.5 for fast          |
| Testing   | Vitest (~100 unit + snapshot tests) + Playwright (happy-path E2E)               |
| Deploy    | Vercel (preview per PR + production on `main`)                                  |
| Tooling   | ESLint, Prettier, GitHub Actions CI, Conventional Commits + labels + milestones |

## AI architecture (the bit I'm proud of)

Klara has six LLM features, and they all share the same shape:

- A **stable system prefix** marked `cache_control: ephemeral` so
  Anthropic's prompt cache stays warm across calls.
- A **dynamic block** with today's numbers / latest exchange, never
  cached.
- A **tool-use schema** with Zod validation on the response, so
  Claude's structured output is parsed safely or rejected.

Two models, picked per task:

- **Sonnet 4.6** for vision (label scanning), complex parsing (free-text
  meal estimation), and chat — anything that benefits from instruction
  following and reliability.
- **Haiku 4.5** for the per-meal evaluations — high frequency, low
  latency, low cost.

The chat endpoint streams Server-Sent Events from a Next.js Route
Handler, piping Anthropic's `messages.stream()` deltas straight to the
client. The eval endpoint uses Next.js's `after()` so the user sees the
meal saved + "Klara is thinking…" skeleton immediately, while the
Anthropic call resolves out of the request lifecycle.

## Getting started

```bash
git clone https://github.com/valentinalorcap/klara-app.git
cd klara-app
nvm use            # uses Node 22 from .nvmrc
npm install
cp .env.example .env
# fill in DATABASE_URL, DIRECT_URL, AUTH_SECRET, AUTH_GOOGLE_*, ANTHROPIC_API_KEY
npx prisma migrate dev
npm run dev
```

App runs on http://localhost:3000.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for project structure,
testing strategy, and the PR / commit conventions.

## Project structure

```
src/
├── app/                Next.js App Router
│   ├── (app)/          Authenticated app — Today, History, Library, Chat, Settings
│   ├── api/chat/       Streaming chat endpoint
│   ├── login/          Public login screen
│   └── layout.tsx      Global shell + PWA / iOS metadata
├── components/         Reusable React components (cards, rings, forms, chat client)
├── lib/                Pure helpers + server-only modules
│   ├── *.ts            Pure utilities — tested with Vitest
│   ├── *.server.ts     Server-only modules (Prisma, Anthropic calls)
│   └── *.test.ts       Unit tests
├── auth.ts             Auth.js (full, Node runtime)
├── auth.config.ts      Auth.js (Edge-safe, used by middleware)
└── proxy.ts            Next.js middleware

prisma/
├── schema.prisma       Single source of truth for the DB
└── migrations/         One folder per migration

e2e/                    Playwright specs
```

## Testing

```bash
npm test               # Vitest, once
npm run test:watch     # Vitest, watch mode
npm run test:e2e       # Playwright — needs the dev server running
```

What we test:

- Pure helpers (macro math, goal helpers, prompt builders, history aggregations) — Vitest
- Anthropic prompt structure — snapshot tests per tone, assertions on the dynamic block
- Happy-path browser flows — Playwright

What we don't:

- The Anthropic SDK itself. The client is mocked and the prompt / parser layer is tested in isolation.
- Visual regressions. Polish is done by hand against the design tokens.

## Roadmap

Shipped (11 phases, all in `git log` with `feat(phase-N): ...` commits and
matching milestones):

0. Foundation + deploy to Vercel
1. Product library (with the design-system follow-up in 1.5)
2. Camera-scan nutrition labels with Sonnet vision (plus 2.1: pick from photo library)
3. Recipes with smart ingredient picker (plus 3.5: mobile polish)
4. Meal logging with favourites + star/unstar
5. Daily goals + macro rings on Today
6. Per-meal AI evaluations with tone selector
7. Multi-meal batch logging
8. Free-text meal estimation
9. Conversational chat with day context
10. History calendar with weekly trend and retroactive editing
11. PWA + final polish (this one)

Backlog (small, kept in a private `discovery/backlog.md`): edit
favourites from Library, Klara's auto-maintained user memory, design
system 2.0 with extracted primitives + ADRs, tooltip on the weekly
chart, and a handful of UX micro-tweaks.

## Credits

Built by [Valentina Lorca](https://github.com/valentinalorcap).
Designed and built in public — the commit history doubles as a story.

# LaunchLoop

**Turn ideas into finished projects.**

LaunchLoop is a small collaborative SaaS for people building side projects. You describe a project, break it into milestones (by hand or with an AI-generated roadmap you review first), track progress with a ring that closes as you finish, share it with the community, and talk it through in a per-project discussion.

It is built on the [DeepSpace SDK](https://docs.deep.space): React 19 + Vite + Tailwind v4 on the front, a Hono worker with Durable Objects on the back, deployed to `<your-app>.app.space`.

> **Status.** Deployed at https://launchloop-tanisha.app.space. Most of the code was written by an AI agent that could not sign in to DeepSpace, so read [TESTING.md](./TESTING.md) for exactly what was and was not verified.

## What it does

| Area | What you can do |
|---|---|
| Authentication | Sign in with GitHub or Google (DeepSpace auth). Signed-in pages are gated; sign out from the account menu. |
| Projects | Create, edit, delete your own projects: title, description, category, goal, public or private. |
| Milestones | Add, edit, reorder, delete, tick off. Progress ring and bar update live. |
| AI roadmap | Describe the project, get a summary, 3 to 5 milestones with priority and estimate, and a starting point. Edit and approve before anything is saved. |
| Community | Search public projects, filter by category, sort, see owners and progress. |
| Discussion | Per-project realtime chat for public projects (DeepSpace messaging). |

## Quick start

You do **not** need a local machine. The intended path is GitHub Codespaces:

1. Follow **[CODESPACES_SETUP.md](./CODESPACES_SETUP.md)** (repo, upload, open Codespace, install, login, register).
2. Run it: `npx deepspace dev start`
3. Deploy it: see **[DEPLOYMENT.md](./DEPLOYMENT.md)** (`npx deepspace deploy`).

The commands, once you are in a terminal inside the project:

```bash
bash scripts/codespaces-setup.sh   # Node/npm check + npm install
npx deepspace auth login           # one-time, browser OAuth
npx deepspace app init             # registers the app, writes its id into wrangler.toml
npm run validate                   # type-check + unit tests
npx deepspace dev start            # http://localhost:5173
npx deepspace deploy               # ships to <name>.app.space
```

## Project layout

```
worker.ts                  Hono worker + Durable Object classes (entry point)
wrangler.toml              App name, bindings, app id (filled in by `app init`)
src/
  pages/                   File-based routes (generouted)
    index.tsx                /            static, prerendered landing
    (app)/sign-in.tsx        /sign-in     public
    (app)/(protected)/       dashboard, community, projects/[id]  (sign-in required)
  components/              UI: brand/, projects/, auth/, ui/ (primitives)
  schemas/ + schemas.ts    Collections and permission rules (shared by worker + browser)
  actions/                 Server actions: AI roadmap, delete, visibility
  lib/                     Pure logic: milestones, projects, limits, time, api helper
  server/, ai/, cron.ts    Scaffold routes (auth proxy, WebSocket, agent tools)
tests/                     Playwright specs (run with `npx deepspace test run`)
scripts/codespaces-setup.sh
```

## Documentation

| File | Read it for |
|---|---|
| [CODESPACES_SETUP.md](./CODESPACES_SETUP.md) | Getting from ZIP to a running Codespace |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Registering, deploying, billing, rollback, troubleshooting |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | How everything works |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Which DeepSpace features are used, where, and how they were verified |
| [TESTING.md](./TESTING.md) | What was tested, what was not, and your manual checklist |

## Licence and credentials

No credentials are included or required in this repository. See `.env.example`.

# Testing

This file separates **what was actually executed and passed**, **what was not executed**, **what needs your account**, and **known limitations**. Nothing here is claimed that was not run.

**The most important fact:** the author (an AI agent in a sandbox) could not sign in to DeepSpace. So real authentication, real record sync, real realtime chat, and real AI calls have **never been run**. Everything below tests the code *around* those services, with fakes standing in for them. Do the manual checklist at the end on your own account before you submit.

## 1. Executed and passed

Re-run any of these yourself: `npm run validate` (type-check + unit tests) works before registration; the build needs `npx deepspace app init` first.

| Check | Command | Result |
|---|---|---|
| TypeScript, app + worker | `npx tsc --noEmit` | Pass |
| TypeScript, Playwright specs (`tests/*.ts`) | temporary tsconfig including `tests/` | Pass (type-check only; see section 2) |
| ESLint incl. Rules of Hooks (this also gates `deepspace deploy`) | `npx eslint .` | Pass |
| Unit tests | `npm run test:unit` | **75 passed, 9 files** |
| Production build (client + worker + landing prerender) | `npx vite build` | Pass, in a scratch copy with a locally-minted test app id (the shipped `wrangler.toml` keeps the `__APP_ID__` placeholder) |
| The ZIP itself, extracted into a clean directory | `npm ci`, `tsc`, `eslint`, `vitest`, `vite build` | `npm ci` installs 544 packages from the lockfile; tsc, eslint and all 75 tests pass **before** `app init`; `vite build` refuses with the documented "no valid DEEPSPACE_APP_ID" message (expected until you run `app init`) |
| `scripts/codespaces-setup.sh` in a clean extract on Node 22.23 with npm 10.9 (the situation of a fresh Codespace) | `bash scripts/codespaces-setup.sh` | Detected the old npm, upgraded to 11.21, installed dependencies, printed "Setup complete". Not run inside an actual Codespace |
| Secrets scan (API keys, tokens, private keys, JWTs) | grep over the repo excluding `node_modules` | None found; no `.dev.vars`, `.env`, `.deepspace`, `.git` in the ZIP |

### What the 75 unit tests cover

| File | Tests | What it proves |
|---|---|---|
| `src/schemas.test.ts` | 14 | Using the **SDK's own** `canRead/canUpdate/canDelete/canCreate` against our schemas: owner vs other member vs signed-out vs admin for projects; message author rules; `ai_usage` is untouchable by members; every free-text column has a `maxLength`; SDK schema linter reports **zero** warnings |
| `src/actions/project-actions.test.ts` | 17 | Ownership gate (owner passes; non-owner and missing project get the same message; bad ids rejected before any DB call; storage failure is not treated as "not owner"); delete cascades messages in pages of 100; failure midway keeps the project; visibility change clears the discussion only when going private; the `generateRoadmap` action: quota consumed, invalid input spends nothing, hourly limit enforced per user, fails closed if the counter can't be read or written, invalid model output and a throwing model are contained without leaking internals |
| `src/actions/roadmap-generator.test.ts` | 14 | Input validation; JSON extraction (plain, fenced, surrounded by prose); schema validation (truncate long text, trim to 5, reject <3 or bad priority, strip unknown keys); the one-shot repair path; give-up path; provider 402/429/other mapped to safe messages (no raw provider text) |
| `src/lib/milestones.test.ts` | 13 | Defensive parsing of stored JSON (garbage, clamping, duplicate ids, cap); progress; next-up; add/edit/move/delete/toggle are immutable and bounded |
| `src/lib/projects.test.ts` | 6 | Normalising unknown values; search over title/description/goal/owner; category filter; sorting |
| `src/actions/rate-limit.test.ts` | 5 | Window start, count up, refuse with retry time, reset after window, corrupt/future rows |
| `src/lib/time.test.ts` | 3 | Relative times, epoch seconds/ms, invalid input |
| `prerender.test.ts`, `src/prerender-entry.test.tsx` | 3 | Scaffold's prerender checks, passing against the new landing page |

The action tests use an in-memory fake of the record tools; the AI tests use the AI SDK's mock model. Neither is the real service.

### Browser checks (done in the sandbox)

| Check | Result | Caveat |
|---|---|---|
| Landing page from the real production build, desktop and mobile | Rendered correctly, no console errors | The static server I used was not the DeepSpace worker, so websocket errors on other routes were expected and ignored |
| Real SDK sign-in overlay (`/sign-in`) | Rendered with LaunchLoop's theme and logo | OAuth itself not exercised |
| **16 scripted UI tests** | **16/16 passed**, no console errors | Run against a **harness**: the real page components with the `deepspace` client package replaced by an in-memory mock I wrote. The mock itself enforces owner-only writes, so **this run proves nothing about DeepSpace's permissions**; it proves the UI logic. The harness is not in the ZIP |
| Covered by those 16 | Community search/category/owner search/empty/clear; own private project hidden from community; milestone toggle/add/edit/reorder/delete/"loop closed"; roadmap generate, review, deselect, edit title, append vs replace, discard, rate-limit error, too-short input; discussion send via Enter, Shift+Enter, delete own, empty state; non-owner read-only view, other users' private and missing projects show "not found"; make private/public; delete project; create (validation, private, create-and-plan) and edit; no horizontal overflow at 390px on five screens | |
| axe-core accessibility audit | **0 violations** on 8 screens (landing, dashboard, community, project, discussion, roadmap form, roadmap review, new-project modal), WCAG 2 A/AA + best practice rules | Automated tools catch only a subset. No manual screen-reader or keyboard-only pass was done. App screens were audited in the harness |

Two real defects were found by this process and fixed before shipping: milestone checkboxes only updated after the server round-trip (now optimistic with rollback), and the message box cleared only after the send finished (now clears immediately and restores on failure). Three heading-order skips were also fixed.

## 2. Not executed

| Not run | Why | How to run |
|---|---|---|
| `tests/smoke.spec.ts`, `tests/api.spec.ts`, `tests/collab.spec.ts` (Playwright) | Need a DeepSpace login and a registered app (`deepspace test run` starts the dev workers); `collab` also needs 2 test accounts. They were written and type-checked but **never executed** | `npx deepspace test run smoke` / `api` / `e2e`; create accounts per the comment atop `tests/collab.spec.ts` |
| `npx deepspace dev start` | Needs login + registered app | Codespaces |
| `npx deepspace deploy`, and anything on the live URL | No deploy tool/credentials | See DEPLOYMENT.md |
| Real sign-in (GitHub/Google OAuth), also from inside a Codespace | No account access | Manual checklist |
| Real record sync, real permission enforcement by the deployed Durable Object | Needs the live platform | `collab.spec.ts` + checklist |
| Real realtime delivery between two sessions | Same | `collab.spec.ts` + checklist |
| A real AI call through the DeepSpace proxy (model id `claude-sonnet-5-5`, options used) | No credentials | Checklist item 6 |
| Codespaces / devcontainer behaviour; `scripts/codespaces-setup.sh` inside a Codespace | No Codespaces access (the script was exercised in a clean sandbox directory, see section 4) | CODESPACES_SETUP.md |
| Browsers other than Chromium; real phones; load/concurrency; manual screen reader | Out of scope here | |

## 3. Needs your account or configuration

- `npx deepspace auth login` (GitHub or Google).
- `npx deepspace app init` (registers the app; until then the build refuses to run).
- A unique `name` in `wrangler.toml`.
- DeepSpace credits on your account if you keep the default developer billing (AI roadmaps).
- Two accounts to test multi-user behaviour (a second GitHub/Google account, or DeepSpace test accounts).

## 4. Manual checklist (do this on your Codespace, then on the live URL)

1. [ ] `npm run validate` passes.
2. [ ] `npx deepspace dev start`: landing loads; **Start a project** shows the sign-in screen; sign in with GitHub/Google; you land on the dashboard.
3. [ ] Create a project; reload; it is still there. Edit it. Add milestones; tick one; reload; state persists; ring and percentage match.
4. [ ] AI roadmap: generate, edit a title, untick one, save; milestones and "Start here" appear.
5. [ ] Hit the AI limit deliberately? (Optional: 10 per hour.) The message should name the limit.
6. [ ] Second account in another browser: your public project shows in Community; **a private project does not**; the second user sees no Edit/Delete and no AI tab; opening your private project's URL shows "Project not found".
7. [ ] Second account posts in the discussion; your window shows it **without reload**. Delete the message from its author's window; it disappears for both.
8. [ ] Make a public project with messages private: confirm the warning; the discussion is gone and cannot be restored by making it public again.
9. [ ] Delete a project: it disappears from the dashboard and community.
10. [ ] Sign out; protected URLs show the sign-in screen.
11. [ ] Mobile width (browser dev tools, 390px): no sideways scrolling.
12. [ ] After `deploy`: repeat 2 to 7 on the live URL.
13. [ ] Run `npx deepspace test run` and note what passes.

If a step fails, note the exact message and check `npx deepspace logs` and the browser console.

## 5. Known limitations

- Milestones are last-write-wins across tabs; the AI quota check is not atomic; the community loads every readable project in the browser; no pagination. (Details in ARCHITECTURE.md section 10.)
- `select` columns and the milestones JSON are validated by the UI, not by the server.
- Messages are readable by any signed-in member (SDK public-channel model), mitigated by public-only discussions and deletion on privacy change or project delete.
- The app owner (admin) can read all private projects.

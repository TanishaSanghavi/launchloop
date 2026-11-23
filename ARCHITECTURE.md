# LaunchLoop architecture

Written to be read the night before the interview. Everything here describes code that exists in this repo; where something is a limitation, it says so. File paths are relative to the repo root.

## 1. The big picture

```
Browser (React 19 + Vite)                      Cloudflare (DeepSpace-hosted)
-----------------------------                  --------------------------------------------
pages (generouted routes)                      worker.ts  (Hono app)
  |                                              |-- /api/auth/*       -> DeepSpace auth worker
  |-- useQuery / useMutations / useMessages ---- WebSocket /ws/app:<id> --> RecordRoom (Durable Object, SQLite)
  |        (live data, permissions checked        |                         - holds ALL collections
  |         inside the Durable Object)            |                         - checks permissions on every read/write
  |                                              |                         - broadcasts changes to subscribers
  |-- fetch POST /api/actions/<name> ----------- |-- registerActionRoutes -> src/actions/*  (server actions)
  |        (Bearer JWT)                          |                         - verified caller, RBAC OFF, manual checks
  |                                              |-- createDeepSpaceAI -> DeepSpace AI proxy -> Claude
```

Key idea: **almost everything is a "record" in a Durable Object**, and the Durable Object enforces permissions. The browser talks to it directly over a WebSocket for reads and ordinary writes. The only custom server code is three **server actions**, used where the operation needs more power than a normal user has, or must be rate-limited.

## 2. Frontend structure

Routing is file-based ([generouted](https://github.com/oedotme/generouted)). The folder a page sits in decides which providers wrap it:

| Folder | Wrapped by | Used for |
|---|---|---|
| `src/pages/index.tsx` | nothing (`_app.tsx` only adds toasts/tooltips) | `/` landing. Static: no auth call, no WebSocket. Prerendered to HTML at build. |
| `src/pages/(app)/` | `DeepSpaceAuthProvider` + `RecordProvider` + navigation (`(app)/_layout.tsx`) | `/sign-in` (public but dynamic) |
| `src/pages/(app)/(protected)/` | all of the above + `<AuthGate>` (`(protected)/_layout.tsx`) | `/dashboard`, `/community`, `/projects/:id` |

`(app)` and `(protected)` are route *groups*: the parentheses keep them out of the URL. A page is gated **only** because it sits under the folder whose `_layout.tsx` renders `<AuthGate>`. Putting a protected page anywhere else makes it public.

Components (`src/components`):

- `brand/`: `Logo`, `ProgressRing` (the signature element; pure SVG so it prerenders).
- `projects/`: `ProjectCard`, `ProjectFormModal`, `MilestonesPanel`, `RoadmapPanel`, `DiscussionPanel`.
- `auth/SignInScreen.tsx`: branded wrapper around the SDK's `AuthOverlay`.
- `ui/`: primitives from the scaffold (Base UI + Tailwind), plus `NativeSelect` and `Field` that I added.
- `Navigation.tsx`: top bar, driven by `src/nav.ts`.

Logic that can be tested without React lives in `src/lib/`:

- `milestones.ts`: types plus pure functions (add, edit, move, toggle, progress, defensive `parseMilestones`).
- `projects.ts`: turns a raw record into a `ProjectView`; search/filter/sort.
- `limits.ts`: the field limits shared by schema, forms and actions.
- `use-people.ts`: id to name/avatar via the SDK roster.
- `api.ts`: `callAction()`, which fetches an action with the user's JWT.

Styling: Tailwind v4 with design tokens in `src/styles.css` (`@theme`: navy surfaces, indigo accent, Geist + Bricolage Grotesque fonts self-hosted via `@fontsource-variable`). Motion respects `prefers-reduced-motion`.

## 3. Backend structure

- `worker.ts`: the Hono app and the Durable Object classes. Route registration order matters (specific routes before the SPA fallback). `AppRecordRoom extends RecordRoom` and is constructed with **`schemas`**, so our permission rules are what the room enforces.
- `src/server/*`: scaffold routes (auth proxy, WebSocket upgrade with JWT check, `/api/actions/:name`, static files). I did not change them.
- `src/actions/*`: our server code (section 8).
- `src/ai/*`, `src/cron.ts`, `src/jobs.ts`: scaffold; the "agent tools" routes let an AI assistant act as the signed-in user under the same permissions. LaunchLoop's UI does not use them.

## 4. Records schema

Defined in `src/schemas/*.ts`, collected in `src/schemas.ts`, imported by **both** the worker (enforcement) and the browser.

**`projects`** (`src/schemas/projects-schema.ts`)

| Column | Type | Rules |
|---|---|---|
| title | text | required, max 80 |
| description | text | max 2000 |
| category | select | one of `CATEGORIES` (not enforced server-side) |
| goal | text | max 300 |
| visibility | select | `public` (default) or `private` (not enforced server-side) |
| summary | text | max 600 (from the AI roadmap) |
| startingPoint | text | max 300 (from the AI roadmap) |
| milestones | json | array of `{id,title,details,priority,estimate,done,completedAt?}` |

The owner is the row's creator (`createdBy`, stamped by the server). `visibilityField: { field: 'visibility', value: 'public' }`.

**`messages`** (`src/schemas/messages-schema.ts`): the SDK's `MESSAGES_SCHEMA` with `content` required and capped at 2000 and no access for signed-out/viewer. `channelId` = the project's record id; `authorId` is `userBound` + `immutable` so the server stamps it.

**`ai_usage`** (`src/schemas/usage-schema.ts`): `windowStart`, `count`; the record id is the user id. Members have no access at all; only the action writes it.

**`users`**: SDK collection; members can read/update only their own row. Names and avatars of other users come from the roster (`useUserLookup`), which exposes public identity only, never email.

## 5. Authentication flow

1. Visitor opens a protected route. `<AuthGate>` finds no session and renders `SignInScreen`, which renders the SDK `AuthOverlay` (GitHub / Google).
2. OAuth happens at DeepSpace's auth worker (Better Auth). We never see a password.
3. A session cookie is set; `useAuth()` flips to `isSignedIn`; `AuthGate` renders the page.
4. The WebSocket to the record room is opened with a JWT; the worker verifies it (`verifyJwt`) on upgrade.
5. For HTTP calls to our actions, `getAuthToken()` returns the JWT and `callAction()` sends it as `Authorization: Bearer`.
6. Sign out: account menu calls the SDK's `signOut()`.

Signed-out visitors still open an *anonymous* socket (the scaffold sets `allowAnonymous`), but anonymous connections get the `viewer` role, and every collection here denies `viewer`.

## 6. Authorization: three layers

| Layer | What | Real security? |
|---|---|---|
| UI | `AuthGate`, hiding Edit/Delete from non-owners, hiding the AI tab | **No.** Convenience only. Anyone can bypass a UI. |
| Record permissions | `permissions` in each schema, evaluated in the Durable Object before data is sent or written | **Yes.** |
| Server actions | JWT verified by the worker; then **our code** checks ownership | **Yes**, but only as good as our checks. |

Who can do what (record layer):

| | owner | other member | signed-out |
|---|---|---|---|
| read public project | yes | yes | no |
| read private project | yes | **no** | no |
| update/delete project (incl. milestones) | yes | **no** | no |
| create project | yes | yes | no |
| read/post messages | n/a | yes | no |
| edit/delete a message | its author only | no | no |
| read/write `ai_usage` | no | no | no |

Admin (the app owner) can read and moderate everything. That is deliberate.

Actions run with permissions **off**, so each one starts with `loadOwnedProject()` (`src/actions/project-actions.ts`): it loads the project and compares `createdBy` to the verified caller. "Not found" and "not yours" return the same message so ids cannot be probed.

## 7. Real-time messaging

`DiscussionPanel` calls `useMessages(projectId)` (SDK). Under the hood that is `useQuery('messages', { where: { channelId } })`: a live query. `send()` creates a record; the Durable Object validates it (length, author stamping, permissions), stores it, and pushes it to every connected client allowed to read it. So a second user sees a message without reloading, with no polling and no messaging code of ours.

We use the project id as the channel id, so no "channel" records exist. The panel adds: auto-scroll unless you scrolled up, minute-by-minute "5m ago" refresh, Enter/Shift+Enter, delete-own, optimistic clear of the composer with restore on failure, loading/empty/error states.

**Limitation to know cold:** SDK messaging is for public channels. Any signed-in member can read *all* messages. Hence discussions only for public projects, and `setProjectVisibility('private')` and `deleteProject` delete the project's messages (they belong to other users, so only a privileged action can).

## 8. AI roadmap generation

```
RoadmapPanel (owner only)
  -> callAction('generateRoadmap', {description,title,timeline,experience})
       POST /api/actions/generateRoadmap  + Bearer JWT
  worker verifies JWT -> createGenerateRoadmap handler (src/actions/project-actions.ts)
    1. parseRoadmapInput        validate/clip untrusted input         (roadmap-generator.ts)
    2. takeQuota                10/hour/user in `ai_usage`; fails closed (rate-limit.ts)
    3. defaultMakeModel         createDeepSpaceAI(env,'anthropic')('claude-sonnet-5-5')
    4. generateRoadmapWithModel system prompt + user text fenced between <<< >>>
                                generateText -> text -> extract JSON -> zod validate
                                invalid? ONE repair attempt showing the model its output + the errors
    5. return { roadmap }       (nothing is saved)
  RoadmapPanel: review -> user edits titles / unticks -> "Save"
    -> putConfirmed(project, { milestones, summary, startingPoint })   // normal owner-only write
```

Design points:

- **Server-side**, so no key reaches the browser, the quota can't be bypassed, and billing is controlled.
- **Review before save**: the action never writes the project; the user's own write does, under the normal ownership rule.
- **Provider-agnostic JSON**: prompts for JSON and validates with zod instead of relying on a model's structured-output feature (which I could not test through the proxy). Over-long strings are truncated, more than 5 milestones are trimmed, but fewer than 3 or a bad priority is rejected.
- **Prompt injection**: the description is untrusted. It is fenced and the system prompt says to treat it as data. Even if the model is fooled, output is schema-validated and rendered as React text (escaped), so the worst case is a weird roadmap.
- **Errors**: 402 (credits) / 429 (busy) / other are mapped to safe messages; raw provider text is never shown.
- **Billing**: `ROADMAP_BILLING` in `src/actions/config.ts` (`'developer'` = your credits, `'user'` = the caller's).
- Not streamed: server actions don't stream, and we need the whole JSON to validate it.

## 9. How each integration is used

See [INTEGRATIONS.md](./INTEGRATIONS.md).

## 10. Technical tradeoffs

| Decision | Why | Cost |
|---|---|---|
| Milestones as a JSON array **inside** the project row | The project's `update: 'own'` rule then protects them. A separate `milestones` collection can only check "who created this row", so any member could add milestones to someone else's project (the record layer cannot check the parent). | Whole-array writes: last write wins if the owner edits from two tabs; no per-milestone history; size capped by a 30-milestone UI limit, not by the server. |
| Discussions only on public projects; privacy flip deletes messages | SDK messaging can't isolate private channels | Making a project private is destructive (confirmation dialog says so). Owner could bypass the action with a raw write and leave messages. |
| AI via a server action with developer billing + per-user quota | Reviewers can try it with no setup | Spends the owner's credits; quota check isn't atomic so concurrent requests can exceed the limit slightly; failed generations still use a slot |
| `useQuery('projects')` loads everything the user may read, filtering client-side | Simple, live, fine for a demo | Won't scale to thousands of projects; needs server-side pagination/search |
| Optimistic milestone UI | Instant feedback | Needs rollback code; a failed save reverts the checkbox and toasts |
| Native `<select>` in forms | Accessible, mobile pickers, no hidden state | Less custom styling |
| Unit-testing permissions with the SDK's own functions | Real enforcement code, no backend needed | Does not prove the deployed room wires them (that's SDK's contract; see `tests/collab.spec.ts`) |

## 11. Where to find the important code

| To understand... | Open |
|---|---|
| Permission rules | `src/schemas/projects-schema.ts`, `messages-schema.ts`, `usage-schema.ts` |
| Ownership check in actions | `loadOwnedProject` in `src/actions/project-actions.ts` |
| AI pipeline | `src/actions/roadmap-generator.ts` (+ `project-actions.ts`, `config.ts`) |
| Rate limiter | `src/actions/rate-limit.ts` |
| Milestone logic | `src/lib/milestones.ts` |
| Milestone UI + optimistic update | `src/components/projects/MilestonesPanel.tsx` |
| Review-before-save flow | `src/components/projects/RoadmapPanel.tsx` |
| Realtime chat | `src/components/projects/DiscussionPanel.tsx` |
| Project page orchestration | `src/pages/(app)/(protected)/projects/[id].tsx` |
| Route gating | `src/pages/(app)/(protected)/_layout.tsx` |
| Providers | `src/pages/(app)/_layout.tsx` |
| Worker entry | `worker.ts` |

## 12. How to modify each feature

| Change | Do |
|---|---|
| Add a category | Add it to `CATEGORIES` in `src/lib/categories.ts`. The schema, forms and filter read that list. Update the test count if any. |
| Add a project field | Add a column in `projects-schema.ts` (with `maxLength`), the field in `ProjectData` (`lib/projects.ts`) and `ProjectView`, the form in `ProjectFormModal.tsx`, display it where needed. |
| Add a milestone field (e.g. due date) | `Milestone` + `parseMilestones` + `draftToMilestone` in `lib/milestones.ts`, the add/edit forms and row in `MilestonesPanel.tsx`, then tests in `milestones.test.ts`. No schema change: milestones are JSON. |
| Change the AI model or billing | `ROADMAP_MODEL_ID` / `ROADMAP_BILLING` in `src/actions/config.ts`. Model ids come from the SDK catalog. |
| Change the roadmap size | `roadmapSchema` (`.min/.max/.slice`) and the wording in `SYSTEM_PROMPT`, both in `roadmap-generator.ts`; update its tests. |
| Change the AI quota | `ROADMAP_RATE_LIMIT` in `config.ts`. |
| Add a protected page | New file under `src/pages/(app)/(protected)/`; add a link in `src/nav.ts`. |
| Add a server action | Add a handler in `src/actions/project-actions.ts`, register it in `src/actions/index.ts`, start it with the ownership check if it touches a record by id. |
| Let users edit messages | `useMessages` already returns `edit(id, text)`; add UI in `DiscussionPanel.tsx` (the schema already lets authors update their own). |

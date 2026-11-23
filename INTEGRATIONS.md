# DeepSpace integrations: what is used, where, and how it was verified

Four DeepSpace primitives are used. "Verified" means what I could actually check from a sandbox with no DeepSpace login. **None of the four has been exercised against the live platform by me.**

| # | Integration | What it powers | Where in the code | SDK APIs used |
|---|---|---|---|---|
| 1 | Authentication | Sign-in/out, signed-in identity, protected routes, verified JWT for actions | `src/pages/(app)/(protected)/_layout.tsx`, `src/components/auth/SignInScreen.tsx`, `src/components/Navigation.tsx`, `src/lib/api.ts` | `AuthGate`, `AuthOverlay`, `useAuth`, `useAuthProfileReady`, `signOut`, `getAuthToken` |
| 2 | Records (persistence) | Projects (with embedded milestones), per-user AI quota, permission rules | `src/schemas/*.ts`, `src/pages/(app)/(protected)/*`, `worker.ts` (`RecordRoom`) | `useQuery`, `useMutations` (`createConfirmed`, `putConfirmed`), `CollectionSchema`, `RecordRoom` |
| 3 | Messaging (realtime) | Per-project discussion | `src/components/projects/DiscussionPanel.tsx`, `src/schemas/messages-schema.ts` | `useMessages`, `MESSAGES_SCHEMA` |
| 4 | AI | Roadmap generation | `src/actions/roadmap-generator.ts`, `src/actions/project-actions.ts`, `src/actions/config.ts` | `createDeepSpaceAI`, `getDeepSpaceAIModel`, `DEEPSPACE_AI_DEFAULTS` + the Vercel `ai` package's `generateText` |

Also used: **server actions** (`src/actions`, exposed by the scaffold at `POST /api/actions/:name`) for the three operations that need elevated rights.

## 1. Authentication

- **Does:** DeepSpace's auth worker (Better Auth) handles GitHub/Google OAuth and the session. The browser SDK exposes `useAuth()`. `AuthGate` renders its children only when signed in; otherwise our branded `SignInScreen` (which wraps the SDK's `AuthOverlay`).
- **Server side:** WebSocket upgrades verify the JWT (scaffold `wsRoute`). Server actions are reached only after the scaffold verifies the caller's bearer token (`/api/actions/:name` returns 401 otherwise), and actions receive the verified `userId`.
- **Not ours:** we never see passwords or tokens beyond forwarding the bearer token to our own action endpoint.
- **Verified:** the real `AuthOverlay` rendered with our theme in a browser. The OAuth round trip itself is **not** verified. `tests/api.spec.ts` asserts actions return 401 unauthenticated (written, **not executed**).
- **Needs from you:** nothing beyond logging in to deploy. Users sign in with GitHub or Google. (Email/password sign-in in the overlay only works for existing accounts; public email signup is closed platform-wide.)

## 2. Records

- **Does:** three of our collections: `projects`, `ai_usage`, plus the SDK's `users`. Permissions are declared once in the schema and enforced inside the Durable Object on every read and write.
- **Verified:** `src/schemas.test.ts` calls the SDK's own `canRead/canUpdate/canDelete/canCreate` against our schemas (owner vs other member vs viewer vs admin) and the SDK schema linter reports zero warnings. 14 tests pass. That proves our rules say what we think; it does not prove the deployed Durable Object applies them (that is the SDK's contract; `tests/collab.spec.ts` is the live check, **not executed**).
- **Not enforced by the server:** `select` options (category/visibility) and the shape of the milestones JSON. The UI validates, and `parseMilestones` defends on read.

## 3. Messaging

- **Does:** `useMessages(projectId)` is a live query over the `messages` collection filtered to that channel, plus `send/remove`. New messages from other people arrive through the same WebSocket subscription as all records.
- **We tightened the SDK schema:** content required and capped at 2,000 characters; signed-out/viewer roles cannot read.
- **Important design constraint:** the SDK's messaging schemas are for **public channels**. Any signed-in member can read the whole `messages` collection (DeepSpace's docs say row rules cannot make a channel private). So discussions exist only for public projects, and making a project private or deleting it deletes its messages through a server action.
- **Verified:** schema rules (unit tests) and the UI behaviour (send, Enter/Shift+Enter, delete own, empty/loading states) against a mock. **Realtime delivery between two real sessions is not verified**; `tests/collab.spec.ts` covers it (**not executed**).

## 4. AI

- **Does:** the browser calls `POST /api/actions/generateRoadmap`. The action validates input, takes a slot from the user's hourly quota, builds a model with `createDeepSpaceAI(env, 'anthropic', ...)` (model `claude-sonnet-5-5`, from the SDK catalog; falls back to the SDK default if that id is ever removed), asks for JSON only, validates with zod, and retries once with the validation error if invalid.
- **No keys:** there is no API key anywhere. The DeepSpace proxy authenticates with the owner's JWT (developer billing) or the caller's (user billing).
- **Verified:** 14 tests drive the whole pipeline with the AI SDK's mock model: valid JSON, fenced JSON, prose around JSON, repair on invalid output, give-up after one repair, truncation of over-long text, 402/429/other provider errors mapped to safe messages (raw provider text never reaches the user), rate limiting, fail-closed when the counter can't be read. **A real model call has not been made.** One thing I could not confirm: whether the DeepSpace proxy accepts exactly this model id and options; if the first call fails, check `npx deepspace logs`, and `ROADMAP_MODEL_ID` in `src/actions/config.ts`.
- **Needs from you:** credits on your DeepSpace account (default billing), or switch to user billing. See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Not used (on purpose)

External integration proxy (Composio etc.), file uploads, payments, presence/cursors, collaborative editing, cron and background jobs. The scaffold ships files for some (`src/cron.ts`, `src/jobs.ts`, `src/integrations.ts`); they are inert. The scaffold also registers "agent tools" routes (`src/ai/*`) that let an AI assistant act as the signed-in user under the same permissions; LaunchLoop's own UI does not use them.

## If something fails after deploy

1. `npx deepspace logs` for server-side errors.
2. Browser console for client errors.
3. Roadmap failures: the toast text tells you which case (limit, credits, busy, bad output).

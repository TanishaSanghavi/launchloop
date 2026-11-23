# Live coding preparation

Read [ARCHITECTURE.md](./ARCHITECTURE.md) first. Answers below match the code as written. Do not claim things the code does not do; the interviewers will have the repo open. Where I mention a limitation, saying it first is a strength.

## Files to understand well (in this order)

1. `src/schemas/projects-schema.ts`: the permission model in 40 lines.
2. `src/actions/project-actions.ts`: `loadOwnedProject`, `deleteProject`, `createGenerateRoadmap`.
3. `src/actions/roadmap-generator.ts`: prompt, validation, repair.
4. `src/lib/milestones.ts` and `milestones.test.ts`.
5. `src/components/projects/MilestonesPanel.tsx`: the optimistic update (`pending` state).
6. `src/components/projects/DiscussionPanel.tsx`.
7. `src/pages/(app)/(protected)/projects/[id].tsx`.
8. `src/pages/(app)/_layout.tsx` and `(protected)/_layout.tsx`: providers and gating.
9. `worker.ts`: just the shape.

## 15 likely questions

**1. Walk me through the architecture.**
React frontend; one Durable Object (`RecordRoom`) holds all data and enforces permissions; the browser talks to it over a WebSocket through `useQuery`/`useMutations`. A Hono worker serves the app and three server actions for things users can't do themselves: generate an AI roadmap (cost control), and delete a project or make it private (which must also delete other users' chat messages).

**2. Why are milestones inside the project instead of their own collection?**
Because permissions are per row. A `milestones` row can only check "did you create *this row*", not "do you own the *parent project*", so any member could add milestones to someone else's project. Embedding them means the project's `update: 'own'` rule protects them. The cost is whole-array writes (last write wins across tabs) and no per-milestone history. If I needed collaborators editing milestones, I'd switch to a collection with `collaboratorsField`, or route writes through an action that checks the parent.

**3. If I edit the frontend to show an Edit button on someone else's project, what happens?**
The write is sent but the Durable Object checks `update: 'own'` against `createdBy` and rejects it; the app shows a toast via `onWriteError`/the confirmed write's rejection. Hiding buttons is UX, not security.

**4. How does authentication work?**
DeepSpace's auth worker (Better Auth) does GitHub/Google OAuth. The SDK gives me `useAuth()`. `AuthGate` in `(protected)/_layout.tsx` gates routes, but the real enforcement is server-side: the WebSocket handshake verifies the JWT and actions are only reachable with a verified bearer token. I never touch passwords.

**5. How does real-time chat work and why didn't you build your own?**
`useMessages(projectId)` is a live query over the SDK's `messages` collection. A send is a record write; the Durable Object validates and broadcasts it to subscribers. DeepSpace already provides that, and a custom WebSocket server would be more code and more bugs. I added a length cap and removed access for signed-out users by tightening the schema.

**6. What's the biggest limitation of the chat?**
SDK messaging is public-channel only, so any signed-in member can read all messages. That's why discussions only exist for public projects, and why going private or deleting a project deletes its messages through an action. A proper private chat needs a participants field as `collaboratorsField` and `read: 'shared'`.

**7. Walk me through generating a roadmap.**
Browser calls `generateRoadmap` with the user's JWT. The action validates input, takes a slot from a per-user hourly quota in `ai_usage`, builds a Claude model through `createDeepSpaceAI`, asks for JSON, validates with zod, retries once with the error on failure, and returns the roadmap without saving. The user reviews and edits it; saving is a normal owner-only write.

**8. How do you handle bad or malicious model output?**
Everything is validated against a zod schema; over-long text is truncated, a bad priority or fewer than 3 milestones is rejected after one repair try. The user's description is fenced and labelled as data in the prompt. Output is rendered as escaped text, so even a successful injection can only produce a strange roadmap, not run code.

**9. How do you control AI cost?**
Sign-in required; 10 per user per hour enforced server-side; 2,000-char input; 1,500-token output; and I can switch billing to the user with one constant. By default it bills the app owner so reviewers can try it, and I say that in the docs.

**10. Why server actions for delete and visibility?**
The owner is allowed to delete their project, but the discussion messages belong to other users, whom the owner has no permission to delete. Only a privileged action can cascade. The action verifies ownership itself because actions run with permissions off.

**11. What if two tabs toggle milestones at once?**
Last write wins on the whole array, because milestones are one JSON column. The UI sends the full list computed from what it has. It's a known tradeoff for single-owner data. Fix would be per-milestone records with a parent check, or a server action that merges.

**12. What happens if the save fails after the checkbox flips?**
`MilestonesPanel` keeps an optimistic copy (`pending`), shows it immediately, and clears it when the server data matches or when the save fails (rolling back), and the page toasts the error.

**13. How did you test, and what's not tested?**
Unit tests on pure logic, on the permission rules using the SDK's own `canRead/canUpdate/...`, on action handlers with an in-memory fake of the record tools, and on the AI pipeline with the AI SDK's mock model. A scripted browser run against a mock backend checked UI flows, plus an automated accessibility audit. Not tested: real sign-in, real sync, real chat, real model calls, and the shipped Playwright specs have not been run. See TESTING.md.

**14. How would it scale?**
`useQuery('projects')` pulls everything the user can read and filters in the browser, so I'd add server-side pagination and search first; then paginate messages; then move the quota to an atomic counter.

**15. What did AI do and what did you verify?** (answer honestly from SUBMISSION_WRITEUP.md)
An AI coding agent wrote the code, tests and docs from the official scaffold and SDK types. I then [list exactly what you ran and read]. If you did not read a file, don't claim you understand it; read it tonight.

## Bugs and limitations you should volunteer

- Milestones are last-write-wins (section above).
- The quota check (`get` then `create`) isn't atomic: concurrent requests can slightly exceed 10/hour. A failed generation still consumes a slot.
- Owner can bypass `deleteProject`/`setProjectVisibility` with a raw record write (their own RBAC allows it), which would leave messages behind. The UI never does this.
- `select` columns (category/visibility) and the milestones JSON are not validated by the server; the UI normalises unknown values (`toProjectView`, `parseMilestones`).
- The app owner (admin) can read every private project.
- No pagination anywhere; no message editing/reactions; hard-delete messages only.
- `AI roadmap` model id and proxy behaviour were never exercised against the real platform.

## Small modifications to practice (each should take 5 to 15 minutes)

1. **Add a category** ("Education"): `src/lib/categories.ts`. Check the community filter picks it up. Run `npm run test:unit`.
2. **Show a "Shipped" badge** on cards at 100%: `ProjectCard.tsx`, using `project.progress.percent`.
3. **Add a due date to milestones**: type + `parseMilestones` + `draftToMilestone` in `lib/milestones.ts`, add a date input to `AddMilestoneForm`/`EditMilestoneModal`, add a test. Notice: no schema change needed, and say why.
4. **"Sort by priority" button** in `MilestonesPanel`: write a pure `sortByPriority(list)` in `lib/milestones.ts` first (with a test), then call `commit(sortByPriority(milestones))`.
5. **Change the roadmap to 3 to 7 milestones**: `roadmapSchema` and `SYSTEM_PROMPT` in `roadmap-generator.ts`; update the tests that assert 5.
6. **Raise the AI limit to 20/hour**: `config.ts`. Then explain what would still bound the cost.
7. **"My projects only" toggle** on Community: add `mine: boolean` to `ProjectFilter` in `lib/projects.ts`, filter by `ownerId`, add a checkbox in `community.tsx`.
8. **Let users edit their messages**: `useMessages().edit` exists; add an Edit button for own messages in `DiscussionPanel.tsx`. Why does the schema already allow it? (`update: 'own'` on messages.)
9. **Explain, don't just write**: for any change above, be ready to say which layer enforces it (UI, record permission, or action).

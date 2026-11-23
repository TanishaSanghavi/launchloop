# Submission write-up (draft for the DeepSpace portal)

Edit this in your own words. **Only keep claims that are true for you.** Square brackets are things you must fill in or confirm; delete any sentence you cannot honestly stand behind.

## Links

- Live app: **[paste the URL printed by `npx deepspace deploy`; do not submit until it loads]**
- Repository: **[your GitHub URL]**

## What I built

LaunchLoop is a small collaborative SaaS for people building side projects: they turn an idea into milestones, track progress, share the project with a community and discuss it. Implemented:

- Sign-in with GitHub/Google; protected pages; sign-out.
- Create, edit, delete projects (title, description, category, goal, public/private).
- Milestones: add, edit, reorder, delete, complete; progress ring and bar.
- AI roadmap: summary, 3 to 5 milestones with priority and estimate, and a starting point; reviewed and editable before saving.
- Community page: search, category filter, sort, owners, progress, empty and loading states.
- Per-project realtime discussion for public projects.
- Landing page, responsive layouts, accessible components (automated audit clean on the screens I checked).

Not implemented (planned): pagination and server-side search, message editing/reactions, notifications, collaborators on a project, private discussions, an atomic AI quota counter.

## Why this problem

Side projects usually stall because the next step is unclear and nobody is watching. LaunchLoop adds structure (milestones, AI roadmap), accountability (visible progress) and feedback (community, discussion). **[Add one or two sentences of your own motivation. This part should be yours.]**

## DeepSpace integrations used

| Integration | Used for |
|---|---|
| Authentication | Sign-in, protected routes, verified identity for server actions |
| Records | Projects with embedded milestones, per-user AI quota, permission rules enforced by the record room |
| Messaging | Project discussions via `useMessages`, realtime |
| AI | Roadmap generation via `createDeepSpaceAI` (Claude) in a server action |

**[Confirm each works on your live deployment before keeping this table. See the checklist in TESTING.md.]**

## Main technical tradeoff

Milestones live inside the project row as JSON rather than in their own collection. Permissions are per row and a child row can't check its parent's owner, so a separate collection would let any member add milestones to anyone's project. Embedding means the project's owner-only update rule protects them, at the cost of last-write-wins on the milestone list. A related constraint: DeepSpace messaging is public-channel only, so discussions exist only for public projects, and making a project private deletes its discussion via a server action.

## How I used an AI coding agent

An AI coding agent (Claude) built the project in a sandbox. It read the DeepSpace docs and the installed SDK's type definitions, started from the official scaffold, and wrote the application code, unit tests, UI test run and documentation. It found and fixed several of its own mistakes during the work (for example a copy command that stripped dependency folders, and two UX problems found by its UI tests: laggy checkboxes and a message box that cleared late). It could **not** sign in to DeepSpace, so it could not run the app against the real platform or deploy it. **[Add: how you directed it, what you changed or rejected.]**

## What I verified myself

**[Tick only what you actually did. Delete the rest. Add what else you did.]**

- [ ] Read ARCHITECTURE.md and can explain each file in the "most important code" table.
- [ ] Ran `npm run validate` in Codespaces and it passed.
- [ ] Ran the app with `npx deepspace dev start` and signed in.
- [ ] Created, edited and deleted a project; added and completed milestones; reloaded and confirmed persistence.
- [ ] Generated a roadmap with the real AI, edited it, saved it.
- [ ] With a second account: confirmed a private project is invisible, a public one is read-only, and discussion messages appear in real time.
- [ ] Confirmed another user cannot edit my project (tried it).
- [ ] Deployed with `npx deepspace deploy` and ran the smoke test on the live URL.
- [ ] Ran `npx deepspace test run` [passed / failed / which parts].

## Known limitations

- The AI roadmap bills the app owner by default (rate-limited to 10 per user per hour). Switchable to per-user billing with one constant.
- The quota check is not atomic; milestones are last-write-wins; the community loads all readable projects client-side.
- Select values and the milestones JSON are validated by the UI, not by the server.

## Future improvements

Server-side pagination and search; per-milestone records with a parent-ownership action (enables collaborators); private discussions with participant-scoped rows; message editing and reactions; atomic quota; email or in-app notifications for replies; a public read-only share page.

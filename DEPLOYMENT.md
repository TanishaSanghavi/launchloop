# Deployment

I have **no DeepSpace deployment tool and no account access**, so nothing here has been deployed by me, and I cannot give you a live URL. These steps follow the DeepSpace docs and the CLI's `--help`.

## Before you deploy

- [ ] `npx deepspace auth whoami` shows the account you want to own the app.
- [ ] `wrangler.toml` has a unique `name` and a real `DEEPSPACE_APP_ID` (set by `npx deepspace app init`).
- [ ] `npm run validate` passes.
- [ ] You tried the app locally with `npx deepspace dev start` and ran the checklist in [TESTING.md](./TESTING.md).
- [ ] Your `origin` remote points at your GitHub repo.
- [ ] You understand the AI billing default (next section).

## The command

```bash
npx deepspace deploy
```

It builds the client and worker, uploads them, registers `<name>.app.space`, and mints the production credentials. The CLI prints the live URL when it succeeds. **Only treat the app as deployed once you have that URL and it loads.**

For GitHub-sourced apps, `deploy` ships your current checkout (including uncommitted changes). Commit and push anyway so the repo you submit matches what is live.

## AI billing: read this

`generateRoadmap` is billed to **the app owner (you)** by default: `ROADMAP_BILLING = 'developer'` in `src/actions/config.ts`. That lets reviewers try the AI feature with no setup, but every roadmap spends your DeepSpace credits. What limits the cost:

- 10 roadmaps per user per hour, enforced on the server (`ROADMAP_RATE_LIMIT`);
- description capped at 2,000 characters, output capped at 1,500 tokens;
- sign-in is required, so anonymous visitors cannot call it.

To make each user pay with their own credits instead, change `ROADMAP_BILLING` to `'user'` and redeploy. Reviewers without credits would then see "AI credits are unavailable".

If your balance runs out, the feature fails with a clear message ("AI credits are unavailable for this app right now"); the rest of the app is unaffected.

## After deploying: smoke test the live URL

1. Open the URL in a private window: the landing page loads.
2. Click **Start a project**: you see the sign-in screen, not the dashboard.
3. Sign in; create a project; add and tick a milestone; reload; it persists.
4. Generate a roadmap; review; save.
5. Open the app in a second browser with a different account: the first user's public project appears in Community; their private project does not; the second user can post in the discussion and the first sees it appear without reloading.

Then submit the URL.

## Operating it

```bash
npx deepspace status       # session, app identity, live release
npx deepspace logs         # app logs
npx deepspace releases     # release history
npx deepspace rollback     # return to an earlier release (asks for confirmation)
```

Dashboard: <https://dashboard.deep.space>.

## Troubleshooting

| Symptom | Meaning / fix |
|---|---|
| `npm install` warns about engines, or the scaffold crashes resolving peers | npm is older than 11.6. Run `bash scripts/codespaces-setup.sh`. |
| Build: `has no valid DEEPSPACE_APP_ID (found "__APP_ID__")` | App not registered. Run `npx deepspace app init`. |
| `not_authenticated` | Run `npx deepspace auth login`. |
| `interactive_required` | The command had no terminal for the browser login. Run `auth login` in a normal terminal. |
| `The name <host> is taken by another app.` | Pick another `name` in `wrangler.toml`, then deploy with `--rename` if you had deployed under another name. |
| `forbidden` | The app belongs to another account. Check `whoami`. |
| `dirty_worktree` | Only for DeepSpace-sourced apps: commit first. |
| Blank page on the deployed app but fine locally | See DeepSpace docs, "Fix a deployed app that shows a blank page". Check the browser console and `npx deepspace logs`. |
| Roadmap says "AI credits are unavailable" | Owner credits exhausted (developer billing) or the user has none (user billing). |
| Roadmap says "limit of 10 roadmaps per hour" | Working as designed. |

## Known limitations that prevent a fully verified deploy from here

- I could not log in, so I could not run `deepspace dev`, `deepspace test run`, or `deepspace deploy`.
- Therefore real sign-in, record sync, realtime chat and live AI calls are untested by me. The unit tests and UI tests cover the logic around them; see [TESTING.md](./TESTING.md).

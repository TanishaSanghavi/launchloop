# Codespaces setup: from ZIP to running app

You need: a GitHub account, a DeepSpace account (sign in at <https://dashboard.deep.space> with GitHub or Google), and this ZIP. No local install.

> Everything below was written from the DeepSpace docs and the CLI's own `--help`, but **I could not run Codespaces or the DeepSpace login myself**. Where something is untested I say so. If a step behaves differently, trust what the terminal tells you.

## 1. Create the GitHub repository

1. On GitHub: **New repository**. Name it e.g. `launchloop`. Public is fine.
2. Tick **Add a README file** (Codespaces needs the repo to have at least one commit).
3. Create it.

## 2. Get the files into the repo (pick ONE)

### Option A (recommended): upload the ZIP into the Codespace

This avoids the browser uploader's limits on file count and hidden files (`.gitignore`, `.devcontainer/`, `.env.example` are dot-files that browser drag-and-drop sometimes skips).

1. On the repo page click **Code → Codespaces → Create codespace on main**. Wait for the editor to load. (The repo has no devcontainer yet, so this first Codespace uses a default image. Step 3 below handles the Node/npm versions.)
2. In the editor's **Explorer**, right-click empty space → **Upload...** and choose `launchloop-deepspace.zip`.
3. In the terminal (**Terminal → New Terminal**):

```bash
unzip -o launchloop-deepspace.zip
shopt -s dotglob
cp -r launchloop-deepspace/* .
rm -rf launchloop-deepspace launchloop-deepspace.zip
ls -a    # you should now see wrangler.toml, worker.ts, src/, .devcontainer/, .gitignore ...
```

### Option B: upload the files through github.com

1. Extract the ZIP on your computer. **Show hidden files** first (macOS: `Cmd+Shift+.` in Finder; Windows: View → Show → Hidden items).
2. Open the extracted `launchloop-deepspace` folder. Select **everything inside it** (not the folder itself) and drag it onto the repo's **Add file → Upload files** page.
3. GitHub's browser uploader accepts a limited number of files per commit (documented as 100 at the time of writing). If it refuses, upload `src/` in one commit and everything else in another.
4. Before committing, confirm these appear in the list: `.gitignore`, `.devcontainer/devcontainer.json`, `.env.example`, `wrangler.toml`, `package-lock.json`.
5. Commit to `main`, then **Code → Codespaces → Create codespace on main**.

## 3. Install

In the Codespace terminal:

```bash
bash scripts/codespaces-setup.sh
```

This checks for Node 22.15+ and **npm 11.6+** and upgrades npm if needed (Codespaces images usually ship an older npm, and the DeepSpace scaffold refuses to work with it), then runs `npm install`. When it ends you should see `Setup complete`.

Check: `node -v` (v22.15 or newer) and `npm -v` (11.6 or newer).

## 4. Log in to DeepSpace

```bash
npx deepspace auth login
npx deepspace auth whoami
```

`login` opens a browser for GitHub or Google OAuth; there is no password. In Codespaces, if no browser opens, copy the URL it prints into a new tab. **I could not test whether the OAuth redirect completes from inside a Codespace.** If it does not:

- Look at the **PORTS** tab: if the CLI opened a local port, make sure it is forwarded, then retry.
- DeepSpace documents one other route: log in once on a machine that has a browser and copy its `~/.deepspace/session` file to `~/.deepspace/session` here. Treat that file as a password. You said you have no such machine, so if login will not complete, ask in the DeepSpace Discord (<https://discord.gg/hcKSav5PpU>) or your contact there.

`whoami` should print your email. If more than one login could be active, check this before the next step: the app is registered under whichever account is signed in.

## 5. Name and register the app

App names are **globally unique** and become your URL (`<name>.app.space`). `launchloop` is probably taken.

1. Open `wrangler.toml` and change the first line: `name = "launchloop-yourname"` (lowercase letters, digits, dashes; 2 to 63 characters). Also set `APP_NAME` under `[vars]` to the same value.
2. Register the app. This mints its permanent id and writes it into `wrangler.toml` (replacing `__APP_ID__`):

```bash
npx deepspace app init
```

**Until you do this, `npm run build` and `deepspace dev` refuse to run.** That is expected: ids are server-minted and must never be hand-written. (`npm run validate` works before registering: unit tests fall back to a fake id.)

## 6. Check and run

```bash
npm run validate        # tsc --noEmit + unit tests
npx deepspace dev start # local dev server on port 5173
```

Codespaces forwards port 5173; click the pop-up or open it from the **PORTS** tab. Sign in with GitHub or Google and run through the checklist in [TESTING.md](./TESTING.md).

## 7. Commit and push

```bash
git status
git add -A
git commit -m "Add LaunchLoop"
git push
```

`app init` changed `wrangler.toml` (the app id); commit it. Never commit `.dev.vars` or anything under `~/.deepspace/`; `.gitignore` already excludes `.dev.vars` and `.deepspace/`.

**Important for the first deploy:** DeepSpace decides the app's source of record (DeepSpace's own repo vs GitHub) from the git remote at the app's **first release**, permanently. In a Codespace the `origin` remote is already your GitHub repo, which is what you want. Do not remove it before deploying.

Next: [DEPLOYMENT.md](./DEPLOYMENT.md).

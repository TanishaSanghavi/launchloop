#!/usr/bin/env bash
# One-shot setup for GitHub Codespaces (or any fresh Linux box).
# LaunchLoop's toolchain needs Node >=22.15 (22.x, 24.x or 26.x) and npm >=11.6.
# Codespaces images usually ship an older npm, so this upgrades it, then installs.
#
#   bash scripts/codespaces-setup.sh
set -euo pipefail

node_ok() {
  node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit((a===22&&b>=15)||a===24||a===26?0:1)'
}
npm_ok() {
  node -e 'const [a,b]=process.argv[1].split(".").map(Number); process.exit(a>11||(a===11&&b>=6)?0:1)' "$(npm -v)"
}

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found. Install Node 22 LTS, then re-run this script." >&2
  exit 1
fi

if ! node_ok; then
  echo "Node $(node -v) is not supported (need >=22.15 <23, or 24.x, or 26.x)."
  NVM_SH="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  if [ -s "$NVM_SH" ]; then
    set +u
    # shellcheck disable=SC1090
    . "$NVM_SH"
    nvm install 22
    nvm use 22
    set -u
  else
    echo "nvm is not available. Install Node 22 LTS manually and re-run." >&2
    exit 1
  fi
fi

if ! npm_ok; then
  echo "npm $(npm -v) is too old (need >=11.6). Upgrading npm..."
  npm install -g npm@11
  hash -r
  if ! npm_ok; then
    echo "npm is still $(npm -v) after upgrading. Open a NEW terminal (so PATH refreshes) and re-run: npm install" >&2
    exit 1
  fi
fi

echo "Using node $(node -v) and npm $(npm -v)"
npm install --no-fund --no-audit
echo
echo "Setup complete. Next: npx deepspace auth login"

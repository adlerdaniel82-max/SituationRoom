#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ $# -ne 1 ]]; then
    echo "Usage: $0 \"<commit message>\""
    exit 1
fi

COMMIT_MSG="$1"

echo "==> [1/4] verify frontend syntax"
cd "${ROOT_DIR}"
node --check public_html/frontend/src/main.js

echo "==> [2/4] verify backend syntax"
node --check public_html/backend/src/server.js

echo "==> [3/4] PM2 reload situation"
PM2_HOME=/home/webuser/.pm2 pm2 reload situation --update-env || \
PM2_HOME=/home/webuser/.pm2 pm2 restart situation --update-env

echo "==> [4/4] git commit & push"
git add -A

if git diff --cached --quiet; then
    echo "No staged changes to commit"
else
    git commit -m "${COMMIT_MSG}"
fi

git push -u origin main

echo "==> release done: ${COMMIT_MSG}"

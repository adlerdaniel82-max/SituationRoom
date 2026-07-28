#!/usr/bin/env bash
# Installs runtime dependencies and initializes a fresh Situation Room database.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
BACKEND_DIR="$PROJECT_ROOT/public_html/backend"
ENV_FILE="$PROJECT_ROOT/private/.env"
ENV_EXAMPLE="$PROJECT_ROOT/.env.example"

cd "$PROJECT_ROOT"

for command in node npm; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "Missing required command: $command" >&2
    exit 1
  }
done

if [ ! -f "$ENV_FILE" ]; then
  mkdir -p "$PROJECT_ROOT/private"
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "Created $ENV_FILE. Configure DB_* and required API credentials, then run this script again." >&2
  exit 1
fi

required_vars=(DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD)
for variable in "${required_vars[@]}"; do
  if ! grep -qE "^${variable}=.+" "$ENV_FILE"; then
    echo "Missing required setting ${variable} in $ENV_FILE" >&2
    exit 1
  fi
done

echo "Installing backend dependencies..."
npm ci --prefix "$BACKEND_DIR" --omit=dev

echo "Applying database migrations..."
npm --prefix "$BACKEND_DIR" run db:migrate

echo "Installation complete. Start with: node $BACKEND_DIR/src/server.js"
echo "For scheduled importers, install $PROJECT_ROOT/public_html/cron/crontab.example deliberately after reviewing it."

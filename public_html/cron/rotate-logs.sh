#!/usr/bin/env bash
# /home/webuser/web/situation.schnueddels.de/public_html/cron/rotate-logs.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

exec /usr/sbin/logrotate \
  -s "$PROJECT_ROOT/logs/.logrotate-state" \
  "$SCRIPT_DIR/logrotate.situation.conf"

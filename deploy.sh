#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# Deploy script — build and install the Query Tester app to Splunk
# Usage: ./deploy.sh [optional: path to Splunk apps directory]
#
# On Windows, run from Git Bash or WSL.
# ─────────────────────────────────────────────────────────────────

set -e

APPS_DIR=${1:-"/opt/splunk/etc/apps"}
APP_NAME="query-tester"
STAGE_DIR="packages/query-tester/stage"

if [ ! -d "$STAGE_DIR" ]; then
  echo "ERROR: Run this script from the repository root."
  exit 1
fi

echo "=== Step 1: Build frontend (webpack) ==="
cd packages/query-tester
./node_modules/.bin/webpack --mode=production
cd ../..

echo ""
echo "=== Step 2: Copy to Splunk apps directory ==="
echo "    Source:  $STAGE_DIR"
echo "    Target:  $APPS_DIR/$APP_NAME"

if [ -L "$APPS_DIR/$APP_NAME" ]; then
  echo "    (removing existing symlink/junction)"
  rm -f "$APPS_DIR/$APP_NAME"
elif [ -d "$APPS_DIR/$APP_NAME" ]; then
  echo "    (removing existing directory)"
  rm -rf "$APPS_DIR/$APP_NAME"
fi

cp -r "$STAGE_DIR" "$APPS_DIR/$APP_NAME"

echo ""
echo "=== Step 3: Set permissions ==="
if command -v chown &>/dev/null && [ "$(id -u)" = "0" ]; then
  chown -R splunk:splunk "$APPS_DIR/$APP_NAME" 2>/dev/null || true
fi
chmod -R 755 "$APPS_DIR/$APP_NAME"
chmod +x "$APPS_DIR/$APP_NAME/bin/query_tester.py"

echo ""
echo "=== Done ==="
echo ""
echo "Before restarting Splunk, verify:"
echo "  1. HEC_TOKEN is set in $APPS_DIR/$APP_NAME/bin/config.py"
echo "  2. The temp index exists (see indexes.conf)"
echo ""
echo "Restart Splunk to apply:"
echo "  /opt/splunk/bin/splunk restart"
echo "  (or: systemctl restart Splunkd)"

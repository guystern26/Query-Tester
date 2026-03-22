#!/usr/bin/env bash
# build-release.sh — Package Query Tester for deployment.
# Produces a single zip containing all three Splunk apps:
#   query-tester/          → Search Head
#   query-tester-indexer/  → Indexers (via cluster master)
#   query-tester-fwd/      → Heavy Forwarder (via deployment server)
#
# Usage: bash build-release.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
RELEASE_DIR="$BUILD_DIR/QueryTester"
VERSION=$(grep 'version' "$SCRIPT_DIR/stage/default/app.conf" | head -1 | sed 's/.*= *//')
ZIP_NAME="QueryTester-${VERSION}.zip"

echo "=== Building Query Tester v${VERSION} ==="

# Clean previous build
rm -rf "$BUILD_DIR"
mkdir -p "$RELEASE_DIR"

# ─── 1. Search Head app ────────────────────────────────────────────────────
echo "Packaging query-tester (search head)..."
cp -r "$SCRIPT_DIR/stage" "$RELEASE_DIR/query-tester"

# Remove files that must not ship
rm -rf "$RELEASE_DIR/query-tester/local"
rm -f  "$RELEASE_DIR/query-tester/metadata/local.meta"
rm -f  "$RELEASE_DIR/query-tester/.gitattributes"
find "$RELEASE_DIR/query-tester" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "$RELEASE_DIR/query-tester" -name "*.pyc" -delete 2>/dev/null || true
rm -rf "$RELEASE_DIR/query-tester/bin/tests"
rm -rf "$RELEASE_DIR/query-tester/bin/.pytest_cache"

# Sanitize config.py — replace real credentials with placeholders
sed -i \
    -e 's/SPLUNK_PASSWORD = ".*"/SPLUNK_PASSWORD = ""/' \
    -e 's/HEC_TOKEN = ".*"/HEC_TOKEN = ""/' \
    -e 's/MAIL_PASSWORD = ".*"/MAIL_PASSWORD = ""/' \
    "$RELEASE_DIR/query-tester/bin/config.py"

# ─── 2. Indexer app ───────────────────────────────────────────────────────
echo "Packaging query-tester-indexer (indexers)..."
cp -r "$SCRIPT_DIR/stage-indexer" "$RELEASE_DIR/query-tester-indexer"

# ─── 3. Forwarder app ─────────────────────────────────────────────────────
echo "Packaging query-tester-fwd (heavy forwarder)..."
cp -r "$SCRIPT_DIR/stage-fwd" "$RELEASE_DIR/query-tester-fwd"

# ─── 4. Add deployment guide ──────────────────────────────────────────────
cat > "$RELEASE_DIR/DEPLOY.txt" << 'GUIDE'
Query Tester - Deployment Guide
================================

This package contains 3 Splunk apps:

  query-tester/          -> SEARCH HEAD
  query-tester-indexer/  -> INDEXERS
  query-tester-fwd/      -> HEAVY FORWARDER

Deployment steps:

  1. INDEXERS (via Cluster Master)
     Copy query-tester-indexer/ to:
       $SPLUNK_HOME/etc/master-apps/query-tester-indexer/
     Then push the cluster bundle:
       splunk apply cluster-bundle

  2. HEAVY FORWARDER (via Deployment Server)
     Copy query-tester-fwd/ to:
       $SPLUNK_HOME/etc/deployment-apps/query-tester-fwd/
     Then reload the deployment server:
       splunk reload deploy-server

  3. SEARCH HEAD
     Copy query-tester/ to:
       $SPLUNK_HOME/etc/apps/query-tester/
     Restart Splunk.

  4. CONFIGURE
     Open the app on the search head and go to Setup (gear icon).
     Set:
       - HEC host/port -> point to the heavy forwarder
       - HEC token     -> already matches the token in query-tester-fwd
       - Splunk Web URL -> the external URL users access
       - Email settings -> if you want scheduled test notifications

     All settings are saved in KVStore. config.py is just the fallback.

Notes:
  - The HEC token is hardcoded in query-tester-fwd/default/inputs.conf.
    Change it there if your org requires a different token value.
  - The temp index auto-deletes data older than 24 hours.
  - No forwarder/UF configuration needed. This app does not collect
    external data.
GUIDE

# ─── 5. Zip ───────────────────────────────────────────────────────────────
echo "Creating $ZIP_NAME..."
cd "$BUILD_DIR"
if command -v zip &>/dev/null; then
    zip -rq "$SCRIPT_DIR/$ZIP_NAME" QueryTester/
else
    # Fallback for Windows without zip
    WIN_BUILD=$(cygpath -w "$BUILD_DIR")
    WIN_OUT=$(cygpath -w "$SCRIPT_DIR/$ZIP_NAME")
    powershell -Command "Compress-Archive -Path '${WIN_BUILD}\\QueryTester' -DestinationPath '${WIN_OUT}' -Force"
fi

echo ""
echo "=== Done ==="
echo "Output: $SCRIPT_DIR/$ZIP_NAME"
echo ""
echo "Contents:"
echo "  QueryTester/query-tester/          -> Search Head"
echo "  QueryTester/query-tester-indexer/  -> Indexers"
echo "  QueryTester/query-tester-fwd/      -> Heavy Forwarder"
echo "  QueryTester/DEPLOY.txt             -> Deployment guide"

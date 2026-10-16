#!/usr/bin/env bash
# Proper Apple notarization via notarytool (not a skip / workaround).
# Expects: signed .app under dist/mac*/Quiet Ledger.app
# Env: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID
set -euo pipefail

if [[ -z "${APPLE_ID:-}" || -z "${APPLE_APP_SPECIFIC_PASSWORD:-}" || -z "${APPLE_TEAM_ID:-}" ]]; then
  echo "::error::Missing APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID"
  exit 1
fi

APP=$(ls -d dist/mac-arm64/Quiet\ Ledger.app dist/mac/Quiet\ Ledger.app dist/mac*/Quiet\ Ledger.app 2>/dev/null | head -1 || true)
if [[ -z "$APP" ]]; then
  echo "::error::Signed Quiet Ledger.app not found under dist/"
  ls -la dist || true
  exit 1
fi

# Must be the .app itself — dirname(mac-arm64) nests Quiet Ledger.app/Quiet Ledger.app
if [[ ! -d "$APP/Contents/MacOS" ]]; then
  echo "::error::App bundle missing Contents/MacOS: $APP"
  ls -la "$APP" || true
  exit 1
fi

echo "App: $APP"
codesign --verify --deep --strict --verbose=2 "$APP"

STAGING=$(mktemp -d)
ZIP="$STAGING/QuietLedger-notarize.zip"
echo "Zipping for notarytool…"
ditto -c -k --keepParent "$APP" "$ZIP"

AUTH=(
  --apple-id "$APPLE_ID"
  --password "$APPLE_APP_SPECIFIC_PASSWORD"
  --team-id "$APPLE_TEAM_ID"
)

echo "Submitting to Apple notary service…"
SUBMIT_OUT=$(xcrun notarytool submit "$ZIP" "${AUTH[@]}" --output-format json)
echo "$SUBMIT_OUT"
SUB_ID=$(echo "$SUBMIT_OUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Submission id: $SUB_ID"
echo "Waiting for Apple (first notarization for a team can take 30–90+ minutes)…"

set +e
xcrun notarytool wait "$SUB_ID" "${AUTH[@]}" --timeout 90m
WAIT_RC=$?
set -e

if [[ $WAIT_RC -ne 0 ]]; then
  echo "::error::notarytool wait failed (exit $WAIT_RC). Checking status…"
  xcrun notarytool info "$SUB_ID" "${AUTH[@]}" || true
  xcrun notarytool log "$SUB_ID" "${AUTH[@]}" || true
  exit "$WAIT_RC"
fi

echo "Stapling notarization ticket…"
xcrun stapler staple "$APP"
xcrun stapler validate "$APP"

# --prepackaged must be the .app path, NOT its parent folder.
# Parent (dist/mac-arm64) produced Quiet Ledger.app/Quiet Ledger.app/… → “damaged”.
echo "Rebuilding DMG/ZIP with stapled app…"
npx electron-builder --mac dmg zip --prepackaged "$APP" --publish never

# Guard against nested / empty bundles shipping again
DMG=$(ls -1 dist/*.dmg | head -1)
MOUNT=$(mktemp -d)
hdiutil attach "$DMG" -nobrowse -readonly -mountpoint "$MOUNT"
INNER="$MOUNT/Quiet Ledger.app"
if [[ ! -x "$INNER/Contents/MacOS/Quiet Ledger" ]]; then
  echo "::error::Packaged DMG app is broken (missing executable). Nested bundle?"
  find "$MOUNT" -maxdepth 4 -type d | head -40
  hdiutil detach "$MOUNT" || true
  exit 1
fi
if [[ -d "$INNER/Quiet Ledger.app" ]]; then
  echo "::error::Nested Quiet Ledger.app inside Quiet Ledger.app — refusing to ship"
  hdiutil detach "$MOUNT" || true
  exit 1
fi
codesign --verify --deep --strict "$INNER"
xcrun stapler validate "$INNER"
hdiutil detach "$MOUNT"

echo "Notarization complete (submission $SUB_ID)."
rm -rf "$STAGING"

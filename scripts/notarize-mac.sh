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
# Submit first so we always get a submission id in the logs (first-time teams can take >30m).
SUBMIT_OUT=$(xcrun notarytool submit "$ZIP" "${AUTH[@]}" --output-format json)
echo "$SUBMIT_OUT"
SUB_ID=$(echo "$SUBMIT_OUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Submission id: $SUB_ID"
echo "Waiting for Apple (first notarization for a team can take 30–90+ minutes)…"

# 90m wait — notarytool exit 124 = timeout while still In Progress
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

echo "Rebuilding DMG/ZIP with stapled app…"
npx electron-builder --mac dmg zip --prepackaged "$(dirname "$APP")" --publish never

echo "Notarization complete (submission $SUB_ID)."
rm -rf "$STAGING"

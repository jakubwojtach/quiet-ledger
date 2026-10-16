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

echo "Submitting to Apple notary service (this can take several minutes)…"
# --wait blocks until Apple finishes; prints submission id + status
xcrun notarytool submit "$ZIP" \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_APP_SPECIFIC_PASSWORD" \
  --team-id "$APPLE_TEAM_ID" \
  --wait \
  --timeout 30m

echo "Stapling notarization ticket…"
xcrun stapler staple "$APP"
xcrun stapler validate "$APP"

# Re-pack DMG/ZIP so artifacts include the stapled app.
# electron-builder already produced dist/*.dmg and *.zip from pre-staple app —
# rebuild packaging only if build scripts exist; otherwise re-run electron-builder pack.
echo "Rebuilding DMG/ZIP with stapled app…"
npx electron-builder --mac dmg zip --prepackaged "$(dirname "$APP")" --publish never

echo "Notarization complete."
rm -rf "$STAGING"

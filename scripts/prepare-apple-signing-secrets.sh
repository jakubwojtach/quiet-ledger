#!/usr/bin/env bash
# Export Developer ID Application .p12 → base64 for GitHub secret CSC_LINK.
# Usage:
#   ./scripts/prepare-apple-signing-secrets.sh /path/to/DeveloperID.p12
set -euo pipefail

P12="${1:-}"
if [[ -z "$P12" || ! -f "$P12" ]]; then
  cat <<'EOF'
Export a Developer ID Application certificate first:

  1. Apple Developer → Certificates → "+" → Developer ID Application
  2. Keychain Access → My Certificates → "Developer ID Application: …"
     → right-click → Export… → .p12 (set a password)
  3. Run:
       ./scripts/prepare-apple-signing-secrets.sh ~/Desktop/developer-id.p12

Then create GitHub secrets (repo Settings → Secrets → Actions):

  CSC_LINK                     ← paste the base64 printed below
  CSC_KEY_PASSWORD             ← the .p12 password
  APPLE_ID                     ← your Apple ID email
  APPLE_APP_SPECIFIC_PASSWORD  ← appleid.apple.com → App-Specific Passwords
  APPLE_TEAM_ID                ← 10-char Team ID from developer.apple.com/account

EOF
  exit 1
fi

echo "=== CSC_LINK (base64 of $P12) ==="
base64 < "$P12" | tr -d '\n'
echo
echo
echo "Set with:"
echo "  gh secret set CSC_LINK < <(base64 < \"$P12\" | tr -d '\\n')"
echo "  gh secret set CSC_KEY_PASSWORD"
echo "  gh secret set APPLE_ID"
echo "  gh secret set APPLE_APP_SPECIFIC_PASSWORD"
echo "  gh secret set APPLE_TEAM_ID"

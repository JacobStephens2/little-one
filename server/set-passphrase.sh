#!/usr/bin/env bash
# Change the household passphrase for baby.stephens.page.
# Usage: ./set-passphrase.sh 'your new passphrase'
set -euo pipefail
cd "$(dirname "$0")"
[ $# -ge 1 ] || { echo "usage: $0 'new passphrase'"; exit 1; }
NEW="$*"
HASH=$(python3 -c "
import hashlib,os,sys
pw=sys.argv[1].encode(); it=200000; salt=os.urandom(16)
print(f'{it}\${salt.hex()}\${hashlib.pbkdf2_hmac(\"sha256\",pw,salt,it).hex()}')" "$NEW")
# Replace (or add) PASSWORD_HASH in .env
if grep -q '^PASSWORD_HASH=' .env; then
  sed -i "s|^PASSWORD_HASH=.*|PASSWORD_HASH=${HASH}|" .env
else
  echo "PASSWORD_HASH=${HASH}" >> .env
fi
sudo systemctl restart baby-tracker
echo "Passphrase updated and service restarted. Existing logins stay valid (token signing key unchanged)."

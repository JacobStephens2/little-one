# Android builds

Two Android wrappers of the PWA, installable side-by-side (distinct package IDs).
APKs are published on GitHub Releases, not committed.

## TWA — `page.stephens.littleone.twa` (recommended)
The PWA running in Chrome (Trusted Web Activity). Push, cookies, offline all work
exactly as in the browser; no app-code changes. Verified by
`public/.well-known/assetlinks.json` (from `frontend/static/`).

```bash
cd android-twa
export SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt
eval "$(sops -d --input-type dotenv --output-type dotenv ~/.config/baby/release-signing.env.sops | sed 's/^/export BUBBLEWRAP_/')"
unset ANDROID_HOME ANDROID_SDK_ROOT          # else AGP errors on conflicting SDK paths (uses Bubblewrap's own SDK)
printf '1.0.0\n' | bubblewrap update          # regenerate project from twa-manifest.json
bubblewrap build                              # -> app-release-signed.apk
```

## Capacitor — `page.stephens.littleone.cap` ("Little One (Cap)")
The PWA in a native WebView, with bundled offline assets. WebView is cross-origin
to the API, so the client uses **bearer-token** auth (api.ts detects Capacitor) and
the backend allows the localhost origin (CORS in `server/app.py`). **No Web Push**
in a WebView (native FCM is a later add).

```bash
cd frontend
npm run build                                 # build web assets into ../public
export JAVA_HOME=~/.bubblewrap/jdk/jdk-17.0.11+9 GRADLE_USER_HOME=/mnt/volume_nyc3_01/jacob/.gradle
export ANDROID_HOME=~/Android/Sdk ANDROID_SDK_ROOT=~/Android/Sdk
npx cap sync android
cd android && ./gradlew assembleRelease        # -> app/build/outputs/apk/release/app-release-unsigned.apk
# then: zipalign + apksigner sign with ~/.keystores/baby-release.jks (alias baby)
```

## Signing
Release keystore `~/.keystores/baby-release.jks` (alias `baby`); password encrypted
at `~/.config/baby/release-signing.env.sops`. Both APKs use this key (cert SHA-256
`23:A0:41:4F:…`), which is also the fingerprint in `assetlinks.json`.

iOS: needs a Mac/Xcode (not buildable on the Linux droplet). Capacitor is the
intended iOS path; the bearer-auth seam is already in place.

import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor wrapper (the "WebView" build, for comparison vs the TWA build).
// Bundles the built web assets (../public) and runs them in a native WebView.
// API calls are cross-origin to baby.stephens.page, so the app uses bearer-token
// auth (api.ts detects Capacitor) and the backend allows the localhost origin (CORS).
const config: CapacitorConfig = {
  appId: "page.stephens.littleone.cap",
  appName: "Little One (Cap)",
  webDir: "../public",
  android: {
    backgroundColor: "#fbf3e7",
  },
};

export default config;

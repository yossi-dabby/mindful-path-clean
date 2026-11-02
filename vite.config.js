import base44 from "@base44/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { execSync } from "child_process";

// Resolve build SHA: env vars first, then git, then a bounded dev fallback.
// This ensures the diagnostic badge never shows "unknown" in any build.
function resolveBuildSha() {
  const fromEnv = (process.env.GITHUB_SHA || process.env.VITE_BUILD_SHA || "").trim();
  if (fromEnv) return fromEnv.slice(0, 12);
  try {
    return execSync("git rev-parse --short=12 HEAD", { encoding: "utf8" }).trim();
  } catch (_) {
    // Not a git repo or git not available — use a date-based dev token so the
    // badge is always meaningful and never shows the literal string "unknown".
    return "dev-" + new Date().toISOString().slice(0, 10).replace(/-/g, "");
  }
}

const buildSha = resolveBuildSha();
const buildTimestamp = new Date().toISOString();

export default defineConfig({
  appType: "spa",
  logLevel: "error",
  optimizeDeps: {
    exclude: ["pdfjs-dist"],
  },

  // CI-only diagnostics (does not affect production users)
  build: {
    sourcemap: process.env.CI ? true : false,
    minify: process.env.CI ? false : "esbuild",
  },

  // Inject build metadata for runtime diagnostics (e.g. confirming which
  // bundle is loaded on Android Production via [PDF_VIEWER_MOUNTED] log).
  define: {
    __PDF_VIEWER_BUILD__: JSON.stringify(new Date().toISOString()),
    __S2_V8_BUILD_SHA__: JSON.stringify(buildSha),
    __S2_V8_BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
  },

  server: {
    headers: {
      // Restrict Permissions-Policy to only features the app uses,
      // omitting deprecated/unrecognised features (vr, ambient-light-sensor, battery)
      // that produce browser warnings when included.
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    },
  },

  plugins: [
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === "true",
      appBaseUrl: process.env.VITE_BASE44_AUTH_BASE_URL || undefined,
      hmrNotifier: true,
      navigationNotifier: true,
      visualEditAgent: true,
    }),
    react(),
  ],
});

/**
 * Bundler-safe placeholder.
 *
 * This folder previously held content that could not be bundled as a Base44
 * backend function (a markdown document, or a Playwright/spec module with
 * cross-boundary imports / unsupported dependencies). It is NOT a registered
 * or active backend function, so this stub changes no application behavior.
 *
 * The original entry.ts content is preserved verbatim in ./source.md
 * alongside this file. If this folder is intended to become a real backend
 * function, replace this stub with a proper Deno handler and register it.
 */
Deno.serve(() => new Response(JSON.stringify({ ok: true }), {
  headers: { "content-type": "application/json" },
}));

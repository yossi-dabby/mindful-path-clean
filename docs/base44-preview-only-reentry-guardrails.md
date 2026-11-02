# Base44 Preview-Only Re-entry Guardrails (Recovery Stage 4)

## Purpose

Prevent Base44/GitHub sync confusion by making edit authority explicit:

- **GitHub repository code is the only source of truth for code changes.**
- **Base44 is a preview/runtime surface only for this recovery stage.**

## Non-Negotiable Edit Flow

1. Make code changes in this repository only.
2. Open and merge a PR in GitHub.
3. Treat Base44 as runtime/preview verification only.
4. Do not treat Base44-side edits as authoritative code updates.

## Active Runtime Paths (Do Not Reinterpret)

### i18n runtime source

- Verified runtime i18n initialization path: `src/components/i18n/i18nConfig.jsx`
- Verified canonical translation object path: `src/components/i18n/translations.jsx`
- Verified runtime merge helper invoked by i18n init (not a separate source of truth): `src/components/i18n/translationsBuilder.jsx`

### Therapist chat runtime source

- Verified active route key: `Chat` in `src/pages.config.js`
- Verified runtime page component path: `src/pages/Chat.jsx`
- Verified route wiring path: `src/App.jsx` maps `Pages.Chat` to `"/Chat"`
- Verified active message-list path for therapist chat runtime: `src/components/chat/MessageList.jsx`

## Ambiguity Guardrail

If similarly named files or legacy-looking paths exist elsewhere, do not switch runtime ownership assumptions without explicit approval. Runtime ownership for this stage is defined by the paths listed above.

## Scope Guardrail for Stage 4

- No feature work
- No chat behavior changes
- No AI behavior changes
- No attachment-contract changes
- No unrelated cleanup/deletions

*Last updated: 2026-04-20*

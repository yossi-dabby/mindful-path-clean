# Lucide icon inventory reports

This directory holds generated inventories of `lucide-react` imports found across `src/**/*.{js,jsx,ts,tsx}`.

## Files

| File | Description |
|---|---|
| `lucide-icons.json` | Sorted, de-duplicated list of **local** icon identifiers used in code (includes aliases, e.g. `CalendarIcon`). |
| `lucide-icons-by-file.json` | Map of `filePath → [{ imported, local }]` for every `lucide-react` import found, sorted by file path. |

## Inventory type

**Imports only** — this inventory records what is imported, not what is rendered in JSX. It is fast, deterministic, and dependency-free.

## How to regenerate

### Via GitHub Actions (recommended)

1. Go to **Actions → Lucide Icon Inventory**.
2. Click **Run workflow** and select the target branch.
3. The workflow runs `npm run inventory:lucide`, commits any changes to `reports/`, and uploads the files as an artifact.

### Locally

```bash
npm run inventory:lucide
```

Reports are written to `reports/lucide-icons.json` and `reports/lucide-icons-by-file.json`.

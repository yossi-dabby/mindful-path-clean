# Internationalization (i18n) Guidelines

## Overview
This application supports multi-language functionality using `react-i18next`. All user-facing text must be externalized to translation files.
Runtime source-of-truth is `src/components/i18n/translations.jsx` (via `i18nConfig.jsx`).

## Supported Languages
- English (en) - Default
- Hebrew (he) - RTL support
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)

## Core Rules

### 1. Never Hardcode User-Facing Strings
❌ WRONG: `<button>Save Changes</button>`
✅ CORRECT: `<button>{t('common.save')}</button>`

### 2. Translation Key Convention
Use dot notation: `page.section.element`
Examples: `settings.profile.title`, `exercises.categories.breathing`

### 3. Add Keys to ALL Language Files
When adding new keys, add them in all 7 language blocks in `translations.jsx`:
`en`, `he`, `es`, `fr`, `de`, `it`, `pt`.

## Component Pattern
```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('page.title')}</h1>;
}
```

## E2E Test Resilience
Use `data-testid` instead of text selectors:
```jsx
<button data-testid="save-button">{t('common.save')}</button>

// Test: await page.getByTestId('save-button').click();
```

## Critical Elements to Annotate
- Buttons for actions (save, delete, submit)
- Navigation links (`data-testid="home-nav-link"`)
- Form inputs
- Modal triggers

## Resources
- Runtime translations: `src/components/i18n/translations.jsx`
- Language selector: Settings page
- RTL: Auto-applied for Hebrew

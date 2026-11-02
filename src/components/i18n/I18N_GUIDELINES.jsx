// eslint-disable-next-line
export default `# Internationalization (i18n) Guidelines

## Overview
This application supports multi-language functionality using react-i18next. All user-facing text must be externalized to translation files.

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

### 2. Translation Key Convention
Use dot notation: page.section.element

### 3. Add Keys to ALL Language Files
When adding to en.json, also add to: he.json, es.json, fr.json, de.json, it.json, pt.json

## Resources
- Translation files: components/i18n/translations/
- Language selector: Settings page
- RTL: Auto-applied for Hebrew
`;
# i18n Keys — Super CBT Agent

> **Status:** Added — Additive only. No existing keys modified or removed.
> **File:** `src/components/i18n/translations.jsx`
> **PR:** i18n: Add and document new translation keys for Super CBT Agent

---

## Overview

This document lists all new i18n keys added to support the SuperCbtAgent feature.
All keys live under the `chat.super_cbt_agent` namespace and are **additive only** —
no existing translation keys were modified or removed.

All 7 supported app languages are covered: `en`, `he`, `es`, `fr`, `de`, `it`, `pt`.

---

## Key Inventory

### Namespace: `chat.super_cbt_agent`

| Key | Description | Notes |
|-----|-------------|-------|
| `label` | Short display label for the Super CBT Agent indicator | Shown in session UI |
| `accessible_label` | ARIA-accessible label for screen readers | Used as `aria-label` |
| `mode_label` | Label for the advanced CBT mode | Shown in mode indicator |
| `protocol_label` | Label for the evidence-based CBT protocol | Shown in session info |
| `status_active` | Text shown when agent is active | e.g. "Active" |
| `status_inactive` | Text shown when agent is inactive | e.g. "Inactive" |
| `session_intro` | Session intro/welcome message for the super agent | Shown at session start |
| `multilingual_notice` | Notice confirming full multilingual support is active | Informational UI |

---

## Translations

### English (`en`)

```json
{
  "chat": {
    "super_cbt_agent": {
      "label": "Super CBT Agent",
      "accessible_label": "Super CBT Agent is active",
      "mode_label": "Advanced CBT Mode",
      "protocol_label": "Evidence-Based CBT Protocol",
      "status_active": "Active",
      "status_inactive": "Inactive",
      "session_intro": "Your session is powered by the advanced CBT Agent with full multilingual support.",
      "multilingual_notice": "Full multilingual CBT support is active."
    }
  }
}
```

### Hebrew (`he`)

```json
{
  "chat": {
    "super_cbt_agent": {
      "label": "סוכן CBT מתקדם",
      "accessible_label": "סוכן CBT מתקדם פעיל",
      "mode_label": "מצב CBT מתקדם",
      "protocol_label": "פרוטוקול CBT מבוסס-ראיות",
      "status_active": "פעיל",
      "status_inactive": "לא פעיל",
      "session_intro": "המפגש שלך מופעל על ידי סוכן ה-CBT המתקדם עם תמיכה רב-לשונית מלאה.",
      "multilingual_notice": "תמיכה מלאה ב-CBT רב-לשוני פעילה."
    }
  }
}
```

### Spanish (`es`)

```json
{
  "chat": {
    "super_cbt_agent": {
      "label": "Super Agente TCC",
      "accessible_label": "Super Agente TCC está activo",
      "mode_label": "Modo TCC Avanzado",
      "protocol_label": "Protocolo TCC basado en evidencia",
      "status_active": "Activo",
      "status_inactive": "Inactivo",
      "session_intro": "Tu sesión está impulsada por el agente TCC avanzado con soporte multilingüe completo.",
      "multilingual_notice": "El soporte TCC multilingüe completo está activo."
    }
  }
}
```

### French (`fr`)

```json
{
  "chat": {
    "super_cbt_agent": {
      "label": "Super Agent TCC",
      "accessible_label": "Super Agent TCC est actif",
      "mode_label": "Mode TCC Avancé",
      "protocol_label": "Protocole TCC basé sur les données probantes",
      "status_active": "Actif",
      "status_inactive": "Inactif",
      "session_intro": "Votre séance est alimentée par l'agent TCC avancé avec support multilingue complet.",
      "multilingual_notice": "Le support TCC multilingue complet est actif."
    }
  }
}
```

### German (`de`)

```json
{
  "chat": {
    "super_cbt_agent": {
      "label": "Super-KVT-Agent",
      "accessible_label": "Super-KVT-Agent ist aktiv",
      "mode_label": "Erweiterter KVT-Modus",
      "protocol_label": "Evidenzbasiertes KVT-Protokoll",
      "status_active": "Aktiv",
      "status_inactive": "Inaktiv",
      "session_intro": "Ihre Sitzung wird vom erweiterten KVT-Agenten mit vollständiger mehrsprachiger Unterstützung gespeist.",
      "multilingual_notice": "Vollständige mehrsprachige KVT-Unterstützung ist aktiv."
    }
  }
}
```

### Italian (`it`)

```json
{
  "chat": {
    "super_cbt_agent": {
      "label": "Super Agente TCC",
      "accessible_label": "Super Agente TCC è attivo",
      "mode_label": "Modalità TCC Avanzata",
      "protocol_label": "Protocollo TCC basato sull'evidenza",
      "status_active": "Attivo",
      "status_inactive": "Inattivo",
      "session_intro": "La tua sessione è alimentata dall'agente TCC avanzato con supporto multilingue completo.",
      "multilingual_notice": "Il supporto TCC multilingue completo è attivo."
    }
  }
}
```

### Portuguese (`pt`)

```json
{
  "chat": {
    "super_cbt_agent": {
      "label": "Super Agente TCC",
      "accessible_label": "Super Agente TCC está ativo",
      "mode_label": "Modo TCC Avançado",
      "protocol_label": "Protocolo TCC baseado em evidências",
      "status_active": "Ativo",
      "status_inactive": "Inativo",
      "session_intro": "Sua sessão é alimentada pelo agente TCC avançado com suporte multilíngue completo.",
      "multilingual_notice": "O suporte TCC multilíngue completo está ativo."
    }
  }
}
```

---

## Usage Notes

- All keys are under `chat.super_cbt_agent` to avoid collision with existing `chat.*` keys.
- The `label` and `accessible_label` keys follow the same pattern as `chat.session_phase_indicator` and `chat.safety_mode_indicator`.
- The `status_active` / `status_inactive` pair is for the SuperCbtAgent feature-flag indicator component.
- The `session_intro` and `multilingual_notice` strings are for display at session start when the super agent is active.
- No TODO markers required: all 7 languages have full translations.

---

## Safety Rules Applied

- ✅ All additions are purely additive — no existing key was removed or modified.
- ✅ All 7 app languages are covered with non-empty values.
- ✅ Keys follow existing naming conventions (`snake_case`, nested under `chat`).
- ✅ No agent wiring, entity schemas, or safety-critical files were touched.
- ✅ Existing tests continue to pass (3124+ tests verified).

---

## Test Coverage

A dedicated test file validates these keys:

**File:** `test/utils/superCbtAgentI18n.test.js`

Tests verify:
1. `chat.super_cbt_agent` section exists in all 7 languages.
2. All 8 required keys are present and non-empty in all 7 languages.
3. English baseline values match expected strings.
4. Hebrew translation contains Hebrew characters (non-Latin check).
5. Existing `chat.session_phase_indicator` and `chat.safety_mode_indicator` keys are unchanged (regression guard).

---

## Related Files

| File | Change |
|------|--------|
| `src/components/i18n/translations.jsx` | Added `chat.super_cbt_agent` block to all 7 language sections |
| `test/utils/superCbtAgentI18n.test.js` | New test file validating all new keys |
| `docs/i18n-super-agent.md` | This documentation file |

---

*Last updated: 2026-04-08*

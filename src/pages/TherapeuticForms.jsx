import BotanicalAccent from '@/components/brand/BotanicalAccent';
import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { SUPPORTED_LANGUAGES, ALL_FORMS, resolveFormWithLanguage } from '@/data/therapeuticForms/index.js';
import { downloadPdfFile } from '@/components/chat/utils/downloadPdfFile';
import { getFormDownloadUrl, PDF_VIEWER_ROUTE_PATH } from '@/components/chat/utils/formFileUrls';
import { resolveWorksheetFileUrl } from '@/components/chat/utils/worksheetFileResolver';
import { useTranslation } from 'react-i18next';
import FormsCollectionCard from '@/components/forms/FormsCollectionCard';
import FormsModuleCard from '@/components/forms/FormsModuleCard';
import FormsWorksheetCard from '@/components/forms/FormsWorksheetCard';
import FormsBreadcrumb from '@/components/forms/FormsBreadcrumb';
import FormsViewModeToggle, { FORMS_VIEW_MODES } from '@/components/forms/FormsViewModeToggle';
import FormsNavigationControls from '@/components/forms/FormsNavigationControls';
import FormsCombinedPdfCard from '@/components/forms/FormsCombinedPdfCard';
import {
  THERAPEUTIC_FORMS_CONTENT_AVAILABLE,
  getTherapeuticFormsAvailabilityCopy,
} from '@/data/therapeuticForms/availability.js';

const AUDIENCE_ORDER = ['children', 'adolescents', 'adults', 'older_adults'];
const COLLECTION_TYPE_ORDER = { core: 0, specialized: 1 };
export const FORMS_VIEW_MODE_STORAGE_KEY = 'mindfulPath.formsLibrary.viewMode';
export const DEFAULT_FORMS_VIEW_MODE = 'medium';

function getDefaultFormsNavigationState() {
  return {
    history: [{ collectionId: null, moduleId: null }],
    index: 0,
  };
}

function areFormsNavigationStatesEqual(left, right) {
  if (!left || !right) return left === right;
  if (left.index !== right.index) return false;
  if (!Array.isArray(left.history) || !Array.isArray(right.history)) return false;
  if (left.history.length !== right.history.length) return false;
  return left.history.every((entry, index) => {
    const otherEntry = right.history[index];
    return entry?.collectionId === otherEntry?.collectionId && entry?.moduleId === otherEntry?.moduleId;
  });
}

function areFormsViewerStatesEqual(left, right) {
  if (!left || !right) return left === right;
  return left.source === right.source &&
    left.selectedAudience === right.selectedAudience &&
    left.selectedCollectionId === right.selectedCollectionId &&
    left.selectedModuleId === right.selectedModuleId &&
    areFormsNavigationStatesEqual(left.navigationState, right.navigationState);
}

function getRestoredFormsViewerState(locationState) {
  const candidate = locationState?.pdfViewerReturn;
  if (candidate?.source !== 'therapeutic-forms') return null;

  const history = Array.isArray(candidate.navigationState?.history)
    ? candidate.navigationState.history.map((entry) => ({
      collectionId: entry?.collectionId ?? null,
      moduleId: entry?.moduleId ?? null,
    }))
    : getDefaultFormsNavigationState().history;

  const rawIndex = Number(candidate.navigationState?.index);
  const boundedIndex = Number.isInteger(rawIndex)
    ? Math.min(Math.max(rawIndex, 0), history.length - 1)
    : history.length - 1;

  return {
    selectedAudience: candidate.selectedAudience ?? null,
    selectedCollectionId: candidate.selectedCollectionId ?? history[boundedIndex]?.collectionId ?? null,
    selectedModuleId: candidate.selectedModuleId ?? history[boundedIndex]?.moduleId ?? null,
    navigationState: {
      history,
      index: boundedIndex,
    },
  };
}

function isValidViewMode(mode) {
  return FORMS_VIEW_MODES.includes(mode);
}

export function getInitialFormsViewMode() {
  if (typeof window === 'undefined') return DEFAULT_FORMS_VIEW_MODE;
  try {
    const stored = window.localStorage.getItem(FORMS_VIEW_MODE_STORAGE_KEY);
    return isValidViewMode(stored) ? stored : DEFAULT_FORMS_VIEW_MODE;
  } catch {
    return DEFAULT_FORMS_VIEW_MODE;
  }
}

function getGridClassForViewMode(viewMode) {
  const gridByMode = {
    large: 'grid grid-cols-1 md:grid-cols-2 gap-8',
    medium: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
    compact: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3',
    list: 'grid grid-cols-1 gap-3',
    tiles: 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3',
  };
  return gridByMode[viewMode] || gridByMode.medium;
}

export function normalizeLanguageCode(language) {
  if (typeof language !== 'string' || !language.trim()) return 'en';
  const base = language.trim().toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(base) ? base : 'en';
}

export function hasValidPublicFormsUrl(fileUrl) {
  return typeof fileUrl === 'string' && fileUrl.trim().startsWith('/forms/');
}

export function resolveLibraryFormWithLanguage(form, lang) {
  const resolved = resolveFormWithLanguage(form.id, lang);
  if (!resolved) return null;
  return resolved;
}

function warnLanguageMismatch(form, lang, reason) {
  if (!import.meta.env?.DEV) return;
  console.warn(`[TherapeuticForms] Excluding form "${form?.id || 'unknown'}" for lang "${lang}": ${reason}`);
}

function hasValidLanguageMatch(resolved, lang) {
  if (!resolved?.form || !resolved?.languageData) return false;
  const { form, language, languageData } = resolved;
  if (language !== lang) {
    warnLanguageMismatch(form, lang, `resolved language "${language}" does not match active language`);
    return false;
  }
  if (form.language && form.language !== lang) {
    warnLanguageMismatch(form, lang, `form.language "${form.language}" does not match active language`);
    return false;
  }
  if (!form.languages?.[lang]) {
    warnLanguageMismatch(form, lang, 'no exact language block found');
    return false;
  }
  const fileUrl = String(languageData.file_url || '').trim();
  if (!hasValidPublicFormsUrl(fileUrl)) {
    warnLanguageMismatch(form, lang, `file_url "${fileUrl}" is not a public forms path`);
    return false;
  }
  return true;
}

function toNumberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getModuleSignature(form) {
  const moduleNumber = toNumberOrNull(form?.moduleNumber ?? form?.stageNumber);
  if (moduleNumber != null) return `module:${moduleNumber}`;

  const formNumberParts = String(form?.formNumber || '').split('.').map((part) => part.trim()).filter(Boolean);
  if (formNumberParts.length >= 3) return `series:${formNumberParts[0]}.${formNumberParts[1]}`;
  if (formNumberParts.length >= 2) return `stage:${formNumberParts[0]}`;
  return null;
}

function getLocalizedField(form, lang, field) {
  const localized = form?.localizedDisplay?.[lang]?.[field];
  if (typeof localized === 'string' && localized.trim()) return localized.trim();
  const langValue = form?.languages?.[lang]?.[field];
  if (typeof langValue === 'string' && langValue.trim()) return langValue.trim();
  if (field === 'title' && lang !== 'he') {
    const fallback = form?.title;
    if (typeof fallback === 'string' && fallback.trim()) return fallback.trim();
  }
  if (field === 'description' && lang !== 'he') {
    const fallback = form?.description;
    if (typeof fallback === 'string' && fallback.trim()) return fallback.trim();
  }
  return '';
}

const FORMS_PAGE_LABELS = Object.freeze({
  en: Object.freeze({ allForms: 'All forms', collection: 'Collection', collectionFallback: 'Therapeutic Forms Collection', browse: 'Browse', viewWorksheets: 'View worksheets', worksheet: 'Worksheet', core: 'Core', specialized: 'Specialized', chat: 'Go to chat', callout: 'Not sure which form to choose? Ask the AI therapist to recommend the right worksheet based on the client’s need.' }),
  he: Object.freeze({ allForms: 'כל הטפסים', collection: 'סדרה', collectionFallback: 'סדרת טפסים טיפוליים', browse: 'עיין בסדרה', viewWorksheets: 'הצג טפסים', worksheet: 'טופס', core: 'ליבה', specialized: 'ייעודי', chat: 'לצ׳אט', callout: 'לא בטוחים איזה טופס לבחור? אפשר לבקש מהמטפל ב־AI להמליץ על הטופס המתאים לפי הצורך.' }),
  es: Object.freeze({ allForms: 'Todos los formularios', collection: 'Colección', collectionFallback: 'Colección de formularios terapéuticos', browse: 'Explorar', viewWorksheets: 'Ver formularios', worksheet: 'Formulario', core: 'Central', specialized: 'Especializado', chat: 'Ir al chat', callout: '¿No sabes qué formulario elegir? Pide al terapeuta de IA que recomiende el más adecuado según la necesidad.' }),
  fr: Object.freeze({ allForms: 'Tous les formulaires', collection: 'Collection', collectionFallback: 'Collection de formulaires thérapeutiques', browse: 'Parcourir', viewWorksheets: 'Voir les formulaires', worksheet: 'Formulaire', core: 'Fondamental', specialized: 'Spécialisé', chat: 'Aller au chat', callout: 'Vous ne savez pas quel formulaire choisir ? Demandez au thérapeute IA de recommander le plus adapté au besoin.' }),
  de: Object.freeze({ allForms: 'Alle Formulare', collection: 'Sammlung', collectionFallback: 'Sammlung therapeutischer Formulare', browse: 'Durchsuchen', viewWorksheets: 'Formulare anzeigen', worksheet: 'Formular', core: 'Kern', specialized: 'Spezialisiert', chat: 'Zum Chat', callout: 'Unsicher, welches Formular passt? Bitte den KI-Therapeuten um eine Empfehlung passend zum Bedarf.' }),
  it: Object.freeze({ allForms: 'Tutti i moduli', collection: 'Raccolta', collectionFallback: 'Raccolta di moduli terapeutici', browse: 'Esplora', viewWorksheets: 'Visualizza i moduli', worksheet: 'Modulo', core: 'Base', specialized: 'Specializzato', chat: 'Vai alla chat', callout: 'Non sai quale modulo scegliere? Chiedi al terapeuta IA di consigliare quello più adatto alla necessità.' }),
  pt: Object.freeze({ allForms: 'Todos os formulários', collection: 'Coleção', collectionFallback: 'Coleção de formulários terapêuticos', browse: 'Explorar', viewWorksheets: 'Ver formulários', worksheet: 'Formulário', core: 'Central', specialized: 'Especializado', chat: 'Ir para o chat', callout: 'Não sabe qual formulário escolher? Peça ao terapeuta de IA uma recomendação adequada à necessidade.' }),
});

const MODULE_LABELS = Object.freeze({
  en: Object.freeze({ module: 'Module', stage: 'Stage' }),
  he: Object.freeze({ module: 'מודול', stage: 'שלב' }),
  es: Object.freeze({ module: 'Módulo', stage: 'Etapa' }),
  fr: Object.freeze({ module: 'Module', stage: 'Étape' }),
  de: Object.freeze({ module: 'Modul', stage: 'Stufe' }),
  it: Object.freeze({ module: 'Modulo', stage: 'Fase' }),
  pt: Object.freeze({ module: 'Módulo', stage: 'Etapa' }),
});

function getModuleLabel(lang, type, number = null) {
  const labels = MODULE_LABELS[normalizeLanguageCode(lang)] || MODULE_LABELS.en;
  const label = labels[type] || MODULE_LABELS.en[type];
  return number == null ? label : `${label} ${number}`;
}

function buildModuleFallbackTitle(module, lang) {
  const number = module.stageNumber ?? module.moduleNumber;
  return getModuleLabel(lang, number == null ? 'module' : 'stage', number);
}

export function getLanguageVisibleForms(lang) {
  const normalizedLang = normalizeLanguageCode(lang);
  return ALL_FORMS
    .filter((form) => form.approved === true)
    .filter((form) => form.languages?.[normalizedLang])
    .map((form) => resolveLibraryFormWithLanguage(form, normalizedLang))
    .filter((resolved) => hasValidLanguageMatch(resolved, normalizedLang));
}

export function buildCollectionsFromForms(resolvedForms) {
  const grouped = new Map();

  for (const resolved of resolvedForms) {
    const collectionId = String(resolved?.form?.collectionId || '').trim();
    if (!collectionId) continue;
    if (!grouped.has(collectionId)) {
      grouped.set(collectionId, {
        collectionId,
        language: resolved.form.language,
        audience: resolved.form.audience,
        category: resolved.form.category,
        collectionType: resolved.form.collectionType || 'core',
        forms: [],
      });
    }
    grouped.get(collectionId).forms.push(resolved);
  }

  return Array.from(grouped.values())
    .map((collection) => {
      const representativeForm =
        collection.forms.find((item) => item.form.cardType === 'workbook_package') ||
        collection.forms.find((item) => item.form.cardType === 'combined_pdf') ||
        collection.forms[0];

      const worksheetCount = collection.forms.filter((item) => item.form.cardType === 'worksheet').length;
      const combinedCount = collection.forms.filter((item) => item.form.cardType === 'combined_pdf').length;
      const moduleCount = buildModulesFromCollectionForms(collection.forms, collection.language).length;
      const minDisplayOrder = Math.min(...collection.forms.map((item) => Number(item.form.displayOrder || 9999)));

      return {
        ...collection,
        representativeForm,
        worksheetCount,
        combinedCount,
        moduleCount,
        displayOrder: Number.isFinite(minDisplayOrder) ? minDisplayOrder : 9999,
      };
    })
    .sort((a, b) => {
      const byAudience = (AUDIENCE_ORDER.indexOf(a.audience) === -1 ? 999 : AUDIENCE_ORDER.indexOf(a.audience)) -
        (AUDIENCE_ORDER.indexOf(b.audience) === -1 ? 999 : AUDIENCE_ORDER.indexOf(b.audience));
      if (byAudience !== 0) return byAudience;
      const byType = (COLLECTION_TYPE_ORDER[a.collectionType] ?? 9) - (COLLECTION_TYPE_ORDER[b.collectionType] ?? 9);
      if (byType !== 0) return byType;
      return a.displayOrder - b.displayOrder;
    });
}

export function getAudienceOptionsFromCollections(collections) {
  return AUDIENCE_ORDER.filter((audience) => collections.some((collection) => collection.audience === audience));
}

export function buildModulesFromCollectionForms(collectionForms, lang) {
  const forms = collectionForms
    .filter((entry) => entry.form.cardType === 'worksheet' || entry.form.cardType === 'combined_pdf')
    .sort((a, b) => Number(a.form.displayOrder || 9999) - Number(b.form.displayOrder || 9999));

  const modulesByKey = new Map();
  const keysBySignature = new Map();

  const ensureModule = (key, form) => {
    if (!modulesByKey.has(key)) {
      modulesByKey.set(key, {
        id: key,
        moduleNumber: toNumberOrNull(form.moduleNumber),
        stageNumber: toNumberOrNull(form.stageNumber),
        moduleTitle: '',
        combinedTitle: '',
        clinicalDomain: form.clinicalDomain || '',
        worksheetEntries: [],
        combinedEntries: [],
        sortOrder: Number(form.displayOrder || 9999),
      });
    }

    const module = modulesByKey.get(key);
    const newSortOrder = Number(form.displayOrder || 9999);
    if (newSortOrder < module.sortOrder) module.sortOrder = newSortOrder;
    if (!module.moduleNumber) module.moduleNumber = toNumberOrNull(form.moduleNumber);
    if (!module.stageNumber) module.stageNumber = toNumberOrNull(form.stageNumber);
    if (!module.clinicalDomain && form.clinicalDomain) module.clinicalDomain = form.clinicalDomain;
    return module;
  };

  const registerSignature = (signature, key) => {
    if (!signature) return;
    if (!keysBySignature.has(signature)) keysBySignature.set(signature, new Set());
    keysBySignature.get(signature).add(key);
  };

  for (const entry of forms) {
    const { form } = entry;
    const signature = getModuleSignature(form);
    const preferredParentKey = form.parentId ? `parent:${form.parentId}` : null;
    const fallbackSignatureKey = signature ? `signature:${signature}` : `entry:${form.id}`;

    let resolvedKey = preferredParentKey || fallbackSignatureKey;

    if (!form.parentId && signature && keysBySignature.has(signature)) {
      const candidateKeys = Array.from(keysBySignature.get(signature));
      if (candidateKeys.length === 1) {
        resolvedKey = candidateKeys[0];
      }
    }

    const module = ensureModule(resolvedKey, form);
    registerSignature(signature, resolvedKey);

    const moduleTitle = String(form.moduleTitle || form.stageTitle || '').trim();
    if (moduleTitle && !module.moduleTitle) module.moduleTitle = moduleTitle;

    if (form.cardType === 'combined_pdf') {
      const combinedTitle = getLocalizedField(form, lang, 'title');
      if (combinedTitle && !module.combinedTitle) module.combinedTitle = combinedTitle;
      module.combinedEntries.push(entry);
    } else {
      module.worksheetEntries.push(entry);
    }
  }

  return Array.from(modulesByKey.values())
    .map((module) => {
      const title = module.combinedTitle || module.moduleTitle || buildModuleFallbackTitle(module, lang);
      return {
        id: module.id,
        title,
        numberLabel: module.stageNumber || module.moduleNumber
          ? getModuleLabel(lang, 'stage', module.stageNumber || module.moduleNumber)
          : '',
        stageNumber: module.stageNumber,
        moduleNumber: module.moduleNumber,
        worksheetCount: module.worksheetEntries.length,
        worksheetEntries: module.worksheetEntries.sort((a, b) => Number(a.form.displayOrder || 9999) - Number(b.form.displayOrder || 9999)),
        combinedForm: module.combinedEntries[0] || null,
        combinedCount: module.combinedEntries.length,
        clinicalDomain: module.clinicalDomain,
        sortOrder: module.sortOrder,
      };
    })
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      const aNumber = a.stageNumber || a.moduleNumber || 999;
      const bNumber = b.stageNumber || b.moduleNumber || 999;
      return aNumber - bNumber;
    });
}

function formatClinicalDomain(clinicalDomain) {
  if (!clinicalDomain) return '';
  return String(clinicalDomain)
    .split('_')
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === 'cbt') return 'CBT';
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function getWorksheetTags({ worksheet, module, t, lang }) {
  const tags = [];

  const categoryKey = `therapeutic_forms.category.${worksheet.form.category}`;
  const categoryLabel = t(categoryKey);
  if (categoryLabel && categoryLabel !== categoryKey) tags.push(categoryLabel);

  const secondary = Array.isArray(worksheet.form.secondaryCategories) ? worksheet.form.secondaryCategories : [];
  for (const key of secondary) {
    const labelKey = `therapeutic_forms.category.${key}`;
    const translated = t(labelKey);
    if (translated && translated !== labelKey) tags.push(translated);
    if (tags.length >= 3) break;
  }

  if (lang !== 'he' && module?.clinicalDomain) {
    tags.push(formatClinicalDomain(module.clinicalDomain));
  }

  return Array.from(new Set(tags)).slice(0, 3);
}

function TherapeuticFormsLibrary() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const lang = normalizeLanguageCode(i18n.resolvedLanguage || i18n.language || 'en');
  const uiLabels = FORMS_PAGE_LABELS[lang] || FORMS_PAGE_LABELS.en;
  const isRtl = i18n.dir ? i18n.dir() === 'rtl' : lang === 'he';
  const restoredViewerState = getRestoredFormsViewerState(location.state);

  const visibleForms = useMemo(() => getLanguageVisibleForms(lang), [lang]);
  const collections = useMemo(() => buildCollectionsFromForms(visibleForms), [visibleForms]);
  const availableAudiences = useMemo(() => getAudienceOptionsFromCollections(collections), [collections]);

  const [viewMode, setViewMode] = useState(getInitialFormsViewMode);
  const [selectedAudience, setSelectedAudience] = useState(restoredViewerState?.selectedAudience ?? null);
  const [selectedCollectionId, setSelectedCollectionId] = useState(restoredViewerState?.selectedCollectionId ?? null);
  const [selectedModuleId, setSelectedModuleId] = useState(restoredViewerState?.selectedModuleId ?? null);
  const [navigationState, setNavigationState] = useState(
    restoredViewerState?.navigationState ?? getDefaultFormsNavigationState()
  );

  const updateCurrentNavigationState = (collectionId, moduleId) => {
    setNavigationState((previous) => {
      const current = previous.history[previous.index] || { collectionId: null, moduleId: null };
      if (current.collectionId === collectionId && current.moduleId === moduleId) return previous;
      const nextHistory = [...previous.history];
      nextHistory[previous.index] = { collectionId, moduleId };
      return { ...previous, history: nextHistory };
    });
  };

  const pushNavState = (collectionId, moduleId) => {
    const nextState = { collectionId, moduleId };
    setNavigationState((previous) => {
      const trimmed = previous.history.slice(0, previous.index + 1);
      const last = trimmed[trimmed.length - 1];
      if (last?.collectionId === nextState.collectionId && last?.moduleId === nextState.moduleId) return previous;
      const nextHistory = [...trimmed, nextState];
      return { history: nextHistory, index: nextHistory.length - 1 };
    });
  };

  const resetNavState = () => {
    setNavigationState(getDefaultFormsNavigationState());
  };

  const navigateToCollection = (collectionId) => {
    setSelectedCollectionId(collectionId);
    setSelectedModuleId(null);
    pushNavState(collectionId, null);
  };

  const navigateToModule = (moduleId) => {
    setSelectedModuleId(moduleId);
    pushNavState(selectedCollectionId, moduleId);
  };

  const handleNavBack = () => {
    if (navigationState.index <= 0) return;
    const nextIndex = navigationState.index - 1;
    const target = navigationState.history[nextIndex];
    setNavigationState((previous) => ({ ...previous, index: nextIndex }));
    setSelectedCollectionId(target?.collectionId ?? null);
    setSelectedModuleId(target?.moduleId ?? null);
  };

  const handleNavForward = () => {
    if (navigationState.index >= navigationState.history.length - 1) return;
    const nextIndex = navigationState.index + 1;
    const target = navigationState.history[nextIndex];
    setNavigationState((previous) => ({ ...previous, index: nextIndex }));
    setSelectedCollectionId(target?.collectionId ?? null);
    setSelectedModuleId(target?.moduleId ?? null);
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(FORMS_VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {
      // no-op
    }
  }, [viewMode]);

  useEffect(() => {
    const nextViewerState = {
      source: 'therapeutic-forms',
      selectedAudience,
      selectedCollectionId,
      selectedModuleId,
      navigationState,
    };
    const currentViewerState = location.state?.pdfViewerReturn?.source === 'therapeutic-forms'
      ? location.state.pdfViewerReturn
      : null;

    if (areFormsViewerStatesEqual(currentViewerState, nextViewerState)) return;

    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: {
        ...(location.state || {}),
        pdfViewerReturn: nextViewerState,
      },
    });
  }, [
    location.hash,
    location.pathname,
    location.search,
    location.state,
    navigate,
    navigationState,
    selectedAudience,
    selectedCollectionId,
    selectedModuleId,
  ]);

  useEffect(() => {
    if (!availableAudiences.length) {
      setSelectedAudience(null);
      return;
    }
    if (!selectedAudience || !availableAudiences.includes(selectedAudience)) {
      setSelectedAudience(availableAudiences[0]);
    }
  }, [availableAudiences, selectedAudience]);

  const filteredCollections = useMemo(() => {
    if (!selectedAudience) return [];
    return collections.filter((collection) => collection.audience === selectedAudience);
  }, [collections, selectedAudience]);

  useEffect(() => {
    if (!selectedCollectionId) return;
    if (!filteredCollections.some((collection) => collection.collectionId === selectedCollectionId)) {
      setSelectedCollectionId(null);
      setSelectedModuleId(null);
      updateCurrentNavigationState(null, null);
    }
  }, [filteredCollections, selectedCollectionId]);

  const selectedCollection = useMemo(
    () => filteredCollections.find((collection) => collection.collectionId === selectedCollectionId) || null,
    [filteredCollections, selectedCollectionId]
  );

  const modules = useMemo(() => {
    if (!selectedCollection) return [];
    return buildModulesFromCollectionForms(selectedCollection.forms, lang);
  }, [selectedCollection, lang]);

  useEffect(() => {
    if (!selectedModuleId) return;
    if (!modules.some((module) => module.id === selectedModuleId)) {
      setSelectedModuleId(null);
      updateCurrentNavigationState(selectedCollectionId, null);
    }
  }, [modules, selectedCollectionId, selectedModuleId]);

  const selectedModule = useMemo(
    () => modules.find((module) => module.id === selectedModuleId) || null,
    [modules, selectedModuleId]
  );

  const collectionCards = filteredCollections.map((collection) => {
    const categoryKey = `therapeutic_forms.category.${collection.category}`;
    const translatedCategory = t(categoryKey);
    const collectionTitle = translatedCategory !== categoryKey
      ? translatedCategory
      : getLocalizedField(collection.representativeForm?.form, lang, 'title') || uiLabels.collectionFallback;

    return {
      ...collection,
      title: collectionTitle,
    };
  });

  const breadcrumbs = [
    {
      label: uiLabels.allForms,
      onClick: selectedCollection ? () => {
        setSelectedCollectionId(null);
        setSelectedModuleId(null);
        pushNavState(null, null);
      } : null,
    },
  ];

  if (selectedCollection) {
    const selectedCollectionCard = collectionCards.find((collection) => collection.collectionId === selectedCollection.collectionId);
    breadcrumbs.push({
      label: selectedCollectionCard?.title || uiLabels.collection,
      onClick: selectedModule ? () => {
        setSelectedModuleId(null);
        pushNavState(selectedCollection.collectionId, null);
      } : null,
    });
  }

  if (selectedModule) {
    breadcrumbs.push({ label: selectedModule.title });
  }

  const handleOpenForm = (fileUrl) => {
    if (!fileUrl || typeof fileUrl !== 'string') return;
    console.log('[PDF_OPEN_CLICKED]', { fileUrl: fileUrl.trim() });
    const targetUrl = `${PDF_VIEWER_ROUTE_PATH}?file=${encodeURIComponent(fileUrl.trim())}`;
    console.log('[PDF_VIEWER_NAVIGATE]', { targetUrl });
    // Navigate same-tab to the in-app PDF viewer route.
    // PdfViewer handles resolution for both static /forms/ paths and private file refs.
    navigate(targetUrl);
  };

  const handleDownloadForm = async (fileUrl, fileName) => {
    try {
      const { url: resolvedUrl } = await resolveWorksheetFileUrl(fileUrl, {
        coreIntegration: base44?.integrations?.Core,
        entities: base44?.entities,
      });
      const downloadUrl = getFormDownloadUrl(resolvedUrl);
      if (!downloadUrl) throw new Error('Could not build download URL');
      await downloadPdfFile(downloadUrl, fileName);
    } catch (error) {
      console.error('[TherapeuticForms] Download failed:', {
        fileValue: fileUrl,
        reason: error?.message || error,
      });
      toast({
        title: 'Unable to download worksheet',
        description: 'This worksheet file could not be downloaded. Please try again or contact support.',
        variant: 'destructive',
      });
    }
  };

  const audienceButtons = availableAudiences.map((audience) => ({
    value: audience,
    label: t(`therapeutic_forms.audience.${audience}`),
  }));

  const calloutText = uiLabels.callout;

  const canGoBack = navigationState.index > 0;
  const canGoForward = navigationState.index < navigationState.history.length - 1;

  return (
    <div className="forms-library-teal mx-auto p-4 w-full box-border md:p-8 max-w-7xl min-h-dvh safe-bottom" dir={isRtl ? 'rtl' : 'ltr'} data-testid="therapeutic-forms-page">
      <div className="mb-8 mt-4">
        <div className="botanical-title-row"><h1 className="text-3xl md:text-4xl font-semibold mb-2 flex items-center gap-3 text-foreground">
          <ClipboardList className="w-8 h-8 text-primary" />
          {t('therapeutic_forms.page_title')}
        </h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
        <p className="text-foreground">{t('therapeutic_forms.page_subtitle')}</p>
      </div>

      <div className="mb-6 rounded-lg border border-border bg-[hsl(var(--card)/0.97)] p-4 text-sm text-foreground" data-testid="ai-forms-callout">
        <p>
          {calloutText}{' '}
          <Link className="underline underline-offset-2 text-primary hover:text-primary" to="/Chat">
            {uiLabels.chat}
          </Link>
        </p>
      </div>

      <FormsNavigationControls
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onBack={handleNavBack}
        onForward={handleNavForward}
        isRtl={isRtl}
        lang={lang}
      />
      <FormsBreadcrumb items={breadcrumbs} isRtl={isRtl} />

      <FormsViewModeToggle viewMode={viewMode} onChange={setViewMode} isRtl={isRtl} lang={lang} />

      <div className="mb-6 rounded-[var(--radius-card)] border border-border bg-[hsl(var(--card)/0.97)] p-4">
        <p className="text-sm font-medium mb-2 text-primary">{t('therapeutic_forms.filter_audience')}</p>
        <div className="flex flex-wrap gap-2" data-testid="audience-filter">
          {audienceButtons.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={selectedAudience === option.value ? 'default' : 'outline'}
              className={selectedAudience === option.value ? 'bg-primary hover:bg-primary text-white border-border' : 'border-border text-primary hover:bg-secondary/70'}
              onClick={() => {
                setSelectedAudience(option.value);
                setSelectedCollectionId(null);
                setSelectedModuleId(null);
                resetNavState();
              }}
              data-testid={`audience-filter-${option.value}`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {!selectedCollection ? (
        collectionCards.length === 0 ? (
          <div
            data-testid="empty-state"
            className="text-center py-12 surface-secondary rounded-[var(--radius-card)] border border-border bg-[hsl(var(--card)/0.97)] shadow-[var(--shadow-md)]"
          >
            <ClipboardList className="w-16 h-16 mx-auto mb-4 text-teal-300" />
            <p className="mb-2 text-foreground">{t('therapeutic_forms.empty_state.title')}</p>
            <p className="text-sm text-muted-foreground">{t('therapeutic_forms.empty_state.message')}</p>
          </div>
        ) : (
          <div data-testid="collections-grid" className={getGridClassForViewMode(viewMode)}>
            {collectionCards.map((collection) => (
              <FormsCollectionCard
                key={collection.collectionId}
                collection={collection}
                audienceLabel={t(`therapeutic_forms.audience.${collection.audience}`)}
                languageLabel={String(collection.language || '').toUpperCase()}
                collectionTypeLabel={collection.collectionType === 'core' ? uiLabels.core : uiLabels.specialized}
                browseLabel={uiLabels.browse}
                onBrowse={() => navigateToCollection(collection.collectionId)}
                viewMode={viewMode}
              />
            ))}
          </div>
        )
      ) : !selectedModule ? (
        modules.length === 0 ? (
          <div data-testid="empty-state" className="text-center py-12 rounded-[var(--radius-card)] border border-border bg-[hsl(var(--card)/0.97)]">
            <p className="text-foreground">{t('therapeutic_forms.empty_state.title')}</p>
            <p className="text-sm text-muted-foreground">{t('therapeutic_forms.empty_state.message')}</p>
          </div>
        ) : (
          <div data-testid="modules-grid" className={getGridClassForViewMode(viewMode)}>
            {modules.map((module) => (
              <FormsModuleCard
                key={module.id}
                module={{
                  ...module,
                  clinicalDomainLabel: lang === 'he' ? '' : formatClinicalDomain(module.clinicalDomain),
                  numberLabel: module.numberLabel,
                  typeLabel: getModuleLabel(lang, 'module'),
                }}
                showClinicalDomain={lang === 'en'}
                viewWorksheetsLabel={uiLabels.viewWorksheets}
                openLabel={t('therapeutic_forms.open_form')}
                downloadLabel={t('therapeutic_forms.download_form')}
                onViewWorksheets={() => navigateToModule(module.id)}
                onOpenCombined={() => module.combinedForm && handleOpenForm(module.combinedForm.languageData.file_url)}
                onDownloadCombined={() =>
                  module.combinedForm && handleDownloadForm(module.combinedForm.languageData.file_url, module.combinedForm.languageData.file_name)
                }
                viewMode={viewMode}
              />
            ))}
          </div>
        )
      ) : (
        <div className="space-y-6" data-testid="worksheets-view">
          {selectedModule.combinedForm ? (
            <FormsCombinedPdfCard
              lang={lang}
              viewMode={viewMode}
              onOpen={() => handleOpenForm(selectedModule.combinedForm.languageData.file_url)}
              onDownload={() => handleDownloadForm(selectedModule.combinedForm.languageData.file_url, selectedModule.combinedForm.languageData.file_name)}
            />
          ) : null}

          {selectedModule.worksheetEntries.length === 0 ? (
            <div data-testid="empty-state" className="text-center py-12 rounded-[var(--radius-card)] border border-border bg-[hsl(var(--card)/0.97)]">
              <p className="text-foreground">{t('therapeutic_forms.empty_state.title')}</p>
              <p className="text-sm text-muted-foreground">{t('therapeutic_forms.empty_state.message')}</p>
            </div>
          ) : (
            <div data-testid="worksheets-grid" className={getGridClassForViewMode(viewMode)}>
              {selectedModule.worksheetEntries.map((worksheet) => (
                <FormsWorksheetCard
                  key={worksheet.form.id}
                  worksheet={{
                    ...worksheet,
                    tags: getWorksheetTags({ worksheet, module: selectedModule, t, lang }),
                  }}
                  openLabel={t('therapeutic_forms.open_form')}
                  downloadLabel={t('therapeutic_forms.download_form')}
                  onOpen={() => handleOpenForm(worksheet.languageData.file_url)}
                  onDownload={() => handleDownloadForm(worksheet.languageData.file_url, worksheet.languageData.file_name)}
                  viewMode={viewMode}
                  typeLabel={uiLabels.worksheet}
                  stageLabel={selectedModule.numberLabel}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TherapeuticFormsUnavailable() {
  const { t, i18n } = useTranslation();
  const lang = normalizeLanguageCode(i18n.resolvedLanguage || i18n.language || 'en');
  const uiLabels = FORMS_PAGE_LABELS[lang] || FORMS_PAGE_LABELS.en;
  const copy = getTherapeuticFormsAvailabilityCopy(lang);
  const isRtl = i18n.dir ? i18n.dir() === 'rtl' : lang === 'he';

  return (
    <div
      className="forms-library-teal mx-auto p-4 w-full box-border md:p-8 max-w-7xl min-h-dvh safe-bottom"
      dir={isRtl ? 'rtl' : 'ltr'}
      data-testid="therapeutic-forms-page"
    >
      <div className="mb-8 mt-4">
        <div className="botanical-title-row"><h1 className="text-3xl md:text-4xl font-semibold mb-2 flex items-center gap-3 text-foreground">
          <ClipboardList className="w-8 h-8 text-primary" aria-hidden="true" />
          {t('therapeutic_forms.page_title')}
        </h1><BotanicalAccent variant="leaves" className="botanical-title-art" /></div>
        <p className="text-foreground">{t('therapeutic_forms.page_subtitle')}</p>
      </div>

      <section
        className="mb-8 rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-5 shadow-[var(--shadow-sm)]"
        data-testid="forms-under-revision"
        aria-labelledby="forms-under-revision-title"
      >
        <h2 id="forms-under-revision-title" className="mb-2 text-xl font-semibold text-amber-900">
          {copy.title}
        </h2>
        <p className="text-amber-950">{copy.message}</p>
        <p className="mt-3 text-sm text-amber-900">{copy.metadata}</p>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-[hsl(var(--card)/0.97)] p-5">
        <h2 className="mb-4 text-lg font-semibold text-foreground">{copy.catalog}</h2>
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="forms-audience-architecture">
          {AUDIENCE_ORDER.map((audience) => (
            <div key={audience} className="rounded-lg border border-border bg-secondary/70 p-4">
              <p className="font-medium text-primary">{t(`therapeutic_forms.audience.${audience}`)}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="forms-collection-architecture">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="font-medium text-foreground">{uiLabels.core}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="font-medium text-foreground">{uiLabels.specialized}</p>
          </div>
        </div>
      </section>

      <div className="mt-6 rounded-lg border border-border bg-[hsl(var(--card)/0.97)] p-4 text-sm text-foreground">
        <Link className="underline underline-offset-2 text-primary hover:text-primary" to="/Chat">
          {uiLabels.chat}
        </Link>
      </div>
    </div>
  );
}

export default function TherapeuticForms() {
  return THERAPEUTIC_FORMS_CONTENT_AVAILABLE
    ? <TherapeuticFormsLibrary />
    : <TherapeuticFormsUnavailable />;
}

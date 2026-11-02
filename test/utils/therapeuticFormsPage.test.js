import { describe, it, expect } from 'vitest';
import { THERAPEUTIC_FORMS_CONTENT_AVAILABLE } from '../../src/data/therapeuticForms/availability.js';
import fs from 'node:fs';
import path from 'node:path';
import { ALL_FORMS, resolveFormWithLanguage } from '../../src/data/therapeuticForms/index.js';

const ROOT = path.resolve(process.cwd());
const translationsSource = fs.readFileSync(path.join(ROOT, 'src/components/i18n/translations.jsx'), 'utf8');

function visibleForms(lang) {
  return ALL_FORMS.filter((form) => form.approved === true && form.language === lang && form.languages?.[lang]);
}

function collectionsFor(lang) {
  const grouped = new Map();
  for (const form of visibleForms(lang)) {
    if (!form.collectionId) continue;
    if (!grouped.has(form.collectionId)) grouped.set(form.collectionId, []);
    grouped.get(form.collectionId).push(form);
  }
  return grouped;
}

function modulesForCollection(forms) {
  const grouped = new Map();
  for (const form of forms) {
    if (form.cardType !== 'worksheet' && form.cardType !== 'combined_pdf') continue;
    const key = form.parentId || `module:${form.moduleNumber || form.stageNumber || form.id}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(form);
  }
  return grouped;
}

describe('therapeuticFormsPage.test.js — collection-first browsing', () => {
  it('keeps route and page registration intact', () => {
    const pagesConfigSource = fs.readFileSync(path.join(ROOT, 'src/pages.config.js'), 'utf8');
    expect(pagesConfigSource).toContain('"TherapeuticForms": TherapeuticForms');
  });

  it('default view contract is collection-first in page source', () => {
    const pageSource = fs.readFileSync(path.join(ROOT, 'src/pages/TherapeuticForms.jsx'), 'utf8');
    const viewModeToggleSource = fs.readFileSync(path.join(ROOT, 'src/components/forms/FormsViewModeToggle.jsx'), 'utf8');
    const navSource = fs.readFileSync(path.join(ROOT, 'src/components/forms/FormsNavigationControls.jsx'), 'utf8');
    expect(pageSource).toContain('collections-grid');
    expect(pageSource).toContain('modules-grid');
    expect(pageSource).toContain('worksheets-grid');
    expect(pageSource).toContain('ai-forms-callout');
    expect(viewModeToggleSource).toContain('forms-view-mode-toggle');
    expect(navSource).toContain('forms-navigation-controls');
    expect(pageSource).toContain('forms-library-teal');
  });

  it('forms library keeps shared card styling without painting the outer page shells', () => {
    const pageSource = fs.readFileSync(path.join(ROOT, 'src/pages/TherapeuticForms.jsx'), 'utf8');
    const collectionCardSource = fs.readFileSync(path.join(ROOT, 'src/components/forms/FormsCollectionCard.jsx'), 'utf8');
    const moduleCardSource = fs.readFileSync(path.join(ROOT, 'src/components/forms/FormsModuleCard.jsx'), 'utf8');
    const worksheetCardSource = fs.readFileSync(path.join(ROOT, 'src/components/forms/FormsWorksheetCard.jsx'), 'utf8');
    const breadcrumbSource = fs.readFileSync(path.join(ROOT, 'src/components/forms/FormsBreadcrumb.jsx'), 'utf8');
    // Both the library and the unavailable-content shell reveal the shared garden.
    const pageShellClasses = [...pageSource.matchAll(/className="([^"]*\bforms-library-teal\b[^"]*)"/g)]
      .map((match) => match[1]);
    expect(pageShellClasses).toHaveLength(2);
    for (const classes of pageShellClasses) {
      expect(classes).toContain('min-h-dvh');
      expect(classes).toContain('safe-bottom');
      expect(classes).not.toMatch(/(?:^|\s)(?:[\w-]+:)*bg-/);
    }
    expect(collectionCardSource).toContain('border-border');
    expect(moduleCardSource).toContain('border-border');
    expect(worksheetCardSource).toContain('border-border');
    expect(breadcrumbSource).toContain('text-primary');
  });

  it('open/download behavior: Open navigates same-tab to pdf-viewer, Download resolves and downloads', () => {
    const pageSource = fs.readFileSync(path.join(ROOT, 'src/pages/TherapeuticForms.jsx'), 'utf8');
    expect(pageSource).toContain('PDF_VIEWER_ROUTE_PATH');
    expect(pageSource).toContain('navigate(');
    expect(pageSource).toContain('getFormDownloadUrl(resolvedUrl)');
    expect(pageSource).toContain('downloadPdfFile(downloadUrl, fileName)');
    expect(pageSource).toContain("location.state?.pdfViewerReturn?.source === 'therapeutic-forms'");
    expect(pageSource).toContain("source: 'therapeutic-forms'");
  });

  it('view mode defaults to medium and persists in localStorage key', () => {
    const pageSource = fs.readFileSync(path.join(ROOT, 'src/pages/TherapeuticForms.jsx'), 'utf8');
    const toggleSource = fs.readFileSync(path.join(ROOT, 'src/components/forms/FormsViewModeToggle.jsx'), 'utf8');
    expect(pageSource).toContain("DEFAULT_FORMS_VIEW_MODE = 'medium'");
    expect(pageSource).toContain("FORMS_VIEW_MODE_STORAGE_KEY = 'mindfulPath.formsLibrary.viewMode'");
    expect(pageSource).toContain('FORMS_VIEW_MODES.includes(mode)');
    expect(pageSource).toContain("window.localStorage.getItem(FORMS_VIEW_MODE_STORAGE_KEY)");
    expect(pageSource).toContain("window.localStorage.setItem(FORMS_VIEW_MODE_STORAGE_KEY, viewMode)");
    expect(toggleSource).toContain('forms-view-mode-${option.value}');
    expect(toggleSource).toContain("value: 'large'");
    expect(toggleSource).toContain("value: 'compact'");
    expect(toggleSource).toContain("value: 'list'");
    expect(toggleSource).toContain("value: 'tiles'");
  });

  it('includes navigation arrows and breadcrumb contracts in page source', () => {
    const navSource = fs.readFileSync(path.join(ROOT, 'src/components/forms/FormsNavigationControls.jsx'), 'utf8');
    const pageSource = fs.readFileSync(path.join(ROOT, 'src/pages/TherapeuticForms.jsx'), 'utf8');
    expect(navSource).toContain('forms-nav-back');
    expect(navSource).toContain('Back');
    expect(navSource).toContain('חזרה');
    expect(pageSource).toContain('handleNavBack');
    expect(pageSource).toContain('FormsBreadcrumb');
  });

  it('keeps explicit RTL/LTR contracts on forms library surface', () => {
    const pageSource = fs.readFileSync(path.join(ROOT, 'src/pages/TherapeuticForms.jsx'), 'utf8');
    const worksheetCardSource = fs.readFileSync(path.join(ROOT, 'src/components/forms/FormsWorksheetCard.jsx'), 'utf8');
    expect(pageSource).toContain("dir={isRtl ? 'rtl' : 'ltr'}");
    expect(worksheetCardSource).toContain("dir={worksheet.languageData?.rtl ? 'rtl' : 'ltr'}");
  });

  it('uses scoped forms-only components for view and navigation controls', () => {
    const appSource = fs.readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');
    expect(appSource).not.toContain('FormsViewModeToggle');
    expect(appSource).not.toContain('FormsNavigationControls');
  });

  it('Hebrew module titles are not raw IDs/slugs in generated index', () => {
    const heForms = visibleForms('he').filter((form) => form.cardType === 'worksheet');
    expect(heForms.every((form) => !String(form.title || '').includes('adolescents-cbt'))).toBe(true);
    expect(heForms.every((form) => !/^children_cbt|^adolescents_cbt/i.test(String(form.title || '')))).toBe(true);
  });

});

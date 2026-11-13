import { test, expect } from '@playwright/test';
import { prepareJournalStage4, journalCopy, openJournalTemplate, advanceJournalToSave, closeJournalDialog } from '../helpers/journalStage4';

test('journal editor excludes embeds and preserves safe formatting through save and reload', async ({ page }) => {
  test.setTimeout(90000);
  const state = await prepareJournalStage4(page, { populated: false });
  const copy = journalCopy('en');
  await page.goto('/Journal');
  await openJournalTemplate(page, 'en', copy.templates.default.cbt.name);
  const dialog = await advanceJournalToSave(page, 'en', 'Security QA', {
    rich: true,
    onStep: async (step, form) => {
      if (step !== 1) return;
      const field = form.locator('[data-journal-field="situation"]');
      // Exercise Quill's paste conversion with stored/clipboard HTML, not merely
      // the sanitizer in isolation. Unsupported embeds must never enter its Delta.
      const formats = await field.locator('.ql-container').evaluate(async element => {
        const { Quill } = await import('/tests/fixtures/journal-editor-security.js');
        const editor = Quill.find(element);
        editor.clipboard.dangerouslyPasteHTML(editor.getLength() - 1,
          '<p><strong>Safe pasted text</strong></p><iframe src="https://example.invalid/qa"></iframe>' +
          '<span class="ql-formula" data-value="&lt;img src=x onerror=alert(1)&gt;">formula</span>' +
          '<img src="x" onerror="window.__qaUnsafe=true"><script>window.__qaUnsafe=true</script>');
        return { allowed: editor.options.formats, embeds: editor.getContents().ops.filter(op => typeof op.insert !== 'string').length };
      });
      expect(formats.allowed).not.toContain('video');
      expect(formats.allowed).not.toContain('formula');
      expect(formats.embeds).toBe(0);
      await expect(field.locator('iframe, img, script, .ql-formula')).toHaveCount(0);
      await expect(field.locator('strong').filter({ hasText: 'Security QA' }).first()).toBeVisible();
      await expect(field.locator('strong').filter({ hasText: 'Safe pasted text' }).first()).toBeVisible();
    },
  });
  await dialog.getByRole('button', { name: copy.form.save_entry, exact: true }).click();
  await expect(dialog.getByRole('heading', { name: copy.form.saved_title, exact: true })).toBeVisible();
  expect(state.db.ThoughtJournal).toHaveLength(1);
  const saved = state.db.ThoughtJournal[0].situation;
  expect(saved).toContain('<strong>');
  expect(saved).toContain('Safe pasted text');
  expect(saved).not.toMatch(/<(?:iframe|img|script)|\sonerror=|\sonload=/i);
  await closeJournalDialog(page);
  await page.reload();
  await expect(page.getByTestId('journal-entry-card')).toHaveCount(1);
  expect(await page.evaluate(() => (window as any).__qaUnsafe)).toBeUndefined();
});

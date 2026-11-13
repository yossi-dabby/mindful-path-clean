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
      // Exercise actual keyboard input too: export-space normalization must not
      // feed converted HTML back into the controlled editor on every keystroke.
      await field.locator('.ql-editor').press('End');
      await field.locator('.ql-editor').pressSequentially(' editable words');
      await expect(field.locator('.ql-editor')).toContainText('editable words');
      // Send a clipboard event through the real editor's paste pipeline.
      await field.locator('.ql-editor').evaluate(element => {
        const clipboardData = new DataTransfer();
        clipboardData.setData('text/html',
          '<p><strong>Safe pasted text</strong></p><iframe src="https://example.invalid/qa"></iframe>' +
          '<span class="ql-formula" data-value="&lt;img src=x onerror=alert(1)&gt;">formula</span>' +
          '<img src="x" onerror="window.__qaUnsafe=true"><script>window.__qaUnsafe=true</script>');
        clipboardData.setData('text/plain', 'Safe pasted text formula');
        element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }));
      });
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
  expect(saved).not.toContain('&nbsp;');
  expect(saved).not.toMatch(/<(?:iframe|img|script)|\sonerror=|\sonload=/i);
  await closeJournalDialog(page);
  await page.reload();
  await expect(page.getByTestId('journal-entry-card')).toHaveCount(1);
  expect(await page.evaluate(() => (window as any).__qaUnsafe)).toBeUndefined();
});

for (const language of ['en', 'he']) {
  test(`legacy journal lists survive reopening and saving ${language}`, async ({ page }) => {
    const state = await prepareJournalStage4(page, { language });
    const copy = journalCopy(language);
    const row = state.db.ThoughtJournal.find(item => item.id === 'journal-qa');
    row.situation = '<p><strong>Old entry</strong> two  spaces <u>underlined</u></p><ol><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>Legacy bullet</li><li data-list="ordered" class="ql-indent-1">Legacy number</li></ol>';
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/Journal?entry=journal-qa');
    await page.getByRole('button', { name: copy.common.edit_aria.replace('{{item}}', copy.cards.entry_item), exact: true }).click();
    const field = page.getByRole('dialog').locator('[data-journal-field="situation"]');
    await expect(field.locator('ul li')).toContainText('Legacy bullet');
    await expect(field.locator('ol li')).toContainText('Legacy number');
    await expect(field.locator('u')).toHaveText('underlined');
    await field.locator('.ql-editor').press('ControlOrMeta+End');
    await field.locator('.ql-editor').pressSequentially(' retained');
    for (let step = 1; step < 5; step++) await page.getByRole('dialog').getByRole('button', { name: copy.common.continue, exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: copy.form.save_entry, exact: true }).click();
    await expect(page.getByRole('heading', { name: copy.form.saved_title, exact: true })).toBeVisible();
    expect(row.situation).toContain('two  spaces');
    expect(row.situation).toContain('<ul>');
    expect(row.situation).toContain('ql-indent-1');
    await closeJournalDialog(page);
    await page.reload();
    await page.getByRole('button', { name: copy.common.edit_aria.replace('{{item}}', copy.cards.entry_item), exact: true }).click();
    await expect(page.getByRole('dialog').locator('[data-journal-field="situation"] .ql-editor')).toContainText('retained');
  });
}

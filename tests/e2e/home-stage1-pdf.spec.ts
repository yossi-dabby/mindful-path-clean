import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { mockApi } from '../helpers/ui';

for (const language of ['en', 'he']) test(`Exercise PDF keeps readable multipage content ${language}`, async ({ page }, testInfo) => {
  await mockApi(page); await page.goto('/Home'); await expect(page.getByTestId('daily-path')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.evaluate(async (language) => {
    const { exportExercisePdf } = await import('/src/components/exercises/exportExercisePdfUtils.jsx');
    const hebrew = language === 'he';
    const line = hebrew ? 'שימו לב לנשימה ולתחושות הגוף. אפשרו לכתפיים לנוח והחזירו את תשומת הלב בעדינות לרגע הנוכחי.' : 'Notice your breathing and how your body feels. Let your shoulders rest and gently bring your attention back to the present moment.';
    const labels = hebrew ? {
      untitled:'תרגול', subtitle:'סיכום התרגול', generatedOn:'תאריך יצירה', category:'קטגוריה', difficulty:'רמת קושי', duration:'משך', minutes:'דקות', details:'פרטי התרגיל', about:'על התרגיל', instructions:'הוראות', noInstructions:'אין הוראות', stepByStep:'שלבי התרגיל', benefits:'יתרונות', tips:'עצות', helpsWith:'יכול לסייע ב', progress:'ההתקדמות שלכם', timesCompleted:'פעמים שהושלם', minutesPracticed:'דקות תרגול', lastPracticed:'תרגול אחרון', footer:'Mindful Path - סיכום לתרגול אישי'
    } : {
      untitled:'Exercise', subtitle:'Practice summary', generatedOn:'Generated on', category:'Category', difficulty:'Difficulty', duration:'Duration', minutes:'minutes', details:'Exercise details', about:'About this exercise', instructions:'Instructions', noInstructions:'No instructions', stepByStep:'Step by step', benefits:'Benefits', tips:'Tips', helpsWith:'Helps with', progress:'Your progress', timesCompleted:'Times completed', minutesPracticed:'Minutes practiced', lastPracticed:'Last practiced', footer:'Mindful Path - Personal practice summary'
    };
    await exportExercisePdf({ exercise: {
      title: hebrew ? 'תרגול קשיבות - בדיקת עימוד' : 'Mindful practice - pagination check',
      description:Array(5).fill(line).join(' '), instructions:Array(10).fill(line).map((text,n) => `${n+1}. ${text}`).join('\n\n'),
      benefits:[line,line], tips:[line,line], tags:[hebrew ? 'קשיבות' : 'Mindfulness'], completed_count:3, total_time_practiced:15,
    }, labels, language });
  }, language);
  const download = await downloadPromise, path = testInfo.outputPath(`exercise-${language}.pdf`);
  await download.saveAs(path); const bytes = await readFile(path);
  expect(bytes.subarray(0,5).toString()).toBe('%PDF-');
  expect((bytes.toString('latin1').match(/\/Type \/Page\b/g) || []).length).toBeGreaterThan(1);
  expect(bytes.length).toBeGreaterThan(10000);
});

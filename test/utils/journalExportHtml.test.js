import { describe, expect, it } from 'vitest';
import { applyJournalUiTranslations } from '../../src/components/i18n/journalUiTranslations';
import { buildThoughtRecordHtml, buildSessionSummaryHtml } from '../../src/components/journal/journalExportHtml';

const languages = ['en','he','es','fr','de','it','pt'];
const dictionaries = applyJournalUiTranslations(Object.fromEntries(languages.map(language => [language,{translation:{}}])));
function context(language) {
  return {locale:language,dir:language==='he'?'rtl':'ltr',generatedAt:'2026-10-28T12:00:00Z',t:(key,options={})=>{
    const value=key.split('.').reduce((node,part)=>node?.[part],dictionaries[language].translation) || options.defaultValue || key;
    return String(value).replace(/{{(\w+)}}/g,(_match,name)=>String(options[name]));
  }};
}
const entry={created_date:'2026-10-28T12:00:00Z',situation:'<p>QA &amp; literal &lt;angle&gt;</p>',automatic_thoughts:'QA thought',emotions:['Anxious'],emotion_intensity:null,outcome_emotion_intensity:null,homework_tasks:[{task:'<img src=x onerror=alert(1)>',duration_minutes:5,success_criteria:'A & B'}]};
describe('Journal PDF presentation',()=>{
  for(const language of languages)it(`uses ${language} headings, date locale and document direction for both exports`,()=>{
    const c=context(language),record=buildThoughtRecordHtml(entry,c),summary=buildSessionSummaryHtml({created_date:entry.created_date,summary_content:'# QA summary',key_takeaways:['QA insight'],recommended_resources:[{title:'QA <resource>',url:'https://example.com/?a=1&b=2'}]},c);
    for(const html of [record,summary]){expect(html).toContain(`lang="${language}" dir="${c.dir}"`);expect(html).toContain(c.t('journal_ui.pdf.footer'));expect(html).not.toContain('journal_ui.');}
    expect(record).toContain(c.t('journal_ui.pdf.title'));expect(summary).toContain(c.t('journal_ui.cards.summary_title'));
    expect(record).not.toContain(c.t('journal_ui.pdf.initial_intensity',{value:0}));
    expect(record).toContain('QA &amp; literal &lt;angle&gt;');expect(record).not.toContain('<img');expect(record).toContain('&lt;img');expect(summary).toContain('QA &lt;resource&gt;');
  });
  it('includes explicit zero ratings and calculates reduction only from recorded paired values',()=>{
    const c=context('en');expect(buildThoughtRecordHtml({...entry,emotion_intensity:7,outcome_emotion_intensity:0},c)).toContain('Reduced by 7 points');
    expect(buildThoughtRecordHtml({...entry,emotion_intensity:null,outcome_emotion_intensity:3},c)).not.toContain('Reduced by');
  });
});

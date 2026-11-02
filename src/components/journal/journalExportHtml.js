import { journalNumberOrNull } from './journalPresentation';

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const plain = (value) => String(value ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const markdown = (value) => String(value ?? '').replace(/#{1,6}\s/g, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
const taxonomyKey = (value) => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const title = (value) => `<div style="font-size:11px;font-weight:bold;color:#1a3a34;margin-bottom:4px;">${escape(value)}</div><div style="border-top:1px solid #b4dcd2;margin-bottom:6px;"></div>`;
const section = (label, text, highlight = false) => !text ? '' : `<section style="margin-bottom:18px;">${title(label)}<div dir="auto" style="font-size:13px;color:#373737;white-space:pre-wrap;${highlight ? 'background:#e8f6f3;border-radius:6px;padding:10px 14px;' : ''}">${escape(text)}</div></section>`;
const list = (label, items) => !items?.length ? '' : `<section style="margin-bottom:18px;">${title(label)}<ul style="margin:0;padding-inline-start:20px;font-size:13px;color:#373737;">${items.map(item => `<li dir="auto" style="margin-bottom:4px;">${escape(item)}</li>`).join('')}</ul></section>`;

function documentHtml({ t, locale, dir, generatedAt }, heading, subtitle, date, body) {
  return `<article lang="${escape(locale)}" dir="${dir === 'rtl' ? 'rtl' : 'ltr'}" style="text-align:start;overflow-wrap:anywhere;">
    <header style="background:#205c53;color:#fff;padding:16px 24px;margin-bottom:24px;">
      <div style="font-size:17px;font-weight:bold;">${escape(heading)}</div>
      <div style="font-size:11px;margin-top:2px;">${escape(subtitle)}</div>
      <div style="font-size:10px;margin-top:4px;">${escape(date)}</div>
    </header>
    <div style="padding:0 24px 24px;">${body}</div>
    <footer style="border-top:1px solid #ccc;margin:0 24px;padding:10px 0;font-size:10px;color:#595959;">
      ${escape(t('journal_ui.pdf.footer'))} ${escape(t('journal_ui.pdf.generated', { date: new Date(generatedAt).toLocaleDateString(locale) }))}
    </footer>
  </article>`;
}

export function buildThoughtRecordHtml(entry, context) {
  const { t, locale } = context;
  const before = journalNumberOrNull(entry.emotion_intensity), after = journalNumberOrNull(entry.outcome_emotion_intensity);
  const localized = (type, value) => t(`journal_ui.taxonomy.${type}.${taxonomyKey(value)}`, { defaultValue: value });
  const emotions = (entry.emotions || []).map(value => localized('emotions', value)).join(', ');
  const initial = before === null ? '' : t('journal_ui.pdf.initial_intensity', { value: before });
  const outcome = after === null ? '' : t('journal_ui.pdf.after_intensity', { value: after }) + (before !== null && before > after ? ` (${t('journal_ui.pdf.reduced', { count: before - after })})` : '');
  const homework = entry.homework_tasks?.length ? `<section style="margin-bottom:18px;">${title(t('journal_ui.cards.homework'))}${entry.homework_tasks.map((task, index) => `<div style="margin-bottom:8px;">
    <div dir="auto" style="font-size:13px;font-weight:bold;color:#373737;">${index + 1}. ${escape(task.task)}</div>
    ${task.duration_minutes ? `<div style="font-size:11px;color:#595959;">${escape(t('journal_ui.cards.duration', { count: task.duration_minutes }))}</div>` : ''}
    ${task.success_criteria ? `<div dir="auto" style="font-size:11px;color:#595959;">${escape(t('journal_ui.cards.success', { text: task.success_criteria }))}</div>` : ''}
  </div>`).join('')}</section>` : '';
  return documentHtml(context, t('journal_ui.pdf.title'), entry.entry_type ? t('journal_ui.pdf.type', { type: t(`journal.filters.entry_types.${entry.entry_type}`, { defaultValue: entry.entry_type }) }) : '',
    new Date(entry.created_date).toLocaleString(locale, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }), [
      section(t('journal_ui.form.situation_label'), plain(entry.situation)),
      section(t('journal_ui.cards.automatic_thoughts'), plain(entry.automatic_thoughts)),
      section(t('journal_ui.form.emotions_label'), [emotions, initial].filter(Boolean).join(' | ')),
      section(t('journal_ui.cards.thinking_patterns'), (entry.cognitive_distortions || []).map(value => localized('distortions', value)).join(', ')),
      section(t('journal_ui.cards.evidence_for'), plain(entry.evidence_for)),
      section(t('journal_ui.cards.evidence_against'), plain(entry.evidence_against)),
      section(t('journal_ui.cards.balanced_thought'), plain(entry.balanced_thought), true),
      section(t('journal_ui.dashboard.after'), outcome), homework
    ].join(''));
}

export function buildSessionSummaryHtml(summary, context) {
  const { t, locale } = context;
  return documentHtml(context, t('journal_ui.cards.summary_title'), t('journal_ui.cards.summary_subtitle'),
    new Date(summary.created_date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' }), [
      section(t('journal_ui.trends.overview'), markdown(summary.summary_content)),
      list(t('journal_ui.cards.takeaways'), summary.key_takeaways),
      list(t('journal_ui.cards.advice'), summary.actionable_advice),
      list(t('journal_ui.cards.resources'), summary.recommended_resources?.map(resource => resource.url ? `${resource.title} - ${resource.url}` : resource.title))
    ].join(''));
}

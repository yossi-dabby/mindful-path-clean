import { getLegalCopy, LEGAL_EFFECTIVE_DATE, LEGAL_CONTACT_EMAIL } from '../src/components/legal/legalContent.js';
import { stage6UiCopy } from '../src/components/i18n/stage6UiTranslations.js';
import { INFORMATION_LANGUAGES, PUBLIC_INFORMATION_PATHS } from '../src/lib/publicLegalUrls.js';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paragraph = (text) => `<p>${escapeHtml(text)}</p>`;
const list = (items, tag = 'ul') => `<${tag}>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</${tag}>`;
const section = (title, content) => `<section><h2>${escapeHtml(title)}</h2>${content}</section>`;
const languageNames = { en: 'English', he: 'עברית', es: 'Español', fr: 'Français', de: 'Deutsch', it: 'Italiano', pt: 'Português' };

export function renderPublicInformation(pathname, language = 'en') {
  const copy = getLegalCopy(language);
  const lang = copy.language;
  const ui = stage6UiCopy[lang];
  const emailLink = `<a dir="ltr" href="mailto:${LEGAL_CONTACT_EMAIL}">${LEGAL_CONTACT_EMAIL}</a>`;
  let title, body;
  if (pathname === '/privacy' || pathname === '/terms') {
    const document = pathname === '/privacy' ? copy.privacy : copy.terms;
    title = document.title;
    body = paragraph(`${copy.common.effectiveDateLabel}: ${document.effectiveDate || LEGAL_EFFECTIVE_DATE}`)
      + paragraph(document.intro)
      + document.sections.map((item) => section(item.title, (item.paragraphs || []).map(paragraph).join('') + (item.bullets ? list(item.bullets) : ''))).join('');
  } else if (pathname === '/contact') {
    title = copy.common.contact;
    body = paragraph(copy.privacy.sections[0].paragraphs[0])
      + section(copy.businessDetails.title, copy.businessDetails.paragraphs.map(paragraph).join(''))
      + paragraph(copy.privacy.intro) + emailLink;
  } else {
    const partial = pathname === '/data-deletion';
    title = partial ? ui.data_delete_title : ui.account_delete_title;
    body = paragraph(partial ? ui.data_delete_intro : ui.account_delete_intro);
    if (!partial) {
      body += section(ui.delete_from_app, list([ui.sign_in_step, ui.settings_account_step, ui.delete_account_step, ui.confirm_delete_step], 'ol'));
    }
    body += section(ui.selected_data_title, paragraph(ui.selected_data_intro) + list([ui.sign_in_step, ui.find_record_step, ui.item_delete_step], 'ol') + paragraph(ui.selected_data_result));
    const subject = partial ? 'Mindful Path partial data deletion request' : 'Mindful Path account deletion request';
    body += section(ui.request_delete, paragraph((partial ? ui.partial_email : ui.account_email).replaceAll('{{email}}', LEGAL_CONTACT_EMAIL))
      + `<a dir="ltr" href="mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}">${LEGAL_CONTACT_EMAIL}</a>`);
    if (!partial) body += section(ui.what_deleted, list([ui.deleted_profile, ui.deleted_records, ui.deleted_preferences]));
    body += section(ui.limited_retention, paragraph(ui.retention_body)) + paragraph(partial ? ui.data_keeps_account : ui.uninstall_note);
    body += section(copy.providerLimits.title, copy.providerLimits.paragraphs.map(paragraph).join(''));
  }
  const labels = [copy.common.privacy, copy.common.terms, copy.common.contact, ui.account_delete_title, ui.data_delete_title];
  const navigation = PUBLIC_INFORMATION_PATHS.map((path, i) => `<a href="${path}?lang=${lang}"${path === pathname ? ' aria-current="page"' : ''}>${escapeHtml(labels[i])}</a>`).join('');
  const languages = INFORMATION_LANGUAGES.map((l) => `<a lang="${l}" href="${pathname}?lang=${l}"${l === lang ? ' aria-current="true"' : ''}>${languageNames[l]}</a>`).join('');
  return `<!doctype html><html lang="${lang}" dir="${copy.direction}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} | Mindful Path</title><style>
    *{box-sizing:border-box}body{margin:0;color:#193b38;background:#eff5f1;font-family:system-ui,sans-serif;line-height:1.8}main{max-width:850px;margin:32px auto;padding:32px;background:#fff;border:1px solid #ccdcd3;border-radius:20px}h1{font-size:2rem;line-height:1.3}h2{font-size:1.2rem;margin:0 0 10px}section{margin:28px 0}a{color:#1f6259;overflow-wrap:anywhere}nav{display:flex;flex-wrap:wrap;gap:8px 20px;margin:20px 0}nav a{display:inline-flex;align-items:center;min-height:44px}a:focus-visible{outline:3px solid #318376;outline-offset:4px}[aria-current]{font-weight:700}header,footer{border-block-end:1px solid #ccdcd3}footer{border-block-start:1px solid #ccdcd3;border-block-end:0}p,li{overflow-wrap:anywhere}li{margin-block:8px}@media(max-width:600px){main{margin:12px;padding:20px}h1{font-size:1.7rem}}
    </style></head><body><main><header><strong>Mindful Path</strong><nav aria-label="Language">${languages}</nav><h1>${escapeHtml(title)}</h1></header>${body}<footer><nav>${navigation}</nav><p>${emailLink}</p><a href="https://app.mindful-path.me">${escapeHtml(copy.common.back)}</a></footer></main></body></html>`;
}

export function handlePublicInformation(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname.replace(/\/$/, '');
  if (!PUBLIC_INFORMATION_PATHS.includes(pathname)) return false;
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  };
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { ...headers, Allow: 'GET, HEAD' }); res.end(); return true;
  }
  const html = renderPublicInformation(pathname, url.searchParams.get('lang') || 'en');
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : html);
  return true;
}

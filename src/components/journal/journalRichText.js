import DOMPurify from 'dompurify';

export function sanitizeJournalRichText(value) {
  return DOMPurify.sanitize(String(value ?? ''), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['img', 'video', 'audio', 'iframe', 'object', 'embed', 'svg', 'math'],
  });
}

// Quill 2 stored bullet items inside <ol> with data-list="bullet". Convert
// these to ordinary HTML lists before the new editor parses saved entries.
// Work on a sanitized, detached document; never rewrite stored records in bulk.
export function normalizeJournalEditorHtml(value) {
  const safe = sanitizeJournalRichText(value);
  const document = new DOMParser().parseFromString(safe, 'text/html');
  document.querySelectorAll('.ql-ui').forEach(node => node.remove());
  document.querySelectorAll('ol, ul').forEach(list => {
    if (![...list.children].some(item => item.hasAttribute('data-list'))) return;
    const replacement = document.createDocumentFragment();
    let group;
    [...list.children].forEach(item => {
      if (item.tagName !== 'LI') return;
      const tag = item.getAttribute('data-list') === 'bullet' ? 'UL' : list.tagName;
      if (!group || group.tagName !== tag) {
        group = document.createElement(tag);
        replacement.append(group);
      }
      item.removeAttribute('data-list');
      group.append(item);
    });
    list.replaceWith(replacement);
  });
  return document.body.innerHTML;
}

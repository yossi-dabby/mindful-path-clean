import React, { useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { journalEditorExtensions } from './journalEditorExtensions';
import { Bold, Italic, Underline, ListOrdered, List, RemoveFormatting } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { normalizeJournalEditorHtml, sanitizeJournalRichText } from './journalRichText';

export default function JournalRichTextEditor({ value = '', onChange, placeholder, labelledBy }) {
  const { t } = useTranslation();
  const callback = useRef(onChange);
  callback.current = onChange;
  const lastEmitted = useRef(null);
  const editor = useEditor({
    extensions: journalEditorExtensions,
    content: normalizeJournalEditorHtml(value),
    parseOptions: { preserveWhitespace: 'full' },
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: { class: 'ql-editor', role: 'textbox', 'aria-multiline': 'true', 'aria-labelledby': labelledBy, dir: 'auto', inputmode: 'text' },
      transformPastedHTML: normalizeJournalEditorHtml,
    },
    onUpdate: ({ editor: current }) => {
      const html = current.isEmpty ? '' : sanitizeJournalRichText(current.getHTML());
      lastEmitted.current = html;
      callback.current(html);
    },
  });

  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    const html = normalizeJournalEditorHtml(value);
    if (html !== editor.getHTML()) editor.commands.setContent(html, { emitUpdate: false, parseOptions: { preserveWhitespace: 'full' } });
  }, [editor, value]);

  const controls = [
    ['bold', 'bold', Bold, () => editor.chain().focus().toggleBold().run(), editor?.isActive('bold')],
    ['italic', 'italic', Italic, () => editor.chain().focus().toggleItalic().run(), editor?.isActive('italic')],
    ['underline', 'underline', Underline, () => editor.chain().focus().toggleUnderline().run(), editor?.isActive('underline')],
    ['numbers', 'list', ListOrdered, () => editor.chain().focus().toggleOrderedList().run(), editor?.isActive('orderedList'), 'ordered'],
    ['bullets', 'list', List, () => editor.chain().focus().toggleBulletList().run(), editor?.isActive('bulletList'), 'bullet'],
    ['clear', 'clean', RemoveFormatting, () => editor.chain().focus().unsetAllMarks().clearNodes().run(), false],
  ];

  // Retain the existing style/QA hooks while replacing the Quill dependency.
  return <div className="journal-rich-text" data-editor-engine="tiptap">
    <div className="ql-toolbar ql-snow">
      {[controls.slice(0, 3), controls.slice(3, 5), controls.slice(5)].map((group, index) => <span className="ql-formats" key={index}>
        {group.map(([label, format, Icon, action, active, listType]) => <button
          key={label} type="button" className={`ql-${format}${active ? ' ql-active' : ''}`}
          value={listType} aria-label={t(`journal_ui.form.format_${label}`)}
          aria-pressed={label === 'clear' ? undefined : Boolean(active)} disabled={!editor}
          onMouseDown={event => event.preventDefault()} onClick={action}>
          <Icon aria-hidden="true" />
        </button>)}
      </span>)}
    </div>
    <div className="ql-container ql-snow" data-empty={editor?.isEmpty ? 'true' : 'false'} data-placeholder={placeholder}>
      <EditorContent editor={editor} />
    </div>
  </div>;
}

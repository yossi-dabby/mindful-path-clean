// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/react';
import { journalEditorExtensions } from '../../src/components/journal/journalEditorExtensions.js';
import { normalizeJournalEditorHtml } from '../../src/components/journal/journalRichText.js';

let editor;
function open(html) {
  editor = new Editor({
    extensions: journalEditorExtensions,
    content: normalizeJournalEditorHtml(html),
    parseOptions: { preserveWhitespace: 'full' },
    editorProps: { transformPastedHTML: normalizeJournalEditorHtml },
  });
  return editor;
}
afterEach(() => { editor?.destroy(); editor = undefined; });

describe('journal editor migration', () => {
  it('preserves Hebrew, English, double spaces and supported inline formatting', () => {
    open('<p><strong>שלום</strong> two  spaces <em>thought</em> <u>underlined</u></p>');
    expect(editor.getText()).toBe('שלום two  spaces thought underlined');
    expect(editor.getHTML()).toContain('<strong>שלום</strong>');
    expect(editor.getHTML()).toContain('<em>thought</em>');
    expect(editor.getHTML()).toContain('<u>underlined</u>');
  });

  it('converts mixed Quill lists without losing order, text or indentation', () => {
    open('<ol><li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>first</li><li data-list="bullet" class="ql-indent-1">nested</li><li data-list="ordered">second</li><li data-list="bullet">third</li></ol>');
    const doc = editor.getJSON();
    expect(doc.content.map(node => node.type)).toEqual(['bulletList', 'orderedList', 'bulletList']);
    expect(doc.content[0].content[1].attrs.indent).toBe(1);
    expect(editor.getText()).toMatch(/first[\s\S]*nested[\s\S]*second[\s\S]*third/);
    const html = editor.getHTML();
    expect(html).not.toContain('ql-ui');
    editor.commands.setContent(normalizeJournalEditorHtml(html));
    expect(editor.getHTML()).toBe(html);
  });

  it('preserves ordinary nested lists from older entries', () => {
    open('<ul><li><p>Parent</p><ol><li>Child</li></ol></li></ul>');
    const html = editor.getHTML();
    expect(html).toContain('<ol><li><p>Child</p></li></ol>');
    editor.commands.setContent(normalizeJournalEditorHtml(html));
    expect(editor.getHTML()).toBe(html);
  });

  it('has no image, video, formula or link types that could export unsafe embeds', () => {
    open('<p>safe</p>');
    for (const name of ['image', 'video', 'formula', 'iframe']) expect(editor.schema.nodes[name]).toBeUndefined();
    expect(editor.schema.marks.link).toBeUndefined();
  });

  it('removes active HTML and embedded resources while retaining safe text', () => {
    open('<p onclick="alert(1)"><strong>keep</strong><a href="javascript:alert(1)">text</a></p><iframe src="https://example.invalid"></iframe><img src=x onerror=alert(1)><svg onload=alert(1)></svg><span class="ql-formula" data-value="&lt;img src=x onerror=alert(1)&gt;">formula text</span><script>alert(1)</script>');
    expect(editor.getText()).toContain('keeptext');
    expect(editor.getText()).toContain('formula text');
    expect(editor.getHTML()).not.toMatch(/iframe|<img|<svg|<script|onerror|onclick|javascript:|data-value|ql-formula/);
  });

  it('keeps input, edits and undo independent of controlled parent rerenders', () => {
    open('<p>First</p>');
    editor.commands.insertContentAt(editor.state.doc.content.size - 1, ' two words');
    expect(editor.getText()).toBe('First two words');
    editor.commands.undo();
    expect(editor.getText()).toBe('First');
    editor.commands.redo();
    expect(editor.getText()).toBe('First two words');
  });

  it('appends after selecting and formatting the whole document then pressing End', () => {
    for (const key of ['End', 'Mod-End']) {
      if (editor) editor.destroy();
      open('<p>Keep these words</p>');
      editor.commands.selectAll();
      editor.commands.toggleBold();
      editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'End', ctrlKey: key === 'Mod-End', bubbles: true, cancelable: true,
      }));
      expect(editor.state.selection.empty).toBe(true);
      editor.commands.insertContent(' plus new words');
      expect(editor.getText()).toBe('Keep these words plus new words');
      expect(editor.getHTML()).toContain('<strong>Keep these words');
    }
  });

  it('treats empty editor HTML as empty', () => {
    open('<p><br></p>');
    editor.commands.clearContent();
    expect(editor.isEmpty).toBe(true);
  });
});

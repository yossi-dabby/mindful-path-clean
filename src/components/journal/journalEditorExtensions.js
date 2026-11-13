import { Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const LegacyIndent = Extension.create({
  name: 'journalIndent',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'listItem'],
      attributes: {
        indent: {
          default: 0,
          parseHTML: element => Number(element.className.match(/(?:^|\s)ql-indent-([1-8])(?:\s|$)/)?.[1] || 0),
          renderHTML: ({ indent }) => Number.isInteger(indent) && indent > 0 && indent <= 8 ? { class: `ql-indent-${indent}` } : {},
        },
      },
    }];
  },
});

export const journalEditorExtensions = [StarterKit.configure({
  blockquote: false, code: false, codeBlock: false, heading: false,
  horizontalRule: false, link: false, strike: false, trailingNode: false,
}), LegacyIndent];


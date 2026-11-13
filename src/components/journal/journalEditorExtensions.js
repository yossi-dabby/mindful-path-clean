import { Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { AllSelection, Selection } from '@tiptap/pm/state';

// Keep cursor navigation in the editor state as well as the browser selection.
// After Select All + formatting, native Home/End can collapse the DOM range
// while leaving an AllSelection that would replace the document on typing.
const JournalSelectionNavigation = Extension.create({
  name: 'journalSelectionNavigation',
  addKeyboardShortcuts() {
    const move = (end, onlyAll = false) => {
      const { state, view } = this.editor;
      if (onlyAll && !(state.selection instanceof AllSelection)) return false;
      const selection = end ? Selection.atEnd(state.doc) : Selection.atStart(state.doc);
      view.dispatch(state.tr.setSelection(selection).scrollIntoView());
      return true;
    };
    return {
      Home: () => move(false, true),
      End: () => move(true, true),
      'Mod-Home': () => move(false),
      'Mod-End': () => move(true),
    };
  },
});

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
}), LegacyIndent, JournalSelectionNavigation];


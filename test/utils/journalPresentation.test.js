import { describe, expect, it } from 'vitest';
import { journalNumberOrNull } from '../../src/components/journal/journalPresentation.js';

describe('Journal optional rating presentation', () => {
  it('preserves recorded numeric values including explicit zero', () => {
    for (const [input, value] of [[7,7],['4',4],[0,0],[' 5 ',5]]) expect(journalNumberOrNull(input)).toBe(value);
  });
  it('keeps absent, empty and invalid values out of measured statistics', () => {
    for (const input of [null,undefined,'',' ',false,true,{},[],NaN,Infinity,'not a number']) expect(journalNumberOrNull(input)).toBeNull();
  });
});

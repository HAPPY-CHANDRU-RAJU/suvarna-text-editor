import { describe, expect, it } from 'vitest';
import { getSchema } from '@tiptap/core';
import { schemaExtensions } from '.';
import { paginate } from './pagination';
import { locate } from './proofing';
import { findMatches } from './search';

describe('paginate', () => {
  const H = 100;

  it('keeps everything on one page when it fits', () => {
    expect(paginate([{ pos: 0, top: 0 }, { pos: 10, top: 40 }], 90, H)).toEqual([]);
  });

  it('breaks before the first unit that overflows', () => {
    const units = [0, 30, 60, 90, 120].map((top, i) => ({ pos: i * 10, top }));
    // Unit at top 90 ends at 120 > 100, so it starts page 2 with 10px left empty.
    expect(paginate(units, 150, H)).toEqual([
      { pos: 30, fill: 10 },
    ]);
  });

  it('starts each following page at the broken unit', () => {
    const units = Array.from({ length: 10 }, (_, i) => ({ pos: i, top: i * 40 }));
    const breaks = paginate(units, 400, H);
    expect(breaks.map((b) => b.pos)).toEqual([2, 4, 6, 8]);
    expect(breaks.every((b) => b.fill === 20)).toBe(true);
  });

  it('honours forced page breaks', () => {
    const units = [{ pos: 0, top: 0 }, { pos: 5, top: 20, force: true }];
    expect(paginate(units, 40, H)).toEqual([{ pos: 5, fill: 80 }]);
  });

  it('lets a unit taller than a page overflow instead of looping', () => {
    const units = [{ pos: 0, top: 0 }, { pos: 1, top: 10 }, { pos: 2, top: 400 }];
    expect(paginate(units, 420, H).map((b) => b.pos)).toEqual([1, 2]);
  });
});

describe('locate', () => {
  it('trusts a correct provider offset', () => {
    expect(locate('ನಮಸ್ಕರ ಕರ್ನಾಟಕ', { original: 'ನಮಸ್ಕರ', offset: 0, suggestions: [], type: 'spelling' })).toEqual([0]);
  });

  it('finds whole-word occurrences when the offset is missing or wrong', () => {
    const text = 'ಬಾರತ ಮತ್ತು ಬಾರತದ ಬಾರತ';
    expect(locate(text, { original: 'ಬಾರತ', offset: 3, suggestions: [], type: 'spelling' })).toEqual([0, 17]);
  });
});

describe('findMatches', () => {
  const schema = getSchema(schemaExtensions());
  const doc = schema.nodeFromJSON({
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Kannada ಕನ್ನಡ kannada' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'ಕನ್ನಡದ ಕನ್ನಡ' }] },
    ],
  });

  it('matches case-insensitively by default', () => {
    expect(findMatches(doc, 'kannada', { matchCase: false, wholeWord: false })).toHaveLength(2);
    expect(findMatches(doc, 'kannada', { matchCase: true, wholeWord: false })).toHaveLength(1);
  });

  it('respects whole-word matching for Kannada', () => {
    expect(findMatches(doc, 'ಕನ್ನಡ', { matchCase: false, wholeWord: false })).toHaveLength(3);
    expect(findMatches(doc, 'ಕನ್ನಡ', { matchCase: false, wholeWord: true })).toHaveLength(2);
  });

  it('returns document positions that cover the match', () => {
    const [m] = findMatches(doc, 'ಕನ್ನಡ', { matchCase: false, wholeWord: true });
    expect(doc.textBetween(m.from, m.to)).toBe('ಕನ್ನಡ');
  });
});

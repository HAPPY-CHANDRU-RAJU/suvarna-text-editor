import type { EditorState } from '@tiptap/pm/state';

const LETTER = /[ಀ-೿‌‍\p{L}\p{M}]/u;

/** The word around a document position plus its sentence, for synonym lookups. */
export function wordAt(state: EditorState, pos: number): { text: string; from: number; to: number; context: string } | null {
  const { selection } = state;
  if (!selection.empty) {
    const text = state.doc.textBetween(selection.from, selection.to, ' ').trim();
    if (!text || text.length > 60) return null;
    const $from = state.doc.resolve(selection.from);
    return { text, from: selection.from, to: selection.to, context: $from.parent.textContent.slice(0, 400) };
  }
  const $pos = state.doc.resolve(pos);
  if (!$pos.parent.isTextblock) return null;
  const text = $pos.parent.textBetween(0, $pos.parent.content.size, undefined, '￼');
  let start = $pos.parentOffset;
  let end = $pos.parentOffset;
  while (start > 0 && LETTER.test(text[start - 1])) start--;
  while (end < text.length && LETTER.test(text[end])) end++;
  if (start === end) return null;
  const base = $pos.start();
  return { text: text.slice(start, end), from: base + start, to: base + end, context: text.slice(0, 400) };
}

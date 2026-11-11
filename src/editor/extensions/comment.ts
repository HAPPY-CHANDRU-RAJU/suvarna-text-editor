import { Mark, mergeAttributes } from '@tiptap/core';
import type { EditorState } from '@tiptap/pm/state';

// Anchors for Review → New Comment. The thread text lives on the document
// record (DocumentRecord.comments); the mark only stores the thread id.

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      setComment: (id: string) => ReturnType;
      removeComment: (id: string) => ReturnType;
    };
  }
}

export const Comment = Mark.create({
  name: 'comment',
  inclusive: false,
  excludes: '',

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-comment-id'),
        renderHTML: (attrs) => ({ 'data-comment-id': attrs.id }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'comment-mark' }), 0];
  },

  addCommands() {
    return {
      setComment:
        (id) =>
        ({ commands }) =>
          commands.setMark(this.name, { id }),
      removeComment:
        (id) =>
        ({ state, tr }) => {
          const type = state.schema.marks[this.name];
          state.doc.descendants((node, pos) => {
            const mark = node.marks.find((m) => m.type === type && m.attrs.id === id);
            if (mark) tr.removeMark(pos, pos + node.nodeSize, mark);
          });
          return true;
        },
    };
  },
});

/** Document range covered by a comment's anchor, or null if the text was deleted. */
export function commentPosition(state: EditorState, id: string): { from: number; to: number } | null {
  let range: { from: number; to: number } | null = null;
  state.doc.descendants((node, pos) => {
    if (!node.isText) return true;
    if (node.marks.some((m) => m.type.name === 'comment' && m.attrs.id === id)) {
      range = range ? { from: range.from, to: pos + node.nodeSize } : { from: pos, to: pos + node.nodeSize };
    }
    return true;
  });
  return range;
}

export function commentIdsAt(state: EditorState): string[] {
  return state.selection.$from.marks().filter((m) => m.type.name === 'comment').map((m) => m.attrs.id as string);
}

import { Extension, type Command } from '@tiptap/core';

// Paragraph-level formatting from Word's Paragraph group: line spacing,
// spacing before/after (pt) and left indent (0.5in steps).

export const INDENT_STEP_IN = 0.5;
export const MAX_INDENT = 8;
export const LINE_SPACINGS = ['1.0', '1.15', '1.5', '2.0', '2.5', '3.0'];

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphFormat: {
      setLineSpacing: (value: string | null) => ReturnType;
      setParagraphSpacing: (spacing: { before?: number | null; after?: number | null }) => ReturnType;
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

const TYPES = ['paragraph', 'heading'];

function parseNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export const ParagraphFormat = Extension.create({
  name: 'paragraphFormat',

  addGlobalAttributes() {
    return [
      {
        types: TYPES,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el) => el.style.lineHeight || null,
            renderHTML: (attrs) => (attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {}),
          },
          spaceBefore: {
            default: null,
            parseHTML: (el) => parseNumber(el.dataset.spaceBefore),
            renderHTML: (attrs) =>
              attrs.spaceBefore != null
                ? { 'data-space-before': attrs.spaceBefore, style: `padding-top: ${attrs.spaceBefore}pt` }
                : {},
          },
          spaceAfter: {
            default: null,
            parseHTML: (el) => parseNumber(el.dataset.spaceAfter),
            renderHTML: (attrs) =>
              attrs.spaceAfter != null
                ? { 'data-space-after': attrs.spaceAfter, style: `padding-bottom: ${attrs.spaceAfter}pt` }
                : {},
          },
          indent: {
            default: 0,
            parseHTML: (el) => Number(el.dataset.indent) || 0,
            renderHTML: (attrs) =>
              attrs.indent ? { 'data-indent': attrs.indent, style: `margin-left: ${attrs.indent * INDENT_STEP_IN}in` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    // Commands mutate TipTap's shared transaction, which it dispatches itself.
    const updateEach =
      (fn: (attrs: Record<string, unknown>) => Record<string, unknown>): Command =>
      ({ state, tr }) => {
        const { from, to } = state.selection;
        let changed = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (!TYPES.includes(node.type.name)) return true;
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...fn(node.attrs) });
          changed = true;
          return false;
        });
        return changed;
      };

    return {
      setLineSpacing: (value) => updateEach(() => ({ lineHeight: value })),
      setParagraphSpacing: (spacing) =>
        updateEach(() => {
          const next: Record<string, unknown> = {};
          if (spacing.before !== undefined) next.spaceBefore = spacing.before;
          if (spacing.after !== undefined) next.spaceAfter = spacing.after;
          return next;
        }),
      indent: () => (props) =>
        props.editor.isActive('listItem')
          ? props.commands.sinkListItem('listItem')
          : updateEach((attrs) => ({ indent: Math.min(MAX_INDENT, (Number(attrs.indent) || 0) + 1) }))(props),
      outdent: () => (props) =>
        props.editor.isActive('listItem')
          ? props.commands.liftListItem('listItem')
          : updateEach((attrs) => ({ indent: Math.max(0, (Number(attrs.indent) || 0) - 1) }))(props),
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        // Inside tables Tab moves between cells; elsewhere it indents like Word.
        if (this.editor.isActive('table')) return false;
        return this.editor.commands.indent();
      },
      'Shift-Tab': () => {
        if (this.editor.isActive('table')) return false;
        return this.editor.commands.outdent();
      },
    };
  },
});

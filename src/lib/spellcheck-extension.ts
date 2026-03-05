import { Extension } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { spellCheck, type SpellError } from '@/lib/spellcheck';

export const spellCheckPluginKey = new PluginKey('spellCheck');

export interface SpellCheckStorage {
  errors: SpellError[];
}

export const SpellCheckExtension = Extension.create<{}, SpellCheckStorage>({
  name: 'spellCheck',

  addStorage() {
    return {
      errors: [] as SpellError[],
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: spellCheckPluginKey,
        state: {
          init(_, state) {
            return buildDecorations(state.doc, extension);
          },
          apply(tr, oldDecorations, _, newState) {
            if (tr.docChanged) {
              return buildDecorations(newState.doc, extension);
            }
            return oldDecorations;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

function buildDecorations(doc: any, extension: any): DecorationSet {
  const text = doc.textContent;
  const errors = spellCheck(text);
  extension.storage.errors = errors;

  const decorations: Decoration[] = [];

  // Map plain text offsets to ProseMirror positions
  // We need to walk the doc to find the correct positions
  let textOffset = 0;
  
  doc.descendants((node: any, pos: number) => {
    if (node.isText) {
      const nodeText = node.text || '';
      for (const error of errors) {
        // Check if this error falls within this text node
        if (error.start >= textOffset && error.end <= textOffset + nodeText.length) {
          const from = pos + (error.start - textOffset);
          const to = pos + (error.end - textOffset);
          decorations.push(
            Decoration.inline(from, to, {
              class: 'spell-error',
              'data-spell-error': error.word,
            })
          );
        }
      }
      textOffset += nodeText.length;
    } else if (node.isBlock && node.type.name !== 'doc') {
      // Account for block separators (newlines between paragraphs)
      if (textOffset > 0) {
        textOffset += 1; // ProseMirror adds implicit newline between blocks
      }
    }
    return true; // continue traversal
  });

  return DecorationSet.create(doc, decorations);
}

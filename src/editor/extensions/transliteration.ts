import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { isTransliterationKey, toKannadaDigits, transliterate } from '@/lib/kannada/transliterate';

// Phonetic Kannada typing. While a word is being typed we keep its Latin
// spelling and re-render the whole word on every key, so "k" → ಕ್, "ka" → ಕ,
// "kaa" → ಕಾ. Moving the cursor, typing a space or punctuation ends the word.

interface Composition {
  /** Document position where the Kannada output starts. */
  start: number;
  latin: string;
  output: string;
}

export interface TransliterationState {
  enabled: boolean;
  kannadaDigits: boolean;
  composition: Composition | null;
}

type Meta = { enabled?: boolean; kannadaDigits?: boolean; composition?: Composition | null };

export const transliterationKey = new PluginKey<TransliterationState>('transliteration');

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    transliteration: {
      toggleTransliteration: () => ReturnType;
      setTransliteration: (enabled: boolean) => ReturnType;
      setKannadaDigits: (enabled: boolean) => ReturnType;
    };
  }
}

export function isTransliterating(state: EditorState): boolean {
  return transliterationKey.getState(state)?.enabled ?? false;
}

export function transliterationState(state: EditorState): TransliterationState | undefined {
  return transliterationKey.getState(state);
}

export const Transliteration = Extension.create<{ enabled: boolean }>({
  name: 'transliteration',

  addOptions() {
    return { enabled: true };
  },

  addCommands() {
    return {
      toggleTransliteration:
        () =>
        ({ state, tr }) => {
          tr.setMeta(transliterationKey, { enabled: !isTransliterating(state), composition: null } satisfies Meta);
          return true;
        },
      setTransliteration:
        (enabled) =>
        ({ tr }) => {
          tr.setMeta(transliterationKey, { enabled, composition: null } satisfies Meta);
          return true;
        },
      setKannadaDigits:
        (enabled) =>
        ({ tr }) => {
          tr.setMeta(transliterationKey, { kannadaDigits: enabled } satisfies Meta);
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Alt-k': () => this.editor.commands.toggleTransliteration(),
    };
  },

  addProseMirrorPlugins() {
    const initial = this.options.enabled;

    return [
      new Plugin<TransliterationState>({
        key: transliterationKey,
        state: {
          init: () => ({ enabled: initial, kannadaDigits: false, composition: null }),
          apply(tr, value) {
            const meta = tr.getMeta(transliterationKey) as Meta | undefined;
            if (meta) return { ...value, ...meta };
            // Any other edit or cursor move ends the current word.
            if (value.composition && (tr.docChanged || tr.selectionSet)) return { ...value, composition: null };
            return value;
          },
        },
        props: {
          handleTextInput(view, from, to, text) {
            const st = transliterationKey.getState(view.state);
            if (!st?.enabled || view.composing) return false;

            if (/^[0-9]$/.test(text)) {
              if (!st.kannadaDigits) return false;
              view.dispatch(view.state.tr.insertText(toKannadaDigits(text), from, to));
              return true;
            }
            if (!isTransliterationKey(text)) return false;

            const comp = st.composition;
            const continuing = comp && from === to && from === comp.start + comp.output.length;
            const start = continuing ? comp.start : from;
            const latin = (continuing ? comp.latin : '') + text;
            const output = transliterate(latin);
            const tr = view.state.tr.insertText(output, start, continuing ? from : to);
            tr.setMeta(transliterationKey, { composition: { start, latin, output } } satisfies Meta);
            view.dispatch(tr);
            return true;
          },
          handleKeyDown(view, event) {
            if (event.key !== 'Backspace' || event.metaKey || event.ctrlKey || event.altKey) return false;
            const st = transliterationKey.getState(view.state);
            const comp = st?.composition;
            const { from, to } = view.state.selection;
            if (!comp || from !== to || from !== comp.start + comp.output.length) return false;

            // Backspace removes the last Latin key, not the last Kannada code point.
            const latin = comp.latin.slice(0, -1);
            const output = latin ? transliterate(latin) : '';
            const tr = output ? view.state.tr.insertText(output, comp.start, from) : view.state.tr.delete(comp.start, from);
            tr.setMeta(transliterationKey, { composition: latin ? { start: comp.start, latin, output } : null } satisfies Meta);
            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },
});

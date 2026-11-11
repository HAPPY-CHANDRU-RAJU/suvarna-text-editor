import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// Find & Replace with highlighted matches, like Word's navigation search.

export interface SearchOptions {
  matchCase: boolean;
  wholeWord: boolean;
}

export interface SearchMatch {
  from: number;
  to: number;
}

interface SearchState {
  query: string;
  options: SearchOptions;
  matches: SearchMatch[];
  current: number;
  decorations: DecorationSet;
}

export const searchKey = new PluginKey<SearchState>('search');

const LETTER = /[ಀ-೿\p{L}\p{N}]/u;

export function findMatches(doc: PMNode, query: string, options: SearchOptions): SearchMatch[] {
  if (!query) return [];
  const needle = options.matchCase ? query : query.toLocaleLowerCase();
  const matches: SearchMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const raw = node.textBetween(0, node.content.size, undefined, '￼');
    const text = options.matchCase ? raw : raw.toLocaleLowerCase();
    let i = text.indexOf(needle);
    while (i !== -1) {
      const before = text[i - 1];
      const after = text[i + needle.length];
      const isWord = !options.wholeWord || ((!before || !LETTER.test(before)) && (!after || !LETTER.test(after)));
      if (isWord) matches.push({ from: pos + 1 + i, to: pos + 1 + i + needle.length });
      i = text.indexOf(needle, i + Math.max(1, needle.length));
    }
    return false;
  });
  return matches;
}

function build(doc: PMNode, query: string, options: SearchOptions, current: number): SearchState {
  const matches = findMatches(doc, query, options);
  const index = matches.length ? Math.min(Math.max(current, 0), matches.length - 1) : -1;
  const decorations = DecorationSet.create(
    doc,
    matches.map((m, i) => Decoration.inline(m.from, m.to, { class: i === index ? 'search-match current' : 'search-match' })),
  );
  return { query, options, matches, current: index, decorations };
}

export function getSearch(state: EditorState): SearchState | undefined {
  return searchKey.getState(state);
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    search: {
      setSearch: (query: string, options?: Partial<SearchOptions>) => ReturnType;
      clearSearch: () => ReturnType;
      gotoMatch: (direction: 1 | -1) => ReturnType;
      replaceMatch: (replacement: string) => ReturnType;
      replaceAllMatches: (replacement: string) => ReturnType;
    };
  }
}

type Meta = { query?: string; options?: Partial<SearchOptions>; current?: number };

export const Search = Extension.create({
  name: 'search',

  addCommands() {
    const select = (tr, match: SearchMatch | undefined) => {
      if (match) tr.setSelection(TextSelection.create(tr.doc, match.from, match.to)).scrollIntoView();
    };

    return {
      setSearch:
        (query, options) =>
        ({ state, tr }) => {
          const prev = searchKey.getState(state)!;
          const opts = { ...prev.options, ...options };
          const matches = findMatches(state.doc, query, opts);
          // Start from the first match after the cursor.
          const after = matches.findIndex((m) => m.from >= state.selection.from);
          tr.setMeta(searchKey, { query, options: opts, current: after === -1 ? 0 : after } satisfies Meta);
          return true;
        },
      clearSearch:
        () =>
        ({ tr }) => {
          tr.setMeta(searchKey, { query: '' } satisfies Meta);
          return true;
        },
      gotoMatch:
        (direction) =>
        ({ state, tr }) => {
          const s = searchKey.getState(state)!;
          if (!s.matches.length) return false;
          const current = (s.current + direction + s.matches.length) % s.matches.length;
          tr.setMeta(searchKey, { current } satisfies Meta);
          select(tr, s.matches[current]);
          return true;
        },
      replaceMatch:
        (replacement) =>
        ({ state, tr }) => {
          const s = searchKey.getState(state)!;
          const match = s.matches[s.current];
          if (!match) return false;
          tr.insertText(replacement, match.from, match.to);
          // The next match keeps the same index once this one is gone.
          tr.setMeta(searchKey, { current: s.current } satisfies Meta);
          return true;
        },
      replaceAllMatches:
        (replacement) =>
        ({ state, tr }) => {
          const s = searchKey.getState(state)!;
          if (!s.matches.length) return false;
          for (const m of [...s.matches].reverse()) tr.insertText(replacement, m.from, m.to);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchKey,
        state: {
          init: (_, state) => build(state.doc, '', { matchCase: false, wholeWord: false }, 0),
          apply(tr, value, _old, state) {
            const meta = tr.getMeta(searchKey) as Meta | undefined;
            if (meta) {
              return build(
                state.doc,
                meta.query ?? value.query,
                { ...value.options, ...meta.options },
                meta.current ?? value.current,
              );
            }
            if (tr.docChanged && value.query) return build(state.doc, value.query, value.options, value.current);
            return value;
          },
        },
        props: {
          decorations(state) {
            return searchKey.getState(state)?.decorations;
          },
        },
      }),
    ];
  },
});

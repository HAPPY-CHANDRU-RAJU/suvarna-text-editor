import { Extension, type Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { languageService } from '@/lib/language/service';
import type { ProofIssue } from '@/lib/language/types';

// Spelling & grammar underlines driven by the active language provider
// (built-in dictionary, Suvarna cloud AI, or a custom API). Paragraph text is
// sent in batches after typing pauses; results are cached by paragraph text so
// unchanged paragraphs are never re-sent.

export interface FoundIssue {
  from: number;
  to: number;
  issue: ProofIssue;
}

interface ProofingState {
  decorations: DecorationSet;
  found: FoundIssue[];
}

export const proofingKey = new PluginKey<ProofingState>('proofing');

const CHECK_DELAY_MS = 900;
const LETTER = /[ಀ-೿\p{L}\p{N}]/u;

/** Paragraph text where offset n is document position blockStart + 1 + n. */
export function blockText(node: PMNode): string {
  return node.textBetween(0, node.content.size, undefined, '￼');
}

function eachTextblock(doc: PMNode, fn: (node: PMNode, pos: number) => void) {
  doc.descendants((node, pos) => {
    if (node.type.spec.code) return false;
    if (node.isTextblock) {
      fn(node, pos);
      return false;
    }
    return true;
  });
}

/** Offsets of the issue in the paragraph: the provider's offset if it is right, else whole-word matches. */
export function locate(text: string, issue: ProofIssue): number[] {
  const { original, offset } = issue;
  if (offset != null && text.slice(offset, offset + original.length) === original) return [offset];
  const result: number[] = [];
  const checkStart = LETTER.test(original[0]);
  const checkEnd = LETTER.test(original[original.length - 1]);
  let i = text.indexOf(original);
  while (i !== -1) {
    const before = text[i - 1];
    const after = text[i + original.length];
    if ((!checkStart || !before || !LETTER.test(before)) && (!checkEnd || !after || !LETTER.test(after))) result.push(i);
    i = text.indexOf(original, i + original.length);
  }
  return result;
}

function findIssues(doc: PMNode): FoundIssue[] {
  const found: FoundIssue[] = [];
  const { showGrammar } = languageService.settings;
  eachTextblock(doc, (node, pos) => {
    const text = blockText(node);
    const issues = languageService.cached(text);
    if (!issues) return;
    for (const issue of issues) {
      if (issue.type !== 'spelling' && !showGrammar) continue;
      if (languageService.isIgnored(issue.original)) continue;
      for (const offset of locate(text, issue)) {
        found.push({ from: pos + 1 + offset, to: pos + 1 + offset + issue.original.length, issue });
      }
    }
  });
  return found.sort((a, b) => a.from - b.from);
}

function toDecorations(doc: PMNode, found: FoundIssue[]): DecorationSet {
  return DecorationSet.create(
    doc,
    found.map((f) =>
      Decoration.inline(
        f.from,
        f.to,
        { class: `proof-${f.issue.type}`, ...(f.issue.message ? { title: f.issue.message } : {}) },
        { issue: f.issue },
      ),
    ),
  );
}

function collectTexts(doc: PMNode): string[] {
  const texts: string[] = [];
  eachTextblock(doc, (node) => {
    const text = blockText(node);
    if (text.trim()) texts.push(text);
  });
  return texts;
}

export function getIssues(state: EditorState): FoundIssue[] {
  return proofingKey.getState(state)?.found ?? [];
}

export function issueAt(state: EditorState, pos: number): FoundIssue | undefined {
  return getIssues(state).find((f) => pos >= f.from && pos <= f.to);
}

export function replaceRange(editor: Editor, from: number, to: number, text: string) {
  editor.chain().focus().insertContentAt({ from, to }, text).run();
}

/** Replaces every current occurrence of a flagged word (Word's "Change All"). */
export function replaceAll(editor: Editor, original: string, replacement: string) {
  const targets = getIssues(editor.state).filter((f) => f.issue.original === original);
  if (!targets.length) return;
  const tr = editor.state.tr;
  for (const t of [...targets].sort((a, b) => b.from - a.from)) tr.insertText(replacement, t.from, t.to);
  editor.view.dispatch(tr);
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    proofing: {
      checkDocument: () => ReturnType;
    };
  }
}

export interface ProofingOptions {
  onAutoCorrect?: (changes: { from: string; to: string }[]) => void;
}

export const Proofing = Extension.create<ProofingOptions>({
  name: 'proofing',

  addOptions() {
    return { onAutoCorrect: undefined };
  },

  addCommands() {
    return {
      checkDocument:
        () =>
        ({ state }) => {
          void languageService.request(collectTexts(state.doc));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin<ProofingState>({
        key: proofingKey,
        state: {
          init: (_, state) => {
            const found = findIssues(state.doc);
            return { found, decorations: toDecorations(state.doc, found) };
          },
          apply(tr, value, _old, state) {
            if (tr.getMeta(proofingKey) || tr.docChanged) {
              // Edited paragraphs drop out of the cache until rechecked, so their underlines clear.
              const found = findIssues(state.doc);
              return { found, decorations: toDecorations(state.doc, found) };
            }
            return value;
          },
        },
        props: {
          decorations(state) {
            return proofingKey.getState(state)?.decorations;
          },
        },
        view(view) {
          let timer = 0;
          // Fixes the user undid are not re-applied this session.
          const applied = new Set<string>();

          const refresh = () => {
            if (view.isDestroyed) return;
            view.dispatch(view.state.tr.setMeta(proofingKey, true).setMeta('addToHistory', false));
            autoCorrect();
          };

          const autoCorrect = () => {
            const { aiAutoCorrect, aiAutoCorrectThreshold } = languageService.settings;
            if (!aiAutoCorrect) return;
            const { from: cursor } = view.state.selection;
            const changes = getIssues(view.state).filter((f) => {
              const best = f.issue.suggestions[0];
              return (
                f.issue.type === 'spelling' &&
                best &&
                (f.issue.confidence ?? 0) >= aiAutoCorrectThreshold &&
                (cursor < f.from - 1 || cursor > f.to + 1) &&
                !applied.has(`${f.issue.original}→${best}`)
              );
            });
            if (!changes.length) return;
            const tr = view.state.tr;
            for (const c of [...changes].sort((a, b) => b.from - a.from)) {
              tr.insertText(c.issue.suggestions[0], c.from, c.to);
              applied.add(`${c.issue.original}→${c.issue.suggestions[0]}`);
            }
            view.dispatch(tr);
            options.onAutoCorrect?.(changes.map((c) => ({ from: c.issue.original, to: c.issue.suggestions[0] })));
          };

          const schedule = () => {
            window.clearTimeout(timer);
            if (!languageService.settings.checkAsYouType) return;
            timer = window.setTimeout(() => {
              if (!view.isDestroyed) void languageService.request(collectTexts(view.state.doc));
            }, CHECK_DELAY_MS);
          };

          let lastVersion = languageService.version;
          const unsubscribe = languageService.subscribe(() => {
            if (languageService.version === lastVersion) return;
            lastVersion = languageService.version;
            // New results or settings: redraw (outside the current dispatch).
            queueMicrotask(refresh);
          });
          schedule();

          return {
            update(v, prevState) {
              if (v.state.doc !== prevState.doc) schedule();
            },
            destroy() {
              window.clearTimeout(timer);
              unsubscribe();
            },
          };
        },
      }),
    ];
  },
});

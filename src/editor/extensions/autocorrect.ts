import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { matchRule, WORD_TERMINATORS } from '@/lib/language/autocorrect';
import { languageService } from '@/lib/language/service';

// AutoCorrect as you type: when a word is finished (space or punctuation),
// a matching entry from the AutoCorrect list replaces it. Ctrl+Z undoes it.

export const autoCorrectKey = new PluginKey('autoCorrect');

const LOOKBEHIND = 40;

export const AutoCorrect = Extension.create<{ onCorrect?: (from: string, to: string) => void }>({
  name: 'autoCorrect',

  addOptions() {
    return { onCorrect: undefined };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin({
        key: autoCorrectKey,
        props: {
          handleTextInput(view, from, to, text) {
            if (!languageService.settings.autoCorrect || !WORD_TERMINATORS.test(text)) return false;
            const $from = view.state.doc.resolve(from);
            if ($from.parent.type.spec.code) return false;
            const start = Math.max(0, $from.parentOffset - LOOKBEHIND);
            const before = $from.parent.textBetween(start, $from.parentOffset, undefined, '￼');
            const match = matchRule(before, languageService.autoCorrectRules);
            if (!match) return false;
            view.dispatch(view.state.tr.insertText(match.to + text, from - match.from.length, to));
            options.onCorrect?.(match.from, match.to);
            return true;
          },
        },
      }),
    ];
  },
});

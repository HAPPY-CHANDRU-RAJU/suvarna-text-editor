import { useEffect, useMemo, useState } from 'react';
import { BookA, CheckCircle2, Loader2, PlugZap, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { getIssues, replaceAll, replaceRange, type FoundIssue } from '@/editor/extensions/proofing';
import { languageService, useLanguage } from '@/lib/language/service';
import { cn } from '@/lib/utils';
import { useEditorUi } from '../EditorContext';
import { wordAt } from '../wordAt';

// Word's "Editor" pane: step through issues with Change / Change All /
// Ignore / Ignore All / Add to Dictionary, plus synonyms for the current word.

function Synonyms({ word, context, onPick }: { word: string; context: string; onPick: (s: string) => void }) {
  const { t } = useI18n();
  const [state, setState] = useState<{ word: string; list: string[] | null; error?: boolean }>({ word, list: null });

  useEffect(() => {
    let cancelled = false;
    setState({ word, list: null });
    languageService
      .synonyms(word, context)
      .then((list) => !cancelled && setState({ word, list }))
      .catch(() => !cancelled && setState({ word, list: [], error: true }));
    return () => {
      cancelled = true;
    };
  }, [word, context]);

  return (
    <div className="border-t border-border p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <BookA className="h-3.5 w-3.5" />
        {t('context.synonyms')} · <span className="font-indic normal-case">{word}</span>
      </div>
      {state.list === null ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('context.loadingSynonyms')}
        </p>
      ) : state.list.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('context.noSynonyms')}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {state.list.map((s) => (
            <button key={s} type="button" className="chip font-indic" onClick={() => onPick(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SpellingPanel() {
  const { editor, setPanel, openDialog } = useEditorUi();
  const { t } = useI18n();
  const { status, lastError } = useLanguage();
  const issues = getIssues(editor.state);
  // Walk forward from where the cursor was when the pane opened, like Word.
  const [anchor] = useState(() => editor.state.selection.from);
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());
  const keyOf = (f: FoundIssue) => `${f.from}:${f.issue.original}`;

  useEffect(() => {
    editor.commands.checkDocument();
  }, [editor]);

  const current: FoundIssue | undefined = useMemo(() => {
    const open = issues.filter((f) => !skipped.has(keyOf(f)));
    return open.find((f) => f.from >= anchor) ?? open[0];
  }, [issues, skipped, anchor]);

  useEffect(() => {
    if (!current) return;
    const { from, to } = editor.state.selection;
    if (from !== current.from || to !== current.to) {
      editor.chain().setTextSelection({ from: current.from, to: current.to }).scrollIntoView().run();
    }
    // Select the issue whenever the current one changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.from, current?.to, current?.issue.original]);

  const [choice, setChoice] = useState<string | null>(null);
  useEffect(() => setChoice(current?.issue.suggestions[0] ?? null), [current?.issue]);

  const word = wordAt(editor.state, editor.state.selection.from);
  const synonymsOn = languageService.canSuggestSynonyms();

  const kindLabel = current?.issue.type === 'grammar' ? t('spell.grammar') : current?.issue.type === 'style' ? t('spell.style') : t('spell.notInDictionary');

  return (
    <aside className="side-pane">
      <div className="side-pane-header">
        <span>{t('spell.title')}</span>
        <button type="button" className="rounded p-1 hover:bg-muted" onClick={() => setPanel(null)} aria-label={t('common.close')}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {status === 'error' && (
          <div className="m-3 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
            {t('status.proofError')}
            {lastError && <div className="mt-1 break-words opacity-80">{lastError}</div>}
          </div>
        )}

        {current ? (
          <div className="p-3">
            <div className="mb-1 text-xs text-muted-foreground">
              {kindLabel} · {issues.indexOf(current) + 1}/{issues.length}
            </div>
            <div className={cn('mb-1 font-indic text-lg font-semibold', current.issue.type === 'spelling' ? 'text-destructive' : 'text-blue-600')}>
              {current.issue.original}
            </div>
            {current.issue.message && <p className="mb-2 text-sm text-muted-foreground">{current.issue.message}</p>}

            <div className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('spell.suggestions')}</div>
            {current.issue.suggestions.length ? (
              <div className="mb-3 overflow-hidden rounded-md border border-border">
                {current.issue.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setChoice(s)}
                    onDoubleClick={() => replaceRange(editor, current.from, current.to, s)}
                    className={cn('block w-full px-3 py-1.5 text-left font-indic text-sm hover:bg-muted', choice === s && 'bg-primary/15 font-medium')}
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mb-3 text-sm text-muted-foreground">{t('spell.noSuggestions')}</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" disabled={!choice} onClick={() => choice && replaceRange(editor, current.from, current.to, choice)}>
                {t('spell.change')}
              </Button>
              <Button size="sm" variant="outline" disabled={!choice} onClick={() => choice && replaceAll(editor, current.issue.original, choice)}>
                {t('spell.changeAll')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSkipped((prev) => new Set(prev).add(keyOf(current)))}>
                {t('spell.ignore')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => languageService.ignoreAll(current.issue.original)}>
                {t('spell.ignoreAll')}
              </Button>
              <Button size="sm" variant="secondary" className="col-span-2" onClick={() => languageService.addToDictionary(current.issue.original)}>
                {t('spell.addToDictionary')}
              </Button>
            </div>
          </div>
        ) : status === 'checking' ? (
          <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t('status.proofChecking')}
          </p>
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            {t('spell.done')}
          </div>
        )}

        {synonymsOn && word && (
          <Synonyms
            word={word.text}
            context={word.context}
            onPick={(s) => replaceRange(editor, word.from, word.to, s)}
          />
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border p-2 text-xs text-muted-foreground">
        <span className="truncate">
          {t('spell.provider')}: {languageService.providerId.split(':')[0]}
        </span>
        <button type="button" className="ml-auto rounded p-1 hover:bg-muted" title={t('spell.recheck')} onClick={() => editor.commands.checkDocument()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button type="button" className="rounded p-1 hover:bg-muted" title={t('review.languageServices')} onClick={() => openDialog('language')}>
          <PlugZap className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}

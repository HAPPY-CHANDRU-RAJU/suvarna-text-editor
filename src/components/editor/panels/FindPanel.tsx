import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/i18n';
import { getSearch } from '@/editor/extensions/search';
import { useEditorUi } from '../EditorContext';

export function FindPanel() {
  const { editor, setPanel, findMode } = useEditorUi();
  const { t } = useI18n();
  const search = getSearch(editor.state);
  const [query, setQuery] = useState(() => {
    const { from, to, empty } = editor.state.selection;
    return empty ? search?.query ?? '' : editor.state.doc.textBetween(from, to, ' ').slice(0, 100);
  });
  const [replacement, setReplacement] = useState('');
  const [matchCase, setMatchCase] = useState(search?.options.matchCase ?? false);
  const [wholeWord, setWholeWord] = useState(search?.options.wholeWord ?? false);
  const findRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (findMode === 'replace' && query ? replaceRef : findRef).current?.focus();
    findRef.current?.select();
    // Focus only when the panel opens or switches mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findMode]);

  useEffect(() => {
    editor.commands.setSearch(query, { matchCase, wholeWord });
  }, [editor, query, matchCase, wholeWord]);

  useEffect(() => () => void editor.commands.clearSearch(), [editor]);

  const total = search?.matches.length ?? 0;
  const current = search && search.current >= 0 ? search.current + 1 : 0;

  const close = () => {
    setPanel(null);
    editor.commands.focus();
  };

  return (
    <aside className="side-pane">
      <div className="side-pane-header">
        <span>{t('find.title')}</span>
        <button type="button" className="rounded p-1 hover:bg-muted" onClick={close} aria-label={t('common.close')}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3 p-3" onKeyDown={(e) => e.key === 'Escape' && close()}>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="find-input">{t('find.find')}</label>
          <div className="flex gap-1">
            <Input
              id="find-input"
              ref={findRef}
              className="h-8 font-indic"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') editor.commands.gotoMatch(e.shiftKey ? -1 : 1);
              }}
            />
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => editor.commands.gotoMatch(-1)} aria-label={t('find.previous')} disabled={!total}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => editor.commands.gotoMatch(1)} aria-label={t('find.next')} disabled={!total}>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
            {query ? (total ? t('find.results', { current, total }) : t('find.noResults')) : ' '}
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="replace-input">{t('find.replaceWith')}</label>
          <Input id="replace-input" ref={replaceRef} className="h-8 font-indic" value={replacement} onChange={(e) => setReplacement(e.target.value)} />
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" disabled={!total} onClick={() => editor.commands.replaceMatch(replacement)}>
              {t('find.replace')}
            </Button>
            <Button
              size="sm"
              className="flex-1"
              disabled={!total}
              onClick={() => {
                editor.commands.replaceAllMatches(replacement);
                toast.success(t('find.replaced', { count: total }));
              }}
            >
              {t('find.replaceAll')}
            </Button>
          </div>
        </div>
        <div className="space-y-2 pt-1 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox checked={matchCase} onCheckedChange={(v) => setMatchCase(v === true)} />
            {t('find.matchCase')}
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={wholeWord} onCheckedChange={(v) => setWholeWord(v === true)} />
            {t('find.wholeWord')}
          </label>
        </div>
      </div>
    </aside>
  );
}

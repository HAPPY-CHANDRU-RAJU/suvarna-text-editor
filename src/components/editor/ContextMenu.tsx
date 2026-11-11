import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookA, BookPlus, ClipboardPaste, Copy, EyeOff, Link2, Link2Off, Loader2, MessageSquarePlus, Scissors, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import { issueAt, replaceRange, type FoundIssue } from '@/editor/extensions/proofing';
import { languageService } from '@/lib/language/service';
import { useEditorUi } from './EditorContext';
import { wordAt } from './wordAt';

interface MenuState {
  x: number;
  y: number;
  issue?: FoundIssue;
  word: ReturnType<typeof wordAt>;
  inLink: boolean;
}

function Item({ icon: Icon, children, onClick, disabled }: { icon?: React.ElementType; children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} className="menu-item disabled:opacity-50" onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {Icon ? <Icon className="h-4 w-4 opacity-70" /> : <span className="w-4" />}
      <span className="flex-1 text-left">{children}</span>
    </button>
  );
}

export function ContextMenu() {
  const { editor, openDialog, startComment } = useEditorUi();
  const { t } = useI18n();
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [synonyms, setSynonyms] = useState<string[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useEffect(() => {
    const dom = editor.view.dom;
    const onContext = (e: MouseEvent) => {
      // Ctrl/Cmd + right-click keeps the browser menu (e.g. for its own spell checker).
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      const hit = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (!hit) return;
      const { from, to } = editor.state.selection;
      // Like Word, right-clicking outside the selection moves the cursor there.
      if (hit.pos < from || hit.pos > to) editor.commands.setTextSelection(hit.pos);
      setMenu({
        x: e.clientX,
        y: e.clientY,
        issue: issueAt(editor.state, hit.pos),
        word: wordAt(editor.state, hit.pos),
        inLink: editor.isActive('link'),
      });
    };
    dom.addEventListener('contextmenu', onContext);
    return () => dom.removeEventListener('contextmenu', onContext);
  }, [editor]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (e instanceof MouseEvent && ref.current?.contains(e.target as Node)) return;
      setMenu(null);
    };
    window.addEventListener('mousedown', close);
    // Layout updates scroll programmatically; only user scrolling closes the menu.
    window.addEventListener('wheel', close, { passive: true });
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('wheel', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  // Synonyms load in the background while the menu is open.
  useEffect(() => {
    setSynonyms(null);
    if (!menu?.word || menu.issue || !languageService.canSuggestSynonyms()) return;
    let cancelled = false;
    languageService
      .synonyms(menu.word.text, menu.word.context)
      .then((list) => !cancelled && setSynonyms(list.slice(0, 6)))
      .catch(() => !cancelled && setSynonyms([]));
    return () => {
      cancelled = true;
    };
  }, [menu]);

  useLayoutEffect(() => {
    if (!menu || !ref.current) return;
    const { offsetWidth: w, offsetHeight: h } = ref.current;
    setPos({
      left: Math.min(menu.x, window.innerWidth - w - 8),
      top: menu.y + h > window.innerHeight - 8 ? Math.max(8, menu.y - h) : menu.y,
    });
  }, [menu, synonyms]);

  if (!menu) return null;
  const run = (fn: () => void) => () => {
    fn();
    setMenu(null);
  };
  const { issue, word } = menu;

  return createPortal(
    <div ref={ref} className="context-menu" style={pos} role="menu">
      {issue && (
        <>
          {issue.issue.suggestions.length ? (
            issue.issue.suggestions.slice(0, 5).map((s) => (
              <button
                key={s}
                type="button"
                className="menu-item font-indic font-semibold"
                onMouseDown={(e) => e.preventDefault()}
                onClick={run(() => replaceRange(editor, issue.from, issue.to, s))}
              >
                <span className="w-4" />
                {s}
              </button>
            ))
          ) : (
            <Item disabled>{t('spell.noSuggestions')}</Item>
          )}
          {issue.issue.message && <div className="max-w-[260px] px-3 py-1 text-xs text-muted-foreground">{issue.issue.message}</div>}
          <Item icon={EyeOff} onClick={run(() => languageService.ignoreAll(issue.issue.original))}>{t('spell.ignoreAll')}</Item>
          <Item icon={BookPlus} onClick={run(() => languageService.addToDictionary(issue.issue.original))}>{t('spell.addToDictionary')}</Item>
          {issue.issue.suggestions[0] && (
            <Item
              icon={WandSparkles}
              onClick={run(() => {
                languageService.addRule(issue.issue.original, issue.issue.suggestions[0]);
                replaceRange(editor, issue.from, issue.to, issue.issue.suggestions[0]);
              })}
            >
              {t('context.addAutoCorrect', { to: issue.issue.suggestions[0] })}
            </Item>
          )}
          <div className="menu-sep" />
        </>
      )}

      {!issue && word && (
        <>
          <div className="flex items-center gap-1.5 px-3 pb-1 pt-1.5 text-xs font-semibold text-muted-foreground">
            <BookA className="h-3.5 w-3.5" /> {t('context.synonyms')}
          </div>
          {!languageService.canSuggestSynonyms() ? (
            <Item onClick={run(() => openDialog('language'))}>{t('context.connectApi')}</Item>
          ) : synonyms === null ? (
            <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('context.loadingSynonyms')}
            </div>
          ) : synonyms.length === 0 ? (
            <Item disabled>{t('context.noSynonyms')}</Item>
          ) : (
            <div className="flex max-w-[280px] flex-wrap gap-1 px-3 pb-1.5">
              {synonyms.map((s) => (
                <button key={s} type="button" className="chip font-indic" onMouseDown={(e) => e.preventDefault()} onClick={run(() => replaceRange(editor, word.from, word.to, s))}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="menu-sep" />
        </>
      )}

      <Item icon={Scissors} onClick={run(() => document.execCommand('cut'))}>{t('home.cut')}</Item>
      <Item icon={Copy} onClick={run(() => document.execCommand('copy'))}>{t('home.copy')}</Item>
      <Item
        icon={ClipboardPaste}
        onClick={run(async () => {
          try {
            const text = await navigator.clipboard.readText();
            editor.chain().focus().insertContent(text).run();
          } catch {
            toast.info(t('context.pasteBlocked'));
          }
        })}
      >
        {t('home.paste')}
      </Item>
      <div className="menu-sep" />
      <Item icon={Link2} onClick={run(() => openDialog('link'))}>{t(menu.inLink ? 'context.editLink' : 'insert.link')}</Item>
      {menu.inLink && <Item icon={Link2Off} onClick={run(() => editor.chain().focus().extendMarkRange('link').unsetLink().run())}>{t('context.removeLink')}</Item>}
      <Item icon={MessageSquarePlus} onClick={run(startComment)}>{t('review.newComment')}</Item>
    </div>,
    document.body,
  );
}

import { Globe, Languages, Minus, Plus, ScrollText, SpellCheck2, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useI18n } from '@/i18n';
import { getPageCount, PAGE_GAP } from '@/editor/extensions/pagination';
import { getIssues } from '@/editor/extensions/proofing';
import { isTransliterating } from '@/editor/extensions/transliteration';
import { countWords, pageGeometry } from '@/lib/document';
import { useLanguage } from '@/lib/language/service';
import { cn } from '@/lib/utils';
import { useEditorUi } from './EditorContext';
import { ZOOM_MAX, ZOOM_MIN } from './ribbon/ViewTab';

function useCurrentPage(): number {
  const { editor, stackRef, settings, zoom, layout } = useEditorUi();
  if (layout !== 'print' || !stackRef.current || editor.isDestroyed) return 1;
  try {
    const coords = editor.view.coordsAtPos(editor.state.selection.from);
    const top = stackRef.current.getBoundingClientRect().top;
    const pageSpan = (pageGeometry(settings).height + PAGE_GAP) * zoom;
    return Math.max(1, Math.floor((coords.top - top) / pageSpan) + 1);
  } catch {
    return 1;
  }
}

export function StatusBar() {
  const ui = useEditorUi();
  const { editor } = ui;
  const { t } = useI18n();
  const { status } = useLanguage();
  const pages = getPageCount(editor.state);
  const page = Math.min(useCurrentPage(), pages);
  const { from, to, empty } = editor.state.selection;
  const words = countWords(editor.getText());
  const selectedWords = empty ? 0 : countWords(editor.state.doc.textBetween(from, to, ' '));
  const issues = getIssues(editor.state).length;
  const translit = isTransliterating(editor.state);

  const proof =
    status === 'checking'
      ? { icon: Loader2, text: t('status.proofChecking'), spin: true }
      : status === 'error'
        ? { icon: AlertTriangle, text: t('status.proofError'), spin: false }
        : issues
          ? { icon: SpellCheck2, text: t('status.proofIssues', { count: issues }), spin: false }
          : { icon: CheckCircle2, text: t('status.proofClean'), spin: false };

  return (
    <footer className="status-bar">
      <span>{ui.layout === 'print' ? t('status.page', { page, pages }) : null}</span>
      <span>{selectedWords ? t('status.wordsSelected', { selected: selectedWords, count: words }) : t('status.words', { count: words })}</span>
      <button type="button" className="status-btn" onClick={() => ui.setPanel('spelling')} title={proof.text}>
        <proof.icon className={cn('h-3.5 w-3.5', proof.spin && 'animate-spin', status === 'error' && 'text-destructive')} />
        <span className="hidden sm:inline">{proof.text}</span>
      </button>
      <span className="hidden md:inline">{t('status.kannada')}</span>
      <button
        type="button"
        className={cn('status-btn', translit && 'font-semibold text-primary')}
        title={t('review.transliterationHint')}
        onClick={() => editor.chain().focus().toggleTransliteration().run()}
      >
        <Languages className="h-3.5 w-3.5" />
        {t(translit ? 'status.translitOn' : 'status.translitOff')}
      </button>

      <div className="ml-auto flex items-center gap-1">
        <button type="button" className={cn('status-btn', ui.layout === 'print' && 'bg-black/10')} title={t('view.printLayout')} onClick={() => ui.setLayout('print')}>
          <ScrollText className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={cn('status-btn', ui.layout === 'web' && 'bg-black/10')} title={t('view.webLayout')} onClick={() => ui.setLayout('web')}>
          <Globe className="h-3.5 w-3.5" />
        </button>
        <button type="button" className="status-btn" aria-label={t('view.zoomOut')} onClick={() => ui.setZoom(Math.max(ZOOM_MIN, ui.zoom - 0.1))}>
          <Minus className="h-3 w-3" />
        </button>
        <Slider
          className="hidden w-28 sm:flex"
          min={ZOOM_MIN * 100}
          max={ZOOM_MAX * 100}
          step={10}
          value={[Math.round(ui.zoom * 100)]}
          onValueChange={([v]) => ui.setZoom(v / 100)}
          aria-label="Zoom"
        />
        <button type="button" className="status-btn" aria-label={t('view.zoomIn')} onClick={() => ui.setZoom(Math.min(ZOOM_MAX, ui.zoom + 0.1))}>
          <Plus className="h-3 w-3" />
        </button>
        <button type="button" className="status-btn w-12 justify-center" onClick={() => ui.setZoom(1)}>
          {Math.round(ui.zoom * 100)}%
        </button>
      </div>
    </footer>
  );
}

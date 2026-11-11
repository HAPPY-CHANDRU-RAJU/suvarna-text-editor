import { X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { useEditorUi } from '../EditorContext';

export function NavigationPane() {
  const { editor, setShowNavigation } = useEditorUi();
  const { t } = useI18n();

  const headings: { pos: number; level: number; text: string }[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      headings.push({ pos, level: node.attrs.level, text: node.textContent });
      return false;
    }
    return node.type.name !== 'paragraph';
  });
  const cursor = editor.state.selection.from;
  const current = [...headings].reverse().find((h) => h.pos < cursor);

  return (
    <aside className="side-pane side-pane-left">
      <div className="side-pane-header">
        <span>{t('nav.title')}</span>
        <button type="button" className="rounded p-1 hover:bg-muted" onClick={() => setShowNavigation(false)} aria-label={t('common.close')}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {headings.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">{t('nav.empty')}</p>
        ) : (
          headings.map((h) => (
            <button
              key={h.pos}
              type="button"
              className={cn('nav-item', current?.pos === h.pos && 'is-active')}
              style={{ paddingLeft: 8 + (h.level - 1) * 14 }}
              onClick={() => editor.chain().focus().setTextSelection(h.pos + 1).scrollIntoView().run()}
            >
              <span className="truncate font-indic">{h.text || '—'}</span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}

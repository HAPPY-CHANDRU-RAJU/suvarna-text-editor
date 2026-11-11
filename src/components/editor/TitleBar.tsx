import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cloud, CloudOff, HardDrive, Loader2, Redo2, Save, Share2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { useAuth } from '@/services/auth';
import { UserMenu } from '@/components/app/UserMenu';
import { useEditorUi } from './EditorContext';

export function TitleBar() {
  const ui = useEditorUi();
  const { t } = useI18n();
  const { mode } = useAuth();
  const [draft, setDraft] = useState(ui.title);

  useEffect(() => setDraft(ui.title), [ui.title]);

  const commit = () => {
    const next = draft.trim();
    if (next !== ui.title) ui.setTitle(next);
  };

  const saveIcon =
    ui.saveState === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : ui.saveState === 'error' ? <CloudOff className="h-3.5 w-3.5" /> : mode === 'cloud' ? <Cloud className="h-3.5 w-3.5" /> : <HardDrive className="h-3.5 w-3.5" />;
  const saveText =
    ui.saveState === 'saving' ? t('save.saving') : ui.saveState === 'error' ? t('save.error') : mode === 'cloud' ? t('save.saved') : t('save.local');

  return (
    <header className="title-bar">
      <Link to="/app" className="title-bar-logo" title={t('app.name')}>
        ಸು
      </Link>
      <div className="flex items-center">
        <button type="button" className="title-bar-btn" onClick={ui.saveNow} title={`${t('common.save')} (Ctrl+S)`} aria-label={t('common.save')}>
          <Save className="h-4 w-4" />
        </button>
        <button type="button" className="title-bar-btn" onClick={() => ui.editor.chain().focus().undo().run()} disabled={!ui.editor.can().undo()} title="Ctrl+Z" aria-label="Undo">
          <Undo2 className="h-4 w-4" />
        </button>
        <button type="button" className="title-bar-btn" onClick={() => ui.editor.chain().focus().redo().run()} disabled={!ui.editor.can().redo()} title="Ctrl+Y" aria-label="Redo">
          <Redo2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-auto flex min-w-0 items-center gap-2">
        <input
          className="title-bar-input"
          value={draft}
          placeholder={t('common.untitled')}
          aria-label={t('common.rename')}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit();
              ui.editor.commands.focus();
            }
            if (e.key === 'Escape') setDraft(ui.title);
          }}
          size={Math.max(12, Math.min(48, (draft || t('common.untitled')).length + 2))}
        />
        <span className="hidden items-center gap-1 whitespace-nowrap text-xs opacity-80 md:flex" aria-live="polite">
          {saveIcon}
          {saveText}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" className="h-7 gap-1.5 bg-white/15 text-white hover:bg-white/25" onClick={() => ui.openDialog('share')}>
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('file.share')}</span>
        </Button>
        <UserMenu variant="dark" />
      </div>
    </header>
  );
}

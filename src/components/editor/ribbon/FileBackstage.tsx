import { useEffect, useRef, useState, type ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FilePlus2, FileUp, FolderOpen, Info, Printer, Share2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n, type MessageKey } from '@/i18n';
import { useAuth } from '@/services/auth';
import { getPageCount } from '@/editor/extensions/pagination';
import { countWords } from '@/lib/document';
import { IMPORT_ACCEPT, importFile } from '@/lib/export/import';
import type { ExportFormat } from '@/lib/export/files';
import { TEMPLATES } from '@/lib/templates';
import { htmlToContent } from '@/lib/export/import';
import { cn } from '@/lib/utils';
import { useEditorUi } from '../EditorContext';

type Section = 'info' | 'new' | 'export';

const EXPORTS: { format: ExportFormat; label: MessageKey; ext: string }[] = [
  { format: 'docx', label: 'file.docx', ext: 'DOCX' },
  { format: 'pdf', label: 'file.pdf', ext: 'PDF' },
  { format: 'html', label: 'file.html', ext: 'HTML' },
  { format: 'txt', label: 'file.txt', ext: 'TXT' },
  { format: 'suvarna', label: 'file.suvarna', ext: 'JSON' },
];

export function FileBackstage({ onClose }: { onClose: () => void }) {
  const ui = useEditorUi();
  const { t, n, lang } = useI18n();
  const { repository, mode } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>('info');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const createFrom = async (title: string, html?: string) => {
    if (!repository) return;
    const doc = await repository.create({ title, content: html ? htmlToContent(html) : undefined });
    onClose();
    navigate(`/app/doc/${doc.id}`);
  };

  const onImport = async (file: File | undefined) => {
    if (!file || !repository) return;
    try {
      const imported = await importFile(file);
      const doc = await repository.create({ title: imported.title, content: imported.content, settings: imported.settings });
      imported.warnings.slice(0, 3).forEach((w) => toast.warning(w));
      onClose();
      navigate(`/app/doc/${doc.id}`);
    } catch (err) {
      toast.error(t('error.importFailed'), { description: err instanceof Error ? err.message : undefined });
    }
  };

  const nav: { id: Section | 'open' | 'import' | 'print' | 'share' | 'close'; icon: ElementType; label: MessageKey }[] = [
    { id: 'info', icon: Info, label: 'file.info' },
    { id: 'new', icon: FilePlus2, label: 'file.new' },
    { id: 'open', icon: FolderOpen, label: 'file.open' },
    { id: 'import', icon: FileUp, label: 'file.import' },
    { id: 'export', icon: Download, label: 'file.saveAs' },
    { id: 'print', icon: Printer, label: 'file.print' },
    { id: 'share', icon: Share2, label: 'file.share' },
    { id: 'close', icon: X, label: 'file.close' },
  ];

  const onNav = (id: (typeof nav)[number]['id']) => {
    switch (id) {
      case 'open':
      case 'close':
        ui.saveNow();
        navigate('/app');
        break;
      case 'import':
        fileInput.current?.click();
        break;
      case 'print':
        onClose();
        ui.print();
        break;
      case 'share':
        onClose();
        ui.openDialog('share');
        break;
      default:
        setSection(id);
    }
  };

  const date = (iso: string) => new Intl.DateTimeFormat(lang === 'kn' ? 'kn-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

  return (
    <div className="backstage" role="dialog" aria-modal="true">
      <aside className="backstage-nav">
        <button type="button" onClick={onClose} className="backstage-back" aria-label={t('common.back')}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        {nav.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNav(item.id)}
            className={cn('backstage-item', section === item.id && 'is-active')}
          >
            <item.icon className="h-4 w-4" />
            {t(item.label)}
          </button>
        ))}
        <input ref={fileInput} type="file" accept={IMPORT_ACCEPT} hidden onChange={(e) => onImport(e.target.files?.[0])} />
      </aside>

      <main className="backstage-main">
        {section === 'info' && (
          <div className="max-w-xl">
            <h2 className="mb-6 font-display text-3xl">{ui.title || t('common.untitled')}</h2>
            <dl className="grid grid-cols-[160px_1fr] gap-y-3 text-sm">
              <dt className="text-muted-foreground">{t('file.pages')}</dt>
              <dd>{n(getPageCount(ui.editor.state))}</dd>
              <dt className="text-muted-foreground">{t('file.words')}</dt>
              <dd>{n(countWords(ui.editor.getText()))}</dd>
              <dt className="text-muted-foreground">{t('file.created')}</dt>
              <dd>{date(ui.doc.createdAt)}</dd>
              <dt className="text-muted-foreground">{t('file.modified')}</dt>
              <dd>{date(ui.doc.updatedAt)}</dd>
              <dt className="text-muted-foreground">{t('file.storage')}</dt>
              <dd>{t(mode === 'cloud' ? 'file.storageCloud' : 'file.storageLocal')}</dd>
            </dl>
          </div>
        )}

        {section === 'new' && (
          <div>
            <h2 className="mb-6 font-display text-3xl">{t('file.new')}</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
              <button type="button" className="template-card" onClick={() => createFrom('')}>
                <div className="template-thumb" />
                <span>{t('dash.blank')}</span>
              </button>
              {TEMPLATES.map((tpl) => (
                <button key={tpl.id} type="button" className="template-card" onClick={() => createFrom(tpl.title, tpl.html())}>
                  <div className="template-thumb template-thumb-lines" />
                  <span>{t(tpl.nameKey)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {section === 'export' && (
          <div className="max-w-xl">
            <h2 className="mb-6 font-display text-3xl">{t('file.saveAs')}</h2>
            <div className="space-y-2">
              {EXPORTS.map((e) => (
                <button
                  key={e.format}
                  type="button"
                  className="flex w-full items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
                  onClick={async () => {
                    onClose();
                    await ui.exportAs(e.format);
                  }}
                >
                  <span className="flex h-10 w-12 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">{e.ext}</span>
                  <span>{t(e.label)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

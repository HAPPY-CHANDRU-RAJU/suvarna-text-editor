import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Copy, Download, FileText, FileUp, Home, Info, Loader2, MoreVertical, Pencil, PlugZap, Plus, Search, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { LanguageSettingsDialog } from '@/components/app/LanguageSettingsDialog';
import { UserMenu } from '@/components/app/UserMenu';
import { useI18n } from '@/i18n';
import type { DocumentSummary } from '@/lib/document';
import { downloadBlob, safeFileName } from '@/lib/export/files';
import { htmlToContent, IMPORT_ACCEPT, importFile } from '@/lib/export/import';
import { TEMPLATES } from '@/lib/templates';
import { useAuth } from '@/services/auth';
import { cn } from '@/lib/utils';

type View = 'home' | 'recent' | 'starred';

export default function Dashboard() {
  const { repository, mode } = useAuth();
  const { t, n, lang } = useI18n();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocumentSummary[] | null>(null);
  const [view, setView] = useState<View>('home');
  const [query, setQuery] = useState('');
  const [renaming, setRenaming] = useState<DocumentSummary | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [languageOpen, setLanguageOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!repository) return;
    try {
      setDocs(await repository.list());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setDocs([]);
    }
  }, [repository]);

  useEffect(() => {
    void load();
    document.title = `${t('dash.documents')} — ${t('app.name')}`;
  }, [load, t]);

  const create = async (title = '', html?: string) => {
    if (!repository) return;
    const doc = await repository.create({ title, content: html ? htmlToContent(html) : undefined });
    navigate(`/app/doc/${doc.id}`);
  };

  const onImport = async (file?: File) => {
    if (!file || !repository) return;
    try {
      const imported = await importFile(file);
      const doc = await repository.create({ title: imported.title, content: imported.content, settings: imported.settings });
      imported.warnings.slice(0, 3).forEach((w) => toast.warning(w));
      navigate(`/app/doc/${doc.id}`);
    } catch (err) {
      toast.error(t('error.importFailed'), { description: err instanceof Error ? err.message : undefined });
    }
  };

  const update = async (doc: DocumentSummary, patch: { title?: string; starred?: boolean }) => {
    if (!repository) return;
    setDocs((prev) => prev?.map((d) => (d.id === doc.id ? { ...d, ...patch } : d)) ?? null);
    await repository.update(doc.id, patch).catch((err) => toast.error(String(err)));
  };

  const duplicate = async (doc: DocumentSummary) => {
    if (!repository) return;
    const full = await repository.get(doc.id);
    if (!full) return;
    const copy = await repository.create({ title: `${full.title || t('common.untitled')} (2)`, content: full.content, settings: full.settings });
    await repository.update(copy.id, { preview: full.preview, wordCount: full.wordCount });
    void load();
  };

  const download = async (doc: DocumentSummary) => {
    if (!repository) return;
    const full = await repository.get(doc.id);
    if (!full) return;
    const { exportDocx } = await import('@/lib/export/docx');
    downloadBlob(await exportDocx(full.content, full.settings, full.title), `${safeFileName(full.title, 'document')}.docx`);
  };

  const remove = async (doc: DocumentSummary) => {
    if (!repository) return;
    if (!window.confirm(t('dash.deleteConfirm', { title: doc.title || t('common.untitled') }))) return;
    await repository.remove(doc.id);
    setDocs((prev) => prev?.filter((d) => d.id !== doc.id) ?? null);
    toast.success(t('dash.deleted'));
  };

  const visible = useMemo(() => {
    let list = docs ?? [];
    if (view === 'starred') list = list.filter((d) => d.starred);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((d) => d.title.toLowerCase().includes(q) || d.preview.toLowerCase().includes(q));
    return list;
  }, [docs, view, query]);

  const date = (iso: string) => {
    const d = new Date(iso);
    const sameDay = d.toDateString() === new Date().toDateString();
    return new Intl.DateTimeFormat(lang === 'kn' ? 'kn-IN' : 'en-IN', sameDay ? { timeStyle: 'short' } : { dateStyle: 'medium' }).format(d);
  };

  const nav: { id: View; icon: React.ElementType; label: Parameters<typeof t>[0] }[] = [
    { id: 'home', icon: Home, label: 'dash.home' },
    { id: 'recent', icon: Clock, label: 'dash.recent' },
    { id: 'starred', icon: Star, label: 'dash.starred' },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar p-3 md:flex">
        <Link to="/" className="mb-6 flex items-center gap-2 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-indic text-lg font-bold text-brand-foreground">ಸು</span>
          <span className="font-display text-xl font-bold">{t('app.name')}</span>
        </Link>
        <Button className="mb-4 justify-start gap-2" onClick={() => create()}>
          <Plus className="h-4 w-4" /> {t('dash.blank')}
        </Button>
        {nav.map((item) => (
          <button key={item.id} type="button" onClick={() => setView(item.id)} className={cn('nav-item gap-3 py-2', view === item.id && 'is-active')}>
            <item.icon className="h-4 w-4" /> {t(item.label)}
          </button>
        ))}
        <button type="button" onClick={() => fileInput.current?.click()} className="nav-item gap-3 py-2">
          <FileUp className="h-4 w-4" /> {t('file.import')}
        </button>
        <button type="button" onClick={() => setLanguageOpen(true)} className="nav-item gap-3 py-2">
          <PlugZap className="h-4 w-4" /> {t('review.languageServices')}
        </button>
        <input ref={fileInput} type="file" accept={IMPORT_ACCEPT} hidden onChange={(e) => onImport(e.target.files?.[0])} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:px-8">
          <Link to="/" className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand font-indic font-bold text-brand-foreground md:hidden">ಸು</Link>
          <div className="relative max-w-xl flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-10 rounded-full bg-muted pl-9 font-indic" placeholder={t('dash.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="ml-auto">
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8">
          {mode === 'local' && (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{t('dash.localMode')}</span>
            </div>
          )}

          {view === 'home' && !query && (
            <section className="mb-10">
              <h2 className="mb-4 text-lg font-semibold">{t('dash.newDocument')}</h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
                <button type="button" className="template-card" onClick={() => create()}>
                  <div className="template-thumb flex items-center justify-center">
                    <Plus className="h-10 w-10 text-primary" strokeWidth={1.25} />
                  </div>
                  <span>{t('dash.blank')}</span>
                </button>
                {TEMPLATES.map((tpl) => (
                  <button key={tpl.id} type="button" className="template-card" onClick={() => create(tpl.title, tpl.html())}>
                    <div className="template-thumb template-thumb-lines">
                      <span className="template-thumb-title font-indic">{tpl.title}</span>
                    </div>
                    <span>{t(tpl.nameKey)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-lg font-semibold">{t(view === 'starred' ? 'dash.starred' : 'dash.documents')}</h2>
            {docs === null ? (
              <div className="flex items-center gap-2 py-10 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading')}
              </div>
            ) : visible.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">{t(view === 'starred' ? 'dash.emptyStarred' : 'dash.empty')}</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="hidden grid-cols-[1fr_140px_90px_80px] gap-4 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground sm:grid">
                  <span>{t('dash.name')}</span>
                  <span>{t('dash.modified')}</span>
                  <span className="text-right">{t('dash.words')}</span>
                  <span />
                </div>
                {visible.map((doc) => (
                  <div key={doc.id} className="group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-4 py-3 last:border-0 hover:bg-muted/50 sm:grid-cols-[1fr_140px_90px_80px]">
                    <Link to={`/app/doc/${doc.id}`} className="flex min-w-0 items-center gap-3">
                      <FileText className="h-8 w-8 shrink-0 text-primary" strokeWidth={1.25} />
                      <div className="min-w-0">
                        <div className="truncate font-indic font-medium">{doc.title || t('common.untitled')}</div>
                        <div className="truncate font-indic text-xs text-muted-foreground">{doc.preview}</div>
                      </div>
                    </Link>
                    <span className="hidden text-sm text-muted-foreground sm:block">{date(doc.updatedAt)}</span>
                    <span className="hidden text-right text-sm tabular-nums text-muted-foreground sm:block">{n(doc.wordCount)}</span>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        className={cn('rounded p-1.5 hover:bg-muted', doc.starred ? 'text-amber-500' : 'text-muted-foreground opacity-0 group-hover:opacity-100')}
                        aria-label={t(doc.starred ? 'common.unstar' : 'common.star')}
                        onClick={() => update(doc, { starred: !doc.starred })}
                      >
                        <Star className="h-4 w-4" fill={doc.starred ? 'currentColor' : 'none'} />
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="rounded p-1.5 text-muted-foreground hover:bg-muted" aria-label="More">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => navigate(`/app/doc/${doc.id}`)}>
                            <FileText className="mr-2 h-4 w-4" /> {t('common.open')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              setRenaming(doc);
                              setRenameValue(doc.title);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" /> {t('common.rename')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => duplicate(doc)}>
                            <Copy className="mr-2 h-4 w-4" /> {t('common.duplicate')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => download(doc)}>
                            <Download className="mr-2 h-4 w-4" /> {t('file.docx')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => remove(doc)}>
                            <Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      <Dialog open={renaming !== null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dialog.rename.title')}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            className="font-indic"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && renaming) {
                void update(renaming, { title: renameValue.trim() });
                setRenaming(null);
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => {
                if (renaming) void update(renaming, { title: renameValue.trim() });
                setRenaming(null);
              }}
            >
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <LanguageSettingsDialog open={languageOpen} onOpenChange={setLanguageOpen} />
    </div>
  );
}

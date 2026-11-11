import { useEffect, useState } from 'react';
import { Copy, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/i18n';
import { useAuth } from '@/services/auth';
import { getPageCount } from '@/editor/extensions/pagination';
import { countAksharas, countWords, PAGE_SIZES, type Align, type PageNumberPosition, type PageSizeId } from '@/lib/document';
import { TRANSLITERATION_CHART } from '@/lib/kannada/transliterate';
import { cn } from '@/lib/utils';
import { LanguageSettingsDialog } from '@/components/app/LanguageSettingsDialog';
import { useEditorUi } from './EditorContext';

function useDialog(name: Parameters<ReturnType<typeof useEditorUi>['openDialog']>[0]) {
  const ui = useEditorUi();
  return {
    open: ui.dialog === name,
    onOpenChange: (open: boolean) => {
      if (!open) {
        ui.openDialog(null);
        ui.editor.commands.focus();
      }
    },
  };
}

function LinkDialog() {
  const { editor, openDialog } = useEditorUi();
  const { t } = useI18n();
  const props = useDialog('link');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    if (!props.open) return;
    const { from, to } = editor.state.selection;
    setUrl(editor.getAttributes('link').href ?? '');
    setText(editor.state.doc.textBetween(from, to, ' '));
  }, [props.open, editor]);

  const apply = () => {
    const href = url.trim();
    const chain = editor.chain().focus().extendMarkRange('link');
    if (!href) {
      chain.unsetLink().run();
    } else {
      const normalized = /^(https?:|mailto:|tel:|#)/i.test(href) ? href : `https://${href}`;
      const { empty } = editor.state.selection;
      if (empty || (text && text !== editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' '))) {
        chain.insertContent({ type: 'text', text: text || href, marks: [{ type: 'link', attrs: { href: normalized } }] }).run();
      } else {
        chain.setLink({ href: normalized }).run();
      }
    }
    openDialog(null);
  };

  return (
    <Dialog {...props}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dialog.link.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="link-text">{t('dialog.link.text')}</Label>
            <Input id="link-text" className="font-indic" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="link-url">{t('dialog.link.url')}</Label>
            <Input id="link-url" autoFocus placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={apply}>{t('common.apply')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HeaderFooterDialog() {
  const { settings, updateSettings, openDialog } = useEditorUi();
  const { t } = useI18n();
  const props = useDialog('headerFooter');
  const [draft, setDraft] = useState(settings);
  useEffect(() => {
    if (props.open) setDraft(settings);
  }, [props.open, settings]);

  const positions: { value: PageNumberPosition; label: Parameters<typeof t>[0] }[] = [
    { value: 'none', label: 'dialog.headerFooter.none' },
    { value: 'header', label: 'dialog.headerFooter.inHeader' },
    { value: 'footer', label: 'dialog.headerFooter.inFooter' },
  ];
  const aligns: { value: Align; label: Parameters<typeof t>[0] }[] = [
    { value: 'left', label: 'home.alignLeft' },
    { value: 'center', label: 'home.alignCenter' },
    { value: 'right', label: 'home.alignRight' },
  ];

  return (
    <Dialog {...props}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('dialog.headerFooter.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="hf-header">{t('dialog.headerFooter.header')}</Label>
            <Input id="hf-header" className="font-indic" value={draft.header} onChange={(e) => setDraft({ ...draft, header: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="hf-footer">{t('dialog.headerFooter.footer')}</Label>
            <Input id="hf-footer" className="font-indic" value={draft.footer} onChange={(e) => setDraft({ ...draft, footer: e.target.value })} />
          </div>
          <div>
            <Label>{t('dialog.headerFooter.pageNumbers')}</Label>
            <div className="mt-1 flex gap-1">
              {positions.map((p) => (
                <Button key={p.value} size="sm" variant={draft.pageNumbers === p.value ? 'default' : 'outline'} onClick={() => setDraft({ ...draft, pageNumbers: p.value })}>
                  {t(p.label)}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>{t('dialog.headerFooter.align')}</Label>
            <div className="mt-1 flex gap-1">
              {aligns.map((a) => (
                <Button key={a.value} size="sm" variant={draft.pageNumberAlign === a.value ? 'default' : 'outline'} onClick={() => setDraft({ ...draft, pageNumberAlign: a.value })}>
                  {t(a.label)}
                </Button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={draft.kannadaNumerals} onCheckedChange={(v) => setDraft({ ...draft, kannadaNumerals: v === true })} />
            {t('dialog.headerFooter.kannadaNumerals')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={draft.differentFirstPage} onCheckedChange={(v) => setDraft({ ...draft, differentFirstPage: v === true })} />
            {t('dialog.headerFooter.differentFirst')}
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button
            onClick={() => {
              updateSettings(draft);
              openDialog(null);
            }}
          >
            {t('common.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PageSetupDialog() {
  const { settings, updateSettings, openDialog } = useEditorUi();
  const { t } = useI18n();
  const props = useDialog('pageSetup');
  const [draft, setDraft] = useState(settings);
  useEffect(() => {
    if (props.open) setDraft(settings);
  }, [props.open, settings]);

  const margin = (side: keyof typeof draft.margins) => (
    <div>
      <Label htmlFor={`m-${side}`}>{t(`layout.${side}` as const)}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={`m-${side}`}
          type="number"
          min={0}
          max={4}
          step={0.05}
          value={draft.margins[side]}
          onChange={(e) => setDraft({ ...draft, margins: { ...draft.margins, [side]: Math.max(0, Math.min(4, Number(e.target.value) || 0)) } })}
        />
        <span className="text-xs text-muted-foreground">{t('layout.inches')}</span>
      </div>
    </div>
  );

  return (
    <Dialog {...props}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('layout.pageSetup')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {margin('top')}
            {margin('bottom')}
            {margin('left')}
            {margin('right')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('layout.size')}</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={draft.size}
                onChange={(e) => setDraft({ ...draft, size: e.target.value as PageSizeId })}
              >
                {(Object.keys(PAGE_SIZES) as PageSizeId[]).map((id) => (
                  <option key={id} value={id}>{PAGE_SIZES[id].label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t('layout.orientation')}</Label>
              <div className="mt-1 flex gap-1">
                {(['portrait', 'landscape'] as const).map((o) => (
                  <Button key={o} size="sm" className="flex-1" variant={draft.orientation === o ? 'default' : 'outline'} onClick={() => setDraft({ ...draft, orientation: o })}>
                    {t(`layout.${o}`)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button
            onClick={() => {
              updateSettings({ margins: draft.margins, size: draft.size, orientation: draft.orientation });
              openDialog(null);
            }}
          >
            {t('common.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WordCountDialog() {
  const { editor } = useEditorUi();
  const { t, n } = useI18n();
  const props = useDialog('wordCount');
  const { from, to, empty } = editor.state.selection;
  const text = empty ? editor.getText({ blockSeparator: '\n' }) : editor.state.doc.textBetween(from, to, '\n');
  let paragraphs = 0;
  editor.state.doc.nodesBetween(empty ? 0 : from, empty ? editor.state.doc.content.size : to, (node) => {
    if (node.isTextblock && node.textContent.trim()) paragraphs++;
  });
  const rows: [Parameters<typeof t>[0], number][] = [
    ['dialog.wordCount.pages', getPageCount(editor.state)],
    ['dialog.wordCount.words', countWords(text)],
    ['dialog.wordCount.aksharas', countAksharas(text)],
    ['dialog.wordCount.chars', text.replace(/\s/g, '').length],
    ['dialog.wordCount.charsSpaces', text.replace(/\n/g, '').length],
    ['dialog.wordCount.paragraphs', paragraphs],
  ];
  return (
    <Dialog {...props}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('dialog.wordCount.title')}</DialogTitle>
          {!empty && <DialogDescription>{t('dialog.wordCount.selection')}</DialogDescription>}
        </DialogHeader>
        <dl className="divide-y divide-border text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between py-2">
              <dt className="text-muted-foreground">{t(label)}</dt>
              <dd className="font-semibold tabular-nums">{n(value)}</dd>
            </div>
          ))}
        </dl>
        <DialogFooter>
          <Button onClick={() => props.onOpenChange(false)}>{t('common.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const SYMBOLS = {
  kannada: 'ಅ ಆ ಇ ಈ ಉ ಊ ಋ ೠ ಎ ಏ ಐ ಒ ಓ ಔ ಂ ಃ ಽ ೞ ಱ ೦ ೧ ೨ ೩ ೪ ೫ ೬ ೭ ೮ ೯ ॥ । ೱ ೲ'.split(' '),
  punctuation: '“ ” ‘ ’ « » – — … • · ¶ § † ‡ © ® ™ ° ′ ″ ‹ › ¡ ¿ ※ ⁂'.split(' '),
  math: '₹ $ € £ ¥ ± × ÷ ≠ ≈ ≤ ≥ ∞ √ ∑ ∏ ∫ π ∆ ½ ⅓ ¼ ¾ % ‰ ← → ↑ ↓ ⇒ ✓ ✗ ★ ☆'.split(' '),
};

function SymbolDialog() {
  const { editor } = useEditorUi();
  const { t } = useI18n();
  const props = useDialog('symbol');
  const grid = (chars: string[]) => (
    <div className="grid grid-cols-10 gap-1">
      {chars.map((c) => (
        <button
          key={c}
          type="button"
          className="flex h-9 items-center justify-center rounded border border-border font-indic text-lg hover:border-primary hover:bg-primary/10"
          onClick={() => editor.chain().focus().insertContent(c).run()}
        >
          {c}
        </button>
      ))}
    </div>
  );
  return (
    <Dialog {...props}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('dialog.symbol.title')}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="kannada">
          <TabsList>
            <TabsTrigger value="kannada">{t('dialog.symbol.kannada')}</TabsTrigger>
            <TabsTrigger value="punctuation">{t('dialog.symbol.punctuation')}</TabsTrigger>
            <TabsTrigger value="math">{t('dialog.symbol.math')}</TabsTrigger>
          </TabsList>
          {(Object.keys(SYMBOLS) as (keyof typeof SYMBOLS)[]).map((k) => (
            <TabsContent key={k} value={k}>{grid(SYMBOLS[k])}</TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ShareDialog() {
  const { doc } = useEditorUi();
  const { t } = useI18n();
  const { mode, repository } = useAuth();
  const props = useDialog('share');
  const [isPublic, setIsPublic] = useState(doc.isPublic);
  const [busy, setBusy] = useState(false);
  const link = `${window.location.origin}/share/${doc.id}`;

  const toggle = async (next: boolean) => {
    if (!repository) return;
    setBusy(true);
    try {
      await repository.update(doc.id, { isPublic: next });
      setIsPublic(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog {...props}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dialog.share.title')}</DialogTitle>
        </DialogHeader>
        {mode === 'local' ? (
          <p className="text-sm text-muted-foreground">{t('dialog.share.localOnly')}</p>
        ) : (
          <div className="space-y-4">
            <label className="flex items-center gap-3 rounded-lg border border-border p-3">
              {isPublic ? <Globe className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
              <span className="flex-1 text-sm">{t(isPublic ? 'dialog.share.public' : 'dialog.share.private')}</span>
              <Switch checked={isPublic} disabled={busy} onCheckedChange={toggle} />
            </label>
            {isPublic && (
              <div className="flex gap-2">
                <Input readOnly value={link} onFocus={(e) => e.target.select()} />
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={async () => {
                    await navigator.clipboard.writeText(link);
                    toast.success(t('dialog.share.copied'));
                  }}
                >
                  <Copy className="h-4 w-4" /> {t('dialog.share.copy')}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TranslitHelpDialog() {
  const { t } = useI18n();
  const props = useDialog('translitHelp');
  return (
    <Dialog {...props}>
      <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('dialog.translitHelp')}</DialogTitle>
          <DialogDescription>{t('dialog.translitHelpIntro')}</DialogDescription>
        </DialogHeader>
        <p className="rounded-md bg-muted p-2 font-indic text-sm">namaskaara → ನಮಸ್ಕಾರ · kannaDa → ಕನ್ನಡ · beMgaLUru → ಬೆಂಗಳೂರು · kRuShi → ಕೃಷಿ</p>
        {TRANSLITERATION_CHART.map((group) => (
          <div key={group.group}>
            <div className="grid grid-cols-3 gap-1 sm:grid-cols-5">
              {group.rows.map(([latin, kannada]) => (
                <div key={latin} className={cn('flex items-center justify-between rounded border border-border px-2 py-1 text-sm')}>
                  <code className="text-xs text-muted-foreground">{latin}</code>
                  <span className="font-indic text-base">{kannada}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
}

export function EditorDialogs() {
  const ui = useEditorUi();
  return (
    <>
      <LinkDialog />
      <HeaderFooterDialog />
      <PageSetupDialog />
      <WordCountDialog />
      <SymbolDialog />
      <ShareDialog />
      <TranslitHelpDialog />
      <LanguageSettingsDialog open={ui.dialog === 'language'} onOpenChange={(open) => !open && ui.openDialog(null)} />
    </>
  );
}

import { useEffect, useState } from 'react';
import { CheckCircle2, Cloud, Cpu, Loader2, Plug, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cloudLanguageUrl } from '@/config';
import { useI18n } from '@/i18n';
import { BUILTIN_RULES } from '@/lib/language/autocorrect';
import { languageService, useLanguage } from '@/lib/language/service';
import type { LanguageSettings, ProviderKind } from '@/lib/language/types';
import { cn } from '@/lib/utils';

type TestState = { state: 'idle' } | { state: 'testing' } | { state: 'ok'; count: number } | { state: 'fail'; error: string };

export function LanguageSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const { settings } = useLanguage();
  const [draft, setDraft] = useState<LanguageSettings>(settings);
  const [test, setTest] = useState<TestState>({ state: 'idle' });
  const [ruleFrom, setRuleFrom] = useState('');
  const [ruleTo, setRuleTo] = useState('');
  const cloudUrl = cloudLanguageUrl();

  useEffect(() => {
    if (open) {
      setDraft(languageService.settings);
      setTest({ state: 'idle' });
    }
  }, [open]);

  const set = (patch: Partial<LanguageSettings>) => {
    setDraft((d) => ({ ...d, ...patch }));
    if (Object.keys(patch).some((k) => k === 'provider' || k.startsWith('custom'))) setTest({ state: 'idle' });
  };

  const runTest = async () => {
    setTest({ state: 'testing' });
    try {
      const issues = await languageService.test(draft);
      setTest({ state: 'ok', count: issues.length });
    } catch (err) {
      setTest({ state: 'fail', error: err instanceof Error ? err.message : String(err) });
    }
  };

  const save = () => {
    languageService.update(draft);
    onOpenChange(false);
  };

  const providers: { id: ProviderKind; icon: React.ElementType; title: Parameters<typeof t>[0]; hint: Parameters<typeof t>[0]; disabled?: boolean }[] = [
    { id: 'builtin', icon: Cpu, title: 'lang.builtin', hint: 'lang.builtinHint' },
    { id: 'cloud', icon: Cloud, title: 'lang.cloud', hint: 'lang.cloudHint', disabled: !cloudUrl },
    { id: 'custom', icon: Plug, title: 'lang.custom', hint: 'lang.customHint' },
  ];

  const toggle = (key: keyof LanguageSettings, label: Parameters<typeof t>[0], disabled = false) => (
    <label className={cn('flex items-center justify-between gap-3 py-2 text-sm', disabled && 'opacity-50')}>
      <span>{t(label)}</span>
      <Switch checked={Boolean(draft[key])} disabled={disabled} onCheckedChange={(v) => set({ [key]: v } as Partial<LanguageSettings>)} />
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('lang.title')}</DialogTitle>
          <DialogDescription>{t('lang.intro')}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="provider">
          <TabsList>
            <TabsTrigger value="provider">{t('lang.provider')}</TabsTrigger>
            <TabsTrigger value="autocorrect">{t('lang.rules')}</TabsTrigger>
            <TabsTrigger value="dictionary">{t('lang.dictionary')}</TabsTrigger>
          </TabsList>

          <TabsContent value="provider" className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {providers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={p.disabled}
                  onClick={() => set({ provider: p.id })}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    draft.provider === p.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50',
                  )}
                >
                  <p.icon className="mb-2 h-5 w-5 text-primary" />
                  <div className="text-sm font-semibold">{t(p.title)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{p.disabled ? t('lang.cloudMissing') : t(p.hint)}</div>
                </button>
              ))}
            </div>

            {draft.provider === 'cloud' && cloudUrl && <p className="break-all rounded bg-muted px-2 py-1 font-mono text-xs">{cloudUrl}</p>}

            {draft.provider === 'custom' && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div>
                  <Label htmlFor="lang-url">{t('lang.url')}</Label>
                  <Input id="lang-url" placeholder="http://localhost:9001/spellcheck" value={draft.customUrl} onChange={(e) => set({ customUrl: e.target.value.trim() })} />
                </div>
                <div>
                  <Label>{t('lang.format')}</Label>
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    {(['word', 'suvarna'] as const).map((f) => (
                      <Button key={f} type="button" size="sm" variant={draft.customFormat === f ? 'default' : 'outline'} onClick={() => set({ customFormat: f })}>
                        {t(f === 'word' ? 'lang.formatWord' : 'lang.formatSuvarna')}
                      </Button>
                    ))}
                  </div>
                </div>
                {draft.customFormat === 'word' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="lang-wf">{t('lang.wordField')}</Label>
                      <Input id="lang-wf" className="font-mono" value={draft.customWordField} onChange={(e) => set({ customWordField: e.target.value.trim() })} />
                    </div>
                    <div>
                      <Label htmlFor="lang-rf">{t('lang.resultField')}</Label>
                      <Input id="lang-rf" className="font-mono" value={draft.customResultField} onChange={(e) => set({ customResultField: e.target.value.trim() })} />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="lang-hn">{t('lang.headerName')}</Label>
                    <Input id="lang-hn" value={draft.customHeaderName} onChange={(e) => set({ customHeaderName: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="lang-hv">{t('lang.headerValue')}</Label>
                    <Input id="lang-hv" type="password" placeholder="Bearer …" value={draft.customHeaderValue} onChange={(e) => set({ customHeaderValue: e.target.value })} />
                  </div>
                </div>
                <pre className="overflow-auto rounded bg-muted p-2 text-[11px] leading-relaxed">
                  {draft.customFormat === 'word'
                    ? `POST { "${draft.customWordField || 'word'}": "wanner" }
→ { "${draft.customResultField || 'body'}": ["winner", "…"] }
(empty list, or a list containing the word = spelled correctly)`
                    : `POST { "action": "check", "language": "kn", "paragraphs": ["…"] }
→ { "results": [{ "issues": [{ "original": "…", "suggestions": ["…"],
     "type": "spelling", "confidence": 0.95 }] }] }
POST { "action": "synonyms", "word": "…", "context": "…" }
→ { "synonyms": ["…"] }`}
                </pre>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={runTest} disabled={test.state === 'testing' || (draft.provider === 'custom' && !draft.customUrl)}>
                {test.state === 'testing' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plug className="mr-1.5 h-4 w-4" />}
                {t(test.state === 'testing' ? 'lang.testing' : 'lang.test')}
              </Button>
              {test.state === 'ok' && (
                <span className="flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> {t('lang.testOk', { count: test.count })}
                </span>
              )}
              {test.state === 'fail' && (
                <div className="space-y-1 text-sm text-destructive">
                  <span className="flex items-center gap-1 break-all">
                    <XCircle className="h-4 w-4 shrink-0" /> {t('lang.testFail', { error: test.error })}
                  </span>
                  {/fetch|network|load failed/i.test(test.error) && <p className="text-xs text-muted-foreground">{t('lang.corsHint')}</p>}
                </div>
              )}
            </div>

            <div className="divide-y divide-border rounded-lg border border-border px-3">
              {toggle('checkAsYouType', 'lang.checkAsYouType')}
              {toggle('showGrammar', 'lang.showGrammar')}
              {toggle('autoCorrect', 'lang.autoCorrect')}
              {toggle('aiAutoCorrect', 'lang.aiAutoCorrect', draft.provider === 'builtin')}
            </div>
          </TabsContent>

          <TabsContent value="autocorrect" className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('lang.rulesHint')}</p>
            <div className="flex gap-2">
              <Input className="font-indic" placeholder={t('lang.replace')} value={ruleFrom} onChange={(e) => setRuleFrom(e.target.value)} />
              <Input className="font-indic" placeholder={t('lang.with')} value={ruleTo} onChange={(e) => setRuleTo(e.target.value)} />
              <Button
                disabled={!ruleFrom.trim() || !ruleTo.trim()}
                onClick={() => {
                  const from = ruleFrom.trim();
                  set({ userRules: [...draft.userRules.filter((r) => r.from !== from), { from, to: ruleTo.trim() }] });
                  setRuleFrom('');
                  setRuleTo('');
                }}
              >
                {t('common.add')}
              </Button>
            </div>
            <div className="max-h-[300px] overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-1.5">{t('lang.replace')}</th>
                    <th className="px-3 py-1.5">{t('lang.with')}</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="font-indic">
                  {draft.userRules.map((r) => (
                    <tr key={`u-${r.from}`} className="border-t border-border bg-primary/5">
                      <td className="px-3 py-1">{r.from}</td>
                      <td className="px-3 py-1">{r.to}</td>
                      <td>
                        <button type="button" className="rounded p-1 hover:bg-muted" aria-label={t('common.remove')} onClick={() => set({ userRules: draft.userRules.filter((x) => x.from !== r.from) })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {BUILTIN_RULES.map((r) => (
                    <tr key={`b-${r.from}`} className="border-t border-border text-muted-foreground">
                      <td className="px-3 py-1">{r.from}</td>
                      <td className="px-3 py-1">{r.to}</td>
                      <td />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="dictionary">
            {draft.userDictionary.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t('lang.dictionaryEmpty')}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {draft.userDictionary.map((w) => (
                  <span key={w} className="chip gap-1 font-indic">
                    {w}
                    <button type="button" aria-label={t('common.remove')} onClick={() => set({ userDictionary: draft.userDictionary.filter((x) => x !== w) })}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={save}>{t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

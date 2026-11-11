import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/i18n';
import { useAuth } from '@/services/auth';

export default function Auth({ mode: formMode }: { mode: 'login' | 'signup' }) {
  const { mode, user, signIn, signUp, sendMagicLink } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  if (user) return <Navigate to="/app" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (formMode === 'login') {
        await signIn(email, password);
        navigate('/app');
      } else {
        const { needsConfirmation } = await signUp(email, password, name);
        if (needsConfirmation) setMessage({ kind: 'info', text: t('auth.confirmEmail') });
        else navigate('/app');
      }
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  const magic = async () => {
    if (!email) return;
    setBusy(true);
    try {
      await sendMagicLink(email);
      setMessage({ kind: 'info', text: t('auth.magicSent') });
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand font-indic text-lg font-bold text-brand-foreground">ಸು</Link>
          <button type="button" className="ml-auto text-xs text-muted-foreground hover:text-foreground" onClick={() => setLang(lang === 'kn' ? 'en' : 'kn')}>
            {t('common.uiLanguage')}
          </button>
        </div>
        <h1 className="font-indic text-2xl font-bold">{t('auth.welcome')}</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">{t('auth.subtitle')}</p>

        {mode === 'local' ? (
          <div className="space-y-4">
            <p className="text-sm">{t('auth.localNotice')}</p>
            <Button asChild className="w-full"><Link to="/app">{t('auth.continueLocal')}</Link></Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {formMode === 'signup' && (
              <div>
                <Label htmlFor="name">{t('auth.name')}</Label>
                <Input id="name" className="font-indic" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </div>
            )}
            <div>
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={formMode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
            {message && (
              <p className={message.kind === 'error' ? 'text-sm text-destructive' : 'text-sm text-emerald-700 dark:text-emerald-400'} role="status">
                {message.text}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t(formMode === 'login' ? 'common.signIn' : 'common.signUp')}
            </Button>
            {formMode === 'login' && (
              <Button type="button" variant="outline" className="w-full gap-2" disabled={busy || !email} onClick={magic}>
                <Mail className="h-4 w-4" /> {t('auth.magicLink')}
              </Button>
            )}
            <p className="text-center text-sm text-muted-foreground">
              {t(formMode === 'login' ? 'auth.noAccount' : 'auth.haveAccount')}{' '}
              <Link className="font-medium text-primary underline" to={formMode === 'login' ? '/signup' : '/login'}>
                {t(formMode === 'login' ? 'common.signUp' : 'common.signIn')}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

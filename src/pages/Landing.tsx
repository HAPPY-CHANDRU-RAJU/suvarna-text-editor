import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileDown, FileText, Keyboard, Languages, MessagesSquare, SpellCheck2, CloudUpload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { transliterate } from '@/lib/kannada/transliterate';
import { useAuth } from '@/services/auth';

const DEMO = 'namaskaara, kannaDa jagattige susvaagata';

function TypingDemo() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setCount((c) => (c >= DEMO.length + 12 ? 0 : c + 1)), 110);
    return () => window.clearInterval(id);
  }, []);
  const latin = DEMO.slice(0, Math.min(count, DEMO.length));
  // Transliterate word by word so punctuation passes through.
  const kannada = latin.replace(/[a-zA-Z~]+/g, (w) => transliterate(w));
  return (
    <div className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-xl border border-border bg-card text-left shadow-xl">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 text-xs text-muted-foreground">ಸುವರ್ಣ — ಹೊಸ ದಾಖಲೆ</span>
      </div>
      <div className="space-y-3 p-6">
        <code className="block min-h-[1.5em] text-sm text-muted-foreground">{latin}<span className="animate-pulse">|</span></code>
        <p className="min-h-[1.6em] font-indic text-2xl text-foreground">{kannada}</p>
      </div>
    </div>
  );
}

export default function Landing() {
  const { t, lang, setLang } = useI18n();
  const { user, mode } = useAuth();

  useEffect(() => {
    document.title = `${t('app.name')} — ${t('app.tagline')}`;
  }, [t]);

  const features = [
    { icon: Languages, title: 'landing.f1.title', body: 'landing.f1.body' },
    { icon: SpellCheck2, title: 'landing.f2.title', body: 'landing.f2.body' },
    { icon: FileText, title: 'landing.f3.title', body: 'landing.f3.body' },
    { icon: FileDown, title: 'landing.f4.title', body: 'landing.f4.body' },
    { icon: MessagesSquare, title: 'landing.f5.title', body: 'landing.f5.body' },
    { icon: CloudUpload, title: 'landing.f6.title', body: 'landing.f6.body' },
  ] as const;

  const primaryHref = user ? '/app' : mode === 'cloud' ? '/signup' : '/app';

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 md:px-8">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-indic text-lg font-bold text-brand-foreground">ಸು</span>
        <span className="font-display text-xl font-bold">{t('app.name')}</span>
        <nav className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setLang(lang === 'kn' ? 'en' : 'kn')}>
            {t('common.uiLanguage')}
          </Button>
          {user ? (
            <Button asChild size="sm"><Link to="/app">{t('landing.open')}</Link></Button>
          ) : mode === 'cloud' ? (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/login">{t('common.signIn')}</Link></Button>
              <Button asChild size="sm"><Link to="/signup">{t('common.signUp')}</Link></Button>
            </>
          ) : null}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 text-center md:px-8 md:pt-20">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary">
          <Keyboard className="h-3.5 w-3.5" /> {t('app.tagline')}
        </div>
        <h1 className="mx-auto max-w-3xl font-indic text-4xl font-bold leading-tight md:text-6xl">{t('landing.headline')}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">{t('landing.sub')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg"><Link to={primaryHref}>{t('landing.cta')}</Link></Button>
          {user && <Button asChild size="lg" variant="outline"><Link to="/app">{t('landing.open')}</Link></Button>}
        </div>
        <TypingDemo />
      </section>

      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:grid-cols-2 md:px-8 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6">
              <f.icon className="mb-3 h-7 w-7 text-primary" strokeWidth={1.5} />
              <h3 className="mb-2 font-indic text-lg font-semibold">{t(f.title)}</h3>
              <p className="text-sm text-muted-foreground">{t(f.body)}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-muted-foreground md:px-8">
        © {new Date().getFullYear()} {t('app.name')} · {t('app.tagline')}
      </footer>
    </div>
  );
}

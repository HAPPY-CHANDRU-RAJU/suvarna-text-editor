import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n';

const NotFound = () => {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/40">
      <h1 className="font-display text-5xl font-bold">404</h1>
      <p className="text-lg text-muted-foreground">{t('error.notFound')}</p>
      <Link to="/" className="text-primary underline hover:text-primary/90">{t('error.goHome')}</Link>
    </div>
  );
};

export default NotFound;

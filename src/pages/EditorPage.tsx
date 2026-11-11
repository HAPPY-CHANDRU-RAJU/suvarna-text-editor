import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { DocumentEditor } from '@/components/editor/DocumentEditor';
import { useI18n } from '@/i18n';
import type { DocumentRecord } from '@/lib/document';
import { useAuth } from '@/services/auth';

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { repository } = useAuth();
  const { t } = useI18n();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error' } | { status: 'ready'; doc: DocumentRecord }>({ status: 'loading' });

  useEffect(() => {
    if (!repository || !id) return;
    let cancelled = false;
    setState({ status: 'loading' });
    repository
      .get(id)
      .then((doc) => !cancelled && setState(doc ? { status: 'ready', doc } : { status: 'error' }))
      .catch(() => !cancelled && setState({ status: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [repository, id]);

  if (state.status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> {t('common.loading')}
      </div>
    );
  }
  if (state.status === 'error' || !repository) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p>{t('error.loadDocument')}</p>
        <Link to="/app" className="text-primary underline">{t('dash.documents')}</Link>
      </div>
    );
  }
  // Keyed so switching documents builds a fresh editor.
  return <DocumentEditor key={state.doc.id} record={state.doc} repository={repository} />;
}

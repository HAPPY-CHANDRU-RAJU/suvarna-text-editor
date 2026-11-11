import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Eye, Loader2 } from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { schemaExtensions } from '@/editor/extensions';
import { useI18n } from '@/i18n';
import type { DocumentRecord } from '@/lib/document';
import { supabase } from '@/services/supabase';
import { SupabaseRepository } from '@/services/storage/supabase';

function ReadOnlyDocument({ doc }: { doc: DocumentRecord }) {
  const editor = useEditor({
    extensions: schemaExtensions(),
    content: doc.content,
    editable: false,
    immediatelyRender: true,
    editorProps: { attributes: { class: 'suvarna-doc', lang: 'kn' } },
  });
  return (
    <div className="shared-page">
      <EditorContent editor={editor} />
    </div>
  );
}

export default function SharedView() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const [doc, setDoc] = useState<DocumentRecord | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase || !id) {
      setDoc(null);
      return;
    }
    // The owner id is unused for public reads.
    new SupabaseRepository(supabase, '')
      .getShared(id)
      .then((d) => {
        setDoc(d);
        if (d) document.title = `${d.title || t('common.untitled')} — ${t('app.name')}`;
      })
      .catch(() => setDoc(null));
  }, [id, t]);

  return (
    <div className="min-h-screen bg-[hsl(var(--canvas))]">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-2">
        <Link to="/" className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand font-indic font-bold text-brand-foreground">ಸು</Link>
        <span className="truncate font-indic font-medium">{doc?.title || ''}</span>
        <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          <Eye className="h-3 w-3" /> {t('share.readOnly')}
        </span>
        <Button asChild size="sm" className="ml-auto"><Link to="/">{t('share.openApp')}</Link></Button>
      </header>
      {doc === undefined ? (
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> {t('common.loading')}
        </div>
      ) : doc === null ? (
        <p className="py-20 text-center text-muted-foreground">{t('share.notFound')}</p>
      ) : (
        <ReadOnlyDocument doc={doc} />
      )}
    </div>
  );
}

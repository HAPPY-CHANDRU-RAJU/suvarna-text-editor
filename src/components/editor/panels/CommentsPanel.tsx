import { useEffect, useRef, useState } from 'react';
import { Check, MessageSquarePlus, RotateCcw, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/i18n';
import { useAuth } from '@/services/auth';
import { commentIdsAt, commentPosition } from '@/editor/extensions/comment';
import { newId, type CommentThread } from '@/lib/document';
import { cn } from '@/lib/utils';
import { useEditorUi } from '../EditorContext';

export const PENDING_COMMENT = 'pending';

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function CommentCard({ thread, active }: { thread: CommentThread; active: boolean }) {
  const { editor, setComments } = useEditorUi();
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [reply, setReply] = useState('');
  const range = commentPosition(editor.state, thread.id);
  const when = (iso: string) => new Intl.DateTimeFormat(lang === 'kn' ? 'kn-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

  const update = (patch: Partial<CommentThread>) =>
    setComments((prev) => prev.map((c) => (c.id === thread.id ? { ...c, ...patch } : c)));

  return (
    <div
      className={cn('comment-card', active && 'is-active', thread.resolved && 'opacity-60')}
      onClick={() => range && editor.chain().setTextSelection(range).scrollIntoView().run()}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{initials(thread.author)}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold">{thread.author}</div>
          <div className="text-[10px] text-muted-foreground">{when(thread.createdAt)}</div>
        </div>
        <button
          type="button"
          className="rounded p-1 hover:bg-muted"
          title={t(thread.resolved ? 'comments.reopen' : 'comments.resolve')}
          onClick={(e) => {
            e.stopPropagation();
            update({ resolved: !thread.resolved });
          }}
        >
          {thread.resolved ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          className="rounded p-1 hover:bg-muted"
          title={t('common.delete')}
          onClick={(e) => {
            e.stopPropagation();
            editor.commands.removeComment(thread.id);
            setComments((prev) => prev.filter((c) => c.id !== thread.id));
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <blockquote className="mb-1 truncate border-l-2 border-primary/60 pl-2 font-indic text-[11px] text-muted-foreground">
        {range ? thread.quote : t('comments.deletedAnchor')}
      </blockquote>
      <p className="whitespace-pre-wrap font-indic text-sm">{thread.text}</p>
      {thread.replies.map((r) => (
        <div key={r.id} className="mt-2 border-t border-border pt-2">
          <div className="text-xs font-semibold">{r.author} <span className="font-normal text-muted-foreground">· {when(r.createdAt)}</span></div>
          <p className="whitespace-pre-wrap font-indic text-sm">{r.text}</p>
        </div>
      ))}
      {active && !thread.resolved && (
        <div className="mt-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Textarea rows={1} className="min-h-0 font-indic text-sm" placeholder={t('comments.reply')} value={reply} onChange={(e) => setReply(e.target.value)} />
          <Button
            size="sm"
            disabled={!reply.trim()}
            onClick={() => {
              update({ replies: [...thread.replies, { id: newId(), author: user?.name ?? '', text: reply.trim(), createdAt: new Date().toISOString() }] });
              setReply('');
            }}
          >
            {t('comments.reply')}
          </Button>
        </div>
      )}
    </div>
  );
}

export function CommentsPanel() {
  const { editor, comments, setComments, setPanel } = useEditorUi();
  const { user } = useAuth();
  const { t } = useI18n();
  const [showResolved, setShowResolved] = useState(false);
  const [draft, setDraft] = useState('');
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const activeIds = commentIdsAt(editor.state);
  const pending = activeIds.includes(PENDING_COMMENT) || commentPosition(editor.state, PENDING_COMMENT) !== null;

  useEffect(() => {
    if (pending) draftRef.current?.focus();
  }, [pending]);

  const discardPending = () => {
    editor.commands.removeComment(PENDING_COMMENT);
    setDraft('');
  };

  const submit = () => {
    const range = commentPosition(editor.state, PENDING_COMMENT);
    if (!range || !draft.trim()) return;
    const id = newId();
    const quote = editor.state.doc.textBetween(range.from, range.to, ' ').slice(0, 120);
    const { tr } = editor.state;
    const type = editor.schema.marks.comment;
    tr.removeMark(range.from, range.to, type.create({ id: PENDING_COMMENT }));
    tr.addMark(range.from, range.to, type.create({ id }));
    editor.view.dispatch(tr);
    setComments((prev) => [
      ...prev,
      { id, author: user?.name ?? '', text: draft.trim(), createdAt: new Date().toISOString(), resolved: false, quote, replies: [] },
    ]);
    setDraft('');
  };

  // Order threads by where they appear in the document.
  const ordered = comments
    .map((c) => ({ c, pos: commentPosition(editor.state, c.id)?.from ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.pos - b.pos)
    .map((x) => x.c)
    .filter((c) => showResolved || !c.resolved);

  return (
    <aside className="side-pane">
      <div className="side-pane-header">
        <span>{t('review.comments')}</span>
        <button type="button" className="rounded p-1 hover:bg-muted" onClick={() => setPanel(null)} aria-label={t('common.close')}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <label className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs text-muted-foreground">
        <Switch checked={showResolved} onCheckedChange={setShowResolved} />
        {t('comments.showResolved')}
      </label>
      <div className="flex-1 space-y-2 overflow-auto p-2">
        {pending && (
          <div className="comment-card is-active">
            <Textarea
              ref={draftRef}
              rows={3}
              className="font-indic text-sm"
              placeholder={t('comments.placeholder')}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
                if (e.key === 'Escape') discardPending();
              }}
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={discardPending}>{t('common.cancel')}</Button>
              <Button size="sm" disabled={!draft.trim()} onClick={submit}>{t('common.save')}</Button>
            </div>
          </div>
        )}
        {ordered.map((thread) => (
          <CommentCard key={thread.id} thread={thread} active={activeIds.includes(thread.id)} />
        ))}
        {!pending && ordered.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
            <MessageSquarePlus className="h-7 w-7" />
            {t('comments.empty')}
          </div>
        )}
      </div>
    </aside>
  );
}

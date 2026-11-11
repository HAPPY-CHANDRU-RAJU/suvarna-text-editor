import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '@tiptap/react';
import type { Mark } from '@tiptap/pm/model';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import { editorExtensions } from '@/editor/extensions';
import { countWords, makePreview, pageGeometry, type CommentThread, type DocumentRecord, type PageSettings } from '@/lib/document';
import { exportDocument, type ExportFormat } from '@/lib/export/files';
import { printDocument } from '@/lib/export/print';
import type { DocumentPatch, DocumentRepository } from '@/services/storage/types';
import { cn } from '@/lib/utils';
import { ContextMenu } from './ContextMenu';
import { EditorDialogs } from './EditorDialogs';
import { EditorUiContext, type DialogName, type EditorUi, type LayoutMode, type SaveState, type SidePanel } from './EditorContext';
import { PageCanvas } from './PageCanvas';
import { CommentsPanel, PENDING_COMMENT } from './panels/CommentsPanel';
import { FindPanel } from './panels/FindPanel';
import { KannadaKeyboard } from './panels/KannadaKeyboard';
import { NavigationPane } from './panels/NavigationPane';
import { SpellingPanel } from './panels/SpellingPanel';
import { Ribbon } from './ribbon/Ribbon';
import { ZOOM_MAX, ZOOM_MIN } from './ribbon/ViewTab';
import { StatusBar } from './StatusBar';
import { TitleBar } from './TitleBar';

const SAVE_DELAY_MS = 800;
const RETRY_DELAY_MS = 5000;
const VIEW_PREFS_KEY = 'suvarna.view.v1';
const MAX_IMAGE_WIDTH = 1600;

interface ViewPrefs {
  zoom: number;
  showRuler: boolean;
  showNavigation: boolean;
  ribbonCollapsed: boolean;
  layout: LayoutMode;
}

function loadViewPrefs(): ViewPrefs {
  const defaults: ViewPrefs = { zoom: 1, showRuler: true, showNavigation: false, ribbonCollapsed: false, layout: 'print' };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(VIEW_PREFS_KEY) ?? '{}') };
  } catch {
    return defaults;
  }
}

/** Reads an image file, downscaling very large photos so documents stay small. */
function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const src = String(reader.result);
      if (file.type === 'image/gif' || file.type === 'image/svg+xml') return resolve(src);
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth <= MAX_IMAGE_WIDTH) return resolve(src);
        const canvas = document.createElement('canvas');
        canvas.width = MAX_IMAGE_WIDTH;
        canvas.height = Math.round((img.naturalHeight * MAX_IMAGE_WIDTH) / img.naturalWidth);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.88));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export function DocumentEditor({ record, repository }: { record: DocumentRecord; repository: DocumentRepository }) {
  const { t } = useI18n();
  const [doc, setDoc] = useState(record);
  const [title, setTitleState] = useState(record.title);
  const [settings, setSettings] = useState<PageSettings>(record.settings);
  const [comments, setCommentsState] = useState<CommentThread[]>(record.comments);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [panel, setPanelState] = useState<SidePanel>(null);
  const [findMode, setFindMode] = useState<'find' | 'replace'>('find');
  const [dialog, setDialog] = useState<DialogName>(null);
  const [prefs, setPrefs] = useState<ViewPrefs>(loadViewPrefs);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [painterMarks, setPainterMarks] = useState<readonly Mark[] | null>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);

  // ---- Saving ---------------------------------------------------------------
  const pending = useRef<DocumentPatch>({});
  const contentDirty = useRef(false);
  const timer = useRef<number>();
  const saving = useRef(false);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    if (saving.current) {
      timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS);
      return;
    }
    const patch = { ...pending.current };
    const editor = editorRef.current;
    if (contentDirty.current && editor && !editor.isDestroyed) {
      const text = editor.getText();
      patch.content = editor.getJSON();
      patch.preview = makePreview(text);
      patch.wordCount = countWords(text);
    }
    if (!Object.keys(patch).length) return;
    pending.current = {};
    contentDirty.current = false;
    saving.current = true;
    setSaveState('saving');
    try {
      const saved = await repository.update(record.id, patch);
      setDoc(saved);
      setSaveState(Object.keys(pending.current).length || contentDirty.current ? 'saving' : 'saved');
    } catch (err) {
      console.error('Save failed', err);
      // Put the failed changes back underneath anything newer and retry.
      pending.current = { ...patch, ...pending.current };
      if (patch.content) contentDirty.current = true;
      setSaveState('error');
      timer.current = window.setTimeout(() => void flush(), RETRY_DELAY_MS);
    } finally {
      saving.current = false;
    }
  }, [repository, record.id]);

  const queueSave = useCallback(
    (patch: DocumentPatch = {}) => {
      pending.current = { ...pending.current, ...patch };
      setSaveState('saving');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [flush],
  );

  // ---- Editor ---------------------------------------------------------------
  const extensions = useMemo(
    () =>
      editorExtensions({
        placeholder: 'ಇಲ್ಲಿ ಬರೆಯಲು ಪ್ರಾರಂಭಿಸಿ… (Alt+K: ಕನ್ನಡ ⇄ English)',
        onAutoCorrect: (changes) => changes.slice(0, 3).forEach((c) => toast(t('spell.autocorrected', c), { duration: 2500 })),
      }),
    // Extensions are created once per editor instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const insertImages = useCallback(async (files: File[], at?: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    for (const file of files.filter((f) => f.type.startsWith('image/'))) {
      const src = await readImage(file);
      const chain = editor.chain().focus();
      (at != null ? chain.insertContentAt(at, { type: 'image', attrs: { src, alt: file.name } }) : chain.setImage({ src, alt: file.name })).run();
    }
  }, []);

  const editor = useEditor({
    extensions,
    content: record.content,
    immediatelyRender: true,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: { class: 'suvarna-doc', spellcheck: 'false', lang: 'kn', 'aria-label': record.title || 'Document' },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (!files.some((f) => f.type.startsWith('image/'))) return false;
        void insertImages(files);
        return true;
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (!files.some((f) => f.type.startsWith('image/'))) return false;
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void insertImages(files, pos);
        return true;
      },
      handleKeyDown: (view, event) => {
        if (!(event.ctrlKey || event.metaKey) || event.altKey) return false;
        const ed = editorRef.current;
        if (!ed) return false;
        const align = { e: 'center', l: 'left', r: 'right', j: 'justify' }[event.key.toLowerCase()];
        if (align && !event.shiftKey) {
          event.preventDefault();
          ed.chain().focus().setTextAlign(align).run();
          return true;
        }
        if (event.key === ']' || event.key === '[') {
          event.preventDefault();
          const current = parseFloat(ed.getAttributes('textStyle').fontSize) || 12;
          ed.chain().focus().setFontSize(`${Math.max(1, current + (event.key === ']' ? 1 : -1))}pt`).run();
          return true;
        }
        if (event.key === ',' || event.key === '.') {
          event.preventDefault();
          if (event.key === ',') ed.chain().focus().toggleSubscript().run();
          else ed.chain().focus().toggleSuperscript().run();
          return true;
        }
        return false;
      },
    },
    // Fires only for document changes, not pagination or proofing redraws.
    onUpdate: () => {
      contentDirty.current = true;
      queueSave();
    },
  });
  editorRef.current = editor;

  useEffect(() => {
    if (!editor) return;
    editor.commands.setPageGeometry(prefs.layout === 'print' ? pageGeometry(settings) : null);
  }, [editor, settings, prefs.layout]);

  // Save on leave; warn if a save is still outstanding.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length || contentDirty.current) {
        void flush();
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      void flush();
    };
  }, [flush]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // View preferences are a convenience only.
    }
  }, [prefs]);

  useEffect(() => {
    document.title = `${title || t('common.untitled')} — ${t('app.name')}`;
  }, [title, t]);

  // ---- Format painter -------------------------------------------------------
  useEffect(() => {
    if (!editor || !painterMarks) return;
    const dom = editor.view.dom;
    const apply = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty) return;
      const tr = editor.state.tr;
      tr.removeMark(from, to);
      painterMarks.filter((m) => m.type.name !== 'comment').forEach((m) => tr.addMark(from, to, m));
      editor.view.dispatch(tr);
      setPainterMarks(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPainterMarks(null);
    dom.addEventListener('mouseup', apply);
    window.addEventListener('keydown', onKey);
    dom.classList.add('format-painter-cursor');
    return () => {
      dom.removeEventListener('mouseup', apply);
      window.removeEventListener('keydown', onKey);
      dom.classList.remove('format-painter-cursor');
    };
  }, [editor, painterMarks]);

  // ---- Context value --------------------------------------------------------
  const setPanel = useCallback((next: SidePanel) => setPanelState(next), []);
  const openFind = useCallback((replace = false) => {
    setFindMode(replace ? 'replace' : 'find');
    setPanelState('find');
  }, []);

  const ui = useMemo<EditorUi | null>(() => {
    if (!editor) return null;
    const setPref = <K extends keyof ViewPrefs>(key: K) => (value: ViewPrefs[K]) => setPrefs((p) => ({ ...p, [key]: value }));
    return {
      editor,
      doc,
      settings,
      updateSettings: (patch) => {
        setSettings((prev) => {
          const next = { ...prev, ...patch };
          queueSave({ settings: next });
          return next;
        });
      },
      title,
      setTitle: (next) => {
        setTitleState(next);
        queueSave({ title: next });
      },
      comments,
      setComments: (updater) => {
        setCommentsState((prev) => {
          const next = updater(prev);
          queueSave({ comments: next });
          return next;
        });
      },
      saveState,
      saveNow: () => void flush(),
      panel,
      setPanel,
      openFind,
      findMode,
      dialog,
      openDialog: setDialog,
      layout: prefs.layout,
      setLayout: setPref('layout'),
      zoom: prefs.zoom,
      setZoom: (z) => setPrefs((p) => ({ ...p, zoom: Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) * 100) / 100 })),
      fitPageWidth: () => {
        const width = scrollRef.current?.clientWidth;
        if (width) setPrefs((p) => ({ ...p, layout: 'print', zoom: Math.round(((width - 48) / pageGeometry(settings).width) * 100) / 100 }));
      },
      showRuler: prefs.showRuler,
      setShowRuler: setPref('showRuler'),
      showNavigation: prefs.showNavigation,
      setShowNavigation: setPref('showNavigation'),
      showKeyboard,
      setShowKeyboard,
      focusMode,
      setFocusMode,
      ribbonCollapsed: prefs.ribbonCollapsed,
      setRibbonCollapsed: setPref('ribbonCollapsed'),
      formatPainter: painterMarks !== null,
      startFormatPainter: () => {
        if (painterMarks) return setPainterMarks(null);
        const { $from } = editor.state.selection;
        setPainterMarks(editor.state.storedMarks ?? $from.marks());
      },
      startComment: () => {
        if (editor.state.selection.empty) {
          toast.info(t('comments.selectFirst'));
          return;
        }
        editor.chain().focus().removeComment(PENDING_COMMENT).setComment(PENDING_COMMENT).run();
        setPanelState('comments');
      },
      exportAs: async (format: ExportFormat) => {
        try {
          await exportDocument(editor, format, title, settings);
        } catch (err) {
          toast.error(t('error.exportFailed'), { description: err instanceof Error ? err.message : undefined });
        }
      },
      print: () => void printDocument(title, editor.getHTML(), settings),
      insertImageFromFile: () => imageInput.current?.click(),
      stackRef,
      scrollRef,
    };
  }, [editor, doc, settings, title, comments, saveState, panel, findMode, dialog, prefs, showKeyboard, focusMode, painterMarks, queueSave, flush, setPanel, openFind, t]);

  // ---- App-level shortcuts --------------------------------------------------
  useEffect(() => {
    if (!ui) return;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 's') {
        e.preventDefault();
        ui.saveNow();
      } else if (mod && key === 'p') {
        e.preventDefault();
        ui.print();
      } else if (mod && key === 'f') {
        e.preventDefault();
        ui.openFind(false);
      } else if (mod && key === 'h') {
        e.preventDefault();
        ui.openFind(true);
      } else if (mod && key === 'k') {
        e.preventDefault();
        ui.openDialog('link');
      } else if (e.key === 'F7') {
        e.preventDefault();
        ui.setPanel('spelling');
      } else if (mod && e.key === 'F1') {
        e.preventDefault();
        ui.setRibbonCollapsed(!ui.ribbonCollapsed);
      } else if (e.key === 'Escape' && ui.focusMode) {
        ui.setFocusMode(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ui]);

  if (!editor || !ui) return null;

  return (
    <EditorUiContext.Provider value={ui}>
      <div className={cn('editor-shell', focusMode && 'is-focus')}>
        {!focusMode && <TitleBar />}
        {!focusMode && <Ribbon />}
        <div className="editor-main">
          {!focusMode && prefs.showNavigation && <NavigationPane />}
          <div className="relative flex min-w-0 flex-1 flex-col">
            <PageCanvas />
            {showKeyboard && <KannadaKeyboard />}
          </div>
          {!focusMode && panel === 'find' && <FindPanel />}
          {!focusMode && panel === 'spelling' && <SpellingPanel />}
          {!focusMode && panel === 'comments' && <CommentsPanel />}
        </div>
        {focusMode ? (
          <button type="button" className="focus-exit" onClick={() => setFocusMode(false)}>
            {t('status.focus')} (Esc)
          </button>
        ) : (
          <StatusBar />
        )}
        <ContextMenu />
        <EditorDialogs />
        <input
          ref={imageInput}
          type="file"
          accept="image/*"
          hidden
          multiple
          onChange={(e) => {
            void insertImages(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      </div>
    </EditorUiContext.Provider>
  );
}

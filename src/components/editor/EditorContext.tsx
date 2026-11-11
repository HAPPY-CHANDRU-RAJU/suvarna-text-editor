import { createContext, useContext, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import type { CommentThread, DocumentRecord, PageSettings } from '@/lib/document';
import type { ExportFormat } from '@/lib/export/files';

export type SidePanel = 'find' | 'spelling' | 'comments' | null;
export type DialogName =
  | 'link'
  | 'headerFooter'
  | 'wordCount'
  | 'symbol'
  | 'pageSetup'
  | 'share'
  | 'language'
  | 'translitHelp'
  | null;
export type LayoutMode = 'print' | 'web';
export type SaveState = 'saved' | 'saving' | 'error';

export interface EditorUi {
  editor: Editor;
  doc: DocumentRecord;
  settings: PageSettings;
  updateSettings(patch: Partial<PageSettings>): void;
  title: string;
  setTitle(title: string): void;
  comments: CommentThread[];
  setComments(updater: (prev: CommentThread[]) => CommentThread[]): void;
  saveState: SaveState;
  saveNow(): void;

  panel: SidePanel;
  setPanel(panel: SidePanel): void;
  /** Opens the find panel; `replace` focuses the replace field. */
  openFind(replace?: boolean): void;
  findMode: 'find' | 'replace';
  dialog: DialogName;
  openDialog(name: DialogName): void;

  layout: LayoutMode;
  setLayout(mode: LayoutMode): void;
  zoom: number;
  setZoom(zoom: number): void;
  fitPageWidth(): void;
  showRuler: boolean;
  setShowRuler(show: boolean): void;
  showNavigation: boolean;
  setShowNavigation(show: boolean): void;
  showKeyboard: boolean;
  setShowKeyboard(show: boolean): void;
  focusMode: boolean;
  setFocusMode(on: boolean): void;
  ribbonCollapsed: boolean;
  setRibbonCollapsed(collapsed: boolean): void;

  formatPainter: boolean;
  startFormatPainter(): void;

  startComment(): void;
  exportAs(format: ExportFormat): Promise<void>;
  print(): void;
  insertImageFromFile(): void;
  /** Element containing the page sheets; used to work out the current page. */
  stackRef: RefObject<HTMLDivElement>;
  scrollRef: RefObject<HTMLDivElement>;
}

export const EditorUiContext = createContext<EditorUi | null>(null);

export function useEditorUi(): EditorUi {
  const ctx = useContext(EditorUiContext);
  if (!ctx) throw new Error('useEditorUi must be used inside the document editor');
  return ctx;
}

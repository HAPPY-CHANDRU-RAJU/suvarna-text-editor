import type { Editor, JSONContent } from '@tiptap/core';
import type { PageSettings } from '@/lib/document';
import { printDocument, standaloneHtml } from './print';

export type ExportFormat = 'docx' | 'pdf' | 'html' | 'txt' | 'suvarna';

export function safeFileName(title: string, fallback = 'document'): string {
  const clean = title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  return clean || fallback;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface NativeFile {
  format: 'suvarna';
  version: 1;
  title: string;
  content: JSONContent;
  settings: PageSettings;
}

export async function exportDocument(editor: Editor, format: ExportFormat, title: string, settings: PageSettings) {
  const name = safeFileName(title, 'ಹೊಸ ದಾಖಲೆ');
  switch (format) {
    case 'docx': {
      // docx is large; load it only when exporting.
      const { exportDocx } = await import('./docx');
      downloadBlob(await exportDocx(editor.getJSON(), settings, title), `${name}.docx`);
      break;
    }
    case 'pdf':
      await printDocument(title, editor.getHTML(), settings);
      break;
    case 'html':
      downloadBlob(new Blob([standaloneHtml(title, editor.getHTML(), settings)], { type: 'text/html;charset=utf-8' }), `${name}.html`);
      break;
    case 'txt':
      downloadBlob(new Blob([editor.getText({ blockSeparator: '\n\n' })], { type: 'text/plain;charset=utf-8' }), `${name}.txt`);
      break;
    case 'suvarna': {
      const file: NativeFile = { format: 'suvarna', version: 1, title, content: editor.getJSON(), settings };
      downloadBlob(new Blob([JSON.stringify(file)], { type: 'application/json' }), `${name}.suvarna.json`);
      break;
    }
  }
}

import { generateJSON, type JSONContent } from '@tiptap/core';
import { schemaExtensions } from '@/editor/extensions';
import { normalizeSettings, type PageSettings } from '@/lib/document';
import type { NativeFile } from './files';

export interface ImportedDocument {
  title: string;
  content: JSONContent;
  settings?: PageSettings;
  warnings: string[];
}

export const IMPORT_ACCEPT = '.docx,.html,.htm,.txt,.md,.json';

export function htmlToContent(html: string): JSONContent {
  return generateJSON(html, schemaExtensions());
}

function textToHtml(text: string): string {
  const escape = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => `<p>${escape(p).replace(/\r?\n/g, '<br>')}</p>`)
    .join('');
}

export async function importFile(file: File): Promise<ImportedDocument> {
  const base = file.name.replace(/\.(docx|html?|txt|md|json)$/i, '').replace(/\.suvarna$/i, '');
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'docx') {
    // mammoth is ~600 KB; load it only when someone imports a Word file.
    const mammoth = await import('mammoth');
    const result = await mammoth.convertToHtml(
      { arrayBuffer: await file.arrayBuffer() },
      {
        styleMap: ["p[style-name='Title'] => h1:fresh", "p[style-name='Subtitle'] => h2:fresh", "p[style-name='Quote'] => blockquote:fresh"],
      },
    );
    return {
      title: base,
      content: htmlToContent(result.value),
      warnings: result.messages.filter((m) => m.type === 'warning').map((m) => m.message),
    };
  }
  if (ext === 'json') {
    const data = JSON.parse(await file.text()) as Partial<NativeFile>;
    if (data.format !== 'suvarna' || !data.content) throw new Error('Not a Suvarna document');
    return { title: data.title || base, content: data.content, settings: normalizeSettings(data.settings), warnings: [] };
  }
  const text = await file.text();
  const html = ext === 'html' || ext === 'htm' ? text : textToHtml(text);
  return { title: base, content: htmlToContent(html), warnings: [] };
}

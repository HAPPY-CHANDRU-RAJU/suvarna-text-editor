import { GOOGLE_FONTS_URL } from '@/lib/kannada/fonts';
import { PAGE_SIZES, type PageSettings } from '@/lib/document';

// Printing (and "Save as PDF") goes through the browser so Kannada conjuncts
// are shaped by a real text engine. Page size, margins, headers, footers and
// page numbers come from CSS @page rules; page numbers can use the built-in
// "kannada" counter style (೧, ೨, ೩ …).

function cssString(text: string) {
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
}

function marginBoxes(position: 'top' | 'bottom', text: string, withNumber: boolean, settings: PageSettings): string {
  const counter = `counter(page, ${settings.kannadaNumerals ? 'kannada' : 'decimal'})`;
  const boxes: Record<string, string[]> = {};
  const add = (slot: string, part: string) => (boxes[slot] ??= []).push(part);
  if (text) add('center', cssString(text));
  if (withNumber) {
    if (text && settings.pageNumberAlign === 'center') add('center', '"  "');
    add(settings.pageNumberAlign, counter);
  }
  return Object.entries(boxes)
    .map(([slot, parts]) => `@${position}-${slot} { content: ${parts.join(' ')}; font-family: 'Noto Sans Kannada', sans-serif; font-size: 9pt; color: #555; }`)
    .join('\n');
}

/** Typography shared by the editor canvas, print output and HTML export. */
export const DOCUMENT_CSS = `
.suvarna-doc { font-family: 'Noto Sans Kannada', 'Nirmala UI', 'Tunga', sans-serif; font-size: 12pt; line-height: 1.5; color: #111; }
.suvarna-doc p { margin: 0; padding-bottom: 6pt; }
.suvarna-doc h1, .suvarna-doc h2, .suvarna-doc h3, .suvarna-doc h4 { margin: 0; padding: 12pt 0 4pt; font-weight: 700; line-height: 1.35; }
.suvarna-doc h1 { font-size: 20pt; } .suvarna-doc h2 { font-size: 16pt; } .suvarna-doc h3 { font-size: 14pt; } .suvarna-doc h4 { font-size: 12pt; }
.suvarna-doc ul, .suvarna-doc ol { margin: 0; padding: 0 0 6pt 1.6em; }
.suvarna-doc ul { list-style: disc; } .suvarna-doc ol { list-style: decimal; }
.suvarna-doc ul ul { list-style: circle; } .suvarna-doc ul ul ul { list-style: square; }
.suvarna-doc li > p { padding-bottom: 2pt; }
.suvarna-doc blockquote { margin: 0 0 6pt; padding: 2pt 0 2pt 12pt; border-left: 3px solid #c8a24a; color: #444; }
.suvarna-doc pre { margin: 0 0 6pt; padding: 8pt; background: #f3f4f6; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 10pt; white-space: pre-wrap; }
.suvarna-doc code { font-family: 'Courier New', monospace; background: #f3f4f6; padding: 0 2px; border-radius: 2px; }
.suvarna-doc hr { border: 0; border-top: 1px solid #bbb; margin: 6pt 0 12pt; }
.suvarna-doc img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
.suvarna-doc a { color: #1d4ed8; text-decoration: underline; }
.suvarna-doc table { border-collapse: collapse; width: 100%; margin: 0 0 8pt; table-layout: fixed; }
.suvarna-doc td, .suvarna-doc th { border: 1px solid #9ca3af; padding: 4pt 6pt; vertical-align: top; }
.suvarna-doc th { background: #f3f4f6; font-weight: 700; text-align: left; }
.suvarna-doc td > p, .suvarna-doc th > p { padding-bottom: 0; }
.suvarna-doc mark { padding: 0 1px; }
.suvarna-doc .page-break { height: 0; break-after: page; }
`;

const SCREEN_PREVIEW_CSS = `
@media screen { body { background: #f3f4f6; } .suvarna-doc { max-width: 8.27in; margin: 24px auto; padding: 1in; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.15); } }`;

export function printCss(settings: PageSettings): string {
  const size = PAGE_SIZES[settings.size] ?? PAGE_SIZES.A4;
  const landscape = settings.orientation === 'landscape';
  const w = landscape ? size.height : size.width;
  const h = landscape ? size.width : size.height;
  const m = settings.margins;
  const header = marginBoxes('top', settings.header, settings.pageNumbers === 'header', settings);
  const footer = marginBoxes('bottom', settings.footer, settings.pageNumbers === 'footer', settings);
  const first = settings.differentFirstPage
    ? `@page :first { ${['top', 'bottom'].flatMap((p) => ['left', 'center', 'right'].map((s) => `@${p}-${s} { content: none; }`)).join(' ')} }`
    : '';
  return `
@page { size: ${w}in ${h}in; margin: ${m.top}in ${m.right}in ${m.bottom}in ${m.left}in;
${header}
${footer}
}
${first}
html, body { margin: 0; padding: 0; background: #fff; }
.comment-mark { background: none !important; }
${DOCUMENT_CSS}`;
}

/** A self-contained HTML file. `screenPreview` adds a page-like look when opened in a browser. */
export function standaloneHtml(title: string, bodyHtml: string, settings: PageSettings, screenPreview = true): string {
  const safeTitle = title.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!);
  return `<!doctype html>
<html lang="kn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<link rel="stylesheet" href="${GOOGLE_FONTS_URL}">
<style>${printCss(settings)}${screenPreview ? SCREEN_PREVIEW_CSS : ''}</style>
</head>
<body><article class="suvarna-doc">${bodyHtml}</article></body>
</html>`;
}

export function printDocument(title: string, bodyHtml: string, settings: PageSettings): Promise<void> {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(frame);
    const win = frame.contentWindow!;
    win.document.open();
    win.document.write(standaloneHtml(title, bodyHtml, settings, false));
    win.document.close();

    const cleanup = () => {
      frame.remove();
      resolve();
    };
    const go = async () => {
      try {
        await win.document.fonts?.ready;
        const images = Array.from(win.document.images).filter((img) => !img.complete);
        await Promise.all(images.map((img) => new Promise((r) => { img.onload = img.onerror = r; })));
      } catch {
        // Print anyway with whatever has loaded.
      }
      win.focus();
      win.print();
      // Safari returns from print() before the dialog closes.
      setTimeout(cleanup, 1000);
    };
    if (win.document.readyState === 'complete') void go();
    else frame.onload = () => void go();
  });
}

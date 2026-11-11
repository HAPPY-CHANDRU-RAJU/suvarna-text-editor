import type { JSONContent } from '@tiptap/core';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  LineRuleType,
  Packer,
  PageNumber,
  PageOrientation,
  Paragraph,
  PageBreak as DocxPageBreak,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IRunOptions,
  type IParagraphOptions,
  type ParagraphChild,
  type FileChild,
} from 'docx';
import { DEFAULT_FONT, DEFAULT_FONT_SIZE_PT, findFont } from '@/lib/kannada/fonts';
import { pageGeometry, PX_PER_INCH, TWIPS_PER_INCH, type PageSettings } from '@/lib/document';

type Mark = NonNullable<JSONContent['marks']>[number];
type RunStyle = Omit<IRunOptions, 'text' | 'children' | 'break'>;

const HEADING_LEVELS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4];
const HEADING_SIZES_PT = [20, 16, 14, 12];
const ALIGN: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};
const twips = (inches: number) => Math.round(inches * TWIPS_PER_INCH);

/** Word draws Kannada with the complex-script font slot, so set every slot. */
function fontSlots(name: string) {
  return { ascii: name, hAnsi: name, cs: name, eastAsia: name };
}

export function toHexColor(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1];
    return (h.length === 3 ? h.split('').map((c) => c + c).join('') : h).toUpperCase();
  }
  const rgb = v.match(/^rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/i);
  if (rgb) return rgb.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
  return undefined;
}

/** CSS font size → docx half-points. */
export function toHalfPoints(size: string | null | undefined): number | undefined {
  if (!size) return undefined;
  const n = parseFloat(size);
  if (!Number.isFinite(n)) return undefined;
  const pt = size.endsWith('px') ? n * 0.75 : n;
  return Math.round(pt * 2);
}

function runStyle(marks: Mark[] = []): RunStyle {
  const style: Record<string, unknown> = {};
  for (const mark of marks) {
    const a = mark.attrs ?? {};
    switch (mark.type) {
      case 'bold': style.bold = true; style.boldComplexScript = true; break;
      case 'italic': style.italics = true; style.italicsComplexScript = true; break;
      case 'underline': style.underline = {}; break;
      case 'strike': style.strike = true; break;
      case 'subscript': style.subScript = true; break;
      case 'superscript': style.superScript = true; break;
      case 'code': style.font = fontSlots('Courier New'); break;
      case 'highlight': {
        const fill = toHexColor(a.color) ?? 'FFFF00';
        style.shading = { type: ShadingType.CLEAR, fill, color: 'auto' };
        break;
      }
      case 'textStyle': {
        const color = toHexColor(a.color);
        if (color) style.color = color;
        const bg = toHexColor(a.backgroundColor);
        if (bg) style.shading = { type: ShadingType.CLEAR, fill: bg, color: 'auto' };
        const size = toHalfPoints(a.fontSize);
        if (size) { style.size = size; style.sizeComplexScript = size; }
        if (a.fontFamily) style.font = fontSlots(findFont(a.fontFamily)?.docxName ?? String(a.fontFamily).split(',')[0].replace(/['"]/g, ''));
        break;
      }
    }
  }
  return style as RunStyle;
}

interface Ctx {
  bulletInstance: number;
  orderedInstance: number;
  contentWidthPx: number;
}

function dataUrlToBytes(src: string): { bytes: Uint8Array; type: 'png' | 'jpg' | 'gif' | 'bmp' } | null {
  const m = src.match(/^data:image\/(png|jpe?g|gif|bmp);base64,(.*)$/i);
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const kind = m[1].toLowerCase();
  return { bytes, type: kind === 'jpeg' ? 'jpg' : (kind as 'png' | 'jpg' | 'gif' | 'bmp') };
}

async function loadImage(src: string): Promise<{ bytes: Uint8Array; type: 'png' | 'jpg' | 'gif' | 'bmp' } | null> {
  const inline = dataUrlToBytes(src);
  if (inline) return inline;
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const type = blob.type.includes('png') ? 'png' : blob.type.includes('gif') ? 'gif' : 'jpg';
    return { bytes: new Uint8Array(await blob.arrayBuffer()), type };
  } catch {
    // Cross-origin images that block fetching are left out of the export.
    return null;
  }
}

function naturalSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof window.Image === 'undefined') return resolve({ width: 400, height: 300 });
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth || 400, height: img.naturalHeight || 300 });
    img.onerror = () => resolve({ width: 400, height: 300 });
    img.src = src;
  });
}

function inlineChildren(nodes: JSONContent[] = []): ParagraphChild[] {
  const out: ParagraphChild[] = [];
  for (const node of nodes) {
    if (node.type === 'hardBreak') {
      out.push(new TextRun({ break: 1 }));
      continue;
    }
    if (node.type !== 'text' || !node.text) continue;
    const run = new TextRun({ text: node.text, ...runStyle(node.marks) });
    const link = node.marks?.find((m) => m.type === 'link');
    if (link?.attrs?.href) {
      out.push(new ExternalHyperlink({ link: link.attrs.href, children: [new TextRun({ text: node.text, ...runStyle(node.marks), style: 'Hyperlink' })] }));
    } else {
      out.push(run);
    }
  }
  return out;
}

function paragraphProps(node: JSONContent): Partial<IParagraphOptions> {
  const a = node.attrs ?? {};
  const props: Record<string, unknown> = {};
  if (a.textAlign && ALIGN[a.textAlign]) props.alignment = ALIGN[a.textAlign];
  const spacing: Record<string, unknown> = {};
  if (a.lineHeight) {
    spacing.line = Math.round(parseFloat(a.lineHeight) * 240);
    spacing.lineRule = LineRuleType.AUTO;
  }
  if (a.spaceBefore != null) spacing.before = Math.round(Number(a.spaceBefore) * 20);
  if (a.spaceAfter != null) spacing.after = Math.round(Number(a.spaceAfter) * 20);
  if (Object.keys(spacing).length) props.spacing = spacing;
  if (a.indent) props.indent = { left: twips(Number(a.indent) * 0.5) };
  return props as Partial<IParagraphOptions>;
}

async function blocks(nodes: JSONContent[] = [], ctx: Ctx, list?: { reference: string; level: number; instance: number }): Promise<FileChild[]> {
  const out: FileChild[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case 'paragraph':
        out.push(new Paragraph({ ...paragraphProps(node), children: inlineChildren(node.content), ...(list ? { numbering: list } : {}) }));
        break;
      case 'heading': {
        const level = Math.min(4, Math.max(1, Number(node.attrs?.level) || 1));
        out.push(new Paragraph({ ...paragraphProps(node), heading: HEADING_LEVELS[level - 1], children: inlineChildren(node.content) }));
        break;
      }
      case 'blockquote':
        for (const child of await blocks(node.content, ctx)) out.push(child);
        break;
      case 'codeBlock': {
        const text = (node.content ?? []).map((c) => c.text ?? '').join('');
        out.push(
          new Paragraph({
            shading: { type: ShadingType.CLEAR, fill: 'F3F4F6', color: 'auto' },
            children: text.split('\n').map((line, i) => new TextRun({ text: line, font: fontSlots('Courier New'), break: i ? 1 : 0 })),
          }),
        );
        break;
      }
      case 'bulletList':
      case 'orderedList': {
        const ordered = node.type === 'orderedList';
        const level = list ? list.level + 1 : 0;
        const instance = list && list.reference === (ordered ? 'ordered' : 'bullets') ? list.instance : ordered ? ++ctx.orderedInstance : ++ctx.bulletInstance;
        const ref = { reference: ordered ? 'ordered' : 'bullets', level: Math.min(level, 8), instance };
        for (const item of node.content ?? []) {
          const [first, ...rest] = item.content ?? [];
          if (first) for (const child of await blocks([first], ctx, ref)) out.push(child);
          for (const child of await blocks(rest, ctx, ref)) out.push(child);
        }
        break;
      }
      case 'horizontalRule':
        out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'BFBFBF', space: 1 } }, children: [] }));
        break;
      case 'pageBreak':
        out.push(new Paragraph({ children: [new DocxPageBreak()] }));
        break;
      case 'image': {
        const src = node.attrs?.src as string | undefined;
        if (!src) break;
        const image = await loadImage(src);
        if (!image) break;
        const natural = await naturalSize(src);
        let width = Number(node.attrs?.width) || natural.width;
        let height = Number(node.attrs?.height) || (width * natural.height) / natural.width;
        if (width > ctx.contentWidthPx) {
          height = (height * ctx.contentWidthPx) / width;
          width = ctx.contentWidthPx;
        }
        out.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({ type: image.type, data: image.bytes, transformation: { width: Math.round(width), height: Math.round(height) } })],
          }),
        );
        break;
      }
      case 'table': {
        const rows = (node.content ?? []).map(async (row) => {
          const cells = (row.content ?? []).map(async (cell) => {
            const children = (await blocks(cell.content, ctx)).filter((c): c is Paragraph | Table => c instanceof Paragraph || c instanceof Table);
            return new TableCell({
              children: children.length ? children : [new Paragraph('')],
              columnSpan: Number(cell.attrs?.colspan) || 1,
              rowSpan: Number(cell.attrs?.rowspan) || 1,
              shading: cell.type === 'tableHeader' ? { type: ShadingType.CLEAR, fill: 'F2F2F2', color: 'auto' } : undefined,
            });
          });
          return new TableRow({ children: await Promise.all(cells), tableHeader: row.content?.[0]?.type === 'tableHeader' });
        });
        out.push(new Table({ rows: await Promise.all(rows), width: { size: 100, type: WidthType.PERCENTAGE } }));
        out.push(new Paragraph(''));
        break;
      }
    }
  }
  return out;
}

function headerFooterParagraph(text: string, withPageNumber: boolean, align: string) {
  const children: ParagraphChild[] = [];
  if (text) children.push(new TextRun(text));
  if (withPageNumber) {
    if (text) children.push(new TextRun('   '));
    children.push(new TextRun({ children: [PageNumber.CURRENT] }));
  }
  return new Paragraph({ alignment: ALIGN[align] ?? AlignmentType.CENTER, children });
}

export async function buildDocx(content: JSONContent, settings: PageSettings, title: string): Promise<Document> {
  const geometry = pageGeometry(settings);
  const ctx: Ctx = { bulletInstance: 0, orderedInstance: 0, contentWidthPx: geometry.contentWidth };
  const children = await blocks(content.content, ctx);
  const landscape = settings.orientation === 'landscape';
  const align = settings.pageNumberAlign;

  const header = settings.header || settings.pageNumbers === 'header'
    ? new Header({ children: [headerFooterParagraph(settings.header, settings.pageNumbers === 'header', settings.header && settings.pageNumbers !== 'header' ? 'center' : align)] })
    : undefined;
  const footer = settings.footer || settings.pageNumbers === 'footer'
    ? new Footer({ children: [headerFooterParagraph(settings.footer, settings.pageNumbers === 'footer', settings.footer && settings.pageNumbers !== 'footer' ? 'center' : align)] })
    : undefined;
  const empty = { header: new Header({ children: [] }), footer: new Footer({ children: [] }) };

  const levels = (ordered: boolean) =>
    Array.from({ length: 9 }, (_, level) => ({
      level,
      format: ordered ? [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN][level % 3] : LevelFormat.BULLET,
      text: ordered ? `%${level + 1}.` : ['•', '◦', '▪'][level % 3],
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: twips(0.5 * (level + 1)), hanging: twips(0.25) } } },
    }));

  return new Document({
    title,
    creator: 'Suvarna',
    styles: {
      default: {
        document: {
          run: { font: fontSlots(DEFAULT_FONT), size: DEFAULT_FONT_SIZE_PT * 2, sizeComplexScript: DEFAULT_FONT_SIZE_PT * 2 },
          paragraph: { spacing: { after: 120, line: 360, lineRule: LineRuleType.AUTO } },
        },
      },
      paragraphStyles: HEADING_SIZES_PT.map((pt, i) => ({
        id: `Heading${i + 1}`,
        name: `Heading ${i + 1}`,
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { bold: true, boldComplexScript: true, size: pt * 2, sizeComplexScript: pt * 2, color: '1F2937' },
        paragraph: { spacing: { before: 240, after: 120 } },
      })),
    },
    numbering: {
      config: [
        { reference: 'bullets', levels: levels(false) },
        { reference: 'ordered', levels: levels(true) },
      ],
    },
    sections: [
      {
        properties: {
          titlePage: settings.differentFirstPage,
          page: {
            size: {
              width: twips(geometry.width / PX_PER_INCH),
              height: twips(geometry.height / PX_PER_INCH),
              orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            },
            margin: {
              top: twips(settings.margins.top),
              right: twips(settings.margins.right),
              bottom: twips(settings.margins.bottom),
              left: twips(settings.margins.left),
              header: twips(Math.min(0.5, settings.margins.top / 2)),
              footer: twips(Math.min(0.5, settings.margins.bottom / 2)),
            },
          },
        },
        headers: header ? { default: header, ...(settings.differentFirstPage ? { first: empty.header } : {}) } : undefined,
        footers: footer ? { default: footer, ...(settings.differentFirstPage ? { first: empty.footer } : {}) } : undefined,
        children: children.length ? children : [new Paragraph('')],
      },
    ],
  });
}

export async function exportDocx(content: JSONContent, settings: PageSettings, title: string): Promise<Blob> {
  return Packer.toBlob(await buildDocx(content, settings, title));
}

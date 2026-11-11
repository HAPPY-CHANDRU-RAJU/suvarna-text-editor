import type { JSONContent } from '@tiptap/core';

export const PX_PER_INCH = 96;
export const PX_PER_PT = 96 / 72;
export const TWIPS_PER_INCH = 1440;

export type PageSizeId = 'A4' | 'Letter' | 'Legal' | 'A5';
export type Orientation = 'portrait' | 'landscape';
export type PageNumberPosition = 'none' | 'header' | 'footer';
export type Align = 'left' | 'center' | 'right';

/** Page sizes in inches (portrait). */
export const PAGE_SIZES: Record<PageSizeId, { width: number; height: number; label: string }> = {
  A4: { width: 8.27, height: 11.69, label: 'A4 (21 × 29.7 cm)' },
  Letter: { width: 8.5, height: 11, label: 'Letter (8.5 × 11 in)' },
  Legal: { width: 8.5, height: 14, label: 'Legal (8.5 × 14 in)' },
  A5: { width: 5.83, height: 8.27, label: 'A5 (14.8 × 21 cm)' },
};

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const MARGIN_PRESETS: Record<'normal' | 'narrow' | 'moderate' | 'wide', Margins> = {
  normal: { top: 1, right: 1, bottom: 1, left: 1 },
  narrow: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 },
  moderate: { top: 1, right: 0.75, bottom: 1, left: 0.75 },
  wide: { top: 1, right: 2, bottom: 1, left: 2 },
};

export interface PageSettings {
  size: PageSizeId;
  orientation: Orientation;
  /** Inches. */
  margins: Margins;
  header: string;
  footer: string;
  pageNumbers: PageNumberPosition;
  pageNumberAlign: Align;
  kannadaNumerals: boolean;
  differentFirstPage: boolean;
}

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  size: 'A4',
  orientation: 'portrait',
  margins: MARGIN_PRESETS.normal,
  header: '',
  footer: '',
  pageNumbers: 'footer',
  pageNumberAlign: 'center',
  kannadaNumerals: true,
  differentFirstPage: false,
};

export interface CommentReply {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface CommentThread {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  resolved: boolean;
  /** The commented text when the comment was made, shown if the anchor is deleted. */
  quote: string;
  replies: CommentReply[];
}

export interface DocumentRecord {
  id: string;
  title: string;
  content: JSONContent;
  settings: PageSettings;
  comments: CommentThread[];
  preview: string;
  wordCount: number;
  starred: boolean;
  isPublic: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentSummary = Pick<
  DocumentRecord,
  'id' | 'title' | 'preview' | 'wordCount' | 'starred' | 'isPublic' | 'createdAt' | 'updatedAt'
>;

export const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

export interface PageGeometry {
  width: number;
  height: number;
  margins: Margins;
  contentWidth: number;
  contentHeight: number;
}

/** Page dimensions in CSS pixels. */
export function pageGeometry(settings: PageSettings): PageGeometry {
  const size = PAGE_SIZES[settings.size] ?? PAGE_SIZES.A4;
  const portrait = settings.orientation !== 'landscape';
  const width = Math.round((portrait ? size.width : size.height) * PX_PER_INCH);
  const height = Math.round((portrait ? size.height : size.width) * PX_PER_INCH);
  const m = settings.margins;
  const margins = {
    top: Math.round(m.top * PX_PER_INCH),
    right: Math.round(m.right * PX_PER_INCH),
    bottom: Math.round(m.bottom * PX_PER_INCH),
    left: Math.round(m.left * PX_PER_INCH),
  };
  return {
    width,
    height,
    margins,
    contentWidth: width - margins.left - margins.right,
    contentHeight: height - margins.top - margins.bottom,
  };
}

export function normalizeSettings(raw: Partial<PageSettings> | null | undefined): PageSettings {
  return { ...DEFAULT_PAGE_SETTINGS, ...(raw ?? {}), margins: { ...DEFAULT_PAGE_SETTINGS.margins, ...(raw?.margins ?? {}) } };
}

/** Words are whitespace separated in Kannada as in English. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('kn', { granularity: 'grapheme' }) : null;

/** Kannada letters (aksharas) are grapheme clusters, not code points. */
export function countAksharas(text: string): number {
  const compact = text.replace(/\s+/g, '');
  if (!segmenter) return compact.length;
  let n = 0;
  for (const _ of segmenter.segment(compact)) n++;
  return n;
}

export function makePreview(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 160);
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

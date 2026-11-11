export interface FontOption {
  /** CSS font-family value stored in the document. */
  value: string;
  /** Name shown in the font picker. */
  label: string;
  kannada: boolean;
  /** Font name written into .docx files (what Word looks for on the reader's machine). */
  docxName: string;
}

// Kannada families are loaded from Google Fonts in index.css and in the print frame.
export const FONTS: FontOption[] = [
  { value: 'Noto Sans Kannada', label: 'Noto Sans Kannada', kannada: true, docxName: 'Noto Sans Kannada' },
  { value: 'Noto Serif Kannada', label: 'Noto Serif Kannada', kannada: true, docxName: 'Noto Serif Kannada' },
  { value: 'Baloo Tamma 2', label: 'Baloo Tamma 2', kannada: true, docxName: 'Baloo Tamma 2' },
  { value: 'Tiro Kannada', label: 'Tiro Kannada', kannada: true, docxName: 'Tiro Kannada' },
  { value: 'Anek Kannada', label: 'Anek Kannada', kannada: true, docxName: 'Anek Kannada' },
  { value: 'Hubballi', label: 'Hubballi', kannada: true, docxName: 'Hubballi' },
  { value: 'Arial', label: 'Arial', kannada: false, docxName: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman', kannada: false, docxName: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia', kannada: false, docxName: 'Georgia' },
  { value: 'Courier New', label: 'Courier New', kannada: false, docxName: 'Courier New' },
];

export const DEFAULT_FONT = 'Noto Sans Kannada';
export const DEFAULT_FONT_SIZE_PT = 12;

export const FONT_SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

export const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Kannada:wght@400;500;600;700&family=Noto+Serif+Kannada:wght@400;600;700&family=Baloo+Tamma+2:wght@400;600&family=Tiro+Kannada&family=Anek+Kannada:wght@400;600&family=Hubballi&family=Inter:wght@400;500;600;700&display=swap';

/** CSS stack for a stored family, so Latin text in Kannada fonts still renders. */
export function fontStack(family: string): string {
  return `'${family}', 'Noto Sans Kannada', 'Nirmala UI', 'Tunga', sans-serif`;
}

export function findFont(value: string | null | undefined): FontOption | undefined {
  if (!value) return undefined;
  const clean = value.split(',')[0].replace(/['"]/g, '').trim();
  return FONTS.find((f) => f.value === clean);
}

import type { AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyleKit } from '@tiptap/extension-text-style';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import { AutoCorrect } from './autocorrect';
import { Comment } from './comment';
import { PageBreak } from './page-break';
import { Pagination } from './pagination';
import { ParagraphFormat } from './paragraph-format';
import { Proofing } from './proofing';
import { Search } from './search';
import { Transliteration } from './transliteration';

export interface ExtensionOptions {
  placeholder?: string;
  transliteration?: boolean;
  onAutoCorrect?: (changes: { from: string; to: string }[]) => void;
}

/** Schema-only extensions: enough to parse and render documents (export, templates, read-only views). */
export function schemaExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      undoRedo: { depth: 200 },
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
    Highlight.configure({ multicolor: true }),
    TextStyleKit.configure({ lineHeight: false }),
    Subscript,
    Superscript,
    Image.configure({
      inline: false,
      allowBase64: true,
      resize: { enabled: true, alwaysPreserveAspectRatio: true, minWidth: 40, minHeight: 40 },
    }),
    TableKit.configure({ table: { resizable: true, cellMinWidth: 40 } }),
    ParagraphFormat,
    PageBreak,
    Comment,
  ];
}

export function editorExtensions(options: ExtensionOptions = {}): AnyExtension[] {
  return [
    ...schemaExtensions(),
    Placeholder.configure({ placeholder: options.placeholder ?? '' }),
    Pagination,
    Search,
    Transliteration.configure({ enabled: options.transliteration ?? true }),
    // Typed AutoCorrect is silent like Word's; only API fixes are announced.
    AutoCorrect,
    Proofing.configure({ onAutoCorrect: options.onAutoCorrect }),
  ];
}

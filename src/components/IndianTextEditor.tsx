import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { SpellCheckExtension } from '@/lib/spellcheck-extension';
import { EditorToolbar } from './EditorToolbar';
import { FindReplaceBar } from './FindReplaceBar';
import { SuggestionPopup } from './SuggestionPopup';
import { useState, useCallback } from 'react';

const IndianTextEditor = () => {
  const [showFindReplace, setShowFindReplace] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        placeholder: 'ಇಲ್ಲಿ ಬರೆಯಿರಿ... (Start typing in any Indian language)',
      }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      SpellCheckExtension,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none',
      },
    },
  });

  const toggleFindReplace = useCallback(() => {
    setShowFindReplace(prev => !prev);
  }, []);

  if (!editor) return null;

  const errorCount = (editor.storage as any).spellCheck?.errors?.length ?? 0;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-lg">ಅ</span>
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground leading-tight">Suvarna Editor</h1>
            <p className="text-xs text-muted-foreground">Smart Text Editor for Kannada</p>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <EditorToolbar editor={editor} onToggleFindReplace={toggleFindReplace} />

      {/* Find/Replace */}
      {showFindReplace && (
        <FindReplaceBar editor={editor} onClose={() => setShowFindReplace(false)} />
      )}

      {/* Editor Area */}
      <div className="flex-1 overflow-auto bg-background">
        <div className="max-w-4xl mx-auto my-8 bg-editor rounded-xl shadow-lg border border-border tiptap-editor relative">
          {errorCount > 0 && (
            <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
              {errorCount} spelling {errorCount === 1 ? 'error' : 'errors'}
            </div>
          )}
          <EditorContent editor={editor} />
          <SuggestionPopup editor={editor} />
        </div>
      </div>

      {/* Status Bar */}
      <footer className="flex items-center justify-between px-6 py-2 border-t border-border bg-card text-xs text-muted-foreground">
        <span>Language: Kannada</span>
        <span>
          {editor.getText().length} characters
          {' · '}
          {editor.getText().split(/\s+/).filter(Boolean).length} words
        </span>
      </footer>
    </div>
  );
};

export default IndianTextEditor;

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { getSuggestions, detectLanguage, type SpellError } from '@/lib/spellcheck';

interface SuggestionPopupProps {
  editor: Editor;
}

export function SuggestionPopup({ editor }: SuggestionPopupProps) {
  const [popup, setPopup] = useState<{
    word: string;
    suggestions: string[];
    x: number;
    y: number;
    from: number;
    to: number;
  } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dom = editor.view.dom;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const errorEl = target.closest('.spell-error') as HTMLElement | null;
      
      if (errorEl) {
        e.preventDefault();
        e.stopPropagation();
        
        const word = errorEl.getAttribute('data-spell-error') || errorEl.textContent || '';
        const lang = detectLanguage(word);
        const suggestions = getSuggestions(word, lang);
        
        if (suggestions.length === 0) return;

        // Find ProseMirror position
        const pos = editor.view.posAtDOM(errorEl, 0);
        const to = pos + word.length;

        const rect = errorEl.getBoundingClientRect();
        setPopup({
          word,
          suggestions,
          x: rect.left,
          y: rect.bottom + 4,
          from: pos,
          to,
        });
      } else {
        setPopup(null);
      }
    };

    dom.addEventListener('click', handleClick);
    return () => dom.removeEventListener('click', handleClick);
  }, [editor]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopup(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleReplace = useCallback(
    (suggestion: string) => {
      if (!popup) return;
      editor
        .chain()
        .focus()
        .deleteRange({ from: popup.from, to: popup.to })
        .insertContentAt(popup.from, suggestion)
        .run();
      setPopup(null);
    },
    [editor, popup]
  );

  if (!popup) return null;

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-popover border border-border rounded-lg shadow-xl min-w-[220px] py-1"
      style={{ left: popup.x, top: popup.y }}
    >
      <div className="px-3 py-2 border-b border-border">
        <p className="text-xs text-muted-foreground">Suggestions for:</p>
        <p className="text-sm font-semibold text-destructive font-indic mt-0.5">{popup.word}</p>
      </div>
      <div className="py-1">
        {popup.suggestions.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => handleReplace(suggestion)}
            className="w-full text-left px-3 py-2 text-sm font-indic hover:bg-primary/10 transition-colors flex items-center gap-2"
          >
            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
              {i + 1}
            </span>
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

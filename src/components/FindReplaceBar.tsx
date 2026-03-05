import { useState, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, ChevronUp, ChevronDown, Replace, ReplaceAll } from 'lucide-react';

interface FindReplaceBarProps {
  editor: Editor;
  onClose: () => void;
}

export function FindReplaceBar({ editor, onClose }: FindReplaceBarProps) {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);

  const findMatches = useCallback(() => {
    if (!findText) {
      // Clear highlights
      editor.chain().focus().unsetHighlight().run();
      setMatchCount(0);
      setCurrentMatch(0);
      return [];
    }

    const text = editor.getText();
    const matches: number[] = [];
    let idx = 0;
    const lower = text.toLowerCase();
    const searchLower = findText.toLowerCase();

    while ((idx = lower.indexOf(searchLower, idx)) !== -1) {
      matches.push(idx);
      idx += 1;
    }

    setMatchCount(matches.length);
    if (matches.length > 0 && currentMatch === 0) {
      setCurrentMatch(1);
    }
    return matches;
  }, [findText, editor, currentMatch]);

  const handleFind = useCallback(() => {
    findMatches();
  }, [findMatches]);

  const handleReplaceOne = useCallback(() => {
    if (!findText) return;
    const content = editor.getHTML();
    const newContent = content.replace(findText, replaceText);
    editor.commands.setContent(newContent);
    handleFind();
  }, [findText, replaceText, editor, handleFind]);

  const handleReplaceAll = useCallback(() => {
    if (!findText) return;
    const content = editor.getHTML();
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const newContent = content.replace(regex, replaceText);
    editor.commands.setContent(newContent);
    setMatchCount(0);
    setCurrentMatch(0);
  }, [findText, replaceText, editor]);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-card border-b border-border flex-wrap">
      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        <Input
          placeholder="Find..."
          value={findText}
          onChange={(e) => setFindText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleFind()}
          className="h-8 text-sm max-w-[200px]"
        />
        {matchCount > 0 && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {currentMatch}/{matchCount}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={handleFind} className="h-8 px-2">
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        <Input
          placeholder="Replace..."
          value={replaceText}
          onChange={(e) => setReplaceText(e.target.value)}
          className="h-8 text-sm max-w-[200px]"
        />
        <Button variant="ghost" size="sm" onClick={handleReplaceOne} className="h-8 px-2" title="Replace">
          <Replace className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleReplaceAll} className="h-8 px-2" title="Replace All">
          <ReplaceAll className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

import { useState } from 'react';
import { Delete, X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { useEditorUi } from '../EditorContext';

// On-screen Kannada keyboard. Consonants are inserted bare; tapping a vowel
// sign right after a consonant attaches it (ಕ + ಾ → ಕಾ), and ್ joins conjuncts.

const VOWELS = ['ಅ', 'ಆ', 'ಇ', 'ಈ', 'ಉ', 'ಊ', 'ಋ', 'ಎ', 'ಏ', 'ಐ', 'ಒ', 'ಓ', 'ಔ', 'ಅಂ', 'ಅಃ'];
const SIGNS = ['ಾ', 'ಿ', 'ೀ', 'ು', 'ೂ', 'ೃ', 'ೆ', 'ೇ', 'ೈ', 'ೊ', 'ೋ', 'ೌ', 'ಂ', 'ಃ', '್'];
const CONSONANTS = [
  ['ಕ', 'ಖ', 'ಗ', 'ಘ', 'ಙ'],
  ['ಚ', 'ಛ', 'ಜ', 'ಝ', 'ಞ'],
  ['ಟ', 'ಠ', 'ಡ', 'ಢ', 'ಣ'],
  ['ತ', 'ಥ', 'ದ', 'ಧ', 'ನ'],
  ['ಪ', 'ಫ', 'ಬ', 'ಭ', 'ಮ'],
  ['ಯ', 'ರ', 'ಲ', 'ವ', 'ಶ', 'ಷ', 'ಸ', 'ಹ', 'ಳ', 'ಕ್ಷ', 'ಜ್ಞ'],
];
const DIGITS = ['೦', '೧', '೨', '೩', '೪', '೫', '೬', '೭', '೮', '೯'];

function Key({ label, onPress, className, wide }: { label: React.ReactNode; onPress: () => void; className?: string; wide?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // Keep focus (and the cursor) in the document.
        e.preventDefault();
        onPress();
      }}
      className={cn('kb-key font-indic', wide && 'px-4', className)}
    >
      {label}
    </button>
  );
}

export function KannadaKeyboard() {
  const { editor, setShowKeyboard } = useEditorUi();
  const { t } = useI18n();
  const [showSigns, setShowSigns] = useState(true);
  const type = (text: string) => editor.chain().focus().insertContent(text).run();
  // Removes one code point, so ಕಾ becomes ಕ, like a hardware Backspace.
  const backspace = () => {
    const { from, empty, $from } = editor.state.selection;
    if (!empty) return editor.chain().focus().deleteSelection().run();
    if ($from.parentOffset === 0) return editor.chain().focus().joinBackward().run();
    return editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
  };

  return (
    <div className="kannada-keyboard" role="group" aria-label={t('insert.keyboard')}>
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{t('insert.keyboard')}</span>
        <button type="button" className="chip" onMouseDown={(e) => { e.preventDefault(); setShowSigns(!showSigns); }}>
          {showSigns ? 'ಸ್ವರ' : 'ಗುಣಿತ'}
        </button>
        <button type="button" className="ml-auto rounded p-1 hover:bg-muted" onClick={() => setShowKeyboard(false)} aria-label={t('common.close')}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1">
          {(showSigns ? SIGNS : VOWELS).map((k) => (
            <Key key={k} label={showSigns && k !== '್' ? `◌${k}` : k} onPress={() => type(k)} className={showSigns ? 'bg-primary/10' : ''} />
          ))}
        </div>
        {CONSONANTS.map((row, i) => (
          <div key={i} className="flex flex-wrap gap-1">
            {row.map((k) => (
              <Key key={k} label={k} onPress={() => type(k)} />
            ))}
          </div>
        ))}
        <div className="flex flex-wrap gap-1">
          {DIGITS.map((k) => (
            <Key key={k} label={k} onPress={() => type(k)} />
          ))}
          <Key label="␣" wide onPress={() => type(' ')} />
          <Key label="।" onPress={() => type('।')} />
          <Key label={<Delete className="h-4 w-4" />} onPress={() => backspace()} />
        </div>
      </div>
    </div>
  );
}

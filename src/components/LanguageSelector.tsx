import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SupportedLanguage } from '@/lib/spellcheck';

const languages: { value: SupportedLanguage; label: string; script: string }[] = [
  { value: 'kannada', label: 'Kannada', script: 'ಕನ್ನಡ' },
];

interface LanguageSelectorProps {
  value: SupportedLanguage;
  onChange: (lang: SupportedLanguage) => void;
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SupportedLanguage)}>
      <SelectTrigger className="w-[160px] h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.value} value={lang.value}>
            <span className="flex items-center gap-2">
              <span className="font-indic text-sm">{lang.script}</span>
              <span className="text-muted-foreground text-xs">({lang.label})</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

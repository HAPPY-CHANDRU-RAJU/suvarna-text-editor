import { useState } from 'react';
import {
  AArrowDown, AArrowUp, AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Brush, ClipboardPaste, Copy,
  Highlighter, IndentDecrease, IndentIncrease, Italic, List, ListOrdered, RemoveFormatting, Replace, Scissors,
  Search, SquareDashedMousePointer, Strikethrough, Subscript, Superscript, Type, Underline, UnfoldVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useI18n, type MessageKey } from '@/i18n';
import { DEFAULT_FONT, DEFAULT_FONT_SIZE_PT, FONT_SIZES, FONTS, findFont, fontStack } from '@/lib/kannada/fonts';
import { LINE_SPACINGS } from '@/editor/extensions/paragraph-format';
import { cn } from '@/lib/utils';
import { useEditorUi } from '../EditorContext';
import { ColorSplitButton, MenuItem, RibbonButton, RibbonDropdown, RibbonGroup, RibbonRow, RibbonRows, RibbonSeparator } from './controls';

const STYLES: { key: MessageKey; className: string; apply: 'paragraph' | 1 | 2 | 3 | 4 | 'quote' | 'code' }[] = [
  { key: 'style.normal', className: 'text-[13px]', apply: 'paragraph' },
  { key: 'style.heading1', className: 'text-[17px] font-bold', apply: 1 },
  { key: 'style.heading2', className: 'text-[15px] font-bold', apply: 2 },
  { key: 'style.heading3', className: 'text-[14px] font-bold', apply: 3 },
  { key: 'style.heading4', className: 'text-[13px] font-bold', apply: 4 },
  { key: 'style.quote', className: 'text-[13px] italic border-l-2 border-primary pl-1', apply: 'quote' },
  { key: 'style.code', className: 'text-[12px] font-mono', apply: 'code' },
];

function currentFontSize(attr: string | undefined): number {
  const n = parseFloat(attr ?? '');
  if (!Number.isFinite(n)) return DEFAULT_FONT_SIZE_PT;
  return attr?.endsWith('px') ? Math.round(n * 0.75 * 2) / 2 : n;
}

function stepSize(current: number, dir: 1 | -1): number {
  if (dir > 0) return FONT_SIZES.find((s) => s > current) ?? Math.min(current + 10, 400);
  return [...FONT_SIZES].reverse().find((s) => s < current) ?? Math.max(1, current - 1);
}

export function HomeTab() {
  const { editor, openFind, formatPainter, startFormatPainter } = useEditorUi();
  const { t } = useI18n();
  const [textColor, setTextColor] = useState('#C00000');
  const [highlight, setHighlight] = useState('#FFFF00');
  const [sizeInput, setSizeInput] = useState<string | null>(null);

  const textStyle = editor.getAttributes('textStyle');
  const family = findFont(textStyle.fontFamily)?.value ?? (textStyle.fontFamily ? String(textStyle.fontFamily).split(',')[0].replace(/['"]/g, '') : DEFAULT_FONT);
  const size = currentFontSize(textStyle.fontSize);
  const chain = () => editor.chain().focus();
  const setSize = (pt: number) => chain().setFontSize(`${pt}pt`).run();

  const activeStyle = STYLES.find((s) =>
    s.apply === 'quote'
      ? editor.isActive('blockquote')
      : s.apply === 'code'
        ? editor.isActive('codeBlock')
        : s.apply === 'paragraph'
          ? editor.isActive('paragraph') && !editor.isActive('blockquote')
          : editor.isActive('heading', { level: s.apply }),
  );

  const applyStyle = (apply: (typeof STYLES)[number]['apply']) => {
    if (apply === 'paragraph') chain().setParagraph().run();
    else if (apply === 'quote') chain().toggleBlockquote().run();
    else if (apply === 'code') chain().toggleCodeBlock().run();
    else chain().setHeading({ level: apply }).run();
  };

  const clipboard = async (action: 'cut' | 'copy' | 'paste') => {
    editor.commands.focus();
    if (action !== 'paste') {
      document.execCommand(action);
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      editor.chain().focus().insertContent(text).run();
    } catch {
      toast.info(t('context.pasteBlocked'));
    }
  };

  return (
    <>
      <RibbonGroup label={t('group.clipboard')}>
        <RibbonButton size="large" icon={ClipboardPaste} label={t('home.paste')} shortcut="Ctrl+V" onClick={() => clipboard('paste')} />
        <RibbonRows>
          <RibbonButton icon={Scissors} label={t('home.cut')} shortcut="Ctrl+X" onClick={() => clipboard('cut')} />
          <RibbonButton icon={Copy} label={t('home.copy')} shortcut="Ctrl+C" onClick={() => clipboard('copy')} />
          <RibbonButton icon={Brush} label={t('home.formatPainter')} active={formatPainter} onClick={startFormatPainter} />
        </RibbonRows>
      </RibbonGroup>

      <RibbonGroup label={t('group.font')}>
        <RibbonRows>
          <RibbonRow>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" onMouseDown={(e) => e.preventDefault()} className="ribbon-input w-[150px] justify-between" aria-label={t('home.fontFamily')}>
                  <span className="truncate" style={{ fontFamily: fontStack(family) }}>{family}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[240px] p-1" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
                <div className="max-h-[320px] overflow-auto">
                  {FONTS.map((f) => (
                    <MenuItem key={f.value} active={f.value === family} onSelect={() => chain().setFontFamily(f.value).run()} hint={f.kannada ? 'ಕ' : 'A'}>
                      <span style={{ fontFamily: fontStack(f.value) }}>{f.label}{f.kannada ? ' — ಕನ್ನಡ' : ''}</span>
                    </MenuItem>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <div className="flex">
                <input
                  aria-label={t('home.fontSize')}
                  className="ribbon-input w-[44px] rounded-r-none text-center"
                  value={sizeInput ?? String(size)}
                  onChange={(e) => setSizeInput(e.target.value)}
                  onBlur={() => setSizeInput(null)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    const n = parseFloat(sizeInput ?? '');
                    if (n > 0 && n <= 400) setSize(n);
                    setSizeInput(null);
                  }}
                />
                <PopoverTrigger asChild>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} className="ribbon-input w-4 rounded-l-none border-l-0 px-0 text-[10px]" aria-label={t('home.fontSize')}>
                    ▾
                  </button>
                </PopoverTrigger>
              </div>
              <PopoverContent align="start" className="w-[80px] p-1" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
                <div className="max-h-[300px] overflow-auto">
                  {FONT_SIZES.map((s) => (
                    <MenuItem key={s} active={s === size} onSelect={() => setSize(s)}>{s}</MenuItem>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <RibbonButton icon={AArrowUp} label={t('home.growFont')} shortcut="Ctrl+]" onClick={() => setSize(stepSize(size, 1))} />
            <RibbonButton icon={AArrowDown} label={t('home.shrinkFont')} shortcut="Ctrl+[" onClick={() => setSize(stepSize(size, -1))} />
            <RibbonButton icon={RemoveFormatting} label={t('home.clearFormatting')} onClick={() => chain().unsetAllMarks().setParagraph().run()} />
          </RibbonRow>
          <RibbonRow>
            <RibbonButton icon={Bold} label={t('home.bold')} shortcut="Ctrl+B" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()} />
            <RibbonButton icon={Italic} label={t('home.italic')} shortcut="Ctrl+I" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()} />
            <RibbonButton icon={Underline} label={t('home.underline')} shortcut="Ctrl+U" active={editor.isActive('underline')} onClick={() => chain().toggleUnderline().run()} />
            <RibbonButton icon={Strikethrough} label={t('home.strike')} active={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()} />
            <RibbonButton icon={Subscript} label={t('home.subscript')} shortcut="Ctrl+," active={editor.isActive('subscript')} onClick={() => chain().toggleSubscript().run()} />
            <RibbonButton icon={Superscript} label={t('home.superscript')} shortcut="Ctrl+." active={editor.isActive('superscript')} onClick={() => chain().toggleSuperscript().run()} />
            <RibbonSeparator />
            <ColorSplitButton
              icon={Highlighter}
              label={t('home.highlight')}
              color={highlight}
              palette="highlight"
              noneLabel={t('home.noColor')}
              onApply={(c) => {
                setHighlight(c);
                chain().setHighlight({ color: c }).run();
              }}
              onClear={() => chain().unsetHighlight().run()}
            />
            <ColorSplitButton
              icon={Type}
              label={t('home.textColor')}
              color={textColor}
              palette="text"
              noneLabel={t('home.automatic')}
              onApply={(c) => {
                setTextColor(c);
                chain().setColor(c).run();
              }}
              onClear={() => chain().unsetColor().run()}
            />
          </RibbonRow>
        </RibbonRows>
      </RibbonGroup>

      <RibbonGroup label={t('group.paragraph')}>
        <RibbonRows>
          <RibbonRow>
            <RibbonButton icon={List} label={t('home.bullets')} active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()} />
            <RibbonButton icon={ListOrdered} label={t('home.numbering')} active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()} />
            <RibbonSeparator />
            <RibbonButton icon={IndentDecrease} label={t('home.decreaseIndent')} shortcut="Shift+Tab" onClick={() => chain().outdent().run()} />
            <RibbonButton icon={IndentIncrease} label={t('home.increaseIndent')} shortcut="Tab" onClick={() => chain().indent().run()} />
          </RibbonRow>
          <RibbonRow>
            <RibbonButton icon={AlignLeft} label={t('home.alignLeft')} shortcut="Ctrl+L" active={editor.isActive({ textAlign: 'left' })} onClick={() => chain().setTextAlign('left').run()} />
            <RibbonButton icon={AlignCenter} label={t('home.alignCenter')} shortcut="Ctrl+E" active={editor.isActive({ textAlign: 'center' })} onClick={() => chain().setTextAlign('center').run()} />
            <RibbonButton icon={AlignRight} label={t('home.alignRight')} shortcut="Ctrl+R" active={editor.isActive({ textAlign: 'right' })} onClick={() => chain().setTextAlign('right').run()} />
            <RibbonButton icon={AlignJustify} label={t('home.justify')} shortcut="Ctrl+J" active={editor.isActive({ textAlign: 'justify' })} onClick={() => chain().setTextAlign('justify').run()} />
            <RibbonDropdown icon={UnfoldVertical} label={t('home.lineSpacing')}>
              {(close) => {
                const attrs = editor.getAttributes('paragraph');
                const heading = editor.getAttributes('heading');
                const current = attrs.lineHeight ?? heading.lineHeight;
                const before = attrs.spaceBefore ?? heading.spaceBefore;
                const after = attrs.spaceAfter ?? heading.spaceAfter;
                const run = (fn: () => void) => () => {
                  fn();
                  close();
                };
                return (
                  <div className="w-[260px]">
                    {LINE_SPACINGS.map((v) => (
                      <MenuItem key={v} active={current === v} onSelect={run(() => chain().setLineSpacing(v).run())}>{v}</MenuItem>
                    ))}
                    <div className="my-1 h-px bg-border" />
                    <MenuItem onSelect={run(() => chain().setParagraphSpacing({ before: before ? null : 12 }).run())}>
                      {t(before ? 'home.removeSpaceBefore' : 'home.addSpaceBefore')}
                    </MenuItem>
                    <MenuItem onSelect={run(() => chain().setParagraphSpacing({ after: after === 0 ? null : 0 }).run())}>
                      {t(after === 0 ? 'home.addSpaceAfter' : 'home.removeSpaceAfter')}
                    </MenuItem>
                  </div>
                );
              }}
            </RibbonDropdown>
          </RibbonRow>
        </RibbonRows>
      </RibbonGroup>

      <RibbonGroup label={t('group.styles')}>
        <div className="flex max-w-[460px] gap-1 overflow-x-auto py-0.5">
          {STYLES.map((s) => (
            <button
              key={s.key}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyStyle(s.apply)}
              className={cn('style-tile', activeStyle?.key === s.key && 'is-active')}
            >
              <span className={cn('block truncate font-indic leading-tight', s.className)}>ಅಆ AaBb</span>
              <span className="block truncate text-[10px] text-muted-foreground">{t(s.key)}</span>
            </button>
          ))}
        </div>
      </RibbonGroup>

      <RibbonGroup label={t('group.editing')}>
        <RibbonRows>
          <RibbonButton icon={Search} label={t('home.find')} shortcut="Ctrl+F" showLabel onClick={() => openFind(false)} />
          <RibbonButton icon={Replace} label={t('home.replace')} shortcut="Ctrl+H" showLabel onClick={() => openFind(true)} />
          <RibbonButton icon={SquareDashedMousePointer} label={t('home.selectAll')} shortcut="Ctrl+A" showLabel onClick={() => chain().selectAll().run()} />
        </RibbonRows>
      </RibbonGroup>
    </>
  );
}

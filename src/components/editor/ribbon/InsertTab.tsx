import { useState } from 'react';
import { CalendarDays, FileDown, Hash, Image, Keyboard, Link2, Minus, Omega, PanelBottom, PanelTop, Sheet } from 'lucide-react';
import { useI18n } from '@/i18n';
import { toKannadaDigits } from '@/lib/kannada/transliterate';
import { cn } from '@/lib/utils';
import { useEditorUi } from '../EditorContext';
import { MenuItem, RibbonButton, RibbonDropdown, RibbonGroup } from './controls';

const GRID = 10;
const KN_MONTHS = ['ಜನವರಿ', 'ಫೆಬ್ರವರಿ', 'ಮಾರ್ಚ್', 'ಏಪ್ರಿಲ್', 'ಮೇ', 'ಜೂನ್', 'ಜುಲೈ', 'ಆಗಸ್ಟ್', 'ಸೆಪ್ಟೆಂಬರ್', 'ಅಕ್ಟೋಬರ್', 'ನವೆಂಬರ್', 'ಡಿಸೆಂಬರ್'];

function dateFormats(d = new Date()): string[] {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return [
    toKannadaDigits(`${dd}-${mm}-${yyyy}`),
    `${toKannadaDigits(String(d.getDate()))} ${KN_MONTHS[d.getMonth()]} ${toKannadaDigits(yyyy)}`,
    new Intl.DateTimeFormat('kn-IN', { dateStyle: 'full' }).format(d),
    `${dd}/${mm}/${yyyy}`,
    new Intl.DateTimeFormat('en-IN', { dateStyle: 'long' }).format(d),
  ];
}

function TableGrid({ onPick }: { onPick: (rows: number, cols: number) => void }) {
  const { t } = useI18n();
  const [hover, setHover] = useState<[number, number]>([0, 0]);
  return (
    <div className="p-2">
      <div className="mb-1.5 text-xs text-muted-foreground">
        {hover[0] ? t('insert.tableSize', { cols: hover[1], rows: hover[0] }) : t('insert.table')}
      </div>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${GRID}, 16px)` }} onMouseLeave={() => setHover([0, 0])}>
        {Array.from({ length: GRID * 8 }, (_, i) => {
          const r = Math.floor(i / GRID) + 1;
          const c = (i % GRID) + 1;
          const on = r <= hover[0] && c <= hover[1];
          return (
            <button
              key={i}
              type="button"
              aria-label={t('insert.tableSize', { cols: c, rows: r })}
              onMouseEnter={() => setHover([r, c])}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(r, c)}
              className={cn('h-4 w-4 rounded-[2px] border', on ? 'border-primary bg-primary/25' : 'border-border bg-background')}
            />
          );
        })}
      </div>
    </div>
  );
}

export function InsertTab() {
  const { editor, openDialog, insertImageFromFile, showKeyboard, setShowKeyboard } = useEditorUi();
  const { t } = useI18n();
  const chain = () => editor.chain().focus();

  return (
    <>
      <RibbonGroup label={t('group.pages')}>
        <RibbonButton size="large" icon={FileDown} label={t('insert.pageBreak')} shortcut="Ctrl+Enter" onClick={() => chain().setPageBreak().run()} />
      </RibbonGroup>

      <RibbonGroup label={t('group.tables')}>
        <RibbonDropdown size="large" icon={Sheet} label={t('insert.table')}>
          {(close) => (
            <TableGrid
              onPick={(rows, cols) => {
                chain().insertTable({ rows, cols, withHeaderRow: true }).run();
                close();
              }}
            />
          )}
        </RibbonDropdown>
      </RibbonGroup>

      <RibbonGroup label={t('group.illustrations')}>
        <RibbonButton size="large" icon={Image} label={t('insert.picture')} onClick={insertImageFromFile} />
        <RibbonButton size="large" icon={Minus} label={t('insert.horizontalLine')} onClick={() => chain().setHorizontalRule().run()} />
      </RibbonGroup>

      <RibbonGroup label={t('group.links')}>
        <RibbonButton size="large" icon={Link2} label={t('insert.link')} shortcut="Ctrl+K" onClick={() => openDialog('link')} />
      </RibbonGroup>

      <RibbonGroup label={t('group.headerFooter')}>
        <RibbonButton size="large" icon={PanelTop} label={t('insert.header')} onClick={() => openDialog('headerFooter')} />
        <RibbonButton size="large" icon={PanelBottom} label={t('insert.footer')} onClick={() => openDialog('headerFooter')} />
        <RibbonButton size="large" icon={Hash} label={t('insert.pageNumber')} onClick={() => openDialog('headerFooter')} />
      </RibbonGroup>

      <RibbonGroup label={t('group.symbols')}>
        <RibbonDropdown size="large" icon={CalendarDays} label={t('insert.date')}>
          {(close) => (
            <div className="w-[260px]">
              {dateFormats().map((d) => (
                <MenuItem
                  key={d}
                  onSelect={() => {
                    chain().insertContent(d).run();
                    close();
                  }}
                >
                  {d}
                </MenuItem>
              ))}
            </div>
          )}
        </RibbonDropdown>
        <RibbonButton size="large" icon={Omega} label={t('insert.symbol')} onClick={() => openDialog('symbol')} />
        <RibbonButton size="large" icon={Keyboard} label={t('insert.keyboard')} active={showKeyboard} onClick={() => setShowKeyboard(!showKeyboard)} />
      </RibbonGroup>
    </>
  );
}

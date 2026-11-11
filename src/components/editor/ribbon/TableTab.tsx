import {
  ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine, ArrowUpToLine, Columns3, Heading, Rows3, TableCellsMerge,
  TableCellsSplit, Trash2,
} from 'lucide-react';
import { useI18n } from '@/i18n';
import { useEditorUi } from '../EditorContext';
import { RibbonButton, RibbonGroup, RibbonRows } from './controls';

export function TableTab() {
  const { editor } = useEditorUi();
  const { t } = useI18n();
  const chain = () => editor.chain().focus();

  return (
    <>
      <RibbonGroup label={t('group.rowsColumns')}>
        <RibbonButton size="large" icon={ArrowUpToLine} label={t('table.rowAbove')} onClick={() => chain().addRowBefore().run()} />
        <RibbonButton size="large" icon={ArrowDownToLine} label={t('table.rowBelow')} onClick={() => chain().addRowAfter().run()} />
        <RibbonButton size="large" icon={ArrowLeftToLine} label={t('table.colLeft')} onClick={() => chain().addColumnBefore().run()} />
        <RibbonButton size="large" icon={ArrowRightToLine} label={t('table.colRight')} onClick={() => chain().addColumnAfter().run()} />
        <RibbonRows>
          <RibbonButton icon={Rows3} label={t('table.deleteRow')} showLabel onClick={() => chain().deleteRow().run()} />
          <RibbonButton icon={Columns3} label={t('table.deleteColumn')} showLabel onClick={() => chain().deleteColumn().run()} />
          <RibbonButton icon={Trash2} label={t('table.deleteTable')} showLabel onClick={() => chain().deleteTable().run()} />
        </RibbonRows>
      </RibbonGroup>
      <RibbonGroup label={t('group.merge')}>
        <RibbonButton size="large" icon={TableCellsMerge} label={t('table.merge')} disabled={!editor.can().mergeCells()} onClick={() => chain().mergeCells().run()} />
        <RibbonButton size="large" icon={TableCellsSplit} label={t('table.split')} disabled={!editor.can().splitCell()} onClick={() => chain().splitCell().run()} />
        <RibbonButton size="large" icon={Heading} label={t('table.headerRow')} onClick={() => chain().toggleHeaderRow().run()} />
      </RibbonGroup>
    </>
  );
}

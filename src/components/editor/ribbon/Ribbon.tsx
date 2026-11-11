import { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useI18n, type MessageKey } from '@/i18n';
import { cn } from '@/lib/utils';
import { useEditorUi } from '../EditorContext';
import { FileBackstage } from './FileBackstage';
import { HomeTab } from './HomeTab';
import { InsertTab } from './InsertTab';
import { LayoutTab } from './LayoutTab';
import { ReviewTab } from './ReviewTab';
import { TableTab } from './TableTab';
import { ViewTab } from './ViewTab';

type TabId = 'home' | 'insert' | 'layout' | 'review' | 'view' | 'table';

const TABS: { id: TabId; label: MessageKey }[] = [
  { id: 'home', label: 'tab.home' },
  { id: 'insert', label: 'tab.insert' },
  { id: 'layout', label: 'tab.layout' },
  { id: 'review', label: 'tab.review' },
  { id: 'view', label: 'tab.view' },
];

export function Ribbon() {
  const { editor, ribbonCollapsed, setRibbonCollapsed } = useEditorUi();
  const { t } = useI18n();
  const [tab, setTab] = useState<TabId>('home');
  const [backstage, setBackstage] = useState(false);
  // While collapsed, clicking a tab shows the ribbon temporarily.
  const [peek, setPeek] = useState(false);
  const inTable = editor.isActive('table');

  useEffect(() => {
    if (!inTable && tab === 'table') setTab('home');
  }, [inTable, tab]);

  const choose = (id: TabId) => {
    setTab(id);
    if (ribbonCollapsed) setPeek(true);
  };

  const showBody = !ribbonCollapsed || peek;

  return (
    <div className="ribbon" onMouseLeave={() => setPeek(false)}>
      <div className="ribbon-tabs" role="tablist">
        <button type="button" className="ribbon-tab ribbon-tab-file" onClick={() => setBackstage(true)}>
          {t('tab.file')}
        </button>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={cn('ribbon-tab', tab === item.id && showBody && 'is-active')}
            onClick={() => choose(item.id)}
            onDoubleClick={() => setRibbonCollapsed(!ribbonCollapsed)}
          >
            {t(item.label)}
          </button>
        ))}
        {inTable && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'table'}
            className={cn('ribbon-tab ribbon-tab-contextual', tab === 'table' && showBody && 'is-active')}
            onClick={() => choose('table')}
          >
            {t('tab.table')}
          </button>
        )}
        <button
          type="button"
          className="ml-auto mr-2 rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label={t(ribbonCollapsed ? 'view.expandRibbon' : 'view.collapseRibbon')}
          title={t(ribbonCollapsed ? 'view.expandRibbon' : 'view.collapseRibbon')}
          onClick={() => {
            setRibbonCollapsed(!ribbonCollapsed);
            setPeek(false);
          }}
        >
          {ribbonCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>
      {showBody && (
        <div className={cn('ribbon-body', ribbonCollapsed && 'ribbon-body-floating')} role="tabpanel">
          {tab === 'home' && <HomeTab />}
          {tab === 'insert' && <InsertTab />}
          {tab === 'layout' && <LayoutTab />}
          {tab === 'review' && <ReviewTab />}
          {tab === 'view' && <ViewTab />}
          {tab === 'table' && inTable && <TableTab />}
        </div>
      )}
      {backstage && <FileBackstage onClose={() => setBackstage(false)} />}
    </div>
  );
}

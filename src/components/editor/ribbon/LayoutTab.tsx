import { FileText, RectangleHorizontal, RectangleVertical, Ruler, Scan, Settings2 } from 'lucide-react';
import { useI18n, type MessageKey } from '@/i18n';
import { MARGIN_PRESETS, PAGE_SIZES, type Margins, type PageSizeId } from '@/lib/document';
import { useEditorUi } from '../EditorContext';
import { MenuItem, RibbonButton, RibbonDropdown, RibbonGroup } from './controls';

const PRESET_LABELS: Record<keyof typeof MARGIN_PRESETS, MessageKey> = {
  normal: 'layout.normal',
  narrow: 'layout.narrow',
  moderate: 'layout.moderate',
  wide: 'layout.wide',
};

const sameMargins = (a: Margins, b: Margins) => a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;

export function LayoutTab() {
  const { settings, updateSettings, openDialog } = useEditorUi();
  const { t, n } = useI18n();

  return (
    <>
      <RibbonGroup label={t('group.pageSetup')}>
        <RibbonDropdown size="large" icon={Scan} label={t('layout.margins')}>
          {(close) => (
            <div className="w-[300px]">
              {(Object.keys(MARGIN_PRESETS) as (keyof typeof MARGIN_PRESETS)[]).map((key) => {
                const m = MARGIN_PRESETS[key];
                return (
                  <MenuItem
                    key={key}
                    icon={Ruler}
                    active={sameMargins(m, settings.margins)}
                    onSelect={() => {
                      updateSettings({ margins: m });
                      close();
                    }}
                  >
                    <div className="font-medium">{t(PRESET_LABELS[key])}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {t('layout.marginSummary', { top: n(m.top), bottom: n(m.bottom), left: n(m.left), right: n(m.right) })}
                    </div>
                  </MenuItem>
                );
              })}
              <div className="my-1 h-px bg-border" />
              <MenuItem
                icon={Settings2}
                onSelect={() => {
                  close();
                  openDialog('pageSetup');
                }}
              >
                {t('layout.custom')}
              </MenuItem>
            </div>
          )}
        </RibbonDropdown>
        <RibbonDropdown size="large" icon={settings.orientation === 'landscape' ? RectangleHorizontal : RectangleVertical} label={t('layout.orientation')}>
          {(close) => (
            <div className="w-[180px]">
              <MenuItem icon={RectangleVertical} active={settings.orientation === 'portrait'} onSelect={() => { updateSettings({ orientation: 'portrait' }); close(); }}>
                {t('layout.portrait')}
              </MenuItem>
              <MenuItem icon={RectangleHorizontal} active={settings.orientation === 'landscape'} onSelect={() => { updateSettings({ orientation: 'landscape' }); close(); }}>
                {t('layout.landscape')}
              </MenuItem>
            </div>
          )}
        </RibbonDropdown>
        <RibbonDropdown size="large" icon={FileText} label={t('layout.size')}>
          {(close) => (
            <div className="w-[240px]">
              {(Object.keys(PAGE_SIZES) as PageSizeId[]).map((id) => (
                <MenuItem key={id} active={settings.size === id} onSelect={() => { updateSettings({ size: id }); close(); }}>
                  {PAGE_SIZES[id].label}
                </MenuItem>
              ))}
            </div>
          )}
        </RibbonDropdown>
        <RibbonButton size="large" icon={Settings2} label={t('layout.pageSetup')} onClick={() => openDialog('pageSetup')} />
      </RibbonGroup>
    </>
  );
}

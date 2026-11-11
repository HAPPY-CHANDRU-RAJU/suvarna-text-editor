import { Focus, Globe, Moon, PanelLeft, Ruler, ScrollText, StretchHorizontal, ZoomIn, ZoomOut, Search } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useI18n } from '@/i18n';
import { useEditorUi } from '../EditorContext';
import { RibbonButton, RibbonGroup, RibbonRows } from './controls';

export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 3;

export function ViewTab() {
  const ui = useEditorUi();
  const { t } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <>
      <RibbonGroup label={t('group.views')}>
        <RibbonButton size="large" icon={ScrollText} label={t('view.printLayout')} active={ui.layout === 'print'} onClick={() => ui.setLayout('print')} />
        <RibbonButton size="large" icon={Globe} label={t('view.webLayout')} active={ui.layout === 'web'} onClick={() => ui.setLayout('web')} />
        <RibbonButton size="large" icon={Focus} label={t('view.focus')} active={ui.focusMode} onClick={() => ui.setFocusMode(!ui.focusMode)} />
      </RibbonGroup>

      <RibbonGroup label={t('group.show')}>
        <RibbonRows>
          <RibbonButton icon={Ruler} label={t('view.ruler')} showLabel active={ui.showRuler} onClick={() => ui.setShowRuler(!ui.showRuler)} />
          <RibbonButton icon={PanelLeft} label={t('view.navigation')} showLabel active={ui.showNavigation} onClick={() => ui.setShowNavigation(!ui.showNavigation)} />
          <RibbonButton icon={Moon} label={t('view.dark')} showLabel active={resolvedTheme === 'dark'} onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} />
        </RibbonRows>
      </RibbonGroup>

      <RibbonGroup label={t('group.zoom')}>
        <RibbonButton size="large" icon={Search} label={t('view.zoom100')} onClick={() => ui.setZoom(1)} />
        <RibbonButton size="large" icon={StretchHorizontal} label={t('view.pageWidth')} onClick={ui.fitPageWidth} />
        <RibbonRows>
          <RibbonButton icon={ZoomIn} label={t('view.zoomIn')} onClick={() => ui.setZoom(Math.min(ZOOM_MAX, ui.zoom + 0.1))} />
          <RibbonButton icon={ZoomOut} label={t('view.zoomOut')} onClick={() => ui.setZoom(Math.max(ZOOM_MIN, ui.zoom - 0.1))} />
        </RibbonRows>
      </RibbonGroup>
    </>
  );
}

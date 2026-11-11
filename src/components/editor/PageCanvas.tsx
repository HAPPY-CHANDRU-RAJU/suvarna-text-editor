import { useMemo, type CSSProperties } from 'react';
import { EditorContent } from '@tiptap/react';
import { getPageCount, PAGE_GAP } from '@/editor/extensions/pagination';
import { pageGeometry, type PageGeometry, type PageSettings } from '@/lib/document';
import { formatNumber } from '@/lib/kannada/transliterate';
import { cn } from '@/lib/utils';
import { useEditorUi } from './EditorContext';
import { Ruler } from './Ruler';

function SheetChrome({ text, number, align, position, geometry }: {
  text: string;
  number: string | null;
  align: PageSettings['pageNumberAlign'];
  position: 'header' | 'footer';
  geometry: PageGeometry;
}) {
  if (!text && !number) return null;
  const style: CSSProperties = {
    left: geometry.margins.left,
    right: geometry.margins.right,
    ...(position === 'header'
      ? { top: Math.max(16, geometry.margins.top / 2 - 10) }
      : { bottom: Math.max(16, geometry.margins.bottom / 2 - 10) }),
  };
  return (
    <div className="sheet-chrome" style={style}>
      <span className="flex-1 text-left">{number && align === 'left' ? number : ''}</span>
      <span className="flex-1 text-center">
        {text}
        {number && align === 'center' ? `${text ? '  ' : ''}${number}` : ''}
      </span>
      <span className="flex-1 text-right">{number && align === 'right' ? number : ''}</span>
    </div>
  );
}

export function PageCanvas() {
  const { editor, settings, layout, zoom, showRuler, stackRef, scrollRef, openDialog } = useEditorUi();
  const geometry = useMemo(() => pageGeometry(settings), [settings]);
  const pages = layout === 'print' ? getPageCount(editor.state) : 1;
  const stackHeight = pages * geometry.height + (pages - 1) * PAGE_GAP;

  if (layout === 'web') {
    return (
      <div ref={scrollRef} className="canvas-scroll">
        <div ref={stackRef} className="web-layout" style={{ zoom } as CSSProperties}>
          <EditorContent editor={editor} />
        </div>
      </div>
    );
  }

  const vars = {
    '--page-mt': `${geometry.margins.top}px`,
    '--page-mr': `${geometry.margins.right}px`,
    '--page-ml': `${geometry.margins.left}px`,
    '--stack-h': `${stackHeight}px`,
  } as CSSProperties;

  return (
    <div ref={scrollRef} className="canvas-scroll">
      {showRuler && <Ruler geometry={geometry} zoom={zoom} />}
      <div className="page-sizer" style={{ width: geometry.width * zoom, height: stackHeight * zoom }}>
        <div
          ref={stackRef}
          className="page-stack"
          style={{ ...vars, width: geometry.width, height: stackHeight, transform: `scale(${zoom})` }}
        >
          <div className="page-sheets" aria-hidden="true">
            {Array.from({ length: pages }, (_, i) => {
              const skip = settings.differentFirstPage && i === 0;
              const number = formatNumber(i + 1, settings.kannadaNumerals);
              return (
                <div
                  key={i}
                  className="page-sheet"
                  style={{ top: i * (geometry.height + PAGE_GAP), height: geometry.height }}
                  onDoubleClick={(e) => {
                    // Double-clicking the header/footer band opens its settings, as in Word.
                    const y = e.nativeEvent.offsetY;
                    if (y < geometry.margins.top || y > geometry.height - geometry.margins.bottom) openDialog('headerFooter');
                  }}
                >
                  {!skip && (
                    <>
                      <SheetChrome position="header" geometry={geometry} align={settings.pageNumberAlign} text={settings.header} number={settings.pageNumbers === 'header' ? number : null} />
                      <SheetChrome position="footer" geometry={geometry} align={settings.pageNumberAlign} text={settings.footer} number={settings.pageNumbers === 'footer' ? number : null} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <EditorContent editor={editor} className={cn('page-content')} />
        </div>
      </div>
    </div>
  );
}

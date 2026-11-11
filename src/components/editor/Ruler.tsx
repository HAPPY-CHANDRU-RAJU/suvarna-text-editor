import { PX_PER_INCH, type PageGeometry } from '@/lib/document';
import { INDENT_STEP_IN } from '@/editor/extensions/paragraph-format';
import { useEditorUi } from './EditorContext';

// Horizontal ruler in inches: shaded margins, tick marks and the current
// paragraph's left indent.
export function Ruler({ geometry, zoom }: { geometry: PageGeometry; zoom: number }) {
  const { editor } = useEditorUi();
  const width = geometry.width * zoom;
  const unit = PX_PER_INCH * zoom;
  const inches = Math.floor(geometry.width / PX_PER_INCH);
  const indent = Number(editor.getAttributes('paragraph').indent || editor.getAttributes('heading').indent || 0);
  const indentX = (geometry.margins.left + indent * INDENT_STEP_IN * PX_PER_INCH) * zoom;

  const ticks = [];
  for (let i = 0; i <= inches * 8; i++) {
    const x = (i * unit) / 8;
    const major = i % 8 === 0;
    const half = i % 4 === 0;
    ticks.push(
      <div key={i} className="ruler-tick" style={{ left: x, height: major ? 0 : half ? 6 : 3 }} />,
    );
    if (major && i > 0) {
      ticks.push(
        <div key={`l${i}`} className="ruler-label" style={{ left: x }}>
          {i / 8}
        </div>,
      );
    }
  }

  return (
    <div className="ruler-wrap" aria-hidden="true">
      <div className="ruler" style={{ width }}>
        <div className="ruler-margin" style={{ left: 0, width: geometry.margins.left * zoom }} />
        <div className="ruler-margin" style={{ right: 0, width: geometry.margins.right * zoom }} />
        {ticks}
        <div className="ruler-indent" style={{ left: indentX }} />
      </div>
    </div>
  );
}

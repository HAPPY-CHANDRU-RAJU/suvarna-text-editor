import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import type { PageGeometry } from '@/lib/document';

// Print-layout pagination.
//
// The document is one ProseMirror view laid over a stack of page "sheets"
// drawn by React (PageCanvas). After each change we measure where every line
// would sit in an unbroken flow, decide which line starts each page, and
// insert an invisible spacer widget before that line whose height pushes it
// to the top of the next sheet. Spacers can sit between blocks or inside a
// paragraph (at a line-wrap boundary), so long paragraphs split across pages
// the way they do in Word.

export const PAGE_GAP = 24;

export interface PageBreak {
  pos: number;
  /** Empty space left at the bottom of the page before the break. */
  fill: number;
}

export interface PaginationState {
  breaks: PageBreak[];
  pageCount: number;
  decorations: DecorationSet;
  /** Geometry the decorations were built for; a change forces a rebuild. */
  geometryKey: string;
  /** Bumped by setPageGeometry so the view re-measures. */
  nonce: number;
}

export interface Unit {
  pos: number;
  top: number;
  force?: boolean;
}

export const paginationKey = new PluginKey<PaginationState>('pagination');

const CONTAINERS = new Set(['bulletList', 'orderedList', 'listItem', 'blockquote', 'taskList', 'taskItem']);
const SPACER_CLASS = 'pm-page-spacer';

/** Chooses page breaks for units measured in unbroken flow coordinates. Pure; unit-tested. */
export function paginate(units: Unit[], endTop: number, contentHeight: number): PageBreak[] {
  const breaks: PageBreak[] = [];
  let start = 0;
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    const bottom = i + 1 < units.length ? units[i + 1].top : endTop;
    const overflows = bottom - start > contentHeight + 0.5 && unit.top > start + 0.5;
    if (unit.force || overflows) {
      breaks.push({ pos: unit.pos, fill: Math.max(0, contentHeight - (unit.top - start)) });
      start = unit.top;
    }
  }
  return breaks;
}

interface LineBox {
  top: number;
  bottom: number;
  left: number;
}

function lineBoxes(el: HTMLElement): LineBox[] {
  const rects: DOMRect[] = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) =>
      n instanceof HTMLElement && n.classList.contains(SPACER_CLASS) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) {
      if (!n.textContent) continue;
      range.selectNodeContents(n);
      for (const r of Array.from(range.getClientRects())) if (r.height > 0) rects.push(r);
    } else if (n instanceof HTMLImageElement) {
      rects.push(n.getBoundingClientRect());
    }
  }
  rects.sort((a, b) => a.top - b.top);
  const lines: LineBox[] = [];
  for (const r of rects) {
    const current = lines[lines.length - 1];
    if (!current || r.top >= current.bottom - 2) {
      lines.push({ top: r.top, bottom: r.bottom, left: r.left });
    } else {
      current.top = Math.min(current.top, r.top);
      current.bottom = Math.max(current.bottom, r.bottom);
      current.left = Math.min(current.left, r.left);
    }
  }
  return lines;
}

function measure(view: EditorView, geometry: PageGeometry): PageBreak[] | null {
  const dom = view.dom as HTMLElement;
  const width = dom.offsetWidth;
  if (!width) return null;
  const domRect = dom.getBoundingClientRect();
  const scale = domRect.width / width || 1;
  const padTop = parseFloat(getComputedStyle(dom).paddingTop) || 0;

  const spacers = Array.from(dom.querySelectorAll<HTMLElement>(`.${SPACER_CLASS}`)).map((el) => ({
    top: (el.getBoundingClientRect().top - domRect.top) / scale,
    height: Number(el.dataset.height) || 0,
  }));

  // Converts a client y coordinate to where it would be with no spacers.
  const flow = (clientY: number) => {
    const y = (clientY - domRect.top) / scale;
    let removed = 0;
    for (const s of spacers) if (s.top <= y - 0.5) removed += s.height;
    return y - padTop - removed;
  };

  const units: Unit[] = [];
  let forceNext = false;
  const push = (unit: Unit) => {
    if (forceNext) {
      unit.force = true;
      forceNext = false;
    }
    units.push(unit);
  };

  const visit = (node: PMNode, pos: number, inherited: Unit | null) => {
    const el = view.nodeDOM(pos);
    if (!(el instanceof HTMLElement)) return;
    const head: Unit = inherited ?? { pos, top: flow(el.getBoundingClientRect().top) };

    if (node.type.name === 'pageBreak') {
      push(head);
      forceNext = true;
      return;
    }
    if (CONTAINERS.has(node.type.name) && node.childCount > 0) {
      node.forEach((child, offset, index) => visit(child, pos + 1 + offset, index === 0 ? head : null));
      return;
    }
    push(head);
    if (!node.isTextblock || node.content.size === 0) return;

    const lines = lineBoxes(el);
    let lastPos = pos + 1;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const hit = view.posAtCoords({ left: line.left + 1, top: (line.top + line.bottom) / 2 });
      if (!hit) continue;
      const linePos = hit.pos;
      if (linePos <= lastPos || linePos >= pos + node.nodeSize - 1) continue;
      lastPos = linePos;
      units.push({ pos: linePos, top: flow((lines[i - 1].bottom + line.top) / 2) });
    }
  };

  const doc = view.state.doc;
  doc.forEach((node, offset) => visit(node, offset, null));

  let endTop = 0;
  if (doc.lastChild) {
    const lastEl = view.nodeDOM(doc.content.size - doc.lastChild.nodeSize);
    if (lastEl instanceof HTMLElement) endTop = flow(lastEl.getBoundingClientRect().bottom);
  }
  return paginate(units, endTop, geometry.contentHeight);
}

function spacerWidget(height: number) {
  return () => {
    const el = document.createElement('span');
    el.className = SPACER_CLASS;
    el.contentEditable = 'false';
    el.dataset.height = String(height);
    el.style.display = 'block';
    el.style.height = `${height}px`;
    return el;
  };
}

function buildDecorations(doc: PMNode, breaks: PageBreak[], geometry: PageGeometry): DecorationSet {
  const chrome = geometry.margins.bottom + PAGE_GAP + geometry.margins.top;
  return DecorationSet.create(
    doc,
    breaks.map((b, i) => {
      const height = Math.round(b.fill + chrome);
      return Decoration.widget(b.pos, spacerWidget(height), {
        side: -1,
        ignoreSelection: true,
        key: `page-${i}-${height}`,
      });
    }),
  );
}

function geometryKey(g: PageGeometry | null) {
  return g ? `${g.width}x${g.height}:${g.margins.top},${g.margins.right},${g.margins.bottom},${g.margins.left}` : '';
}

function sameBreaks(a: PageBreak[], b: PageBreak[]) {
  return a.length === b.length && a.every((x, i) => x.pos === b[i].pos && Math.round(x.fill) === Math.round(b[i].fill));
}

export interface PaginationStorage {
  geometry: PageGeometry | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pagination: {
      setPageGeometry: (geometry: PageGeometry | null) => ReturnType;
    };
  }
  interface Storage {
    pagination: PaginationStorage;
  }
}

export const Pagination = Extension.create<Record<string, never>, PaginationStorage>({
  name: 'pagination',

  addStorage() {
    return { geometry: null };
  },

  addCommands() {
    return {
      setPageGeometry:
        (geometry) =>
        ({ tr, dispatch }) => {
          this.storage.geometry = geometry;
          if (dispatch) tr.setMeta(paginationKey, { remeasure: true });
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;

    return [
      new Plugin<PaginationState>({
        key: paginationKey,
        state: {
          init: () => ({ breaks: [], pageCount: 1, decorations: DecorationSet.empty, geometryKey: '', nonce: 0 }),
          apply(tr: Transaction, value: PaginationState, _old: EditorState, state: EditorState) {
            const meta = tr.getMeta(paginationKey) as { breaks?: PageBreak[]; remeasure?: boolean } | undefined;
            if (meta?.breaks) {
              const geometry = storage.geometry;
              return {
                ...value,
                breaks: geometry ? meta.breaks : [],
                pageCount: geometry ? meta.breaks.length + 1 : 1,
                decorations: geometry ? buildDecorations(state.doc, meta.breaks, geometry) : DecorationSet.empty,
                geometryKey: geometryKey(geometry),
              };
            }
            if (meta?.remeasure) return { ...value, nonce: value.nonce + 1 };
            if (!tr.docChanged) return value;
            // Keep spacers roughly in place until the next measurement.
            return {
              ...value,
              breaks: value.breaks.map((b) => ({ ...b, pos: tr.mapping.map(b.pos, -1) })),
              decorations: value.decorations.map(tr.mapping, tr.doc),
            };
          },
        },
        props: {
          decorations(state) {
            return paginationKey.getState(state)?.decorations;
          },
        },
        view(view) {
          let frame = 0;
          let timer = 0;
          let selfDispatches = 0;

          const run = () => {
            frame = 0;
            const geometry = storage.geometry;
            const current = paginationKey.getState(view.state);
            if (!current) return;
            if (!geometry) {
              if (current.breaks.length) view.dispatch(view.state.tr.setMeta(paginationKey, { breaks: [] }));
              return;
            }
            const breaks = measure(view, geometry);
            if (!breaks) return;
            if (sameBreaks(breaks, current.breaks) && current.geometryKey === geometryKey(geometry)) return;
            // Guard against layouts that oscillate between two solutions.
            if (++selfDispatches > 6) return;
            view.dispatch(view.state.tr.setMeta(paginationKey, { breaks }).setMeta('addToHistory', false));
          };

          const schedule = (delay = 0) => {
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
              if (!frame) frame = requestAnimationFrame(run);
            }, delay);
          };

          const onResize = () => schedule(50);
          const onLoad = () => schedule();
          window.addEventListener('resize', onResize);
          view.dom.addEventListener('load', onLoad, true);
          document.fonts?.addEventListener?.('loadingdone', onLoad);
          document.fonts?.ready.then(onLoad);
          schedule();

          return {
            update(v, prevState) {
              const next = paginationKey.getState(v.state);
              const prev = paginationKey.getState(prevState);
              const changed = v.state.doc !== prevState.doc;
              if (changed || next?.nonce !== prev?.nonce) selfDispatches = 0;
              if (changed || next !== prev) schedule(changed ? 30 : 0);
            },
            destroy() {
              window.clearTimeout(timer);
              cancelAnimationFrame(frame);
              window.removeEventListener('resize', onResize);
              view.dom.removeEventListener('load', onLoad, true);
              document.fonts?.removeEventListener?.('loadingdone', onLoad);
            },
          };
        },
      }),
    ];
  },
});

export function getPageCount(state: EditorState): number {
  return paginationKey.getState(state)?.pageCount ?? 1;
}

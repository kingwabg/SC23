import type {JSX} from 'react';
import './index.css';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect, useRef, useState, useCallback} from 'react';
import {createPortal} from 'react-dom';

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type DragMode = ResizeDir | 'move';

const EDGE = 8;
const H = 7;

function edgeBars(r: DOMRect): {key: string; style: React.CSSProperties}[] {
  return [
    {key: 'edge-t', style: {top: r.top - EDGE / 2,   left: r.left - EDGE / 2, width: r.width + EDGE, height: EDGE}},
    {key: 'edge-b', style: {top: r.bottom - EDGE / 2, left: r.left - EDGE / 2, width: r.width + EDGE, height: EDGE}},
    {key: 'edge-l', style: {top: r.top + EDGE / 2,   left: r.left - EDGE / 2, height: r.height - EDGE, width: EDGE}},
    {key: 'edge-r', style: {top: r.top + EDGE / 2,   left: r.right - EDGE / 2, height: r.height - EDGE, width: EDGE}},
  ];
}

const RESIZE_HANDLES: {dir: ResizeDir; getStyle: (r: DOMRect) => React.CSSProperties}[] = [
  {dir: 'n',  getStyle: (r) => ({top: r.top - H,        left: r.left + r.width / 2 - H})},
  {dir: 's',  getStyle: (r) => ({top: r.bottom - H,     left: r.left + r.width / 2 - H})},
  {dir: 'e',  getStyle: (r) => ({top: r.top + r.height / 2 - H, left: r.right - H})},
  {dir: 'w',  getStyle: (r) => ({top: r.top + r.height / 2 - H, left: r.left - H})},
  {dir: 'ne', getStyle: (r) => ({top: r.top - H,        left: r.right - H})},
  {dir: 'nw', getStyle: (r) => ({top: r.top - H,        left: r.left - H})},
  {dir: 'se', getStyle: (r) => ({top: r.bottom - H,     left: r.right - H})},
  {dir: 'sw', getStyle: (r) => ({top: r.bottom - H,     left: r.left - H})},
];

/**
 * table-layout:fixed + 컬럼 width 비례 조정으로 표 너비를 변경
 * transform과 달리 레이아웃 공간도 함께 변경되므로 본문과 겹치지 않음
 */
function applyTableWidth(tableEl: HTMLTableElement, newWidth: number) {
  const currentWidth = tableEl.getBoundingClientRect().width;
  if (currentWidth <= 0) return;
  const ratio = newWidth / currentWidth;

  tableEl.style.tableLayout = 'fixed';
  tableEl.style.width = `${newWidth}px`;
  tableEl.style.minWidth = '0';

  // 첫 번째 행의 각 셀 너비를 같은 비율로 조정
  const firstRow = tableEl.rows[0];
  if (firstRow) {
    Array.from(firstRow.cells).forEach((cell) => {
      const cw = cell.getBoundingClientRect().width;
      cell.style.width = `${Math.max(20, cw * ratio)}px`;
      cell.style.minWidth = '0';
      cell.style.overflow = 'hidden';
      cell.style.wordBreak = 'break-word';
    });
  }
}

function getOrInitAbsolutePos(tableEl: HTMLTableElement): {left: number; top: number} {
  if (tableEl.style.position === 'absolute') {
    return {left: parseFloat(tableEl.style.left) || 0, top: parseFloat(tableEl.style.top) || 0};
  }
  const editorEl = tableEl.closest<HTMLElement>('.editor');
  const editorRect = editorEl?.getBoundingClientRect() ?? {left: 0, top: 0};
  const tableRect = tableEl.getBoundingClientRect();
  const left = tableRect.left - editorRect.left;
  const top  = tableRect.top  - editorRect.top  + (editorEl?.scrollTop ?? 0);
  tableEl.style.position = 'absolute';
  tableEl.style.left = `${left}px`;
  tableEl.style.top  = `${top}px`;
  tableEl.style.margin = '0';
  return {left, top};
}

function TableResizeOverlay() {
  const [editor] = useLexicalComposerContext();
  const [selectedTable, setSelectedTable] = useState<HTMLTableElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const draggingRef = useRef<{
    mode: DragMode;
    startX: number; startY: number;
    startW: number; startH: number;
    startLeft: number; startTop: number;
    tableEl: HTMLTableElement;
  } | null>(null);

  const updateRect = useCallback(() => {
    if (selectedTable) setRect(selectedTable.getBoundingClientRect());
  }, [selectedTable]);

  useEffect(() => {
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [updateRect]);

  useEffect(() => { updateRect(); }, [selectedTable, updateRect]);

  useEffect(() => {
    const root = editor.getRootElement();
    if (!root) return;

    const onRootClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const tableEl = target?.closest<HTMLTableElement>('table') ?? null;
      if (tableEl && root.contains(tableEl)) {
        setSelectedTable(tableEl);
      } else {
        const inUI = (target?.closest('.table-resize-handle') ?? target?.closest('.table-edge-bar')) != null;
        if (!inUI) setSelectedTable(null);
      }
    };

    const onDocClick = (e: MouseEvent) => {
      if (draggingRef.current) return;
      const target = e.target as HTMLElement | null;
      const inRoot = root.contains(target);
      const inUI = (target?.closest('.table-resize-handle') ?? target?.closest('.table-edge-bar')) != null;
      if (!inRoot && !inUI) setSelectedTable(null);
    };

    root.addEventListener('click', onRootClick);
    document.addEventListener('click', onDocClick);
    return () => {
      root.removeEventListener('click', onRootClick);
      document.removeEventListener('click', onDocClick);
    };
  }, [editor]);

  const startDrag = useCallback(
    (e: React.MouseEvent, mode: DragMode) => {
      if (!selectedTable || !rect) return;
      e.preventDefault();
      e.stopPropagation();

      const {left: startLeft, top: startTop} =
        mode === 'move'
          ? getOrInitAbsolutePos(selectedTable)
          : {left: parseFloat(selectedTable.style.left) || 0, top: parseFloat(selectedTable.style.top) || 0};

      draggingRef.current = {
        mode, startX: e.clientX, startY: e.clientY,
        startW: rect.width, startH: rect.height,
        startLeft, startTop, tableEl: selectedTable,
      };

      const onMouseMove = (me: MouseEvent) => {
        const drag = draggingRef.current;
        if (!drag) return;
        const dx = me.clientX - drag.startX;
        const dy = me.clientY - drag.startY;
        const d = drag.mode;

        if (d === 'move') {
          drag.tableEl.style.left = `${Math.max(0, drag.startLeft + dx)}px`;
          drag.tableEl.style.top  = `${Math.max(0, drag.startTop  + dy)}px`;
        } else {
          // 가로 리사이즈: 컬럼 너비 직접 조정 (transform 없음 → 겹침 없음)
          if (d.includes('e') || d.includes('w')) {
            const newW = Math.max(60, d.includes('e') ? drag.startW + dx : drag.startW - dx);
            applyTableWidth(drag.tableEl, newW);
          }
          // 세로 리사이즈
          if (d.includes('s') || d.includes('n')) {
            const newH = Math.max(20, d.includes('s') ? drag.startH + dy : drag.startH - dy);
            drag.tableEl.style.minHeight = '0';
            drag.tableEl.style.height = `${newH}px`;
          }
        }
        setRect(drag.tableEl.getBoundingClientRect());
      };

      const onMouseUp = () => {
        draggingRef.current = null;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        if (selectedTable) setRect(selectedTable.getBoundingClientRect());
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [rect, selectedTable],
  );

  if (!selectedTable || !rect) return null;

  return (
    <>
      {edgeBars(rect).map(({key, style}) => (
        <div key={key} className="table-edge-bar" style={style} onMouseDown={(e) => startDrag(e, 'move')} />
      ))}
      {RESIZE_HANDLES.map(({dir, getStyle}) => (
        <div key={dir} className="table-resize-handle" data-dir={dir} style={getStyle(rect)} onMouseDown={(e) => startDrag(e, dir)} />
      ))}
    </>
  );
}

export default function TableResizePlugin(): JSX.Element {
  return createPortal(<TableResizeOverlay />, document.body);
}

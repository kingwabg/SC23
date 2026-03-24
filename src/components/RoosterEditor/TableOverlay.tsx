import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './TableOverlay.css';

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type DragMode = ResizeDir | 'move';

const EDGE = 8;
function edgeBars(r: DOMRect) {
  return [
    {key: 'et', style: {top: r.top - EDGE/2, left: r.left - EDGE/2, width: r.width + EDGE, height: EDGE} as React.CSSProperties},
    {key: 'eb', style: {top: r.bottom - EDGE/2, left: r.left - EDGE/2, width: r.width + EDGE, height: EDGE} as React.CSSProperties},
    {key: 'el', style: {top: r.top + EDGE/2, left: r.left - EDGE/2, width: EDGE, height: r.height - EDGE} as React.CSSProperties},
    {key: 'er', style: {top: r.top + EDGE/2, left: r.right - EDGE/2, width: EDGE, height: r.height - EDGE} as React.CSSProperties},
  ];
}

function applyTableWidth(tableEl: HTMLTableElement, newWidth: number) {
  const currentWidth = tableEl.getBoundingClientRect().width;
  if (currentWidth <= 0) return;
  const ratio = newWidth / currentWidth;

  const firstRow = tableEl.rows[0];
  const cellWidths: number[] = [];
  if (firstRow) {
    Array.from(firstRow.cells).forEach(cell => {
      cellWidths.push(cell.getBoundingClientRect().width);
    });
  }

  tableEl.style.tableLayout = 'fixed';
  tableEl.style.width = `${newWidth}px`;
  tableEl.style.minWidth = '0';

  if (firstRow) {
    Array.from(firstRow.cells).forEach((cell, i) => {
      const cw = cellWidths[i] ?? 0;
      cell.style.width = `${Math.max(20, cw * ratio)}px`;
      cell.style.minWidth = '0';
      cell.style.overflow = 'hidden';
    });
  }
}

// 에디터 안의 모든 블록 레벨 자손을 수집 (줄 단위 세밀한 드롭 위치)
const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE', 'DIV', 'TABLE', 'UL', 'OL']);

function collectBlocks(el: Element, table: HTMLTableElement, out: Element[]) {
  for (const child of Array.from(el.children)) {
    if (child === table) continue;
    if (BLOCK_TAGS.has(child.tagName)) {
      out.push(child);
      // TABLE 내부나 UL/OL 내부는 더 세밀하게
      if (child.tagName !== 'TABLE') {
        collectBlocks(child, table, out);
      }
    } else {
      collectBlocks(child, table, out);
    }
  }
}

/**
 * 마우스 좌표에서 가장 가까운 블록 요소와 삽입 위치 반환
 * 세밀한 블록 (p, div, li 등)을 반환하므로 줄 단위 드롭이 가능
 */
function findDropTarget(
  editorEl: HTMLElement,
  cx: number,
  cy: number,
  draggedTable: HTMLTableElement,
): {element: Element; position: 'before' | 'after'} | null {
  const blocks: Element[] = [];
  collectBlocks(editorEl, draggedTable, blocks);
  if (blocks.length === 0) return null;

  let bestBlock: Element | null = null;
  let bestDist = Infinity;
  let bestPos: 'before' | 'after' = 'after';

  for (const block of blocks) {
    const r = block.getBoundingClientRect();
    if (r.height === 0) continue;
    const midY = (r.top + r.bottom) / 2;
    const dist = Math.abs(cy - midY);
    if (dist < bestDist) {
      bestDist = dist;
      bestBlock = block;
      bestPos = cy <= midY ? 'before' : 'after';
    }
  }

  if (!bestBlock) return null;
  return {element: bestBlock, position: bestPos};
}

interface Props {
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
}

function TableOverlayInner({editorContainerRef}: Props) {
  const [selectedTable, setSelectedTable] = useState<HTMLTableElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // 드롭 위치 표시선
  const [dropLine, setDropLine] = useState<{top: number; left: number; width: number} | null>(null);

  const draggingRef = useRef<{
    mode: DragMode;
    startX: number; startY: number;
    startW: number; startH: number;
    tableEl: HTMLTableElement;
    moved: boolean;
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
    const root = editorContainerRef.current;
    if (!root) return;

    const onRootClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tableEl = target?.closest<HTMLTableElement>('table') ?? null;
      if (tableEl && root.contains(tableEl)) {
        setSelectedTable(tableEl);
      } else {
        const inUI = target?.closest('.tbl-handle') || target?.closest('.tbl-edge');
        if (!inUI) setSelectedTable(null);
      }
    };

    const onDocClick = (e: MouseEvent) => {
      if (draggingRef.current) return;
      const target = e.target as HTMLElement;
      const inUI = target?.closest('.tbl-handle') || target?.closest('.tbl-edge');
      if (!root.contains(target) && !inUI) setSelectedTable(null);
    };

    root.addEventListener('click', onRootClick);
    document.addEventListener('click', onDocClick);
    return () => {
      root.removeEventListener('click', onRootClick);
      document.removeEventListener('click', onDocClick);
    };
  }, [editorContainerRef]);

  const startDrag = useCallback((e: React.MouseEvent, mode: DragMode) => {
    if (!selectedTable || !rect) return;
    e.preventDefault();
    e.stopPropagation();

    draggingRef.current = {
      mode,
      startX: e.clientX, startY: e.clientY,
      startW: rect.width, startH: rect.height,
      tableEl: selectedTable,
      moved: false,
    };

    const onMouseMove = (me: MouseEvent) => {
      const drag = draggingRef.current;
      if (!drag) return;
      const dx = me.clientX - drag.startX;
      const dy = me.clientY - drag.startY;
      const d = drag.mode;

      if (d === 'move') {
        drag.moved = true;
        const editorEl = editorContainerRef.current;
        if (!editorEl) return;

        // 드롭 위치 계산
        const target = findDropTarget(editorEl, me.clientX, me.clientY, drag.tableEl);
        if (target) {
          const tr = target.element.getBoundingClientRect();
          const lineY = target.position === 'before' ? tr.top : tr.bottom;
          setDropLine({top: lineY, left: tr.left, width: tr.width});
        } else {
          setDropLine(null);
        }
      } else {
        // 리사이즈
        if (d.includes('e') || d.includes('w')) {
          const newW = Math.max(60, d.includes('e') ? drag.startW + dx : drag.startW - dx);
          applyTableWidth(drag.tableEl, newW);
        }
        if (d.includes('s') || d.includes('n')) {
          const newH = Math.max(20, d.includes('s') ? drag.startH + dy : drag.startH - dy);
          drag.tableEl.style.minHeight = '0';
          drag.tableEl.style.height = `${newH}px`;
        }
        setRect(drag.tableEl.getBoundingClientRect());
      }
    };

    const onMouseUp = (me: MouseEvent) => {
      const drag = draggingRef.current;
      draggingRef.current = null;
      setDropLine(null);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      if (drag && drag.mode === 'move' && drag.moved) {
        const editorEl = editorContainerRef.current;
        if (!editorEl) return;

        const target = findDropTarget(editorEl, me.clientX, me.clientY, drag.tableEl);
        if (target) {
          const {element, position} = target;
          const parent = element.parentNode;
          if (parent) {
            if (position === 'before') {
              parent.insertBefore(drag.tableEl, element);
            } else {
              // element 다음에 삽입
              const next = element.nextSibling;
              if (next) {
                parent.insertBefore(drag.tableEl, next);
              } else {
                parent.appendChild(drag.tableEl);
              }
            }
          }
        }
      }

      if (selectedTable) setRect(selectedTable.getBoundingClientRect());
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [rect, selectedTable, editorContainerRef]);

  const [, forceUpdate] = useState(0);
  const toggleInline = useCallback(() => {
    if (!selectedTable) return;
    const isInline = selectedTable.style.display === 'inline-table';
    if (isInline) {
      selectedTable.style.display = '';
      selectedTable.style.verticalAlign = '';
    } else {
      selectedTable.style.display = 'inline-table';
      selectedTable.style.verticalAlign = 'top';
    }
    forceUpdate(n => n + 1);
    setRect(selectedTable.getBoundingClientRect());
  }, [selectedTable]);

  if (!selectedTable || !rect) return null;

  const isInline = selectedTable.style.display === 'inline-table';
  
  // 상단 툴바와 겹치지 않게 여유 공간(110px)을 계산해서, 부족하면 표 아래쪽에 배치
  const topPos = rect.top - 36;
  const safeTop = topPos < 110 ? rect.bottom + 12 : topPos;

  return (
    <>
      {/* 플로팅 액션 바 */}
      <div
        className="tbl-action-bar"
        style={{
          position: 'fixed',
          top: safeTop,
          left: rect.left,
          zIndex: 10002,
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <button
          className={`tbl-action-btn ${isInline ? 'active' : ''}`}
          title={isInline ? '블록 배치로 전환 (표 단독 줄)' : '인라인 배치로 전환 (표 옆에 다른 요소 배치)'}
          onClick={toggleInline}
        >
          {isInline ? '📄 블록' : '↔ 인라인'}
        </button>
        <span className="tbl-action-hint">
          {isInline ? '표가 한 줄 차지 → 클릭 시 옆에 배치 가능' : '표 옆에 텍스트·표 나란히 배치 가능'}
        </span>
      </div>

      {edgeBars(rect).map(({key, style}) => (
        <div key={key} className="tbl-edge" style={style} onMouseDown={(e) => startDrag(e, 'move')} />
      ))}
      {/* 드롭 위치 표시선 */}
      {dropLine && (
        <div className="tbl-drop-line" style={{
          position: 'fixed',
          top: dropLine.top - 1,
          left: dropLine.left,
          width: dropLine.width,
          height: 2,
          background: '#2563eb',
          zIndex: 10001,
          borderRadius: 2,
          pointerEvents: 'none',
        }} />
      )}
    </>
  );
}

export default function TableOverlay({editorContainerRef}: Props) {
  return createPortal(<TableOverlayInner editorContainerRef={editorContainerRef} />, document.body);
}

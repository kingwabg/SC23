import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { IEditor } from 'roosterjs-content-model-types';
import { Plus } from 'lucide-react';
import './TableQuickAdd.css';

interface QuickAddProps {
  editor: IEditor | null;
  editorContainer: HTMLDivElement | null;
}

interface HoverState {
  type: 'col' | 'row';
  x: number;
  y: number;
  index: number;
  table: HTMLTableElement;
}

/**
 * Google Docs 스타일의 부동 삽입 버튼 (+)
 * 표 경계선에 마우스를 올리면 즉시 행/열을 추가할 수 있습니다.
 */
const TableQuickAdd: React.FC<QuickAddProps> = ({ editor, editorContainer }) => {
  const [hover, setHover] = useState<HoverState | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!editorContainer || !editor) return;

    const target = e.target as HTMLElement;
    const table = target.closest('table') as HTMLTableElement;
    if (!table) {
      setHover(null);
      return;
    }

    const tableRect = table.getBoundingClientRect();
    const threshold = 12; // 감지 범위
    const rows = Array.from(table.rows);
    const firstRow = rows[0];
    if (!firstRow) return;

    // ── 1. 행(Row) 삽입 감지 (좌측 경계선) ──
    for (let i = 0; i <= rows.length; i++) {
      const rowY = i < rows.length 
        ? rows[i].getBoundingClientRect().top 
        : rows[i - 1].getBoundingClientRect().bottom;
      
      const distY = Math.abs(e.clientY - rowY);
      const isInLeftZone = e.clientX >= tableRect.left - 40 && e.clientX <= tableRect.left + 10;

      if (distY < threshold && isInLeftZone) {
        setHover({ 
          type: 'row', 
          x: tableRect.left - 25, 
          y: rowY, 
          index: i, 
          table 
        });
        return;
      }
    }

    // ── 2. 열(Col) 삽입 감지 (상단 경계선) ──
    const firstRowCells = Array.from(firstRow.cells);
    for (let i = 0; i <= firstRowCells.length; i++) {
        const colX = i < firstRowCells.length 
            ? firstRowCells[i].getBoundingClientRect().left
            : firstRowCells[i-1].getBoundingClientRect().right;

        const distX = Math.abs(e.clientX - colX);
        const isInTopZone = e.clientY >= tableRect.top - 40 && e.clientY <= tableRect.top + 10;

        if (distX < threshold && isInTopZone) {
            setHover({
                type: 'col',
                x: colX,
                y: tableRect.top - 25,
                index: i,
                table
            });
            return;
        }
    }

    setHover(null);
  }, [editor, editorContainer]);

  useEffect(() => {
    if (!editorContainer) return;
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [editorContainer, handleMouseMove]);

  const onAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hover || !editor) return;

    editor.focus();
    const { type, index, table } = hover;
    
    if (type === 'row') {
      const targetRow = table.rows[index] || table.rows[index - 1];
      const cell = targetRow.cells[0];
      const rect = cell.getBoundingClientRect();
      const event = new MouseEvent('mousedown', { bubbles: true, clientX: rect.left + 5, clientY: rect.top + 5 });
      cell.dispatchEvent(event);
      
      const newRow = table.insertRow(index);
      for(let i=0; i<targetRow.cells.length; i++) {
        const c = newRow.insertCell();
        c.style.border = '1px solid #cbd5e1';
        c.style.padding = '5px';
      }
    } else {
      const colgroup = table.querySelector('colgroup');
      if (colgroup) {
         const newCol = document.createElement('col');
         newCol.style.width = '120px';
         if (index >= colgroup.children.length) colgroup.appendChild(newCol);
         else colgroup.insertBefore(newCol, colgroup.children[index]);
      }
      
      Array.from(table.rows).forEach(row => {
        const c = row.insertCell(index);
        c.style.border = '1px solid #cbd5e1';
        c.style.padding = '5px';
      });
    }

    editor.takeSnapshot();
    editor.triggerEvent(10 as any /* Edit */, {});
    setHover(null);
  };

  if (!hover) return null;

  return createPortal(
    <div 
      className={`sc-quick-add-btn ${hover.type}`}
      style={{ left: hover.x, top: hover.y }}
      onClick={onAddClick}
    >
      <div className="btn-circle">
        <Plus size={14} color="white" strokeWidth={3} />
      </div>
      <div className="add-guide-line" />
    </div>,
    document.body
  );
};

export default TableQuickAdd;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import './TableOverlay.css';

interface Props {
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
}

interface OverlayRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function TableOverlay({ editorContainerRef }: Props) {
  const [selectedTable, setSelectedTable] = useState<HTMLTableElement | null>(null);
  const [rect, setRect] = useState<OverlayRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  
  const startPos = useRef({ x: 0, y: 0, top: 0, left: 0, width: 0, height: 0 });

  const updateRect = useCallback(() => {
    if (!selectedTable) return;
    const tableRect = selectedTable.getBoundingClientRect();
    
    setRect({
      top: tableRect.top + window.scrollY,
      left: tableRect.left + window.scrollX,
      width: tableRect.width,
      height: tableRect.height,
    });
  }, [selectedTable]);

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const table = target.closest('table');
      if (table) {
        setSelectedTable(table);
      } else if (!target.closest('.tbl-overlay-container')) {
        setSelectedTable(null);
        setRect(null);
      }
    };

    container.addEventListener('mousedown', handleClick);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true); // 스크롤 시 위치 동기화
    
    return () => {
      container.removeEventListener('mousedown', handleClick);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [editorContainerRef, updateRect]);

  useEffect(() => {
    if (selectedTable) {
      updateRect();
      const interval = setInterval(updateRect, 30); // 부드러운 추적
      return () => clearInterval(interval);
    }
  }, [selectedTable, updateRect]);

  // ── 드래그 이동 핸들러 ──
  const onMoveStart = (e: React.MouseEvent) => {
    if (!selectedTable || !rect) return;
    e.stopPropagation();
    setIsDragging(true);
    
    const style = window.getComputedStyle(selectedTable);
    const top = parseInt(style.top) || 0;
    const left = parseInt(style.left) || 0;

    startPos.current = { x: e.clientX, y: e.clientY, top, left, width: rect.width, height: rect.height };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!editorContainerRef.current) return;
      const editorRect = editorContainerRef.current.getBoundingClientRect();
      const dx = moveEvent.clientX - startPos.current.x;
      const dy = moveEvent.clientY - startPos.current.y;
      
      if (selectedTable.style.position !== 'relative' && selectedTable.style.position !== 'absolute') {
        selectedTable.style.position = 'relative';
      }
      
      // 이동 범위 제한 (용지 안에서만)
      const tableRect = selectedTable.getBoundingClientRect();
      let newLeft = startPos.current.left + dx;
      let newTop = startPos.current.top + dy;
      
      // 부모 컨테이너(RoosterEditor) 기준 경계 체크
      // tableRect.width 등은 렌더링 결과이므로 드래그 중 실시간으로 체크
      const parentWidth = editorContainerRef.current.clientWidth;
      const parentHeight = editorContainerRef.current.clientHeight;
      
      // 수평 제한
      if (newLeft < 0) newLeft = 0;
      if (newLeft + tableRect.width > parentWidth) newLeft = parentWidth - tableRect.width;
      
      // 수직 제한
      // (용지 높이는 Pagination에 의해 늘어나므로 밑으로는 여유가 있을 수 있음)
      if (newTop < -30) newTop = -30; // 약간의 위쪽 여유
      
      selectedTable.style.top = `${newTop}px`;
      selectedTable.style.left = `${newLeft}px`;
      updateRect();
    };

    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // ── 리사이즈 핸들러 ──
  const onResizeStart = (e: React.MouseEvent, handle: string) => {
    if (!selectedTable || !rect) return;
    e.stopPropagation();
    setIsResizing(handle);
    
    startPos.current = { 
      x: e.clientX, y: e.clientY, 
      top: rect.top, left: rect.left, 
      width: rect.width, height: rect.height 
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!editorContainerRef.current) return;
      const parentWidth = editorContainerRef.current.clientWidth;
      const dx = moveEvent.clientX - startPos.current.x;
      const dy = moveEvent.clientY - startPos.current.y;
      
      if (handle.includes('e')) {
        const newWidth = Math.min(parentWidth - (selectedTable.offsetLeft || 0), startPos.current.width + dx);
        selectedTable.style.width = `${Math.max(10, newWidth)}px`;
      }
      if (handle.includes('s')) {
        // 테이블 높이 조절: 직접 style.height 주입
        const newHeight = Math.max(10, startPos.current.height + dy);
        selectedTable.style.height = `${newHeight}px`;
        // 표 안의 행들이 높이에 맞춰 늘어나도록 강제 (한글 스타일)
        if (selectedTable.style.height) {
           selectedTable.style.display = 'table'; // inline-table인 경우 높이 오동작 방지
        }
      }
      if (handle.includes('w')) {
        const maxDecrease = selectedTable.offsetLeft || 0;
        const actualDx = Math.max(-maxDecrease, dx);
        selectedTable.style.width = `${Math.max(10, startPos.current.width - actualDx)}px`;
      }
      updateRect();
    };

    const onMouseUp = () => {
      setIsResizing(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      // 스냅샷 촬영 (RoosterJS)
      try {
        (window as any).roosterEditorInstance?.takeSnapshot();
      } catch {}
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  if (!selectedTable || !rect) return null;

  return createPortal(
    <div 
      className={`tbl-overlay-container ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{
        position: 'absolute', // body 기준 absolute
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        pointerEvents: 'none',
        zIndex: 50000, // 최상단
      }}
    >
      <div className="tbl-overlay-border" />
      <div className="tbl-move-bar top" onMouseDown={onMoveStart} title="드래그하여 이동" />
      <div className="tbl-move-bar bottom" onMouseDown={onMoveStart} />
      <div className="tbl-move-bar left" onMouseDown={onMoveStart} />
      <div className="tbl-move-bar right" onMouseDown={onMoveStart} />

      <div className="tbl-handle nw" onMouseDown={e => onResizeStart(e, 'nw')} />
      <div className="tbl-handle n"  onMouseDown={e => onResizeStart(e, 'n')} />
      <div className="tbl-handle ne" onMouseDown={e => onResizeStart(e, 'ne')} />
      <div className="tbl-handle e"  onMouseDown={e => onResizeStart(e, 'e')} />
      <div className="tbl-handle se" onMouseDown={e => onResizeStart(e, 'se')} />
      <div className="tbl-handle s"  onMouseDown={e => onResizeStart(e, 's')} />
      <div className="tbl-handle sw" onMouseDown={e => onResizeStart(e, 'sw')} />
      <div className="tbl-handle w"  onMouseDown={e => onResizeStart(e, 'w')} />
    </div>,
    document.body
  );
}

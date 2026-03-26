import React, { useState, useEffect, useRef, useCallback } from 'react';
import { mmToPx } from './utils/TableUtils';
import './VerticalRuler.css';

interface VerticalRulerProps {
  editor: any | null; // IEditor
}

/**
 * 전교조 스타일 수직 눈금자 (Vertical Ruler)
 * 용지의 수직 위치를 추적하여 마커와 눈금을 표시합니다.
 */
const VerticalRuler: React.FC<VerticalRulerProps> = ({ editor }) => {
  const [markers, setMarkers] = useState<{ y: number; rowIndex: number }[]>([]);
  const [paperInfo, setPaperInfo] = useState<{ top: number; height: number } | null>(null);
  const [tableInfo, setTableInfo] = useState<{ top: number; height: number } | null>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  const updateLayout = useCallback(() => {
    const paper = document.querySelector('.sc-editor-root') as HTMLElement;
    const selectedTable = document.querySelector('.sc-selected-table') as HTMLTableElement;
    const ruler = rulerRef.current;
    
    if (!paper || !ruler) return;

    const pRect = paper.getBoundingClientRect();
    const rRect = ruler.getBoundingClientRect();
    
    // 용지 수직 위치 설정
    setPaperInfo({
      top: pRect.top - rRect.top,
      height: pRect.height
    });

    if (selectedTable) {
      const tRect = selectedTable.getBoundingClientRect();
      const rows = Array.from(selectedTable.rows);
      
      setTableInfo({
        top: tRect.top - rRect.top,
        height: tRect.height
      });

      let currentY = tRect.top - rRect.top;
      const newMarkers = rows.map((row, idx) => {
        const h = parseFloat(getComputedStyle(row).height);
        currentY += h;
        return { y: currentY, rowIndex: idx };
      });
      setMarkers(newMarkers);
    } else {
      setTableInfo(null);
      setMarkers([]);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(updateLayout, 100);
    window.addEventListener('scroll', updateLayout, true);
    return () => {
      clearInterval(interval);
      window.removeEventListener('scroll', updateLayout, true);
    };
  }, [updateLayout]);

  const renderTicks = () => {
    if (!paperInfo) return null;
    const ticks = [];
    const pageMm = 297; // A4 height

    for (let i = 0; i <= pageMm; i += 5) {
      // 20mm 상단/하단 여백 구분
      const isMargin = i < 20 || i > (pageMm - 20);
      ticks.push(
        <div 
          key={i} 
          className={`v-ruler-tick ${i % 10 === 0 ? 'major' : 'minor'} ${isMargin ? 'margin' : ''}`} 
          style={{ top: `${paperInfo.top + mmToPx(i)}px` }}
        >
          {i % 10 === 0 && <span className="v-tick-label">{i / 10}</span>}
        </div>
      );
    }
    return ticks;
  };

  return (
    <div className="sc-vertical-ruler" ref={rulerRef}>
      {paperInfo && (
        <div className="v-ruler-bg-container" style={{ top: paperInfo.top, height: paperInfo.height }}>
          <div className="v-ruler-bg-margin top" style={{ height: mmToPx(20) }} />
          <div className="v-ruler-bg-content" />
          <div className="v-ruler-bg-margin bottom" style={{ height: mmToPx(20) }} />
          
          {tableInfo && (
            <div 
              className="v-ruler-table-zone" 
              style={{ top: tableInfo.top - paperInfo.top, height: tableInfo.height }} 
            />
          )}
        </div>
      )}

      <div className="v-ruler-ticks-layer">
        {renderTicks()}
        {markers.map((m, i) => (
          <div 
            key={i} 
            className="v-ruler-marker"
            style={{ top: m.y }}
          >
            <div className="v-marker-handle" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default VerticalRuler;

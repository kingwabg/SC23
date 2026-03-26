import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IEditor } from 'roosterjs-content-model-types';
import { mmToPx } from './utils/TableUtils';
import './TableRuler.css';

interface RulerProps {
  editor: IEditor | null;
}

/**
 * 📐 고정밀 워드 프로세서 눈금자 (TableRuler)
 * 용지의 여백과 편집 영역을 시각적으로 완벽하게 분리하여 표시합니다.
 */
const TableRuler: React.FC<RulerProps> = ({ editor }) => {
  const [markers, setMarkers] = useState<{ x: number; colIndex: number }[]>([]);
  const [paperInfo, setPaperInfo] = useState<{ left: number; width: number } | null>(null);
  const [tableInfo, setTableInfo] = useState<{ left: number; width: number } | null>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  // 1. 용지 및 표 위치 실시간 추적 (모든 좌표는 눈금자 기준 상대 좌표로 변환)
  const updateLayout = useCallback(() => {
    const paper = document.querySelector('.sc-editor-root') as HTMLElement;
    const selectedTable = document.querySelector('.sc-selected-table') as HTMLTableElement;
    const ruler = rulerRef.current;
    
    if (!paper || !ruler) return;

    const pRect = paper.getBoundingClientRect();
    const rRect = ruler.getBoundingClientRect();
    
    // 용지 영역 설정
    setPaperInfo({
      left: pRect.left - rRect.left,
      width: pRect.width
    });

    // 선택된 표 영역 및 마커 설정
    if (selectedTable) {
      const tRect = selectedTable.getBoundingClientRect();
      const cols = Array.from(selectedTable.querySelectorAll('colgroup col'));
      
      setTableInfo({
        left: tRect.left - rRect.left,
        width: tRect.width
      });

      let currentX = tRect.left - rRect.left;
      const newMarkers = cols.map((col, idx) => {
        const w = parseFloat(getComputedStyle(col).width);
        currentX += w;
        return { x: currentX, colIndex: idx };
      });
      setMarkers(newMarkers);
    } else {
      setTableInfo(null);
      setMarkers([]);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(updateLayout, 100);
    window.addEventListener('resize', updateLayout);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateLayout);
    };
  }, [updateLayout]);

  // 2. 눈금 및 라벨 렌더링
  const renderTicks = () => {
    if (!paperInfo) return null;
    const ticks = [];
    const marginMm = 20; // 20mm 기본 여백
    const pageMm = 210;

    for (let i = 0; i <= pageMm; i += 5) {
      const isMargin = i < marginMm || i > (pageMm - marginMm);
      ticks.push(
        <div 
          key={i} 
          className={`ruler-tick ${i % 10 === 0 ? 'major' : 'minor'} ${isMargin ? 'margin' : ''}`} 
          style={{ left: `${paperInfo.left + mmToPx(i)}px` }}
        >
          {i % 10 === 0 && <span className="tick-label">{i / 10}</span>}
        </div>
      );
    }
    return ticks;
  };

  return (
    <div className="sc-table-ruler" ref={rulerRef}>
      {paperInfo && (
        <div className="ruler-bg-container" style={{ left: paperInfo.left, width: paperInfo.width }}>
          {/* 용지 배경 구분: 여백(grey) vs 본문(white) */}
          <div className="ruler-bg-margin left" style={{ width: mmToPx(20) }} />
          <div className="ruler-bg-content" />
          <div className="ruler-bg-margin right" style={{ width: mmToPx(20) }} />
          
          {/* 표 활성 구역 하이라이트 */}
          {tableInfo && (
            <div 
              className="ruler-table-zone" 
              style={{ left: tableInfo.left - paperInfo.left, width: tableInfo.width }} 
            />
          )}
        </div>
      )}

      <div className="ruler-ticks-layer">
        {renderTicks()}
        {markers.map((m, i) => (
          <div 
            key={i} 
            className="ruler-marker"
            style={{ left: m.x }}
          >
            <div className="marker-handle" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableRuler;

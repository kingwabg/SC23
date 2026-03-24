import React, { useState, useRef, useEffect } from 'react';
import type { IEditor } from 'roosterjs-content-model-types';
import RoosterEditor from './RoosterEditor';
import RoosterToolbar from './RoosterToolbar';
import TableOverlay from './TableOverlay';
import TableContextMenu from './TableContextMenu';
import './RoosterApp.css';

export interface RoosterAppProps {
  initialHtml?: string;
  onChangeHtml?: (html: string) => void;
}

export default function RoosterApp({ initialHtml, onChangeHtml }: RoosterAppProps) {
  const editorRef = useRef<IEditor | null>(null);
  const contentDivRef = useRef<HTMLDivElement | null>(null);
  const [margins, setMargins] = useState({ top: 20, bottom: 20, left: 25, right: 25 }); // mm 단위

  return (
    <div className="relative flex flex-col min-h-full items-center">
      {/* Full-width Hancom-style Ribbon Toolbar */}
      <div className="sticky top-0 z-50 w-full border-b border-slate-300 shadow-sm bg-white">
        <RoosterToolbar editorRef={editorRef} margins={margins} setMargins={setMargins} />
      </div>

      {/* A4 Paper Editor */}
      <div 
        className="bg-white ring-1 ring-slate-900/5 shadow-2xl shadow-indigo-900/10 rounded-xl relative mt-8"
        style={{ 
          width: '21cm', 
          minHeight: '29.7cm', 
          padding: `var(--m-top) var(--m-right) var(--m-bottom) var(--m-left)`,
          marginBottom: '4rem',
          transition: 'padding 0.2s',
          '--m-top': `${margins.top}mm`,
          '--m-bottom': `${margins.bottom}mm`,
          '--m-left': `${margins.left}mm`,
          '--m-right': `${margins.right}mm`,
        } as React.CSSProperties}
      >
        <RoosterEditor
          initialHtml={initialHtml}
          onChangeHtml={onChangeHtml}
          editorInstanceRef={editorRef}
          contentDivRef={contentDivRef}
        />
        {/* 표 클릭 시 이동 오버레이 */}
        <TableOverlay editorContainerRef={contentDivRef} />
        {/* 표 우클릭 컨텍스트 메뉴 */}
        <TableContextMenu editorContainerRef={contentDivRef} editorRef={editorRef} />

        {/* Margin Guide Lines (한글 HWP 스타일 여백 가이드라인 - 모서리만 표시) */}
        <div 
          className="absolute pointer-events-none transition-all duration-200 z-10"
          style={{
            top: `${margins.top}mm`,
            bottom: `${margins.bottom}mm`,
            left: `${margins.left}mm`,
            right: `${margins.right}mm`,
            background: `
              linear-gradient(to right, #cbd5e1 1px, transparent 1px) 0 0,
              linear-gradient(to bottom, #cbd5e1 1px, transparent 1px) 0 0,
              linear-gradient(to left, #cbd5e1 1px, transparent 1px) 100% 0,
              linear-gradient(to bottom, #cbd5e1 1px, transparent 1px) 100% 0,
              linear-gradient(to right, #cbd5e1 1px, transparent 1px) 0 100%,
              linear-gradient(to top, #cbd5e1 1px, transparent 1px) 0 100%,
              linear-gradient(to left, #cbd5e1 1px, transparent 1px) 100% 100%,
              linear-gradient(to top, #cbd5e1 1px, transparent 1px) 100% 100%
            `,
            backgroundSize: '10px 10px',
            backgroundRepeat: 'no-repeat'
          }}
        />
      </div>

      {/* 페이지네이션 보정 엔진: 삽입된 쪽 나누기(<hr class="page-break-gap">)의 margin-top을 물리적 A4 배수에 맞게 주기적으로 재계산합니다. */}
      {/* RoosterJS가 inline-style을 날려버리는 것을 방지하고, 에디팅 중에도 종이가 항상 297mm 단위로 갈라지게 만듭니다. */}
      <PaginationEngine editorRef={editorRef} />
    </div>
  );
}

// 자동 쪽 나누기 보정 엔진
function PaginationEngine({ editorRef }: { editorRef: React.RefObject<any> }) {
  useEffect(() => {
    let animationFrameId: number;
    let lastHeights = '';

    const recalculatePageBreaks = () => {
      const editorDiv = editorRef.current?.getDocument()?.body;
      const paperDiv = document.querySelector('.rooster-paper') as HTMLElement;
      if (!editorDiv || !paperDiv) return;

      const gaps = editorDiv.querySelectorAll('hr.page-break-gap') as NodeListOf<HTMLElement>;
      if (gaps.length === 0) return;

      const mBottomMm = parseFloat(paperDiv.style.getPropertyValue('--m-bottom')) || 0;
      const mBottomPx = mBottomMm * 3.7795; // mm to px

      // A4 용지 1장의 정확한 픽셀 단위 높이 (297mm)
      const A4_HEIGHT_PX = 1122.52; 

      const paperRect = paperDiv.getBoundingClientRect();
      let heightsChanged = false;
      let newHeights = '';

      gaps.forEach((gap, index) => {
        // 원래 margin-top을 제거한 상태에서의 Y좌표 측정
        const currentMargin = gap.style.getPropertyValue('margin-top');
        gap.style.setProperty('margin-top', '0px', 'important');
        
        const gapRect = gap.getBoundingClientRect();
        const absoluteY = gapRect.top - paperRect.top;
        
        // 현재 Y위치가 어느 페이지의 몇 픽셀인지 (해당 A4 높이의 나머지)
        const offsetInPage = absoluteY % A4_HEIGHT_PX;
        
        // 다음 페이지 선까지 남은 여백 계산 (이전 페이지 빈공간)
        let neededSpace = A4_HEIGHT_PX - offsetInPage;
        if (neededSpace > A4_HEIGHT_PX - 20) neededSpace = A4_HEIGHT_PX; // 너무 작으면 다음 장으로

        // 대상 좌표를 정확히 물리적 A4 끝자락(배수)에 맞춤
        const targetMargin = `${neededSpace}px`;
        gap.style.setProperty('margin-top', targetMargin, 'important');
        
        newHeights += `${targetMargin},`;
      });

      if (lastHeights !== newHeights) {
        lastHeights = newHeights;
      }
    };

    // DOM 변화 감지하여 즉시 재계산 (글씨 칠 때마다 실시간 위치 반영)
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(recalculatePageBreaks);
    });

    const body = editorRef.current?.getDocument()?.body;
    if (body) {
      observer.observe(body, { childList: true, subtree: true, characterData: true });
      recalculatePageBreaks(); // 초기 계산
    } else {
      setTimeout(recalculatePageBreaks, 500);
    }

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [editorRef]);

  return null;
}

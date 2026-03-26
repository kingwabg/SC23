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
    <div className="sc-app-outer-shell" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#cbd5e1', overflow: 'hidden' }}>
      {/* 🚀 상단 리본 메뉴 (고정 - 최우선 순위 부여) */}
      <div className="sc-app-toolbar-fixed" style={{ flexShrink: 0, zIndex: 2000, borderBottom: '1px solid #cbd5e1', backgroundColor: 'white' }}>
        <RoosterToolbar editorRef={editorRef} margins={margins} setMargins={setMargins} />
      </div>

      {/* 📄 한컴/구글독스 스타일 워크스페이스 (에디터가 전체 통제) */}
      <div className="sc-app-editor-full" style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <RoosterEditor
          initialHtml={initialHtml}
          onChangeHtml={onChangeHtml}
          editorInstanceRef={editorRef}
          contentDivRef={contentDivRef}
          margins={margins}
        />
        
        {/* 오버레이 유틸리티: 에디터와 한 몸으로 작동 */}
        <TableOverlay editorContainerRef={contentDivRef} />
        <TableContextMenu editorContainerRef={contentDivRef} editorRef={editorRef} />
        <PaginationEngine editorRef={editorRef} />
      </div>
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
      const paperDiv = document.querySelector('.sc-editor-root') as HTMLElement;
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

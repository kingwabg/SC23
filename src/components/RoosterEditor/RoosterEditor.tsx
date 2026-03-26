import React, { useEffect, useRef, useCallback } from 'react';
import { createEditor } from 'roosterjs';
import { 
  undo, 
  redo, 
} from 'roosterjs-content-model-core';
import {
  AutoFormatPlugin,
  EditPlugin,
  PastePlugin,
  ShortcutPlugin,
  HyperlinkPlugin,
  ImageEditPlugin,
} from 'roosterjs-content-model-plugins';
import type { IEditor } from 'roosterjs-content-model-types';
import { ScTablePlugin } from './plugins/ScTablePlugin';
import TableQuickAdd from './TableQuickAdd';
import TableRuler from './TableRuler';
import VerticalRuler from './VerticalRuler';
import './RoosterEditor.css';

/**
 * HWP 스타일의 고성능 한글 에디터 (RoosterJS 기반)
 * 리포지토리: https://github.com/microsoft/roosterjs
 */
export interface RoosterEditorProps {
  initialHtml?: string;
  onChangeHtml?: (html: string) => void;
  placeholder?: string;
  editorInstanceRef?: React.MutableRefObject<IEditor | null>;
  contentDivRef?: React.MutableRefObject<HTMLDivElement | null>;
  margins?: { top: number; bottom: number; left: number; right: number };
}

export default function RoosterEditor({
  initialHtml,
  onChangeHtml,
  placeholder = '내용을 입력하세요...',
  editorInstanceRef,
  contentDivRef,
  margins = { top: 20, bottom: 20, left: 25, right: 25 }, // 기본 한글 여백
}: RoosterEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<IEditor | null>(null);

  // 컨테이너 DOM 연결 및 상위로 노출
  const resolvedRef = useCallback((el: HTMLDivElement | null) => {
    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (contentDivRef) contentDivRef.current = el;
  }, [contentDivRef]);

  useEffect(() => {
    if (!containerRef.current) return;

    // 🚀 프로덕션급 테이블 플러그인 주입
    // 리사이즈 가이드, <colgroup> 제어, 디바운스된 HTML 출력을 모두 플러그인이 담당
    const tablePlugin = new ScTablePlugin((html) => {
      onChangeHtml?.(html);
    });

    const plugins = [
      tablePlugin,
      new EditPlugin(),
      new PastePlugin(),
      new AutoFormatPlugin(),
      new ShortcutPlugin(),
      new HyperlinkPlugin(),
      new ImageEditPlugin(),
    ];

    const initialContent = initialHtml || '';
    if (containerRef.current.innerHTML !== initialContent) {
      containerRef.current.innerHTML = initialContent;
    }
    const editor = createEditor(containerRef.current, plugins);

    editorRef.current = editor;
    if (editorInstanceRef) editorInstanceRef.current = editor;

    // 전역 단축키 (Undo/Redo)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(editor); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(editor); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      editor.dispose();
      editorRef.current = null;
    };
  }, [editorInstanceRef]);

  return (
    <div className="sc-editor-shell" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: '#cbd5e1', overflow: 'hidden', position: 'relative' }}>
      
      {/* 📏 상단 가로 눈금자 (고정 바) */}
      <div className="sc-ruler-top-bar" style={{ height: '32px', backgroundColor: '#f8fafc', borderBottom: '1px solid #94a3b8', flexShrink: 0, position: 'relative', zIndex: 1000 }}>
        <TableRuler editor={editorRef.current} />
      </div>

      <div className="sc-editor-main-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* 📄 에디터 및 종이 영역 통합 스크롤 (화면상 절대 중앙 정착 시스템) */}
        <div className="sc-editor-scroll-well" style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#e2e8f0',
          position: 'relative'
        }}>
          {/* 브라우저 화면 전체의 수평 중심을 잡는 정밀 레이어 */}
          <div className="sc-paper-centrator" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 'fit-content', // 종이가 화면보다 클 때를 대비
            width: '100%',
            padding: '40px 0',
            boxSizing: 'border-box'
          }}>
            {/* 📏 수직 눈금자 + 종이 일체형 블록 (워드/한글 표준 레이아웃) */}
            <div className="sc-unified-paper-block" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>

              {/* 📏 종이 옆에 찰떡같이 붙은 수직 눈금자 */}
              <div className="sc-ruler-left-attached" style={{ width: '40px', flexShrink: 0, position: 'sticky', top: 0 }}>
                <VerticalRuler editor={editorRef.current} />
              </div>

              {/* 🚀 에디터 본체 = A4 용지 */}
              <div
                ref={resolvedRef}
                className="rooster-content sc-editor-root"
                contentEditable
                suppressContentEditableWarning
                data-placeholder={placeholder}
                style={{
                  width: '210mm',
                  maxWidth: '210mm',
                  minHeight: '297mm',
                  backgroundColor: 'white',
                  boxShadow: '0 10px 35px rgba(0,0,0,0.12)',
                  padding: `${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm`,
                  boxSizing: 'border-box',
                  outline: 'none',
                  position: 'relative',
                  flexShrink: 0,
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                  overflowX: 'hidden'
                }}
              >
                <TableQuickAdd editor={editorRef.current} editorContainer={containerRef.current} />
                <div id="sc-table-guide" className="sc-resize-guide" />
              </div>
            </div>

            {/* 하단 여유 공간 */}
            <div style={{ height: '60px', flexShrink: 0 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

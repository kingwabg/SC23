import React, { useEffect, useRef, useCallback } from 'react';
import { createEditor } from 'roosterjs';
import { undo, redo } from 'roosterjs-content-model-core';
import {
  AutoFormatPlugin,
  EditPlugin,
  PastePlugin,
  ShortcutPlugin,
  TableEditPlugin,
  HyperlinkPlugin,
  ImageEditPlugin,
} from 'roosterjs-content-model-plugins';
import type { IEditor } from 'roosterjs-content-model-types';
import './RoosterEditor.css';

export interface RoosterEditorProps {
  initialHtml?: string;
  onChangeHtml?: (html: string) => void;
  placeholder?: string;
  editorInstanceRef?: React.MutableRefObject<IEditor | null>;
  contentDivRef?: React.MutableRefObject<HTMLDivElement | null>;
}

export default function RoosterEditor({
  initialHtml,
  onChangeHtml,
  placeholder = '내용을 입력하세요...',
  editorInstanceRef,
  contentDivRef,
}: RoosterEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 외부에서 contentDivRef로도 접근 가능하게
  const resolvedRef = useCallback((el: HTMLDivElement | null) => {
    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (contentDivRef) contentDivRef.current = el;
  }, [contentDivRef]);
  const editorRef = useRef<IEditor | null>(null);
  const onChangeRef = useRef(onChangeHtml);
  onChangeRef.current = onChangeHtml;

  useEffect(() => {
    if (!containerRef.current) return;

    const plugins = [
      {
        getName: () => 'ScTableSanitizerPlugin',
        initialize: () => {},
        dispose: () => {},
        onPluginEvent: (event: any) => {
          // PluginEventType.BeforePaste === 0
          if (event.eventType === 0 && event.fragment) {
            event.fragment.querySelectorAll('table').forEach((table: HTMLElement) => {
              if (!table.classList.contains('sc-table-standard')) {
                table.classList.add('sc-table-standard');
                table.style.width = '100%';
                table.style.borderCollapse = 'collapse';
                table.style.border = '2px solid #94a3b8';
                table.style.marginTop = '16px';
                table.style.marginBottom = '16px';
                table.style.tableLayout = '';
                
                table.querySelectorAll('tr, td, th').forEach((cellNode: any) => {
                  const cell = cellNode as HTMLElement;
                  cell.style.width = '';
                  cell.style.height = '';
                  cell.style.border = '1px solid #cbd5e1';
                  cell.style.padding = '8px 12px';
                  cell.style.boxSizing = 'border-box';
                  cell.style.verticalAlign = 'middle';
                  
                  const tagName = cell.tagName.toLowerCase();
                  if (tagName === 'th') {
                    cell.style.backgroundColor = '#f8f9fa';
                    cell.style.fontWeight = 'bold';
                    cell.style.textAlign = 'center';
                  } else if (tagName === 'td') {
                    if (cell.style.backgroundColor) cell.style.backgroundColor = ''; 
                  }
                });
              }
            });
          }
        }
      },
      new EditPlugin(),
      new PastePlugin(),
      new AutoFormatPlugin({
        autoBullet: true,
        autoNumbering: true,
        autoLink: true,
        autoUnlink: false,
        autoHyphen: true,
        autoFraction: false,
        autoOrdinals: false,
      }),
      new ShortcutPlugin(),
      new TableEditPlugin(),        // 표 셀 리사이즈, 행/열 추가/삭제 내장
      new HyperlinkPlugin(),         // 링크 클릭 시 팝업
      new ImageEditPlugin({          // 이미지 리사이즈, 회전 내장
        minWidth: 20,
        minHeight: 20,
        preserveRatio: false,
        disableRotate: false,
        disableSideResize: false,
      }),
    ];

    const editor = createEditor(containerRef.current, plugins);
    editorRef.current = editor;
    if (editorInstanceRef) editorInstanceRef.current = editor;

    // 초기 HTML 삽입
    if (initialHtml) {
      try {
        if (typeof (editor as any).setContent === 'function') {
          (editor as any).setContent(initialHtml);
        } else {
          containerRef.current.innerHTML = initialHtml;
        }
      } catch {
        if (containerRef.current) containerRef.current.innerHTML = initialHtml;
      }
    }

    // 단축키 지원 (Undo/Redo)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo(editor);
          } else {
            undo(editor);
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          redo(editor);
        }
      }
    };
    containerRef.current.addEventListener('keydown', handleKeyDown);

    // 변경사항 상위 컴포넌트로 전달 (DOM Mutation 기반 감지)
    const handleMutation = () => {
      if (!containerRef.current || !onChangeRef.current) return;
      onChangeRef.current(containerRef.current.innerHTML);
    };

    // input 이벤트는 텍스트 입력만 감지하지만, MutationObserver는 툴바에 의한 스타일 변경/표 삽입 등을 모두 감지합니다.
    const observer = new MutationObserver((mutations) => {
      // 불필요한 연속 렌더링 방지를 위해 가벼운 디바운스 처리 (선택사항) 또는 즉시 반영
      handleMutation();
    });

    observer.observe(containerRef.current, { childList: true, subtree: true, characterData: true, attributes: true });
    
    return () => {
      observer.disconnect();
      if (containerRef.current) {
        containerRef.current.removeEventListener('keydown', handleKeyDown);
      }
      editor.dispose();
      editorRef.current = null;
      if (editorInstanceRef) editorInstanceRef.current = null;
    };
  }, []);

  const prevHtmlRef = useRef(initialHtml);
  useEffect(() => {
    if (!containerRef.current || !editorRef.current) return;
    if (initialHtml === prevHtmlRef.current) return;
    prevHtmlRef.current = initialHtml;
    containerRef.current.innerHTML = initialHtml ?? '';
  }, [initialHtml]);

  return (
    <div className="rooster-wrapper">
      <div
        ref={resolvedRef}
        className="rooster-content"
        data-placeholder={placeholder}
        contentEditable
        suppressContentEditableWarning
      />
    </div>
  );
}

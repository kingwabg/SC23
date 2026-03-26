import React, { useCallback, useRef, useState } from 'react';
import type { IEditor } from 'roosterjs-content-model-types';
import {
  toggleBold,
  toggleItalic,
  toggleUnderline,
  toggleStrikethrough,
  toggleSuperscript,
  toggleSubscript,
  setAlignment,
  setFontSize,
  setFontName,
  setTextColor,
  setBackgroundColor,
  toggleBullet,
  toggleNumbering,
  setIndentation,
  toggleBlockQuote,
  insertTable,
  insertImage,
  insertLink,
  removeLink,
  clearFormat,
  getFormatState,
  changeFontSize,
  setHeadingLevel,
} from 'roosterjs-content-model-api';
import {
  Undo2, Redo2, Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, IndentDecrease, IndentIncrease,
  Quote, Table, Image as ImageIcon, Link2, Link2Off,
  Eraser, Scissors, Subscript, Superscript
} from 'lucide-react';
import './RoosterToolbar.css';

interface Margins { top: number; bottom: number; left: number; right: number; }

interface Props {
  editorRef: React.RefObject<IEditor | null>;
  margins: Margins;
  setMargins: React.Dispatch<React.SetStateAction<Margins>>;
}

const FONTS = ['Arial', 'Malgun Gothic', 'Noto Sans KR', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];
const SIZES = ['9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '72'];
const HEADINGS: { label: string; level: 0 | 1 | 2 | 3 | 4 | 5 | 6 }[] = [
  { label: '본문', level: 0 },
  { label: '제목 1', level: 1 },
  { label: '제목 2', level: 2 },
  { label: '제목 3', level: 3 },
  { label: '제목 4', level: 4 },
];

// 표 삽입 그리드 팝업
function TableGridPicker({ onSelect, onClose }: { onSelect: (r: number, c: number) => void; onClose: () => void }) {
  const [hover, setHover] = useState({ r: 0, c: 0 });
  const MAX = 8;
  return (
    <div className="tb-table-picker" onMouseLeave={onClose}>
      <div className="tb-table-grid">
        {Array.from({ length: MAX }).map((_, r) =>
          Array.from({ length: MAX }).map((_, c) => (
            <div
              key={`${r}-${c}`}
              className={`tb-table-cell ${r <= hover.r && c <= hover.c ? 'active' : ''}`}
              onMouseEnter={() => setHover({ r, c })}
              onClick={() => { onSelect(r + 1, c + 1); onClose(); }}
            />
          ))
        )}
      </div>
      <div className="tb-table-size">{hover.r + 1} × {hover.c + 1}</div>
    </div>
  );
}

// 여백 설정 팝업 (강화된 미리보기 기능)
function MarginPickerPopup({ margins, onSave, onClose }: { margins: Margins, onSave: (m: Margins) => void; onClose: () => void }) {
  const [m, setM] = useState(margins);
  
  // 미니 A4 용지 비율 계산 (가로 210mm, 세로 297mm)
  const previewWidth = 84; 
  const scale = previewWidth / 210;
  const previewHeight = 297 * scale; // 118.8px

  // 값이 바뀔 때마다 본문(에디터) 쪽에도 살짝씩 미리 반응하게 하려면 onSave를 즉시 호출하면 되지만
  // 취소도 고려하여 '적용' 버튼 누를 때만 onSave(m) 되게 합니다.

  return (
    <div className="tb-table-picker flex flex-col gap-3" style={{ padding: '16px', width: '310px', zIndex: 1000 }} onMouseLeave={onClose}>
      <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>용지 여백 설정 (mm)</h4>
      
      <div className="flex justify-between items-center gap-4">
        {/* 좌측: 직접 입력 필드 */}
        <div className="flex flex-col gap-2 w-[140px]">
          <label className="flex justify-between items-center text-[12px] text-slate-700">
            상단 (위) 
            <input type="number" value={m.top} onChange={e => setM({...m, top: Number(e.target.value)})} className="w-[50px] px-1 py-0.5 border border-slate-300 rounded text-right focus:border-blue-500 focus:outline-none"/>
          </label>
          <label className="flex justify-between items-center text-[12px] text-slate-700">
            하단 (아래)
            <input type="number" value={m.bottom} onChange={e => setM({...m, bottom: Number(e.target.value)})} className="w-[50px] px-1 py-0.5 border border-slate-300 rounded text-right focus:border-blue-500 focus:outline-none"/>
          </label>
          <label className="flex justify-between items-center text-[12px] text-slate-700">
            좌측 (왼쪽)
            <input type="number" value={m.left} onChange={e => setM({...m, left: Number(e.target.value)})} className="w-[50px] px-1 py-0.5 border border-slate-300 rounded text-right focus:border-blue-500 focus:outline-none"/>
          </label>
          <label className="flex justify-between items-center text-[12px] text-slate-700">
            우측 (오오)
            <input type="number" value={m.right} onChange={e => setM({...m, right: Number(e.target.value)})} className="w-[50px] px-1 py-0.5 border border-slate-300 rounded text-right focus:border-blue-500 focus:outline-none"/>
          </label>
        </div>

        {/* 우측: 직관적 미니 A4 미리보기 */}
        <div className="flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-200 rounded">
          <div style={{
            width: `${previewWidth}px`,
            height: `${previewHeight}px`,
            backgroundColor: 'white',
            border: '1px solid #94a3b8',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            position: 'relative',
          }}>
            {/* 텍스트 본문 영역 (여백 만큼 들어간 영역) */}
            <div style={{
              position: 'absolute',
              top: `${m.top * scale}px`,
              bottom: `${m.bottom * scale}px`,
              left: `${m.left * scale}px`,
              right: `${m.right * scale}px`,
              backgroundColor: '#eff6ff',
              border: '1px dashed #3b82f6',
              display: 'flex',
              flexDirection: 'column',
              padding: '4px',
              gap: '2px',
              overflow: 'hidden'
            }}>
              {/* 가상의 글자 줄 (디자인 요소) */}
              <div className="w-full h-[3px] bg-blue-300 rounded-full opacity-50"></div>
              <div className="w-5/6 h-[3px] bg-blue-300 rounded-full opacity-50"></div>
              <div className="w-full h-[3px] bg-blue-300 rounded-full opacity-50"></div>
              <div className="w-4/6 h-[3px] bg-blue-300 rounded-full opacity-50"></div>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-2">미리보기</span>
        </div>
      </div>

      <div className="flex gap-2 w-full mt-1">
        <button onClick={onClose} className="flex-1 py-1.5 bg-slate-100 text-slate-600 border border-slate-300 rounded text-[12px] font-bold hover:bg-slate-200">취소</button>
        <button onClick={() => { onSave(m); onClose(); }} className="flex-1 py-1.5 bg-blue-600 text-white rounded text-[12px] font-bold hover:bg-blue-700 shadow-sm">확인 (적용)</button>
      </div>
    </div>
  );
}

export default function RoosterToolbar({ editorRef, margins, setMargins }: Props) {
  const [activeTab, setActiveTab] = useState('입력');
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showMarginPicker, setShowMarginPicker] = useState(false);
  const fontColorRef = useRef<HTMLInputElement>(null);
  const bgColorRef = useRef<HTMLInputElement>(null);

  const cmd = useCallback(<T extends unknown[]>(fn: (editor: IEditor, ...args: T) => void, ...args: T) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    fn(editor, ...args);
  }, [editorRef]);

  const handleInsertTable = (rows: number, cols: number) => {
    cmd(insertTable, cols, rows, {
      borderColor: '#555',
      hasHeaderRow: false,
      hasFirstColumn: false,
      tableStyleName: 'Default',
    });
  };

  const handleResizeTable = (type: 'width' | 'height', delta: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const cell = window.getSelection()?.anchorNode?.parentElement?.closest('td, th') as HTMLElement;
    if (cell) {
      const cur = type === 'width' ? cell.offsetWidth : cell.offsetHeight;
      cell.style[type] = `${Math.max(10, cur + delta)}px`;
      try { (editor as any).takeSnapshot?.(); } catch {}
    }
  };

  const handleInsertImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        const editor = editorRef.current;
        if (!editor) return;
        editor.focus();
        insertImage(editor, src);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleInsertLink = () => {
    const url = prompt('링크 URL 입력:', 'https://');
    if (!url) return;
    const text = prompt('표시 텍스트 (비우면 URL 사용):', '') || url;
    cmd(insertLink, url, url, text);
  };

  const handleInsertPageBreak = () => {
    cmd((editor) => {
      let extraMargin = 0;
      const sel = editor.getDOMSelection();
      
      if (sel && sel.type === 'range') {
        // 커서 위치 확인을 위해 임시 element 삽입
        const range = sel.range;
        const rect = range.getBoundingClientRect();
        const paperElement = document.querySelector('.rooster-paper');
        
        if (paperElement && rect.bottom > 0) {
          const paperRect = paperElement.getBoundingClientRect();
          const paddingNode = window.getComputedStyle(paperElement);
          const paddingTop = parseFloat(paddingNode.paddingTop) || 0;
          
          // 종이 최상단부터 커서까지의 실제 픽셀 거리
          const cursorY = rect.bottom - paperRect.top;
          
          // 브라우저에서 297mm는 정확히 (297 * 96 / 25.4) px = 1122.519px 입니다.
          const pageHeight = 1122.52; 
          
          // 현재 페이지 내에서 커서가 위치한 Y좌표 (나머지)
          const currentOffsetInPage = cursorY % pageHeight;
          
          // 다음 페이지 경계선까지 남은 공간 계산!
          // (글씨 높이, 하단 여백 등을 고려해 조금 여유를 뺍니다)
          let remainingSpace = pageHeight - currentOffsetInPage;
          
          // 만약 이미 페이지 끝에 너무 가까우면 바로 다음 페이지로 넘김
          if (remainingSpace < 50) remainingSpace = pageHeight;
          
          // 이 남은 공간을 margin-top으로 주어서, 종이가 꽉 찬 것처럼 아래로 밀어냅니다!
          extraMargin = remainingSpace;
        }
      }

      // 1. 시각적인 두 장의 종이 분리를 위한 요소 삽입 (남은 공간만큼 margin-top 추가)
      const html = `<hr class="page-break-gap" style="margin-top: ${extraMargin}px !important;" contenteditable="false" /><p><br></p>`;
      const div = editor.getDocument().createElement('div');
      div.innerHTML = html;
      const node = div.firstChild;
      if (node) {
        if (sel && sel.type === 'range') {
            sel.range.insertNode(node);
            sel.range.collapse(false);
        } else {
            editor.getDocument().execCommand('insertHTML', false, html);
        }
      }
    });
  };

  const iconSize = 16;
  const strokeW = 2.5;

  return (
    <div className="w-full bg-[#f8f9fa] border-b border-gray-300 font-sans text-xs select-none flex flex-col items-start pb-0 z-20">
      {/* 1. 탭 메뉴 */}
      <div className="flex px-3 pt-2 border-b border-gray-300 gap-1 bg-white items-end w-full">
        {['파일', '편집', '보기', '입력', '서식', '쪽', '표', '검토', '도구'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <div 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 cursor-pointer rounded-t border border-b-0 transition-colors ${isActive ? 'bg-[#f8f9fa] font-bold text-gray-900 border-gray-300 relative top-[1px]' : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-50'}`}
            >
              {tab}
            </div>
          );
        })}
      </div>

      {/* 2. 메인 리본 */}
      <div className="flex items-center gap-2 px-4 py-2 h-auto min-h-[76px] bg-[#f8f9fa] w-full border-b border-gray-200 flex-wrap z-20 relative">
        
        {activeTab === '파일' && (
          <>
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => alert('우측 상단의 "기록 저장" 버튼을 누르세요.')}>
              <div className="w-8 h-8 bg-white border border-gray-300 shadow-sm rounded flex items-center justify-center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg></div>
              <span>저장하기</span>
            </button>
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => window.print()}>
              <div className="w-8 h-8 bg-white border border-gray-300 shadow-sm rounded flex items-center justify-center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg></div>
              <span>인쇄</span>
            </button>
          </>
        )}

        {activeTab === '편집' && (
          <>
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => cmd((e) => { e.focus(); document.execCommand('undo'); })}>
              <div className="w-8 h-8 bg-white border border-gray-300 shadow-sm rounded flex items-center justify-center"><Undo2 size={18} strokeWidth={1.5}/></div>
              <span>되돌리기</span>
            </button>
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => cmd((e) => { e.focus(); document.execCommand('redo'); })}>
              <div className="w-8 h-8 bg-white border border-gray-300 shadow-sm rounded flex items-center justify-center"><Redo2 size={18} strokeWidth={1.5}/></div>
              <span>다시실행</span>
            </button>
            <div className="w-px h-12 bg-gray-300 mx-1" />
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => cmd(clearFormat)}>
              <div className="w-8 h-8 bg-white border border-gray-300 shadow-sm rounded flex items-center justify-center text-red-500"><Eraser size={18} strokeWidth={1.5}/></div>
              <span>서식 지우기</span>
            </button>
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => cmd((e) => { e.focus(); document.execCommand('copy'); })}>
              <div className="w-8 h-8 bg-white border border-gray-300 shadow-sm rounded flex items-center justify-center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></div>
              <span>복사하기</span>
            </button>
          </>
        )}

        {(activeTab === '입력' || activeTab === '표' || activeTab === '도구' || activeTab === '보기' || activeTab === '검토') && (
          <>
            <div className="tb-relative" style={{ position: 'relative', height: '60px' }}>
              <button className="flex flex-col items-center justify-center min-w-[56px] h-full gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => setShowTablePicker(p => !p)}>
                <div className="w-8 h-8 bg-blue-50 border border-blue-200 text-blue-600 rounded flex items-center justify-center"><Table size={18} strokeWidth={1.5}/></div>
                <span>표 ▼</span>
              </button>
              {showTablePicker && (
                <div className="absolute top-[100%] left-0 z-[9999]">
                   <TableGridPicker onSelect={handleInsertTable} onClose={() => setShowTablePicker(false)} />
                </div>
              )}
            </div>
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={handleInsertImage}>
              <div className="w-8 h-8 bg-green-50 border border-green-200 text-green-600 rounded flex items-center justify-center"><ImageIcon size={18} strokeWidth={1.5}/></div>
              <span>그림</span>
            </button>
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={handleInsertLink}>
              <div className="w-8 h-8 bg-purple-50 border border-purple-200 text-purple-600 rounded flex items-center justify-center"><Link2 size={18} strokeWidth={1.5}/></div>
              <span>하이퍼링크</span>
            </button>
            {activeTab !== '보기' && (
              <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => cmd(removeLink)}>
                <div className="w-8 h-8 bg-white border border-gray-300 shadow-sm rounded flex items-center justify-center text-slate-400"><Link2Off size={18} strokeWidth={1.5}/></div>
                <span>링크 해제</span>
              </button>
            )}
            <div className="w-px h-12 bg-gray-300 mx-1" />
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={handleInsertPageBreak}>
              <div className="w-8 h-8 bg-slate-100 border border-slate-300 text-slate-600 rounded flex items-center justify-center"><Scissors size={18} strokeWidth={1.5}/></div>
              <span>쪽 나누기</span>
            </button>

            {activeTab === '표' && (
              <>
                <div className="w-px h-12 bg-gray-300 mx-2" />
                <div className="flex flex-col gap-1">
                  <div className="flex gap-1">
                    <button title="너비 줄이기" className="w-8 h-7 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center text-[10px] font-bold" onClick={() => handleResizeTable('width', -5)}>W-</button>
                    <button title="너비 늘리기" className="w-8 h-7 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center text-[10px] font-bold" onClick={() => handleResizeTable('width', 5)}>W+</button>
                  </div>
                  <div className="flex gap-1">
                    <button title="높이 줄이기" className="w-8 h-7 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center text-[10px] font-bold" onClick={() => handleResizeTable('height', -5)}>H-</button>
                    <button title="높이 늘리기" className="w-8 h-7 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center text-[10px] font-bold" onClick={() => handleResizeTable('height', 5)}>H+</button>
                  </div>
                </div>
                <div className="flex flex-col justify-center ml-1">
                   <span className="text-[10px] text-slate-400 font-bold leading-none">크기 조절</span>
                   <span className="text-[9px] text-slate-300 font-medium mt-1">Ctrl + Arrow</span>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === '서식' && (
          <>
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => cmd(toggleBold)}>
              <div className="w-8 h-8 bg-white border border-gray-300 shadow-sm rounded flex items-center justify-center text-gray-800"><Bold size={18} strokeWidth={2}/></div>
              <span>진하게</span>
            </button>
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => cmd(toggleItalic)}>
              <div className="w-8 h-8 bg-white border border-gray-300 shadow-sm rounded flex items-center justify-center text-gray-800"><Italic size={18} strokeWidth={2}/></div>
              <span>기울임</span>
            </button>
            <div className="w-px h-12 bg-gray-300 mx-1" />
            <div className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600 relative cursor-pointer" title="글자 색">
              <div className="w-8 h-8 bg-white border border-gray-300 shadow-sm rounded flex items-center justify-center">
                <span className="text-[14px] font-bold text-red-600 border-b-[3px] border-red-600 pb-[1px]">A</span>
                <input type="color" className="absolute opacity-0 w-full h-full cursor-pointer top-0 left-0" defaultValue="#000000" onChange={(e) => cmd(setTextColor, e.target.value)} />
              </div>
              <span>글자 색상</span>
            </div>
            <div className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600 relative cursor-pointer" title="배경 색">
              <div className="w-8 h-8 bg-white border border-gray-300 shadow-sm rounded flex items-center justify-center">
                <span className="text-[14px] font-bold text-black bg-yellow-200 border-b-[3px] border-yellow-500 px-1 pb-[1px]">A</span>
                <input type="color" className="absolute opacity-0 w-full h-full cursor-pointer top-0 left-0" defaultValue="#ffff00" onChange={(e) => cmd(setBackgroundColor, e.target.value)} />
              </div>
              <span>배경 색상</span>
            </div>
            <div className="w-px h-12 bg-gray-300 mx-1" />
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => cmd(setAlignment, 'left')}>
              <div className="w-8 h-8 bg-white border border-gray-300 shadow-sm rounded flex items-center justify-center text-gray-600"><AlignLeft size={18}/></div>
              <span>왼쪽상단</span>
            </button>
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => cmd(setAlignment, 'center')}>
              <div className="w-8 h-8 bg-white border border-gray-300 shadow-sm rounded flex items-center justify-center text-gray-600"><AlignCenter size={18}/></div>
              <span>가운데</span>
            </button>
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => cmd(setAlignment, 'right')}>
              <div className="w-8 h-8 bg-white border border-gray-300 shadow-sm rounded flex items-center justify-center text-gray-600"><AlignRight size={18}/></div>
              <span>오른쪽</span>
            </button>
          </>
        )}

        {activeTab === '쪽' && (
          <>
            <div className="tb-relative" style={{ position: 'relative', height: '60px' }}>
              <button className="flex flex-col items-center justify-center min-w-[56px] h-full gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => setShowMarginPicker(p => !p)}>
                <div className="w-8 h-8 bg-amber-50 border border-amber-200 text-amber-600 rounded flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                </div>
                <span>용지여백</span>
              </button>
              {showMarginPicker && (
                <div className="absolute top-[100%] left-0 z-[9999]">
                   <MarginPickerPopup margins={margins} onSave={setMargins} onClose={() => setShowMarginPicker(false)} />
                </div>
              )}
            </div>
            
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={handleInsertPageBreak}>
              <div className="w-8 h-8 bg-slate-100 border border-slate-300 text-slate-600 rounded flex items-center justify-center">
                <Scissors size={18} strokeWidth={1.5}/>
              </div>
              <span>쪽 나누기</span>
            </button>
          </>
        )}
      </div>

      {/* 3. 소형 서식 툴바 (하단) */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white w-full h-auto min-h-[40px] flex-wrap shadow-sm z-10 relative">
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => cmd((e) => { e.focus(); document.execCommand('undo'); })}><Undo2 size={15} strokeWidth={2}/></button>
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => cmd((e) => { e.focus(); document.execCommand('redo'); })}><Redo2 size={15} strokeWidth={2}/></button>
        
        <div className="w-px h-5 bg-gray-300 mx-1" />
        
        <select className="border border-gray-300 rounded px-2 h-7 text-xs bg-white text-gray-700 w-[70px] hover:border-blue-400 focus:outline-none" onChange={(e) => cmd(setHeadingLevel, Number(e.target.value) as 0|1|2|3|4|5|6)}>
          {HEADINGS.map(h => <option key={h.level} value={h.level}>{h.label}</option>)}
        </select>
        
        <select className="border border-gray-300 rounded px-2 h-7 text-xs bg-white text-gray-700 w-[110px] hover:border-blue-400 focus:outline-none" onChange={(e) => cmd(setFontName, e.target.value)}>
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <select className="border border-gray-300 rounded px-2 h-7 text-xs bg-white text-gray-700 w-[55px] hover:border-blue-400 focus:outline-none" onChange={(e) => cmd(setFontSize, e.target.value + 'px')}>
          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <button className="flex items-center justify-center w-6 h-7 hover:bg-gray-100 rounded text-gray-700 font-bold" onClick={() => cmd(changeFontSize, 'increase')}>A+</button>
        <button className="flex items-center justify-center w-6 h-7 hover:bg-gray-100 rounded text-gray-700 font-bold" onClick={() => cmd(changeFontSize, 'decrease')}>A-</button>
        
        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-700" onClick={() => cmd(toggleBold)}><Bold size={15} strokeWidth={2.5}/></button>
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-700" onClick={() => cmd(toggleItalic)}><Italic size={15} strokeWidth={2.5}/></button>
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-700" onClick={() => cmd(toggleUnderline)}><Underline size={15} strokeWidth={2.5}/></button>
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-700" onClick={() => cmd(toggleStrikethrough)}><Strikethrough size={15} strokeWidth={2.5}/></button>
        
        <div className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded relative overflow-hidden" title="글자 색">
          <span className="text-[13px] font-bold text-red-600 border-b-[3px] border-red-600 pb-[1px] leading-tight">A</span>
          <input ref={fontColorRef} type="color" className="absolute opacity-0 w-full h-full cursor-pointer" defaultValue="#000000" onChange={(e) => cmd(setTextColor, e.target.value)} />
        </div>
        <div className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded relative overflow-hidden" title="배경 색">
          <span className="text-[13px] font-bold text-black bg-yellow-200 border-b-[3px] border-yellow-500 px-[2px] pb-[1px] leading-tight">A</span>
          <input ref={bgColorRef} type="color" className="absolute opacity-0 w-full h-full cursor-pointer" defaultValue="#ffff00" onChange={(e) => cmd(setBackgroundColor, e.target.value)} />
        </div>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => cmd(setAlignment, 'left')}><AlignLeft size={16}/></button>
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => cmd(setAlignment, 'center')}><AlignCenter size={16}/></button>
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => cmd(setAlignment, 'right')}><AlignRight size={16}/></button>
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => cmd(setAlignment, 'justify')}><AlignJustify size={16}/></button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => cmd(toggleBullet)}><List size={16}/></button>
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => cmd(toggleNumbering)}><ListOrdered size={16}/></button>
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => cmd(setIndentation, 'outdent')}><IndentDecrease size={16}/></button>
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => cmd(setIndentation, 'indent')}><IndentIncrease size={16}/></button>
        
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => cmd(clearFormat)} title="서식 지우기"><Eraser size={15}/></button>
      </div>
    </div>
  );
}

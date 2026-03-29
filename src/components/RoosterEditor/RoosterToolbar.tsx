import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { undo, redo } from 'roosterjs-content-model-core';
import {
  Undo2, Redo2, Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, IndentDecrease, IndentIncrease,
  Quote, Table, Image as ImageIcon, Link2, Link2Off,
  Eraser, Scissors, Subscript, Superscript
} from 'lucide-react';
import type { ScTableEngine } from './plugins/ScTableEngine';
import TableCreateModal, { type TableCreateConfig } from './TableCreateModal';
import TableSplitModal from './TableSplitModal';
import { buildTableTemplateHtml, TABLE_TEMPLATES, type TableTemplateId } from './TableTemplates';
import { mmToPx } from './utils/TableUtils';
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

const TABLE_DENSITY_CLASSES = [
  'sc-table-density-compact',
  'sc-table-density-comfortable',
  'sc-table-density-spacious',
] as const;

type TableDensity = 'compact' | 'comfortable' | 'spacious' | '';

const SHORTCUT_GUIDE_SECTIONS = [
  {
    title: '웹한글 기준 조작',
    badge: 'Official',
    tone: 'official' as const,
    description: '공식 도움말에서 바로 확인된 표 조작입니다.',
    items: [
      { keys: ['Shift', 'Esc'], label: '표에서 빠져나오기', detail: '표 밖으로 커서를 이동합니다.' },
      { keys: ['F5'], label: '선택 범위 확장', detail: '셀에서 시작해 행, 열, 표까지 순환합니다.' },
      { keys: ['Shift', 'F5'], label: '선택 범위 역순환', detail: '표, 열, 행, 셀 방향으로 되돌립니다.' },
    ],
  },
  {
    title: 'SC23 표 이동',
    badge: 'SC23',
    tone: 'app' as const,
    description: '한컴 표 크기 조절 규칙에 맞춰 현재 표 엔진에 연결한 단축키입니다.',
    items: [
      { keys: ['Tab'], label: '다음 셀 이동', detail: '현재 셀 기준 다음 칸으로 이동합니다.' },
      { keys: ['Shift', 'Tab'], label: '이전 셀 이동', detail: '현재 셀 기준 이전 칸으로 이동합니다.' },
      { keys: ['Ctrl', 'Arrow'], label: '줄/칸 전체와 표 크기 조절', detail: '선택한 줄이나 칸 전체를 조절하고 표 전체 크기도 함께 바뀝니다.' },
      { keys: ['Alt', 'Arrow'], label: '줄/칸 전체만 조절', detail: '표 전체 크기는 유지하고 이웃 줄이나 칸이 반대로 보정됩니다.' },
      { keys: ['Shift', 'Arrow'], label: '현재 셀만 조절', detail: '현재 셀과 바로 이웃한 셀 하나만 함께 조절됩니다.' },
      { keys: ['Shift', 'Drag'], label: '현재 셀 경계 조절', detail: 'Shift를 누른 채 표 경계를 잡으면 현재 셀 경계만 직접 늘이거나 줄입니다.' },
      { keys: ['Ctrl', 'Shift', 'Arrow'], label: '행 / 열 삽입', detail: '방향에 맞는 위치로 행이나 열을 추가합니다.' },
    ],
  },
  {
    title: 'SC23 표 서식',
    badge: 'SC23',
    tone: 'app' as const,
    description: '현재 구현된 표 기능을 키보드로 바로 쓰도록 추가 매핑했습니다.',
    items: [
      { keys: ['Ctrl', 'Alt', 'M'], label: '셀 합치기', detail: '선택한 셀 영역을 병합합니다.' },
      { keys: ['Ctrl', 'Alt', 'U'], label: '병합 해제', detail: '현재 병합된 셀을 다시 풀어냅니다.' },
      { keys: ['Ctrl', 'Alt', 'F'], label: '표 폭 맞춤', detail: '표를 문단 폭 기준으로 다시 맞춥니다.' },
      { keys: ['Ctrl', 'Alt', 'C'], label: '균등 열', detail: '선택한 열 너비를 같게 정리합니다.' },
      { keys: ['Ctrl', 'Alt', 'R'], label: '균등 행', detail: '선택한 행 높이를 같게 정리합니다.' },
      { keys: ['Ctrl', 'Alt', 'H'], label: '머리행 토글', detail: '첫 줄 머리행 강조를 켜고 끕니다.' },
      { keys: ['Ctrl', 'Alt', 'Z'], label: '줄무늬 토글', detail: '행 줄무늬 스타일을 켜고 끕니다.' },
      { keys: ['Ctrl', 'Alt', 'T'], label: '회의록형 적용', detail: '회의록형 프리셋과 폭 맞춤을 한 번에 적용합니다.' },
      { keys: ['Ctrl', 'Alt', '1 / 2 / 3'], label: '밀도 설정', detail: '촘촘, 보통, 넉넉 밀도를 빠르게 바꿉니다.' },
      { keys: ['Ctrl', 'Alt', '0'], label: '기본 표로 초기화', detail: '현재 표의 빠른 스타일을 기본 상태로 되돌립니다.' },
    ],
  },
] as const;

const getSelectionElement = () => {
  const selection = window.getSelection();
  if (!selection?.anchorNode) return null;
  return selection.anchorNode.nodeType === Node.TEXT_NODE
    ? selection.anchorNode.parentElement
    : (selection.anchorNode as HTMLElement);
};

const getSafeEditorDocument = (editor: IEditor | null) => {
  if (!editor) return null;
  try {
    return editor.getDocument();
  } catch {
    return null;
  }
};

const getTableEngine = (editor: IEditor | null) => {
  return (editor as any)?.scTableEngine as ScTableEngine | undefined;
};

const getLogicalColumnCount = (table: HTMLTableElement) => {
  const firstRow = table.rows[0];
  if (!firstRow) return 0;

  return Array.from(firstRow.cells).reduce(
    (count, cell) => count + (cell.colSpan || 1),
    0,
  );
};

const ensureColgroup = (table: HTMLTableElement) => {
  const count = getLogicalColumnCount(table);
  if (!count) return [] as HTMLTableColElement[];

  let colgroup = table.querySelector('colgroup');
  if (!colgroup) {
    colgroup = table.ownerDocument.createElement('colgroup');
    table.prepend(colgroup);
  }

  while (colgroup.children.length < count) {
    colgroup.appendChild(table.ownerDocument.createElement('col'));
  }

  while (colgroup.children.length > count) {
    colgroup.lastChild?.remove();
  }

  return Array.from(colgroup.children) as HTMLTableColElement[];
};

const removeDensityClasses = (table: HTMLTableElement) => {
  TABLE_DENSITY_CLASSES.forEach(className => table.classList.remove(className));
};

const triggerTableChange = (editor: IEditor | null) => {
  if (!getSafeEditorDocument(editor)) return;
  try {
    editor.takeSnapshot();
    editor.triggerEvent(10 as any, {});
    editor.focus();
  } catch {}
};

const findActiveTable = (editor: IEditor | null) => {
  const doc = getSafeEditorDocument(editor) || document;
  const selectedTable = doc.querySelector('.sc-selected-table') as HTMLTableElement | null;
  if (selectedTable) return selectedTable;
  const selectedCellTable = doc.querySelector('.sc-cell-selected')?.closest('table') as HTMLTableElement | null;
  if (selectedCellTable) return selectedCellTable;
  return getSelectionElement()?.closest('table') as HTMLTableElement | null;
};

const insertHtmlAtSelection = (editor: IEditor, html: string) => {
  const doc = editor.getDocument();
  const container = doc.createElement('div');
  container.innerHTML = html;

  const fragment = doc.createDocumentFragment();
  let lastNode: ChildNode | null = null;

  while (container.firstChild) {
    lastNode = fragment.appendChild(container.firstChild);
  }

  const selection = doc.getSelection?.() ?? window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(fragment);

    if (lastNode) {
      const nextRange = doc.createRange();
      nextRange.setStartAfter(lastNode);
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
    }
  } else {
    doc.body.appendChild(fragment);
  }
};

const focusTableCell = (table: HTMLTableElement) => {
  const targetCell =
    (table.querySelector('td') as HTMLTableCellElement | null) ||
    (table.querySelector('th') as HTMLTableCellElement | null);

  if (!targetCell) {
    return;
  }

  const selection = targetCell.ownerDocument.getSelection?.() ?? window.getSelection();
  if (!selection) {
    return;
  }

  const range = targetCell.ownerDocument.createRange();
  range.selectNodeContents(targetCell);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
};

function TableActionPill({
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`tb-table-pill ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
    >
      {children}
    </button>
  );
}

// 표 삽입 그리드 팝업
function TableGridPicker({ onSelect, onClose }: { onSelect: (r: number, c: number) => void; onClose: () => void }) {
  const [hover, setHover] = useState({ r: 0, c: 0 });
  const MAX = 8;
  return (
    <div className="tb-table-picker">
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
  const [showTableCreateModal, setShowTableCreateModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [tableCreateSeed, setTableCreateSeed] = useState({ rows: 3, cols: 3 });
  const [tableUi, setTableUi] = useState({
    hasTable: false,
    isHeaderRow: false,
    isZebra: false,
    isFitWidth: false,
    isMeetingPreset: false,
    density: '' as TableDensity,
  });
  const fontColorRef = useRef<HTMLInputElement>(null);
  const bgColorRef = useRef<HTMLInputElement>(null);

  const handleToolbarMouseDownCapture = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, select, option, textarea, label')) {
      return;
    }

    e.preventDefault();
  }, []);

  const cmd = useCallback(<T extends unknown[]>(fn: (editor: IEditor, ...args: T) => void, ...args: T) => {
    const editor = editorRef.current;
    if (!getSafeEditorDocument(editor)) return;
    editor.focus();
    fn(editor, ...args);
  }, [editorRef]);

  const applyCreatedTableConfig = useCallback((table: HTMLTableElement, config: TableCreateConfig) => {
    table.classList.add('sc-table-standard');
    table.classList.remove(
      'sc-table-fit-width',
      'sc-table-header-row',
      'sc-table-preset-meeting',
      'sc-table-first-column'
    );
    removeDensityClasses(table);

    if (config.hasHeaderRow) {
      table.classList.add('sc-table-header-row');
    }

    if (config.hasFirstColumn) {
      table.classList.add('sc-table-first-column');
    }

    if (config.preset === 'meeting') {
      table.classList.add('sc-table-preset-meeting');
    }

    table.classList.add(`sc-table-density-${config.density}`);
    table.style.tableLayout = 'fixed';
    table.style.maxWidth = '100%';
    table.style.display = config.inline ? 'inline-table' : 'table';

    const rows = Array.from(table.rows);
    const cols = ensureColgroup(table);
    const rowHeightPx = mmToPx(config.rowHeightMm);
    rows.forEach(row => {
      row.style.height = `${rowHeightPx}px`;
    });

    if (config.widthMode === 'fit') {
      table.classList.add('sc-table-fit-width');
      table.style.width = '100%';
      table.style.maxWidth = '100%';
      if (cols.length > 0) {
        const width = 100 / cols.length;
        cols.forEach(col => {
          col.style.width = `${width}%`;
        });
      }
    } else {
      const widthPx = mmToPx(config.widthMm);
      table.style.width = `${widthPx}px`;
      const colWidth = cols.length > 0 ? Math.max(48, widthPx / cols.length) : widthPx;
      cols.forEach(col => {
        col.style.width = `${colWidth}px`;
      });
    }
  }, []);

  const applyTemplateTableConfig = useCallback((table: HTMLTableElement, templateId: TableTemplateId) => {
    table.classList.add('sc-table-standard');
    table.style.tableLayout = 'fixed';
    table.style.width = '100%';
    table.style.maxWidth = '100%';
    table.style.display = 'table';
    removeDensityClasses(table);
    table.classList.remove('sc-table-fit-width', 'sc-table-header-row', 'sc-table-preset-meeting');

    const cols = ensureColgroup(table);
    const rows = Array.from(table.rows);

    if (templateId === 'meetingSummary') {
      table.classList.add('sc-table-fit-width', 'sc-table-preset-meeting', 'sc-table-density-comfortable', 'sc-table-template-minutes');
      const widths = [18, 32, 18, 32];
      cols.forEach((col, index) => {
        col.style.width = `${widths[index] ?? (100 / Math.max(1, cols.length))}%`;
      });
      rows.forEach((row, index) => {
        row.style.height = `${index >= 4 ? 56 : 42}px`;
      });
    } else if (templateId === 'agendaTracker') {
      table.classList.add('sc-table-fit-width', 'sc-table-header-row', 'sc-table-density-comfortable', 'sc-table-template-agenda');
      const widths = [12, 34, 22, 16, 16];
      cols.forEach((col, index) => {
        col.style.width = `${widths[index] ?? (100 / Math.max(1, cols.length))}%`;
      });
      rows.forEach((row, index) => {
        row.style.height = `${index === 0 ? 40 : 46}px`;
      });
    } else if (templateId === 'attendanceSheet') {
      table.classList.add('sc-table-fit-width', 'sc-table-header-row', 'sc-table-density-comfortable', 'sc-table-template-attendance');
      const widths = [18, 22, 22, 18, 20];
      cols.forEach((col, index) => {
        col.style.width = `${widths[index] ?? (100 / Math.max(1, cols.length))}%`;
      });
      rows.forEach((row, index) => {
        row.style.height = `${index === 0 ? 40 : 48}px`;
      });
    } else if (templateId === 'approvalLine') {
      table.classList.add('sc-table-fit-width', 'sc-table-density-comfortable', 'sc-table-template-approval');
      const widths = [18, 27.33, 27.33, 27.33];
      cols.forEach((col, index) => {
        col.style.width = `${widths[index] ?? (100 / Math.max(1, cols.length))}%`;
      });
      rows.forEach((row, index) => {
        row.style.height = `${index === 1 ? 68 : index >= 4 ? 50 : 40}px`;
      });
    } else if (templateId === 'approvalRequest') {
      table.classList.add('sc-table-fit-width', 'sc-table-density-comfortable', 'sc-table-template-approval-request');
      const widths = [17, 33, 17, 33];
      cols.forEach((col, index) => {
        col.style.width = `${widths[index] ?? (100 / Math.max(1, cols.length))}%`;
      });
      rows.forEach((row, index) => {
        row.style.height = `${index >= 3 ? 54 : 42}px`;
      });
    } else if (templateId === 'comparison') {
      table.classList.add('sc-table-fit-width', 'sc-table-header-row', 'sc-table-density-comfortable', 'sc-table-template-comparison');
      const widths = [22, 26, 26, 26];
      cols.forEach((col, index) => {
        col.style.width = `${widths[index] ?? (100 / Math.max(1, cols.length))}%`;
      });
      rows.forEach(row => {
        row.style.height = '42px';
      });
    }
  }, []);

  const syncTableUi = useCallback(() => {
    const table = findActiveTable(editorRef.current);
    if (!table) {
      setTableUi({
        hasTable: false,
        isHeaderRow: false,
        isZebra: false,
        isFitWidth: false,
        isMeetingPreset: false,
        density: '',
      });
      return;
    }

    const density =
      table.classList.contains('sc-table-density-compact')
        ? 'compact'
        : table.classList.contains('sc-table-density-comfortable')
          ? 'comfortable'
          : table.classList.contains('sc-table-density-spacious')
            ? 'spacious'
            : '';

    setTableUi({
      hasTable: true,
      isHeaderRow: table.classList.contains('sc-table-header-row'),
      isZebra: table.classList.contains('sc-table-zebra'),
      isFitWidth: table.classList.contains('sc-table-fit-width'),
      isMeetingPreset: table.classList.contains('sc-table-preset-meeting'),
      density,
    });
  }, [editorRef]);

  useEffect(() => {
    syncTableUi();

    const handleSelectionChange = () => syncTableUi();
    const handlePointerUp = () => syncTableUi();
    const handleKeyUp = () => syncTableUi();

    document.addEventListener('selectionchange', handleSelectionChange);
    window.addEventListener('pointerup', handlePointerUp, true);
    window.addEventListener('keyup', handleKeyUp, true);

    const timer = window.setInterval(syncTableUi, 400);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      window.removeEventListener('pointerup', handlePointerUp, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.clearInterval(timer);
    };
  }, [syncTableUi]);

  const insertConfiguredTable = useCallback((config: TableCreateConfig) => {
    const editor = editorRef.current;
    if (!getSafeEditorDocument(editor)) return;

    try {
      editor.takeSnapshot();
    } catch {}

    editor.focus();
    insertTable(editor, config.cols, config.rows, {
      borderColor: '#555',
      hasHeaderRow: config.hasHeaderRow,
      hasFirstColumn: config.hasFirstColumn,
      tableStyleName: 'Default',
    });

    const table = findActiveTable(editor);
    if (table) {
      applyCreatedTableConfig(table, config);
      getTableEngine(editor)?.buildModel(table);
      getTableEngine(editor)?.syncToDOM();
      getTableEngine(editor)?.deselectAllTables();
      table.classList.add('sc-selected-table');
      focusTableCell(table);
    }

    try {
      editor.triggerEvent(10 as any, {});
      editor.focus();
    } catch {}

    syncTableUi();
  }, [applyCreatedTableConfig, editorRef, syncTableUi]);

  const handleInsertTable = useCallback((rows: number, cols: number) => {
    setTableCreateSeed({ rows, cols });
    insertConfiguredTable({
      rows,
      cols,
      widthMode: 'fit',
      widthMm: 160,
      rowHeightMm: 10,
      hasHeaderRow: false,
      hasFirstColumn: false,
      preset: 'plain',
      density: 'comfortable',
      inline: false,
    });
  }, [insertConfiguredTable]);

  const handleInsertTableTemplate = useCallback((templateId: TableTemplateId) => {
    const editor = editorRef.current;
    if (!getSafeEditorDocument(editor)) return;

    const token = `sc-table-template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      editor.takeSnapshot();
    } catch {}

    editor.focus();
    insertHtmlAtSelection(editor, buildTableTemplateHtml(templateId, token));

    const doc = editor.getDocument();
    const table = doc.querySelector(`[data-sc-template-token="${token}"]`) as HTMLTableElement | null;

    if (table) {
      applyTemplateTableConfig(table, templateId);
      table.removeAttribute('data-sc-template-token');
      getTableEngine(editor)?.buildModel(table);
      getTableEngine(editor)?.syncToDOM();
      getTableEngine(editor)?.deselectAllTables();
      table.classList.add('sc-selected-table');
      focusTableCell(table);
    }

    try {
      editor.triggerEvent(10 as any, {});
      editor.focus();
    } catch {}

    setShowTablePicker(false);
    syncTableUi();
  }, [applyTemplateTableConfig, editorRef, syncTableUi]);

  const withSelectedTable = useCallback((mutate: (table: HTMLTableElement, editor: IEditor) => void) => {
    const editor = editorRef.current;
    if (!getSafeEditorDocument(editor)) return;
    const table = findActiveTable(editor);
    if (!editor || !table) return;

    mutate(table, editor);
    triggerTableChange(editor);
    syncTableUi();
  }, [editorRef, syncTableUi]);

  const withTableEngine = useCallback((mutate: (engine: ScTableEngine, editor: IEditor) => boolean) => {
    const editor = editorRef.current;
    if (!getSafeEditorDocument(editor)) return;
    const engine = getTableEngine(editor);
    if (!editor || !engine) return;

    try {
      editor.takeSnapshot();
    } catch {}

    if (!mutate(engine, editor)) return;

    try {
      editor.triggerEvent(10 as any, {});
      editor.focus();
    } catch {}
    syncTableUi();
  }, [editorRef, syncTableUi]);

  const applyTableAwareAlignment = useCallback((alignment: 'left' | 'center' | 'right' | 'justify') => {
    const editor = editorRef.current;
    if (!getSafeEditorDocument(editor)) return;

    const engine = getTableEngine(editor);
    const activeTable = findActiveTable(editor);

    if (editor && engine && activeTable) {
      try {
        editor.takeSnapshot();
      } catch {}

      if (engine.setSelectionTextAlign(alignment)) {
        try {
          editor.triggerEvent(10 as any, {});
          editor.focus();
        } catch {}
        syncTableUi();
        return;
      }
    }

    cmd(setAlignment, alignment);
  }, [cmd, editorRef, syncTableUi]);

  const handleToggleTableClass = useCallback((className: string) => {
    withSelectedTable((table) => {
      table.classList.toggle(className);
    });
  }, [withSelectedTable]);

  const handleSetTableDensity = useCallback((density: Exclude<TableDensity, ''>) => {
    withSelectedTable((table) => {
      removeDensityClasses(table);
      table.classList.add(`sc-table-density-${density}`);
    });
  }, [withSelectedTable]);

  const handleResetTableStyle = useCallback(() => {
    withSelectedTable((table) => {
      table.classList.remove('sc-table-header-row', 'sc-table-zebra', 'sc-table-fit-width', 'sc-table-preset-meeting');
      removeDensityClasses(table);
    });
  }, [withSelectedTable]);

  const handleFitTableWidth = useCallback(() => {
    withTableEngine((engine) => engine.fitTableWidth());
  }, [withTableEngine]);

  const handleDistributeColumns = useCallback(() => {
    withTableEngine((engine) => engine.distributeColumns());
  }, [withTableEngine]);

  const handleDistributeRows = useCallback(() => {
    withTableEngine((engine) => engine.distributeRows());
  }, [withTableEngine]);

  const handleApplyMeetingPreset = useCallback(() => {
    withSelectedTable((table) => {
      table.classList.add('sc-table-preset-meeting', 'sc-table-header-row', 'sc-table-fit-width');
      removeDensityClasses(table);
      table.classList.add('sc-table-density-comfortable');
      table.style.width = '100%';
      table.style.maxWidth = '100%';
      table.style.tableLayout = 'fixed';

      const cols = ensureColgroup(table);
      if (cols.length > 0) {
        const width = 100 / cols.length;
        cols.forEach(col => {
          col.style.width = `${width}%`;
        });
      }
    });
  }, [withSelectedTable]);

  const handleResizeTable = (type: 'width' | 'height', delta: number) => {
    withTableEngine((engine) => (
      type === 'width' ? engine.adjustColumnWidths(delta) : engine.adjustRowHeights(delta)
    ));
  };

  const handleInsertRowAbove = useCallback(() => {
    withTableEngine((engine) => engine.insertRow('above'));
  }, [withTableEngine]);

  const handleInsertRowBelow = useCallback(() => {
    withTableEngine((engine) => engine.insertRow('below'));
  }, [withTableEngine]);

  const handleInsertColumnLeft = useCallback(() => {
    withTableEngine((engine) => engine.insertColumn('left'));
  }, [withTableEngine]);

  const handleInsertColumnRight = useCallback(() => {
    withTableEngine((engine) => engine.insertColumn('right'));
  }, [withTableEngine]);

  const handleDeleteRows = useCallback(() => {
    withTableEngine((engine) => engine.deleteRows());
  }, [withTableEngine]);

  const handleDeleteColumns = useCallback(() => {
    withTableEngine((engine) => engine.deleteColumns());
  }, [withTableEngine]);

  const handleMergeCells = useCallback(() => {
    withTableEngine((engine) => engine.mergeSelection());
  }, [withTableEngine]);

  const handleSplitCells = useCallback(() => {
    withTableEngine((engine) => engine.splitSelection());
  }, [withTableEngine]);

  const handleSplitCellCustom = useCallback((rows: number, cols: number) => {
    withTableEngine((engine) => engine.splitActiveCell(rows, cols));
    setShowSplitModal(false);
  }, [withTableEngine]);

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
    <div
      className="rooster-toolbar w-full bg-[#f8f9fa] border-b border-gray-300 font-sans text-xs select-none flex flex-col items-start pb-0 z-20"
      onMouseDownCapture={handleToolbarMouseDownCapture}
    >
      {/* 1. 탭 메뉴 */}
      <div className="flex px-3 pt-2 border-b border-gray-300 gap-1 bg-white items-end w-full">
        {['파일', '편집', '보기', '입력', '서식', '쪽', '표', '검토', '도구', '도움말'].map((tab) => {
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
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => cmd((e) => { e.focus(); undo(e); })}>
              <div className="w-8 h-8 bg-white border border-gray-300 shadow-sm rounded flex items-center justify-center"><Undo2 size={18} strokeWidth={1.5}/></div>
              <span>되돌리기</span>
            </button>
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => cmd((e) => { e.focus(); redo(e); })}>
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

        {(activeTab === '입력' || activeTab === '도구' || activeTab === '보기' || activeTab === '검토') && (
          <>
            <div className="tb-relative" style={{ position: 'relative', height: '60px' }}>
              <button className="flex flex-col items-center justify-center min-w-[56px] h-full gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => setShowTablePicker(p => !p)}>
                <div className="w-8 h-8 bg-blue-50 border border-blue-200 text-blue-600 rounded flex items-center justify-center"><Table size={18} strokeWidth={1.5}/></div>
                <span>표 ▼</span>
              </button>
              {showTablePicker && (
                <div className="tb-table-picker-popover">
                  <div className="tb-table-picker-wrap">
                    <TableGridPicker onSelect={handleInsertTable} onClose={() => setShowTablePicker(false)} />
                    <button
                      type="button"
                      className="tb-table-advanced-btn"
                      onClick={() => {
                        setTableCreateSeed({ rows: 3, cols: 3 });
                        setShowTablePicker(false);
                        setShowTableCreateModal(true);
                      }}
                    >
                      상세 옵션으로 만들기
                    </button>
                    <div className="tb-table-template-section">
                      <div className="tb-table-template-title">빠른 템플릿</div>
                      {TABLE_TEMPLATES.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          className="tb-table-template-btn"
                          onClick={() => handleInsertTableTemplate(template.id)}
                        >
                          <strong>{template.label}</strong>
                          <span>{template.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
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
          </>
        )}

        {activeTab === '표' && (
          <div className="tb-table-ribbon">
            <section className="tb-table-panel tb-table-panel-insert">
              <div className="tb-table-panel-head">
                <div className="tb-table-panel-title">표 삽입</div>
                <p className="tb-table-panel-hint">빠른 표 생성과 회의록 템플릿을 한곳에 모았습니다.</p>
              </div>

              <div className="tb-table-insert-actions">
                <div className="tb-relative">
                  <button className="tb-table-primary" onClick={() => setShowTablePicker(p => !p)}>
                    <span className="tb-table-primary-icon"><Table size={18} strokeWidth={1.7} /></span>
                    <span className="tb-table-primary-copy">
                      <strong>표 만들기</strong>
                      <small>그리드와 템플릿</small>
                    </span>
                  </button>

                  {showTablePicker && (
                    <div className="tb-table-picker-popover">
                      <div className="tb-table-picker-wrap">
                        <div className="tb-table-picker-main">
                          <TableGridPicker onSelect={handleInsertTable} onClose={() => setShowTablePicker(false)} />
                          <button
                            type="button"
                            className="tb-table-advanced-btn"
                            onClick={() => {
                              setTableCreateSeed({ rows: 3, cols: 3 });
                              setShowTablePicker(false);
                              setShowTableCreateModal(true);
                            }}
                          >
                            상세 옵션으로 만들기
                          </button>
                        </div>

                        <div className="tb-table-template-section">
                          <div className="tb-table-template-title">빠른 템플릿</div>
                          {TABLE_TEMPLATES.map((template) => (
                            <button
                              key={template.id}
                              type="button"
                              className="tb-table-template-btn"
                              onClick={() => {
                                handleInsertTableTemplate(template.id);
                                setShowTablePicker(false);
                              }}
                            >
                              <strong>{template.label}</strong>
                              <span>{template.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="tb-table-secondary"
                  onClick={() => {
                    setTableCreateSeed({ rows: 3, cols: 3 });
                    setShowTableCreateModal(true);
                  }}
                >
                  상세 옵션
                </button>
              </div>

              <div className="tb-table-template-row">
                {TABLE_TEMPLATES.slice(0, 4).map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="tb-table-template-chip"
                    onClick={() => handleInsertTableTemplate(template.id)}
                  >
                    {template.quickLabel}
                  </button>
                ))}
              </div>
            </section>

            <section className="tb-table-panel">
              <div className="tb-table-panel-head">
                <div className="tb-table-panel-title">구조 편집</div>
                <p className="tb-table-panel-hint">행, 열, 병합과 삭제를 빠르게 처리합니다.</p>
              </div>
              <div className="tb-table-action-grid">
                <TableActionPill disabled={!tableUi.hasTable} onClick={handleInsertRowAbove}>행 위</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} onClick={handleInsertRowBelow}>행 아래</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} onClick={handleInsertColumnLeft}>열 왼쪽</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} onClick={handleInsertColumnRight}>열 오른쪽</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} onClick={handleMergeCells}>셀 합치기</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} onClick={handleSplitCells}>병합 해제</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} onClick={() => setShowSplitModal(true)}>셀 나누기</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} onClick={handleDeleteRows}>행 삭제</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} onClick={handleDeleteColumns}>열 삭제</TableActionPill>
              </div>
            </section>

            <section className="tb-table-panel">
              <div className="tb-table-panel-head">
                <div className="tb-table-panel-title">크기와 배치</div>
                <p className="tb-table-panel-hint">선택 영역 크기를 고르고 균등 정렬을 맞춥니다.</p>
              </div>
              <div className="tb-table-action-grid">
                <TableActionPill disabled={!tableUi.hasTable} onClick={handleDistributeColumns}>균등 열</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} onClick={handleDistributeRows}>균등 행</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} active={tableUi.isFitWidth} onClick={handleFitTableWidth}>폭 맞춤</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} onClick={() => handleResizeTable('width', -8)}>폭 -</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} onClick={() => handleResizeTable('width', 8)}>폭 +</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} onClick={() => handleResizeTable('height', -6)}>높이 -</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} onClick={() => handleResizeTable('height', 6)}>높이 +</TableActionPill>
              </div>
            </section>

            <section className="tb-table-panel">
              <div className="tb-table-panel-head">
                <div className="tb-table-panel-title">스타일</div>
                <p className="tb-table-panel-hint">회의록형 스타일과 밀도 프리셋을 빠르게 적용합니다.</p>
              </div>
              <div className="tb-table-action-grid">
                <TableActionPill disabled={!tableUi.hasTable} active={tableUi.isMeetingPreset} onClick={handleApplyMeetingPreset}>회의록형</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} active={tableUi.isHeaderRow} onClick={() => handleToggleTableClass('sc-table-header-row')}>머리행</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} active={tableUi.isZebra} onClick={() => handleToggleTableClass('sc-table-zebra')}>줄무늬</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} active={tableUi.density === 'compact'} onClick={() => handleSetTableDensity('compact')}>촘촘</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} active={tableUi.density === 'comfortable'} onClick={() => handleSetTableDensity('comfortable')}>보통</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} active={tableUi.density === 'spacious'} onClick={() => handleSetTableDensity('spacious')}>넉넉</TableActionPill>
                <TableActionPill disabled={!tableUi.hasTable} onClick={handleResetTableStyle}>기본 표</TableActionPill>
              </div>
            </section>

            <div className="tb-table-note">
              `F5` 셀 확장, `Shift+Esc` 종료, `Alt/Ctrl/Shift+방향키` 이동과 삽입을 그대로 지원합니다.
            </div>
          </div>
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
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => applyTableAwareAlignment('left')}>
              <div className="w-8 h-8 bg-white border border-gray-300 shadow-sm rounded flex items-center justify-center text-gray-600"><AlignLeft size={18}/></div>
              <span>왼쪽상단</span>
            </button>
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => applyTableAwareAlignment('center')}>
              <div className="w-8 h-8 bg-white border border-gray-300 shadow-sm rounded flex items-center justify-center text-gray-600"><AlignCenter size={18}/></div>
              <span>가운데</span>
            </button>
            <button className="flex flex-col items-center justify-center min-w-[56px] h-[60px] gap-1.5 hover:bg-[#e2e8f0] rounded transition-colors text-gray-600" onClick={() => applyTableAwareAlignment('right')}>
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

        {activeTab === '도움말' && (
          <div className="tb-help-board">
            {SHORTCUT_GUIDE_SECTIONS.map((section) => (
              <section key={section.title} className="tb-help-card">
                <div className="tb-help-card-head">
                  <div>
                    <div className="tb-help-title">{section.title}</div>
                    <p className="tb-help-description">{section.description}</p>
                  </div>
                  <span className={`tb-help-badge ${section.tone}`}>{section.badge}</span>
                </div>

                <div className="tb-help-list">
                  {section.items.map((item) => (
                    <div key={`${section.title}-${item.label}`} className="tb-help-item">
                      <div className="tb-help-item-main">
                        <strong>{item.label}</strong>
                        <span>{item.detail}</span>
                      </div>
                      <div className="tb-help-keys">
                        {item.keys.map((key) => (
                          <kbd key={`${item.label}-${key}`} className="tb-help-kbd">
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <div className="tb-help-note">
              웹한글 공식 도움말 기준으로 `Shift+Esc`는 표 밖으로 빠져나오는 동작이고, 표 선택은 `F5`를 반복해 확장하는 흐름입니다.
              브라우저 환경에서는 일부 조합이 시스템 또는 브라우저 기본 단축키와 겹칠 수 있어, 현재 SC23에서는 충돌이 적은 조합 위주로 추가 매핑했습니다.
            </div>
          </div>
        )}
      </div>

      {/* 3. 소형 서식 툴바 (하단) */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white w-full h-auto min-h-[40px] flex-wrap shadow-sm z-10 relative">
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => cmd((e) => { e.focus(); undo(e); })}><Undo2 size={15} strokeWidth={2}/></button>
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => cmd((e) => { e.focus(); redo(e); })}><Redo2 size={15} strokeWidth={2}/></button>
        
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

        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => applyTableAwareAlignment('left')}><AlignLeft size={16}/></button>
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => applyTableAwareAlignment('center')}><AlignCenter size={16}/></button>
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => applyTableAwareAlignment('right')}><AlignRight size={16}/></button>
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => applyTableAwareAlignment('justify')}><AlignJustify size={16}/></button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => cmd(toggleBullet)}><List size={16}/></button>
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => cmd(toggleNumbering)}><ListOrdered size={16}/></button>
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => cmd(setIndentation, 'outdent')}><IndentDecrease size={16}/></button>
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => cmd(setIndentation, 'indent')}><IndentIncrease size={16}/></button>
        
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <button className="flex items-center justify-center w-7 h-7 hover:bg-gray-100 rounded text-gray-600" onClick={() => cmd(clearFormat)} title="서식 지우기"><Eraser size={15}/></button>
      </div>

      {showSplitModal && (
        <TableSplitModal
          onClose={() => setShowSplitModal(false)}
          onApply={handleSplitCellCustom}
        />
      )}

      {showTableCreateModal && (
        <TableCreateModal
          initialRows={tableCreateSeed.rows}
          initialCols={tableCreateSeed.cols}
          onClose={() => setShowTableCreateModal(false)}
          onApply={(config) => {
            insertConfiguredTable(config);
            setShowTableCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

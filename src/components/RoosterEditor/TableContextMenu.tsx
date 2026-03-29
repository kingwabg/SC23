import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Menu, Item, Submenu, Separator, useContextMenu, RightSlot } from 'react-contexify';
import { HexColorPicker } from 'react-colorful';
import { mmToPx } from './utils/TableUtils';
import TablePropertiesModal from './TablePropertiesModal';
import 'react-contexify/ReactContexify.css';
import type { IEditor } from 'roosterjs-content-model-types';
import type { ScBorderPreset, ScDiagonalMode, ScTableEngine } from './plugins/ScTableEngine';
import TableBorderModal from './TableBorderModal';
import TableSplitModal from './TableSplitModal';
import './TableContextMenu.css';

const MENU_ID = 'table-ctx-menu';

// ── SVG 아이콘 ──
const Icon = ({ path, size = 14, triggerEvent, propsFromTrigger, ...rest }: any) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor"
    strokeWidth="1.9" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    style={{ display: 'block' }}
    {...rest}
  >
    <path d={path} />
  </svg>
);

const MenuText = ({ children, className, triggerEvent, propsFromTrigger }: any) => (
  <span className={className}>{children}</span>
);

const MenuRow = ({ iconPath, children, className, size = 14, triggerEvent, propsFromTrigger }: any) => (
  <>
    <Icon path={iconPath} size={size} />
    <MenuText className={className}>{children}</MenuText>
  </>
);

const MenuHint = ({ children, className = 'ctx-hint', triggerEvent, propsFromTrigger }: any) => (
  <p className={className}>{children}</p>
);

const ICONS = {
  rowAbove:    'M3 8h18M3 4h18M3 12h18M3 16h9',
  rowBelow:    'M3 8h18M3 4h18M3 12h18M15 16h6',
  colLeft:     'M8 3v18M4 3v18M12 3v18M16 3v12',
  colRight:    'M8 3v18M4 3v18M12 3v18M16 12v9',
  deleteRow:   'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  deleteCol:   'M16 3H8v18h8V3zM3 9h5M3 15h5M16 9h5M16 15h5',
  deleteTable: 'M3 3l18 18M3 21l18-18M9 3h6v18H9zM3 9h5M16 9h5M3 15h5M16 15h5',
  merge:       'M4 3h4v18H4zM16 3h4v18h-4zM8 12h8',
  splitV:      'M12 3v18M3 8h9M3 16h9',
  splitH:      'M3 12h18M8 3v9M16 3v9',
  splitGrid:   'M4 4h16v16H4zM12 4v16M4 12h16',
  borderAll:   'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',
  borderOut:   'M3 3h18v18H3z',
  borderIn:    'M9 3v18M15 3v18M3 9h18M3 15h18',
  borderNone:  'M2 22L22 2M2 2l20 20',
  palette:     'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  chevron:     'M9 18l6-6-6-6',
  settings:    'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1.04 1.74l-.22.13a2 2 0 0 1-2 0l-.15-.09A2 2 0 0 0 3.84 6l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.2a2 2 0 0 1-1 1.72l-.15.1a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.1a2 2 0 0 1 2 0l.22.13a2 2 0 0 1 1.04 1.74v.18a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1.04-1.74l.22-.13a2 2 0 0 1 2 0l.15.09a2 2 0 0 0 2.51-3.41l-.15-.1a2 2 0 0 1-1-1.72v-.2a2 2 0 0 1 1-1.72l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.1a2 2 0 0 1-2 0l-.22-.13A2 2 0 0 1 14.22 4V4a2 2 0 0 0-2-2z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  diagonalSlash: 'M6 18L18 6',
  diagonalBackslash: 'M6 6l12 12',
  diagonalCross: 'M6 6l12 12M18 6L6 18',
};

// ── 프리셋 팔레트 ──
const PRESETS = [
  { label: '없음', color: null },
  { label: '노랑', color: '#FEF08A' },
  { label: '하늘', color: '#BAE6FD' },
  { label: '연두', color: '#BBF7D0' },
  { label: '분홍', color: '#FBCFE8' },
  { label: '회색', color: '#F3F4F6' },
  { label: '주황', color: '#FED7AA' },
  { label: '보라', color: '#E9D5FF' },
  { label: '민트', color: '#A7F3D0' },
  { label: '파랑', color: '#BFDBFE' },
  { label: '베이지', color: '#FEF3C7' },
  { label: '흰색', color: '#FFFFFF' },
];

// ── 색상 피커 패널 ──
function ColorPickerPanel({ editor, onClose, anchorX, anchorY }: {
  editor: IEditor; onClose: () => void; anchorX: number; anchorY: number;
}) {
  const [hex, setHex] = useState('#FEF08A');
  const panelRef = useRef<HTMLDivElement>(null);
  const apply = (color: string | null) => {
    const engine = (editor as any).scTableEngine as ScTableEngine | undefined;
    try {
      (editor as any).takeSnapshot?.();
    } catch {}
    if (engine?.setSelectionBackground(color)) {
      editor.triggerEvent?.(10 as any, {});
    }
    editor.focus();
    onClose();
  };
  const panelW = 240, panelH = 380;
  const px = anchorX + panelW > window.innerWidth ? anchorX - panelW : anchorX;
  const py = anchorY + panelH > window.innerHeight ? anchorY - panelH : anchorY;
  useEffect(() => {
    const h = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  return createPortal(
    <div ref={panelRef} className="tbl-color-panel" style={{ top: py, left: px }} onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
      <div className="tbl-color-panel-title">셀 배경색</div>
      <div className="tbl-color-presets">
        {PRESETS.map(({ label, color }) => (
          <button key={label} className="tbl-color-preset" title={label}
            style={{ background: color ?? 'transparent' }} onClick={() => apply(color)}>
            {!color && <span className="tbl-color-none-line" />}
          </button>
        ))}
      </div>
      <div className="tbl-color-divider" />
      <div className="tbl-color-picker-wrap">
        <HexColorPicker color={hex} onChange={setHex} />
      </div>
      <div className="tbl-color-input-row">
        <div className="tbl-color-preview" style={{ background: hex }} />
        <input className="tbl-color-hex-input" value={hex} maxLength={7}
          onChange={e => { const v = e.target.value; if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setHex(v); }}
          onKeyDown={e => { if (e.key === 'Enter' && /^#[0-9a-fA-F]{6}$/.test(hex)) apply(hex); }} />
        <button className="tbl-color-apply-btn" onClick={() => apply(hex)}>적용</button>
      </div>
    </div>,
    document.body,
  );
}

// ── 메인 컴포넌트 ──
interface Props {
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
  editorRef: React.RefObject<IEditor | null>;
}

export default function TableContextMenu({ editorContainerRef, editorRef }: Props) {
  const { show } = useContextMenu({ id: MENU_ID });
  const [colorPicker, setColorPicker] = useState<{ x: number; y: number } | null>(null);
  const [propsModal, setPropsModal] = useState<HTMLTableElement | null>(null);
  const [borderModal, setBorderModal] = useState(false);
  const [splitModal, setSplitModal] = useState(false);
  const closeColor = useCallback(() => setColorPicker(null), []);
  const closeProps = useCallback(() => setPropsModal(null), []);
  const closeBorder = useCallback(() => setBorderModal(false), []);
  const closeSplit = useCallback(() => setSplitModal(false), []);

  useEffect(() => {
    const root = editorContainerRef.current;
    if (!root) return;
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tableEl = target.closest<HTMLTableElement>('table');
      if (!tableEl || !editorRef.current) return;
      const contextTarget = (target.closest('td, th') as HTMLElement | null) ?? tableEl;
      const engine = (editorRef.current as any).scTableEngine as ScTableEngine | undefined;
      e.preventDefault();
      engine?.activateContextSelection(contextTarget);
      show({ event: e });
      window.setTimeout(() => {
        const liveEditor = editorRef.current;
        const liveEngine = liveEditor ? ((liveEditor as any).scTableEngine as ScTableEngine | undefined) : undefined;
        liveEngine?.activateContextSelection(contextTarget);
      }, 0);
    };
    root.addEventListener('contextmenu', onContextMenu);
    return () => root.removeEventListener('contextmenu', onContextMenu);
  }, [editorContainerRef, editorRef, show]);

  const ed = () => editorRef.current!;
  // 작업 전 undo 스냅샷 명시 → Ctrl+Z 복원 가능
  const snap = (editor: IEditor) => { try { (editor as any).takeSnapshot?.(); } catch {} };
  const finalize = (editor: IEditor) => {
    try {
      editor.triggerEvent?.(10 as any, {});
      editor.focus();
    } catch {}
  };
  const getEngine = (editor: IEditor) => (editor as any).scTableEngine as ScTableEngine | undefined;
  const runTable = (action: (engine: ScTableEngine) => boolean) => () => {
    const editor = ed();
    const engine = getEngine(editor);
    if (!engine) return;
    snap(editor);
    if (action(engine)) {
      finalize(editor);
    }
  };
  const border = (preset: ScBorderPreset) => runTable(engine => engine.applySelectionBorders(preset));
  const diagonal = (mode: ScDiagonalMode) => runTable(engine => engine.applySelectionDiagonal(mode));
  const resize = (type: 'width' | 'height', delta: number) => () => {
    const editor = ed();
    const engine = getEngine(editor);
    if (!engine) return;
    snap(editor);
    const changed = type === 'width'
      ? engine.adjustColumnWidths(delta)
      : engine.adjustRowHeights(delta);
    if (changed) {
      finalize(editor);
    }
  };

  return (
    <>
      <Menu id={MENU_ID} animation="fade" className="tbl-ctx-root">
        {/* 행 삽입 */}
        <Submenu label={<MenuRow iconPath={ICONS.rowAbove}>행 삽입</MenuRow>} arrow={<Icon path={ICONS.chevron} size={12} />}>
          <Item onClick={runTable(engine => engine.insertRow('above'))}><MenuRow iconPath={ICONS.rowAbove}>위에 행 추가</MenuRow></Item>
          <Item onClick={runTable(engine => engine.insertRow('below'))}><MenuRow iconPath={ICONS.rowBelow}>아래에 행 추가</MenuRow></Item>
        </Submenu>

        {/* 열 삽입 */}
        <Submenu label={<MenuRow iconPath={ICONS.colLeft}>열 삽입</MenuRow>} arrow={<Icon path={ICONS.chevron} size={12} />}>
          <Item onClick={runTable(engine => engine.insertColumn('left'))}><MenuRow iconPath={ICONS.colLeft}>왼쪽에 열 추가</MenuRow></Item>
          <Item onClick={runTable(engine => engine.insertColumn('right'))}><MenuRow iconPath={ICONS.colRight}>오른쪽에 열 추가</MenuRow></Item>
        </Submenu>

        <Separator />

        {/* 삭제 */}
        <Submenu label={<MenuRow iconPath={ICONS.deleteRow} className="danger-label">행 / 열 삭제</MenuRow>} arrow={<Icon path={ICONS.chevron} size={12} />}>
          <Item className="danger-item" onClick={runTable(engine => engine.deleteRows())}><MenuRow iconPath={ICONS.deleteRow}>현재 행 삭제</MenuRow></Item>
          <Item className="danger-item" onClick={runTable(engine => engine.deleteColumns())}><MenuRow iconPath={ICONS.deleteCol}>현재 열 삭제</MenuRow></Item>
          <Item className="danger-item" onClick={runTable(engine => engine.deleteTable())}><MenuRow iconPath={ICONS.deleteTable}>표 전체 삭제</MenuRow></Item>
        </Submenu>

        <Separator />

        {/* 셀 병합/분할 */}
        <Submenu label={<MenuRow iconPath={ICONS.merge}>셀 합치기 / 나누기</MenuRow>} arrow={<Icon path={ICONS.chevron} size={12} />}>
          <Item onClick={runTable(engine => engine.mergeSelection())}><MenuRow iconPath={ICONS.merge}>셀 합치기</MenuRow></Item>
          <Item onClick={runTable(engine => engine.splitSelection())}><MenuRow iconPath={ICONS.splitH}>병합 해제</MenuRow></Item>
          <Item onClick={() => setSplitModal(true)}><MenuRow iconPath={ICONS.splitGrid}>셀 나누기...</MenuRow></Item>
        </Submenu>

        <Separator />

        <Submenu label={<MenuRow iconPath={ICONS.settings}>셀 속성</MenuRow>} arrow={<Icon path={ICONS.chevron} size={12} />}>
          <Item onClick={runTable(engine => engine.setSelectionVerticalAlign('top'))}><MenuText>세로 위쪽</MenuText></Item>
          <Item onClick={runTable(engine => engine.setSelectionVerticalAlign('middle'))}><MenuText>세로 가운데</MenuText></Item>
          <Item onClick={runTable(engine => engine.setSelectionVerticalAlign('bottom'))}><MenuText>세로 아래쪽</MenuText></Item>
          <Separator />
          <Item onClick={runTable(engine => engine.setSelectionWhiteSpace('nowrap'))}><MenuText>한 줄 입력</MenuText></Item>
          <Item onClick={runTable(engine => engine.setSelectionWhiteSpace('normal'))}><MenuText>자동 줄바꿈</MenuText></Item>
          <Separator />
          <Item onClick={runTable(engine => engine.setSelectionPaddingPreset('compact'))}><MenuText>여백 촘촘</MenuText></Item>
          <Item onClick={runTable(engine => engine.setSelectionPaddingPreset('comfortable'))}><MenuText>여백 보통</MenuText></Item>
          <Item onClick={runTable(engine => engine.setSelectionPaddingPreset('spacious'))}><MenuText>여백 넉넉</MenuText></Item>
          <Separator />
          <Item onClick={runTable(engine => engine.setSelectionNumericStyle('numeric'))}><MenuText>숫자형 정렬</MenuText></Item>
          <Item onClick={runTable(engine => engine.setSelectionNumericStyle('default'))}><MenuText>일반 텍스트</MenuText></Item>
        </Submenu>

        <Submenu label={<MenuRow iconPath={ICONS.settings}>표 정리</MenuRow>} arrow={<Icon path={ICONS.chevron} size={12} />}>
          <Item onClick={runTable(engine => engine.fitTableWidth())}><MenuText>표 폭 맞춤</MenuText></Item>
          <Item onClick={runTable(engine => engine.distributeColumns())}><MenuText>열 너비 같게</MenuText></Item>
          <Item onClick={runTable(engine => engine.distributeRows())}><MenuText>행 높이 같게</MenuText></Item>
        </Submenu>

        <Separator />

        {/* 테두리 */}
        <Submenu label={<MenuRow iconPath={ICONS.borderAll}>표 테두리</MenuRow>} arrow={<Icon path={ICONS.chevron} size={12} />}>
          <Item onClick={border('all')}><MenuRow iconPath={ICONS.borderAll}>테두리 모두</MenuRow></Item>
          <Item onClick={border('outside')}><MenuRow iconPath={ICONS.borderOut}>외부 테두리만</MenuRow></Item>
          <Item onClick={border('inside')}><MenuRow iconPath={ICONS.borderIn}>내부 테두리만</MenuRow></Item>
          <Separator />
          <Item onClick={border('top')}><MenuText>윗선만</MenuText></Item>
          <Item onClick={border('bottom')}><MenuText>아랫선만</MenuText></Item>
          <Item onClick={border('left')}><MenuText>왼쪽선만</MenuText></Item>
          <Item onClick={border('right')}><MenuText>오른쪽선만</MenuText></Item>
          <Separator />
          <Item onClick={border('none')}><MenuRow iconPath={ICONS.borderNone}>테두리 없음</MenuRow></Item>
          <Item onClick={() => setBorderModal(true)}><MenuRow iconPath={ICONS.settings}>테두리 상세...</MenuRow></Item>
        </Submenu>

        <Submenu label={<MenuRow iconPath={ICONS.diagonalCross}>대각선 / X</MenuRow>} arrow={<Icon path={ICONS.chevron} size={12} />}>
          <Item onClick={diagonal('slash')}><MenuRow iconPath={ICONS.diagonalSlash}>대각선 /</MenuRow></Item>
          <Item onClick={diagonal('backslash')}><MenuRow iconPath={ICONS.diagonalBackslash}>대각선 \</MenuRow></Item>
          <Item onClick={diagonal('cross')}><MenuRow iconPath={ICONS.diagonalCross}>엑스 표시</MenuRow></Item>
          <Item onClick={diagonal('none')}><MenuRow iconPath={ICONS.borderNone}>대각선 제거</MenuRow></Item>
        </Submenu>

        <Separator />

        {/* 크기 조절 (HWP 스타일 단축키 안내 포함) */}
        <Submenu label={<MenuRow iconPath={ICONS.settings}>크기 조절 (Ctrl+방향키)</MenuRow>} arrow={<Icon path={ICONS.chevron} size={12} />}>
          <Item onClick={resize('width', 10)}>너비 늘이기 <RightSlot>Ctrl+→</RightSlot></Item>
          <Item onClick={resize('width', -10)}>너비 줄이기 <RightSlot>Ctrl+←</RightSlot></Item>
          <Separator />
          <Item onClick={resize('height', 10)}>높이 늘이기 <RightSlot>Ctrl+↓</RightSlot></Item>
          <Item onClick={resize('height', -10)}>높이 줄이기 <RightSlot>Ctrl+↑</RightSlot></Item>
          <Separator />
          <Item disabled closeOnClick={false} className="ctx-hint-item">
            <MenuHint>※ Shift+Esc 표 밖으로 이동, F5 범위 순환, Tab / Shift+Tab 셀 이동, Ctrl+방향키 줄/칸 전체와 표 크기 조절, Alt+방향키 줄/칸 전체 조절, Shift+방향키 현재 셀 조절, Ctrl+Shift+방향키 행/열 삽입, Shift+드래그 현재 셀 경계 조절</MenuHint>
          </Item>
        </Submenu>

        <Separator />

        {/* 셀 배경색 */}
        <Item onClick={({ triggerEvent }) => {
          const e = triggerEvent as MouseEvent;
          setColorPicker({ x: e.clientX ?? 0, y: e.clientY ?? 0 });
        }}>
          <MenuRow iconPath={ICONS.palette}>셀 배경색</MenuRow>
          <RightSlot><Icon path={ICONS.chevron} size={12} /></RightSlot>
        </Item>

        <Separator />

        {/* 개체 속성 */}
        <Item onClick={({ triggerEvent }) => {
          const table = (triggerEvent.target as HTMLElement).closest('table');
          if (table) setPropsModal(table);
        }}>
          <MenuRow iconPath={ICONS.settings}>개체 속성</MenuRow>
          <RightSlot>P</RightSlot>
        </Item>
      </Menu>

      {colorPicker && editorRef.current && (
        <ColorPickerPanel
          editor={editorRef.current}
          onClose={closeColor}
          anchorX={colorPicker.x}
          anchorY={colorPicker.y}
        />
      )}

      {propsModal && editorRef.current && (
        <TablePropertiesModal
          table={propsModal}
          onClose={closeProps}
          onApply={(props) => {
            const editor = editorRef.current!;
            snap(editor);
            
            // mm to px (정밀 보정 유틸리티 사용)
            propsModal.classList.add('sc-table-standard');
            const targetW = `${mmToPx(props.width)}px`;
            const targetH = `${mmToPx(props.height)}px`;
            
            propsModal.style.width = targetW;
            propsModal.style.minWidth = targetW;
            propsModal.style.maxWidth = targetW;
            propsModal.style.height = targetH;
            propsModal.style.minHeight = targetH;
            
            // Inline/Block
            propsModal.style.display = props.isInline ? 'inline-table' : 'table';
            
            // Wrapping (Simplified HWP behavior for Web)
            if (props.wrapping === 'side') {
              propsModal.style.float = 'left';
              propsModal.style.position = 'static';
            } else if (props.wrapping === 'topBottom') {
              propsModal.style.float = 'none';
              propsModal.style.position = 'static';
            } else if (props.wrapping === 'front') {
              propsModal.style.position = 'relative';
              propsModal.style.zIndex = '1';
              propsModal.style.float = 'none';
            } else {
              propsModal.style.float = 'none';
              propsModal.style.position = 'static';
            }
            
            // Cell Padding (Enforce with !important and set individual sides)
            propsModal.querySelectorAll('td, th').forEach((node: any) => {
              const cell = node as HTMLElement;
              cell.style.setProperty('padding-top', `${props.cellPadding.top}px`, 'important');
              cell.style.setProperty('padding-bottom', `${props.cellPadding.bottom}px`, 'important');
              cell.style.setProperty('padding-left', `${props.cellPadding.left}px`, 'important');
              cell.style.setProperty('padding-right', `${props.cellPadding.right}px`, 'important');
            });
            
            // Outside Margin (mm to px - Enforce with !important)
            propsModal.style.setProperty('margin-top', `${mmToPx(props.margin.top)}px`, 'important');
            propsModal.style.setProperty('margin-bottom', `${mmToPx(props.margin.bottom)}px`, 'important');
            propsModal.style.setProperty('margin-left', `${mmToPx(props.margin.left)}px`, 'important');
            propsModal.style.setProperty('margin-right', `${mmToPx(props.margin.right)}px`, 'important');
            
            editor.focus();
            // Trigger change notification
            // RoosterJS snapshot covers the DOM change.
            finalize(editor);
          }}
        />
      )}

      {splitModal && editorRef.current && (
        <TableSplitModal
          onClose={closeSplit}
          onApply={(rows, cols) => {
            const editor = editorRef.current!;
            snap(editor);
            const engine = getEngine(editor);
            if (engine?.splitActiveCell(rows, cols)) {
              finalize(editor);
            }
            closeSplit();
          }}
        />
      )}

      {borderModal && editorRef.current && (
        <TableBorderModal
          onClose={closeBorder}
          onApply={({ preset, color, width, style }) => {
            const editor = editorRef.current!;
            snap(editor);
            const engine = getEngine(editor);
            if (engine?.applySelectionBorders(preset, { color, width, style })) {
              finalize(editor);
            }
            closeBorder();
          }}
        />
      )}
    </>
  );
}

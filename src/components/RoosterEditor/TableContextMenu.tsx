import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Menu, Item, Submenu, Separator, useContextMenu, RightSlot } from 'react-contexify';
import { HexColorPicker } from 'react-colorful';
import { mmToPx } from './utils/TableUtils';
import TablePropertiesModal, { TableProps } from './TablePropertiesModal';
import 'react-contexify/ReactContexify.css';
import {
  editTable,
  applyTableBorderFormat,
  setTableCellShade,
} from 'roosterjs-content-model-api';
import type { IEditor } from 'roosterjs-content-model-types';
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
  alignLeft:   'M3 6h18M3 12h12M3 18h15',
  alignCenter: 'M3 6h18M6 12h12M4.5 18h15',
  alignRight:  'M3 6h18M9 12h12M6 18h15',
  borderAll:   'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',
  borderOut:   'M3 3h18v18H3z',
  borderIn:    'M9 3v18M15 3v18M3 9h18M3 15h18',
  borderNone:  'M2 22L22 2M2 2l20 20',
  palette:     'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  chevron:     'M9 18l6-6-6-6',
  settings:    'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1.04 1.74l-.22.13a2 2 0 0 1-2 0l-.15-.09A2 2 0 0 0 3.84 6l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.2a2 2 0 0 1-1 1.72l-.15.1a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.1a2 2 0 0 1 2 0l.22.13a2 2 0 0 1 1.04 1.74v.18a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1.04-1.74l.22-.13a2 2 0 0 1 2 0l.15.09a2 2 0 0 0 2.51-3.41l-.15-.1a2 2 0 0 1-1-1.72v-.2a2 2 0 0 1 1-1.72l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.1a2 2 0 0 1-2 0l-.22-.13A2 2 0 0 1 14.22 4V4a2 2 0 0 0-2-2z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
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
  const apply = (color: string | null) => { setTableCellShade(editor, color); editor.focus(); onClose(); };
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
  const closeColor = useCallback(() => setColorPicker(null), []);
  const closeProps = useCallback(() => setPropsModal(null), []);

  useEffect(() => {
    const root = editorContainerRef.current;
    if (!root) return;
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tableEl = target.closest<HTMLTableElement>('table');
      if (!tableEl || !editorRef.current) return;
      e.preventDefault();
      show({ event: e });
    };
    root.addEventListener('contextmenu', onContextMenu);
    return () => root.removeEventListener('contextmenu', onContextMenu);
  }, [editorContainerRef, editorRef, show]);

  const ed = () => editorRef.current!;
  // 작업 전 undo 스냅샷 명시 → Ctrl+Z 복원 가능
  const snap = (editor: IEditor) => { try { (editor as any).takeSnapshot?.(); } catch {} };
  const e = (op: string) => () => {
    const editor = ed();
    snap(editor);
    editTable(editor, op as any);
  };
  const border = (type: string, color = '#333', style = 'solid', width = '1pt') => () => {
    const editor = ed();
    snap(editor);
    applyTableBorderFormat(editor, { color, style, width }, type as any);
  };
  const resize = (type: 'width' | 'height', delta: number) => ({ triggerEvent }: any) => {
    const editor = ed();
    snap(editor);
    const cell = (triggerEvent.target as HTMLElement).closest('td, th') as HTMLElement;
    if (cell) {
      const cur = type === 'width' ? cell.offsetWidth : cell.offsetHeight;
      cell.style[type] = `${Math.max(10, cur + delta)}px`;
    }
    editor.focus();
  };

  return (
    <>
      <Menu id={MENU_ID} animation="fade" className="tbl-ctx-root">
        {/* 행 삽입 */}
        <Submenu label={<><Icon path={ICONS.rowAbove} /><span>행 삽입</span></>} arrow={<Icon path={ICONS.chevron} size={12} />}>
          <Item onClick={e('insertAbove')}><Icon path={ICONS.rowAbove} /><span>위에 행 추가</span></Item>
          <Item onClick={e('insertBelow')}><Icon path={ICONS.rowBelow} /><span>아래에 행 추가</span></Item>
        </Submenu>

        {/* 열 삽입 */}
        <Submenu label={<><Icon path={ICONS.colLeft} /><span>열 삽입</span></>} arrow={<Icon path={ICONS.chevron} size={12} />}>
          <Item onClick={e('insertLeft')}><Icon path={ICONS.colLeft} /><span>왼쪽에 열 추가</span></Item>
          <Item onClick={e('insertRight')}><Icon path={ICONS.colRight} /><span>오른쪽에 열 추가</span></Item>
        </Submenu>

        <Separator />

        {/* 삭제 */}
        <Submenu label={<><Icon path={ICONS.deleteRow} /><span className="danger-label">행 / 열 삭제</span></>} arrow={<Icon path={ICONS.chevron} size={12} />}>
          <Item className="danger-item" onClick={e('deleteRow')}><Icon path={ICONS.deleteRow} /><span>현재 행 삭제</span></Item>
          <Item className="danger-item" onClick={e('deleteColumn')}><Icon path={ICONS.deleteCol} /><span>현재 열 삭제</span></Item>
          <Item className="danger-item" onClick={e('deleteTable')}><Icon path={ICONS.deleteTable} /><span>표 전체 삭제</span></Item>
        </Submenu>

        <Separator />

        {/* 셀 병합/분할 */}
        <Submenu label={<><Icon path={ICONS.merge} /><span>셀 합치기 / 나누기</span></>} arrow={<Icon path={ICONS.chevron} size={12} />}>
          <Item onClick={e('mergeCells')}><Icon path={ICONS.merge} /><span>셀 합치기</span></Item>
          <Item onClick={e('splitVertically')}><Icon path={ICONS.splitH} /><span>수평 분할 (행 추가)</span></Item>
          <Item onClick={e('splitHorizontally')}><Icon path={ICONS.splitV} /><span>수직 분할 (열 추가)</span></Item>
        </Submenu>

        <Separator />

        {/* 정렬 */}
        <Submenu label={<><Icon path={ICONS.alignCenter} /><span>표 정렬</span></>} arrow={<Icon path={ICONS.chevron} size={12} />}>
          <Item onClick={e('alignLeft')}><Icon path={ICONS.alignLeft} /><span>왼쪽 정렬</span></Item>
          <Item onClick={e('alignCenter')}><Icon path={ICONS.alignCenter} /><span>가운데 정렬</span></Item>
          <Item onClick={e('alignRight')}><Icon path={ICONS.alignRight} /><span>오른쪽 정렬</span></Item>
        </Submenu>

        <Separator />

        {/* 테두리 */}
        <Submenu label={<><Icon path={ICONS.borderAll} /><span>표 테두리</span></>} arrow={<Icon path={ICONS.chevron} size={12} />}>
          <Item onClick={border('allBorders')}><Icon path={ICONS.borderAll} /><span>테두리 모두</span></Item>
          <Item onClick={border('outsideBorders')}><Icon path={ICONS.borderOut} /><span>외부 테두리만</span></Item>
          <Item onClick={border('insideBorders', '#aaa')}><Icon path={ICONS.borderIn} /><span>내부 테두리만</span></Item>
          <Item onClick={border('allBorders', 'transparent', 'none', '0')}><Icon path={ICONS.borderNone} /><span>테두리 없음</span></Item>
        </Submenu>

        <Separator />

        {/* 크기 조절 (HWP 스타일 단축키 안내 포함) */}
        <Submenu label={<><Icon path={ICONS.settings} /><span>크기 조절 (Ctrl+방향키)</span></>} arrow={<Icon path={ICONS.chevron} size={12} />}>
          <Item onClick={resize('width', 10)}>너비 늘이기 <RightSlot>Ctrl+→</RightSlot></Item>
          <Item onClick={resize('width', -10)}>너비 줄이기 <RightSlot>Ctrl+←</RightSlot></Item>
          <Separator />
          <Item onClick={resize('height', 10)}>높이 늘이기 <RightSlot>Ctrl+↓</RightSlot></Item>
          <Item onClick={resize('height', -10)}>높이 줄이기 <RightSlot>Ctrl+↑</RightSlot></Item>
          <Separator />
          <p className="ctx-hint">※ F5를 눌러 셀을 선택하고 이동할 수 있습니다.</p>
        </Submenu>

        <Separator />

        {/* 셀 배경색 */}
        <Item onClick={({ triggerEvent }) => {
          const e = triggerEvent as MouseEvent;
          setColorPicker({ x: e.clientX ?? 0, y: e.clientY ?? 0 });
        }}>
          <Icon path={ICONS.palette} />
          <span>셀 배경색</span>
          <RightSlot><Icon path={ICONS.chevron} size={12} /></RightSlot>
        </Item>

        <Separator />

        {/* 개체 속성 */}
        <Item onClick={({ triggerEvent }) => {
          const table = (triggerEvent.target as HTMLElement).closest('table');
          if (table) setPropsModal(table);
        }}>
          <Icon path={ICONS.settings} />
          <span>개체 속성</span>
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
          }}
        />
      )}
    </>
  );
}

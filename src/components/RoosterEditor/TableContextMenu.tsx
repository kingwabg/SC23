import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  editTable,
  applyTableBorderFormat,
  setTableCellShade,
} from 'roosterjs-content-model-api';
import type { IEditor } from 'roosterjs-content-model-types';
import './TableContextMenu.css';

interface MenuItem {
  label: string;
  icon?: string;
  action?: () => void;
  divider?: boolean;
  sub?: MenuItem[];
}

interface Props {
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
  editorRef: React.RefObject<IEditor | null>;
}

function buildMenu(editor: IEditor): MenuItem[] {
  const e = (op: string) => () => editTable(editor, op as any);
  return [
    {
      label: '행/열 추가',
      icon: '➕',
      sub: [
        { label: '위에 행 추가', action: e('insertAbove') },
        { label: '아래에 행 추가', action: e('insertBelow') },
        { label: '왼쪽에 열 추가', action: e('insertLeft') },
        { label: '오른쪽에 열 추가', action: e('insertRight') },
      ],
    },
    {
      label: '행/열 삭제',
      icon: '🗑️',
      sub: [
        { label: '현재 행 삭제', action: e('deleteRow') },
        { label: '현재 열 삭제', action: e('deleteColumn') },
        { label: '표 전체 삭제', action: e('deleteTable') },
      ],
    },
    { label: '', divider: true },
    {
      label: '셀 합치기 / 나누기',
      icon: '⊞',
      sub: [
        { label: '셀 합치기', action: e('mergeCells') },
        { label: '수직 분할', action: e('splitVertically') },
        { label: '수평 분할', action: e('splitHorizontally') },
      ],
    },
    { label: '', divider: true },
    {
      label: '표 정렬',
      icon: '◀▶',
      sub: [
        { label: '왼쪽 정렬', action: e('alignLeft') },
        { label: '가운데 정렬', action: e('alignCenter') },
        { label: '오른쪽 정렬', action: e('alignRight') },
      ],
    },
    { label: '', divider: true },
    {
      label: '표 테두리',
      icon: '⬜',
      sub: [
        {
          label: '테두리 모두',
          action: () => applyTableBorderFormat(editor, { color: '#333', style: 'solid', width: '1pt' }, 'allBorders'),
        },
        {
          label: '외부 테두리만',
          action: () => applyTableBorderFormat(editor, { color: '#333', style: 'solid', width: '1pt' }, 'outsideBorders'),
        },
        {
          label: '내부 테두리만',
          action: () => applyTableBorderFormat(editor, { color: '#ccc', style: 'solid', width: '1pt' }, 'insideBorders'),
        },
        {
          label: '테두리 없음',
          action: () => applyTableBorderFormat(editor, { color: 'transparent', style: 'none', width: '0' }, 'allBorders'),
        },
      ],
    },
    {
      label: '셀 배경색',
      icon: '🎨',
      sub: [
        { label: '없음', action: () => setTableCellShade(editor, null) },
        { label: '노랑', action: () => setTableCellShade(editor, '#FEF08A') },
        { label: '하늘', action: () => setTableCellShade(editor, '#BAE6FD') },
        { label: '연두', action: () => setTableCellShade(editor, '#BBF7D0') },
        { label: '연분홍', action: () => setTableCellShade(editor, '#FBCFE8') },
        { label: '연회색', action: () => setTableCellShade(editor, '#F3F4F6') },
      ],
    },
  ];
}

export default function TableContextMenu({ editorContainerRef, editorRef }: Props) {
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const [openSub, setOpenSub] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => { setMenu(null); setOpenSub(null); }, []);

  useEffect(() => {
    const root = editorContainerRef.current;
    if (!root) return;

    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const tableEl = target.closest<HTMLTableElement>('table');
      const editor = editorRef.current;
      if (!tableEl || !editor) return;

      e.preventDefault();
      const items = buildMenu(editor);
      setMenu({ x: e.clientX, y: e.clientY, items });
      setOpenSub(null);
    };

    root.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('click', close);
    return () => {
      root.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('click', close);
    };
  }, [editorContainerRef, editorRef, close]);

  if (!menu) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="tbl-ctx-menu"
      style={{ top: menu.y, left: menu.x }}
      onClick={(e) => e.stopPropagation()}
    >
      {menu.items.map((item, i) => {
        if (item.divider) return <div key={i} className="tbl-ctx-divider" />;

        if (item.sub) {
          return (
            <div key={i} className="tbl-ctx-item tbl-ctx-has-sub"
              onMouseEnter={() => setOpenSub(i)}
              onMouseLeave={() => setOpenSub(null)}>
              <span className="tbl-ctx-icon">{item.icon}</span>
              <span className="tbl-ctx-label">{item.label}</span>
              <span className="tbl-ctx-arrow">›</span>
              {openSub === i && (
                <div className="tbl-ctx-submenu">
                  {item.sub.map((sub, j) => (
                    <div key={j} className="tbl-ctx-item"
                      onClick={() => { sub.action?.(); editorRef.current?.focus(); close(); }}>
                      {sub.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={i} className="tbl-ctx-item"
            onClick={() => { item.action?.(); editorRef.current?.focus(); close(); }}>
            <span className="tbl-ctx-icon">{item.icon}</span>
            <span className="tbl-ctx-label">{item.label}</span>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

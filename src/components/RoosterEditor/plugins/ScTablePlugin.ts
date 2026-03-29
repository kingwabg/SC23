import { EditorPlugin, IEditor, PluginEvent } from 'roosterjs-content-model-types';
import { exportContent } from 'roosterjs-content-model-core';
import { ScTableEngine } from './ScTableEngine';

/**
 * 🔗 ScTablePlugin (Bridge)
 * RoosterJS와 독립형 ScTableEngine 사이를 연결하는 브리지 플러그인입니다.
 */
export class ScTablePlugin implements EditorPlugin {
  private editor: IEditor | null = null;
  private engine: ScTableEngine;
  private onHtmlChange: (html: string) => void;
  private isResizeInteractionActive = false;
  private static readonly TABLE_CLICK_SELECT_THRESHOLD = 4;
  private static readonly BOUNDARY_CURSOR_THRESHOLD = 10;

  constructor(onHtmlChange: (html: string) => void) {
    this.onHtmlChange = onHtmlChange;
    // 엔진 인스턴스 초기화 (모델 데이터 기반 알림 콜백 주입)
    this.engine = new ScTableEngine((html) => {
      // 에디터 변경 알림 (상위 React 컴포넌트로 전달)
      if (this.editor) this.onHtmlChange(exportContent(this.editor));
    });
  }

  getName() { return 'ScTablePlugin'; }

  initialize(editor: IEditor) {
    this.editor = editor;
    (editor as any).scTableEngine = this.engine; // 외부 컴포넌트 접근용 익스포트
    const body = editor.getDocument().body;
    
    // 🖱️ 모든 포인터 이벤트를 독립 엔진으로 위임
    body.addEventListener('pointerdown', this.onPointerDown);
    body.addEventListener('pointermove', this.onPointerMove);
    body.addEventListener('pointerleave', this.onPointerLeave);
    body.addEventListener('keydown', this.onKeyDown, true);
    document.addEventListener('mousedown', this.onClickOutside);
    document.addEventListener('selectionchange', this.onSelectionChange);
    this.normalizeAllTables();
  }

  dispose() {
    if (!this.editor) return;
    const body = this.editor.getDocument().body;
    body.removeEventListener('pointerdown', this.onPointerDown);
    body.removeEventListener('pointermove', this.onPointerMove);
    body.removeEventListener('pointerleave', this.onPointerLeave);
    body.removeEventListener('keydown', this.onKeyDown, true);
    document.removeEventListener('mousedown', this.onClickOutside);
    document.removeEventListener('selectionchange', this.onSelectionChange);
    this.clearBoundaryCursor();
    this.editor = null;
  }

  onPluginEvent(event: PluginEvent) {
    // 0: BeforePaste, 6: ContentChanged, 10: Edit
    const type = event.eventType as unknown as number;
    if ([0, 6, 10].includes(type)) {
      this.normalizeAllTables();
    }

    if (this.editor && [6, 10].includes(type)) {
      this.onHtmlChange(exportContent(this.editor));
    }
  }

  private normalizeAllTables() {
    if (!this.editor) return;
    const root = (this.editor.getDOMHelper() as { contentDiv?: HTMLElement } | undefined)?.contentDiv;
    if (!root) {
      return;
    }

    const tables = root.querySelectorAll('table');
    tables.forEach(table => {
      // 🏗️ 엔진을 통한 자동 구조화 (colgroup, table-layout 등)
      this.engine.buildModel(table as HTMLTableElement);
      this.engine.syncToDOM();
    });
    this.ensureEditableTail(root);
  }

  private ensureEditableTail(root: HTMLElement) {
    const lastChild = root.lastChild;
    if (lastChild instanceof HTMLElement && lastChild.matches('[data-sc-tail-block="true"]')) {
      return;
    }

    const trailingNodes = Array.from(root.childNodes).filter(node => !this.isIgnorableNode(node));
    const lastNode = trailingNodes[trailingNodes.length - 1] ?? null;
    if (!(lastNode instanceof HTMLTableElement)) {
      return;
    }

    const tail = root.ownerDocument.createElement('div');
    tail.setAttribute('data-sc-tail-block', 'true');
    tail.appendChild(root.ownerDocument.createElement('br'));
    root.appendChild(tail);
  }

  // ── [Event Relay] 엔진으로 이벤트 전달 ──
  private onPointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement;
    const cell = target.closest('td, th') as HTMLTableCellElement;
    if (!cell) return;

    // 우클릭/보조 버튼은 기존 선택을 건드리지 않고 context menu 흐름에 맡긴다.
    if (e.button !== 0) {
      return;
    }

    if (e.shiftKey && this.isNearCellBoundary(cell, e.clientX, e.clientY)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // 엔진 시작
    const interactionType = this.engine.handleDown(e, target);
    if (!interactionType) {
      return;
    }

    this.isResizeInteractionActive = interactionType === 'resize';
    if (interactionType !== 'resize') {
      this.editor?.focus();
    }

    const pointerDownX = e.clientX;
    const pointerDownY = e.clientY;
    const interactionTable = cell.closest('table') as HTMLTableElement | null;
    
    // 후속 이벤트 리스너 (엔진이 포인터를 캡처하므로 window에서 추적)
    const onPointerMove = (moveEvt: PointerEvent) => this.engine.handleMove(moveEvt);
    const onMouseMove = (moveEvt: MouseEvent) => this.engine.handleMove(moveEvt);
    let finished = false;
    const finishDrag = (upEvt: PointerEvent | MouseEvent) => {
      if (finished) {
        return;
      }
      finished = true;

      const shouldSnapshot = this.engine.handleUp(upEvt);
      const movedDistance = Math.max(
        Math.abs(upEvt.clientX - pointerDownX),
        Math.abs(upEvt.clientY - pointerDownY),
      );
      const shouldSelectTable =
        interactionType === 'select' &&
        movedDistance <= ScTablePlugin.TABLE_CLICK_SELECT_THRESHOLD &&
        interactionTable;

      window.requestAnimationFrame(() => {
        this.isResizeInteractionActive = false;
      });
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('mouseup', onMouseUp);
      if (shouldSelectTable) {
        this.engine.deselectAllTables();
        shouldSelectTable.classList.add('sc-selected-table');
      }
      if (shouldSnapshot) {
        this.editor?.takeSnapshot();
      }
    };
    const onPointerUp = (upEvt: PointerEvent) => finishDrag(upEvt);
    const onMouseUp = (upEvt: MouseEvent) => finishDrag(upEvt);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('mouseup', onMouseUp);
  };

  private isNearCellBoundary(cell: HTMLTableCellElement, clientX: number, clientY: number) {
    const rect = cell.getBoundingClientRect();
    const edgeDistance = Math.min(
      Math.abs(clientX - rect.left),
      Math.abs(clientX - rect.right),
      Math.abs(clientY - rect.top),
      Math.abs(clientY - rect.bottom),
    );

    return edgeDistance <= ScTablePlugin.BOUNDARY_CURSOR_THRESHOLD;
  }

  private onPointerMove = (e: PointerEvent) => {
    if (!this.editor) {
      return;
    }

    if (this.isResizeInteractionActive || e.buttons !== 0 || e.shiftKey) {
      this.clearBoundaryCursor();
      return;
    }

    const target = e.target as HTMLElement | null;
    if (
      !target ||
      target.closest('.tbl-overlay-container') ||
      target.closest('.contexify') ||
      target.closest('.tbl-color-panel')
    ) {
      this.clearBoundaryCursor();
      return;
    }

    const cell = target.closest('td, th') as HTMLTableCellElement | null;
    if (!cell) {
      this.clearBoundaryCursor();
      return;
    }

    const rect = cell.getBoundingClientRect();
    const rightDistance = Math.abs(e.clientX - rect.right);
    const bottomDistance = Math.abs(e.clientY - rect.bottom);
    const nearRight = rightDistance < ScTablePlugin.BOUNDARY_CURSOR_THRESHOLD;
    const nearBottom = bottomDistance < ScTablePlugin.BOUNDARY_CURSOR_THRESHOLD;

    let cursor = '';
    if (nearRight || nearBottom) {
      cursor =
        nearRight && (!nearBottom || rightDistance <= bottomDistance)
          ? 'col-resize'
          : 'row-resize';
    }

    this.setBoundaryCursor(cursor);
  };

  private onPointerLeave = () => {
    this.clearBoundaryCursor();
  };

  private setBoundaryCursor(cursor: string) {
    if (!this.editor) {
      return;
    }

    this.editor.getDocument().body.style.cursor = cursor;
  }

  private clearBoundaryCursor() {
    this.setBoundaryCursor('');
  }

  private onClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('.tbl-overlay-container') ||
      target.closest('.tbl-move-bar') ||
      target.closest('.tbl-handle') ||
      target.closest('.contexify') ||
      target.closest('.tbl-color-panel')
    ) {
      return;
    }

    if (!target.closest('table') && !target.closest('.rooster-toolbar')) {
      this.engine.deselectAllTables();
      this.engine.deselectAllCells(true);
    }
  };

  private onSelectionChange = () => {
    if (!this.editor) {
      return;
    }

    if (this.isResizeInteractionActive) {
      return;
    }

    const doc = this.editor.getDocument();
    const selectedTable = doc.querySelector('.sc-selected-table') as HTMLTableElement | null;
    if (!selectedTable) {
      return;
    }

    const activeElement = (doc.activeElement as HTMLElement | null) ?? (document.activeElement as HTMLElement | null);
    if (activeElement?.closest('.rooster-toolbar')) {
      return;
    }

    const selection = doc.getSelection?.() ?? window.getSelection();
    const anchorNode = selection?.anchorNode ?? null;
    const anchorElement = anchorNode
      ? anchorNode.nodeType === Node.TEXT_NODE
        ? anchorNode.parentElement
        : (anchorNode as HTMLElement)
      : null;

    if (anchorElement?.closest('table') === selectedTable || anchorElement?.closest('.rooster-toolbar')) {
      return;
    }

    this.engine.deselectAllTables();
    this.engine.deselectAllCells(true);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.editor) {
      return;
    }

    if (this.handleDeleteKey(e)) {
      return;
    }

    const target = e.target as HTMLElement | null;
    const inTable = Boolean(target?.closest('td, th, table')) || Boolean(this.editor.getDocument().querySelector('.sc-selected-table'));
    if (!inTable) {
      return;
    }

    let handled = false;

    if (e.key === 'Tab') {
      handled = this.engine.navigateSelection(e.shiftKey ? 'prev' : 'next');
    } else if (e.key === 'F5') {
      handled = this.engine.cycleSelectionScope(e.shiftKey ? -1 : 1);
    } else if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && e.key === 'Escape') {
      handled = this.engine.exitTable();
    } else if (e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey) {
      if (e.key === 'ArrowUp') {
        handled = this.engine.insertRow('above');
      } else if (e.key === 'ArrowDown') {
        handled = this.engine.insertRow('below');
      } else if (e.key === 'ArrowLeft') {
        handled = this.engine.insertColumn('left');
      } else if (e.key === 'ArrowRight') {
        handled = this.engine.insertColumn('right');
      }
    } else if (e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 'm') {
        handled = this.engine.mergeSelection();
      } else if (key === 'u') {
        handled = this.engine.splitSelection();
      } else if (key === 'f') {
        handled = this.engine.fitTableWidth();
      } else if (key === 'c') {
        handled = this.engine.distributeColumns();
      } else if (key === 'r') {
        handled = this.engine.distributeRows();
      } else if (key === 'h') {
        handled = this.engine.toggleTableClass('sc-table-header-row');
      } else if (key === 'z') {
        handled = this.engine.toggleTableClass('sc-table-zebra');
      } else if (key === 't') {
        handled = this.engine.applyMeetingPreset();
      } else if (key === '1') {
        handled = this.engine.setTableDensity('compact');
      } else if (key === '2') {
        handled = this.engine.setTableDensity('comfortable');
      } else if (key === '3') {
        handled = this.engine.setTableDensity('spacious');
      } else if (key === '0') {
        handled = this.engine.resetTableStyle();
      }
    } else if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
      if (e.key === 'ArrowUp') {
        handled = this.engine.adjustRowHeightsOverall(-6);
      } else if (e.key === 'ArrowDown') {
        handled = this.engine.adjustRowHeightsOverall(6);
      } else if (e.key === 'ArrowLeft') {
        handled = this.engine.adjustColumnWidthsOverall(-8);
      } else if (e.key === 'ArrowRight') {
        handled = this.engine.adjustColumnWidthsOverall(8);
      }
    } else if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      if (e.key === 'ArrowUp') {
        handled = this.engine.adjustRowHeights(-6);
      } else if (e.key === 'ArrowDown') {
        handled = this.engine.adjustRowHeights(6);
      } else if (e.key === 'ArrowLeft') {
        handled = this.engine.adjustColumnWidths(-8);
      } else if (e.key === 'ArrowRight') {
        handled = this.engine.adjustColumnWidths(8);
      }
    } else if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if (e.key === 'ArrowUp') {
        handled = this.engine.adjustCurrentCellBoundary('up', 6);
      } else if (e.key === 'ArrowDown') {
        handled = this.engine.adjustCurrentCellBoundary('down', 6);
      } else if (e.key === 'ArrowLeft') {
        handled = this.engine.adjustCurrentCellBoundary('left', 8);
      } else if (e.key === 'ArrowRight') {
        handled = this.engine.adjustCurrentCellBoundary('right', 8);
      }
    }

    if (!handled) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    this.editor.takeSnapshot();
  };

  private handleDeleteKey(e: KeyboardEvent) {
    if (!this.editor) {
      return false;
    }

    if (e.key !== 'Backspace' && e.key !== 'Delete') {
      return false;
    }

    if (e.ctrlKey || e.altKey || e.metaKey) {
      return false;
    }

    const target = e.target as HTMLElement | null;
    const doc = this.editor.getDocument();
    const selectedTable = doc.querySelector('.sc-selected-table') as HTMLTableElement | null;
    const selection = doc.getSelection?.() ?? window.getSelection();
    const anchorNode = selection?.anchorNode ?? null;
    const anchorElement = anchorNode
      ? anchorNode.nodeType === Node.TEXT_NODE
        ? anchorNode.parentElement
        : (anchorNode as HTMLElement)
      : null;
    const selectionTable = anchorElement?.closest('table') as HTMLTableElement | null;
    const isInsideCell = Boolean(target?.closest('td, th') || anchorElement?.closest('td, th'));
    const isTextEditingInsideCell = Boolean(anchorElement?.closest('td, th')) && anchorNode?.nodeType === Node.TEXT_NODE;

    if (e.key === 'Backspace') {
      if (isInsideCell) {
        return false;
      }

      const shouldBlockTableBackspace = Boolean(
        selectedTable &&
        (!selectionTable || selectionTable === selectedTable || target?.closest('table') === selectedTable)
      );

      if (shouldBlockTableBackspace) {
        e.preventDefault();
        e.stopPropagation();
        return true;
      }

      return false;
    }

    const isWholeTableSelected = selectedTable ? this.engine.isWholeTableSelected(selectedTable) : false;
    const shouldDeleteSelectedTable = Boolean(
      selectedTable &&
      !isTextEditingInsideCell &&
      (isWholeTableSelected || selectionTable === selectedTable || !isInsideCell)
    );

    if (shouldDeleteSelectedTable && selectedTable) {
      e.preventDefault();
      e.stopPropagation();
      this.editor.takeSnapshot();
      if (this.engine.deleteTable(selectedTable)) {
        this.editor.triggerEvent(10 as any, {});
      }
      return true;
    }

    if (isInsideCell) {
      return false;
    }

    const direction = e.key === 'Backspace' ? 'backward' : 'forward';
    const adjacentTable = this.findAdjacentTable(direction);

    if (!adjacentTable) {
      if (selectedTable && selectionTable !== selectedTable && !target?.closest('table')) {
        this.engine.deselectAllTables();
        this.engine.deselectAllCells(true);
      }
      return false;
    }

    e.preventDefault();
    e.stopPropagation();

    if (selectedTable === adjacentTable) {
      this.editor.takeSnapshot();
      if (this.engine.deleteTable(adjacentTable)) {
        this.editor.triggerEvent(10 as any, {});
      }
      return true;
    }

    this.engine.deselectAllTables();
    this.engine.deselectAllCells(true);
    adjacentTable.classList.add('sc-selected-table');
    return true;
  }

  private findAdjacentTable(direction: 'backward' | 'forward') {
    if (!this.editor) {
      return null;
    }

    const doc = this.editor.getDocument();
    const root = (this.editor.getDOMHelper() as { contentDiv?: HTMLElement } | undefined)?.contentDiv ?? doc.body;
    const selection = doc.getSelection?.() ?? window.getSelection();
    if (!selection || !selection.rangeCount || !selection.isCollapsed) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const container = range.startContainer;
    const offset = range.startOffset;

    if (container.nodeType === Node.TEXT_NODE) {
      const text = container.textContent ?? '';
      if (direction === 'backward' && offset > 0) {
        return null;
      }
      if (direction === 'forward' && offset < text.length) {
        return null;
      }
    } else if (container.nodeType === Node.ELEMENT_NODE && container !== root) {
      const element = container as Element;
      if (direction === 'backward' && offset > 0) {
        const sibling = element.childNodes[offset - 1] ?? null;
        const table = this.findTableInsideNode(sibling, direction);
        if (table || sibling) {
          return table;
        }
      }
      if (direction === 'forward' && offset < element.childNodes.length) {
        const sibling = element.childNodes[offset] ?? null;
        const table = this.findTableInsideNode(sibling, direction);
        if (table || sibling) {
          return table;
        }
      }
    }

    let boundaryNode: Node | null = container.nodeType === Node.TEXT_NODE
      ? container.parentNode
      : container;

    while (boundaryNode && boundaryNode.parentNode && boundaryNode.parentNode !== root) {
      boundaryNode = boundaryNode.parentNode;
    }

    if (!boundaryNode || !boundaryNode.parentNode) {
      return null;
    }

    if (boundaryNode === root) {
      const sibling = direction === 'backward'
        ? root.childNodes[offset - 1] ?? null
        : root.childNodes[offset] ?? null;
      return this.scanForAdjacentTable(sibling, direction);
    }

    const sibling = direction === 'backward'
      ? boundaryNode.previousSibling
      : boundaryNode.nextSibling;

    return this.scanForAdjacentTable(sibling, direction);
  }

  private scanForAdjacentTable(startNode: Node | null, direction: 'backward' | 'forward') {
    let current = startNode;

    while (current) {
      const table = this.findTableInsideNode(current, direction);
      if (table) {
        return table;
      }

      if (!this.isIgnorableNode(current)) {
        return null;
      }

      current = direction === 'backward' ? current.previousSibling : current.nextSibling;
    }

    return null;
  }

  private findTableInsideNode(node: Node | null, direction: 'backward' | 'forward') {
    if (!node) {
      return null;
    }

    if (node instanceof HTMLTableElement) {
      return node;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const element = node as Element;
    const tables = Array.from(element.querySelectorAll('table')) as HTMLTableElement[];
    if (tables.length === 0) {
      return null;
    }

    return direction === 'backward' ? tables[tables.length - 1] : tables[0];
  }

  private isIgnorableNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return !(node.textContent ?? '').trim();
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return true;
    }

    const element = node as HTMLElement;
    if (element instanceof HTMLBRElement) {
      return true;
    }

    return !element.textContent?.trim() && element.querySelector('table') == null;
  }
}

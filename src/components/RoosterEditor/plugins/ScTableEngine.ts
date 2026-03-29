import { debounce } from 'lodash-es';

export interface ScCellModel {
  element: HTMLTableCellElement;
  originR: number;
  originC: number;
  rowSpan: number;
  colSpan: number;
}

export interface ScTableModel {
  table: HTMLTableElement;
  grid: (HTMLTableCellElement | null)[][];
  colWidths: number[];
  rowHeights: number[];
}

export interface ScSelectionRange {
  start: { r: number; c: number };
  end: { r: number; c: number };
}

export type ScBorderPreset = 'all' | 'outside' | 'inside' | 'top' | 'right' | 'bottom' | 'left' | 'none';
export type ScDiagonalMode = 'none' | 'slash' | 'backslash' | 'cross';
export type ScSegmentResizeAxis = 'row' | 'col';
type ScSegmentResizeEdge = 'top' | 'bottom' | 'left' | 'right';

interface ScSerializedCell {
  id: string;
  tagName: 'td' | 'th';
  html: string;
  className: string;
  style: string;
  attrs: Array<[string, string]>;
}

interface ScTableLayout {
  grid: string[][];
  cells: Map<string, ScSerializedCell>;
  colWidths: number[];
  rowHeights: number[];
}

interface ScCellArea {
  r: number;
  c: number;
  rowSpan: number;
  colSpan: number;
}

interface ScResizeDirectionPlan {
  growIndexes: number[];
  shrinkIndexes: number[];
}

interface ScResizePlan {
  mode: 'single' | 'band' | 'free' | 'segment';
  positive: ScResizeDirectionPlan;
  negative: ScResizeDirectionPlan;
}

const DEFAULT_COL_WIDTH = 120;
const DEFAULT_ROW_HEIGHT = 32;
const MIN_COL_WIDTH = 48;
const MIN_ROW_HEIGHT = 18;
const MIN_SEGMENT_COL_WIDTH = 1;
const MIN_SEGMENT_ROW_HEIGHT = 1;
const SEGMENT_FULL_TRACK_TOLERANCE = 2;
const DEFAULT_BORDER_COLOR = '#334155';
const DEFAULT_BORDER_WIDTH = '1px';
const DEFAULT_BORDER_STYLE = 'solid';
const SELECTION_DRAG_THRESHOLD = 6;

export class ScTableEngine {
  private model: ScTableModel | null = null;
  private dragInfo: {
    type: 'col' | 'row' | 'select' | 'select-pending';
    index?: number;
    resizePositiveGrowIndexes?: number[];
    resizePositiveShrinkIndexes?: number[];
    resizeNegativeGrowIndexes?: number[];
    resizeNegativeShrinkIndexes?: number[];
    resizeTargetIndexes?: number[];
    resizeMode?: 'single' | 'band' | 'free' | 'segment';
    startPos?: number;
    startSizes?: number[];
    minSizes?: number[];
    resizeSegmentCell?: HTMLTableCellElement | null;
    resizeSegmentDelta?: number;
    selectionOrigin?: { r: number; c: number };
    captureTarget?: HTMLElement | null;
    originCell?: HTMLTableCellElement | null;
    startX?: number;
    startY?: number;
  } | null = null;
  private onNotify: () => void;
  private cellSeed = 0;
  private previousUserSelect: { userSelect: string; webkitUserSelect: string } | null = null;
  private selectionScopeState: {
    table: HTMLTableElement | null;
    coords: { r: number; c: number } | null;
    scope: 'cell' | 'row' | 'column' | 'table';
  } = {
    table: null,
    coords: null,
    scope: 'cell',
  };
  private rememberedSelectionState: {
    table: HTMLTableElement | null;
    range: ScSelectionRange | null;
  } = {
    table: null,
    range: null,
  };

  constructor(onNotify: (html: string) => void) {
    this.onNotify = debounce(() => onNotify('table-changed'), 150);
  }

  public buildModel(table: HTMLTableElement): ScTableModel {
    const rows = Array.from(table.rows);
    const grid: (HTMLTableCellElement | null)[][] = [];
    let totalCols = 0;

    rows.forEach((tr, rIdx) => {
      if (!grid[rIdx]) {
        grid[rIdx] = [];
      }

      let cIdx = 0;
      Array.from(tr.cells).forEach(cell => {
        const tableCell = cell as HTMLTableCellElement;
        const rowSpan = Math.max(1, tableCell.rowSpan || 1);
        const colSpan = Math.max(1, tableCell.colSpan || 1);

        while (grid[rIdx][cIdx]) {
          cIdx += 1;
        }

        for (let r = 0; r < rowSpan; r++) {
          if (!grid[rIdx + r]) {
            grid[rIdx + r] = [];
          }

          for (let c = 0; c < colSpan; c++) {
            grid[rIdx + r][cIdx + c] = tableCell;
          }
        }

        cIdx += colSpan;
        totalCols = Math.max(totalCols, cIdx);
      });
    });

    grid.forEach(row => {
      while (row.length < totalCols) {
        row.push(null);
      }
    });

    const colgroup = table.querySelector('colgroup');
    const colWidths = Array.from({ length: totalCols }, (_, index) => {
      const col = colgroup?.children[index] as HTMLElement | undefined;
      const width = col ? parseFloat(getComputedStyle(col).width) : NaN;
      return Number.isFinite(width) && width > 0 ? width : DEFAULT_COL_WIDTH;
    });

    const rowHeights = rows.map(row => {
      const height = parseFloat(getComputedStyle(row).height);
      return Number.isFinite(height) && height > 0 ? height : DEFAULT_ROW_HEIGHT;
    });

    this.model = {
      table,
      grid,
      colWidths,
      rowHeights,
    };

    return this.model;
  }

  public syncToDOM() {
    if (!this.model) {
      return;
    }

    const { table, colWidths, rowHeights } = this.model;
    let colgroup = table.querySelector('colgroup');

    if (!colgroup) {
      colgroup = table.ownerDocument.createElement('colgroup');
      table.prepend(colgroup);
    }

    while (colgroup.children.length < colWidths.length) {
      colgroup.appendChild(table.ownerDocument.createElement('col'));
    }

    while (colgroup.children.length > colWidths.length) {
      colgroup.lastChild?.remove();
    }

    const totalWidth = colWidths.reduce((sum, width) => sum + width, 0);
    const fitWidth = table.classList.contains('sc-table-fit-width');

    colWidths.forEach((width, index) => {
      const col = colgroup!.children[index] as HTMLElement;
      if (!col) {
        return;
      }

      if (fitWidth && totalWidth > 0) {
        col.style.width = `${(width / totalWidth) * 100}%`;
      } else {
        col.style.width = `${Math.max(MIN_SEGMENT_COL_WIDTH, width)}px`;
      }
    });

    rowHeights.forEach((height, index) => {
      const row = table.rows[index];
      if (row) {
        row.style.height = `${Math.max(MIN_SEGMENT_ROW_HEIGHT, height)}px`;
      }
    });

    table.style.tableLayout = 'fixed';
    if (fitWidth) {
      table.style.width = '100%';
      table.style.maxWidth = '100%';
    } else if (totalWidth > 0) {
      table.style.width = `${totalWidth}px`;
      table.style.maxWidth = '100%';
    }

    table.classList.add('sc-table-standard');
  }

  public getCellCoords(cell: HTMLTableCellElement): { r: number; c: number } | null {
    if (!this.model) {
      return null;
    }

    for (let r = 0; r < this.model.grid.length; r++) {
      const c = this.model.grid[r].indexOf(cell);
      if (c !== -1) {
        return { r, c };
      }
    }

    return null;
  }

  public getNormalizedRange(start: { r: number; c: number }, end: { r: number; c: number }): ScSelectionRange {
    if (!this.model) {
      return { start, end };
    }

    let minR = Math.min(start.r, end.r);
    let maxR = Math.max(start.r, end.r);
    let minC = Math.min(start.c, end.c);
    let maxC = Math.max(start.c, end.c);

    let changed = true;
    while (changed) {
      changed = false;

      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const cell = this.model.grid[r]?.[c];
          if (!cell) {
            continue;
          }

          const coords = this.getCellCoords(cell);
          if (!coords) {
            continue;
          }

          const rEnd = coords.r + Math.max(1, cell.rowSpan || 1) - 1;
          const cEnd = coords.c + Math.max(1, cell.colSpan || 1) - 1;

          if (coords.r < minR) {
            minR = coords.r;
            changed = true;
          }
          if (coords.c < minC) {
            minC = coords.c;
            changed = true;
          }
          if (rEnd > maxR) {
            maxR = rEnd;
            changed = true;
          }
          if (cEnd > maxC) {
            maxC = cEnd;
            changed = true;
          }
        }
      }
    }

    return {
      start: { r: minR, c: minC },
      end: { r: maxR, c: maxC },
    };
  }

  public handleDown(e: PointerEvent, target: HTMLElement): 'resize' | 'select' | null {
    const cell = target.closest('td, th') as HTMLTableCellElement | null;
    if (!cell) {
      return null;
    }

    const table = cell.closest('table') as HTMLTableElement | null;
    if (!table) {
      return null;
    }

    this.buildModel(table);
    const rect = cell.getBoundingClientRect();
      const isRight = Math.abs(e.clientX - rect.right) < 10;
      const isBottom = Math.abs(e.clientY - rect.bottom) < 10;

      if (isRight || isBottom) {
        const coords = this.getCellCoords(cell);
        if (!coords || !this.model) {
          return;
        }

      const index = isRight
        ? coords.c + Math.max(1, cell.colSpan || 1) - 1
        : coords.r + Math.max(1, cell.rowSpan || 1) - 1;
      const totalCount = isRight ? this.model.colWidths.length : this.model.rowHeights.length;
      const shiftStart = Boolean(e.shiftKey);
      const ctrlStart = Boolean(e.ctrlKey && !e.altKey && !e.shiftKey);
      const canUseSegmentResize = shiftStart && index < totalCount - 1;
      const resizePlan = ctrlStart
        ? {
            mode: 'free' as const,
            positive: {
              growIndexes: [index],
              shrinkIndexes: [],
            },
            negative: {
              growIndexes: [index],
              shrinkIndexes: [],
            },
          }
        : this.createResizePlan(index, totalCount, false);
      if (!resizePlan) {
        return null;
      }

      e.preventDefault();
      this.lockBrowserTextSelection(table.ownerDocument);
      const activeRange = this.getSelectedRange() ?? this.getRememberedSelectionRange(table);
      if (activeRange) {
        this.rememberSelection(table, activeRange);
      }
      this.dragInfo = {
        type: isRight ? 'col' : 'row',
        index,
        resizePositiveGrowIndexes: resizePlan.positive.growIndexes,
        resizePositiveShrinkIndexes: resizePlan.positive.shrinkIndexes,
        resizeNegativeGrowIndexes: resizePlan.negative.growIndexes,
        resizeNegativeShrinkIndexes: resizePlan.negative.shrinkIndexes,
        resizeTargetIndexes: resizePlan.mode === 'free' ? [index] : undefined,
        resizeMode: canUseSegmentResize ? 'segment' : resizePlan.mode,
        startPos: isRight ? e.clientX : e.clientY,
        startSizes: isRight ? [...this.model.colWidths] : [...this.model.rowHeights],
        minSizes: isRight
          ? Array.from({ length: this.model.colWidths.length }, () => MIN_COL_WIDTH)
          : this.measureRowMinSizes(table),
        resizeSegmentCell: canUseSegmentResize ? cell : null,
        resizeSegmentDelta: 0,
        captureTarget: cell,
      };
      try {
        cell.setPointerCapture?.(e.pointerId);
      } catch {}
      return 'resize';
    } else {
      const coords = this.getCellCoords(cell);
      if (!coords) {
        return null;
      }

      this.deselectAllCells();
      this.rememberSelection(table, { start: coords, end: coords });
      this.dragInfo = {
        type: 'select-pending',
        selectionOrigin: coords,
        originCell: cell,
        startX: e.clientX,
        startY: e.clientY,
      };
      this.setSelectionScopeState(table, coords, 'cell');
      return 'select';
    }
  }

  public handleMove(e: PointerEvent | MouseEvent) {
    if (!this.dragInfo || !this.model) {
      return;
    }

    if (this.dragInfo.type === 'select-pending') {
      const overCell = this.resolvePointerCell(e);
      if (!overCell || overCell.closest('table') !== this.model.table) {
        return;
      }

      const movedEnough = this.hasSelectionDragThreshold(e);
      if (!movedEnough || overCell === this.dragInfo.originCell) {
        return;
      }

      const coords = this.getCellCoords(overCell);
      if (!coords || !this.dragInfo.selectionOrigin) {
        return;
      }

      e.preventDefault();
      this.lockBrowserTextSelection(this.model.table.ownerDocument);
      this.dragInfo.type = 'select';
      this.focusCell(this.dragInfo.selectionOrigin);
      this.updateSelection(coords);
      return;
    }

    if (this.dragInfo.type === 'select') {
      e.preventDefault();
      const overCell = this.resolvePointerCell(e);
      if (overCell && overCell.closest('table') === this.model.table) {
        const coords = this.getCellCoords(overCell);
        if (coords) {
          this.updateSelection(coords);
        }
      }
      return;
    }

    const {
      type,
      startPos,
      startSizes,
      minSizes,
      resizePositiveGrowIndexes,
      resizePositiveShrinkIndexes,
      resizeNegativeGrowIndexes,
      resizeNegativeShrinkIndexes,
      resizeTargetIndexes,
      resizeMode,
      resizeSegmentCell,
    } = this.dragInfo;
    if (startPos == null || !startSizes || !minSizes) {
      return;
    }

    const delta = (type === 'col' ? e.clientX : e.clientY) - startPos;
    if (resizeMode === 'segment') {
      if (!resizeSegmentCell) {
        return;
      }

      const currentIndex = this.dragInfo.index ?? 0;
      const currentSize = startSizes[currentIndex] ?? (type === 'col' ? DEFAULT_COL_WIDTH : DEFAULT_ROW_HEIGHT);
      const nextSize = startSizes[currentIndex + 1] ?? (type === 'col' ? DEFAULT_COL_WIDTH : DEFAULT_ROW_HEIGHT);
      const minSize = minSizes[currentIndex] ?? (type === 'col' ? MIN_COL_WIDTH : MIN_ROW_HEIGHT);
      const nextMinSize = minSizes[currentIndex + 1] ?? (type === 'col' ? MIN_COL_WIDTH : MIN_ROW_HEIGHT);
      const clampedDelta = Math.max(
        -(currentSize - minSize),
        Math.min(delta, nextSize - nextMinSize),
      );

      this.dragInfo.resizeSegmentDelta = clampedDelta;
      return;
    }

    const nextSizes = [...startSizes];

    if (resizeMode === 'free') {
      if (!resizeTargetIndexes?.length) {
        return;
      }

      this.applyDirectResize(nextSizes, delta, resizeTargetIndexes, minSizes);
    } else {
      if (
        !resizePositiveGrowIndexes?.length ||
        !resizePositiveShrinkIndexes?.length ||
        !resizeNegativeGrowIndexes?.length ||
        !resizeNegativeShrinkIndexes?.length
      ) {
        return;
      }

      this.applyDirectionalResize(
        nextSizes,
        delta,
        resizePositiveGrowIndexes,
        resizePositiveShrinkIndexes,
        resizeNegativeGrowIndexes,
        resizeNegativeShrinkIndexes,
        minSizes,
      );
    }

    if (type === 'col') {
      this.model.colWidths = nextSizes;
    } else {
      this.model.rowHeights = nextSizes;
    }

    this.syncToDOM();
  }

  public handleUp(e: PointerEvent | MouseEvent) {
    if (!this.dragInfo) {
      return false;
    }

    let shouldEmit = this.dragInfo.type === 'col' || this.dragInfo.type === 'row';
    const {
      resizeMode,
      resizeSegmentCell,
      resizeSegmentDelta,
      type,
    } = this.dragInfo;

    try {
      if ('pointerId' in e && typeof e.pointerId === 'number') {
        this.dragInfo.captureTarget?.releasePointerCapture?.(e.pointerId);
      }
    } catch {}
    this.unlockBrowserTextSelection();
    if (resizeMode === 'segment' && resizeSegmentCell && resizeSegmentDelta) {
      shouldEmit = this.resizeCellBoundarySegment(
        resizeSegmentCell,
        type === 'col' ? 'col' : 'row',
        resizeSegmentDelta,
        {
          boundaryIndex: this.dragInfo.index,
          edge: type === 'col' ? 'right' : 'bottom',
        },
      );
    } else if (shouldEmit && this.model?.table) {
      const rememberedRange = this.getRememberedSelectionRange(this.model.table);
      if (rememberedRange) {
        this.restoreSelection(this.model.table, rememberedRange);
      }
    }
    this.dragInfo = null;
    if (shouldEmit && resizeMode !== 'segment') {
      this.emitChange();
    }
    return shouldEmit;
  }

  public navigateSelection(direction: 'up' | 'down' | 'left' | 'right' | 'next' | 'prev'): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    this.buildModel(table);
    if (!this.model) {
      return false;
    }

    const range = this.resolveActiveRange(table);
    if (!range) {
      return false;
    }

    const target = this.getNextNavigationTarget(range, direction);
    if (!target) {
      return false;
    }

    const normalized = this.getNormalizedRange(target, target);
    this.setSelectionScopeState(table, target, 'cell');
    this.restoreSelection(table, normalized);
    this.focusCell(target, direction === 'prev' || direction === 'left');
    return true;
  }

  public cycleSelectionScope(step: 1 | -1 = 1): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    this.buildModel(table);
    if (!this.model) {
      return false;
    }

    const activeCell = this.getActiveCell(table);
    const coords = activeCell ? this.getCellCoords(activeCell) : null;
    if (!coords) {
      return false;
    }

    const order: Array<'cell' | 'row' | 'column' | 'table'> = ['cell', 'row', 'column', 'table'];
    const currentScope =
      this.selectionScopeState.table === table &&
      this.selectionScopeState.coords &&
      this.selectionScopeState.coords.r === coords.r &&
      this.selectionScopeState.coords.c === coords.c
        ? this.selectionScopeState.scope
        : 'cell';

    const hasExplicitSelection = Boolean(this.model.table.querySelector('.sc-cell-selected'));
    let nextScope: 'cell' | 'row' | 'column' | 'table';

    if (!hasExplicitSelection) {
      nextScope = 'cell';
    } else {
      const currentIndex = order.indexOf(currentScope);
      const nextIndex = (currentIndex + step + order.length) % order.length;
      nextScope = order[nextIndex];
    }

    let range: ScSelectionRange;
    if (nextScope === 'row') {
      range = {
        start: { r: coords.r, c: 0 },
        end: { r: coords.r, c: this.model.grid[0]?.length ? this.model.grid[0].length - 1 : 0 },
      };
    } else if (nextScope === 'column') {
      range = {
        start: { r: 0, c: coords.c },
        end: { r: this.model.grid.length - 1, c: coords.c },
      };
    } else if (nextScope === 'table') {
      range = {
        start: { r: 0, c: 0 },
        end: {
          r: this.model.grid.length - 1,
          c: this.model.grid[0]?.length ? this.model.grid[0].length - 1 : 0,
        },
      };
    } else {
      range = { start: coords, end: coords };
    }

    const normalized = this.getNormalizedRange(range.start, range.end);
    this.setSelectionScopeState(table, coords, nextScope);
    this.restoreSelection(table, normalized);
    this.focusCell(coords);
    return true;
  }

  public activateContextSelection(target: HTMLElement | null): boolean {
    const table = target?.closest('table') as HTMLTableElement | null;
    if (!table) {
      return false;
    }

    this.buildModel(table);
    if (!this.model) {
      return false;
    }

    const cell = target?.closest('td, th') as HTMLTableCellElement | null;
    const coords = cell ? this.getCellCoords(cell) : null;
    const currentRange = this.getSelectedRange() ?? this.getRememberedSelectionRange(table);
    const currentScope =
      this.selectionScopeState.table === table ? this.selectionScopeState.scope : 'cell';
    const shouldKeepRange = Boolean(
      currentRange &&
      (!coords || this.rangeContainsCoords(currentRange, coords))
    );

    const nextRange = shouldKeepRange
      ? currentRange
      : coords
        ? this.getNormalizedRange(coords, coords)
        : this.resolveActiveRange(table);

    this.restoreSelection(table, nextRange);
    this.setSelectionScopeState(
      table,
      coords ?? this.selectionScopeState.coords,
      shouldKeepRange ? currentScope : 'cell'
    );
    return true;
  }

  public isWholeTableSelected(tableArg?: HTMLTableElement): boolean {
    const table = tableArg ?? this.getActiveTable();
    if (!table) {
      return false;
    }

    this.buildModel(table);
    if (!this.model) {
      return false;
    }

    const range = this.resolveActiveRange(table);
    if (!range) {
      return false;
    }

    return (
      range.start.r === 0 &&
      range.start.c === 0 &&
      range.end.r === this.model.grid.length - 1 &&
      range.end.c === ((this.model.grid[0]?.length ?? 1) - 1)
    );
  }

  public getSelectedRange(): ScSelectionRange | null {
    if (!this.model) {
      return null;
    }

    const selectedCells = Array.from(this.model.table.querySelectorAll('.sc-cell-selected')) as HTMLTableCellElement[];
    if (selectedCells.length === 0) {
      return null;
    }

    let minR = Infinity;
    let maxR = -Infinity;
    let minC = Infinity;
    let maxC = -Infinity;

    selectedCells.forEach(cell => {
      const coords = this.getCellCoords(cell);
      if (!coords) {
        return;
      }

      minR = Math.min(minR, coords.r);
      minC = Math.min(minC, coords.c);
      maxR = Math.max(maxR, coords.r + Math.max(1, cell.rowSpan || 1) - 1);
      maxC = Math.max(maxC, coords.c + Math.max(1, cell.colSpan || 1) - 1);
    });

    if (!Number.isFinite(minR) || !Number.isFinite(minC)) {
      return null;
    }

    return {
      start: { r: minR, c: minC },
      end: { r: maxR, c: maxC },
    };
  }

  public mergeSelectedRange(range: ScSelectionRange): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const layout = this.buildLayout(table);
    const normalized = this.clampRange(layout, range);
    if (!normalized) {
      return false;
    }

    const originId = layout.grid[normalized.start.r][normalized.start.c];
    if (!originId) {
      return false;
    }

    const uniqueIds = new Set<string>();
    for (let r = normalized.start.r; r <= normalized.end.r; r++) {
      for (let c = normalized.start.c; c <= normalized.end.c; c++) {
        uniqueIds.add(layout.grid[r][c]);
      }
    }

    if (uniqueIds.size <= 1) {
      return false;
    }

    for (let r = normalized.start.r; r <= normalized.end.r; r++) {
      for (let c = normalized.start.c; c <= normalized.end.c; c++) {
        layout.grid[r][c] = originId;
      }
    }

    const mergedAnchor = {
      start: { r: normalized.start.r, c: normalized.start.c },
      end: { r: normalized.start.r, c: normalized.start.c },
    };
    this.setSelectionScopeState(table, mergedAnchor.start, 'cell');
    return this.commit(table, layout, mergedAnchor);
  }

  public splitCell(cell: HTMLTableCellElement, nRows: number, nCols: number): boolean {
    const table = cell.closest('table') as HTMLTableElement | null;
    if (!table) {
      return false;
    }

    this.buildModel(table);
    const coords = this.getCellCoords(cell);
    if (!coords) {
      return false;
    }

    const range = this.getNormalizedRange(coords, {
      r: coords.r + Math.max(1, nRows) - 1,
      c: coords.c + Math.max(1, nCols) - 1,
    });

    return this.splitSelection(table, range);
  }

  public insertRow(position: 'above' | 'below'): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const range = this.resolveActiveRange(table);
    if (!range) {
      return false;
    }

    const insertAt = position === 'above' ? range.start.r : range.end.r + 1;
    return this.insertRowAt(insertAt, table);
  }

  public insertRowAt(insertAt: number, tableArg?: HTMLTableElement): boolean {
    const table = tableArg ?? this.getActiveTable();
    if (!table) {
      return false;
    }

    const layout = this.buildLayout(table);
    const rowCount = layout.grid.length;
    const colCount = layout.grid[0]?.length ?? 0;
    if (!rowCount || !colCount) {
      return false;
    }

    const targetIndex = Math.max(0, Math.min(insertAt, rowCount));
    const areas = this.computeAreas(layout);
    const newRow: string[] = [];

    for (let c = 0; c < colCount; c++) {
      let nextId: string | null = null;

      if (targetIndex > 0) {
        const aboveId = layout.grid[targetIndex - 1][c];
        const area = areas.get(aboveId);
        if (area && area.r < targetIndex && area.r + area.rowSpan > targetIndex) {
          nextId = aboveId;
        }
      }

      if (!nextId) {
        const templateId =
          layout.grid[Math.min(targetIndex, rowCount - 1)]?.[c] ??
          layout.grid[Math.max(0, targetIndex - 1)]?.[c] ??
          null;
        nextId = this.createBlankCell(layout, templateId).id;
      }

      newRow.push(nextId);
    }

    layout.grid.splice(targetIndex, 0, newRow);
    layout.rowHeights.splice(targetIndex, 0, this.pickInsertedSize(layout.rowHeights, targetIndex, DEFAULT_ROW_HEIGHT));

    return this.commit(table, layout, {
      start: { r: targetIndex, c: 0 },
      end: { r: targetIndex, c: colCount - 1 },
    });
  }

  public insertColumn(position: 'left' | 'right'): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const range = this.resolveActiveRange(table);
    if (!range) {
      return false;
    }

    const insertAt = position === 'left' ? range.start.c : range.end.c + 1;
    return this.insertColumnAt(insertAt, table);
  }

  public insertColumnAt(insertAt: number, tableArg?: HTMLTableElement): boolean {
    const table = tableArg ?? this.getActiveTable();
    if (!table) {
      return false;
    }

    const layout = this.buildLayout(table);
    const rowCount = layout.grid.length;
    const colCount = layout.grid[0]?.length ?? 0;
    if (!rowCount || !colCount) {
      return false;
    }

    const targetIndex = Math.max(0, Math.min(insertAt, colCount));
    const areas = this.computeAreas(layout);

    for (let r = 0; r < rowCount; r++) {
      let nextId: string | null = null;

      if (targetIndex > 0) {
        const leftId = layout.grid[r][targetIndex - 1];
        const area = areas.get(leftId);
        if (area && area.c < targetIndex && area.c + area.colSpan > targetIndex) {
          nextId = leftId;
        }
      }

      if (!nextId) {
        const templateId =
          layout.grid[r][Math.min(targetIndex, colCount - 1)] ??
          layout.grid[r][Math.max(0, targetIndex - 1)] ??
          null;
        nextId = this.createBlankCell(layout, templateId).id;
      }

      layout.grid[r].splice(targetIndex, 0, nextId);
    }

    layout.colWidths.splice(targetIndex, 0, this.pickInsertedSize(layout.colWidths, targetIndex, DEFAULT_COL_WIDTH));

    return this.commit(table, layout, {
      start: { r: 0, c: targetIndex },
      end: { r: rowCount - 1, c: targetIndex },
    });
  }

  public deleteRows(): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const layout = this.buildLayout(table);
    const range = this.resolveActiveRange(table);
    if (!range) {
      return false;
    }

    const deleteCount = range.end.r - range.start.r + 1;
    if (deleteCount >= layout.grid.length) {
      return this.deleteTable(table);
    }

    layout.grid.splice(range.start.r, deleteCount);
    layout.rowHeights.splice(range.start.r, deleteCount);

    return this.commit(table, layout, {
      start: {
        r: Math.min(range.start.r, layout.grid.length - 1),
        c: Math.min(range.start.c, (layout.grid[0]?.length ?? 1) - 1),
      },
      end: {
        r: Math.min(range.start.r, layout.grid.length - 1),
        c: Math.min(range.start.c, (layout.grid[0]?.length ?? 1) - 1),
      },
    });
  }

  public deleteColumns(): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const layout = this.buildLayout(table);
    const range = this.resolveActiveRange(table);
    if (!range) {
      return false;
    }

    const deleteCount = range.end.c - range.start.c + 1;
    if (deleteCount >= (layout.grid[0]?.length ?? 0)) {
      return this.deleteTable(table);
    }

    layout.grid.forEach(row => row.splice(range.start.c, deleteCount));
    layout.colWidths.splice(range.start.c, deleteCount);

    return this.commit(table, layout, {
      start: {
        r: Math.min(range.start.r, layout.grid.length - 1),
        c: Math.min(range.start.c, (layout.grid[0]?.length ?? 1) - 1),
      },
      end: {
        r: Math.min(range.start.r, layout.grid.length - 1),
        c: Math.min(range.start.c, (layout.grid[0]?.length ?? 1) - 1),
      },
    });
  }

  public deleteTable(tableArg?: HTMLTableElement): boolean {
    const table = tableArg ?? this.getActiveTable();
    if (!table) {
      return false;
    }

    this.clearRememberedSelection(table);
    table.remove();
    this.model = null;
    this.deselectAllCells();
    this.deselectAllTables();
    this.emitChange();
    return true;
  }

  public mergeSelection(): boolean {
    const table = this.getActiveTable();
    const range = table ? this.resolveActiveRange(table) : null;
    if (!table || !range) {
      return false;
    }

    return this.mergeSelectedRange(range);
  }

  public splitSelection(tableArg?: HTMLTableElement, rangeArg?: ScSelectionRange): boolean {
    const table = tableArg ?? this.getActiveTable();
    if (!table) {
      return false;
    }

    const layout = this.buildLayout(table);
    const range = rangeArg ?? this.resolveActiveRange(table);
    if (!range) {
      return false;
    }

    const id = layout.grid[range.start.r][range.start.c];
    if (!id) {
      return false;
    }

    const area = this.computeAreas(layout).get(id);
    if (!area || (area.rowSpan === 1 && area.colSpan === 1)) {
      return false;
    }

    for (let r = area.r; r < area.r + area.rowSpan; r++) {
      for (let c = area.c; c < area.c + area.colSpan; c++) {
        if (r === area.r && c === area.c) {
          continue;
        }

        layout.grid[r][c] = this.createBlankCell(layout, id).id;
      }
    }

    return this.commit(table, layout, {
      start: { r: area.r, c: area.c },
      end: { r: area.r + area.rowSpan - 1, c: area.c + area.colSpan - 1 },
    });
  }

  public splitActiveCell(nRows: number, nCols: number): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const activeCell = this.getActiveCell(table);
    if (!activeCell) {
      return false;
    }

    const targetRows = Math.max(1, Math.floor(nRows || 1));
    const targetCols = Math.max(1, Math.floor(nCols || 1));
    if (targetRows === 1 && targetCols === 1) {
      return false;
    }

    const layout = this.buildLayout(table);
    const coords = this.getCellCoords(activeCell);
    if (!coords) {
      return false;
    }

    const activeId = layout.grid[coords.r]?.[coords.c];
    if (!activeId) {
      return false;
    }

    const initialArea = this.computeAreas(layout).get(activeId);
    if (!initialArea) {
      return false;
    }

    const originalWidth = layout.colWidths
      .slice(initialArea.c, initialArea.c + initialArea.colSpan)
      .reduce((sum, width) => sum + width, 0) || targetCols * DEFAULT_COL_WIDTH;
    const originalHeight = layout.rowHeights
      .slice(initialArea.r, initialArea.r + initialArea.rowSpan)
      .reduce((sum, height) => sum + height, 0) || targetRows * DEFAULT_ROW_HEIGHT;

    let area = initialArea;

    while (area.rowSpan < targetRows) {
      this.insertLayoutRow(layout, area.r + area.rowSpan);
      area = this.computeAreas(layout).get(activeId)!;
    }

    while (area.colSpan < targetCols) {
      this.insertLayoutColumn(layout, area.c + area.colSpan);
      area = this.computeAreas(layout).get(activeId)!;
    }

    const rowHeight = Math.max(MIN_ROW_HEIGHT, originalHeight / area.rowSpan);
    const colWidth = Math.max(MIN_COL_WIDTH, originalWidth / area.colSpan);

    for (let r = area.r; r < area.r + area.rowSpan; r++) {
      layout.rowHeights[r] = rowHeight;
    }

    for (let c = area.c; c < area.c + area.colSpan; c++) {
      layout.colWidths[c] = colWidth;
    }

    for (let r = area.r; r < area.r + area.rowSpan; r++) {
      for (let c = area.c; c < area.c + area.colSpan; c++) {
        if (r === area.r && c === area.c) {
          continue;
        }

        layout.grid[r][c] = this.createBlankCell(layout, activeId).id;
      }
    }

    return this.commit(table, layout, {
      start: { r: area.r, c: area.c },
      end: { r: area.r + area.rowSpan - 1, c: area.c + area.colSpan - 1 },
    });
  }

  public resizeCellBoundarySegment(
    cell: HTMLTableCellElement,
    axis: ScSegmentResizeAxis,
    delta: number,
    options?: {
      boundaryIndex?: number;
      segmentStart?: number;
      segmentEnd?: number;
      edge?: ScSegmentResizeEdge;
    },
  ): boolean {
    const table = cell.closest('table') as HTMLTableElement | null;
    if (!table || !delta) {
      return false;
    }

    if (axis === 'col') {
      this.materializeFitWidthTable(table);
    }

    const layout = this.buildLayout(table);
    this.buildModel(table);
    const coords = this.getCellCoords(cell);
    if (!coords) {
      return false;
    }

    const hasExplicitSegment =
      typeof options?.segmentStart === 'number' &&
      typeof options?.segmentEnd === 'number';

    const referenceCoords =
      options?.edge === 'top'
        ? { r: Math.max(0, coords.r - 1), c: coords.c }
        : options?.edge === 'left'
          ? { r: coords.r, c: Math.max(0, coords.c - 1) }
          : coords;

    const cellId = layout.grid[referenceCoords.r]?.[referenceCoords.c];
    if (!cellId) {
      return false;
    }

    const ownerArea = this.computeAreas(layout).get(cellId);
    if (!ownerArea) {
      return false;
    }

    const explicitSegmentStart = hasExplicitSegment
      ? Math.max(0, options!.segmentStart!)
      : null;
    const explicitSegmentEnd = hasExplicitSegment
      ? Math.max(explicitSegmentStart ?? 0, options!.segmentEnd!)
      : null;

    const area = hasExplicitSegment
      ? axis === 'row'
        ? {
            r: ownerArea.r,
            c: explicitSegmentStart!,
            rowSpan: ownerArea.rowSpan,
            colSpan: explicitSegmentEnd! - explicitSegmentStart! + 1,
          }
        : {
            r: explicitSegmentStart!,
            c: ownerArea.c,
            rowSpan: explicitSegmentEnd! - explicitSegmentStart! + 1,
            colSpan: ownerArea.colSpan,
          }
      : ownerArea;

    const boundaryIndex =
      typeof options?.boundaryIndex === 'number'
        ? options.boundaryIndex
        : axis === 'row'
          ? area.r + area.rowSpan - 1
          : area.c + area.colSpan - 1;
    const edge = options?.edge ?? (axis === 'row' ? 'bottom' : 'right');

    if (axis === 'row') {
      return this.resizeRowBoundarySegment(table, layout, area, cellId, boundaryIndex, edge, delta);
    }

    return this.resizeColumnBoundarySegment(table, layout, area, cellId, boundaryIndex, edge, delta);
  }

  public applySelectionBorders(
    preset: ScBorderPreset,
    options?: { color?: string; width?: string; style?: string }
  ): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const layout = this.buildLayout(table);
    const range = this.resolveActiveRange(table);
    const normalized = this.clampRange(layout, range);
    if (!normalized || !this.model) {
      return false;
    }

    const areas = this.computeAreas(layout);
    const seen = new Set<string>();
    const borderValue =
      preset === 'none'
        ? null
        : `${options?.width || DEFAULT_BORDER_WIDTH} ${options?.style || DEFAULT_BORDER_STYLE} ${options?.color || DEFAULT_BORDER_COLOR}`;

    for (let r = normalized.start.r; r <= normalized.end.r; r++) {
      for (let c = normalized.start.c; c <= normalized.end.c; c++) {
        const id = layout.grid[r]?.[c];
        if (!id || seen.has(id)) {
          continue;
        }

        seen.add(id);
        const area = areas.get(id);
        if (!area) {
          continue;
        }

        const cell = this.model.grid[area.r]?.[area.c];
        if (!cell) {
          continue;
        }

        const top = area.r;
        const bottom = area.r + area.rowSpan - 1;
        const left = area.c;
        const right = area.c + area.colSpan - 1;
        const flags = {
          top: false,
          right: false,
          bottom: false,
          left: false,
        };

        if (preset === 'none') {
          flags.top = true;
          flags.right = true;
          flags.bottom = true;
          flags.left = true;
        } else if (preset === 'all') {
          flags.top = true;
          flags.right = true;
          flags.bottom = true;
          flags.left = true;
        } else if (preset === 'outside') {
          flags.top = top === normalized.start.r;
          flags.bottom = bottom === normalized.end.r;
          flags.left = left === normalized.start.c;
          flags.right = right === normalized.end.c;
        } else if (preset === 'inside') {
          flags.top = top > normalized.start.r;
          flags.bottom = bottom < normalized.end.r;
          flags.left = left > normalized.start.c;
          flags.right = right < normalized.end.c;
        } else {
          flags.top = preset === 'top' && top === normalized.start.r;
          flags.right = preset === 'right' && right === normalized.end.c;
          flags.bottom = preset === 'bottom' && bottom === normalized.end.r;
          flags.left = preset === 'left' && left === normalized.start.c;
        }

        this.applyCellBorders(cell, flags, borderValue);
      }
    }

    this.emitChange();
    return true;
  }

  public applySelectionDiagonal(mode: ScDiagonalMode, color = '#ef4444'): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const cells = this.getTargetCells(table);
    if (!cells.length) {
      return false;
    }

    const slash = `linear-gradient(to top right, transparent calc(50% - 1px), ${color} calc(50% - 1px), ${color} calc(50% + 1px), transparent calc(50% + 1px))`;
    const backslash = `linear-gradient(to bottom right, transparent calc(50% - 1px), ${color} calc(50% - 1px), ${color} calc(50% + 1px), transparent calc(50% + 1px))`;
    const image =
      mode === 'slash'
        ? slash
        : mode === 'backslash'
          ? backslash
          : mode === 'cross'
            ? `${slash}, ${backslash}`
            : '';

    cells.forEach(cell => {
      if (image) {
        cell.style.backgroundImage = image;
        cell.style.backgroundSize = '100% 100%';
        cell.style.backgroundRepeat = 'no-repeat';
      } else {
        cell.style.removeProperty('background-image');
        cell.style.removeProperty('background-size');
        cell.style.removeProperty('background-repeat');
      }
    });

    this.emitChange();
    return true;
  }

  public distributeColumns(): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const model = this.buildModel(table);
    const selection = this.getSelectionBandIndices(table);
    if (!model.colWidths.length || selection.cols.length === 0) {
      return false;
    }

    const totalWidth = selection.cols.reduce((sum, colIndex) => sum + model.colWidths[colIndex], 0);
    const width = Math.max(
      MIN_COL_WIDTH,
      (totalWidth || table.getBoundingClientRect().width) / selection.cols.length
    );
    selection.cols.forEach(colIndex => {
      model.colWidths[colIndex] = width;
    });
    this.syncToDOM();
    this.restoreSelection(table, selection.range);
    this.emitChange();
    return true;
  }

  public distributeRows(): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const model = this.buildModel(table);
    const selection = this.getSelectionBandIndices(table);
    if (!model.rowHeights.length || selection.rows.length === 0) {
      return false;
    }

    const totalHeight = selection.rows.reduce((sum, rowIndex) => sum + model.rowHeights[rowIndex], 0);
    const height = Math.max(
      MIN_ROW_HEIGHT,
      (totalHeight || table.getBoundingClientRect().height) / selection.rows.length
    );
    selection.rows.forEach(rowIndex => {
      model.rowHeights[rowIndex] = height;
    });
    this.syncToDOM();
    this.restoreSelection(table, selection.range);
    this.emitChange();
    return true;
  }

  public fitTableWidth(): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const range = this.resolveActiveRange(table);
    const model = this.buildModel(table);
    if (!model.colWidths.length) {
      return false;
    }

    table.classList.add('sc-table-fit-width');
    const totalWidth = model.colWidths.reduce((sum, width) => sum + width, 0) || table.getBoundingClientRect().width;
    const width = Math.max(MIN_COL_WIDTH, totalWidth / model.colWidths.length);
    model.colWidths = Array(model.colWidths.length).fill(width);
    this.syncToDOM();
    this.restoreSelection(table, range);
    this.emitChange();
    return true;
  }

  public adjustColumnWidths(delta: number): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const model = this.buildModel(table);
    const selection = this.getSelectionBandIndices(table);
    if (!selection.range || !model.colWidths.length || selection.cols.length === 0) {
      return false;
    }

    const resizePlan = this.createSelectionBandResizePlan(model.colWidths.length, selection.cols);
    if (!resizePlan) {
      return false;
    }

    const nextSizes = [...model.colWidths];
    const minSizes = Array.from({ length: model.colWidths.length }, () => MIN_COL_WIDTH);

    this.applyDirectionalResize(
      nextSizes,
      delta,
      resizePlan.positive.growIndexes,
      resizePlan.positive.shrinkIndexes,
      resizePlan.negative.growIndexes,
      resizePlan.negative.shrinkIndexes,
      minSizes,
    );

    model.colWidths = nextSizes;

    this.syncToDOM();
    this.restoreSelection(table, selection.range);
    this.emitChange();
    return true;
  }

  public adjustColumnWidthsOverall(delta: number): boolean {
    const table = this.getActiveTable();
    if (!table || !delta) {
      return false;
    }

    const model = this.buildModel(table);
    const selection = this.getSelectionBandIndices(table);
    if (!selection.range || !model.colWidths.length || selection.cols.length === 0) {
      return false;
    }

    const targetIndexes = Array.from(new Set(selection.cols))
      .filter(index => index >= 0 && index < model.colWidths.length)
      .sort((a, b) => a - b);

    if (!targetIndexes.length) {
      return false;
    }

    const nextSizes = [...model.colWidths];
    const minSizes = Array.from({ length: model.colWidths.length }, () => MIN_COL_WIDTH);
    this.applyDirectResize(nextSizes, delta, targetIndexes, minSizes);

    model.colWidths = nextSizes;
    this.syncToDOM();
    this.restoreSelection(table, selection.range);
    this.emitChange();
    return true;
  }

  public adjustRowHeights(delta: number): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const model = this.buildModel(table);
    const selection = this.getSelectionBandIndices(table);
    if (!selection.range || !model.rowHeights.length || selection.rows.length === 0) {
      return false;
    }

    const resizePlan = this.createSelectionBandResizePlan(model.rowHeights.length, selection.rows);
    if (!resizePlan) {
      return false;
    }

    const nextSizes = [...model.rowHeights];
    const minSizes = this.measureRowMinSizes(table);

    this.applyDirectionalResize(
      nextSizes,
      delta,
      resizePlan.positive.growIndexes,
      resizePlan.positive.shrinkIndexes,
      resizePlan.negative.growIndexes,
      resizePlan.negative.shrinkIndexes,
      minSizes,
    );

    model.rowHeights = nextSizes;

    this.syncToDOM();
    this.restoreSelection(table, selection.range);
    this.emitChange();
    return true;
  }

  public adjustRowHeightsOverall(delta: number): boolean {
    const table = this.getActiveTable();
    if (!table || !delta) {
      return false;
    }

    const model = this.buildModel(table);
    const selection = this.getSelectionBandIndices(table);
    if (!selection.range || !model.rowHeights.length || selection.rows.length === 0) {
      return false;
    }

    const targetIndexes = Array.from(new Set(selection.rows))
      .filter(index => index >= 0 && index < model.rowHeights.length)
      .sort((a, b) => a - b);

    if (!targetIndexes.length) {
      return false;
    }

    const nextSizes = [...model.rowHeights];
    const minSizes = this.measureRowMinSizes(table);
    this.applyDirectResize(nextSizes, delta, targetIndexes, minSizes);

    model.rowHeights = nextSizes;
    this.syncToDOM();
    this.restoreSelection(table, selection.range);
    this.emitChange();
    return true;
  }

  public adjustCurrentCellBoundary(direction: 'left' | 'right' | 'up' | 'down', step: number): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const activeCell = this.getActiveCell(table);
    if (!activeCell) {
      return false;
    }

    const delta = Math.abs(step) * (direction === 'left' || direction === 'up' ? -1 : 1);
    if (!delta) {
      return false;
    }

    if (direction === 'left' || direction === 'right') {
      return this.resizeCellBoundarySegment(activeCell, 'col', delta, {
        edge: 'right',
      });
    }

    return this.resizeCellBoundarySegment(activeCell, 'row', delta, {
      edge: 'bottom',
    });
  }

  public setSelectionBackground(color: string | null): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const cells = this.getTargetCells(table);
    if (!cells.length) {
      return false;
    }

    cells.forEach(cell => {
      if (color) {
        cell.style.backgroundColor = color;
      } else {
        cell.style.removeProperty('background-color');
      }
    });

    this.emitChange();
    return true;
  }

  public setSelectionVerticalAlign(alignment: 'top' | 'middle' | 'bottom'): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const cells = this.getTargetCells(table);
    if (!cells.length) {
      return false;
    }

    cells.forEach(cell => {
      cell.style.verticalAlign = alignment;
    });

    this.emitChange();
    return true;
  }

  public setSelectionWhiteSpace(mode: 'normal' | 'nowrap'): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const cells = this.getTargetCells(table);
    if (!cells.length) {
      return false;
    }

    cells.forEach(cell => {
      if (mode === 'nowrap') {
        cell.style.whiteSpace = 'nowrap';
        cell.style.wordBreak = 'keep-all';
        cell.style.overflowWrap = 'normal';
      } else {
        cell.style.removeProperty('white-space');
        cell.style.removeProperty('word-break');
        cell.style.removeProperty('overflow-wrap');
      }
    });

    this.emitChange();
    return true;
  }

  public setSelectionPaddingPreset(preset: 'compact' | 'comfortable' | 'spacious'): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const cells = this.getTargetCells(table);
    if (!cells.length) {
      return false;
    }

    const padding =
      preset === 'compact'
        ? { top: 2, right: 5, bottom: 2, left: 5 }
        : preset === 'comfortable'
          ? { top: 6, right: 10, bottom: 6, left: 10 }
          : { top: 10, right: 14, bottom: 10, left: 14 };

    cells.forEach(cell => {
      cell.style.paddingTop = `${padding.top}px`;
      cell.style.paddingRight = `${padding.right}px`;
      cell.style.paddingBottom = `${padding.bottom}px`;
      cell.style.paddingLeft = `${padding.left}px`;
    });

    this.emitChange();
    return true;
  }

  public setSelectionNumericStyle(mode: 'default' | 'numeric'): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const cells = this.getTargetCells(table);
    if (!cells.length) {
      return false;
    }

    cells.forEach(cell => {
      if (mode === 'numeric') {
        cell.style.textAlign = 'right';
        cell.style.fontVariantNumeric = 'tabular-nums';
      } else {
        cell.style.removeProperty('font-variant-numeric');
        if (cell.style.textAlign === 'right') {
          cell.style.removeProperty('text-align');
        }
      }
    });

    this.emitChange();
    return true;
  }

  public setSelectionTextAlign(alignment: 'left' | 'center' | 'right' | 'justify'): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const cells = this.getTargetCells(table);
    if (!cells.length) {
      return false;
    }

    cells.forEach(cell => {
      cell.style.textAlign = alignment;
      cell.querySelectorAll('p, div').forEach(node => {
        (node as HTMLElement).style.textAlign = alignment;
      });
    });

    this.emitChange();
    return true;
  }

  public toggleTableClass(className: 'sc-table-header-row' | 'sc-table-zebra'): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    table.classList.toggle(className);
    this.emitChange();
    return true;
  }

  public setTableDensity(density: 'compact' | 'comfortable' | 'spacious'): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    this.clearDensityClasses(table);
    table.classList.add(`sc-table-density-${density}`);
    this.emitChange();
    return true;
  }

  public resetTableStyle(): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    table.classList.remove(
      'sc-table-header-row',
      'sc-table-zebra',
      'sc-table-fit-width',
      'sc-table-preset-meeting',
      'sc-table-first-column'
    );
    this.clearDensityClasses(table);
    this.emitChange();
    return true;
  }

  public applyMeetingPreset(): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    table.classList.add('sc-table-preset-meeting', 'sc-table-header-row', 'sc-table-fit-width');
    table.classList.remove('sc-table-zebra');
    this.clearDensityClasses(table);
    table.classList.add('sc-table-density-comfortable');
    table.style.width = '100%';
    table.style.maxWidth = '100%';
    table.style.tableLayout = 'fixed';

    const model = this.buildModel(table);
    const colgroup = this.ensureColgroup(table, model.colWidths.length);
    if (colgroup.length > 0) {
      const width = 100 / colgroup.length;
      colgroup.forEach(col => {
        col.style.width = `${width}%`;
      });
    }

    this.emitChange();
    return true;
  }

  public exitTable(): boolean {
    const table = this.getActiveTable();
    if (!table) {
      return false;
    }

    const selection = window.getSelection();
    if (!selection) {
      return false;
    }

    const range = table.ownerDocument.createRange();
    range.setStartAfter(table);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    this.deselectAllCells();
    this.deselectAllTables();
    this.setSelectionScopeState(null, null, 'cell');
    return true;
  }

  public deselectAllCells(forgetSelection = false) {
    document.querySelectorAll('.sc-cell-selected').forEach(cell => cell.classList.remove('sc-cell-selected'));
    if (forgetSelection) {
      this.clearRememberedSelection();
    }
    this.clearLegacyRoosterSelectionStyles();
  }

  public deselectAllTables() {
    document.querySelectorAll('.sc-selected-table').forEach(table => table.classList.remove('sc-selected-table'));
  }

  private updateSelection(current: { r: number; c: number }) {
    if (!this.model || !this.dragInfo?.selectionOrigin) {
      return;
    }

    const range = this.getNormalizedRange(this.dragInfo.selectionOrigin, current);
    this.restoreSelection(this.model.table, range);
  }

  private hasSelectionDragThreshold(e: PointerEvent | MouseEvent) {
    if (!this.dragInfo) {
      return false;
    }

    const startX = this.dragInfo.startX ?? e.clientX;
    const startY = this.dragInfo.startY ?? e.clientY;
    return Math.hypot(e.clientX - startX, e.clientY - startY) >= SELECTION_DRAG_THRESHOLD;
  }

  private resolvePointerCell(e: PointerEvent | MouseEvent): HTMLTableCellElement | null {
    if (!this.model) {
      return null;
    }

    const doc = this.model.table.ownerDocument;
    const hitTarget = doc.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const hitCell = hitTarget?.closest('td, th') as HTMLTableCellElement | null;
    if (hitCell && hitCell.closest('table') === this.model.table) {
      return hitCell;
    }

    const eventTarget = (e.target as HTMLElement | null)?.closest('td, th') as HTMLTableCellElement | null;
    if (eventTarget && eventTarget.closest('table') === this.model.table) {
      return eventTarget;
    }

    const cells = Array.from(this.model.table.querySelectorAll('td, th')) as HTMLTableCellElement[];
    for (const cell of cells) {
      const rect = cell.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        return cell;
      }
    }

    return null;
  }

  private lockBrowserTextSelection(doc: Document) {
    if (this.previousUserSelect) {
      return;
    }

    this.previousUserSelect = {
      userSelect: doc.body.style.userSelect,
      webkitUserSelect: (doc.body.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect || '',
    };

    doc.body.style.userSelect = 'none';
    (doc.body.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect = 'none';
  }

  private unlockBrowserTextSelection() {
    if (!this.previousUserSelect) {
      return;
    }

    document.body.style.userSelect = this.previousUserSelect.userSelect;
    (document.body.style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect =
      this.previousUserSelect.webkitUserSelect;
    this.previousUserSelect = null;
  }

  private emitChange() {
    this.onNotify();
  }

  private clearDensityClasses(table: HTMLTableElement) {
    table.classList.remove(
      'sc-table-density-compact',
      'sc-table-density-comfortable',
      'sc-table-density-spacious'
    );
  }

  private ensureColgroup(table: HTMLTableElement, count: number) {
    if (count <= 0) {
      return [] as HTMLTableColElement[];
    }

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
  }

  private setSelectionScopeState(
    table: HTMLTableElement | null,
    coords: { r: number; c: number } | null,
    scope: 'cell' | 'row' | 'column' | 'table'
  ) {
    this.selectionScopeState = { table, coords, scope };
  }

  private getNextNavigationTarget(
    range: ScSelectionRange,
    direction: 'up' | 'down' | 'left' | 'right' | 'next' | 'prev'
  ) {
    if (!this.model) {
      return null;
    }

    const maxRow = this.model.grid.length - 1;
    const maxCol = this.model.grid[0]?.length ? this.model.grid[0].length - 1 : -1;
    if (maxRow < 0 || maxCol < 0) {
      return null;
    }

    let r = range.start.r;
    let c = range.start.c;

    if (direction === 'right') {
      c = range.end.c + 1;
    } else if (direction === 'left') {
      c = range.start.c - 1;
    } else if (direction === 'down') {
      r = range.end.r + 1;
    } else if (direction === 'up') {
      r = range.start.r - 1;
    } else if (direction === 'next') {
      c = range.end.c + 1;
      if (c > maxCol) {
        c = 0;
        r = Math.min(maxRow, range.end.r + 1);
      }
    } else if (direction === 'prev') {
      c = range.start.c - 1;
      if (c < 0) {
        r = Math.max(0, range.start.r - 1);
        c = maxCol;
      }
    }

    r = Math.max(0, Math.min(maxRow, r));
    c = Math.max(0, Math.min(maxCol, c));
    return { r, c };
  }

  private focusCell(coords: { r: number; c: number }, placeAtEnd = false) {
    if (!this.model) {
      return;
    }

    const cell = this.model.grid[coords.r]?.[coords.c];
    if (!cell) {
      return;
    }

    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    const range = cell.ownerDocument.createRange();
    range.selectNodeContents(cell);
    range.collapse(!placeAtEnd);
    selection.removeAllRanges();
    selection.addRange(range);
    this.clearLegacyRoosterSelectionStyles(cell.closest('table') as HTMLTableElement | null);
  }

  private getActiveTable(): HTMLTableElement | null {
    const selectedTable = document.querySelector('.sc-selected-table') as HTMLTableElement | null;
    if (selectedTable) {
      return selectedTable;
    }

    const selectedCellTable = document.querySelector('.sc-cell-selected')?.closest('table') as HTMLTableElement | null;
    if (selectedCellTable) {
      return selectedCellTable;
    }

    const rememberedTable = this.rememberedSelectionState.table;
    if (rememberedTable?.isConnected) {
      return rememberedTable;
    }

    const anchor = this.getSelectionElement();
    return anchor?.closest('table') as HTMLTableElement | null;
  }

  private getSelectionElement(): HTMLElement | null {
    const selection = window.getSelection();
    if (!selection?.anchorNode) {
      return null;
    }

    return selection.anchorNode.nodeType === Node.TEXT_NODE
      ? selection.anchorNode.parentElement
      : (selection.anchorNode as HTMLElement);
  }

  private getActiveCell(table: HTMLTableElement): HTMLTableCellElement | null {
    const selectedCell = table.querySelector('.sc-cell-selected') as HTMLTableCellElement | null;
    if (selectedCell) {
      return selectedCell;
    }

    const rememberedRange = this.getRememberedSelectionRange(table);
    if (rememberedRange) {
      this.buildModel(table);
      const rememberedCell = this.model?.grid[rememberedRange.start.r]?.[rememberedRange.start.c] ?? null;
      if (rememberedCell) {
        return rememberedCell;
      }
    }

    const anchor = this.getSelectionElement();
    const anchorCell = anchor?.closest('td, th') as HTMLTableCellElement | null;
    if (anchorCell && anchorCell.closest('table') === table) {
      return anchorCell;
    }

    return table.querySelector('td, th');
  }

  private resolveActiveRange(table: HTMLTableElement): ScSelectionRange | null {
    this.buildModel(table);
    const selectedRange = this.getSelectedRange();
    if (selectedRange) {
      return selectedRange;
    }

    const rememberedRange = this.getRememberedSelectionRange(table);
    if (rememberedRange && this.model?.grid.length && this.model.grid[0]?.length) {
      const maxR = this.model.grid.length - 1;
      const maxC = this.model.grid[0].length - 1;
      return this.getNormalizedRange(
        {
          r: Math.max(0, Math.min(rememberedRange.start.r, maxR)),
          c: Math.max(0, Math.min(rememberedRange.start.c, maxC)),
        },
        {
          r: Math.max(0, Math.min(rememberedRange.end.r, maxR)),
          c: Math.max(0, Math.min(rememberedRange.end.c, maxC)),
        },
      );
    }

    const activeCell = this.getActiveCell(table);
    if (!activeCell) {
      return null;
    }

    const coords = this.getCellCoords(activeCell);
    if (!coords) {
      return null;
    }

    return this.getNormalizedRange(coords, coords);
  }

  private rangeContainsCoords(range: ScSelectionRange, coords: { r: number; c: number }) {
    return (
      coords.r >= range.start.r &&
      coords.r <= range.end.r &&
      coords.c >= range.start.c &&
      coords.c <= range.end.c
    );
  }

  private createResizePlan(
    index: number,
    totalCount: number,
    shiftStart: boolean,
  ): ScResizePlan | null {
    if (index < 0 || index >= totalCount) {
      return null;
    }

    if (shiftStart) {
      return {
        mode: 'free',
        positive: {
          growIndexes: [index],
          shrinkIndexes: [],
        },
        negative: {
          growIndexes: [index],
          shrinkIndexes: [],
        },
      };
    }

    const buildSinglePlan = () => {
      if (index + 1 >= totalCount) {
        return null;
      }

      return {
        mode: 'single' as const,
        positive: {
          growIndexes: [index],
          shrinkIndexes: [index + 1],
        },
        negative: {
          growIndexes: [index + 1],
          shrinkIndexes: [index],
        },
      };
    };

    const singlePlan = buildSinglePlan();
    return singlePlan;
  }

  private createSelectionBandResizePlan(totalCount: number, selectionIndexes: number[]): ScResizePlan | null {
    const uniqueSelection = Array.from(new Set(selectionIndexes))
      .filter(value => value >= 0 && value < totalCount)
      .sort((a, b) => a - b);

    if (!uniqueSelection.length) {
      return null;
    }

    const bandStart = uniqueSelection[0];
    const bandEnd = uniqueSelection[uniqueSelection.length - 1];
    const beforeBand = Array.from({ length: bandStart }, (_, value) => value);
    const afterBand = Array.from(
      { length: Math.max(0, totalCount - (bandEnd + 1)) },
      (_, value) => bandEnd + 1 + value,
    );

    const positiveShrinkIndexes = afterBand.length > 0 ? afterBand : beforeBand;
    const negativeGrowIndexes = beforeBand.length > 0 ? beforeBand : afterBand;

    if (!positiveShrinkIndexes.length || !negativeGrowIndexes.length) {
      return null;
    }

    return {
      mode: 'band',
      positive: {
        growIndexes: uniqueSelection,
        shrinkIndexes: positiveShrinkIndexes,
      },
      negative: {
        growIndexes: negativeGrowIndexes,
        shrinkIndexes: uniqueSelection,
      },
    };
  }

  private applyDirectionalResize(
    nextSizes: number[],
    delta: number,
    positiveGrowIndexes: number[],
    positiveShrinkIndexes: number[],
    negativeGrowIndexes: number[],
    negativeShrinkIndexes: number[],
    minSizes: number[],
  ) {
    if (!delta) {
      return;
    }

    if (delta > 0) {
      this.applyResizeDelta(nextSizes, positiveGrowIndexes, positiveShrinkIndexes, delta, minSizes);
      return;
    }

    this.applyResizeDelta(nextSizes, negativeGrowIndexes, negativeShrinkIndexes, Math.abs(delta), minSizes);
  }

  private applyDirectResize(
    nextSizes: number[],
    delta: number,
    targetIndexes: number[],
    minSizes: number[],
  ) {
    if (!delta || !targetIndexes.length) {
      return;
    }

    const currentTotal = targetIndexes.reduce((sum, targetIndex) => sum + nextSizes[targetIndex], 0);
    const minTotal = targetIndexes.reduce((sum, targetIndex) => sum + (minSizes[targetIndex] ?? 0), 0);
    const nextTotal = Math.max(minTotal, currentTotal + delta);

    this.distributeGroupSize(nextSizes, targetIndexes, nextTotal, minSizes);
  }

  private applyResizeDelta(
    nextSizes: number[],
    growIndexes: number[],
    shrinkIndexes: number[],
    requestedDelta: number,
    minSizes: number[],
  ) {
    if (!growIndexes.length || !shrinkIndexes.length) {
      return;
    }

    const growStartTotal = growIndexes.reduce((sum, targetIndex) => sum + nextSizes[targetIndex], 0);
    const shrinkStartTotal = shrinkIndexes.reduce((sum, targetIndex) => sum + nextSizes[targetIndex], 0);
    const minGrowTotal = growIndexes.reduce((sum, targetIndex) => sum + (minSizes[targetIndex] ?? 0), 0);
    const minShrinkTotal = shrinkIndexes.reduce((sum, targetIndex) => sum + (minSizes[targetIndex] ?? 0), 0);

    const maxPositiveDelta = Math.max(0, shrinkStartTotal - minShrinkTotal);
    const maxNegativeDelta = Math.max(0, growStartTotal - minGrowTotal);
    const delta = Math.max(-maxNegativeDelta, Math.min(maxPositiveDelta, requestedDelta));

    const growTargetTotal = growStartTotal + delta;
    const shrinkTargetTotal = shrinkStartTotal - delta;

    this.distributeGroupSize(nextSizes, growIndexes, growTargetTotal, minSizes);
    this.distributeGroupSize(nextSizes, shrinkIndexes, shrinkTargetTotal, minSizes);
  }

  private distributeGroupSize(
    sizes: number[],
    indexes: number[],
    targetTotal: number,
    minSizes: number[],
  ) {
    if (!indexes.length) {
      return;
    }

    const remaining = [...indexes];
    const assigned = new Map<number, number>();
    let remainingTarget = targetTotal;
    let remainingBase = remaining.reduce((sum, index) => sum + sizes[index], 0);

    while (remaining.length > 0) {
      let clamped = false;

      for (let pointer = remaining.length - 1; pointer >= 0; pointer -= 1) {
        const targetIndex = remaining[pointer];
        const minSize = minSizes[targetIndex] ?? 0;
        const ratio = remainingBase > 0 ? sizes[targetIndex] / remainingBase : 1 / remaining.length;
        const proposed = remainingTarget * ratio;

        if (proposed < minSize) {
          assigned.set(targetIndex, minSize);
          remainingTarget -= minSize;
          remainingBase -= sizes[targetIndex];
          remaining.splice(pointer, 1);
          clamped = true;
        }
      }

      if (!clamped) {
        break;
      }
    }

    if (remaining.length === 0) {
      assigned.forEach((value, targetIndex) => {
        sizes[targetIndex] = value;
      });
      return;
    }

    let consumed = 0;
    const baseTotal = remainingBase > 0 ? remainingBase : remaining.length;

    remaining.forEach((targetIndex, pointer) => {
      const minSize = minSizes[targetIndex] ?? 0;
      const ratio = remainingBase > 0 ? sizes[targetIndex] / baseTotal : 1 / remaining.length;
      const nextValue =
        pointer === remaining.length - 1
          ? remainingTarget - consumed
          : remainingTarget * ratio;
      const safeValue = Math.max(minSize, nextValue);
      sizes[targetIndex] = safeValue;
      consumed += safeValue;
    });

    assigned.forEach((value, targetIndex) => {
      sizes[targetIndex] = value;
    });
  }

  private measureRowMinSizes(table: HTMLTableElement) {
    const rows = Array.from(table.rows);
    if (rows.length === 0) {
      return [];
    }

    const previousHeights = rows.map(row => row.style.height);
    const previousTableHeight = table.style.height;

    rows.forEach(row => {
      row.style.height = 'auto';
    });
    table.style.height = '';

    const minSizes = rows.map(row => Math.max(MIN_ROW_HEIGHT, row.getBoundingClientRect().height));

    rows.forEach((row, index) => {
      row.style.height = previousHeights[index];
    });
    table.style.height = previousTableHeight;

    return minSizes;
  }

  private getSelectionBandIndices(table: HTMLTableElement) {
    this.buildModel(table);
    const range = this.resolveActiveRange(table);

    if (!this.model || !range) {
      return { range: null as ScSelectionRange | null, rows: [] as number[], cols: [] as number[] };
    }

    const rowIndexes = new Set<number>();
    const colIndexes = new Set<number>();
    const targetCells = this.getTargetCells(table);

    targetCells.forEach(cell => {
      const coords = this.getCellCoords(cell);
      if (!coords) {
        return;
      }

      for (let r = coords.r; r < coords.r + Math.max(1, cell.rowSpan || 1); r++) {
        rowIndexes.add(r);
      }

      for (let c = coords.c; c < coords.c + Math.max(1, cell.colSpan || 1); c++) {
        colIndexes.add(c);
      }
    });

    if (rowIndexes.size === 0 || colIndexes.size === 0) {
      for (let r = range.start.r; r <= range.end.r; r++) {
        rowIndexes.add(r);
      }

      for (let c = range.start.c; c <= range.end.c; c++) {
        colIndexes.add(c);
      }
    }

    return {
      range,
      rows: Array.from(rowIndexes).sort((a, b) => a - b),
      cols: Array.from(colIndexes).sort((a, b) => a - b),
    };
  }

  private getTargetCells(table: HTMLTableElement): HTMLTableCellElement[] {
    this.buildModel(table);
    if (!this.model) {
      return [];
    }

    const range = this.getSelectedRange() ?? this.getRememberedSelectionRange(table);
    const seen = new Set<HTMLTableCellElement>();
    const cells: HTMLTableCellElement[] = [];

    if (range) {
      for (let r = range.start.r; r <= range.end.r; r++) {
        for (let c = range.start.c; c <= range.end.c; c++) {
          const cell = this.model.grid[r]?.[c];
          if (cell && !seen.has(cell)) {
            seen.add(cell);
            cells.push(cell);
          }
        }
      }
      return cells;
    }

    const activeCell = this.getActiveCell(table);
    return activeCell ? [activeCell] : [];
  }

  private buildLayout(table: HTMLTableElement): ScTableLayout {
    const model = this.buildModel(table);
    const layout: ScTableLayout = {
      grid: [],
      cells: new Map<string, ScSerializedCell>(),
      colWidths: model.colWidths.length ? [...model.colWidths] : [],
      rowHeights: model.rowHeights.length ? [...model.rowHeights] : [],
    };

    Array.from(table.rows).forEach((tr, rIdx) => {
      if (!layout.grid[rIdx]) {
        layout.grid[rIdx] = [];
      }

      let cIdx = 0;
      Array.from(tr.cells).forEach(cell => {
        while (layout.grid[rIdx][cIdx]) {
          cIdx += 1;
        }

        const snapshot = this.serializeCell(cell as HTMLTableCellElement);
        layout.cells.set(snapshot.id, snapshot);

        const rowSpan = Math.max(1, (cell as HTMLTableCellElement).rowSpan || 1);
        const colSpan = Math.max(1, (cell as HTMLTableCellElement).colSpan || 1);

        for (let r = 0; r < rowSpan; r++) {
          if (!layout.grid[rIdx + r]) {
            layout.grid[rIdx + r] = [];
          }

          for (let c = 0; c < colSpan; c++) {
            layout.grid[rIdx + r][cIdx + c] = snapshot.id;
          }
        }

        cIdx += colSpan;
      });
    });

    const maxCols = Math.max(0, ...layout.grid.map(row => row.length));
    for (let r = 0; r < layout.grid.length; r++) {
      for (let c = 0; c < maxCols; c++) {
        if (!layout.grid[r][c]) {
          layout.grid[r][c] = this.createBlankCell(layout).id;
        }
      }
    }

    if (!layout.colWidths.length && maxCols > 0) {
      layout.colWidths = Array(maxCols).fill(DEFAULT_COL_WIDTH);
    }

    if (!layout.rowHeights.length && layout.grid.length > 0) {
      layout.rowHeights = Array(layout.grid.length).fill(DEFAULT_ROW_HEIGHT);
    }

    return layout;
  }

  private serializeCell(cell: HTMLTableCellElement): ScSerializedCell {
    const existingId = cell.dataset.scCellId;
    const id = existingId || this.nextCellId();
    cell.dataset.scCellId = id;

    const attrs = Array.from(cell.attributes)
      .filter(attr => !['rowspan', 'colspan', 'style', 'class', 'data-sc-cell-id'].includes(attr.name.toLowerCase()))
      .map(attr => [attr.name, attr.value] as [string, string]);

    return {
      id,
      tagName: cell.tagName.toLowerCase() as 'td' | 'th',
      html: cell.innerHTML,
      className: this.stripSelectionClasses(cell.className),
      style: this.sanitizeCellInlineStyle(cell.getAttribute('style') || '', cell.ownerDocument),
      attrs,
    };
  }

  private createBlankCell(layout: ScTableLayout, templateId?: string | null): ScSerializedCell {
    const template = templateId ? layout.cells.get(templateId) : undefined;
    const blank: ScSerializedCell = {
      id: this.nextCellId(),
      tagName: template?.tagName || 'td',
      html: '',
      className: template ? this.stripSelectionClasses(template.className) : '',
      style: template?.style || '',
      attrs: template?.attrs ? [...template.attrs] : [],
    };

    layout.cells.set(blank.id, blank);
    return blank;
  }

  private stripSelectionClasses(className: string) {
    return className
      .split(/\s+/)
      .filter(Boolean)
      .filter(name => name !== 'sc-cell-selected' && name !== 'sc-selected-cell')
      .join(' ');
  }

  private sanitizeCellInlineStyle(styleValue: string, doc: Document) {
    if (!styleValue) {
      return '';
    }

    const probe = doc.createElement('div');
    probe.setAttribute('style', styleValue);
    probe.style.removeProperty('width');
    probe.style.removeProperty('min-width');
    probe.style.removeProperty('max-width');
    probe.style.removeProperty('height');
    probe.style.removeProperty('min-height');
    probe.style.removeProperty('max-height');
    return probe.getAttribute('style') || '';
  }

  private nextCellId() {
    this.cellSeed += 1;
    return `sc-cell-${Date.now()}-${this.cellSeed}`;
  }

  private computeAreas(layout: ScTableLayout) {
    const areas = new Map<string, ScCellArea>();

    for (let r = 0; r < layout.grid.length; r++) {
      for (let c = 0; c < layout.grid[r].length; c++) {
        const id = layout.grid[r][c];
        if (!id || areas.has(id)) {
          continue;
        }

        let colSpan = 0;
        while (layout.grid[r][c + colSpan] === id) {
          colSpan += 1;
        }

        let rowSpan = 1;
        while (layout.grid[r + rowSpan]?.slice(c, c + colSpan).every(cellId => cellId === id)) {
          rowSpan += 1;
        }

        areas.set(id, { r, c, rowSpan, colSpan });
      }
    }

    return areas;
  }

  private clampRange(layout: ScTableLayout, range: ScSelectionRange | null): ScSelectionRange | null {
    if (!range || !layout.grid.length || !layout.grid[0]?.length) {
      return null;
    }

    const maxR = layout.grid.length - 1;
    const maxC = layout.grid[0].length - 1;

    return {
      start: {
        r: Math.max(0, Math.min(range.start.r, maxR)),
        c: Math.max(0, Math.min(range.start.c, maxC)),
      },
      end: {
        r: Math.max(0, Math.min(range.end.r, maxR)),
        c: Math.max(0, Math.min(range.end.c, maxC)),
      },
    };
  }

  private pickInsertedSize(values: number[], insertAt: number, fallback: number) {
    const prev = values[insertAt - 1];
    const next = values[insertAt];

    if (prev && next) {
      return (prev + next) / 2;
    }
    if (prev) {
      return prev;
    }
    if (next) {
      return next;
    }

    return fallback;
  }

  private findSelectionForCell(layout: ScTableLayout, id: string): ScSelectionRange | null {
    const area = this.computeAreas(layout).get(id);
    if (!area) {
      return null;
    }

    return {
      start: { r: area.r, c: area.c },
      end: { r: area.r + area.rowSpan - 1, c: area.c + area.colSpan - 1 },
    };
  }

  private resizeRowBoundarySegment(
    table: HTMLTableElement,
    layout: ScTableLayout,
    area: ScCellArea,
    cellId: string,
    boundaryIndex: number,
    edge: ScSegmentResizeEdge,
    delta: number,
  ) {
    void edge;
    if (boundaryIndex < 0 || boundaryIndex >= layout.rowHeights.length - 1) {
      return false;
    }

    if (delta > 0) {
      let remaining = Math.abs(delta);
      let activeBoundaryIndex = boundaryIndex;
      let changed = false;

      while (remaining > 0 && activeBoundaryIndex < layout.rowHeights.length - 1) {
        const nextRowIndex = activeBoundaryIndex + 1;
        const nextHeight = layout.rowHeights[nextRowIndex] ?? DEFAULT_ROW_HEIGHT;
        const partialCapacity = Math.max(0, nextHeight - MIN_SEGMENT_ROW_HEIGHT);
        const consumesWholeTrack = remaining >= nextHeight - SEGMENT_FULL_TRACK_TOLERANCE;

        if (consumesWholeTrack || partialCapacity <= 0) {
          if (partialCapacity <= 0 && remaining + SEGMENT_FULL_TRACK_TOLERANCE < nextHeight) {
            break;
          }
          this.applyRowSegmentOwnership(layout, nextRowIndex, activeBoundaryIndex, area);
          activeBoundaryIndex = nextRowIndex;
          remaining = Math.max(0, remaining - nextHeight);
          if (remaining <= SEGMENT_FULL_TRACK_TOLERANCE) {
            remaining = 0;
          }
          changed = true;
          continue;
        }

        const actual = Math.min(remaining, partialCapacity);
        const newRow = this.buildSegmentRow(layout, activeBoundaryIndex, area, 'grow-top');
        layout.grid.splice(nextRowIndex, 0, newRow);
        layout.rowHeights.splice(nextRowIndex, 0, actual);
        layout.rowHeights[nextRowIndex + 1] = Math.max(MIN_SEGMENT_ROW_HEIGHT, nextHeight - actual);

        activeBoundaryIndex = nextRowIndex;
        remaining -= actual;
        changed = true;
      }

      if (!changed) {
        return false;
      }

      this.normalizeCollapsedSegmentRows(layout);
      return this.commit(table, layout, this.findSelectionForCell(layout, cellId), {
        preserveSegmentTracks: true,
      });
    }

    let remaining = Math.abs(delta);
    let activeBoundaryIndex = boundaryIndex;
    let changed = false;

    while (remaining > 0 && activeBoundaryIndex >= 0) {
      const currentHeight = layout.rowHeights[activeBoundaryIndex] ?? DEFAULT_ROW_HEIGHT;
      const partialCapacity = Math.max(0, currentHeight - MIN_SEGMENT_ROW_HEIGHT);
      const consumesWholeTrack = remaining >= currentHeight - SEGMENT_FULL_TRACK_TOLERANCE;

      if (consumesWholeTrack || partialCapacity <= 0) {
        if (partialCapacity <= 0 && remaining + SEGMENT_FULL_TRACK_TOLERANCE < currentHeight) {
          break;
        }
        this.applyRowSegmentOwnership(layout, activeBoundaryIndex, activeBoundaryIndex + 1, area);
        activeBoundaryIndex -= 1;
        remaining = Math.max(0, remaining - currentHeight);
        if (remaining <= SEGMENT_FULL_TRACK_TOLERANCE) {
          remaining = 0;
        }
        changed = true;
        continue;
      }

      const actual = Math.min(remaining, partialCapacity);
      const newRow = this.buildSegmentRow(layout, activeBoundaryIndex, area, 'grow-bottom');
      layout.rowHeights[activeBoundaryIndex] = Math.max(MIN_SEGMENT_ROW_HEIGHT, currentHeight - actual);
      layout.grid.splice(activeBoundaryIndex + 1, 0, newRow);
      layout.rowHeights.splice(activeBoundaryIndex + 1, 0, actual);

      remaining -= actual;
      changed = true;
      activeBoundaryIndex += 1;
    }

    if (!changed) {
      return false;
    }

    this.normalizeCollapsedSegmentRows(layout);
    return this.commit(table, layout, this.findSelectionForCell(layout, cellId), {
      preserveSegmentTracks: true,
    });
  }

  private resizeColumnBoundarySegment(
    table: HTMLTableElement,
    layout: ScTableLayout,
    area: ScCellArea,
    cellId: string,
    boundaryIndex: number,
    edge: ScSegmentResizeEdge,
    delta: number,
  ) {
    void edge;
    if (boundaryIndex < 0 || boundaryIndex >= layout.colWidths.length - 1) {
      return false;
    }

    const independentSegmentResize = area.rowSpan > 1;

    if (delta > 0) {
      let remaining = Math.abs(delta);
      let activeBoundaryIndex = boundaryIndex;
      let changed = false;

      while (remaining > 0 && activeBoundaryIndex < layout.colWidths.length - 1) {
        const nextColIndex = activeBoundaryIndex + 1;
        const nextWidth = layout.colWidths[nextColIndex] ?? DEFAULT_COL_WIDTH;
        const partialCapacity = Math.max(0, nextWidth - MIN_SEGMENT_COL_WIDTH);
        const consumesWholeTrack = remaining >= nextWidth - SEGMENT_FULL_TRACK_TOLERANCE;

        if (consumesWholeTrack || partialCapacity <= 0) {
          if (partialCapacity <= 0 && remaining + SEGMENT_FULL_TRACK_TOLERANCE < nextWidth) {
            break;
          }
          this.applyColumnSegmentOwnershipFromColumn(layout, nextColIndex, activeBoundaryIndex, area);
          activeBoundaryIndex = nextColIndex;
          remaining = Math.max(0, remaining - nextWidth);
          if (remaining <= SEGMENT_FULL_TRACK_TOLERANCE) {
            remaining = 0;
          }
          changed = true;
          continue;
        }

        const actual = Math.min(remaining, partialCapacity);
        this.insertLayoutColumn(layout, nextColIndex);
        this.applyColumnSegmentOwnership(layout, nextColIndex, area, 'grow-left');
        layout.colWidths[nextColIndex] = actual;
        if (!independentSegmentResize) {
          layout.colWidths[nextColIndex + 1] = Math.max(MIN_SEGMENT_COL_WIDTH, nextWidth - actual);
        }
        activeBoundaryIndex = nextColIndex;
        remaining -= actual;
        changed = true;
      }

      if (!changed) {
        return false;
      }

      this.normalizeCollapsedSegmentColumns(layout);
      return this.commit(table, layout, this.findSelectionForCell(layout, cellId), {
        preserveSegmentTracks: true,
      });
    }

    let remaining = Math.abs(delta);
    let activeBoundaryIndex = boundaryIndex;
    let changed = false;

    while (remaining > 0 && activeBoundaryIndex >= 0) {
      const currentWidth = layout.colWidths[activeBoundaryIndex] ?? DEFAULT_COL_WIDTH;
      const partialCapacity = Math.max(0, currentWidth - MIN_SEGMENT_COL_WIDTH);
      const consumesWholeTrack = remaining >= currentWidth - SEGMENT_FULL_TRACK_TOLERANCE;

      if (consumesWholeTrack || partialCapacity <= 0) {
        if (partialCapacity <= 0 && remaining + SEGMENT_FULL_TRACK_TOLERANCE < currentWidth) {
          break;
        }
        this.applyColumnSegmentOwnershipFromColumn(
          layout,
          activeBoundaryIndex,
          activeBoundaryIndex + 1,
          area,
        );
        activeBoundaryIndex -= 1;
        remaining = Math.max(0, remaining - currentWidth);
        if (remaining <= SEGMENT_FULL_TRACK_TOLERANCE) {
          remaining = 0;
        }
        changed = true;
        continue;
      }

      const actual = Math.min(remaining, partialCapacity);
      layout.colWidths[activeBoundaryIndex] = Math.max(MIN_SEGMENT_COL_WIDTH, currentWidth - actual);
      if (!independentSegmentResize) {
        layout.colWidths[activeBoundaryIndex + 1] =
          (layout.colWidths[activeBoundaryIndex + 1] ?? DEFAULT_COL_WIDTH) + actual;
      }

      remaining -= actual;
      changed = true;
    }

    if (!changed) {
      return false;
    }

    this.normalizeCollapsedSegmentColumns(layout);
    return this.commit(table, layout, this.findSelectionForCell(layout, cellId), {
      preserveSegmentTracks: true,
    });
  }

  private normalizeCollapsedSegmentRows(layout: ScTableLayout) {
    for (let rowIndex = layout.grid.length - 1; rowIndex > 0; rowIndex -= 1) {
      const rowHeight = layout.rowHeights[rowIndex] ?? DEFAULT_ROW_HEIGHT;
      if (rowHeight > MIN_SEGMENT_ROW_HEIGHT) {
        continue;
      }

      const row = layout.grid[rowIndex];
      const prevRow = layout.grid[rowIndex - 1];
      const nextRow = layout.grid[rowIndex + 1];
      const sameAsPrev = prevRow ? this.areStringArraysEqual(row, prevRow) : false;
      const sameAsNext = nextRow ? this.areStringArraysEqual(row, nextRow) : false;

      if (sameAsPrev || sameAsNext) {
        layout.grid.splice(rowIndex, 1);
        layout.rowHeights.splice(rowIndex, 1);
      }
    }

    this.mergeAdjacentIdenticalSegmentRows(layout);
  }

  private normalizeCollapsedSegmentColumns(layout: ScTableLayout) {
    for (let colIndex = layout.colWidths.length - 1; colIndex > 0; colIndex -= 1) {
      const colWidth = layout.colWidths[colIndex] ?? DEFAULT_COL_WIDTH;
      if (colWidth > MIN_SEGMENT_COL_WIDTH) {
        continue;
      }

      const sameAsPrev = this.areColumnsEqual(layout, colIndex, colIndex - 1);
      const sameAsNext = colIndex + 1 < layout.colWidths.length
        ? this.areColumnsEqual(layout, colIndex, colIndex + 1)
        : false;

      if (sameAsPrev || sameAsNext) {
        layout.grid.forEach(row => {
          row.splice(colIndex, 1);
        });
        layout.colWidths.splice(colIndex, 1);
      }
    }

    this.mergeAdjacentIdenticalSegmentColumns(layout);
  }

  private mergeAdjacentIdenticalSegmentRows(layout: ScTableLayout) {
    for (let rowIndex = 0; rowIndex < layout.grid.length - 1;) {
      const current = layout.grid[rowIndex];
      const next = layout.grid[rowIndex + 1];

      if (!this.areStringArraysEqual(current, next)) {
        rowIndex += 1;
        continue;
      }

      layout.rowHeights[rowIndex] =
        (layout.rowHeights[rowIndex] ?? DEFAULT_ROW_HEIGHT) +
        (layout.rowHeights[rowIndex + 1] ?? DEFAULT_ROW_HEIGHT);
      layout.rowHeights.splice(rowIndex + 1, 1);
      layout.grid.splice(rowIndex + 1, 1);
    }
  }

  private mergeAdjacentIdenticalSegmentColumns(layout: ScTableLayout) {
    for (let colIndex = 0; colIndex < layout.colWidths.length - 1;) {
      if (!this.areColumnsEqual(layout, colIndex, colIndex + 1)) {
        colIndex += 1;
        continue;
      }

      layout.colWidths[colIndex] =
        (layout.colWidths[colIndex] ?? DEFAULT_COL_WIDTH) +
        (layout.colWidths[colIndex + 1] ?? DEFAULT_COL_WIDTH);
      layout.colWidths.splice(colIndex + 1, 1);
      layout.grid.forEach(row => {
        row.splice(colIndex + 1, 1);
      });
    }
  }

  private materializeFitWidthTable(table: HTMLTableElement) {
    if (!table.classList.contains('sc-table-fit-width')) {
      return;
    }

    const model = this.buildModel(table);
    const totalWidth = model.colWidths.reduce((sum, width) => sum + width, 0);
    table.classList.remove('sc-table-fit-width');
    table.style.width = `${Math.max(MIN_COL_WIDTH, totalWidth)}px`;
    table.style.maxWidth = '100%';
    table.style.tableLayout = 'fixed';
  }

  private areStringArraysEqual(left: string[] = [], right: string[] = []) {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => value === right[index]);
  }

  private areColumnsEqual(layout: ScTableLayout, leftIndex: number, rightIndex: number) {
    for (let rowIndex = 0; rowIndex < layout.grid.length; rowIndex += 1) {
      if ((layout.grid[rowIndex]?.[leftIndex] ?? null) !== (layout.grid[rowIndex]?.[rightIndex] ?? null)) {
        return false;
      }
    }

    return true;
  }

  private buildSegmentRow(
    layout: ScTableLayout,
    boundaryIndex: number,
    area: ScCellArea,
    mode: 'grow-top' | 'grow-bottom',
  ) {
    const topRow = layout.grid[boundaryIndex] ?? [];
    const bottomRow = layout.grid[boundaryIndex + 1] ?? [];
    const segmentStart = area.c;
    const segmentEnd = area.c + area.colSpan - 1;
    const row: string[] = [];

    for (let c = 0; c < topRow.length; c++) {
      const inSegment = c >= segmentStart && c <= segmentEnd;
      row[c] = inSegment
        ? mode === 'grow-top'
          ? topRow[c]
          : bottomRow[c]
        : mode === 'grow-top'
          ? bottomRow[c]
          : topRow[c];
    }

    return row;
  }

  private applyRowSegmentOwnership(
    layout: ScTableLayout,
    targetRowIndex: number,
    sourceRowIndex: number,
    area: ScCellArea,
  ) {
    const targetRow = layout.grid[targetRowIndex];
    const sourceRow = layout.grid[sourceRowIndex];
    if (!targetRow || !sourceRow) {
      return;
    }

    const segmentStart = area.c;
    const segmentEnd = area.c + area.colSpan - 1;
    for (let c = segmentStart; c <= segmentEnd; c++) {
      targetRow[c] = sourceRow[c];
    }
  }

  private applyColumnSegmentOwnership(
    layout: ScTableLayout,
    insertedIndex: number,
    area: ScCellArea,
    mode: 'grow-left' | 'grow-right',
  ) {
    const segmentStart = area.r;
    const segmentEnd = area.r + area.rowSpan - 1;

    for (let r = 0; r < layout.grid.length; r++) {
      const inSegment = r >= segmentStart && r <= segmentEnd;
      const leftId = layout.grid[r][insertedIndex - 1];
      const rightId = layout.grid[r][insertedIndex + 1];

      layout.grid[r][insertedIndex] = inSegment
        ? mode === 'grow-left'
          ? leftId
          : rightId
        : mode === 'grow-left'
          ? rightId
          : leftId;
    }
  }

  private applyColumnSegmentOwnershipFromColumn(
    layout: ScTableLayout,
    targetColumnIndex: number,
    sourceColumnIndex: number,
    area: ScCellArea,
  ) {
    const segmentStart = area.r;
    const segmentEnd = area.r + area.rowSpan - 1;

    for (let r = segmentStart; r <= segmentEnd; r++) {
      if (!layout.grid[r]) {
        continue;
      }
      layout.grid[r][targetColumnIndex] = layout.grid[r][sourceColumnIndex];
    }
  }

  private insertLayoutRow(layout: ScTableLayout, insertAt: number) {
    const rowCount = layout.grid.length;
    const colCount = layout.grid[0]?.length ?? 0;
    const targetIndex = Math.max(0, Math.min(insertAt, rowCount));
    const areas = this.computeAreas(layout);
    const newRow: string[] = [];

    for (let c = 0; c < colCount; c++) {
      let nextId: string | null = null;

      if (targetIndex > 0) {
        const aboveId = layout.grid[targetIndex - 1][c];
        const area = areas.get(aboveId);
        if (area && area.r < targetIndex && area.r + area.rowSpan > targetIndex) {
          nextId = aboveId;
        }
      }

      if (!nextId) {
        const templateId =
          layout.grid[Math.min(targetIndex, rowCount - 1)]?.[c] ??
          layout.grid[Math.max(0, targetIndex - 1)]?.[c] ??
          null;
        nextId = this.createBlankCell(layout, templateId).id;
      }

      newRow.push(nextId);
    }

    layout.grid.splice(targetIndex, 0, newRow);
    layout.rowHeights.splice(
      targetIndex,
      0,
      this.pickInsertedSize(layout.rowHeights, targetIndex, DEFAULT_ROW_HEIGHT)
    );

    return targetIndex;
  }

  private insertLayoutColumn(layout: ScTableLayout, insertAt: number) {
    const rowCount = layout.grid.length;
    const colCount = layout.grid[0]?.length ?? 0;
    const targetIndex = Math.max(0, Math.min(insertAt, colCount));
    const areas = this.computeAreas(layout);

    for (let r = 0; r < rowCount; r++) {
      let nextId: string | null = null;

      if (targetIndex > 0) {
        const leftId = layout.grid[r][targetIndex - 1];
        const area = areas.get(leftId);
        if (area && area.c < targetIndex && area.c + area.colSpan > targetIndex) {
          nextId = leftId;
        }
      }

      if (!nextId) {
        const templateId =
          layout.grid[r][Math.min(targetIndex, colCount - 1)] ??
          layout.grid[r][Math.max(0, targetIndex - 1)] ??
          null;
        nextId = this.createBlankCell(layout, templateId).id;
      }

      layout.grid[r].splice(targetIndex, 0, nextId);
    }

    layout.colWidths.splice(
      targetIndex,
      0,
      this.pickInsertedSize(layout.colWidths, targetIndex, DEFAULT_COL_WIDTH)
    );

    return targetIndex;
  }

  private applyCellBorders(
    cell: HTMLTableCellElement,
    flags: { top: boolean; right: boolean; bottom: boolean; left: boolean },
    borderValue: string | null
  ) {
    const value = borderValue ?? '0 none transparent';

    if (flags.top) {
      cell.style.borderTop = value;
    }
    if (flags.right) {
      cell.style.borderRight = value;
    }
    if (flags.bottom) {
      cell.style.borderBottom = value;
    }
    if (flags.left) {
      cell.style.borderLeft = value;
    }
  }

  private commit(
    table: HTMLTableElement,
    layout: ScTableLayout,
    selection: ScSelectionRange | null,
    options?: {
      preserveSegmentTracks?: boolean;
    },
  ) {
    this.normalizeLayoutTracks(layout, options);
    this.cleanupUnusedCells(layout);

    if (!layout.grid.length || !layout.grid[0]?.length) {
      return this.deleteTable(table);
    }

    this.rebuildTable(table, layout);
    this.buildModel(table);
    if (this.model) {
      this.model.colWidths = [...layout.colWidths];
      this.model.rowHeights = [...layout.rowHeights];
    }

    this.syncToDOM();
    this.restoreSelection(table, selection);
    this.emitChange();
    return true;
  }

  private normalizeLayoutTracks(
    layout: ScTableLayout,
    options?: {
      preserveSegmentTracks?: boolean;
    },
  ) {
    if (options?.preserveSegmentTracks) {
      return;
    }

    for (let r = 0; r < layout.grid.length - 1;) {
      const current = layout.grid[r];
      const next = layout.grid[r + 1];
      const canMerge =
        current.length === next.length &&
        current.every((cellId, index) => cellId === next[index]);

      if (!canMerge) {
        r += 1;
        continue;
      }

      layout.rowHeights[r] = (layout.rowHeights[r] ?? DEFAULT_ROW_HEIGHT) + (layout.rowHeights[r + 1] ?? DEFAULT_ROW_HEIGHT);
      layout.rowHeights.splice(r + 1, 1);
      layout.grid.splice(r + 1, 1);
    }

    for (let c = 0; c < layout.colWidths.length - 1;) {
      const canMerge = layout.grid.every(row => row[c] === row[c + 1]);
      if (!canMerge) {
        c += 1;
        continue;
      }

      layout.colWidths[c] = (layout.colWidths[c] ?? DEFAULT_COL_WIDTH) + (layout.colWidths[c + 1] ?? DEFAULT_COL_WIDTH);
      layout.colWidths.splice(c + 1, 1);
      layout.grid.forEach(row => {
        row.splice(c + 1, 1);
      });
    }
  }

  private cleanupUnusedCells(layout: ScTableLayout) {
    const usedIds = new Set(layout.grid.flat());
    Array.from(layout.cells.keys()).forEach(id => {
      if (!usedIds.has(id)) {
        layout.cells.delete(id);
      }
    });
  }

  private rebuildTable(table: HTMLTableElement, layout: ScTableLayout) {
    const doc = table.ownerDocument;
    const fitWidth = table.classList.contains('sc-table-fit-width');
    const areas = this.computeAreas(layout);

    table.innerHTML = '';

    const colgroup = doc.createElement('colgroup');
    layout.colWidths.forEach(width => {
      const col = doc.createElement('col');
      if (fitWidth) {
        col.style.width = `${width}px`;
      } else {
        col.style.width = `${Math.max(MIN_SEGMENT_COL_WIDTH, width)}px`;
      }
      colgroup.appendChild(col);
    });
    table.appendChild(colgroup);

    const tbody = doc.createElement('tbody');
    for (let r = 0; r < layout.grid.length; r++) {
      const tr = doc.createElement('tr');
      if (layout.rowHeights[r]) {
        tr.style.height = `${Math.max(MIN_SEGMENT_ROW_HEIGHT, layout.rowHeights[r])}px`;
      }

      for (let c = 0; c < layout.grid[r].length; c++) {
        const id = layout.grid[r][c];
        const area = areas.get(id);
        if (!area || area.r !== r || area.c !== c) {
          continue;
        }

        const snapshot = layout.cells.get(id) || this.createBlankCell(layout);
        const cell = doc.createElement(snapshot.tagName) as HTMLTableCellElement;
        cell.dataset.scCellId = snapshot.id;

        snapshot.attrs.forEach(([name, value]) => {
          cell.setAttribute(name, value);
        });

        if (snapshot.className) {
          cell.className = snapshot.className;
        }

        if (snapshot.style) {
          cell.setAttribute('style', snapshot.style);
        }

        if (area.rowSpan > 1) {
          cell.rowSpan = area.rowSpan;
        }

        if (area.colSpan > 1) {
          cell.colSpan = area.colSpan;
        }

        cell.innerHTML = snapshot.html;
        tr.appendChild(cell);
      }

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
  }

  private restoreSelection(table: HTMLTableElement, range: ScSelectionRange | null) {
    this.buildModel(table);
    if (!this.model) {
      return;
    }

    this.deselectAllCells();
    this.deselectAllTables();
    table.classList.add('sc-selected-table');

    const clamped = this.clampRange(this.buildLayout(table), range);
    if (!clamped) {
      this.clearRememberedSelection(table);
      return;
    }

    const normalized = this.getNormalizedRange(clamped.start, clamped.end);
    this.rememberSelection(table, normalized);
    const seen = new Set<HTMLTableCellElement>();

    for (let r = normalized.start.r; r <= normalized.end.r; r++) {
      for (let c = normalized.start.c; c <= normalized.end.c; c++) {
        const cell = this.model.grid[r]?.[c];
        if (cell && !seen.has(cell)) {
          cell.classList.add('sc-cell-selected');
          seen.add(cell);
        }
      }
    }

    // 브라우저 기본 텍스트 selection 잔상을 비우고, 커스텀 셀 선택만 보이게 유지한다.
    this.focusCell(normalized.start);
    this.clearLegacyRoosterSelectionStyles(table);
  }

  private cloneRange(range: ScSelectionRange | null): ScSelectionRange | null {
    if (!range) {
      return null;
    }

    return {
      start: { ...range.start },
      end: { ...range.end },
    };
  }

  private rememberSelection(table: HTMLTableElement | null, range: ScSelectionRange | null) {
    this.rememberedSelectionState = {
      table,
      range: this.cloneRange(range),
    };
  }

  private getRememberedSelectionRange(table: HTMLTableElement) {
    if (this.rememberedSelectionState.table !== table) {
      return null;
    }

    return this.cloneRange(this.rememberedSelectionState.range);
  }

  private clearRememberedSelection(tableArg?: HTMLTableElement | null) {
    if (!tableArg || this.rememberedSelectionState.table === tableArg) {
      this.rememberSelection(null, null);
    }
  }

  private clearLegacyRoosterSelectionStyles(tableArg?: HTMLTableElement | null) {
    const doc =
      tableArg?.ownerDocument ??
      this.model?.table?.ownerDocument ??
      document;
    const tableId = tableArg?.id ?? null;

    Array.from(doc.styleSheets).forEach(sheet => {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        return;
      }

      for (let i = rules.length - 1; i >= 0; i--) {
        const rule = rules[i];
        if (!(rule instanceof CSSStyleRule)) {
          continue;
        }

        const selector = rule.selectorText || '';
        if (!selector.includes('#contentDiv_')) {
          continue;
        }

        const targetsCurrentTable = tableId ? selector.includes(`#${tableId}`) : selector.includes('#table_');
        const looksLikeLegacyCellShade =
          selector.includes('td:nth-child') &&
          Boolean(rule.style.backgroundColor);

        if (!targetsCurrentTable || !looksLikeLegacyCellShade) {
          continue;
        }

        try {
          sheet.deleteRule(i);
        } catch {}
      }
    });
  }
}

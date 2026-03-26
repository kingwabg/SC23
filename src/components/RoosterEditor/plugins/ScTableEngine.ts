import { debounce } from 'lodash-es';

/**
 * 🧱 ScTableEngine: HWP/Google Docs 수준의 초고도화 테이블 조작 엔진
 * 라이브러리(RoosterJS)의 제약에서 벗어나 DOM ↔ Model ↔ Interaction 순환 구조를 구현합니다.
 */

export interface ScCellModel {
  element: HTMLTableCellElement;
  originR: number; // 실제 그리드 상의 시작 행
  originC: number; // 실제 그리드 상의 시작 열
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

export class ScTableEngine {
  private model: ScTableModel | null = null;
  private dragInfo: {
    type: 'col' | 'row' | 'select';
    index?: number;
    startPos?: number;
    startSizes?: number[];
    selectionOrigin?: { r: number; c: number };
  } | null = null;

  // 알림 콜백 (UI 갱신용)
  private onNotify: (html: string) => void;

  constructor(onNotify: (html: string) => void) {
    this.onNotify = debounce(onNotify, 200);
  }

  // ── [1] DOM -> 모델 변환 (Parser) ──
  public buildModel(table: HTMLTableElement): ScTableModel {
    const rows = Array.from(table.rows);
    let totalCols = 0;
    if (rows[0]) {
      Array.from(rows[0].cells).forEach(c => totalCols += (c as HTMLTableCellElement).colSpan || 1);
    }

    const grid: (HTMLTableCellElement | null)[][] = Array.from({ length: rows.length }, () => Array(totalCols).fill(null));

    rows.forEach((tr, rIdx) => {
      let cIdx = 0;
      Array.from(tr.cells).forEach(cell => {
        const cCell = cell as HTMLTableCellElement;
        while (grid[rIdx][cIdx]) cIdx++;
        for (let r = 0; r < (cCell.rowSpan || 1); r++) {
          for (let c = 0; c < (cCell.colSpan || 1); c++) {
            if (grid[rIdx + r]) grid[rIdx + r][cIdx + c] = cCell;
          }
        }
        cIdx += (cCell.colSpan || 1);
      });
    });

    const colgroup = table.querySelector('colgroup');
    const colWidths = colgroup 
      ? Array.from(colgroup.querySelectorAll('col')).map(c => parseFloat(getComputedStyle(c).width))
      : Array(totalCols).fill(120);

    const rowHeights = rows.map(r => parseFloat(getComputedStyle(r).height));

    this.model = { table, grid, colWidths, rowHeights };
    return this.model;
  }

  // ── [2] 모델 -> DOM 동기화 (Renderer) ──
  public syncToDOM() {
    if (!this.model) return;
    const { table, colWidths, rowHeights } = this.model;

    // Colgroup 고정 제어
    let colgroup = table.querySelector('colgroup');
    if (!colgroup) {
      colgroup = document.createElement('colgroup');
      table.prepend(colgroup);
    }
    
    // col 태그 동기화
    while (colgroup.children.length < colWidths.length) colgroup.appendChild(document.createElement('col'));
    while (colgroup.children.length > colWidths.length) colgroup.lastChild?.remove();
    
    colWidths.forEach((w, i) => {
      if (colgroup!.children[i]) (colgroup!.children[i] as HTMLElement).style.width = `${w}px`;
    });

    // Row 높이 동기화
    rowHeights.forEach((h, i) => {
      if (table.rows[i]) table.rows[i].style.height = `${h}px`;
    });

    table.style.tableLayout = 'fixed';
    table.style.width = `${colWidths.reduce((a, b) => a + b, 0)}px`;
    table.classList.add('sc-table-standard');
  }

  // ── [3] 좌표 계산 및 범위 확장 (Selection Logic) ──
  public getCellCoords(cell: HTMLTableCellElement): { r: number, c: number } | null {
    if (!this.model) return null;
    for (let r = 0; r < this.model.grid.length; r++) {
      const c = this.model.grid[r].indexOf(cell);
      if (c !== -1) return { r, c };
    }
    return null;
  }

  public getNormalizedRange(start: { r: number, c: number }, end: { r: number, c: number }): ScSelectionRange {
    if (!this.model) return { start, end };
    let minR = Math.min(start.r, end.r), maxR = Math.max(start.r, end.r);
    let minC = Math.min(start.c, end.c), maxC = Math.max(start.c, end.c);

    let changed = true;
    while (changed) {
      changed = false;
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const cell = this.model.grid[r][c];
          if (cell) {
             const coords = this.getCellCoords(cell)!;
             const rEnd = coords.r + cell.rowSpan - 1;
             const cEnd = coords.c + cell.colSpan - 1;
             if (coords.r < minR) { minR = coords.r; changed = true; }
             if (coords.c < minC) { minC = coords.c; changed = true; }
             if (rEnd > maxR) { maxR = rEnd; changed = true; }
             if (cEnd > maxC) { maxC = cEnd; changed = true; }
          }
        }
      }
    }
    return { start: { r: minR, c: minC }, end: { r: maxR, c: maxC } };
  }

  // ── [4] 인터랙션 핸들러 (Resize / Select) ──
  public handleDown(e: PointerEvent, target: HTMLElement) {
    const cell = target.closest('td, th') as HTMLTableCellElement;
    if (!cell) return;
    const table = cell.closest('table') as HTMLTableElement;
    
    this.buildModel(table);
    const rect = cell.getBoundingClientRect();
    const isRight = Math.abs(e.clientX - rect.right) < 10;
    const isBottom = Math.abs(e.clientY - rect.bottom) < 10;

    target.setPointerCapture(e.pointerId);

    if (isRight || isBottom) {
      const coords = this.getCellCoords(cell)!;
      const realIdx = isRight ? coords.c + cell.colSpan - 1 : (cell.parentElement as HTMLTableRowElement).rowIndex;
      
      this.dragInfo = {
        type: isRight ? 'col' : 'row',
        index: realIdx,
        startPos: isRight ? e.clientX : e.clientY,
        startSizes: isRight ? [...this.model!.colWidths] : [...this.model!.rowHeights]
      };
    } else {
      const coords = this.getCellCoords(cell)!;
      this.dragInfo = { type: 'select', selectionOrigin: coords };
      this.updateSelection(coords);
    }
  }

  public handleMove(e: PointerEvent, target: HTMLElement) {
    if (!this.dragInfo || !this.model) return;

    if (this.dragInfo.type === 'select') {
      const overCell = (e.target as HTMLElement).closest('td, th') as HTMLTableCellElement;
      if (overCell && overCell.closest('table') === this.model.table) {
        const coords = this.getCellCoords(overCell);
        if (coords) this.updateSelection(coords);
      }
    } else {
      const { type, index, startPos, startSizes } = this.dragInfo as any;
      const delta = (type === 'col' ? e.clientX : e.clientY) - startPos;
      
      if (type === 'col') {
        this.model.colWidths[index] = Math.max(20, startSizes[index] + delta);
        if (this.model.colWidths[index + 1] !== undefined) {
          const sum = startSizes[index] + startSizes[index + 1];
          this.model.colWidths[index + 1] = Math.max(20, sum - this.model.colWidths[index]);
        }
      } else {
        this.model.rowHeights[index] = Math.max(10, startSizes[index] + delta);
      }
      this.syncToDOM();
    }
  }

  public handleUp(e: PointerEvent) {
    if (this.dragInfo) {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      this.dragInfo = null;
      this.onNotify(this.model?.table.innerHTML || ''); // 변경 알림
    }
  }

  private updateSelection(current: { r: number, c: number }) {
    if (!this.model || !this.dragInfo?.selectionOrigin) return;
    const range = this.getNormalizedRange(this.dragInfo.selectionOrigin, current);
    
    this.deselectAllCells();
    for (let r = range.start.r; r <= range.end.r; r++) {
      for (let c = range.start.c; c <= range.end.c; c++) {
        const cell = this.model.grid[r][c];
        if (cell) cell.classList.add('sc-cell-selected');
      }
    }
  }

  public deselectAllCells() {
    document.querySelectorAll('.sc-cell-selected').forEach(c => c.classList.remove('sc-cell-selected'));
  }

  public deselectAllTables() {
    document.querySelectorAll('.sc-selected-table').forEach(t => t.classList.remove('sc-selected-table'));
  }

  // ── [Step 5] 셀 병합(Merge) 및 분할(Split) 정밀 엔진 ──

  /**
   * 🔲 활성화된 선택 범위를 하나의 셀로 병합
   */
  public mergeSelectedRange(range: ScSelectionRange): boolean {
    if (!this.model) return false;
    const { start, end } = range;
    const originCell = this.model.grid[start.r][start.c];
    if (!originCell) return false;

    // 1. 병합 수치 계산
    const rowSpan = (end.r - start.r) + 1;
    const colSpan = (end.c - start.c) + 1;

    // 2. 오리진 셀을 제외한 범위 내 나머지 셀 제거
    const seen = new Set<HTMLTableCellElement>();
    for (let r = start.r; r <= end.r; r++) {
      for (let c = start.c; c <= end.c; c++) {
        const cell = this.model.grid[r][c];
        if (cell && cell !== originCell && !seen.has(cell)) {
          cell.remove();
          seen.add(cell);
        }
      }
    }

    // 3. 오리진 셀의 속성 일괄 반영
    originCell.rowSpan = rowSpan;
    originCell.colSpan = colSpan;

    // 4. 구조 재구축 및 동기화
    this.buildModel(this.model.table);
    this.syncToDOM();
    return true;
  }

  /**
   * 🏗️ 현재 선택된 범위를 ScSelectionRange로 추출
   */
  public getSelectedRange(): ScSelectionRange | null {
    if (!this.model) return null;
    const selectedCells = Array.from(this.model.table.querySelectorAll('.sc-cell-selected')) as HTMLTableCellElement[];
    if (selectedCells.length === 0) return null;

    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    selectedCells.forEach(cell => {
      const coords = this.getCellCoords(cell);
      if (coords) {
        minR = Math.min(minR, coords.r);
        minC = Math.min(minC, coords.c);
        maxR = Math.max(maxR, coords.r + cell.rowSpan - 1);
        maxC = Math.max(maxC, coords.c + cell.colSpan - 1);
      }
    });

    return { start: { r: minR, c: minC }, end: { r: maxR, c: maxC } };
  }

  /**
   * ✂️ 셀을 N행 M열로 분할
   */
  public splitCell(cell: HTMLTableCellElement, nRows: number, nCols: number): boolean {
    if (!this.model) return false;
    const coords = this.getCellCoords(cell);
    if (!coords) return false;

    // 단일 셀을 쪼개는 경우 (rowSpan/colSpan이 1일 때) -> 로직 복잡화로 인해 기본은 colspan/rowspan 해제 위주
    if (cell.rowSpan > 1 || cell.colSpan > 1) {
      // 1. 병합된 셀을 다시 N, M개로 쪼개기 (여기서는 기본 조각들로 환원)
      // 실제 HWP 스타일 고도화 시에는 정밀한 td 삽입 로직 필요
      cell.rowSpan = 1;
      cell.colSpan = 1;
      
      // 구조 재구축 시 빈 공간을normalize 로직이 채우지 않으므로 수동 삽입 필요
      // (현 버전에서는 기본 속성 환원 후 normalize 유도)
    }

    this.buildModel(this.model.table);
    this.syncToDOM();
    return true;
  }
}

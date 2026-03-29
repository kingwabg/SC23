import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import './TableOverlay.css';

interface Props {
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
  editorRef: React.RefObject<any>;
}

interface OverlayRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ShiftGuide {
  axis: 'row' | 'col';
  offset: number;
  spanStart: number;
  spanSize: number;
  targetIndex: number;
  logicalStart: number;
  logicalEnd: number;
  edge: 'top' | 'bottom' | 'left' | 'right';
  cell: HTMLTableCellElement;
}

interface ShiftPreviewPointer {
  x: number;
  y: number;
}

interface RecentShiftGuideTarget {
  tableKey: string;
  axis: ShiftGuide['axis'];
  offset: number;
  spanStart: number;
  spanSize: number;
  expiresAt: number;
}

interface ShiftGuideSnapTarget {
  offset: number;
  spanStart: number;
  spanSize: number;
}

const MIN_TABLE_WIDTH = 96;
const MIN_TABLE_HEIGHT = 32;
const DEFAULT_COL_WIDTH = 120;
const DEFAULT_ROW_HEIGHT = 32;
const MIN_COL_WIDTH = 48;
const MIN_ROW_HEIGHT = 18;
const MIN_SEGMENT_COL_WIDTH = 1;
const MIN_SEGMENT_ROW_HEIGHT = 1;
const SHIFT_GUIDE_THRESHOLD = 24;
const SHIFT_GUIDE_STICKY_THRESHOLD = 28;
const SHIFT_GUIDE_SNAP_THRESHOLD = 14;
const SHIFT_GUIDE_MIN_MOVEMENT_FOR_SNAP = 6;
const SHIFT_GUIDE_COMMIT_SNAP_THRESHOLD = 22;
const SHIFT_GUIDE_COMMIT_MIN_MOVEMENT = 2;
const SHIFT_GUIDE_SAFE_SNAP_MIN_COL = 32;
const SHIFT_GUIDE_SAFE_SNAP_MIN_ROW = 14;
const SHIFT_GUIDE_RECENT_SNAP_BONUS = 12;
const SHIFT_GUIDE_RECENT_SNAP_TTL = 1200;
const SHIFT_GUIDE_TABLE_KEY_ATTR = 'data-sc-shift-snap-key';

const getSelectionTable = (container: HTMLElement) => {
  const selection = container.ownerDocument.getSelection?.() ?? window.getSelection();
  if (!selection?.anchorNode) return null;

  const anchor =
    selection.anchorNode.nodeType === Node.TEXT_NODE
      ? selection.anchorNode.parentElement
      : (selection.anchorNode as HTMLElement | null);

  const table = anchor?.closest('table') as HTMLTableElement | null;
  return table && container.contains(table) ? table : null;
};

const resolveActiveTable = (
  container: HTMLElement,
  preferred?: HTMLTableElement | null,
  allowSelectionFallback = true,
  options?: {
    forcePreferred?: boolean;
  },
) => {
  if (options?.forcePreferred && preferred?.isConnected && container.contains(preferred)) {
    return preferred;
  }

  const selectionTable = allowSelectionFallback ? getSelectionTable(container) : null;

  if (preferred?.isConnected && container.contains(preferred)) {
    if (preferred.classList.contains('sc-selected-table')) {
      return preferred;
    }

    if (selectionTable === preferred) {
      return preferred;
    }
  }

  const selectedTable = container.querySelector('table.sc-selected-table') as HTMLTableElement | null;
  if (selectedTable) {
    return selectedTable;
  }

  return selectionTable;
};

const getLogicalColumnCount = (table: HTMLTableElement) => {
  return Array.from(table.rows).reduce((maxCount, row) => {
    const logicalCount = Array.from(row.cells).reduce(
      (count, cell) => count + ((cell as HTMLTableCellElement).colSpan || 1),
      0,
    );
    return Math.max(maxCount, logicalCount);
  }, 0);
};

const getDomCellCoords = (table: HTMLTableElement, targetCell: HTMLTableCellElement) => {
  const occupancy: HTMLTableCellElement[][] = [];
  const rows = Array.from(table.rows);

  for (let r = 0; r < rows.length; r += 1) {
    const row = rows[r];
    if (!occupancy[r]) {
      occupancy[r] = [];
    }

    let c = 0;
    const cells = Array.from(row.cells) as HTMLTableCellElement[];
    for (const cell of cells) {
      while (occupancy[r][c]) {
        c += 1;
      }

      const rowSpan = Math.max(1, cell.rowSpan || 1);
      const colSpan = Math.max(1, cell.colSpan || 1);

      if (cell === targetCell) {
        return { r, c };
      }

      for (let rr = 0; rr < rowSpan; rr += 1) {
        if (!occupancy[r + rr]) {
          occupancy[r + rr] = [];
        }
        for (let cc = 0; cc < colSpan; cc += 1) {
          occupancy[r + rr][c + cc] = cell;
        }
      }

      c += colSpan;
    }
  }

  return null;
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

const getCurrentColumnWidths = (table: HTMLTableElement) => {
  const cols = ensureColgroup(table);
  if (cols.length > 0) {
    return cols.map(col => {
      const width = parseFloat(getComputedStyle(col).width);
      return Number.isFinite(width) && width > 0 ? width : MIN_COL_WIDTH;
    });
  }

  const firstRow = table.rows[0];
  if (!firstRow) return [];

  return Array.from(firstRow.cells).map(cell => {
    const width = (cell as HTMLTableCellElement).getBoundingClientRect().width;
    return Math.max(MIN_COL_WIDTH, width || MIN_COL_WIDTH);
  });
};

const getCurrentRowHeights = (table: HTMLTableElement) => {
  return Array.from(table.rows).map(row => {
    const height = row.getBoundingClientRect().height;
    return Math.max(MIN_ROW_HEIGHT, height || MIN_ROW_HEIGHT);
  });
};

const scaleSizes = (sourceSizes: number[], targetTotal: number, minSize: number) => {
  if (sourceSizes.length === 0) return [];

  const sourceTotal = sourceSizes.reduce((sum, size) => sum + size, 0) || targetTotal || sourceSizes.length * minSize;
  const scaled = sourceSizes.map(size => Math.max(minSize, (size / sourceTotal) * targetTotal));
  const actualTotal = scaled.reduce((sum, size) => sum + size, 0);
  const diff = targetTotal - actualTotal;

  if (scaled.length > 0) {
    scaled[scaled.length - 1] = Math.max(minSize, scaled[scaled.length - 1] + diff);
  }

  return scaled;
};

const spansTouchOrOverlap = (
  startA: number,
  sizeA: number,
  startB: number,
  sizeB: number,
) => {
  const touchTolerance = 2;
  const endA = startA + sizeA;
  const endB = startB + sizeB;
  const touches =
    Math.abs(endA - startB) <= touchTolerance ||
    Math.abs(endB - startA) <= touchTolerance;
  const overlaps = startA < endB - touchTolerance && endA > startB + touchTolerance;
  return touches || overlaps;
};

const spansNearlyMatch = (
  startA: number,
  sizeA: number,
  startB: number,
  sizeB: number,
) => {
  const tolerance = 4;
  const endA = startA + sizeA;
  const endB = startB + sizeB;
  return Math.abs(startA - startB) <= tolerance && Math.abs(endA - endB) <= tolerance;
};

const spanContainsPoint = (
  spanStart: number,
  spanSize: number,
  point: number,
  tolerance = 6,
) => {
  return point >= spanStart - tolerance && point <= spanStart + spanSize + tolerance;
};

const mergeRecentShiftGuideTarget = (
  previous: RecentShiftGuideTarget | null,
  next: RecentShiftGuideTarget,
) => {
  if (!previous) {
    return next;
  }

  if (previous.tableKey !== next.tableKey || previous.axis !== next.axis) {
    return next;
  }

  if (Math.abs(previous.offset - next.offset) > 3) {
    return next;
  }

  if (!spansNearlyMatch(previous.spanStart, previous.spanSize, next.spanStart, next.spanSize)) {
    return next;
  }

  return next;
};

const ensureShiftGuideTableKey = (table: HTMLTableElement) => {
  const existing = table.getAttribute(SHIFT_GUIDE_TABLE_KEY_ATTR);
  if (existing) {
    return existing;
  }

  const key = `sc-shift-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  table.setAttribute(SHIFT_GUIDE_TABLE_KEY_ATTR, key);
  return key;
};

const applyScaledColumnWidths = (table: HTMLTableElement, sourceWidths: number[], targetWidth: number) => {
  const cols = ensureColgroup(table);
  if (cols.length === 0) return;

  const finalWidth = Math.max(MIN_TABLE_WIDTH, targetWidth);
  const scaledWidths = scaleSizes(sourceWidths.length ? sourceWidths : Array(cols.length).fill(MIN_COL_WIDTH), finalWidth, MIN_COL_WIDTH);

  table.classList.remove('sc-table-fit-width');
  table.style.minWidth = '';
  table.style.maxWidth = `${finalWidth}px`;
  table.style.width = `${finalWidth}px`;
  table.style.tableLayout = 'fixed';

  cols.forEach((col, index) => {
    col.style.width = `${scaledWidths[index] ?? MIN_COL_WIDTH}px`;
  });
};

const applyScaledRowHeights = (table: HTMLTableElement, sourceHeights: number[], targetHeight: number) => {
  const rows = Array.from(table.rows);
  if (rows.length === 0) return;

  const finalHeight = Math.max(MIN_TABLE_HEIGHT, targetHeight);
  const scaledHeights = scaleSizes(
    sourceHeights.length ? sourceHeights : Array(rows.length).fill(MIN_ROW_HEIGHT),
    finalHeight,
    MIN_ROW_HEIGHT,
  );

  rows.forEach((row, index) => {
    row.style.height = `${scaledHeights[index] ?? MIN_ROW_HEIGHT}px`;
  });

  table.style.height = `${scaledHeights.reduce((sum, size) => sum + size, 0)}px`;
  table.style.minHeight = '';
};

export default function TableOverlay({ editorContainerRef, editorRef }: Props) {
  const [selectedTable, setSelectedTable] = useState<HTMLTableElement | null>(null);
  const [rect, setRect] = useState<OverlayRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [shiftGuide, setShiftGuide] = useState<ShiftGuide | null>(null);
  const [shiftGuidePreviewOffset, setShiftGuidePreviewOffset] = useState(0);
  const [shiftPreviewPointer, setShiftPreviewPointer] = useState<ShiftPreviewPointer | null>(null);
  const selectedTableRef = useRef<HTMLTableElement | null>(null);
  const lastTableInteractionRef = useRef<HTMLTableElement | null>(null);
  const rectRef = useRef<OverlayRect | null>(null);
  const isShiftPressedRef = useRef(false);
  const suppressSelectionFallbackRef = useRef(false);
  const suppressCellSelectionUntilRef = useRef(0);
  const shiftGuidePreviewOffsetRef = useRef(0);
  const shiftGuideRef = useRef<ShiftGuide | null>(null);
  const shiftGuideDragRef = useRef<ShiftGuide | null>(null);
  const shiftGuideSnapTargetsRef = useRef<ShiftGuideSnapTarget[]>([]);
  const recentShiftGuideTargetRef = useRef<RecentShiftGuideTarget | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  
  const startPos = useRef({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    colWidths: [] as number[],
    rowHeights: [] as number[],
  });

  useEffect(() => {
    selectedTableRef.current = selectedTable;
  }, [selectedTable]);

  useEffect(() => {
    rectRef.current = rect;
  }, [rect]);

  useEffect(() => {
    isShiftPressedRef.current = isShiftPressed;
  }, [isShiftPressed]);

  useEffect(() => {
    shiftGuidePreviewOffsetRef.current = shiftGuidePreviewOffset;
  }, [shiftGuidePreviewOffset]);

  useEffect(() => {
    shiftGuideRef.current = shiftGuide;
  }, [shiftGuide]);

  const updateRect = useCallback((tableArg?: HTMLTableElement | null) => {
    const table = tableArg ?? selectedTableRef.current;
    if (!table?.isConnected) {
      selectedTableRef.current = null;
      setSelectedTable(null);
      setRect(null);
      return;
    }

    ensureShiftGuideTableKey(table);

    const tableRect = table.getBoundingClientRect();

    setRect({
      top: tableRect.top + window.scrollY,
      left: tableRect.left + window.scrollX,
      width: tableRect.width,
      height: tableRect.height,
    });
  }, []);

  const getEngineCellCoords = useCallback((table: HTMLTableElement, cell: HTMLTableCellElement) => {
    const engine = editorRef.current?.scTableEngine;
    if (!engine?.buildModel || !engine?.getCellCoords) {
      return getDomCellCoords(table, cell);
    }

    try {
      engine.buildModel(table);
      return (engine.getCellCoords(cell) as { r: number; c: number } | null) ?? getDomCellCoords(table, cell);
    } catch {
      return getDomCellCoords(table, cell);
    }
  }, [editorRef]);

  const clearShiftGuide = useCallback(() => {
    setShiftGuide(null);
    setShiftGuidePreviewOffset(0);
    setShiftPreviewPointer(null);
  }, []);

  const resetShiftInteractionState = useCallback((
    options?: {
      clearRecentTarget?: boolean;
    },
  ) => {
    clearShiftGuide();
    shiftGuideDragRef.current = null;
    shiftGuideSnapTargetsRef.current = [];
    shiftGuidePreviewOffsetRef.current = 0;
    if (options?.clearRecentTarget) {
      recentShiftGuideTargetRef.current = null;
    }
  }, [clearShiftGuide]);

  const findClosestShiftCell = useCallback((
    container: HTMLElement,
    clientX: number,
    clientY: number,
    preferredTable?: HTMLTableElement | null,
  ) => {
    let best:
      | {
          cell: HTMLTableCellElement;
          table: HTMLTableElement;
          distance: number;
        }
      | null = null;

    const tables = Array.from(container.querySelectorAll('table')) as HTMLTableElement[];
    const orderedTables = preferredTable?.isConnected && container.contains(preferredTable)
      ? [preferredTable, ...tables.filter(table => table !== preferredTable)]
      : tables;
    orderedTables.forEach(table => {
      const tableRect = table.getBoundingClientRect();
      if (
        clientX < tableRect.left - SHIFT_GUIDE_THRESHOLD ||
        clientX > tableRect.right + SHIFT_GUIDE_THRESHOLD ||
        clientY < tableRect.top - SHIFT_GUIDE_THRESHOLD ||
        clientY > tableRect.bottom + SHIFT_GUIDE_THRESHOLD
      ) {
        return;
      }

      const cells = Array.from(table.querySelectorAll('td, th')) as HTMLTableCellElement[];
      cells.forEach(cell => {
        const rect = cell.getBoundingClientRect();
        const withinExpandedBounds =
          clientX >= rect.left - SHIFT_GUIDE_THRESHOLD &&
          clientX <= rect.right + SHIFT_GUIDE_THRESHOLD &&
          clientY >= rect.top - SHIFT_GUIDE_THRESHOLD &&
          clientY <= rect.bottom + SHIFT_GUIDE_THRESHOLD;

        if (!withinExpandedBounds) {
          return;
        }

        const edgeDistance = Math.min(
          Math.abs(clientX - rect.left),
          Math.abs(clientX - rect.right),
          Math.abs(clientY - rect.top),
          Math.abs(clientY - rect.bottom),
        );

        if (!best || edgeDistance < best.distance) {
          best = {
            cell,
            table,
            distance: edgeDistance,
          };
        }
      });
    });

    return best;
  }, []);

  const updateShiftGuideAtPointer = useCallback((
    clientX: number,
    clientY: number,
    shiftPressed: boolean,
  ) => {
    if (shiftGuideDragRef.current) {
      return;
    }

    if (!shiftPressed) {
      clearShiftGuide();
      return;
    }

    const container = editorContainerRef.current;

    if (!container) {
      clearShiftGuide();
      return;
    }

    const hit = document.elementFromPoint(clientX, clientY) as HTMLElement | null;

    const directCell = hit?.closest('td, th') as HTMLTableCellElement | null;
    const directTable = directCell?.closest('table') as HTMLTableElement | null;
    const fallbackPreferredTable =
      directTable ??
      lastTableInteractionRef.current ??
      selectedTableRef.current;
    const fallback = !directCell || !directTable || !container.contains(directTable)
      ? findClosestShiftCell(container, clientX, clientY, fallbackPreferredTable)
      : null;
    const cell = directCell ?? fallback?.cell ?? null;
    const activeTable = directTable ?? fallback?.table ?? null;

    if (!cell || !activeTable || !container.contains(activeTable)) {
      clearShiftGuide();
      return;
    }

    suppressSelectionFallbackRef.current = false;

    const didTableChange = selectedTableRef.current !== activeTable;

    if (didTableChange) {
      editorRef.current?.scTableEngine?.deselectAllTables?.();
      editorRef.current?.scTableEngine?.deselectAllCells?.();
      container
        .querySelectorAll('table.sc-selected-table')
        .forEach((table) => table.classList.remove('sc-selected-table'));
      resetShiftInteractionState({ clearRecentTarget: true });
      selectedTableRef.current = activeTable;
      lastTableInteractionRef.current = activeTable;
      setSelectedTable(activeTable);
      updateRect(activeTable);
    }

    if (!activeTable.classList.contains('sc-selected-table')) {
      activeTable.classList.add('sc-selected-table');
    }

    const tableRect = activeTable.getBoundingClientRect();
    const activeRect =
      !didTableChange && rectRef.current
        ? rectRef.current
        : {
            top: tableRect.top + window.scrollY,
            left: tableRect.left + window.scrollX,
            width: tableRect.width,
            height: tableRect.height,
          };

    const maxRowIndex = activeTable.rows.length - 1;
    const maxColIndex = getLogicalColumnCount(activeTable) - 1;
    const collectCandidatesForCell = (
      candidateCell: HTMLTableCellElement,
      candidateTable: HTMLTableElement,
    ) => {
      const nextCandidates: Array<ShiftGuide & { distance: number }> = [];
      const candidateRect = candidateCell.getBoundingClientRect();
      const candidateCoords = getEngineCellCoords(candidateTable, candidateCell);
      if (!candidateCoords) {
        return nextCandidates;
      }

      const logicalColStart = candidateCoords.c;
      const logicalColEnd = candidateCoords.c + Math.max(1, candidateCell.colSpan || 1) - 1;
      const logicalRowStart = candidateCoords.r;
      const logicalRowEnd = candidateCoords.r + Math.max(1, candidateCell.rowSpan || 1) - 1;
      const currentColWidths = getCurrentColumnWidths(candidateTable);

      const bottomDistance = Math.abs(clientY - candidateRect.bottom);
      const bottomTargetIndex = candidateCoords.r + Math.max(1, candidateCell.rowSpan || 1) - 1;
      if (bottomDistance <= SHIFT_GUIDE_THRESHOLD && bottomTargetIndex < maxRowIndex) {
        nextCandidates.push({
          axis: 'row',
          offset: Math.max(0, Math.min(activeRect.height, candidateRect.bottom - tableRect.top)),
          spanStart: Math.max(0, Math.min(activeRect.width, candidateRect.left - tableRect.left)),
          spanSize: Math.max(0, Math.min(activeRect.width, candidateRect.width)),
          targetIndex: bottomTargetIndex,
          logicalStart: logicalColStart,
          logicalEnd: logicalColEnd,
          edge: 'bottom',
          cell: candidateCell,
          distance: bottomDistance,
        });
      }

      const topDistance = Math.abs(clientY - candidateRect.top);
      const topTargetIndex = candidateCoords.r - 1;
      if (topDistance <= SHIFT_GUIDE_THRESHOLD && topTargetIndex >= 0) {
        nextCandidates.push({
          axis: 'row',
          offset: Math.max(0, Math.min(activeRect.height, candidateRect.top - tableRect.top)),
          spanStart: Math.max(0, Math.min(activeRect.width, candidateRect.left - tableRect.left)),
          spanSize: Math.max(0, Math.min(activeRect.width, candidateRect.width)),
          targetIndex: topTargetIndex,
          logicalStart: logicalColStart,
          logicalEnd: logicalColEnd,
          edge: 'top',
          cell: candidateCell,
          distance: topDistance,
        });
      }

      const rightDistance = Math.abs(clientX - candidateRect.right);
      const rightTargetIndex = candidateCoords.c + Math.max(1, candidateCell.colSpan || 1) - 1;
      if (rightDistance <= SHIFT_GUIDE_THRESHOLD && rightTargetIndex < maxColIndex) {
        nextCandidates.push({
          axis: 'col',
          offset: Math.max(0, Math.min(activeRect.width, candidateRect.right - tableRect.left)),
          spanStart: Math.max(0, Math.min(activeRect.height, candidateRect.top - tableRect.top)),
          spanSize: Math.max(0, Math.min(activeRect.height, candidateRect.height)),
          targetIndex: rightTargetIndex,
          logicalStart: logicalRowStart,
          logicalEnd: logicalRowEnd,
          edge: 'right',
          cell: candidateCell,
          distance: rightDistance,
        });
      }

      const leftDistance = Math.abs(clientX - candidateRect.left);
      const leftTargetIndex = candidateCoords.c - 1;
      if (leftDistance <= SHIFT_GUIDE_THRESHOLD && leftTargetIndex >= 0) {
        nextCandidates.push({
          axis: 'col',
          offset: Math.max(0, Math.min(activeRect.width, candidateRect.left - tableRect.left)),
          spanStart: Math.max(0, Math.min(activeRect.height, candidateRect.top - tableRect.top)),
          spanSize: Math.max(0, Math.min(activeRect.height, candidateRect.height)),
          targetIndex: leftTargetIndex,
          logicalStart: logicalRowStart,
          logicalEnd: logicalRowEnd,
          edge: 'left',
          cell: candidateCell,
          distance: leftDistance,
        });
      }

      if ((candidateCell.rowSpan || 1) > 1) {
        for (let boundaryIndex = logicalRowStart; boundaryIndex < logicalRowEnd; boundaryIndex += 1) {
          const boundaryRow = candidateTable.rows[boundaryIndex];
          if (!boundaryRow) {
            continue;
          }

          const boundaryOffset = Math.max(
            0,
            Math.min(activeRect.height, boundaryRow.getBoundingClientRect().bottom - tableRect.top),
          );
          const boundaryDistance = Math.abs(clientY - (tableRect.top + boundaryOffset));

          if (boundaryDistance > SHIFT_GUIDE_THRESHOLD) {
            continue;
          }

          nextCandidates.push({
            axis: 'row',
            offset: boundaryOffset,
            spanStart: Math.max(0, Math.min(activeRect.width, candidateRect.left - tableRect.left)),
            spanSize: Math.max(0, Math.min(activeRect.width, candidateRect.width)),
            targetIndex: boundaryIndex,
            logicalStart: logicalColStart,
            logicalEnd: logicalColEnd,
            edge: clientY >= tableRect.top + boundaryOffset ? 'top' : 'bottom',
            cell: candidateCell,
            distance: boundaryDistance,
          });
        }
      }

      if ((candidateCell.colSpan || 1) > 1) {
        let cumulativeWidth = 0;
        for (let colIndex = 0; colIndex <= logicalColEnd; colIndex += 1) {
          cumulativeWidth += currentColWidths[colIndex] ?? DEFAULT_COL_WIDTH;
          if (colIndex < logicalColStart || colIndex >= logicalColEnd) {
            continue;
          }

          const boundaryOffset = Math.max(0, Math.min(activeRect.width, cumulativeWidth));
          const boundaryDistance = Math.abs(clientX - (tableRect.left + boundaryOffset));

          if (boundaryDistance > SHIFT_GUIDE_THRESHOLD) {
            continue;
          }

          nextCandidates.push({
            axis: 'col',
            offset: boundaryOffset,
            spanStart: Math.max(0, Math.min(activeRect.height, candidateRect.top - tableRect.top)),
            spanSize: Math.max(0, Math.min(activeRect.height, candidateRect.height)),
            targetIndex: colIndex,
            logicalStart: logicalRowStart,
            logicalEnd: logicalRowEnd,
            edge: clientX >= tableRect.left + boundaryOffset ? 'left' : 'right',
            cell: candidateCell,
            distance: boundaryDistance,
          });
        }
      }

      return nextCandidates;
    };

    let candidates = collectCandidatesForCell(cell, activeTable);

    if (candidates.length === 0) {
      const nearby = findClosestShiftCell(container, clientX, clientY, activeTable);
      if (nearby?.cell && nearby.table === activeTable && nearby.cell !== cell) {
        candidates = collectCandidatesForCell(nearby.cell, activeTable);
      }
    }

    if (candidates.length === 0) {
      const fallbackCandidates = new Map<string, ShiftGuide & { distance: number }>();
      const allCells = Array.from(activeTable.querySelectorAll('td, th')) as HTMLTableCellElement[];
      allCells.forEach((candidateCell) => {
        const cellCandidates = collectCandidatesForCell(candidateCell, activeTable);
        cellCandidates.forEach((candidate) => {
          const key = [
            candidate.axis,
            candidate.edge,
            candidate.targetIndex,
            Math.round(candidate.offset * 100) / 100,
            Math.round(candidate.spanStart * 100) / 100,
            Math.round(candidate.spanSize * 100) / 100,
          ].join(':');
          const previous = fallbackCandidates.get(key);
          if (!previous || candidate.distance < previous.distance) {
            fallbackCandidates.set(key, candidate);
          }
        });
      });
      candidates = Array.from(fallbackCandidates.values());
    }

    const pointerAlongRowSpan = Math.max(0, Math.min(activeRect.width, clientX - tableRect.left));
    const pointerAlongColSpan = Math.max(0, Math.min(activeRect.height, clientY - tableRect.top));
    const pointerRowOffset = Math.max(0, Math.min(activeRect.height, clientY - tableRect.top));
    const pointerColOffset = Math.max(0, Math.min(activeRect.width, clientX - tableRect.left));

    if (candidates.length === 0) {
      const currentGuide = shiftGuideRef.current;
      const currentTable = selectedTableRef.current;
      const pointerAlongCurrentSpan =
        currentGuide?.axis === 'row' ? pointerAlongRowSpan : pointerAlongColSpan;
      const pointerAlongCurrentOffset =
        currentGuide?.axis === 'row' ? pointerRowOffset : pointerColOffset;

      if (
        currentGuide &&
        currentTable === activeTable &&
        spanContainsPoint(currentGuide.spanStart, currentGuide.spanSize, pointerAlongCurrentSpan, 10) &&
        Math.abs(pointerAlongCurrentOffset - currentGuide.offset) <= SHIFT_GUIDE_STICKY_THRESHOLD
      ) {
        return;
      }

      clearShiftGuide();
      return;
    }

    candidates.sort((a, b) => {
      const aContainsPointer =
        a.axis === 'row'
          ? spanContainsPoint(a.spanStart, a.spanSize, pointerAlongRowSpan)
          : spanContainsPoint(a.spanStart, a.spanSize, pointerAlongColSpan);
      const bContainsPointer =
        b.axis === 'row'
          ? spanContainsPoint(b.spanStart, b.spanSize, pointerAlongRowSpan)
          : spanContainsPoint(b.spanStart, b.spanSize, pointerAlongColSpan);

      if (aContainsPointer !== bContainsPointer) {
        return aContainsPointer ? -1 : 1;
      }

      const aAxisDistance =
        a.axis === 'row'
          ? Math.abs(a.offset - pointerRowOffset)
          : Math.abs(a.offset - pointerColOffset);
      const bAxisDistance =
        b.axis === 'row'
          ? Math.abs(b.offset - pointerRowOffset)
          : Math.abs(b.offset - pointerColOffset);

      if (aAxisDistance !== bAxisDistance) {
        return aAxisDistance - bAxisDistance;
      }

      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }
      return 0;
    });
    const { distance: _, ...nextGuide } = candidates[0];
    setShiftGuide(nextGuide);
  }, [
    clearShiftGuide,
    editorContainerRef,
    findClosestShiftCell,
    getEngineCellCoords,
    resetShiftInteractionState,
    updateRect,
  ]);

  const syncSelectedTable = useCallback((
    preferred?: HTMLTableElement | null,
    options?: { clear?: boolean; forcePreferred?: boolean },
  ) => {
    const container = editorContainerRef.current;
    if (!container) return;

    if (options?.clear) {
      suppressSelectionFallbackRef.current = true;
    } else if (preferred?.isConnected && container.contains(preferred)) {
      suppressSelectionFallbackRef.current = false;
    }

    const selectedTable = container.querySelector('table.sc-selected-table') as HTMLTableElement | null;
    if (selectedTable) {
      suppressSelectionFallbackRef.current = false;
    }

    const preferredTable = options?.clear ? null : preferred ?? selectedTableRef.current;
    const table = resolveActiveTable(
      container,
      preferredTable,
      !suppressSelectionFallbackRef.current,
      { forcePreferred: options?.forcePreferred },
    );

    if (table) {
      suppressSelectionFallbackRef.current = false;
    }

    const previousTable = selectedTableRef.current;
    const didTableChange = previousTable !== table;

    if (didTableChange) {
      resetShiftInteractionState({ clearRecentTarget: true });
    }

    selectedTableRef.current = table;
    lastTableInteractionRef.current = table ?? lastTableInteractionRef.current;

    setSelectedTable(current => (current === table ? current : table));

    if (table) {
      updateRect(table);
    } else {
      setRect(null);
    }
  }, [editorContainerRef, resetShiftInteractionState, updateRect]);

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const isNearCellBoundary = (cell: HTMLTableCellElement, clientX: number, clientY: number) => {
      const rect = cell.getBoundingClientRect();
      const edgeDistance = Math.min(
        Math.abs(clientX - rect.left),
        Math.abs(clientX - rect.right),
        Math.abs(clientY - rect.top),
        Math.abs(clientY - rect.bottom),
      );
      return edgeDistance <= 10;
    };

    const scheduleSync = (
      preferred?: HTMLTableElement | null,
      options?: { clear?: boolean; forcePreferred?: boolean },
    ) => {
      window.requestAnimationFrame(() => syncSelectedTable(preferred, options));
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.tbl-overlay-container')) {
        return;
      }

      const table = target.closest('table') as HTMLTableElement | null;
      const cell = target.closest('td, th') as HTMLTableCellElement | null;
      const selectedTable = container.querySelector('table.sc-selected-table') as HTMLTableElement | null;
      const wantsBoundaryInteraction =
        Boolean(cell) && isNearCellBoundary(cell, e.clientX, e.clientY);

      if (
        table &&
        container.contains(table) &&
        (table === selectedTable || e.shiftKey || wantsBoundaryInteraction)
      ) {
        lastTableInteractionRef.current = table;
        scheduleSync(table, { forcePreferred: true });
      } else if (table && container.contains(table)) {
        lastTableInteractionRef.current = table;
        suppressSelectionFallbackRef.current = false;
        return;
      } else if (
        !target.closest('.contexify') &&
        !target.closest('.tbl-color-panel')
      ) {
        scheduleSync(null, { clear: true });
      }
    };

    const handleDocumentMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        container.contains(target) ||
        target.closest('.tbl-overlay-container') ||
        target.closest('.contexify') ||
        target.closest('.tbl-color-panel') ||
        target.closest('.rooster-toolbar')
      ) {
        return;
      }

      scheduleSync(null, { clear: true });
    };

    const handleSelectionChange = () => {
      if (Date.now() < suppressCellSelectionUntilRef.current) {
        return;
      }
      if (isShiftPressedRef.current || shiftGuideDragRef.current || shiftGuideRef.current) {
        return;
      }
      scheduleSync();
    };
    const handleInteractionEnd = () => scheduleSync();
    const handleViewportChange = () => updateRect();
    const handleClickCapture = (e: MouseEvent) => {
      if (Date.now() >= suppressCellSelectionUntilRef.current) {
        return;
      }

      const target = e.target as HTMLElement | null;
      const table = selectedTableRef.current;
      if (!target || !table) {
        return;
      }

      const hitTable = target.closest('table') as HTMLTableElement | null;
      if (hitTable !== table) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
    };

    const observer = new MutationObserver(() => {
      if (isShiftPressedRef.current || shiftGuideDragRef.current || shiftGuideRef.current) {
        return;
      }
      scheduleSync();
    });

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseup', handleInteractionEnd);
    container.addEventListener('keyup', handleInteractionEnd);
    document.addEventListener('mousedown', handleDocumentMouseDown);
    document.addEventListener('click', handleClickCapture, true);
    document.addEventListener('selectionchange', handleSelectionChange);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true); // 스크롤 시 위치 동기화
    observer.observe(container, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    syncSelectedTable();
    
    return () => {
      observer.disconnect();
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseup', handleInteractionEnd);
      container.removeEventListener('keyup', handleInteractionEnd);
      document.removeEventListener('mousedown', handleDocumentMouseDown);
      document.removeEventListener('click', handleClickCapture, true);
      document.removeEventListener('selectionchange', handleSelectionChange);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [editorContainerRef, syncSelectedTable, updateRect]);

  useEffect(() => {
    if (selectedTable) {
      updateRect(selectedTable);
      let frameId = 0;

      const track = () => {
        updateRect(selectedTableRef.current);
        frameId = window.requestAnimationFrame(track);
      };

      frameId = window.requestAnimationFrame(track);
      return () => window.cancelAnimationFrame(frameId);
    }
  }, [selectedTable, updateRect]);

  useEffect(() => {
    const syncShiftState = (pressed: boolean) => {
      setIsShiftPressed(pressed);
      if (!pressed) {
        if (shiftGuideDragRef.current || isResizing?.startsWith('shift-')) {
          shiftGuideDragRef.current = null;
          shiftGuideSnapTargetsRef.current = [];
          setIsResizing(current => (current?.startsWith('shift-') ? null : current));
          setShiftGuidePreviewOffset(0);
          setShiftPreviewPointer(null);
        }
        clearShiftGuide();
        return;
      }

      const lastPointer = lastPointerRef.current;
      if (lastPointer) {
        updateShiftGuideAtPointer(lastPointer.x, lastPointer.y, true);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        syncShiftState(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        syncShiftState(false);
      }
    };

    const handleWindowBlur = () => {
      syncShiftState(false);
    };

    const handleMouseMove = (event: MouseEvent) => {
      lastPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
      updateShiftGuideAtPointer(event.clientX, event.clientY, event.shiftKey);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('mousemove', handleMouseMove, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('mousemove', handleMouseMove, true);
    };
  }, [clearShiftGuide, isResizing, updateShiftGuideAtPointer]);

  const onShiftGuideResizeStart = (e: React.MouseEvent, guide: ShiftGuide) => {
    const activeTable = selectedTableRef.current;
    if (!activeTable) return;
    e.preventDefault();
    e.stopPropagation();
    const selectedTableKey = ensureShiftGuideTableKey(activeTable);
    editorRef.current?.scTableEngine?.deselectAllTables?.();
    editorRef.current?.scTableEngine?.deselectAllCells?.();
    setIsResizing(`shift-${guide.axis}`);
    setShiftGuidePreviewOffset(0);
    setShiftPreviewPointer(null);
    shiftGuideDragRef.current = guide;

    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      top: rect?.top ?? 0,
      left: rect?.left ?? 0,
      width: rect?.width ?? activeTable.getBoundingClientRect().width,
      height: rect?.height ?? activeTable.getBoundingClientRect().height,
      colWidths: getCurrentColumnWidths(activeTable),
      rowHeights: getCurrentRowHeights(activeTable),
    };

    shiftGuideSnapTargetsRef.current = (() => {
      const tableRect = activeTable.getBoundingClientRect();
      const deduped = new Map<string, ShiftGuideSnapTarget>();
      const cells = Array.from(activeTable.querySelectorAll('td, th')) as HTMLTableCellElement[];

      cells.forEach(cell => {
        const cellRect = cell.getBoundingClientRect();
        if (guide.axis === 'row') {
          const rowBoundary =
            guide.edge === 'top'
              ? cellRect.top - tableRect.top
              : cellRect.bottom - tableRect.top;
          const snapTarget = {
            offset: Math.round(rowBoundary * 100) / 100,
            spanStart: Math.max(0, Math.min(startPos.current.width, cellRect.left - tableRect.left)),
            spanSize: Math.max(0, Math.min(startPos.current.width, cellRect.width)),
          };
          deduped.set(
            `${snapTarget.offset}:${snapTarget.spanStart}:${snapTarget.spanSize}`,
            snapTarget,
          );
          return;
        }

        const colBoundary =
          guide.edge === 'left'
            ? cellRect.left - tableRect.left
            : cellRect.right - tableRect.left;
        const snapTarget = {
          offset: Math.round(colBoundary * 100) / 100,
          spanStart: Math.max(0, Math.min(startPos.current.height, cellRect.top - tableRect.top)),
          spanSize: Math.max(0, Math.min(startPos.current.height, cellRect.height)),
        };
        deduped.set(
          `${snapTarget.offset}:${snapTarget.spanStart}:${snapTarget.spanSize}`,
          snapTarget,
        );
      });

      return Array.from(deduped.values()).filter(candidate => Math.abs(candidate.offset - guide.offset) > 0.5);
    })();

    const getClampedDelta = (
      rawDelta: number,
      options?: {
        snapThreshold?: number;
        minMovementForSnap?: number;
      },
    ) => {
      const findSnapDelta = (
        clampedDelta: number,
        minDelta: number,
        maxDelta: number,
        canUseSnappedDelta?: (nextDelta: number) => boolean,
      ) => {
        const snapThreshold = options?.snapThreshold ?? SHIFT_GUIDE_SNAP_THRESHOLD;
        const minMovementForSnap =
          options?.minMovementForSnap ?? SHIFT_GUIDE_MIN_MOVEMENT_FOR_SNAP;

        if (Math.abs(clampedDelta) < minMovementForSnap) {
          return clampedDelta;
        }

        const nextOffset = guide.offset + clampedDelta;
        const direction = Math.sign(clampedDelta);
        const nearest = shiftGuideSnapTargetsRef.current.reduce<number | null>((best, candidate) => {
          if (
            !spansTouchOrOverlap(
              guide.spanStart,
              guide.spanSize,
              candidate.spanStart,
              candidate.spanSize,
            )
          ) {
            return best;
          }

          const snapDelta = candidate.offset - guide.offset;
          if (direction !== 0 && Math.sign(snapDelta) !== direction) {
            return best;
          }

          if (Math.abs(snapDelta) < minMovementForSnap) {
            return best;
          }

          if (Math.abs(candidate.offset - nextOffset) > snapThreshold) {
            return best;
          }

          if (best == null) {
            return candidate.offset;
          }

          return Math.abs(candidate.offset - nextOffset) < Math.abs(best - nextOffset)
            ? candidate.offset
            : best;
        }, null);

        const recentTarget = recentShiftGuideTargetRef.current;
        const recentSnapDelta =
          recentTarget &&
          recentTarget.tableKey === selectedTableKey &&
          recentTarget.axis === guide.axis &&
          recentTarget.expiresAt >= Date.now() &&
          spansTouchOrOverlap(
            guide.spanStart,
            guide.spanSize,
            recentTarget.spanStart,
            recentTarget.spanSize,
          )
            ? recentTarget.offset - guide.offset
            : null;

        const effectiveRecent =
          typeof recentSnapDelta === 'number' &&
          (direction === 0 || Math.sign(recentSnapDelta) === direction) &&
          Math.abs(recentSnapDelta) >= minMovementForSnap &&
          spansNearlyMatch(
            guide.spanStart,
            guide.spanSize,
            recentTarget.spanStart,
            recentTarget.spanSize,
          ) &&
          Math.abs((guide.offset + clampedDelta) - (guide.offset + recentSnapDelta)) <=
            snapThreshold + SHIFT_GUIDE_RECENT_SNAP_BONUS
            ? recentSnapDelta
            : null;

        if (nearest == null && effectiveRecent == null) {
          return clampedDelta;
        }

        const preferredDelta =
          effectiveRecent != null
            ? effectiveRecent
            : nearest != null
              ? nearest - guide.offset
              : clampedDelta;

        const snappedDelta = Math.max(minDelta, Math.min(preferredDelta, maxDelta));
        if (canUseSnappedDelta && !canUseSnappedDelta(snappedDelta)) {
          return clampedDelta;
        }

        return snappedDelta;
      };

      const getDirectionalCapacity = (
        sizes: number[],
        startIndex: number,
        step: -1 | 1,
        minSize: number,
        fallbackSize: number,
      ) => {
        let total = 0;
        for (let index = startIndex; index >= 0 && index < sizes.length; index += step) {
          total += Math.max(0, (sizes[index] ?? fallbackSize) - minSize);
        }
        return total;
      };

      if (guide.axis === 'row') {
        const getNearestSnapDistance = (direction: -1 | 1) =>
          shiftGuideSnapTargetsRef.current.reduce<number | null>((best, candidate) => {
            if (
              !spansTouchOrOverlap(
                guide.spanStart,
                guide.spanSize,
                candidate.spanStart,
                candidate.spanSize,
              )
            ) {
              return best;
            }

            const diff = direction < 0 ? guide.offset - candidate.offset : candidate.offset - guide.offset;
            if (diff <= 0) {
              return best;
            }

            if (best == null || diff < best) {
              return diff;
            }

            return best;
          }, null);

        const maxUp = getDirectionalCapacity(
          startPos.current.rowHeights,
          guide.targetIndex,
          -1,
          MIN_SEGMENT_ROW_HEIGHT,
          DEFAULT_ROW_HEIGHT,
        );
        const maxDown = getDirectionalCapacity(
          startPos.current.rowHeights,
          guide.targetIndex + 1,
          1,
          MIN_SEGMENT_ROW_HEIGHT,
          DEFAULT_ROW_HEIGHT,
        );
        const nearestSnapUp = getNearestSnapDistance(-1);
        const nearestSnapDown = getNearestSnapDistance(1);
        const effectiveMaxUp = nearestSnapUp != null ? Math.min(maxUp, nearestSnapUp) : maxUp;
        const effectiveMaxDown = nearestSnapDown != null ? Math.min(maxDown, nearestSnapDown) : maxDown;
        const clamped = Math.max(-effectiveMaxUp, Math.min(rawDelta, effectiveMaxDown));
        return findSnapDelta(
          clamped,
          -effectiveMaxUp,
          effectiveMaxDown,
          nextDelta => nextDelta >= -maxUp && nextDelta <= maxDown,
        );
      }

      const getNearestSnapDistance = (direction: -1 | 1) =>
        shiftGuideSnapTargetsRef.current.reduce<number | null>((best, candidate) => {
          if (
            !spansTouchOrOverlap(
              guide.spanStart,
              guide.spanSize,
              candidate.spanStart,
              candidate.spanSize,
            )
          ) {
            return best;
          }

          const diff = direction < 0 ? guide.offset - candidate.offset : candidate.offset - guide.offset;
          if (diff <= 0) {
            return best;
          }

          if (best == null || diff < best) {
            return diff;
          }

          return best;
        }, null);

      const maxLeft = getDirectionalCapacity(
        startPos.current.colWidths,
        guide.targetIndex,
        -1,
        MIN_SEGMENT_COL_WIDTH,
        DEFAULT_COL_WIDTH,
      );
      const maxRight = getDirectionalCapacity(
        startPos.current.colWidths,
        guide.targetIndex + 1,
        1,
        MIN_SEGMENT_COL_WIDTH,
        DEFAULT_COL_WIDTH,
      );
      const nearestSnapLeft = getNearestSnapDistance(-1);
      const nearestSnapRight = getNearestSnapDistance(1);
      const effectiveMaxLeft = nearestSnapLeft != null ? Math.min(maxLeft, nearestSnapLeft) : maxLeft;
      const effectiveMaxRight = nearestSnapRight != null ? Math.min(maxRight, nearestSnapRight) : maxRight;
      const clamped = Math.max(-effectiveMaxLeft, Math.min(rawDelta, effectiveMaxRight));
      return findSnapDelta(
        clamped,
        -effectiveMaxLeft,
        effectiveMaxRight,
        nextDelta => nextDelta >= -maxLeft && nextDelta <= maxRight,
      );
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      const rawDelta =
        guide.axis === 'row'
          ? moveEvent.clientY - startPos.current.y
          : moveEvent.clientX - startPos.current.x;

      const nextDelta = getClampedDelta(rawDelta);
      shiftGuidePreviewOffsetRef.current = nextDelta;
      setShiftGuidePreviewOffset(nextDelta);
      setShiftPreviewPointer({
        x: moveEvent.clientX + window.scrollX - (rect?.left ?? 0),
        y: moveEvent.clientY + window.scrollY - (rect?.top ?? 0),
      });
    };

    let didFinish = false;
    const finishShiftResize = (upEvent: MouseEvent | PointerEvent) => {
      if (didFinish) {
        return;
      }
      didFinish = true;
      setIsResizing(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', finishShiftResize);
      window.removeEventListener('pointerup', finishShiftResize);
      shiftGuideDragRef.current = null;
      shiftGuideSnapTargetsRef.current = [];

      const delta = getClampedDelta(shiftGuidePreviewOffsetRef.current, {
        snapThreshold: SHIFT_GUIDE_COMMIT_SNAP_THRESHOLD,
        minMovementForSnap: SHIFT_GUIDE_COMMIT_MIN_MOVEMENT,
      });
      clearShiftGuide();

      try {
        const didResize = delta
          ? editorRef.current?.scTableEngine?.resizeCellBoundarySegment?.(
              guide.cell,
              guide.axis,
              delta,
              {
                boundaryIndex: guide.targetIndex,
                segmentStart: guide.logicalStart,
                segmentEnd: guide.logicalEnd,
                edge: guide.edge,
              },
            )
          : false;

        if (didResize) {
          recentShiftGuideTargetRef.current = mergeRecentShiftGuideTarget(
            recentShiftGuideTargetRef.current,
            {
            tableKey: selectedTableKey,
            axis: guide.axis,
            offset: guide.offset + delta,
            spanStart: guide.spanStart,
            spanSize: guide.spanSize,
            expiresAt: Date.now() + SHIFT_GUIDE_RECENT_SNAP_TTL,
            },
          );
          suppressCellSelectionUntilRef.current = Date.now() + 220;
          updateRect(selectedTableRef.current);
          editorRef.current?.focus?.();
          editorRef.current?.scTableEngine?.deselectAllTables?.();
          editorRef.current?.scTableEngine?.deselectAllCells?.();
          editorRef.current?.takeSnapshot?.();
          editorRef.current?.triggerEvent?.(10 as any, {});
        }
      } catch {}

      lastPointerRef.current = {
        x: upEvent.clientX,
        y: upEvent.clientY,
      };

      window.requestAnimationFrame(() => {
        if (upEvent.shiftKey) {
          syncSelectedTable(selectedTableRef.current, { forcePreferred: true });
          updateShiftGuideAtPointer(upEvent.clientX, upEvent.clientY, true);
          return;
        }

        syncSelectedTable(null, { clear: true });
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', finishShiftResize);
    window.addEventListener('pointerup', finishShiftResize);
  };

  // ── 드래그 이동 핸들러 ──
  const onMoveStart = (e: React.MouseEvent) => {
    if (e.shiftKey || isShiftPressed || Boolean(isResizing?.startsWith('shift-'))) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!selectedTable || !rect) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    
    const style = window.getComputedStyle(selectedTable);
    const top = parseInt(style.top) || 0;
    const left = parseInt(style.left) || 0;

    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      top,
      left,
      width: rect.width,
      height: rect.height,
      colWidths: getCurrentColumnWidths(selectedTable),
      rowHeights: getCurrentRowHeights(selectedTable),
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!editorContainerRef.current) return;
      const editorRect = editorContainerRef.current.getBoundingClientRect();
      const dx = moveEvent.clientX - startPos.current.x;
      const dy = moveEvent.clientY - startPos.current.y;
      
      if (selectedTable.style.position !== 'relative' && selectedTable.style.position !== 'absolute') {
        selectedTable.style.position = 'relative';
      }
      
      // 이동 범위 제한 (용지 안에서만)
      const tableRect = selectedTable.getBoundingClientRect();
      let newLeft = startPos.current.left + dx;
      let newTop = startPos.current.top + dy;
      
      // 부모 컨테이너(RoosterEditor) 기준 경계 체크
      // tableRect.width 등은 렌더링 결과이므로 드래그 중 실시간으로 체크
      const parentWidth = editorContainerRef.current.clientWidth;
      const parentHeight = editorContainerRef.current.clientHeight;
      
      // 수평 제한
      if (newLeft < 0) newLeft = 0;
      if (newLeft + tableRect.width > parentWidth) newLeft = parentWidth - tableRect.width;
      
      // 수직 제한
      // (용지 높이는 Pagination에 의해 늘어나므로 밑으로는 여유가 있을 수 있음)
      if (newTop < -30) newTop = -30; // 약간의 위쪽 여유
      
      selectedTable.style.top = `${newTop}px`;
      selectedTable.style.left = `${newLeft}px`;
      updateRect();
    };

    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // ── 리사이즈 핸들러 ──
  const onResizeStart = (e: React.MouseEvent, handle: string) => {
    if (e.shiftKey || isShiftPressed || Boolean(isResizing?.startsWith('shift-'))) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!selectedTable || !rect) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(handle);
    
    startPos.current = { 
      x: e.clientX, y: e.clientY, 
      top: rect.top, left: rect.left, 
      width: rect.width, height: rect.height,
      colWidths: getCurrentColumnWidths(selectedTable),
      rowHeights: getCurrentRowHeights(selectedTable),
    };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!editorContainerRef.current) return;
      const parentWidth = editorContainerRef.current.clientWidth;
      const dx = moveEvent.clientX - startPos.current.x;
      const dy = moveEvent.clientY - startPos.current.y;
      
      if (handle.includes('e')) {
        const newWidth = Math.min(parentWidth - (selectedTable.offsetLeft || 0), startPos.current.width + dx);
        applyScaledColumnWidths(selectedTable, startPos.current.colWidths, newWidth);
      }
      if (handle.includes('s')) {
        const newHeight = Math.max(MIN_TABLE_HEIGHT, startPos.current.height + dy);
        applyScaledRowHeights(selectedTable, startPos.current.rowHeights, newHeight);
      }
      if (handle.includes('w')) {
        const maxDecrease = selectedTable.offsetLeft || 0;
        const actualDx = Math.max(-maxDecrease, dx);
        applyScaledColumnWidths(selectedTable, startPos.current.colWidths, startPos.current.width - actualDx);
      }
      updateRect();
    };

    const onMouseUp = () => {
      setIsResizing(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      try {
        editorRef.current?.scTableEngine?.buildModel?.(selectedTable);
        editorRef.current?.scTableEngine?.syncToDOM?.();
        editorRef.current?.takeSnapshot?.();
        editorRef.current?.triggerEvent?.(10 as any, {});
      } catch {}
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  if (!selectedTable || !rect) return null;

  const previewLabel = shiftGuidePreviewOffset
    ? `${shiftGuidePreviewOffset > 0 ? '+' : ''}${Math.round(shiftGuidePreviewOffset)}px`
    : '';
  const isShiftResizing = Boolean(isResizing?.startsWith('shift-'));
  const isShiftGuideMode = isShiftPressed || isShiftResizing;
  const stopShiftOverlayEvent = (event: React.MouseEvent | React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return createPortal(
    <div 
      className={`tbl-overlay-container ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''} ${isShiftPressed ? 'shift-pressed' : ''} ${isShiftGuideMode ? 'shift-guide-mode' : ''}`}
      style={{
        position: 'absolute', // body 기준 absolute
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        pointerEvents: 'none',
        zIndex: 50000, // 최상단
      }}
    >
      <div className="tbl-overlay-border" />
        {isShiftResizing && (
          <div
            className="tbl-shift-capture-layer"
            onMouseDown={stopShiftOverlayEvent}
            onMouseUp={stopShiftOverlayEvent}
            onClick={stopShiftOverlayEvent}
            onPointerDown={stopShiftOverlayEvent}
          />
        )}
        {shiftGuide && (
          <>
            <div
            className={`tbl-shift-guide ${shiftGuide.axis}`}
            onMouseDown={(event) => onShiftGuideResizeStart(event, shiftGuide)}
            style={
              shiftGuide.axis === 'row'
                ? {
                    top: shiftGuide.offset + shiftGuidePreviewOffset,
                    left: shiftGuide.spanStart,
                    width: shiftGuide.spanSize,
                  }
                : {
                    left: shiftGuide.offset + shiftGuidePreviewOffset,
                    top: shiftGuide.spanStart,
                    height: shiftGuide.spanSize,
                  }
            }
          />
          {Boolean(isResizing?.startsWith('shift-') && previewLabel) && (
            <div
              className={`tbl-shift-preview-label ${shiftGuide.axis}`}
              style={
                shiftPreviewPointer
                  ? {
                      left: shiftPreviewPointer.x + 16,
                      top: shiftPreviewPointer.y + 16,
                    }
                  : shiftGuide.axis === 'row'
                    ? {
                        top: shiftGuide.offset + shiftGuidePreviewOffset,
                        left: shiftGuide.spanStart + shiftGuide.spanSize + 10,
                      }
                    : {
                        left: shiftGuide.offset + shiftGuidePreviewOffset,
                        top: shiftGuide.spanStart + shiftGuide.spanSize + 10,
                      }
              }
            >
              {previewLabel}
              </div>
            )}
          </>
        )}
        {!isShiftGuideMode && (
          <>
            <div className="tbl-move-bar top" onMouseDown={onMoveStart} title="드래그하여 이동" />
            <div className="tbl-move-bar bottom" onMouseDown={onMoveStart} />
            <div className="tbl-move-bar left" onMouseDown={onMoveStart} />
            <div className="tbl-move-bar right" onMouseDown={onMoveStart} />

            <div className="tbl-handle nw" onMouseDown={e => onResizeStart(e, 'nw')} />
            <div className="tbl-handle n"  onMouseDown={e => onResizeStart(e, 'n')} />
            <div className="tbl-handle ne" onMouseDown={e => onResizeStart(e, 'ne')} />
            <div className="tbl-handle e"  onMouseDown={e => onResizeStart(e, 'e')} />
            <div className="tbl-handle se" onMouseDown={e => onResizeStart(e, 'se')} />
            <div className="tbl-handle s"  onMouseDown={e => onResizeStart(e, 's')} />
            <div className="tbl-handle sw" onMouseDown={e => onResizeStart(e, 'sw')} />
            <div className="tbl-handle w"  onMouseDown={e => onResizeStart(e, 'w')} />
          </>
        )}
      </div>,
    document.body
  );
}

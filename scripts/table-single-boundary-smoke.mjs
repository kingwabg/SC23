import puppeteer from 'puppeteer';

const FRONTEND_URL = 'http://localhost:5173';
const MEETINGS_URL = `${FRONTEND_URL}/meetings`;
const LOGIN_URL = `${FRONTEND_URL}/login`;
const ADMIN_ID = 'admin';
const ADMIN_PASSWORD = 'admin777';
const BROWSER_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const results = [];
const browserErrors = [];

const record = (id, title, status, detail) => {
  results.push({ id, title, status, detail });
};

const runStep = async (id, title, fn) => {
  try {
    const detail = await fn();
    record(id, title, 'PASS', detail);
  } catch (error) {
    record(id, title, 'FAIL', error instanceof Error ? error.message : String(error));
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForFunction = async (page, predicate, options = {}, ...args) => {
  return page.waitForFunction(predicate, options, ...args);
};

const clickByText = async (page, text, { selector = 'button, div, span', exact = true } = {}) => {
  const clicked = await page.evaluate(
    ({ selector, text, exact }) => {
      const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
      const target = normalize(text);
      const candidates = Array.from(document.querySelectorAll(selector)).filter((element) => {
        const html = element;
        const rect = html.getBoundingClientRect();
        const style = window.getComputedStyle(html);
        if (rect.width === 0 || rect.height === 0) return false;
        if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return false;
        const label = normalize(html.textContent);
        return exact ? label === target : label.includes(target);
      });

      const targetElement = candidates[0];
      if (!targetElement) {
        return false;
      }

      targetElement.scrollIntoView({ block: 'center', inline: 'center' });
      targetElement.click();
      return true;
    },
    { selector, text, exact },
  );

  if (!clicked) {
    throw new Error(`'${text}' 클릭 대상 요소를 찾지 못했습니다.`);
  }
};

const clickButtonByText = async (page, text, options = {}) => {
  return clickByText(page, text, { selector: 'button', exact: true, ...options });
};

const clickTabByText = async (page, text) => {
  const clicked = await page.evaluate((targetText) => {
    const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
    const target = normalize(targetText);
    const tabs = Array.from(document.querySelectorAll('.sc-app-toolbar-fixed > div > div:first-child > div'))
      .filter((element) => normalize(element.textContent) === target);

    const tab = tabs[0];
    if (!tab) return false;

    const rect = tab.getBoundingClientRect();
    const style = window.getComputedStyle(tab);
    if (rect.width === 0 || rect.height === 0) return false;
    if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return false;

    tab.scrollIntoView({ block: 'center', inline: 'center' });
    tab.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  }, text);

  if (!clicked) {
    throw new Error(`'${text}' 탭을 찾지 못했습니다.`);
  }
};

const placeCaretAtDocumentEnd = async (page) => {
  const placed = await page.evaluate(() => {
    const root = document.querySelector('.sc-editor-root');
    if (!root) return false;

    let anchor = root.querySelector('[data-test-insert-anchor="true"]');
    if (!anchor) {
      anchor = document.createElement('p');
      anchor.setAttribute('data-test-insert-anchor', 'true');
      anchor.innerHTML = '<br>';
      root.appendChild(anchor);
    }

    anchor.scrollIntoView({ block: 'end', inline: 'nearest' });
    const range = document.createRange();
    range.selectNodeContents(anchor);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    (anchor).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    (anchor).dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    (anchor).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  });

  if (!placed) {
    throw new Error('문서 끝 삽입 지점을 준비하지 못했습니다.');
  }

  await sleep(120);
};

const openTablePicker = async (page) => {
  await clickTabByText(page, '입력');
  await clickButtonByText(page, '표 ▼');
  await page.waitForSelector('.tb-table-grid .tb-table-cell', { timeout: 5000 });
};

const waitForMeetingsReady = async (page) => {
  await page.goto(MEETINGS_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[placeholder="문서 제목을 입력하세요"]');
  await page.waitForSelector('.sc-editor-root');
  await waitForFunction(
    page,
    () => {
      const root = document.querySelector('.sc-editor-root');
      if (!root) return false;
      return root.innerHTML.length > 20;
    },
    { timeout: 30000 },
  );
};

const getTableCount = async (page) =>
  page.$$eval('.sc-editor-root table', (tables) => tables.length);

const getLastTableIndex = async (page) => {
  const count = await getTableCount(page);
  if (count === 0) throw new Error('에디터 안에 표가 없습니다.');
  return count - 1;
};

const getCellBox = async (page, tableIndex, rowIndex, cellIndex) => {
  const box = await page.evaluate(
    ({ tableIndex, rowIndex, cellIndex }) => {
      const table = document.querySelectorAll('.sc-editor-root table')[tableIndex];
      if (!table) return null;
      const row = table.rows[rowIndex];
      if (!row) return null;
      const cell = row.cells[cellIndex];
      if (!cell) return null;
      cell.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = cell.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    },
    { tableIndex, rowIndex, cellIndex },
  );

  if (!box) {
    throw new Error(`table[${tableIndex}] cell[${rowIndex},${cellIndex}] 좌표를 찾지 못했습니다.`);
  }

  return box;
};

const getCellRect = async (page, tableIndex, rowIndex, cellIndex) => {
  return page.evaluate(
    ({ tableIndex, rowIndex, cellIndex }) => {
      const table = document.querySelectorAll('.sc-editor-root table')[tableIndex];
      if (!table) return null;
      const row = table.rows[rowIndex];
      const cell = row?.cells[cellIndex];
      if (!cell) return null;
      const rect = cell.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right,
      };
    },
    { tableIndex, rowIndex, cellIndex },
  );
};

const getTableDebug = async (page, tableIndex) => {
  return page.evaluate((index) => {
    const table = document.querySelectorAll('.sc-editor-root table')[index];
    if (!table) return null;

    const rows = Array.from(table.rows).map((row, rowIndex) => ({
      rowIndex,
      cells: Array.from(row.cells).map((cell, cellIndex) => {
        const rect = cell.getBoundingClientRect();
        return {
          cellIndex,
          text: (cell.textContent || '').replace(/\s+/g, ' ').trim(),
          rowSpan: cell.rowSpan,
          colSpan: cell.colSpan,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
        };
      }),
    }));

    const cols = Array.from(table.querySelectorAll('col')).map((col, colIndex) => ({
      colIndex,
      width: window.getComputedStyle(col).width,
    }));

    return {
      rows,
      cols,
      html: table.outerHTML,
    };
  }, tableIndex);
};

const hoverShiftBoundary = async (page, tableIndex, rowIndex, cellIndex, edge) => {
  const box = await getCellBox(page, tableIndex, rowIndex, cellIndex);
  await page.mouse.click(box.x, box.y);
  await sleep(120);
  await page.keyboard.down('Shift');
  const expectedAxis = edge === 'left' || edge === 'right' ? 'col' : 'row';
  let lastProbeDebug = null;

  const probes = [2, 4, 6, 8, 10, 12];
  for (const probe of probes) {
    const currentBox = await getCellBox(page, tableIndex, rowIndex, cellIndex);
    const expectedBoundary =
      edge === 'bottom'
        ? currentBox.bottom
        : edge === 'top'
          ? currentBox.top
          : edge === 'right'
            ? currentBox.right
            : currentBox.left;
    let x = currentBox.x;
    let y = currentBox.y;

    if (edge === 'bottom') y = currentBox.bottom - probe;
    if (edge === 'top') y = currentBox.top + probe;
    if (edge === 'right') x = currentBox.right - probe;
    if (edge === 'left') x = currentBox.left + probe;

    await page.mouse.move(x, y, { steps: 6 });
    await sleep(120);
    const guide = await page.evaluate((axis) => {
      const element = document.querySelector(`.tbl-shift-guide.${axis}`);
      if (!(element instanceof HTMLElement)) {
        return null;
      }

      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    }, expectedAxis);
    lastProbeDebug = await page.evaluate(
      ({ probeX, probeY, axis }) => {
        const hit = document.elementFromPoint(probeX, probeY);
        const table = hit?.closest('table');
        const cell = hit?.closest('td, th');
        const overlay = document.querySelector('.tbl-overlay-container');
        const guideElement = document.querySelector(`.tbl-shift-guide.${axis}`);
        const selectedTables = Array.from(document.querySelectorAll('.sc-selected-table'));
        return {
          hitTag: hit?.tagName ?? null,
          hitCellText: cell?.textContent?.trim() ?? '',
          hitTableIndex: table ? Array.from(document.querySelectorAll('.sc-editor-root table')).indexOf(table) : -1,
          selectedTableIndexes: selectedTables.map((element) =>
            Array.from(document.querySelectorAll('.sc-editor-root table')).indexOf(element),
          ),
          overlayClass: overlay?.className ?? null,
          guideExists: Boolean(guideElement),
        };
      },
      { probeX: x, probeY: y, axis: expectedAxis },
    );

    if (!guide) {
      continue;
    }

    const guideCenter =
      expectedAxis === 'row'
        ? guide.top + guide.height / 2
        : guide.left + guide.width / 2;
    const guideSpanMatches =
      expectedAxis === 'row'
        ? x >= guide.left - 6 && x <= guide.right + 6
        : y >= guide.top - 6 && y <= guide.bottom + 6;

    if (guideSpanMatches && Math.abs(guideCenter - expectedBoundary) <= 14) {
      return { x, y };
    }
  }

  await page.keyboard.up('Shift');
  throw new Error(
    `Shift guide를 찾지 못했습니다: cell[${rowIndex},${cellIndex}] edge=${edge}, debug=${JSON.stringify(lastProbeDebug)}`,
  );
};

const dragShiftGuide = async (page, deltaX, deltaY) => {
  const box = await page.evaluate(() => {
    const guide = document.querySelector('.tbl-shift-guide');
    if (!(guide instanceof HTMLElement)) {
      return null;
    }

    const rect = guide.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height,
    };
  });
  if (!box) {
    throw new Error('Shift guide를 찾지 못했습니다.');
  }

  const startX = box.x;
  const startY = box.y;

  await page.mouse.move(startX, startY, { steps: 4 });
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 10 });
  await page.mouse.up();
  await sleep(250);
  await page.keyboard.up('Shift');
};

const dragPlainBoundary = async (page, tableIndex, rowIndex, cellIndex, edge, deltaX, deltaY) => {
  const box = await getCellBox(page, tableIndex, rowIndex, cellIndex);
  let x = box.x;
  let y = box.y;

  if (edge === 'bottom') y = box.bottom - 4;
  if (edge === 'top') y = box.top + 4;
  if (edge === 'right') x = box.right - 4;
  if (edge === 'left') x = box.left + 4;

  await page.mouse.move(x, y, { steps: 6 });
  await sleep(100);
  await page.mouse.down();
  await page.mouse.move(x + deltaX, y + deltaY, { steps: 10 });
  await page.mouse.up();
  await sleep(250);
};

const setSelectedCells = async (page, tableIndex, startRow, startCell, endRow, endCell) => {
  const result = await page.evaluate(
    ({ tableIndex, startRow, startCell, endRow, endCell }) => {
      const table = document.querySelectorAll('.sc-editor-root table')[tableIndex];
      if (!table) {
        return { ok: false, reason: 'table-not-found' };
      }

      document.querySelectorAll('.sc-cell-selected').forEach((cell) => cell.classList.remove('sc-cell-selected'));
      document.querySelectorAll('.sc-selected-table').forEach((selected) => selected.classList.remove('sc-selected-table'));

      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);
      const minCell = Math.min(startCell, endCell);
      const maxCell = Math.max(startCell, endCell);
      let selectedCount = 0;

      for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex++) {
        const row = table.rows[rowIndex];
        if (!row) {
          return { ok: false, reason: `row-missing-${rowIndex}` };
        }

        for (let cellIndex = minCell; cellIndex <= maxCell; cellIndex++) {
          const cell = row.cells[cellIndex];
          if (!cell) {
            return { ok: false, reason: `cell-missing-${rowIndex}-${cellIndex}` };
          }

          cell.classList.add('sc-cell-selected');
          selectedCount += 1;
        }
      }

      const anchorCell = table.rows[minRow]?.cells[minCell] ?? null;
      if (!anchorCell) {
        return { ok: false, reason: 'anchor-missing' };
      }

      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(anchorCell);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
      anchorCell.scrollIntoView({ block: 'center', inline: 'center' });
      return { ok: true, selectedCount };
    },
    { tableIndex, startRow, startCell, endRow, endCell },
  );

  if (!result?.ok) {
    throw new Error(`셀 선택 상태를 만들지 못했습니다: ${result?.reason ?? 'unknown'}`);
  }

  await sleep(150);
  return result.selectedCount;
};

const mergeSelectedCells = async (page) => {
  await clickTabByText(page, '표');
  await clickByText(page, '셀 합치기', { selector: 'button, div, span', exact: true });
  await sleep(250);
};

const waitForMergedCell = async (page, tableIndex, rowIndex, cellIndex, expected) => {
  await waitForFunction(
    page,
    ({ tableIndex, rowIndex, cellIndex, expected }) => {
      const table = document.querySelectorAll('.sc-editor-root table')[tableIndex];
      const cell = table?.rows[rowIndex]?.cells[cellIndex];
      if (!cell) return false;
      return cell.rowSpan === expected.rowSpan && cell.colSpan === expected.colSpan;
    },
    { timeout: 5000 },
    { tableIndex, rowIndex, cellIndex, expected },
  );
};

const insertThreeByThreeTable = async (page) => {
  const before = await getTableCount(page);
  await placeCaretAtDocumentEnd(page);
  await openTablePicker(page);
  await page.click('.tb-table-grid .tb-table-cell:nth-child(19)');
  await waitForFunction(
    page,
    (expected) => document.querySelectorAll('.sc-editor-root table').length >= expected,
    { timeout: 10000 },
    before + 1,
  );
};

const main = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: BROWSER_PATH,
    defaultViewport: { width: 1600, height: 1200 },
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', (error) => {
    browserErrors.push({ type: 'pageerror', text: error?.message || String(error) });
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push({ type: 'console', text: message.text() });
    }
  });

  try {
    await runStep('env-login', '관리자 로그인 및 회의록 진입', async () => {
      await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForSelector('input[placeholder="admin"]');
      await page.type('input[placeholder="admin"]', ADMIN_ID, { delay: 20 });
      await page.type('input[type="password"]', ADMIN_PASSWORD, { delay: 20 });
      await clickButtonByText(page, '로그인하기');
      await waitForFunction(
        page,
        () => {
          const accessToken = localStorage.getItem('accessToken') || '';
          return accessToken.includes('.');
        },
        { timeout: 20000 },
      );
      await waitForMeetingsReady(page);
      return '로그인과 회의록 진입이 완료되었습니다.';
    });

    await runStep('table-insert', '3x3 표 삽입', async () => {
      await insertThreeByThreeTable(page);
      const tableIndex = await getLastTableIndex(page);
      const rect = await getCellRect(page, tableIndex, 0, 0);
      return `테이블 index=${tableIndex}, 첫 셀 높이=${Math.round(rect.height)}px`;
    });

    let rowTestTableIndex = null;
    let rowThreeSnapTableIndex = null;
    let colSnapTableIndex = null;
    let colThreeSnapTableIndex = null;
    let mergedRowTableIndex = null;
    let mergedColTableIndex = null;

    await runStep('row-segment-down', '현재칸 행 경계 아래 이동', async () => {
      await insertThreeByThreeTable(page);
      rowTestTableIndex = await getLastTableIndex(page);
      const beforeTarget = await getCellRect(page, rowTestTableIndex, 0, 0);
      const beforeNeighbor = await getCellRect(page, rowTestTableIndex, 0, 1);

      await hoverShiftBoundary(page, rowTestTableIndex, 0, 0, 'bottom');
      await dragShiftGuide(page, 0, 22);

      const afterTarget = await getCellRect(page, rowTestTableIndex, 0, 0);
      const afterNeighbor = await getCellRect(page, rowTestTableIndex, 0, 1);

      if (!(afterTarget.height > beforeTarget.height + 6)) {
        throw new Error(`현재칸 높이가 충분히 증가하지 않았습니다. before=${beforeTarget.height}, after=${afterTarget.height}`);
      }

      if (Math.abs(afterNeighbor.height - beforeNeighbor.height) > 6) {
        throw new Error(`옆칸 높이가 같이 변했습니다. before=${beforeNeighbor.height}, after=${afterNeighbor.height}`);
      }

      return `현재칸 ${Math.round(beforeTarget.height)} -> ${Math.round(afterTarget.height)}px, 옆칸 ${Math.round(beforeNeighbor.height)} -> ${Math.round(afterNeighbor.height)}px`;
    });

    await runStep('row-segment-snap-match', '옆칸 행 경계를 같은 선으로 스냅', async () => {
      if (rowTestTableIndex == null) {
        throw new Error('기준 행 경계 표를 준비하지 못했습니다.');
      }

      const targetRect = await getCellRect(page, rowTestTableIndex, 0, 0);

      await hoverShiftBoundary(page, rowTestTableIndex, 0, 1, 'bottom');
      await dragShiftGuide(page, 0, 16);
      const afterNeighbor = await getCellRect(page, rowTestTableIndex, 0, 1);
      const diff = Math.abs(afterNeighbor.bottom - targetRect.bottom);

      if (diff > 3) {
        const debug = await getTableDebug(page, rowTestTableIndex);
        throw new Error(
          `옆칸 행 경계가 같은 선에 붙지 않았습니다. diff=${diff}, debug=${JSON.stringify(debug)}`
        );
      }

      return `행 경계 차이 ${diff.toFixed(2)}px`;
    });

    await runStep('row-segment-three-snap-match', '세 번째 칸 행 경계를 같은 선으로 스냅', async () => {
      await insertThreeByThreeTable(page);
      rowThreeSnapTableIndex = await getLastTableIndex(page);

      await hoverShiftBoundary(page, rowThreeSnapTableIndex, 0, 0, 'bottom');
      await dragShiftGuide(page, 0, 22);
      await hoverShiftBoundary(page, rowThreeSnapTableIndex, 0, 1, 'bottom');
      await dragShiftGuide(page, 0, 16);

      const targetRect = await getCellRect(page, rowThreeSnapTableIndex, 0, 0);

      await hoverShiftBoundary(page, rowThreeSnapTableIndex, 0, 2, 'bottom');
      await dragShiftGuide(page, 0, 16);
      const afterThird = await getCellRect(page, rowThreeSnapTableIndex, 0, 2);
      const diff = Math.abs(afterThird.bottom - targetRect.bottom);

      if (diff > 3) {
        const debug = await getTableDebug(page, rowThreeSnapTableIndex);
        throw new Error(
          `세 번째 칸 행 경계가 같은 선에 붙지 않았습니다. diff=${diff}, debug=${JSON.stringify(debug)}`
        );
      }

      return `세 번째 칸 행 경계 차이 ${diff.toFixed(2)}px`;
    });

    await runStep('row-unified-after-restore', '원위치 복귀 후 일반 행 경계로 함께 이동', async () => {
      await insertThreeByThreeTable(page);
      const restoreTableIndex = await getLastTableIndex(page);

      await hoverShiftBoundary(page, restoreTableIndex, 0, 0, 'bottom');
      await dragShiftGuide(page, 0, 22);
      await hoverShiftBoundary(page, restoreTableIndex, 0, 0, 'bottom');
      await dragShiftGuide(page, 0, -22);

      const restoredLeft = await getCellRect(page, restoreTableIndex, 0, 0);
      const restoredMiddle = await getCellRect(page, restoreTableIndex, 0, 1);
      const restoredRight = await getCellRect(page, restoreTableIndex, 0, 2);
      const restoreDiff = Math.max(
        Math.abs(restoredLeft.bottom - restoredMiddle.bottom),
        Math.abs(restoredMiddle.bottom - restoredRight.bottom),
      );

      if (restoreDiff > 3) {
        const debug = await getTableDebug(page, restoreTableIndex);
        throw new Error(
          `원위치 복귀 후 행 경계가 한 줄로 합쳐지지 않았습니다. diff=${restoreDiff}, debug=${JSON.stringify(debug)}`
        );
      }

      const beforeLeft = restoredLeft;
      const beforeMiddle = restoredMiddle;
      const beforeRight = restoredRight;

      await dragPlainBoundary(page, restoreTableIndex, 0, 0, 'bottom', 0, 12);

      const afterLeft = await getCellRect(page, restoreTableIndex, 0, 0);
      const afterMiddle = await getCellRect(page, restoreTableIndex, 0, 1);
      const afterRight = await getCellRect(page, restoreTableIndex, 0, 2);
      const deltaLeft = afterLeft.height - beforeLeft.height;
      const deltaMiddle = afterMiddle.height - beforeMiddle.height;
      const deltaRight = afterRight.height - beforeRight.height;
      const diff = Math.max(
        Math.abs(deltaLeft - deltaMiddle),
        Math.abs(deltaMiddle - deltaRight),
      );

      if (!(deltaLeft > 4 && deltaMiddle > 4 && deltaRight > 4)) {
        const debug = await getTableDebug(page, restoreTableIndex);
        throw new Error(
          `일반 행 경계 드래그 후 행 전체가 함께 커지지 않았습니다. left=${deltaLeft}, middle=${deltaMiddle}, right=${deltaRight}, debug=${JSON.stringify(debug)}`
        );
      }

      if (diff > 3) {
        const debug = await getTableDebug(page, restoreTableIndex);
        throw new Error(
          `일반 행 경계 드래그 후 변화량이 서로 달랐습니다. diff=${diff}, left=${deltaLeft}, middle=${deltaMiddle}, right=${deltaRight}, debug=${JSON.stringify(debug)}`
        );
      }

      return `행 전체 변화량 ${deltaLeft.toFixed(2)} / ${deltaMiddle.toFixed(2)} / ${deltaRight.toFixed(2)}px`;
    });

    await runStep('neighbor-row-up', '옆칸 행 경계 위 이동 가능', async () => {
      if (rowTestTableIndex == null) {
        throw new Error('기준 행 경계 표를 준비하지 못했습니다.');
      }

      const beforeNeighbor = await getCellRect(page, rowTestTableIndex, 0, 1);
      await hoverShiftBoundary(page, rowTestTableIndex, 0, 1, 'bottom');
      await dragShiftGuide(page, 0, -14);
      const afterNeighbor = await getCellRect(page, rowTestTableIndex, 0, 1);

      if (!(afterNeighbor.height < beforeNeighbor.height - 4)) {
        throw new Error(`옆칸이 위로 줄어들지 않았습니다. before=${beforeNeighbor.height}, after=${afterNeighbor.height}`);
      }

      return `옆칸 높이 ${Math.round(beforeNeighbor.height)} -> ${Math.round(afterNeighbor.height)}px`;
    });

    await runStep('col-segment-right', '현재칸 열 경계 오른쪽 이동', async () => {
      await insertThreeByThreeTable(page);
      const colTableIndex = await getLastTableIndex(page);
      colSnapTableIndex = colTableIndex;
      const beforeTarget = await getCellRect(page, colTableIndex, 0, 0);
      const beforeNeighbor = await getCellRect(page, colTableIndex, 1, 0);
      const beforeDebug = await getTableDebug(page, colTableIndex);

      await hoverShiftBoundary(page, colTableIndex, 0, 0, 'right');
      await dragShiftGuide(page, 24, 0);

      const afterTarget = await getCellRect(page, colTableIndex, 0, 0);
      const afterNeighbor = await getCellRect(page, colTableIndex, 1, 0);
      const debug = await getTableDebug(page, colTableIndex);

      if (!(afterTarget.width > beforeTarget.width + 6)) {
        throw new Error(
          `현재칸 너비가 충분히 증가하지 않았습니다. before=${beforeTarget.width}, after=${afterTarget.width}, beforeDebug=${JSON.stringify(beforeDebug)}, afterDebug=${JSON.stringify(debug)}`
        );
      }

      if (Math.abs(afterNeighbor.width - beforeNeighbor.width) > 6) {
        throw new Error(
          `아래칸 너비가 같이 변했습니다. before=${beforeNeighbor.width}, after=${afterNeighbor.width}, beforeDebug=${JSON.stringify(beforeDebug)}, afterDebug=${JSON.stringify(debug)}`
        );
      }

      return `현재칸 ${Math.round(beforeTarget.width)} -> ${Math.round(afterTarget.width)}px, 아래칸 ${Math.round(beforeNeighbor.width)} -> ${Math.round(afterNeighbor.width)}px`;
    });

    await runStep('col-segment-snap-match', '아래칸 열 경계를 같은 선으로 스냅', async () => {
      if (colSnapTableIndex == null) {
        throw new Error('기준 열 경계 표를 준비하지 못했습니다.');
      }

      const targetRect = await getCellRect(page, colSnapTableIndex, 0, 0);

      await hoverShiftBoundary(page, colSnapTableIndex, 1, 0, 'right');
      await dragShiftGuide(page, 16, 0);
      const afterNeighbor = await getCellRect(page, colSnapTableIndex, 1, 0);
      const diff = Math.abs(afterNeighbor.right - targetRect.right);

      if (diff > 3) {
        const debug = await getTableDebug(page, colSnapTableIndex);
        throw new Error(
          `아래칸 열 경계가 같은 선에 붙지 않았습니다. diff=${diff}, debug=${JSON.stringify(debug)}`
        );
      }

      return `열 경계 차이 ${diff.toFixed(2)}px`;
    });

    await runStep('col-segment-three-snap-match', '세 번째 칸 열 경계를 같은 선으로 스냅', async () => {
      await insertThreeByThreeTable(page);
      colThreeSnapTableIndex = await getLastTableIndex(page);

      await hoverShiftBoundary(page, colThreeSnapTableIndex, 0, 0, 'right');
      await dragShiftGuide(page, 24, 0);
      await hoverShiftBoundary(page, colThreeSnapTableIndex, 1, 0, 'right');
      await dragShiftGuide(page, 16, 0);

      const targetRect = await getCellRect(page, colThreeSnapTableIndex, 0, 0);

      await hoverShiftBoundary(page, colThreeSnapTableIndex, 2, 0, 'right');
      await dragShiftGuide(page, 16, 0);
      const afterThird = await getCellRect(page, colThreeSnapTableIndex, 2, 0);
      const diff = Math.abs(afterThird.right - targetRect.right);

      if (diff > 3) {
        const debug = await getTableDebug(page, colThreeSnapTableIndex);
        throw new Error(
          `세 번째 칸 열 경계가 같은 선에 붙지 않았습니다. diff=${diff}, debug=${JSON.stringify(debug)}`
        );
      }

      return `세 번째 칸 열 경계 차이 ${diff.toFixed(2)}px`;
    });

    await runStep('neighbor-col-left', '옆칸 열 경계 왼쪽 이동 가능', async () => {
      if (colSnapTableIndex == null) {
        throw new Error('기준 열 경계 표를 준비하지 못했습니다.');
      }

      const beforeNeighbor = await getCellRect(page, colSnapTableIndex, 1, 0);
      await hoverShiftBoundary(page, colSnapTableIndex, 1, 0, 'right');
      await dragShiftGuide(page, -14, 0);
      const afterNeighbor = await getCellRect(page, colSnapTableIndex, 1, 0);
      const debug = await getTableDebug(page, colSnapTableIndex);

      if (!(afterNeighbor.width < beforeNeighbor.width - 4)) {
        throw new Error(
          `옆칸이 왼쪽으로 줄어들지 않았습니다. before=${beforeNeighbor.width}, after=${afterNeighbor.width}, debug=${JSON.stringify(debug)}`
        );
      }

      return `옆칸 너비 ${Math.round(beforeNeighbor.width)} -> ${Math.round(afterNeighbor.width)}px`;
    });

    await runStep('merged-row-down', '가로 병합 셀의 행 경계 아래 이동', async () => {
      await insertThreeByThreeTable(page);
      const mergedTableIndex = await getLastTableIndex(page);
      mergedRowTableIndex = mergedTableIndex;
      await setSelectedCells(page, mergedTableIndex, 0, 0, 0, 1);
      await mergeSelectedCells(page);
      await waitForMergedCell(page, mergedTableIndex, 0, 0, { rowSpan: 1, colSpan: 2 });

      const beforeMerged = await getCellRect(page, mergedTableIndex, 0, 0);
      const beforeRight = await getCellRect(page, mergedTableIndex, 0, 1);

      await hoverShiftBoundary(page, mergedTableIndex, 0, 0, 'bottom');
      await dragShiftGuide(page, 0, 20);

      const afterMerged = await getCellRect(page, mergedTableIndex, 0, 0);
      const afterRight = await getCellRect(page, mergedTableIndex, 0, 1);

      if (!(afterMerged.height > beforeMerged.height + 6)) {
        const debug = await getTableDebug(page, mergedTableIndex);
        throw new Error(`병합 셀 높이가 충분히 증가하지 않았습니다. before=${beforeMerged.height}, after=${afterMerged.height}, debug=${JSON.stringify(debug)}`);
      }

      if (Math.abs(afterRight.height - beforeRight.height) > 6) {
        const debug = await getTableDebug(page, mergedTableIndex);
        throw new Error(`병합 셀 옆칸 높이가 같이 변했습니다. before=${beforeRight.height}, after=${afterRight.height}, debug=${JSON.stringify(debug)}`);
      }

      return `병합 셀 ${Math.round(beforeMerged.height)} -> ${Math.round(afterMerged.height)}px, 옆칸 ${Math.round(beforeRight.height)} -> ${Math.round(afterRight.height)}px`;
    });

    await runStep('merged-row-up-opposite-edge', '병합 셀 아래칸의 윗선으로 다시 위 이동', async () => {
      if (mergedRowTableIndex == null) {
        throw new Error('기준 가로 병합 표를 준비하지 못했습니다.');
      }
      const mergedTableIndex = mergedRowTableIndex;
      const beforeMerged = await getCellRect(page, mergedTableIndex, 0, 0);

      await hoverShiftBoundary(page, mergedTableIndex, 2, 0, 'top');
      await dragShiftGuide(page, 0, -14);

      const afterMerged = await getCellRect(page, mergedTableIndex, 0, 0);
      if (!(afterMerged.height < beforeMerged.height - 4)) {
        const debug = await getTableDebug(page, mergedTableIndex);
        throw new Error(`병합 셀 경계가 반대편에서 위로 줄어들지 않았습니다. before=${beforeMerged.height}, after=${afterMerged.height}, debug=${JSON.stringify(debug)}`);
      }

      return `병합 셀 높이 ${Math.round(beforeMerged.height)} -> ${Math.round(afterMerged.height)}px`;
    });

    await runStep('merged-col-right', '세로 병합 셀의 열 경계 오른쪽 이동', async () => {
      await insertThreeByThreeTable(page);
      const mergedTableIndex = await getLastTableIndex(page);
      mergedColTableIndex = mergedTableIndex;
      await setSelectedCells(page, mergedTableIndex, 0, 0, 1, 0);
      await mergeSelectedCells(page);
      await waitForMergedCell(page, mergedTableIndex, 0, 0, { rowSpan: 2, colSpan: 1 });

      const beforeMerged = await getCellRect(page, mergedTableIndex, 0, 0);
      const beforeRight = await getCellRect(page, mergedTableIndex, 0, 1);

      await hoverShiftBoundary(page, mergedTableIndex, 0, 0, 'right');
      await dragShiftGuide(page, 18, 0);

      const afterMerged = await getCellRect(page, mergedTableIndex, 0, 0);
      const afterRight = await getCellRect(page, mergedTableIndex, 0, 1);

      if (!(afterMerged.width > beforeMerged.width + 6)) {
        const debug = await getTableDebug(page, mergedTableIndex);
        throw new Error(`세로 병합 셀 너비가 충분히 증가하지 않았습니다. before=${beforeMerged.width}, after=${afterMerged.width}, debug=${JSON.stringify(debug)}`);
      }

      if (Math.abs(afterRight.width - beforeRight.width) > 6) {
        const debug = await getTableDebug(page, mergedTableIndex);
        throw new Error(`세로 병합 셀 오른쪽 칸 너비가 같이 변했습니다. before=${beforeRight.width}, after=${afterRight.width}, debug=${JSON.stringify(debug)}`);
      }

      return `병합 셀 ${Math.round(beforeMerged.width)} -> ${Math.round(afterMerged.width)}px, 오른쪽칸 ${Math.round(beforeRight.width)} -> ${Math.round(afterRight.width)}px`;
    });

    await runStep('merged-col-left-opposite-edge', '병합 셀 오른쪽칸의 왼선으로 다시 왼 이동', async () => {
      if (mergedColTableIndex == null) {
        throw new Error('기준 세로 병합 표를 준비하지 못했습니다.');
      }
      const mergedTableIndex = mergedColTableIndex;
      const beforeMerged = await getCellRect(page, mergedTableIndex, 0, 0);

      await hoverShiftBoundary(page, mergedTableIndex, 0, 1, 'left');
      await dragShiftGuide(page, -14, 0);

      const afterMerged = await getCellRect(page, mergedTableIndex, 0, 0);
      if (!(afterMerged.width < beforeMerged.width - 4)) {
        const debug = await getTableDebug(page, mergedTableIndex);
        throw new Error(`세로 병합 셀 경계가 반대편에서 왼쪽으로 줄어들지 않았습니다. before=${beforeMerged.width}, after=${afterMerged.width}, debug=${JSON.stringify(debug)}`);
      }

      return `병합 셀 너비 ${Math.round(beforeMerged.width)} -> ${Math.round(afterMerged.width)}px`;
    });
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify({
    total: results.length,
    passed: results.filter((item) => item.status === 'PASS').length,
    failed: results.filter((item) => item.status === 'FAIL').length,
    results,
    browserErrors,
  }, null, 2));
};

main().catch((error) => {
  console.error(JSON.stringify({
    fatal: true,
    message: error instanceof Error ? error.message : String(error),
    results,
    browserErrors,
  }, null, 2));
  process.exit(1);
});

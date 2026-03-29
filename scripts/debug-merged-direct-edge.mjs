import puppeteer from 'puppeteer';

const FRONTEND_URL = 'http://localhost:5173';
const MEETINGS_URL = `${FRONTEND_URL}/meetings`;
const LOGIN_URL = `${FRONTEND_URL}/login`;
const ADMIN_ID = 'admin';
const ADMIN_PASSWORD = 'admin777';
const BROWSER_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForFunction = async (page, predicate, options = {}, ...args) =>
  page.waitForFunction(predicate, options, ...args);

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
      if (!targetElement) return false;
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

const clickButtonByText = async (page, text, options = {}) =>
  clickByText(page, text, { selector: 'button', exact: true, ...options });

const clickTabByText = async (page, text) => {
  const clicked = await page.evaluate((targetText) => {
    const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
    const target = normalize(targetText);
    const tabs = Array.from(document.querySelectorAll('.sc-app-toolbar-fixed > div > div:first-child > div'))
      .filter((element) => normalize(element.textContent) === target);
    const tab = tabs[0];
    if (!tab) return false;
    tab.scrollIntoView({ block: 'center', inline: 'center' });
    tab.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  }, text);

  if (!clicked) {
    throw new Error(`'${text}' 탭을 찾지 못했습니다.`);
  }
};

const placeCaretAtDocumentEnd = async (page) => {
  await page.evaluate(() => {
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
    return true;
  });
  await sleep(120);
};

const openTablePicker = async (page) => {
  await clickTabByText(page, '입력');
  await clickButtonByText(page, '표 ▼');
  await page.waitForSelector('.tb-table-grid .tb-table-cell', { timeout: 5000 });
};

const waitForMeetingsReady = async (page) => {
  if (!page.url().includes('/meetings')) {
    await page.goto(MEETINGS_URL, { waitUntil: 'domcontentloaded' });
  }
  await page.waitForSelector('.sc-editor-root');
  await waitForFunction(
    page,
    () => {
      const root = document.querySelector('.sc-editor-root');
      return !!root && root.innerHTML.length > 20;
    },
    { timeout: 30000 },
  );
};

const getTableCount = async (page) =>
  page.$$eval('.sc-editor-root table', (tables) => tables.length);

const getLastTableIndex = async (page) => {
  const count = await getTableCount(page);
  return count - 1;
};

const getCellBox = async (page, tableIndex, rowIndex, cellIndex) => {
  const box = await page.evaluate(
    ({ tableIndex, rowIndex, cellIndex }) => {
      const table = document.querySelectorAll('.sc-editor-root table')[tableIndex];
      const row = table?.rows[rowIndex];
      const cell = row?.cells[cellIndex];
      if (!cell) return null;
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
  if (!box) throw new Error('cell box not found');
  return box;
};

const setSelectedCells = async (page, tableIndex, startRow, startCell, endRow, endCell) => {
  await page.evaluate(
    ({ tableIndex, startRow, startCell, endRow, endCell }) => {
      const table = document.querySelectorAll('.sc-editor-root table')[tableIndex];
      document.querySelectorAll('.sc-cell-selected').forEach((cell) => cell.classList.remove('sc-cell-selected'));
      document.querySelectorAll('.sc-selected-table').forEach((selected) => selected.classList.remove('sc-selected-table'));
      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);
      const minCell = Math.min(startCell, endCell);
      const maxCell = Math.max(startCell, endCell);
      for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex++) {
        const row = table.rows[rowIndex];
        for (let cellIndex = minCell; cellIndex <= maxCell; cellIndex++) {
          row.cells[cellIndex].classList.add('sc-cell-selected');
        }
      }
    },
    { tableIndex, startRow, startCell, endRow, endCell },
  );
  await sleep(150);
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
      return !!cell && cell.rowSpan === expected.rowSpan && cell.colSpan === expected.colSpan;
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

const hoverShiftBoundary = async (page, tableIndex, rowIndex, cellIndex, edge) => {
  const box = await getCellBox(page, tableIndex, rowIndex, cellIndex);
  await page.mouse.click(box.x, box.y);
  await sleep(120);
  await page.keyboard.down('Shift');
  const expectedAxis = edge === 'left' || edge === 'right' ? 'col' : 'row';
  const probes = [2, 4, 6, 8, 10, 12];
  for (const probe of probes) {
    let x = box.x;
    let y = box.y;
    if (edge === 'bottom') y = box.bottom - probe;
    if (edge === 'top') y = box.top + probe;
    if (edge === 'right') x = box.right - probe;
    if (edge === 'left') x = box.left + probe;
    await page.mouse.move(x, y, { steps: 6 });
    try {
      await page.waitForSelector(`.tbl-shift-guide.${expectedAxis}`, { timeout: 500 });
      return { x, y };
    } catch {}
  }
  throw new Error(`guide not found edge=${edge}`);
};

const debugDragShiftGuide = async (page, deltaX, deltaY) => {
  const guide = await page.$('.tbl-shift-guide');
  const box = await guide?.boundingBox();
  if (!box) throw new Error('guide box not found');
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY, { steps: 4 });
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 10 });
  await sleep(100);
  const preview = await page.evaluate(() => ({
    label: document.querySelector('.tbl-shift-preview-label')?.textContent?.trim() || null,
    guide: document.querySelector('.tbl-shift-guide')?.getAttribute('style') || null,
  }));
  await page.mouse.up();
  await sleep(250);
  await page.keyboard.up('Shift');
  return preview;
};

const getTableDebug = async (page, tableIndex) => {
  return page.evaluate((index) => {
    const table = document.querySelectorAll('.sc-editor-root table')[index];
    if (!table) return null;
    return {
      rows: Array.from(table.rows).map((row, rowIndex) => ({
        rowIndex,
        cells: Array.from(row.cells).map((cell, cellIndex) => {
          const rect = cell.getBoundingClientRect();
          return {
            cellIndex,
            rowSpan: cell.rowSpan,
            colSpan: cell.colSpan,
            width: Math.round(rect.width * 100) / 100,
            height: Math.round(rect.height * 100) / 100,
          };
        }),
      })),
      cols: Array.from(table.querySelectorAll('colgroup col')).map((col, colIndex) => ({
        colIndex,
        width: getComputedStyle(col).width,
      })),
    };
  }, tableIndex);
};

const main = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: BROWSER_PATH,
    defaultViewport: { width: 1440, height: 1100 },
    args: ['--disable-features=Translate', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  page.on('console', (message) => {
    console.log('[browser]', message.type(), message.text());
  });
  page.on('pageerror', (error) => {
    console.error('[pageerror]', error);
  });

  try {
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
    await page.goto(MEETINGS_URL, { waitUntil: 'networkidle2' });
    await waitForMeetingsReady(page);
    await page.evaluate(() => {
      window.__SC_SEGMENT_DEBUG__ = true;
      window.__SC_LAST_SEGMENT_OVERLAY__ = null;
      window.__SC_LAST_SEGMENT_ENGINE_START__ = null;
      window.__SC_LAST_SEGMENT_ENGINE_END__ = null;
    });

    await insertThreeByThreeTable(page);
    const mergedRowTable = await getLastTableIndex(page);
    await setSelectedCells(page, mergedRowTable, 0, 0, 0, 1);
    await mergeSelectedCells(page);
    await waitForMergedCell(page, mergedRowTable, 0, 0, { rowSpan: 1, colSpan: 2 });
    await hoverShiftBoundary(page, mergedRowTable, 0, 0, 'bottom');
    const rowPreview = await debugDragShiftGuide(page, 0, 20);
    const rowDebug = await getTableDebug(page, mergedRowTable);

    console.log('merged-row-down preview', rowPreview);
    console.log('merged-row-down table', JSON.stringify(rowDebug, null, 2));

    await hoverShiftBoundary(page, mergedRowTable, 1, 0, 'top');
    const rowOppositePreview = await debugDragShiftGuide(page, 0, -14);
    const rowOppositeDebug = await getTableDebug(page, mergedRowTable);

    console.log('merged-row-up-opposite-edge preview', rowOppositePreview);
    console.log('merged-row-up-opposite-edge table', JSON.stringify(rowOppositeDebug, null, 2));

    await insertThreeByThreeTable(page);
    const mergedColTable = await getLastTableIndex(page);
    await setSelectedCells(page, mergedColTable, 0, 0, 1, 0);
    await mergeSelectedCells(page);
    await waitForMergedCell(page, mergedColTable, 0, 0, { rowSpan: 2, colSpan: 1 });
    await hoverShiftBoundary(page, mergedColTable, 0, 0, 'right');
    const colPreview = await debugDragShiftGuide(page, 18, 0);
    const colDebug = await getTableDebug(page, mergedColTable);

    console.log('merged-col-right preview', colPreview);
    console.log('merged-col-right table', JSON.stringify(colDebug, null, 2));

    await hoverShiftBoundary(page, mergedColTable, 0, 1, 'left');
    const colOppositePreview = await debugDragShiftGuide(page, -14, 0);
    const colOppositeDebug = await getTableDebug(page, mergedColTable);

    console.log('merged-col-left-opposite-edge preview', colOppositePreview);
    console.log('merged-col-left-opposite-edge table', JSON.stringify(colOppositeDebug, null, 2));
  } finally {
    await browser.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

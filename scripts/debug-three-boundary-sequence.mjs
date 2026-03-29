import puppeteer from 'puppeteer';

const FRONTEND_URL = 'http://localhost:5173';
const MEETINGS_URL = `${FRONTEND_URL}/meetings`;
const ADMIN_ID = 'admin';
const ADMIN_PASSWORD = 'admin777';
const BROWSER_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const waitForFunction = async (page, predicate, options = {}, ...args) =>
  page.waitForFunction(predicate, options, ...args);

const clickByText = async (page, text, { selector = 'button, div, span', exact = true } = {}) => {
  const clicked = await page.evaluate(
    ({ selector, text, exact }) => {
      const normalize = value => (value || '').replace(/\s+/g, ' ').trim();
      const target = normalize(text);
      const candidates = Array.from(document.querySelectorAll(selector)).filter(element => {
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
  const clicked = await page.evaluate(targetText => {
    const normalize = value => (value || '').replace(/\s+/g, ' ').trim();
    const target = normalize(targetText);
    const tabs = Array.from(document.querySelectorAll('.sc-app-toolbar-fixed > div > div:first-child > div'))
      .filter(element => normalize(element.textContent) === target);
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

const waitForMeetingsReady = async page => {
  await page.goto(MEETINGS_URL, { waitUntil: 'domcontentloaded' });
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

const loginIfNeeded = async page => {
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
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
};

const placeCaretAtDocumentEnd = async page => {
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
    return true;
  });

  if (!placed) {
    throw new Error('문서 끝 삽입 지점을 준비하지 못했습니다.');
  }

  await sleep(120);
};

const openTablePicker = async page => {
  await clickTabByText(page, '입력');
  await clickButtonByText(page, '표 ▼');
  await page.waitForSelector('.tb-table-grid .tb-table-cell', { timeout: 5000 });
};

const insertThreeByThreeTable = async page => {
  const before = await page.$$eval('.sc-editor-root table', tables => tables.length);
  await placeCaretAtDocumentEnd(page);
  await openTablePicker(page);
  await page.click('.tb-table-grid .tb-table-cell:nth-child(19)');
  await waitForFunction(
    page,
    expected => document.querySelectorAll('.sc-editor-root table').length >= expected,
    { timeout: 10000 },
    before + 1,
  );
};

const getLastTableIndex = async page => {
  const count = await page.$$eval('.sc-editor-root table', tables => tables.length);
  return count - 1;
};

const getCellBox = async (page, tableIndex, rowIndex, cellIndex) => {
  const box = await page.evaluate(
    ({ tableIndex, rowIndex, cellIndex }) => {
      const table = document.querySelectorAll('.sc-editor-root table')[tableIndex];
      const row = table?.rows[rowIndex];
      const cell = row?.cells[cellIndex];
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
      };
    },
    { tableIndex, rowIndex, cellIndex },
  );

  if (!box) {
    throw new Error(`table[${tableIndex}] cell[${rowIndex},${cellIndex}] 좌표를 찾지 못했습니다.`);
  }

  return box;
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
    await sleep(120);

    const guide = await page.$(`.tbl-shift-guide.${expectedAxis}`);
    if (guide) {
      return { x, y };
    }
  }

  await page.keyboard.up('Shift');
  throw new Error(`Shift guide를 찾지 못했습니다: cell[${rowIndex},${cellIndex}] edge=${edge}`);
};

const dragShiftGuide = async (page, deltaX, deltaY) => {
  const guide = await page.$('.tbl-shift-guide');
  const box = await guide?.boundingBox();
  if (!box) {
    throw new Error('Shift guide를 찾지 못했습니다.');
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY, { steps: 4 });
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 10 });
  await page.mouse.up();
  await sleep(250);
  await page.keyboard.up('Shift');
};

const getTableDebug = async (page, tableIndex) => {
  return page.evaluate(index => {
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
      cols: Array.from(table.querySelectorAll('col')).map((col, colIndex) => ({
        colIndex,
        width: getComputedStyle(col).width,
      })),
      html: table.outerHTML,
    };
  }, tableIndex);
};

const logRowThree = async page => {
  await insertThreeByThreeTable(page);
  const tableIndex = await getLastTableIndex(page);
  console.log('row-three-table-index', tableIndex);

  await hoverShiftBoundary(page, tableIndex, 0, 0, 'bottom');
  await dragShiftGuide(page, 0, 22);
  console.log('after-first-row', JSON.stringify(await getTableDebug(page, tableIndex), null, 2));

  await hoverShiftBoundary(page, tableIndex, 0, 1, 'bottom');
  await dragShiftGuide(page, 0, 16);
  console.log('after-second-row', JSON.stringify(await getTableDebug(page, tableIndex), null, 2));

  await hoverShiftBoundary(page, tableIndex, 0, 2, 'bottom');
  await dragShiftGuide(page, 0, 16);
  console.log('after-third-row', JSON.stringify(await getTableDebug(page, tableIndex), null, 2));
};

const logColThree = async page => {
  await insertThreeByThreeTable(page);
  const tableIndex = await getLastTableIndex(page);
  console.log('col-three-table-index', tableIndex);

  await hoverShiftBoundary(page, tableIndex, 0, 0, 'right');
  await dragShiftGuide(page, 24, 0);
  console.log('after-first-col', JSON.stringify(await getTableDebug(page, tableIndex), null, 2));

  await hoverShiftBoundary(page, tableIndex, 1, 0, 'right');
  await dragShiftGuide(page, 16, 0);
  console.log('after-second-col', JSON.stringify(await getTableDebug(page, tableIndex), null, 2));

  await hoverShiftBoundary(page, tableIndex, 2, 0, 'right');
  await dragShiftGuide(page, 16, 0);
  console.log('after-third-col', JSON.stringify(await getTableDebug(page, tableIndex), null, 2));
};

const main = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: BROWSER_PATH,
    defaultViewport: { width: 1600, height: 1200 },
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log(`[browser] ${msg.type()}`, msg.text()));

  try {
    await loginIfNeeded(page);
    await logRowThree(page);
    await logColThree(page);
  } finally {
    await browser.close();
  }
};

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

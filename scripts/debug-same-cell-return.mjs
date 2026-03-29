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

const clickButtonByText = async (page, text) => {
  const clicked = await page.evaluate((targetText) => {
    const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
    const target = normalize(targetText);
    const buttons = Array.from(document.querySelectorAll('button')).filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        normalize(element.textContent) === target
      );
    });
    const button = buttons[0];
    if (!button) return false;
    button.scrollIntoView({ block: 'center', inline: 'center' });
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  }, text);

  if (!clicked) {
    throw new Error(`'${text}' 버튼을 찾지 못했습니다.`);
  }
};

const clickTabByText = async (page, text) => {
  const clicked = await page.evaluate((targetText) => {
    const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
    const target = normalize(targetText);
    const tabs = Array.from(document.querySelectorAll('.sc-app-toolbar-fixed > div > div:first-child > div')).filter(
      (element) => normalize(element.textContent) === target,
    );
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

const waitForMeetingsReady = async (page) => {
  await page.goto(MEETINGS_URL, { waitUntil: 'networkidle2' });
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

const insertThreeByThreeTable = async (page) => {
  await page.evaluate(() => {
    const root = document.querySelector('.sc-editor-root');
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    root.appendChild(p);
    const range = document.createRange();
    range.selectNodeContents(p);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await sleep(80);

  await clickTabByText(page, '입력');
  await clickButtonByText(page, '표 ▼');
  await page.waitForSelector('.tb-table-grid .tb-table-cell', { timeout: 5000 });
  await page.click('.tb-table-grid .tb-table-cell:nth-child(19)');
  await waitForFunction(
    page,
    () => document.querySelectorAll('.sc-editor-root table').length > 0,
    { timeout: 10000 },
  );
  await sleep(300);
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
      };
    },
    { tableIndex, rowIndex, cellIndex },
  );

  if (!box) {
    throw new Error(`cell ${rowIndex},${cellIndex} not found`);
  }

  return box;
};

const inspect = async (page, x, y) =>
  page.evaluate(
    ({ x, y }) => {
      const hit = document.elementFromPoint(x, y);
      const guide = document.querySelector('.tbl-shift-guide');
      const table = document.querySelectorAll('.sc-editor-root table');
      const lastTable = table[table.length - 1];
      return {
        point: { x, y },
        hitTag: hit?.tagName ?? null,
        hitClass: hit?.className ?? null,
        hitText: (hit?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
        guideStyle: guide?.getAttribute('style') ?? null,
        rows: lastTable
          ? Array.from(lastTable.rows).map((row, rowIndex) => ({
              rowIndex,
              top: Math.round(row.getBoundingClientRect().top * 100) / 100,
              bottom: Math.round(row.getBoundingClientRect().bottom * 100) / 100,
              height: Math.round(row.getBoundingClientRect().height * 100) / 100,
              cells: Array.from(row.cells).map((cell, cellIndex) => ({
                cellIndex,
                left: Math.round(cell.getBoundingClientRect().left * 100) / 100,
                right: Math.round(cell.getBoundingClientRect().right * 100) / 100,
                top: Math.round(cell.getBoundingClientRect().top * 100) / 100,
                bottom: Math.round(cell.getBoundingClientRect().bottom * 100) / 100,
                rowSpan: cell.rowSpan,
                colSpan: cell.colSpan,
              })),
            }))
          : [],
      };
    },
    { x, y },
  );

const main = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: BROWSER_PATH,
    defaultViewport: { width: 1600, height: 1200 },
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();

  try {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('input[placeholder="admin"]');
    await page.type('input[placeholder="admin"]', ADMIN_ID, { delay: 10 });
    await page.type('input[type="password"]', ADMIN_PASSWORD, { delay: 10 });
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
    await insertThreeByThreeTable(page);

    const tableIndex = await page.$$eval('.sc-editor-root table', (tables) => tables.length - 1);
    const cell = await getCellBox(page, tableIndex, 0, 0);
    await page.mouse.click(cell.x, cell.y);
    await page.keyboard.down('Shift');
    await page.mouse.move(cell.x, cell.bottom - 2, { steps: 6 });
    await sleep(120);
    console.log('before-first-drag', JSON.stringify(await inspect(page, cell.x, cell.bottom - 2), null, 2));

    const guide = await page.$('.tbl-shift-guide');
    const guideBox = await guide?.boundingBox();
    if (!guideBox) {
      throw new Error('initial guide not found');
    }

    const startX = guideBox.x + guideBox.width / 2;
    const startY = guideBox.y + guideBox.height / 2;
    await page.mouse.move(startX, startY, { steps: 3 });
    await page.mouse.down();
    await page.mouse.move(startX, startY + 24, { steps: 10 });
    await page.mouse.up();
    await sleep(250);
    await page.keyboard.up('Shift');
    await sleep(120);
    await page.keyboard.down('Shift');
    await sleep(120);

    const afterFirst = await inspect(page, cell.x, cell.bottom + 28);
    console.log('after-first-drag', JSON.stringify(afterFirst, null, 2));

    const firstColBounds = afterFirst.rows.flatMap((row) => row.cells).filter((it) => Math.abs(it.left - afterFirst.rows[0].cells[0].left) < 1.5);
    const firstColX = (afterFirst.rows[0].cells[0].left + afterFirst.rows[0].cells[0].right) / 2;

    for (const probe of [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]) {
      const y = afterFirst.rows[2].top + probe;
      await page.mouse.move(firstColX, y, { steps: 6 });
      await sleep(120);
      console.log(`probe-${probe}`, JSON.stringify(await inspect(page, firstColX, y), null, 2));
    }

    await page.mouse.move(firstColX, afterFirst.rows[2].top + 6, { steps: 6 });
    await sleep(120);
    console.log('before-return-drag', JSON.stringify(await inspect(page, firstColX, afterFirst.rows[2].top + 6), null, 2));
    const returnGuide = await page.$('.tbl-shift-guide');
    const returnGuideBox = await returnGuide?.boundingBox();
    if (!returnGuideBox) {
      throw new Error('return guide not found');
    }

    const returnStartX = returnGuideBox.x + returnGuideBox.width / 2;
    const returnStartY = returnGuideBox.y + returnGuideBox.height / 2;
    await page.mouse.move(returnStartX, returnStartY, { steps: 3 });
    await page.mouse.down();
    await page.mouse.move(returnStartX, returnStartY - 18, { steps: 10 });
    await page.mouse.up();
    await sleep(300);
    console.log('after-return-drag', JSON.stringify(await inspect(page, firstColX, afterFirst.rows[1].bottom - 6), null, 2));

    await page.keyboard.up('Shift');
  } finally {
    await browser.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

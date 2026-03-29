import puppeteer from 'puppeteer';

const FRONTEND_URL = 'http://localhost:5173';
const LOGIN_URL = `${FRONTEND_URL}/login`;
const MEETINGS_URL = `${FRONTEND_URL}/meetings`;
const ADMIN_ID = 'admin';
const ADMIN_PASSWORD = 'admin777';
const BROWSER_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const clickButtonByText = async (page, text) => {
  const clicked = await page.evaluate((targetText) => {
    const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
    const target = normalize(targetText);
    const buttons = Array.from(document.querySelectorAll('button'));
    const button = buttons.find((element) => normalize(element.textContent) === target);
    if (!button) return false;
    (button).click();
    return true;
  }, text);

  if (!clicked) {
    throw new Error(`'${text}' 버튼을 찾지 못했습니다.`);
  }
};

const clickTab = async (page, text) => {
  const clicked = await page.evaluate((targetText) => {
    const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
    const target = normalize(targetText);
    const tabs = Array.from(document.querySelectorAll('.sc-app-toolbar-fixed > div > div:first-child > div'));
    const tab = tabs.find((element) => normalize(element.textContent) === target);
    if (!tab) return false;
    tab.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    return true;
  }, text);

  if (!clicked) {
    throw new Error(`'${text}' 탭을 찾지 못했습니다.`);
  }
};

const getCellBox = async (page, tableIndex, rowIndex, cellIndex) => {
  const box = await page.evaluate(({ tableIndex, rowIndex, cellIndex }) => {
    const table = document.querySelectorAll('.sc-editor-root table')[tableIndex];
    const row = table?.rows?.[rowIndex];
    const cell = row?.cells?.[cellIndex];
    if (!cell) return null;
    const rect = cell.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, { tableIndex, rowIndex, cellIndex });

  if (!box) {
    throw new Error(`cell[${rowIndex}, ${cellIndex}] 좌표를 찾지 못했습니다.`);
  }

  return box;
};

const dragSelectCells = async (page, tableIndex, start, end) => {
  const from = await getCellBox(page, tableIndex, start.row, start.cell);
  const to = await getCellBox(page, tableIndex, end.row, end.cell);

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 15 });
  await page.mouse.up();
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

  try {
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle2' });
    await page.type('input[placeholder="admin"]', ADMIN_ID, { delay: 10 });
    await page.type('input[type="password"]', ADMIN_PASSWORD, { delay: 10 });
    await clickButtonByText(page, '로그인하기');
    await page.waitForFunction(() => Boolean(localStorage.getItem('accessToken')), { timeout: 20000 });

    await page.goto(MEETINGS_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.sc-editor-root');
    await page.waitForSelector('input[placeholder="문서 제목을 입력하세요"]');
    await page.waitForFunction(() => document.querySelectorAll('.sc-editor-root table').length > 0, { timeout: 20000 });

    const editor = await page.$('.sc-editor-root');
    const editorBox = await editor.boundingBox();
    await page.mouse.click(editorBox.x + editorBox.width * 0.5, editorBox.y + editorBox.height - 40);

    await clickTab(page, '입력');
    await clickButtonByText(page, '표 ▼');
    await page.waitForSelector('.tb-table-grid .tb-table-cell');
    await page.click('.tb-table-grid .tb-table-cell:nth-child(19)');
    await page.waitForFunction(() => document.querySelectorAll('.sc-editor-root table').length > 0, { timeout: 10000 });

    const tableIndex = await page.evaluate(() => document.querySelectorAll('.sc-editor-root table').length - 1);

    await dragSelectCells(page, tableIndex, { row: 0, cell: 0 }, { row: 2, cell: 0 });
    await wait(300);
    await clickTab(page, '표');
    await clickButtonByText(page, '셀 합치기');
    await wait(500);

    const debug = await page.evaluate((tableIndex) => {
      const table = document.querySelectorAll('.sc-editor-root table')[tableIndex];
      if (!table) return null;

      const selection = document.getSelection?.() ?? window.getSelection();
      const describeNode = (node) => {
        if (!node) return null;
        if (node.nodeType === Node.TEXT_NODE) {
          return {
            type: 'text',
            text: node.textContent,
            parentTag: node.parentElement?.tagName ?? null,
            parentClass: node.parentElement?.className ?? null,
          };
        }

        return {
          type: 'element',
          tag: node.nodeName,
          className: node.className ?? null,
          text: node.textContent ?? null,
        };
      };

      const rows = Array.from(table.rows).map((row, rowIndex) =>
        Array.from(row.cells).map((cell, cellIndex) => ({
          rowIndex,
          cellIndex,
          text: (cell.textContent || '').trim(),
          rowSpan: cell.rowSpan,
          colSpan: cell.colSpan,
          className: cell.className,
          bg: getComputedStyle(cell).backgroundColor,
          selectionBg: getComputedStyle(cell, '::selection').backgroundColor,
          innerBg: getComputedStyle(cell.firstElementChild ?? cell).backgroundColor,
          innerSelectionBg: getComputedStyle(cell.firstElementChild ?? cell, '::selection').backgroundColor,
          selected: cell.classList.contains('sc-cell-selected'),
        })),
      );

      const getMatchingBackgroundRules = (element) => {
        if (!element) {
          return [];
        }

        const matches = [];

        for (const sheet of Array.from(document.styleSheets)) {
          let rules;
          try {
            rules = sheet.cssRules;
          } catch {
            continue;
          }

          for (const rule of Array.from(rules)) {
            if (!(rule instanceof CSSStyleRule)) {
              continue;
            }

            const selector = rule.selectorText;
            if (!selector) {
              continue;
            }

            try {
              if (!element.matches(selector)) {
                continue;
              }
            } catch {
              continue;
            }

            const backgroundColor = rule.style.backgroundColor;
            const background = rule.style.background;
            const outline = rule.style.outline;
            const boxShadow = rule.style.boxShadow;

            if (backgroundColor || background || outline || boxShadow) {
              matches.push({
                selector,
                backgroundColor,
                background,
                outline,
                boxShadow,
                ownerNode: rule.parentStyleSheet?.ownerNode
                  ? {
                      tag: rule.parentStyleSheet.ownerNode.nodeName,
                      id: rule.parentStyleSheet.ownerNode.id || null,
                      className: rule.parentStyleSheet.ownerNode.className || null,
                      textPreview: (rule.parentStyleSheet.ownerNode.textContent || '').slice(0, 240),
                    }
                  : null,
              });
            }
          }
        }

        return matches;
      };

      const before = {
        selectedCount: table.querySelectorAll('.sc-cell-selected').length,
        html: table.outerHTML,
        selection: selection
          ? {
              isCollapsed: selection.isCollapsed,
              rangeCount: selection.rangeCount,
              text: selection.toString(),
              anchorOffset: selection.anchorOffset,
              focusOffset: selection.focusOffset,
              anchor: describeNode(selection.anchorNode),
              focus: describeNode(selection.focusNode),
            }
          : null,
        rows,
        matchingRules: {
          merged: getMatchingBackgroundRules(table.rows[0]?.cells?.[0] ?? null),
          lowerFirst: getMatchingBackgroundRules(table.rows[1]?.cells?.[0] ?? null),
        },
      };

      table.removeAttribute('data-editing-info');

      const afterRows = Array.from(table.rows).map((row, rowIndex) =>
        Array.from(row.cells).map((cell, cellIndex) => ({
          rowIndex,
          cellIndex,
          bg: getComputedStyle(cell).backgroundColor,
          innerBg: getComputedStyle(cell.firstElementChild ?? cell).backgroundColor,
        })),
      );

      return {
        before,
        afterRemovingEditingInfo: {
          html: table.outerHTML,
          rows: afterRows,
        },
      };
    }, tableIndex);

    console.log(JSON.stringify(debug, null, 2));
  } finally {
    await browser.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

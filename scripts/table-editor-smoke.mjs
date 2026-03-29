import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import path from 'node:path';

const FRONTEND_URL = 'http://localhost:5173';
const MEETINGS_URL = `${FRONTEND_URL}/meetings`;
const LOGIN_URL = `${FRONTEND_URL}/login`;
const ADMIN_ID = 'admin';
const ADMIN_PASSWORD = 'admin777';
const UNIQUE_TEXT = `AUTO-TABLE-${Date.now()}`;
const BROWSER_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const REPORT_PATH = path.join(process.cwd(), 'docs', 'table-editor-smoke-report.md');

const results = [];

const normalizeText = (value) => (value || '').replace(/\s+/g, ' ').trim();

const record = (id, title, status, detail) => {
  results.push({ id, title, status, detail });
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runStep = async (id, title, fn) => {
  try {
    const detail = await fn();
    record(id, title, 'PASS', detail);
  } catch (error) {
    record(id, title, 'FAIL', error instanceof Error ? error.message : String(error));
  }
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

const waitForFunction = async (page, predicate, options = {}, ...args) => {
  return page.waitForFunction(predicate, options, ...args);
};

const getTableCount = async (page) =>
  page.$$eval('.sc-editor-root table', (tables) => tables.length);

const getLastTableIndex = async (page) => {
  const count = await getTableCount(page);
  if (count === 0) {
    throw new Error('에디터 안에 표가 없습니다.');
  }
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

const clickCell = async (page, tableIndex, rowIndex, cellIndex, options = {}) => {
  const box = await getCellBox(page, tableIndex, rowIndex, cellIndex);
  await page.mouse.click(box.x, box.y, options);
};

const dragSelectCells = async (page, tableIndex, start, end) => {
  const from = await getCellBox(page, tableIndex, start.row, start.cell);
  const to = await getCellBox(page, tableIndex, end.row, end.cell);

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
};

const getSelectedCellCount = async (page, tableIndex) =>
  page.evaluate((tableIndex) => {
    const table = document.querySelectorAll('.sc-editor-root table')[tableIndex];
    return table ? table.querySelectorAll('.sc-cell-selected').length : 0;
  }, tableIndex);

const getTableState = async (page, tableIndex) =>
  page.evaluate((tableIndex) => {
    const table = document.querySelectorAll('.sc-editor-root table')[tableIndex];
    if (!table) return null;
    return {
      rowCount: table.rows.length,
      firstRowCellCount: table.rows[0]?.cells.length || 0,
      firstCellColSpan: table.rows[0]?.cells[0]?.colSpan || 1,
      className: table.className,
      textContent: table.textContent || '',
    };
  }, tableIndex);

const clickOutsideTable = async (page) => {
  const clicked = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('input, textarea, button, .sc-editor-root p, .sc-editor-root div'))
      .filter((element) => {
        const html = element;
        if (html.closest('table')) return false;
        const rect = html.getBoundingClientRect();
        const style = window.getComputedStyle(html);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      });

    const target = candidates.find((element) => !element.closest('.tbl-overlay-container') && !element.closest('.contexify'));
    if (!target) return null;
    const rect = target.getBoundingClientRect();
    return { x: rect.left + Math.min(rect.width / 2, 30), y: rect.top + Math.min(rect.height / 2, 18) };
  });

  if (!clicked) {
    throw new Error('표 밖을 클릭할 적절한 대상을 찾지 못했습니다.');
  }

  await page.mouse.click(clicked.x, clicked.y);
};

const collectVisibleButtons = async (page) =>
  page.evaluate(() => {
    const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
    return Array.from(document.querySelectorAll('button'))
      .map((button) => {
        const rect = button.getBoundingClientRect();
        const style = window.getComputedStyle(button);
        return {
          text: normalize(button.textContent),
          visible:
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.pointerEvents !== 'none',
        };
      })
      .filter((item) => item.visible && item.text)
      .map((item) => item.text);
  });

const waitForMeetingsReady = async (page) => {
  await page.goto(MEETINGS_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[placeholder="문서 제목을 입력하세요"]');
  await page.waitForSelector('.sc-editor-root');
  await waitForFunction(
    page,
    () => {
      const root = document.querySelector('.sc-editor-root');
      if (!root) return false;
      const text = (root.textContent || '').replace(/\s+/g, ' ').trim();
      const htmlLength = root.innerHTML.length;
      return htmlLength > 50 || text.length > 5;
    },
    { timeout: 30000 },
  );
};

const openTablePicker = async (page) => {
  await clickTabByText(page, '입력');
  await clickButtonByText(page, '표 ▼');
  try {
    await page.waitForSelector('.tb-table-grid .tb-table-cell', { timeout: 5000 });
  } catch (error) {
    const buttons = await collectVisibleButtons(page);
    throw new Error(`표 삽입 팝업이 열리지 않았습니다. 보이는 버튼: ${buttons.join(', ')}`);
  }
};

const getTopHeadingTexts = async (page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('h1, h2, h3'))
      .map((element) => (element.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 8),
  );

const writeReport = async (summary) => {
  const generatedAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const lines = [
    '# SC23 Table Editor Smoke Report',
    '',
    `- Generated: ${generatedAt}`,
    `- Frontend: ${FRONTEND_URL}`,
    `- Meetings page: ${MEETINGS_URL}`,
    `- Total: ${summary.total}`,
    `- Passed: ${summary.passed}`,
    `- Failed: ${summary.failed}`,
    `- Unique text: \`${summary.uniqueText}\``,
    '',
    '## Automated Result',
    '',
    '| Status | Step | Detail |',
    '| --- | --- | --- |',
    ...summary.results.map((item) => `| ${item.status} | ${item.title} | ${item.detail.replace(/\|/g, '\\|')} |`),
    '',
    '## Notes',
    '',
    '- This report covers automated smoke coverage only.',
    '- Interaction feel, visual polish, and edge cases with complex merged cells still need manual review.',
  ];

  await fs.writeFile(REPORT_PATH, `${lines.join('\n')}\n`, 'utf8');
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
    await runStep('env-frontend', '프론트 페이지 접속', async () => {
      await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForSelector('input[placeholder="admin"]');
      return '로그인 페이지가 열렸습니다.';
    });

    await runStep('env-login', '관리자 로그인', async () => {
      await page.type('input[placeholder="admin"]', ADMIN_ID, { delay: 20 });
      await page.type('input[type="password"]', ADMIN_PASSWORD, { delay: 20 });
      await clickButtonByText(page, '로그인하기');
      await waitForFunction(
        page,
        () => {
          const accessToken = localStorage.getItem('accessToken') || '';
          const refreshToken = localStorage.getItem('refreshToken') || '';
          return accessToken.includes('.') && refreshToken.includes('.');
        },
        { timeout: 20000 },
      );
      const authState = await page.evaluate(() => ({
        accessToken: localStorage.getItem('accessToken') || '',
        refreshToken: localStorage.getItem('refreshToken') || '',
      }));
      return `JWT 세션이 생성되었습니다. access=${authState.accessToken.slice(0, 16)}..., refresh=${authState.refreshToken.slice(0, 16)}...`;
    });

    await runStep('meetings-open', '회의록 화면 진입', async () => {
      await waitForMeetingsReady(page);
      const count = await getTableCount(page);
      const headings = await getTopHeadingTexts(page);
      return `에디터 준비 완료, 초기 표 수 ${count}개, 표시 헤더 ${headings.join(', ') || '없음'}`;
    });

    await runStep('table-insert', '빠른 표 삽입', async () => {
      const before = await getTableCount(page);
      const editor = await page.$('.sc-editor-root');
      const editorBox = await editor.boundingBox();
      if (!editorBox) throw new Error('에디터 좌표를 찾지 못했습니다.');

      await page.mouse.click(editorBox.x + editorBox.width * 0.5, editorBox.y + editorBox.height - 40);
      await openTablePicker(page);
      await page.click('.tb-table-grid .tb-table-cell:nth-child(19)');
      await waitForFunction(
        page,
        (expected) => document.querySelectorAll('.sc-editor-root table').length >= expected,
        { timeout: 10000 },
        before + 1,
      );
      const after = await getTableCount(page);
      return `표 수가 ${before}개에서 ${after}개로 늘었습니다.`;
    });

    const targetTableIndex = await getLastTableIndex(page);

    await runStep('cell-drag-select', '셀 드래그 선택', async () => {
      await dragSelectCells(page, targetTableIndex, { row: 0, cell: 0 }, { row: 0, cell: 1 });
      await sleep(300);
      const selectedCount = await getSelectedCellCount(page, targetTableIndex);
      if (selectedCount < 2) {
        throw new Error(`드래그 후 선택된 셀이 ${selectedCount}개입니다.`);
      }
      return `${selectedCount}개 셀이 선택되었습니다.`;
    });

    await runStep('outside-clear', '표 밖 클릭 시 선택 해제', async () => {
      await clickOutsideTable(page);
      await sleep(300);
      const active = await page.evaluate(() => ({
        selectedTables: document.querySelectorAll('.sc-selected-table').length,
        overlay: document.querySelectorAll('.tbl-overlay-container').length,
      }));
      if (active.selectedTables !== 0 || active.overlay !== 0) {
        throw new Error(`선택 해제 실패: selected=${active.selectedTables}, overlay=${active.overlay}`);
      }
      return '선택 클래스와 오버레이가 모두 제거되었습니다.';
    });

    await runStep('row-insert', '행 추가', async () => {
      await clickCell(page, targetTableIndex, 0, 0);
      await clickTabByText(page, '표');
      const before = await getTableState(page, targetTableIndex);
      await clickButtonByText(page, '행 아래');
      await waitForFunction(page, (tableIndex, prevRows) => {
        const table = document.querySelectorAll('.sc-editor-root table')[tableIndex];
        return !!table && table.rows.length === prevRows + 1;
      }, {}, targetTableIndex, before.rowCount);
      const after = await getTableState(page, targetTableIndex);
      return `행 수가 ${before.rowCount}개에서 ${after.rowCount}개로 늘었습니다.`;
    });

    await runStep('column-insert', '열 추가', async () => {
      await clickCell(page, targetTableIndex, 0, 0);
      const before = await getTableState(page, targetTableIndex);
      await clickButtonByText(page, '열 오른쪽');
      await waitForFunction(page, (tableIndex, prevCols) => {
        const table = document.querySelectorAll('.sc-editor-root table')[tableIndex];
        return !!table && (table.rows[0]?.cells.length || 0) === prevCols + 1;
      }, {}, targetTableIndex, before.firstRowCellCount);
      const after = await getTableState(page, targetTableIndex);
      return `첫 행 셀 수가 ${before.firstRowCellCount}개에서 ${after.firstRowCellCount}개로 늘었습니다.`;
    });

    await runStep('merge-cells', '셀 합치기', async () => {
      await dragSelectCells(page, targetTableIndex, { row: 0, cell: 0 }, { row: 0, cell: 1 });
      await clickButtonByText(page, '셀 합치기');
      await waitForFunction(page, (tableIndex) => {
        const table = document.querySelectorAll('.sc-editor-root table')[tableIndex];
        return !!table && (table.rows[0]?.cells[0]?.colSpan || 1) === 2;
      }, {}, targetTableIndex);
      const state = await getTableState(page, targetTableIndex);
      return `첫 셀 colspan이 ${state.firstCellColSpan}으로 변경되었습니다.`;
    });

    await runStep('split-cells', '병합 해제', async () => {
      await clickCell(page, targetTableIndex, 0, 0);
      await clickButtonByText(page, '병합 해제');
      await waitForFunction(page, (tableIndex) => {
        const table = document.querySelectorAll('.sc-editor-root table')[tableIndex];
        return !!table && (table.rows[0]?.cells[0]?.colSpan || 1) === 1;
      }, {}, targetTableIndex);
      const state = await getTableState(page, targetTableIndex);
      return `첫 셀 colspan이 ${state.firstCellColSpan}으로 복구되었습니다.`;
    });

    await runStep('style-preset', '표 스타일 토글', async () => {
      await clickCell(page, targetTableIndex, 0, 0);
      await clickButtonByText(page, '회의록형');
      await clickButtonByText(page, '줄무늬');
      await sleep(250);
      const state = await getTableState(page, targetTableIndex);
      if (!state.className.includes('sc-table-preset-meeting')) {
        throw new Error(`회의록형 클래스가 적용되지 않았습니다: ${state.className}`);
      }
      if (!state.className.includes('sc-table-zebra')) {
        throw new Error(`줄무늬 클래스가 적용되지 않았습니다: ${state.className}`);
      }
      return `적용 클래스: ${state.className}`;
    });

    await runStep('save-reload', '저장 후 새로고침 유지', async () => {
      await clickCell(page, targetTableIndex, 0, 0, { clickCount: 2 });
      await page.keyboard.type(UNIQUE_TEXT, { delay: 15 });
      await clickButtonByText(page, '기록 저장');
      await clickButtonByText(page, '확인');
      await waitForFunction(
        page,
        () => !Array.from(document.querySelectorAll('h3')).some((el) => el.textContent?.includes('수정 확인')),
        { timeout: 10000 },
      );
      await sleep(1200);
      await page.reload({ waitUntil: 'networkidle2' });
      await page.waitForSelector('.sc-editor-root');
      await waitForFunction(
        page,
        (text) => document.querySelector('.sc-editor-root')?.textContent?.includes(text),
        { timeout: 20000 },
        UNIQUE_TEXT,
      );
      return `고유 텍스트 '${UNIQUE_TEXT}'가 저장 후에도 유지되었습니다.`;
    });
  } finally {
    await browser.close();
  }

  const summary = {
    total: results.length,
    passed: results.filter((item) => item.status === 'PASS').length,
    failed: results.filter((item) => item.status === 'FAIL').length,
    uniqueText: UNIQUE_TEXT,
    results,
  };

  await writeReport(summary);
  console.log(JSON.stringify(summary, null, 2));
};

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        fatal: true,
        message: error instanceof Error ? error.message : String(error),
        results,
      },
      null,
      2,
    ),
  );
  process.exit(1);
});

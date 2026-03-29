# SC23 Table Editor Test Checklist

## Purpose

This document is a working checklist for reviewing the current `Rooster`-based table editor in SC23.

Use it in three situations:

1. Manual QA before release
2. Feedback collection from product, design, and users
3. Regression review after table engine changes

---

## Current Feature Inventory

### Table creation

- Quick grid insert from toolbar
- Detailed create modal
  - rows / cols
  - fit width / fixed width
  - row height
  - header row
  - first column emphasis
  - meeting preset
  - density
  - inline table option
- Template insert
  - meeting summary
  - agenda tracker
  - attendance sheet
  - approval line
  - approval request
  - comparison table

### Selection and navigation

- Click to activate table
- Cell drag selection
- `Tab` / `Shift+Tab` next or previous cell
- `Alt + Arrow` move between adjacent cells
- `F5` selection scope cycle
  - cell
  - row
  - column
  - table
- `Shift + F5` reverse cycle
- `Shift + Esc` exit table

### Structure editing

- Insert row above / below
- Insert column left / right
- Delete current row
- Delete current column
- Delete table
- Merge selected cells
- Split merged cell
- Split active cell by custom row / col counts

### Size and layout

- Drag resize via overlay handles
- Drag move via table overlay edge bars
- `Ctrl + Arrow` width / height adjust
- `Ctrl + Shift + Arrow` row / column insert
- Equalize column widths
- Equalize row heights
- Fit table width to paragraph
- Table properties modal
  - width / height
  - inline mode
  - wrapping
  - outside margin
  - cell padding

### Styling

- Header row toggle
- Zebra row toggle
- Meeting preset apply
- Density presets
- Reset table style
- Cell background color
- Text align
  - left
  - center
  - right
- Vertical align
  - top
  - middle
  - bottom
- White-space mode
  - nowrap
  - normal
- Padding presets
  - compact
  - comfortable
  - spacious
- Numeric alignment style
- Borders
  - all
  - outside
  - inside
  - top
  - bottom
  - left
  - right
  - none
- Border detail modal
  - color
  - width
  - style
- Diagonal line
  - slash
  - backslash
  - cross
  - clear diagonal

### Access paths

- Toolbar tab actions
- Right-click context menu
- Keyboard shortcuts
- Drag handles / overlay

---

## Manual Smoke Checklist

Run this list first after each major table change.

- Create a `3 x 3` table from the quick picker.
- Create a fixed-width table from the detailed create modal.
- Insert each template once and confirm width, header, and density styles are applied.
- Click one cell and drag into the next cell to confirm range selection expands.
- Click the table, then click outside the table to confirm selection and overlay clear.
- Resize the table larger, then smaller, and confirm shrink also works.
- Move the table with the edge drag bar and confirm it stays inside the editor area.
- Merge a `2 x 2` cell range, then split it back.
- Use context menu row and column insert/delete.
- Apply background color, border preset, diagonal line, and text align to selected cells.
- Use `Tab`, `Shift+Tab`, `Alt + Arrow`, `F5`, and `Shift + Esc`.
- Undo and redo each major table operation.
- Save the document, reload it, and confirm structure and styles persist.

---

## QA Engineer Mode

Role: 10-year QA engineer reviewing a custom web table editor.

### High severity scenarios

- Selection drag fails after pointer capture, so users cannot multi-select adjacent cells.
- Clicking outside the table does not clear active state, causing resize or style actions to hit the wrong table.
- Merged cell split corrupts rowSpan / colSpan and produces broken HTML structure.
- Row or column delete removes the wrong logical cell when merged cells exist.
- Resize larger works but resize smaller does not, leaving tables effectively locked.
- Undo after merge / split / delete restores partial DOM only and loses cell content.
- Save / reload drops `colgroup`, widths, or table classes so layout changes after refresh.
- Applying border detail to selected cells leaks styles to neighboring cells not in the range.

### Medium severity scenarios

- `Tab` navigation loops incorrectly at last cell or skips merged cells.
- `F5` scope cycle does not match visible selection feedback.
- Template insertion leaves cursor outside expected first editable cell.
- Fit width and fixed width modes conflict after manual drag resize.
- Table move overlay becomes detached from the actual table after scroll or edit.
- Right-click menu opens on table but target cell context is stale.
- Numeric alignment style is removed unexpectedly after text editing.
- First-column emphasis or header-row style is lost after row insertion.

### Low severity scenarios

- Hover or active visual feedback is too subtle to discover drag handles.
- Border preview in modal does not exactly match final applied CSS.
- Density preset names are not obvious to first-time users.
- Table properties modal values round slightly due to px/mm conversion.
- Context menu copy does not match toolbar wording.
- Some template row heights feel inconsistent after font changes.

### Suggested severity-based test order

1. Selection and overlay lifecycle
2. Merge / split / insert / delete with merged cells
3. Resize, move, fit width, and persistence
4. Styling and keyboard shortcuts
5. Template polish and wording

---

## UX Designer Mode

Role: usability expert reviewing table authoring interactions.

### Interactions that must feel smooth

- Clicking a cell should clearly switch from document editing mode to table editing mode.
- Clicking outside the table should cleanly return to document mode with no lingering overlay.
- Dragging across cells should feel immediate and predictable, without accidental text selection.
- Keyboard navigation should keep the caret visible and preserve a strong sense of position.
- Merge, split, insert, and delete actions should keep focus in the edited area, not jump unpredictably.
- Style changes should apply only to the intended scope and show feedback instantly.
- Undo should feel trustworthy after structural edits.
- Template insertion should place the cursor in the first meaningful editable cell.

### UX recommendations

- Keep one consistent active-state model: table active, cell range active, and document active should never conflict.
- Show a lightweight but discoverable resize affordance even when selection borders are minimal.
- Preserve caret and scroll position after every structural action.
- Distinguish “current cell” from “selected range” visually.
- Add lightweight inline hints for first-time shortcut discovery near the table help tab.
- Consider a small status line for current selection scope: `cell`, `row`, `column`, `table`.

---

## Regression Focus Areas

These are the most fragile areas based on recent fixes.

- Cell drag selection across adjacent cells
- Overlay sync after table click, outside click, and keyboard navigation
- Resize down after a previous enlarge
- Active state cleanup when clicking outside the table
- Disposed editor guards in toolbar and overlay
- Context menu and overlay interactions not clearing selection unexpectedly

---

## Suggested Test Dataset

Use these table shapes during manual review.

### Dataset A: simple grid

```json
{
  "name": "simple-grid",
  "rows": 3,
  "cols": 3,
  "mergedCells": []
}
```

### Dataset B: merged header

```json
{
  "name": "merged-header",
  "rows": 4,
  "cols": 4,
  "mergedCells": [
    { "r": 0, "c": 0, "rowSpan": 1, "colSpan": 4 },
    { "r": 1, "c": 0, "rowSpan": 2, "colSpan": 1 }
  ]
}
```

### Dataset C: real meeting table

```json
{
  "name": "meeting-summary",
  "rows": [
    ["회의명", "2026 1분기 운영회의", "", ""],
    ["일시", "2026-03-26 14:00", "장소", "회의실 A"],
    ["참석자", "원장, 팀장, 실무자", "", ""],
    ["안건", "예산, 일정, 운영정책", "", ""],
    ["주요 내용", "본문 입력", "", ""],
    ["결론 / 후속조치", "본문 입력", "", ""]
  ],
  "layout": {
    "colWidths": ["18%", "32%", "18%", "32%"]
  }
}
```

---

## Proposed Logical Schema

Use this shape when sharing table state for deeper defect review.

```json
{
  "tableId": "tbl-001",
  "classes": [
    "sc-table-standard",
    "sc-table-fit-width",
    "sc-table-header-row",
    "sc-table-density-comfortable"
  ],
  "colWidths": [120, 180, 120, 180],
  "rowHeights": [40, 42, 42, 56],
  "rows": [
    {
      "index": 0,
      "cells": [
        {
          "r": 0,
          "c": 0,
          "tag": "th",
          "rowSpan": 1,
          "colSpan": 2,
          "text": "회의명",
          "html": "회의명",
          "className": "",
          "style": {
            "textAlign": "center",
            "verticalAlign": "middle",
            "background": "#f8fafc"
          }
        }
      ]
    }
  ]
}
```

Use this schema to validate:

- logical cell position
- rowSpan / colSpan integrity
- class-based style persistence
- width and height persistence
- content preservation after merge / split / save

---

## Output Example For Review

Use a real output sample when asking for HTML validity or accessibility review.

```html
<table class="sc-table-standard sc-table-fit-width sc-table-header-row sc-table-density-comfortable">
  <colgroup>
    <col style="width: 18%" />
    <col style="width: 32%" />
    <col style="width: 18%" />
    <col style="width: 32%" />
  </colgroup>
  <tbody>
    <tr>
      <th>회의명</th>
      <td colspan="3">2026 1분기 운영회의</td>
    </tr>
    <tr>
      <th>일시</th>
      <td>2026-03-26 14:00</td>
      <th>장소</th>
      <td>회의실 A</td>
    </tr>
  </tbody>
</table>
```

Ask reviewers:

- Is this HTML structurally valid?
- Are header cells used correctly?
- Does this meet minimum accessibility expectations for screen readers?
- Are colspan and width rules likely to survive copy, save, and reload?

---

## Copy-Paste Prompt Set

### QA engineer prompt

```text
너는 10년 차 QA 엔지니어다.
이 표 에디터에서 발생할 수 있는 버그 시나리오를 중요도 상/중/하로 나눠 작성해줘.
특히 선택 해제, 셀 드래그 선택, 병합/분할, 행열 추가삭제, 크기 조절, 저장 후 복원에 집중해줘.
```

### UX designer prompt

```text
너는 사용성 전문가다.
표 내부에서 텍스트 편집과 스타일 변경이 일어날 때 가장 매끄러워야 하는 인터랙션을 제안해줘.
특히 셀 선택, 범위 선택, 키보드 이동, 표 밖으로 빠져나오기, 스타일 피드백에 집중해줘.
```

### Accessibility / HTML review prompt

```text
이 표 HTML 결과물이 웹 표준과 접근성 측면에서 어떤 문제가 있는지 검토해줘.
th, td, colspan, 구조적 유효성, 키보드 탐색, 스크린리더 친화성을 중심으로 봐줘.
```

---

## Recommended Feedback Process

1. Share the feature inventory first.
2. Share one logical schema example.
3. Share one real HTML output example.
4. Ask for QA severity review.
5. Ask for UX interaction review.
6. Convert findings into regression checklist items.

---

## Notes

- This checklist is based on the current SC23 custom table engine, not a generic HTML table editor.
- It is intended for manual and review-driven validation.
- Build verification should still be run separately with `npm run build`.

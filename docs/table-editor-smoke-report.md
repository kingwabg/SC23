# SC23 Table Editor Smoke Report

- Generated: 2026. 3. 27. 오전 12:23:46
- Frontend: http://localhost:5173
- Meetings page: http://localhost:5173/meetings
- Total: 12
- Passed: 12
- Failed: 0
- Unique text: `AUTO-TABLE-1774538594292`

## Automated Result

| Status | Step | Detail |
| --- | --- | --- |
| PASS | 프론트 페이지 접속 | 로그인 페이지가 열렸습니다. |
| PASS | 관리자 로그인 | JWT 세션이 생성되었습니다. access=eyJhbGciOiJIUzI1..., refresh=eyJhbGciOiJIUzI1... |
| PASS | 회의록 화면 진입 | 에디터 준비 완료, 초기 표 수 3개, 표시 헤더 아이숲 Admin, 아이숲 업무방, 아이숲 모바일 워크스페이스, 운영 회의록 |
| PASS | 빠른 표 삽입 | 표 수가 3개에서 4개로 늘었습니다. |
| PASS | 셀 드래그 선택 | 2개 셀이 선택되었습니다. |
| PASS | 표 밖 클릭 시 선택 해제 | 선택 클래스와 오버레이가 모두 제거되었습니다. |
| PASS | 행 추가 | 행 수가 3개에서 4개로 늘었습니다. |
| PASS | 열 추가 | 첫 행 셀 수가 3개에서 4개로 늘었습니다. |
| PASS | 셀 합치기 | 첫 셀 colspan이 2으로 변경되었습니다. |
| PASS | 병합 해제 | 첫 셀 colspan이 1으로 복구되었습니다. |
| PASS | 표 스타일 토글 | 적용 클래스: sc-table-standard sc-table-fit-width sc-selected-table sc-table-preset-meeting sc-table-header-row sc-table-density-comfortable sc-table-zebra |
| PASS | 저장 후 새로고침 유지 | 고유 텍스트 'AUTO-TABLE-1774538594292'가 저장 후에도 유지되었습니다. |

## Notes

- This report covers automated smoke coverage only.
- Interaction feel, visual polish, and edge cases with complex merged cells still need manual review.

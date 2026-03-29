# Table Merged Boundary Smoke Report

## Latest Run

- Date: 2026-03-28
- Command: `node scripts/table-single-boundary-smoke.mjs`
- Build: `npm run build` PASS
- Result: `12 total / 8 passed / 4 failed`

## Passed

- `env-login`: 관리자 로그인 및 회의록 진입
- `table-insert`: 3x3 표 삽입
- `row-segment-down`: 현재칸 행 경계 아래 이동
- `row-segment-snap-match`: 옆칸 행 경계를 같은 선으로 스냅
- `neighbor-row-up`: 옆칸 행 경계 위 이동 가능
- `neighbor-col-left`: 옆칸 열 경계 왼쪽 이동 가능
- `merged-row-up-opposite-edge`: 병합 셀 아래칸의 윗선으로 다시 위 이동
- `merged-col-left-opposite-edge`: 병합 셀 오른쪽칸의 왼선으로 다시 왼 이동

## Failed

- `col-segment-right`
  - 현재칸 열 경계를 오른쪽으로 이동해도 너비 증가가 재현되지 않음
  - 디버그 결과 inline cell width는 남아 있지만 실제 `colgroup` 기반 분리가 적용되지 않음

- `col-segment-snap-match`
  - 아래칸 열 경계를 같은 선에 스냅하려고 할 때 추가 segment column이 과하게 생김
  - 결과적으로 같은 선 정렬 대신 `colSpan=2` 형태의 분할이 끼어듦

- `merged-row-down`
  - 가로 병합 셀의 bottom edge에서 아래로 늘리는 동작이 먹지 않음
  - 반대편(`below cell top edge`)에서 위로 줄이는 동작은 통과

- `merged-col-right`
  - 세로 병합 셀의 right edge에서 오른쪽으로 늘리는 동작이 먹지 않음
  - 반대편(`right cell left edge`)에서 왼쪽으로 줄이는 동작은 통과

## Current Read

- 일반 셀의 단일 행 경계 조작은 비교적 안정적이다.
- 열 경계 쪽은 여전히 positive direction에서 segment column 재조합이 흔들린다.
- 병합 셀은 opposite-edge shrinking은 되지만, direct-edge expanding이 아직 불안정하다.
- 다음 집중 포인트는 `direct-edge positive resize`와 `column segment snap merge`다.

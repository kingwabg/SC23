export type TableTemplateId =
  | 'meetingSummary'
  | 'agendaTracker'
  | 'attendanceSheet'
  | 'approvalLine'
  | 'approvalRequest'
  | 'comparison';

export interface TableTemplateDefinition {
  id: TableTemplateId;
  label: string;
  quickLabel: string;
  description: string;
}

const EMPTY_CELL = '<br />';

export const TABLE_TEMPLATES: TableTemplateDefinition[] = [
  {
    id: 'meetingSummary',
    label: '회의록 요약표',
    quickLabel: '회의록 요약',
    description: '회의명, 일시, 장소, 안건, 후속조치를 바로 채울 수 있습니다.',
  },
  {
    id: 'agendaTracker',
    label: '안건 추적표',
    quickLabel: '안건 추적',
    description: '안건, 결정사항, 담당자, 기한, 진행상태를 한눈에 정리합니다.',
  },
  {
    id: 'attendanceSheet',
    label: '참석자 명단표',
    quickLabel: '참석자 명단',
    description: '참석자 이름, 소속, 연락처, 참석 여부를 빠르게 채웁니다.',
  },
  {
    id: 'approvalLine',
    label: '결재선 표',
    quickLabel: '결재선',
    description: '담당, 팀장, 원장 결재 칸과 기본 기안 항목을 함께 넣습니다.',
  },
  {
    id: 'approvalRequest',
    label: '기안 요약표',
    quickLabel: '기안 요약',
    description: '기안부서, 보안등급, 목적, 요청사항을 정리한 결재용 표입니다.',
  },
  {
    id: 'comparison',
    label: '비교표',
    quickLabel: '비교표',
    description: '항목별로 안 A / 안 B / 비고를 나란히 비교합니다.',
  },
];

export const buildTableTemplateHtml = (templateId: TableTemplateId, token: string) => {
  switch (templateId) {
    case 'meetingSummary':
      return `
        <table data-sc-template-token="${token}" class="sc-table-standard sc-table-fit-width sc-table-template-minutes sc-table-preset-meeting sc-table-density-comfortable">
          <colgroup>
            <col style="width: 18%" />
            <col style="width: 32%" />
            <col style="width: 18%" />
            <col style="width: 32%" />
          </colgroup>
          <tbody>
            <tr><th>회의명</th><td colspan="3">${EMPTY_CELL}</td></tr>
            <tr><th>일시</th><td>${EMPTY_CELL}</td><th>장소</th><td>${EMPTY_CELL}</td></tr>
            <tr><th>참석자</th><td colspan="3">${EMPTY_CELL}</td></tr>
            <tr><th>안건</th><td colspan="3">${EMPTY_CELL}</td></tr>
            <tr><th>주요 내용</th><td colspan="3">${EMPTY_CELL}</td></tr>
            <tr><th>결론 / 후속조치</th><td colspan="3">${EMPTY_CELL}</td></tr>
          </tbody>
        </table>
        <p><br /></p>
      `;

    case 'agendaTracker':
      return `
        <table data-sc-template-token="${token}" class="sc-table-standard sc-table-fit-width sc-table-template-agenda sc-table-header-row sc-table-density-comfortable">
          <colgroup>
            <col style="width: 12%" />
            <col style="width: 34%" />
            <col style="width: 22%" />
            <col style="width: 16%" />
            <col style="width: 16%" />
          </colgroup>
          <tbody>
            <tr><th>No.</th><th>안건 / 결정사항</th><th>담당자</th><th>기한</th><th>진행상태</th></tr>
            <tr><td>1</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td></tr>
            <tr><td>2</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td></tr>
            <tr><td>3</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td></tr>
            <tr><td>4</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td></tr>
          </tbody>
        </table>
        <p><br /></p>
      `;

    case 'attendanceSheet':
      return `
        <table data-sc-template-token="${token}" class="sc-table-standard sc-table-fit-width sc-table-template-attendance sc-table-header-row sc-table-density-comfortable">
          <colgroup>
            <col style="width: 18%" />
            <col style="width: 22%" />
            <col style="width: 22%" />
            <col style="width: 18%" />
            <col style="width: 20%" />
          </colgroup>
          <tbody>
            <tr><th>이름</th><th>소속</th><th>연락처</th><th>참석 여부</th><th>비고 / 서명</th></tr>
            <tr><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td></tr>
            <tr><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td></tr>
            <tr><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td></tr>
            <tr><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td></tr>
          </tbody>
        </table>
        <p><br /></p>
      `;

    case 'approvalLine':
      return `
        <table data-sc-template-token="${token}" class="sc-table-standard sc-table-fit-width sc-table-template-approval sc-table-density-comfortable">
          <colgroup>
            <col style="width: 18%" />
            <col style="width: 27.33%" />
            <col style="width: 27.33%" />
            <col style="width: 27.33%" />
          </colgroup>
          <tbody>
            <tr><th rowspan="2">결재</th><th>담당</th><th>팀장</th><th>원장</th></tr>
            <tr><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td></tr>
            <tr><th>문서명</th><td colspan="3">${EMPTY_CELL}</td></tr>
            <tr><th>기안일</th><td>${EMPTY_CELL}</td><th>시행일</th><td>${EMPTY_CELL}</td></tr>
            <tr><th>요약</th><td colspan="3">${EMPTY_CELL}</td></tr>
            <tr><th>비고</th><td colspan="3">${EMPTY_CELL}</td></tr>
          </tbody>
        </table>
        <p><br /></p>
      `;

    case 'approvalRequest':
      return `
        <table data-sc-template-token="${token}" class="sc-table-standard sc-table-fit-width sc-table-template-approval-request sc-table-density-comfortable">
          <colgroup>
            <col style="width: 17%" />
            <col style="width: 33%" />
            <col style="width: 17%" />
            <col style="width: 33%" />
          </colgroup>
          <tbody>
            <tr><th>문서명</th><td colspan="3">${EMPTY_CELL}</td></tr>
            <tr><th>기안부서</th><td>${EMPTY_CELL}</td><th>보안등급</th><td>${EMPTY_CELL}</td></tr>
            <tr><th>작성자</th><td>${EMPTY_CELL}</td><th>작성일</th><td>${EMPTY_CELL}</td></tr>
            <tr><th>목적</th><td colspan="3">${EMPTY_CELL}</td></tr>
            <tr><th>배경</th><td colspan="3">${EMPTY_CELL}</td></tr>
            <tr><th>요청사항</th><td colspan="3">${EMPTY_CELL}</td></tr>
          </tbody>
        </table>
        <p><br /></p>
      `;

    case 'comparison':
      return `
        <table data-sc-template-token="${token}" class="sc-table-standard sc-table-fit-width sc-table-template-comparison sc-table-header-row sc-table-density-comfortable">
          <colgroup>
            <col style="width: 22%" />
            <col style="width: 26%" />
            <col style="width: 26%" />
            <col style="width: 26%" />
          </colgroup>
          <tbody>
            <tr><th>항목</th><th>안 A</th><th>안 B</th><th>비고</th></tr>
            <tr><th>목적</th><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td></tr>
            <tr><th>예산</th><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td></tr>
            <tr><th>일정</th><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td></tr>
            <tr><th>담당자</th><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td></tr>
            <tr><th>비고</th><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td><td>${EMPTY_CELL}</td></tr>
          </tbody>
        </table>
        <p><br /></p>
      `;
  }
};

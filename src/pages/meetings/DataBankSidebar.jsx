import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Database, FileSpreadsheet, LoaderCircle, Users } from 'lucide-react';
import {
  buildDailyAttendanceSummary,
  buildMonthlyAttendanceSummaries,
  escapeHtml,
  getAvailableAttendanceYears,
  getDaysInMonth,
} from './attendanceDataBank';

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);

const buildDailySummaryHtml = (summary) => `
  <p style="margin: 8px 0; font-size: 14px; line-height: 1.7;">
    <strong>${escapeHtml(summary.label)}</strong> 기준 출석 <strong>${summary.presentCount}명</strong>,
    결석 <strong>${summary.absentCount}명</strong>, 공결 <strong>${summary.officialCount}명</strong>,
    지각 <strong>${summary.lateCount}명</strong>, 출석률 <strong>${summary.attendanceRate}%</strong>입니다.
  </p>
`;

const buildStatusSectionHtml = (title, tone, items) => {
  if (!items.length) {
    return '';
  }

  const color = {
    emerald: '#047857',
    rose: '#be123c',
    indigo: '#4338ca',
    amber: '#b45309',
  }[tone] || '#334155';

  return `
    <div style="margin-top: 12px;">
      <p style="margin: 0 0 6px; font-size: 12px; font-weight: 800; color: ${color};">${escapeHtml(title)}</p>
      <ul style="margin: 0; padding-left: 20px; line-height: 1.7;">
        ${items.map((item) => {
          const schoolLabel = [item.school, item.grade ? `${item.grade}학년` : ''].filter(Boolean).join(' ');
          return `<li><strong>${escapeHtml(item.name)}</strong>${schoolLabel ? ` <span style="color:#64748b;">(${escapeHtml(schoolLabel)})</span>` : ''}</li>`;
        }).join('')}
      </ul>
    </div>
  `;
};

const buildDailyNameListHtml = (summary) => `
  <div style="margin: 12px 0; padding: 16px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff;">
    <p style="margin: 0 0 8px; font-size: 14px; font-weight: 800;">${escapeHtml(summary.label)} 출결 명단</p>
    <p style="margin: 0; font-size: 12px; color: #64748b;">
      대상 ${summary.activeCount}명 / 기록 ${summary.recordedCount}명 / 출석률 ${summary.attendanceRate}%
    </p>
    ${buildStatusSectionHtml('출석', 'emerald', summary.presentChildren)}
    ${buildStatusSectionHtml('결석', 'rose', summary.absentChildren)}
    ${buildStatusSectionHtml('공결', 'indigo', summary.officialChildren)}
    ${buildStatusSectionHtml('지각', 'amber', summary.lateChildren)}
  </div>
`;

const buildDailyMiniTableHtml = (summary) => `
  <table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px;">
    <thead>
      <tr>
        <th style="border: 1px solid #cbd5e1; background: #eef2ff; padding: 8px; text-align: center;" colspan="5">${escapeHtml(summary.label)} 출결 요약</th>
      </tr>
      <tr>
        <th style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px;">대상</th>
        <th style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px;">출석</th>
        <th style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px;">결석</th>
        <th style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px;">공결</th>
        <th style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px;">출석률</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${summary.activeCount}명</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${summary.presentCount}명</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${summary.absentCount}명</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${summary.officialCount}명</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${summary.attendanceRate}%</td>
      </tr>
    </tbody>
  </table>
`;

const buildMonthlyOverviewHtml = (summaries, year, month) => `
  <table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px;">
    <thead>
      <tr>
        <th style="border: 1px solid #cbd5e1; background: #e0f2fe; padding: 8px;" colspan="6">${year}년 ${month}월 일별 출결 현황</th>
      </tr>
      <tr>
        <th style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px;">일자</th>
        <th style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px;">대상</th>
        <th style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px;">출석</th>
        <th style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px;">결석</th>
        <th style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px;">공결</th>
        <th style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px;">출석률</th>
      </tr>
    </thead>
    <tbody>
      ${summaries.map((summary) => `
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${summary.day}일</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${summary.activeCount}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${summary.presentCount}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${summary.absentCount}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${summary.officialCount}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${summary.attendanceRate}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
`;

const DATA_ACTION_BUTTON = 'rounded-2xl border px-3 py-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40';

const preventEditorBlur = (event) => {
  event.preventDefault();
};

export default function DataBankSidebar({
  childrenData,
  isLoading,
  loadError,
  onInsertText,
  onInsertHtml,
  onInsertDailyPresentValue,
  onFillMonthlyPresentValues,
}) {
  const today = new Date();
  const yearOptions = useMemo(() => getAvailableAttendanceYears(childrenData), [childrenData]);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  useEffect(() => {
    if (!yearOptions.length) return;
    if (!yearOptions.includes(selectedYear)) {
      setSelectedYear(yearOptions[0]);
    }
  }, [selectedYear, yearOptions]);

  const daysInMonth = useMemo(() => getDaysInMonth(selectedYear, selectedMonth), [selectedYear, selectedMonth]);

  useEffect(() => {
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
  }, [daysInMonth, selectedDay]);

  const monthlySummaries = useMemo(
    () => buildMonthlyAttendanceSummaries(childrenData, selectedYear, selectedMonth),
    [childrenData, selectedYear, selectedMonth],
  );

  const selectedSummary = useMemo(
    () => monthlySummaries.find((summary) => summary.day === selectedDay)
      || buildDailyAttendanceSummary(childrenData, selectedYear, selectedMonth, 1),
    [childrenData, monthlySummaries, selectedDay, selectedMonth, selectedYear],
  );

  const totalActiveDays = monthlySummaries.filter((summary) => summary.activeCount > 0).length;
  const averageAttendanceRate = monthlySummaries.length
    ? Math.round(monthlySummaries.reduce((sum, summary) => sum + summary.attendanceRate, 0) / monthlySummaries.length)
    : 0;
  const totalPresent = monthlySummaries.reduce((sum, summary) => sum + summary.presentCount, 0);
  const hasChildren = Array.isArray(childrenData) && childrenData.length > 0;
  const canInsertDailyData = selectedSummary.activeCount > 0;
  const canInsertMonthlyData = monthlySummaries.some((summary) => summary.activeCount > 0);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <Database className="w-4 h-4 text-slate-400" />
          <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Data Bank</h5>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-black text-slate-900">아동 출결 조각 삽입</p>
              <p className="mt-1 text-[11px] font-bold leading-relaxed text-slate-500">
                아동관리의 출결 원본을 날짜별로 요약해 현재 커서 위치에 숫자, 문장, 미니 표로 넣습니다.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 border border-slate-200">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>원본 아동 수</span>
            </div>
            <span className="text-[12px] font-black text-slate-900">{childrenData.length}명</span>
          </div>

          <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/70 px-4 py-3 text-[11px] font-bold text-indigo-700">
            표 셀을 먼저 선택하면 `숫자 삽입` 버튼이나 아래 일자 카드 클릭만으로 셀 값이 바로 바뀝니다.
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[11px] font-bold text-slate-500 border border-slate-200">
              <LoaderCircle className="w-4 h-4 animate-spin text-indigo-500" />
              출결 데이터를 불러오는 중입니다...
            </div>
          )}

          {!isLoading && loadError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-bold text-amber-700">
              {loadError}
            </div>
          )}

          {!isLoading && !hasChildren && !loadError && (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-bold text-slate-500">
              연결된 출결 데이터가 없습니다. 아동관리에서 데이터를 먼저 저장하면 이곳에서 바로 가져올 수 있습니다.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <h6 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Date Slice</h6>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <select
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[11px] font-black text-slate-700 outline-none focus:border-indigo-400 focus:bg-white"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}년</option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(Number(event.target.value))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[11px] font-black text-slate-700 outline-none focus:border-indigo-400 focus:bg-white"
          >
            {MONTH_OPTIONS.map((month) => (
              <option key={month} value={month}>{month}월</option>
            ))}
          </select>

          <select
            value={selectedDay}
            onChange={(event) => setSelectedDay(Number(event.target.value))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-[11px] font-black text-slate-700 outline-none focus:border-indigo-400 focus:bg-white"
          >
            {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => (
              <option key={day} value={day}>{day}일</option>
            ))}
          </select>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
          <div>
            <p className="text-[13px] font-black text-slate-900">{selectedSummary.label}</p>
            <p className="mt-1 text-[11px] font-bold text-slate-500">
              대상 {selectedSummary.activeCount}명 / 기록 {selectedSummary.recordedCount}명 / 월 누적 출석 {totalPresent}건
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MetricCard title="출석" value={`${selectedSummary.presentCount}명`} tone="emerald" />
            <MetricCard title="결석" value={`${selectedSummary.absentCount}명`} tone="rose" />
            <MetricCard title="공결" value={`${selectedSummary.officialCount}명`} tone="indigo" />
            <MetricCard title="출석률" value={`${selectedSummary.attendanceRate}%`} tone="amber" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onMouseDown={preventEditorBlur}
              onClick={() => onInsertText(String(selectedSummary.presentCount))}
              disabled={!canInsertDailyData}
              className={`${DATA_ACTION_BUTTON} border-emerald-200 bg-emerald-50 text-emerald-700`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest">숫자 삽입</p>
              <p className="mt-1 text-[11px] font-black">출석 {selectedSummary.presentCount}</p>
            </button>

            <button
              type="button"
              onMouseDown={preventEditorBlur}
              onClick={() => onInsertText(String(selectedSummary.absentCount))}
              disabled={!canInsertDailyData}
              className={`${DATA_ACTION_BUTTON} border-rose-200 bg-rose-50 text-rose-700`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest">숫자 삽입</p>
              <p className="mt-1 text-[11px] font-black">결석 {selectedSummary.absentCount}</p>
            </button>

            <button
              type="button"
              onMouseDown={preventEditorBlur}
              onClick={() => onInsertText(`${selectedSummary.attendanceRate}%`)}
              disabled={!canInsertDailyData}
              className={`${DATA_ACTION_BUTTON} border-amber-200 bg-amber-50 text-amber-700`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest">숫자 삽입</p>
              <p className="mt-1 text-[11px] font-black">출석률 {selectedSummary.attendanceRate}%</p>
            </button>

            <button
              type="button"
              onMouseDown={preventEditorBlur}
              onClick={() => onInsertHtml(buildDailySummaryHtml(selectedSummary))}
              disabled={!canInsertDailyData}
              className={`${DATA_ACTION_BUTTON} border-indigo-200 bg-indigo-50 text-indigo-700`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest">문장 삽입</p>
              <p className="mt-1 text-[11px] font-black">일별 요약 문장</p>
            </button>

            <button
              type="button"
              onMouseDown={preventEditorBlur}
              onClick={() => onInsertHtml(buildDailyMiniTableHtml(selectedSummary))}
              disabled={!canInsertDailyData}
              className={`${DATA_ACTION_BUTTON} border-slate-200 bg-slate-50 text-slate-700`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest">미니 표 삽입</p>
              <p className="mt-1 text-[11px] font-black">하루 출결 요약표</p>
            </button>

            <button
              type="button"
              onMouseDown={preventEditorBlur}
              onClick={() => onInsertHtml(buildDailyNameListHtml(selectedSummary))}
              disabled={!canInsertDailyData}
              className={`${DATA_ACTION_BUTTON} col-span-2 border-slate-200 bg-white text-slate-700`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest">명단 삽입</p>
              <p className="mt-1 text-[11px] font-black">상태별 아동 명단 블록</p>
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <h6 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Month Slice</h6>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onMouseDown={preventEditorBlur}
              onClick={() => onFillMonthlyPresentValues?.(monthlySummaries)}
              disabled={!canInsertMonthlyData}
              className="rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-700 transition-all hover:border-indigo-300 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              월간 수치 채우기
            </button>
            <button
              type="button"
              onMouseDown={preventEditorBlur}
              onClick={() => onInsertHtml(buildMonthlyOverviewHtml(monthlySummaries, selectedYear, selectedMonth))}
              disabled={!canInsertMonthlyData}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              월간 표 삽입
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-bold text-slate-500">
          일자 카드를 누르면 현재 표 셀에 그 날짜의 출석 수가 바로 입력됩니다.
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MetricCard title="활성 일수" value={`${totalActiveDays}일`} tone="blue" />
          <MetricCard title="평균 출석률" value={`${averageAttendanceRate}%`} tone="violet" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {monthlySummaries.map((summary) => (
            <button
              key={summary.dateKey}
              type="button"
              onMouseDown={preventEditorBlur}
              onClick={() => {
                onInsertDailyPresentValue?.(summary);
                setSelectedDay(summary.day);
              }}
              className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                summary.day === selectedDay
                  ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{summary.day}일</p>
              <p className="mt-1 text-[13px] font-black text-slate-900">출석 {summary.presentCount}명</p>
              <p className="mt-1 text-[11px] font-bold text-slate-500">
                결석 {summary.absentCount} / 공결 {summary.officialCount} / {summary.attendanceRate}%
              </p>
              <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-indigo-500">클릭 시 셀 입력</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ title, value, tone }) {
  const toneStyles = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    blue: 'border-sky-200 bg-sky-50 text-sky-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
  };

  return (
    <div className={`rounded-2xl border px-3 py-3 ${toneStyles[tone] || 'border-slate-200 bg-slate-50 text-slate-700'}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{title}</p>
      <p className="mt-1 text-[15px] font-black">{value}</p>
    </div>
  );
}

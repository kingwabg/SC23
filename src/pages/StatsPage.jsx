import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Calendar as CalendarIcon,
  ArrowLeft,
  PieChart,
  Users,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  BookOpen,
  MessageSquare,
  TrendingUp,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const heroStats = [
  { label: '평균 출석률', value: '94.2%', accent: 'from-blue-600 to-cyan-500', icon: BarChart3, sub: '전월 대비 +2.1%' },
  { label: '아동 관찰일지', value: '88/96', accent: 'from-emerald-600 to-teal-500', icon: BookOpen, sub: '이번 달 작성 완료' },
  { label: '자치회의 계획', value: '1/4분기', accent: 'from-indigo-600 to-violet-500', icon: Users, sub: '분기별 프로세스 이행' },
  { label: '상담 이행률', value: '92.5%', accent: 'from-amber-500 to-orange-500', icon: CheckCircle2, sub: '상반기 필수 상담 완료' }
];

const complianceItems = [
  { label: '아동 관찰일지', target: '96건 (12개월 x 8명)', current: 88, max: 96, accent: 'bg-emerald-500' },
  { label: '상반기 상담일지', target: '8건 (재원 8명)', current: 8, max: 8, accent: 'bg-indigo-600' },
  { label: '하반기 상담일지', target: '8건 (재원 8명)', current: 0, max: 8, accent: 'bg-slate-300' },
  { label: '보호자 상담일지', target: '최소 분기별 1회 권장', current: 24, max: 32, accent: 'bg-blue-500' },
  { label: '아동 자치회의', target: '4회 (년 4회 계획/일지/평가)', current: 1, max: 4, accent: 'bg-amber-500' },
  { label: '종사자 회의록', target: '12회 (월 1회 정기회의)', current: 3, max: 12, accent: 'bg-slate-900' }
];

const alerts = [
  { tone: 'text-rose-400', label: 'Missing Documentation', text: '아동 자치회의 1분기 평가서 대기' },
  { tone: 'text-amber-400', label: 'Compliance Warning', text: '3월 관찰일지 미작성 아동 (3명)' }
];

const pulses = [
  { label: '최근 작성 회의록', value: '2분 전', sub: '이팀장 - 주간회의' },
  { label: '데이터 동기화 상태', value: '정상', sub: 'Local DB <-> Archive' },
  { label: '스토리지 사용량', value: '2.4 GB', sub: '총 500개 기록물 저장' }
];

const StatsPage = () => {
  const [selectedYear, setSelectedYear] = useState(2026);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 font-['Outfit'] text-slate-800 md:p-8">
      <div className="mx-auto max-w-[1480px] space-y-5 md:space-y-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.16),_transparent_32%),linear-gradient(135deg,_#ffffff,_#f8fafc_50%,_#eef2ff)] p-5 shadow-xl shadow-slate-200/60 md:rounded-[2.75rem] md:p-8">
          <div className="flex flex-col gap-5 md:gap-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-4">
                <div className="flex items-start gap-3 md:gap-4">
                  <Link to="/dashboard" className="rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:-translate-x-0.5 hover:shadow-lg">
                    <ArrowLeft className="h-5 w-5 text-slate-500" />
                  </Link>
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">
                      <Activity className="h-3.5 w-3.5" />
                      Live Analysis
                    </div>
                    <h2 className="mt-3 text-3xl font-black uppercase italic tracking-tight text-slate-900 md:text-5xl">
                      Compliance Intelligence
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500 md:text-base">
                      행정 기록 이행률, 누락 위험, 월간 리듬을 모바일에서도 빠르게 읽을 수 있도록 통계 화면을 앱형 대시보드로 재구성했습니다.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-inner shadow-slate-100">
                  {[2024, 2025, 2026].map((year) => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`whitespace-nowrap rounded-xl px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] transition-all ${
                        selectedYear === year ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      {year} year
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                <button className="inline-flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 shadow-sm transition-all hover:shadow-lg">
                  <CalendarIcon className="h-5 w-5 text-indigo-500" />
                  {selectedYear}년 3월 보고서
                </button>
                <button className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-900 px-6 py-4 text-sm font-black text-white shadow-xl shadow-slate-300/40 transition-all hover:bg-black">
                  <Download className="h-5 w-5 text-emerald-400" />
                  전체 아카이브 엑셀 추출
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {heroStats.map((stat) => (
                <div key={stat.label} className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70 md:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{stat.label}</p>
                      <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{stat.value}</p>
                      <p className="mt-2 text-xs font-bold text-slate-500">{stat.sub}</p>
                    </div>
                    <div className={`rounded-2xl bg-gradient-to-br p-3 text-white shadow-lg ${stat.accent}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 md:p-7">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tight text-slate-900 md:text-2xl">Institutional Log Compliance</h3>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    필수 기록물 항목별 {selectedYear}년 이행률
                  </p>
                </div>
              </div>
              <button className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-indigo-600 transition-all hover:bg-indigo-600 hover:text-white">
                상세 일련번호 대조
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {complianceItems.map((item) => {
                const ratio = item.max > 0 ? Math.min(100, (item.current / item.max) * 100) : 0;

                return (
                  <div key={item.label} className="rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-slate-900">{item.label}</p>
                          {item.current > 0 ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">target: {item.target}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black tracking-tight text-slate-900">{item.current}</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">logs</p>
                      </div>
                    </div>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-white shadow-inner">
                      <div className={`h-full rounded-full ${item.accent}`} style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="space-y-5">
            <section className="overflow-hidden rounded-[2rem] bg-slate-900 p-5 text-white shadow-2xl shadow-slate-300/40 md:p-7">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-amber-400">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Critical Alerts</h3>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">필수 행정 기록 누락 주의보</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.text} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${alert.tone}`}>{alert.label}</p>
                      <ArrowUpRight className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="mt-3 text-base font-bold leading-tight text-white">{alert.text}</p>
                  </div>
                ))}
              </div>

              <button className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700">
                <TrendingUp className="h-5 w-5" />
                3월 업무 요약본(PDF) 생성
              </button>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 md:p-7">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                  <PieChart className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-lg font-black uppercase italic tracking-tight text-slate-900">Live Record Pulse</h4>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">운영 상태 스냅샷</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {pulses.map((pulse) => (
                  <div key={pulse.label} className="flex items-start gap-3 rounded-[1.5rem] bg-slate-50 p-4">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        {pulse.label}: <span className="text-indigo-600">{pulse.value}</span>
                      </p>
                      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">{pulse.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">월간 완료율</p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">91%</p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">즉시 조치</p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">2건</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;

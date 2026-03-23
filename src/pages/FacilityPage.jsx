import React from 'react';
import { Building2, ShieldCheck, Zap, Wrench, Siren, MonitorSmartphone, Wind, ChevronRight } from 'lucide-react';

const inspections = [
  { label: '소방 안전 점검', date: '2026.03.12', status: '완료', tone: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  { label: '전기 설비 안전 검사', date: '2026.03.18', status: '진행중', tone: 'bg-amber-50 text-amber-600 border-amber-100' },
  { label: '비상 대피로 점검', date: '2026.03.22', status: '예정', tone: 'bg-slate-100 text-slate-500 border-slate-200' }
];

const assets = [
  { label: 'PC / 태블릿', value: '12대', icon: MonitorSmartphone, tone: 'from-blue-600 to-cyan-500' },
  { label: '공기청정기', value: '4대', icon: Wind, tone: 'from-emerald-600 to-teal-500' },
  { label: '안전장비', value: '18개', icon: Siren, tone: 'from-amber-500 to-orange-500' },
  { label: '유지보수 요청', value: '2건', icon: Wrench, tone: 'from-slate-900 to-slate-700' }
];

const maintenance = [
  { title: '생활실 조명 교체', owner: '시설담당', due: '03.19', priority: '보통' },
  { title: '정수기 필터 점검', owner: '외부업체', due: '03.21', priority: '높음' },
  { title: '출입문 잠금장치 보수', owner: '관리팀', due: '03.24', priority: '높음' }
];

const FacilityPage = () => {
  return (
    <div className="font-['Outfit'] space-y-5 md:space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_30%),linear-gradient(135deg,_#ffffff,_#f8fafc_45%,_#ecfeff)] p-5 shadow-xl shadow-slate-200/60 md:rounded-[2.75rem] md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">
              <Building2 className="h-3.5 w-3.5" />
              Facility Control
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">시설 및 자산 관리</h2>
              <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
                안전 점검, 유지보수, 자산 수량을 모바일에서도 빠르게 파악할 수 있도록 시설 화면을 운영 대시보드 형태로 정리했습니다.
              </p>
            </div>
          </div>

          <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-300/40 transition-all hover:bg-black">
            <Wrench className="h-4 w-4" />
            유지보수 요청 등록
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {assets.map((asset) => (
          <div key={asset.label} className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{asset.label}</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{asset.value}</p>
              </div>
              <div className={`rounded-2xl bg-gradient-to-br p-3 text-white shadow-lg ${asset.tone}`}>
                <asset.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 md:p-7">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">정기 안전 점검</h3>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">2026년 3월 체크리스트</p>
              </div>
            </div>
            <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-slate-600 transition-all hover:bg-slate-50">
              전체 기록 보기
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {inspections.map((item) => (
              <div key={item.label} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-black text-slate-900">{item.label}</p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">{item.date}</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${item.tone}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 md:p-7">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-900">유지보수 대기</h3>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">현장 조치 필요 항목</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {maintenance.map((item) => (
              <div key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">{item.title}</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">{item.owner}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${item.priority === '높음' ? 'bg-rose-50 text-rose-600' : 'bg-slate-200 text-slate-600'}`}>
                    {item.priority}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>마감 {item.due}</span>
                  <button className="text-indigo-600">상세 보기</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default FacilityPage;

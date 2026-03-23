import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Calendar,
  FileText,
  TrendingUp,
  Bell,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { authApi } from '../utils/apiClient';

const toneMap = {
  present: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
  absent: {
    icon: AlertCircle,
    color: 'text-rose-500',
    bg: 'bg-rose-50',
  },
};

const snapshotToneMap = {
  emerald: 'text-emerald-600 bg-emerald-50',
  blue: 'text-blue-600 bg-blue-50',
  amber: 'text-amber-600 bg-amber-50',
};

const Dashboard = () => {
  const [summary, setSummary] = useState({
    todayLabel: '',
    stats: {
      attendance: { present: 0, total: 0, absent: 0 },
      meetings: { pending: 0, completionRate: 0 },
      programs: { inProgress: 0, completionRate: 0 },
      calendar: { weeklyCount: 0 },
      staff: { active: 0, total: 0 },
    },
    attendanceList: [],
    actionItems: [],
    weeklySnapshot: [],
    noticeItems: [],
  });

  useEffect(() => {
    const hydrateDashboard = async () => {
      try {
        const data = await authApi('/api/dashboard-summary');
        setSummary(data);
      } catch (error) {
        console.error('대시보드 요약 조회 실패:', error);
      }
    };

    hydrateDashboard();
  }, []);

  const stats = useMemo(() => [
    {
      label: '오늘 등원',
      value: String(summary.stats.attendance.present),
      total: String(summary.stats.attendance.total),
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      link: '/children',
    },
    {
      label: '미확정 일지',
      value: String(summary.stats.meetings.pending),
      total: null,
      icon: FileText,
      color: 'text-rose-600',
      bg: 'bg-rose-100',
      link: '/meetings',
    },
    {
      label: '진행 프로그램',
      value: String(summary.stats.programs.inProgress),
      total: null,
      icon: TrendingUp,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      link: '/programs',
    },
    {
      label: '주간 일정',
      value: String(summary.stats.calendar.weeklyCount),
      total: null,
      icon: Calendar,
      color: 'text-violet-600',
      bg: 'bg-violet-100',
      link: '/calendar',
    },
  ], [summary]);

  return (
    <div className="space-y-5 font-['Outfit'] md:space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#0f172a_0%,#172554_42%,#2563eb_100%)] p-5 text-white shadow-[0_28px_80px_rgba(37,99,235,0.18)] md:rounded-[2.4rem] md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-blue-100">
              <Sparkles className="h-3.5 w-3.5 text-amber-200" />
              Today Workspace
            </div>
            <h2 className="text-3xl font-black leading-[1.02] tracking-tight md:text-4xl">대시보드</h2>
            <p className="mt-2 text-sm font-medium text-white/72 md:text-base">{summary.todayLabel || '운영 현황을 서버 데이터 기준으로 불러오는 중입니다.'}</p>
          </div>
          <button className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/10 shadow-lg transition hover:bg-white/14">
            <Bell className="h-5 w-5 text-white" />
            <span className="absolute right-3 top-3 h-2 w-2 rounded-full border-2 border-[#132a5c] bg-rose-400" />
          </button>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {stats.map((stat, idx) => (
            <Link to={stat.link} key={stat.label}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="rounded-[1.6rem] border border-white/14 bg-white/10 p-4 shadow-[0_20px_40px_rgba(15,23,42,0.14)] backdrop-blur-md transition hover:bg-white/14 md:p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className={`rounded-2xl p-2.5 ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/54">{stat.label}</p>
                </div>
                <div className="flex items-end gap-1.5">
                  <h4 className="text-3xl font-black text-white">{stat.value}</h4>
                  {stat.total && <span className="pb-1 text-sm font-bold text-white/45">/ {stat.total}</span>}
                </div>
                {stat.total && Number(stat.total) > 0 && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/14">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(Number(stat.value) / Number(stat.total)) * 100}%` }}
                      className="h-full rounded-full bg-white"
                    />
                  </div>
                )}
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-5">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(148,163,184,0.14)] md:p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
                  <Clock className="h-5 w-5 text-blue-500" />
                  오늘의 실시간 출결
                </h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Realtime attendance stream</p>
              </div>
              <div className="flex gap-1.5 text-[9px] font-black uppercase tracking-[0.18em]">
                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-emerald-600">{summary.stats.attendance.present} Present</span>
                <span className="rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-rose-600">{summary.stats.attendance.absent} Absent</span>
              </div>
            </div>

            <div className="space-y-3">
              {summary.attendanceList.length > 0 ? summary.attendanceList.map((child) => {
                const tone = toneMap[child.tone] || toneMap.present;
                const StatusIcon = tone.icon;
                return (
                  <div key={`${child.name}-${child.time}`} className="flex items-center justify-between gap-3 rounded-[1.35rem] border border-slate-100 bg-slate-50/80 p-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-base font-black text-slate-400">
                        {child.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">{child.name}</p>
                        <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{child.school}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{child.time}</span>
                      <div className={`rounded-full px-3 py-1 text-[11px] font-black ${tone.color} ${tone.bg} flex items-center gap-1.5`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {child.status}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-slate-50/60 p-5 text-sm font-bold text-slate-400">
                  오늘 기록된 출결 데이터가 아직 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(148,163,184,0.1)]">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-500">Action Queue</p>
              <h4 className="mt-3 text-xl font-black tracking-tight text-slate-900">오늘 처리할 항목 {summary.actionItems.length}건</h4>
              <div className="mt-5 space-y-3">
                {(summary.actionItems.length > 0 ? summary.actionItems : ['오늘 처리할 대기 항목이 없습니다.']).map((item) => (
                  <div key={item} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#4f46e5_0%,#2563eb_100%)] p-5 text-white shadow-[0_22px_50px_rgba(79,70,229,0.22)]">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/12 blur-2xl" />
              <p className="relative z-10 text-[10px] font-black uppercase tracking-[0.3em] text-blue-100">Document Engine</p>
              <h4 className="relative z-10 mt-3 text-2xl font-black tracking-tight">운영일지 현황</h4>
              <p className="relative z-10 mt-2 text-sm leading-6 text-white/78">서버가 미확정 문서, 출결, 프로그램, 주간 일정을 한 번에 요약해 대시보드를 더 빠르게 로드합니다.</p>
              <Link to="/meetings" className="relative z-10 mt-8 flex w-full items-center justify-center gap-2 rounded-[1.3rem] bg-white py-3 text-sm font-black text-blue-600 shadow-xl">
                운영일지 열기
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(148,163,184,0.1)]">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Weekly Snapshot</p>
            <div className="mt-5 space-y-4">
              {summary.weeklySnapshot.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-[1.2rem] border border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="text-sm font-black text-slate-700">{item.label}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${snapshotToneMap[item.tone] || snapshotToneMap.blue}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(148,163,184,0.1)]">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Notice Pulse</p>
              <Bell className="h-4 w-4 text-slate-300" />
            </div>
            <div className="mt-5 space-y-3">
              {summary.noticeItems.map((notice) => (
                <div key={notice} className="rounded-[1.2rem] border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                  {notice}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

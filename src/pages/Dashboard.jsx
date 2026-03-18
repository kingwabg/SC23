import React, { useState } from 'react';
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
  Menu,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const stats = [
    { label: '오늘 등원', value: '8', total: '10', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100', link: '/children' },
    { label: '미작성 일지', value: '2', total: null, icon: FileText, color: 'text-rose-600', bg: 'bg-rose-100', link: '/stats' },
    { label: '진행 프로그램', value: '3', total: null, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-100', link: '/programs' },
    { label: '주간 일정', value: '12', total: null, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100', link: '/stats' },
  ];

  return (
    <div className="font-['Outfit'] space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">대시보드</h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium italic">2026년 3월 16일 (월)</p>
        </div>
        <button className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative">
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <Link to={stat.link} key={stat.label}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="p-4 rounded-[1.5rem] bg-white border border-slate-200 shadow-lg shadow-slate-200/30 hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer h-full"
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              </div>
              <div className="flex items-baseline gap-1.5">
                <h4 className="text-3xl font-black text-slate-900">{stat.value}</h4>
                {stat.total && (
                  <span className="text-sm font-bold text-slate-300">/ {stat.total}</span>
                )}
              </div>
              {stat.total && (
                <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(parseInt(stat.value) / parseInt(stat.total)) * 100}%` }}
                    className={`h-full ${stat.color.replace('text', 'bg')} rounded-full shadow-inner`}
                  />
                </div>
              )}
            </motion.div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Counter Widget */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-[1.5rem] bg-white border border-slate-200 shadow-xl shadow-slate-200/30">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                오늘의 실시간 출결 현황
              </h3>
              <div className="flex gap-1.5 text-[9px]">
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 font-black rounded-full border border-emerald-100">8 PRESENT</span>
                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 font-black rounded-full border border-rose-100">2 ABSENT</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {[
                { name: '이준엽', school: '숲속초 4', time: '14:02', status: '등원완료', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { name: '최나래', school: '나눔초 2', time: '14:15', status: '등원완료', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
              ].map((child) => (
                <div key={child.name} className="flex items-center justify-between p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-base text-slate-400 border border-slate-200">
                      {child.name[0]}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm">{child.name}</p>
                      <p className="text-[10px] font-bold text-slate-400">{child.school}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${child.color} ${child.bg}`}>
                    <child.icon className="w-3.5 h-3.5" />
                    {child.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <div className="p-6 rounded-[1.5rem] bg-gradient-to-tr from-indigo-500 to-blue-600 text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
            <h3 className="text-xl font-black mb-3 relative z-10">HWP 운영일지</h3>
            <p className="text-xs text-white/80 mb-6 font-medium relative z-10">실시간 데이터 기반 보고서</p>
            <button className="w-full py-3 bg-white text-blue-600 rounded-xl font-black flex items-center justify-center gap-2 shadow-xl relative z-10 text-sm">
              보고서 생성
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

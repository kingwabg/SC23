import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Download, 
  Calendar as CalendarIcon, 
  FileSpreadsheet, 
  ArrowLeft,
  PieChart,
  Users,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  BookOpen,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const StatsPage = () => {
  const [selectedYear, setSelectedYear] = useState(2026);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 p-8 font-['Outfit'] space-y-10">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-xl transition-all group">
              <ArrowLeft className="w-6 h-6 text-slate-400 group-hover:text-indigo-600" />
            </Link>
            <div>
               <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic m-0">운영일지 및 현황 <span className="text-[10px] not-italic bg-emerald-500 text-white px-4 py-1.5 rounded-full uppercase tracking-[0.2em] font-black shadow-lg">Daily Log</span></h2>
               <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2 m-0 ml-1">오늘의 아동·종사자 현황 및 프로그램 이행 기록</p>
            </div>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2 shadow-inner border border-slate-100 inline-block">
             {[2024, 2025, 2026].map(y => (
               <button key={y} onClick={() => setSelectedYear(y)} className={`px-6 py-2 rounded-xl text-[11px] font-black transition-all ${selectedYear === y ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                 {y} YEAR
               </button>
             ))}
          </div>
        </div>
        
        <div className="flex gap-4">
          <button className="flex items-center gap-3 px-8 py-5 bg-white border border-slate-200 rounded-[2rem] font-black shadow-lg hover:shadow-2xl transition-all uppercase tracking-widest text-xs">
            <CalendarIcon className="w-5 h-5 text-indigo-500" />
            2026년 3월 23일 (월)
          </button>
          <button className="flex items-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black shadow-2xl hover:bg-black transition-all uppercase tracking-[0.2em] text-xs">
            <Download className="w-5 h-5 text-emerald-400" />
            운역일지 HWP/Excel 출력
          </button>
        </div>
      </div>

      {/* Today's Live Status (현황) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] text-white shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
               <Users className="w-8 h-8 opacity-50" />
               <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">Children Status</span>
            </div>
            <div>
               <p className="text-3xl font-black">아동 등원: 8 / 10명</p>
               <p className="text-xs font-bold text-blue-100/70 mt-1">상태: 정상 (결석 2명 사유 확인됨)</p>
            </div>
         </div>
         <div className="p-8 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2.5rem] text-white shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
               <Activity className="w-8 h-8 opacity-50" />
               <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Staff Status</span>
            </div>
            <div>
               <p className="text-3xl font-black">종사자 출근: 3 / 3명</p>
               <p className="text-xs font-bold text-emerald-100/70 mt-1">상태: 100% 출근 완료</p>
            </div>
         </div>
         <div className="p-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2.5rem] text-white shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
               <ClipboardList className="w-8 h-8 opacity-50" />
               <span className="text-[10px] font-black uppercase tracking-widest text-amber-100">Program Status</span>
            </div>
            <div>
               <p className="text-3xl font-black">프로그램: 2 / 3건</p>
               <p className="text-xs font-bold text-amber-100/70 mt-1">오전 1건 완료, 오후 1건 진행 예정</p>
            </div>
         </div>
      </div>

      {/* Hero Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[
          { label: '평균 출석률', value: '94.2%', color: 'bg-blue-500', icon: BarChart3, trend: '+2.1%' },
          { label: '아동 관찰일지', value: '88/96', color: 'bg-emerald-500', icon: BookOpen, sub: '이번 달 작성 완료' },
          { label: '자치회의 계획', value: '1/4분기', color: 'bg-indigo-600', icon: Users, sub: '분기별 프로세스 이행' },
          { label: '상담 이행률', value: '92.5%', color: 'bg-amber-500', icon: CheckCircle2, sub: '상반기 필수 상담 완료' },
        ].map((stat, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="p-10 bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl relative overflow-hidden group">
             <div className={`absolute top-0 right-0 w-32 h-32 ${stat.color} opacity-5 rounded-full blur-3xl -translate-y-12 translate-x-12 group-hover:opacity-10 transition-all`} />
             <div className="flex items-center gap-4 mb-8">
                <div className={`p-4 ${stat.color} rounded-2xl text-white shadow-xl`}>
                   <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <h4 className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</h4>
                </div>
             </div>
             {stat.trend ? (
                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /><span className="text-[11px] font-black text-emerald-600 uppercase">전월 대비 {stat.trend} 상승</span></div>
             ) : (
                <p className="text-[11px] font-bold text-slate-400 m-0 italic-none opacity-60">{stat.sub}</p>
             )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Compliance Progress Table */}
        <div className="col-span-12 lg:col-span-8 p-12 bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl space-y-12">
           <div className="flex justify-between items-center border-b border-slate-50 pb-8">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-indigo-900 rounded-2xl flex items-center justify-center text-white"><ClipboardList className="w-6 h-6" /></div>
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter m-0 uppercase italic">Institutional Log Compliance</h3>
                    <p className="text-[10px] font-bold text-slate-400 m-0 uppercase tracking-widest mt-1">행정 기록물 필수 작성 항목별 {selectedYear}년 이행률 현황</p>
                 </div>
              </div>
              <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-5 py-2.5 rounded-xl border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all">상세 일련번호 대조</button>
           </div>

           <div className="space-y-10">
              {[
                { label: '아동 관찰일지 (Monthly)', target: '96건 (12개월x8명)', current: 88, color: 'bg-emerald-500' },
                { label: '상반기 상담일지 (1H)', target: '8건 (재원 8명)', current: 8, color: 'bg-indigo-600' },
                { label: '하반기 상담일지 (2H)', target: '8건 (재원 8명)', current: 0, color: 'bg-slate-200' },
                { label: '보호자 상담일지', target: '최소 분기별 1회 권장', current: 24, color: 'bg-blue-500' },
                { label: '아동 자치회의 (Quarterly)', target: '4회 (년 4회 계획/일지/평가)', current: 1, color: 'bg-amber-500' },
                { label: '종사자 회의록 (Monthly)', target: '12회 (월 1회 정기회의)', current: 3, color: 'bg-slate-900' },
              ].map((item, idx) => (
                <div key={idx} className="space-y-4 group">
                  <div className="flex justify-between items-end">
                     <div>
                        <h5 className="text-[13px] font-black text-slate-800 m-0 flex items-center gap-3">
                           {item.label}
                           {item.current > 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
                        </h5>
                        <p className="text-[10px] font-bold text-slate-400 m-0 mt-1 uppercase tracking-widest opacity-60">TARGET: {item.target}</p>
                     </div>
                     <div className="text-right">
                        <span className="text-[15px] font-black text-slate-900">{item.current}</span>
                        <span className="text-[10px] font-bold text-slate-400 ml-1">LOGS</span>
                     </div>
                  </div>
                  <div className="h-4 bg-slate-50 rounded-full border border-slate-100 shadow-inner overflow-hidden relative">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(item.current / 12) * 100}%` }} className={`h-full ${item.color} rounded-full shadow-lg shadow-indigo-100 relative z-10`} />
                    <div className="absolute inset-0 flex justify-between px-1">
                       {[...Array(12)].map((_, i) => <div key={i} className="w-px h-full bg-slate-100/50" />)}
                    </div>
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* Action Alerts & Summary */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
           <div className="p-12 bg-slate-900 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] -translate-y-32 translate-x-32" />
              <div className="flex items-center gap-4 mb-10 relative z-10">
                 <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-amber-400 border border-white/5"><AlertCircle className="w-7 h-7" /></div>
                 <div>
                    <h3 className="text-xl font-black m-0 tracking-tight uppercase">Critical Alerts</h3>
                    <p className="text-[10px] font-bold text-slate-500 m-0 uppercase tracking-widest mt-1">필수 행정 기록 누락 주의보</p>
                 </div>
              </div>
              <div className="space-y-4 relative z-10">
                 <div className="p-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer group/item">
                    <div className="flex justify-between items-center mb-3">
                       <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest m-0">Missing Documentation</p>
                       <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover/item:text-white transition-all" />
                    </div>
                    <p className="text-base font-bold m-0 leading-tight">아동 자치회의 1분기 평가서 대기</p>
                 </div>
                 <div className="p-6 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer group/item">
                    <div className="flex justify-between items-center mb-3">
                       <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest m-0">Compliance Warning</p>
                       <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover/item:text-white transition-all" />
                    </div>
                    <p className="text-base font-bold m-0 leading-tight">3월 관찰일지 미작성 아동 (3명)</p>
                 </div>
                 <button className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-base hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 mt-6 flex items-center justify-center gap-3">
                   <TrendingUp className="w-5 h-5" /> 3월 업무 요약본(PDF) 생성
                 </button>
              </div>
           </div>

           <div className="p-12 bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl space-y-10 group overflow-hidden">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                 <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><Activity className="w-6 h-6" /></div>
                 <h4 className="text-lg font-black text-slate-900 m-0 uppercase tracking-tighter italic">Live Record Pulse</h4>
              </div>
              <div className="space-y-6">
                 {[
                   { label: '최근 작성 회의록', value: '2분 전', icon: MessageSquare, sub: '이팀장 - 주간회의' },
                   { label: '데이터 동기화 상태', value: '정상', icon: Activity, sub: 'Local DB <-> Archive' },
                   { label: '스토리지 사용량', value: '2.4 GB', icon: PieChart, sub: '총 500개 기록물 저장' },
                 ].map((act, i) => (
                    <div key={i} className="flex items-start gap-4">
                       <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 animate-ping" />
                       <div>
                          <p className="text-sm font-black text-slate-800 m-0">{act.label}: <span className="text-indigo-600 font-black">{act.value}</span></p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-60">{act.sub}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;

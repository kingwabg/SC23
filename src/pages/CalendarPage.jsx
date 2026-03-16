import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  ExternalLink, 
  Settings, 
  RefreshCcw, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Monitor,
  Zap,
  X,
  Info,
  CalendarDays
} from 'lucide-react';

const CalendarPage = () => {
  // Role & Permissions
  const userRole = localStorage.getItem('userRole') || 'ADMIN';
  const permissions = useMemo(() => {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser && userRole === 'NON_STAFF') {
      return { 'NON_STAFF': JSON.parse(currentUser).permissions };
    }
    const saved = localStorage.getItem('appPermissions');
    return saved ? JSON.parse(saved) : { 'NON_STAFF': { calendar_google: true, calendar_local: true, calendar_sync: false } };
  }, [userRole]);

  const [activeTab, setActiveTab] = useState(() => {
    if (userRole === 'ADMIN') return 'google';
    const perms = permissions.NON_STAFF || {};
    if (perms.calendar_google) return 'google';
    if (perms.calendar_local) return 'local';
    return 'google';
  });

  const tabs = [
    { id: 'google', label: '구글 캘린더', icon: ExternalLink, key: 'calendar_google' },
    { id: 'local', label: '기관 일정 관리', icon: Layers, key: 'calendar_local' }
  ].filter(t => {
    if (userRole === 'ADMIN') return true;
    return permissions.NON_STAFF[t.key];
  });

  const [calendarUrl, setCalendarUrl] = useState("https://calendar.google.com/calendar/embed?src=ko.south_korea%23holiday%40group.v.calendar.google.com&ctz=Asia%2FSeoul");
  const [isUrlEditOpen, setIsUrlEditOpen] = useState(false);
  const [tempUrl, setTempUrl] = useState(calendarUrl);

  const [currentDate, setCurrentDate] = useState(new Date());

  // ... (previous events sample and logic)
  const events = [
    { id: 1, title: '전체 운영회의', time: '10:00 - 11:30', date: '2026-03-20', type: 'meeting', color: 'bg-blue-500' },
    { id: 2, title: '생일 파티 (이준엽)', time: '14:00 - 15:00', date: '2026-03-22', type: 'event', color: 'bg-rose-500' },
    { id: 3, title: '현장 학습 (박물관)', time: '09:00 - 16:00', date: '2026-03-25', type: 'program', color: 'bg-emerald-500' },
  ];

  const handleUpdateUrl = () => {
    let finalUrl = tempUrl;
    if (tempUrl.includes('<iframe')) {
      const match = tempUrl.match(/src="([^"]+)"/);
      if (match && match[1]) finalUrl = match[1];
    }
    setCalendarUrl(finalUrl);
    setIsUrlEditOpen(false);
  };

  // Local Calendar Logic
  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, isCurrentMonth: false, fullDate: `${year}-${month}-${prevMonthLastDay - i}` });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true, fullDate: `${year}-${month + 1}-${i}` });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false, fullDate: `${year}-${month + 2}-${i}` });
    }
    return days;
  }, [currentDate]);

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(newDate);
  };

  return (
    <div className="font-['Outfit'] space-y-6 max-w-[1600px] mx-auto p-4 md:p-6 lg:p-4">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 gap-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                <CalendarDays className="w-6 h-6 text-indigo-400" />
             </div>
             <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic m-0">Calendar Engine</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 m-0">Institutional schedule & Google integration</p>
             </div>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 py-2 px-5 rounded-lg text-[10px] font-black transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 text-slate-700 font-bold text-[10px] transition-all">
             <RefreshCcw className="w-4 h-4 text-indigo-500" /> 새로고침
           </button>
           {(userRole === 'ADMIN' || permissions.NON_STAFF.calendar_sync) && (
             <button onClick={() => setIsUrlEditOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl shadow-xl hover:bg-black font-black text-[10px] transition-all uppercase tracking-widest">
               <Settings className="w-4 h-4 text-indigo-400" /> 연동 설정
             </button>
           )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
          {activeTab === 'google' ? (
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-3 h-[850px] flex flex-col relative overflow-hidden">
               <div className="p-8 flex justify-between items-center border-b border-slate-50">
                  <div className="flex items-center gap-5">
                     <div className="w-12 h-12 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="w-full h-full object-contain" alt="Google Calendar" />
                     </div>
                     <div>
                        <h4 className="text-lg font-black text-slate-900 m-0 uppercase tracking-widest leading-none">Google Live Feed</h4>
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest m-0 mt-2 flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" /> SECURE TUNNEL ACTIVE</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Real-time Sync</div>
                  </div>
               </div>
               <div className="flex-1 bg-slate-50/50 p-6 rounded-[2.5rem]">
                  <iframe 
                     src={calendarUrl} 
                     style={{ border: 0, width: '100%', height: '100%' }} 
                     frameBorder="0" 
                     scrolling="no"
                     className="rounded-[2rem] shadow-2xl"
                  ></iframe>
               </div>

               {isUrlEditOpen && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-10">
                     <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="max-w-2xl w-full bg-white rounded-[3.5rem] p-16 space-y-10 shadow-2xl relative">
                        <button onClick={() => setIsUrlEditOpen(false)} className="absolute top-10 right-10 p-4 hover:bg-slate-100 rounded-full transition-all"><X className="w-7 h-7 text-slate-400" /></button>
                        <div className="space-y-4 text-center">
                           <h3 className="text-4xl font-black text-slate-900 tracking-tighter">구글 캘린더 연동</h3>
                           <p className="text-sm text-slate-500 font-bold max-w-sm mx-auto">본인의 구글 캘린더 [설정]에서 '공개 주소'를 복사하여 아래에 입력하세요.</p>
                        </div>
                        <div className="bg-indigo-50/50 p-8 rounded-[2rem] border border-indigo-100 space-y-4">
                           <div className="flex items-center gap-3 text-indigo-600 font-black text-xs uppercase tracking-widest"><Info className="w-5 h-5"/> Guide</div>
                           <p className="text-xs text-slate-600 font-black leading-relaxed">구글 캘린더 설정 → 내 캘린더 설정 → 캘린더 통합 → <strong>'이 캘린더의 공개 주소'</strong>를 복사하세요.</p>
                        </div>
                        <textarea value={tempUrl} onChange={(e) => setTempUrl(e.target.value)} placeholder="https://calendar.google.com/calendar/embed?src=..." className="w-full h-32 p-8 bg-slate-50 rounded-[2rem] border-none outline-none font-bold text-slate-700 shadow-inner focus:ring-4 focus:ring-indigo-500/20 resize-none text-sm" />
                        <div className="flex gap-4">
                           <button onClick={() => setIsUrlEditOpen(false)} className="flex-1 py-6 bg-slate-100 text-slate-400 rounded-3xl font-black uppercase tracking-widest text-xs">취소</button>
                           <button onClick={handleUpdateUrl} className="flex-1 py-6 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-indigo-500/40">저장 및 동기화</button>
                        </div>
                     </motion.div>
                  </motion.div>
               )}
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-8">
               <div className="col-span-12 lg:col-span-4 space-y-8">
                  <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl space-y-8">
                     <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em]">Upcoming Events</h4>
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black">{events.length} Items</span>
                     </div>
                     <div className="space-y-4">
                        {events.map((e) => (
                          <div key={e.id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:border-indigo-200 hover:bg-white hover:shadow-xl transition-all cursor-pointer">
                             <div className="flex items-start gap-5">
                                <div className={`w-3 h-12 ${e.color} rounded-full mt-1 shrink-0 shadow-sm`} />
                                <div className="space-y-1.5">
                                   <h5 className="text-[15px] font-black text-slate-800">{e.title}</h5>
                                   <div className="flex flex-col gap-1">
                                      <p className="text-[11px] text-slate-400 font-bold flex items-center gap-2"><CalendarIcon className="w-3.5 h-3.5" /> {e.date}</p>
                                      <p className="text-[11px] text-slate-400 font-bold flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {e.time}</p>
                                   </div>
                                </div>
                             </div>
                          </div>
                        ))}
                     </div>
                     <button className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3"><Plus className="w-4 h-4" /> Add New Event</button>
                  </div>
                  
                  <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] group-hover:bg-indigo-500/30 transition-all duration-700" />
                     <h5 className="text-xs font-black uppercase tracking-[0.5em] mb-6 text-indigo-300">Intelligent Assistant</h5>
                     <p className="text-sm font-bold text-indigo-100 leading-relaxed mb-8 italic opacity-80">
                        "기관의 내부 행사와 구글 개인 일정을 한눈에 관리하고 싶다면 연동 모드를 활성화하세요."
                     </p>
                     <button className="w-full py-5 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] transition-all border border-white/10 backdrop-blur-sm">System Insights</button>
                  </div>
               </div>

               <div className="col-span-12 lg:col-span-8 bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl p-10 space-y-10">
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-8">
                        <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none italic uppercase">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                        <div className="flex bg-slate-100 p-1.5 rounded-[1.25rem] gap-1 shadow-inner">
                           <button onClick={() => changeMonth(-1)} className="w-11 h-11 flex items-center justify-center bg-white rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-all"><ChevronLeft className="w-5 h-5" /></button>
                           <button onClick={() => changeMonth(1)} className="w-11 h-11 flex items-center justify-center bg-white rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-all"><ChevronRight className="w-5 h-5" /></button>
                        </div>
                     </div>
                     <div className="flex bg-slate-100 p-1.5 rounded-[1.25rem] gap-1 font-black text-[10px] uppercase shadow-inner">
                        <button className="px-6 py-2.5 bg-white text-indigo-600 rounded-xl shadow-sm tracking-widest">Month</button>
                        <button className="px-6 py-2.5 text-slate-400 tracking-widest opacity-50 cursor-not-allowed">Week</button>
                        <button className="px-6 py-2.5 text-slate-400 tracking-widest opacity-50 cursor-not-allowed">Day</button>
                     </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                     {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                       <div key={d} className={`py-4 text-center text-[10px] font-black uppercase tracking-widest ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'}`}>{d}</div>
                     ))}
                     {monthData.map((dayObj, i) => {
                       const event = events.find(e => {
                         const d = new Date(e.date);
                         return d.getDate() === dayObj.day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear() && dayObj.isCurrentMonth;
                       });
                       
                       return (
                         <div key={i} className={`bg-white min-h-[140px] p-4 rounded-[1.5rem] border-2 border-slate-50 relative group transition-all hover:border-indigo-100 hover:bg-slate-50/50 ${!dayObj.isCurrentMonth ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
                            <span className={`text-sm font-black ${i % 7 === 0 ? 'text-red-400' : i % 7 === 6 ? 'text-blue-400' : 'text-slate-400'} group-hover:scale-110 transition-transform inline-block`}>{dayObj.day}</span>
                            {event && (
                              <div className={`mt-3 p-2.5 ${event.color} rounded-xl text-[9px] font-black text-white truncate shadow-lg shadow-indigo-200 hover:scale-105 transition-transform cursor-pointer`}>
                                 {event.title}
                              </div>
                            )}
                            <button className="absolute bottom-4 right-4 w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-slate-400 hover:bg-slate-900 hover:text-white shadow-lg">
                               <Plus className="w-4 h-4" />
                            </button>
                         </div>
                       );
                     })}
                  </div>
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CalendarPage;

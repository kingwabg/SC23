import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  ExternalLink,
  Settings,
  RefreshCcw,
  Plus,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Layers,
  X,
  Info,
  CalendarDays,
  Sparkles,
  Trash2,
  Save,
} from 'lucide-react';
import { authApi } from '../utils/apiClient';

const FALLBACK_CALENDAR_URL = 'https://calendar.google.com/calendar/embed?src=ko.south_korea%23holiday%40group.v.calendar.google.com&ctz=Asia%2FSeoul';
const FALLBACK_EVENTS = [
  { id: 1, title: '전체 운영회의', time: '10:00 - 11:30', date: '2026-03-20', type: 'meeting', color: 'bg-blue-500' },
  { id: 2, title: '생일 파티 (이준엽)', time: '14:00 - 15:00', date: '2026-03-22', type: 'event', color: 'bg-rose-500' },
  { id: 3, title: '현장 학습 (박물관)', time: '09:00 - 16:00', date: '2026-03-25', type: 'program', color: 'bg-emerald-500' },
];
const EVENT_COLORS = ['bg-blue-500', 'bg-rose-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500'];

const cloneData = (value) => JSON.parse(JSON.stringify(value));

const loadLegacyCalendar = () => {
  try {
    const raw = localStorage.getItem('forestCalendarState');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : null;
  } catch {
    return null;
  }
};

const normalizeFullDate = (year, monthIndex, day) => {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const CalendarPage = () => {
  const userRole = localStorage.getItem('userRole') || 'ADMIN';
  const permissions = useMemo(() => {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser && userRole === 'NON_STAFF') {
      return { NON_STAFF: JSON.parse(currentUser).permissions };
    }
    const saved = localStorage.getItem('appPermissions');
    return saved ? JSON.parse(saved) : { NON_STAFF: { calendar_google: true, calendar_local: true, calendar_sync: false } };
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
    { id: 'local', label: '기관 일정 관리', icon: Layers, key: 'calendar_local' },
  ].filter((tab) => {
    if (userRole === 'ADMIN') return true;
    return permissions.NON_STAFF[tab.key];
  });

  const legacyCalendar = loadLegacyCalendar();
  const [calendarUrl, setCalendarUrl] = useState(legacyCalendar?.calendarUrl || FALLBACK_CALENDAR_URL);
  const [tempUrl, setTempUrl] = useState(legacyCalendar?.calendarUrl || FALLBACK_CALENDAR_URL);
  const [events, setEvents] = useState(() => cloneData(legacyCalendar?.events || FALLBACK_EVENTS));
  const [isUrlEditOpen, setIsUrlEditOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarSyncReady, setCalendarSyncReady] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  useEffect(() => {
    const hydrateCalendar = async () => {
      const legacy = loadLegacyCalendar();
      try {
        const data = await authApi('/api/calendar');
        const serverEvents = Array.isArray(data.events) ? data.events : [];
        const serverUrl = data.calendarUrl || '';

        if (serverEvents.length > 0 || serverUrl) {
          setCalendarUrl(serverUrl || FALLBACK_CALENDAR_URL);
          setTempUrl(serverUrl || FALLBACK_CALENDAR_URL);
          setEvents(cloneData(serverEvents.length > 0 ? serverEvents : FALLBACK_EVENTS));
        } else {
          const seedUrl = legacy?.calendarUrl || FALLBACK_CALENDAR_URL;
          const seedEvents = cloneData(legacy?.events || FALLBACK_EVENTS);
          setCalendarUrl(seedUrl);
          setTempUrl(seedUrl);
          setEvents(seedEvents);
          await authApi('/api/calendar/settings', {
            method: 'PUT',
            body: JSON.stringify({ calendarUrl: seedUrl }),
          });
          await authApi('/api/calendar/events/bulk', {
            method: 'PUT',
            body: JSON.stringify({ events: seedEvents }),
          });
        }
      } catch {
        setCalendarUrl(legacy?.calendarUrl || FALLBACK_CALENDAR_URL);
        setTempUrl(legacy?.calendarUrl || FALLBACK_CALENDAR_URL);
        setEvents(cloneData(legacy?.events || FALLBACK_EVENTS));
      } finally {
        setCalendarSyncReady(true);
      }
    };

    hydrateCalendar();
  }, []);

  useEffect(() => {
    localStorage.setItem('forestCalendarState', JSON.stringify({ calendarUrl, events }));
  }, [calendarUrl, events]);

  useEffect(() => {
    if (!calendarSyncReady) return;
    const timeoutId = setTimeout(() => {
      authApi('/api/calendar/events/bulk', {
        method: 'PUT',
        body: JSON.stringify({ events }),
      }).catch(() => {});
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [events, calendarSyncReady]);

  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = firstDay - 1; i >= 0; i -= 1) {
      const day = prevMonthLastDay - i;
      days.push({ day, isCurrentMonth: false, fullDate: normalizeFullDate(year, month - 1, day) });
    }
    for (let i = 1; i <= daysInMonth; i += 1) {
      days.push({ day: i, isCurrentMonth: true, fullDate: normalizeFullDate(year, month, i) });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i += 1) {
      days.push({ day: i, isCurrentMonth: false, fullDate: normalizeFullDate(year, month + 1, i) });
    }
    return days;
  }, [currentDate]);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    [events],
  );

  const currentMonthEvents = sortedEvents.filter((event) => {
    const date = new Date(event.date);
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
  });

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(newDate);
  };

  const handleRefreshCalendar = async () => {
    try {
      const data = await authApi('/api/calendar');
      setCalendarUrl(data.calendarUrl || FALLBACK_CALENDAR_URL);
      setTempUrl(data.calendarUrl || FALLBACK_CALENDAR_URL);
      setEvents(cloneData(Array.isArray(data.events) && data.events.length > 0 ? data.events : FALLBACK_EVENTS));
    } catch {
      alert('캘린더 데이터를 새로고침하지 못했습니다.');
    }
  };

  const handleUpdateUrl = async () => {
    let finalUrl = tempUrl;
    if (tempUrl.includes('<iframe')) {
      const match = tempUrl.match(/src="([^"]+)"/);
      if (match && match[1]) finalUrl = match[1];
    }

    try {
      await authApi('/api/calendar/settings', {
        method: 'PUT',
        body: JSON.stringify({ calendarUrl: finalUrl }),
      });
      setCalendarUrl(finalUrl);
      setTempUrl(finalUrl);
      setIsUrlEditOpen(false);
    } catch {
      alert('구글 캘린더 연동 주소 저장에 실패했습니다.');
    }
  };

  const openNewEventModal = (date = new Date().toISOString().split('T')[0]) => {
    const nextId = Math.max(0, ...events.map((event) => Number(event.id) || 0)) + 1;
    setSelectedEvent({
      id: nextId,
      title: '',
      date,
      time: '09:00 - 10:00',
      type: 'event',
      color: EVENT_COLORS[nextId % EVENT_COLORS.length],
    });
    setIsEventModalOpen(true);
  };

  const openEventModal = (event) => {
    setSelectedEvent(cloneData(event));
    setIsEventModalOpen(true);
  };

  const closeEventModal = () => {
    setSelectedEvent(null);
    setIsEventModalOpen(false);
  };

  const updateSelectedEventField = (field, value) => {
    setSelectedEvent((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSaveEvent = async () => {
    if (!selectedEvent?.title || !selectedEvent?.date) {
      alert('일정명과 날짜를 입력해주세요.');
      return;
    }

    setIsSavingEvent(true);
    try {
      const exists = events.some((event) => String(event.id) === String(selectedEvent.id));
      if (exists) {
        await authApi(`/api/calendar/events/${selectedEvent.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ updates: selectedEvent }),
        });
        setEvents((prev) => prev.map((event) => (
          String(event.id) === String(selectedEvent.id) ? selectedEvent : event
        )));
      } else {
        await authApi('/api/calendar/events', {
          method: 'POST',
          body: JSON.stringify({ event: selectedEvent }),
        });
        setEvents((prev) => [selectedEvent, ...prev]);
      }
      closeEventModal();
    } catch {
      alert('일정 저장에 실패했습니다.');
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || !window.confirm('이 일정을 삭제하시겠습니까?')) return;
    try {
      await authApi(`/api/calendar/events/${selectedEvent.id}`, {
        method: 'DELETE',
      });
      setEvents((prev) => prev.filter((event) => String(event.id) !== String(selectedEvent.id)));
      closeEventModal();
    } catch {
      alert('일정 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-4 font-['Outfit'] md:space-y-6 md:p-6 lg:p-4">
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#0f172a_0%,#172554_45%,#2563eb_100%)] p-5 text-white shadow-[0_28px_80px_rgba(37,99,235,0.16)] md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 shadow-lg">
                <CalendarDays className="h-6 w-6 text-blue-100" />
              </div>
              <div>
                <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-blue-100">
                  <Sparkles className="h-3.5 w-3.5 text-amber-200" />
                  Mobile Calendar Shell
                </div>
                <h2 className="text-2xl font-black tracking-tighter">Calendar Engine</h2>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-100/72">Institutional schedule & Google integration</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 rounded-2xl bg-white/8 p-1.5 backdrop-blur-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[10px] font-black transition-all md:px-5 ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-md' : 'text-white/70 hover:text-white'}`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={handleRefreshCalendar} className="flex items-center gap-2 rounded-xl border border-white/16 bg-white/10 px-4 py-3 text-[10px] font-bold transition-all hover:bg-white/14">
              <RefreshCcw className="h-4 w-4 text-blue-100" />
              새로고침
            </button>
            {(userRole === 'ADMIN' || permissions.NON_STAFF.calendar_sync) && (
              <button onClick={() => setIsUrlEditOpen(true)} className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-600 shadow-xl">
                <Settings className="h-4 w-4" />
                연동 설정
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={{ duration: 0.3 }}>
          {activeTab === 'google' ? (
            <div className="relative rounded-[2.2rem] border border-slate-100 bg-white p-3 shadow-2xl">
              <div className="flex flex-col gap-4 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between md:p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="h-8 w-8 object-contain" alt="Google Calendar" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black uppercase tracking-widest text-slate-900">Google Live Feed</h4>
                    <p className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Secure tunnel active
                    </p>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white">Real-time Sync</div>
              </div>
              <div className="rounded-[1.8rem] bg-slate-50/60 p-3 md:p-5">
                <iframe
                  src={calendarUrl}
                  style={{ border: 0, width: '100%', height: '70vh' }}
                  frameBorder="0"
                  scrolling="no"
                  className="rounded-[1.6rem] bg-white shadow-xl md:h-[78vh]"
                  title="Google Calendar"
                />
              </div>

              {isUrlEditOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/95 p-5 backdrop-blur-xl">
                  <motion.div initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative w-full max-w-2xl space-y-6 rounded-[2rem] bg-white p-6 shadow-2xl md:p-10">
                    <button onClick={() => setIsUrlEditOpen(false)} className="absolute right-5 top-5 rounded-full p-3 transition-all hover:bg-slate-100">
                      <X className="h-5 w-5 text-slate-400" />
                    </button>
                    <div className="space-y-3 text-center">
                      <h3 className="text-3xl font-black tracking-tighter text-slate-900">구글 캘린더 연동</h3>
                      <p className="mx-auto max-w-sm text-sm font-bold text-slate-500">구글 캘린더 설정에서 공개 주소를 복사해 붙여 넣으면 됩니다.</p>
                    </div>
                    <div className="space-y-3 rounded-[1.6rem] border border-indigo-100 bg-indigo-50/60 p-5">
                      <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-indigo-600">
                        <Info className="h-5 w-5" />
                        Guide
                      </div>
                      <p className="text-xs font-black leading-relaxed text-slate-600">구글 캘린더 설정 → 내 캘린더 설정 → 캘린더 통합 → 공개 주소 복사</p>
                    </div>
                    <textarea value={tempUrl} onChange={(e) => setTempUrl(e.target.value)} placeholder="https://calendar.google.com/calendar/embed?src=..." className="h-32 w-full resize-none rounded-[1.6rem] bg-slate-50 p-5 text-sm font-bold text-slate-700 shadow-inner outline-none focus:ring-4 focus:ring-indigo-500/20" />
                    <div className="flex flex-col gap-3 md:flex-row">
                      <button onClick={() => setIsUrlEditOpen(false)} className="flex-1 rounded-2xl bg-slate-100 py-4 text-xs font-black uppercase tracking-widest text-slate-400">취소</button>
                      <button onClick={handleUpdateUrl} className="flex-1 rounded-2xl bg-indigo-600 py-4 text-xs font-black uppercase tracking-widest text-white shadow-2xl shadow-indigo-500/30">저장 및 동기화</button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:gap-6">
              <div className="space-y-5">
                <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-2xl md:p-6">
                  <div className="mb-5 flex items-center justify-between border-b border-slate-50 pb-4">
                    <h4 className="text-xs font-black uppercase tracking-[0.28em] text-slate-900">Upcoming Events</h4>
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black text-indigo-600">{sortedEvents.length} Items</span>
                  </div>
                  <div className="space-y-3">
                    {sortedEvents.map((event) => (
                      <button key={event.id} onClick={() => openEventModal(event)} className="w-full rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 text-left transition-all hover:border-indigo-200 hover:bg-white">
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 h-12 w-2 rounded-full ${event.color}`} />
                          <div className="space-y-1.5">
                            <h5 className="text-sm font-black text-slate-800 md:text-[15px]">{event.title}</h5>
                            <p className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                              <CalendarIcon className="h-3.5 w-3.5" />
                              {event.date}
                            </p>
                            <p className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                              <Clock className="h-3.5 w-3.5" />
                              {event.time}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => openNewEventModal()} className="mt-5 flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-slate-900 py-4 text-[11px] font-black uppercase tracking-[0.28em] text-white shadow-2xl">
                    <Plus className="h-4 w-4" />
                    Add New Event
                  </button>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-2xl md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4 md:gap-8">
                    <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 md:text-4xl">
                      {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="flex gap-1 rounded-[1.25rem] bg-slate-100 p-1.5 shadow-inner">
                      <button onClick={() => changeMonth(-1)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:bg-slate-50">
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button onClick={() => changeMonth(1)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:bg-slate-50">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-1 rounded-[1.25rem] bg-slate-100 p-1.5 text-[10px] font-black uppercase shadow-inner">
                    <button className="rounded-xl bg-white px-5 py-2.5 text-indigo-600 shadow-sm">Month</button>
                    <button className="cursor-not-allowed px-5 py-2.5 text-slate-400 opacity-50">Week</button>
                    <button className="cursor-not-allowed px-5 py-2.5 text-slate-400 opacity-50">Day</button>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.8rem] border border-slate-100 bg-slate-50 p-4 md:hidden">
                  <div className="space-y-3">
                    {currentMonthEvents.map((event) => (
                      <button key={`mobile-event-${event.id}`} onClick={() => openEventModal(event)} className="w-full rounded-[1.3rem] bg-white p-4 text-left shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-2 rounded-full ${event.color}`} />
                          <div>
                            <p className="text-sm font-black text-slate-800">{event.title}</p>
                            <p className="mt-1 text-[11px] font-bold text-slate-400">{event.date} · {event.time}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                    {currentMonthEvents.length === 0 && (
                      <div className="rounded-[1.3rem] bg-white p-4 text-sm font-bold text-slate-400">이번 달 일정이 없습니다.</div>
                    )}
                  </div>
                </div>

                <div className="mt-6 hidden grid-cols-7 gap-2 md:grid">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, index) => (
                    <div key={dayName} className={`py-4 text-center text-[10px] font-black uppercase tracking-widest ${index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-400' : 'text-slate-400'}`}>{dayName}</div>
                  ))}
                  {monthData.map((dayObj, index) => {
                    const event = events.find((item) => item.date === dayObj.fullDate && dayObj.isCurrentMonth);
                    return (
                      <div key={dayObj.fullDate} className={`relative min-h-[130px] rounded-[1.5rem] border-2 border-slate-50 bg-white p-4 transition-all hover:border-indigo-100 hover:bg-slate-50/50 ${!dayObj.isCurrentMonth ? 'pointer-events-none opacity-20 grayscale' : ''}`}>
                        <span className={`inline-block text-sm font-black ${index % 7 === 0 ? 'text-red-400' : index % 7 === 6 ? 'text-blue-400' : 'text-slate-400'}`}>{dayObj.day}</span>
                        {event && (
                          <button onClick={() => openEventModal(event)} className={`mt-3 block w-full truncate rounded-xl p-2.5 text-left text-[9px] font-black text-white shadow-lg ${event.color}`}>
                            {event.title}
                          </button>
                        )}
                        <button onClick={() => openNewEventModal(dayObj.fullDate)} className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 shadow-lg transition-all hover:bg-slate-900 hover:text-white">
                          <Plus className="h-4 w-4" />
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

      {isEventModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-500">Institution Event</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">기관 일정 편집</h3>
              </div>
              <button onClick={closeEventModal} className="rounded-full p-2 transition-all hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">일정명</span>
                <input value={selectedEvent.title || ''} onChange={(e) => updateSelectedEventField('title', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100" />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">날짜</span>
                <input type="date" value={selectedEvent.date || ''} onChange={(e) => updateSelectedEventField('date', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100" />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">시간</span>
                <input value={selectedEvent.time || ''} onChange={(e) => updateSelectedEventField('time', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100" />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">유형</span>
                <select value={selectedEvent.type || 'event'} onChange={(e) => updateSelectedEventField('type', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100">
                  <option value="event">event</option>
                  <option value="meeting">meeting</option>
                  <option value="program">program</option>
                  <option value="notice">notice</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">색상</span>
                <select value={selectedEvent.color || EVENT_COLORS[0]} onChange={(e) => updateSelectedEventField('color', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100">
                  {EVENT_COLORS.map((color) => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-between">
              <button onClick={handleDeleteEvent} className="flex items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-3 text-sm font-black text-rose-500 transition-all hover:bg-rose-100">
                <Trash2 className="h-4 w-4" />
                삭제
              </button>
              <div className="flex gap-3">
                <button onClick={closeEventModal} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-500 transition-all hover:bg-slate-50">취소</button>
                <button onClick={handleSaveEvent} disabled={isSavingEvent} className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition-all hover:bg-indigo-700 disabled:bg-indigo-300">
                  <Save className="h-4 w-4" />
                  {isSavingEvent ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;

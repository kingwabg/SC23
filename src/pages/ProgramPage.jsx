import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, MoreVertical, Calendar as CalendarIcon, Users, Eye, RotateCcw, Sparkles, Clock3 } from 'lucide-react';
import { authApi } from '../utils/apiClient';

const statusStyles = {
  실시완료: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  진행중: 'bg-blue-50 text-blue-600 border-blue-100',
  예정: 'bg-amber-50 text-amber-600 border-amber-100'
};

const cloneData = (value) => JSON.parse(JSON.stringify(value));

const FALLBACK_PROGRAMS = [
  { id: 1, title: '창의 미술 교실', category: '정서지원', date: '2026-03-16', displayDate: '2026.03.16', time: '14:00~15:30', tutor: '이영희', participants: 8, status: '실시완료' },
  { id: 2, title: '독서 토론 동아리', category: '교육지원', date: '2026-03-16', displayDate: '2026.03.16', time: '16:00~17:30', tutor: '김민수', participants: 10, status: '진행중' },
  { id: 3, title: '지역 탐방 프로젝트', category: '문화체험', date: '2026-03-18', displayDate: '2026.03.18', time: '13:00~17:00', tutor: '외부강사', participants: 12, status: '예정' }
];

const loadLegacyPrograms = () => {
  try {
    const saved = localStorage.getItem('forestProgramsData');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch (error) {
    return null;
  }
};

const ProgramPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [programs, setPrograms] = useState(() => cloneData(loadLegacyPrograms() || FALLBACK_PROGRAMS));
  const [programsSyncReady, setProgramsSyncReady] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [isSavingProgram, setIsSavingProgram] = useState(false);

  useEffect(() => {
    const hydratePrograms = async () => {
      const legacyPrograms = loadLegacyPrograms();
      try {
        const data = await authApi('/api/programs');
        const serverPrograms = Array.isArray(data.programs) ? data.programs : [];

        if (serverPrograms.length > 0) {
          setPrograms(cloneData(serverPrograms));
        } else {
          const seedPrograms = cloneData(legacyPrograms || FALLBACK_PROGRAMS);
          setPrograms(seedPrograms);
          await authApi('/api/programs/bulk', {
            method: 'PUT',
            body: JSON.stringify({ programs: seedPrograms }),
          });
        }
      } catch (error) {
        setPrograms(cloneData(legacyPrograms || FALLBACK_PROGRAMS));
      } finally {
        setProgramsSyncReady(true);
      }
    };

    hydratePrograms();
  }, []);

  useEffect(() => {
    localStorage.setItem('forestProgramsData', JSON.stringify(programs));
    if (!programsSyncReady) return;

    const timeoutId = setTimeout(() => {
      authApi('/api/programs/bulk', {
        method: 'PUT',
        body: JSON.stringify({ programs }),
      }).catch(() => {});
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [programs, programsSyncReady]);

  const filteredPrograms = useMemo(() => {
    return programs.filter((program) => {
      const matchesSearch =
        program.title.includes(searchQuery) ||
        program.category.includes(searchQuery) ||
        program.tutor.includes(searchQuery);

      if (!matchesSearch) return false;
      if (startDate && program.date < startDate) return false;
      if (endDate && program.date > endDate) return false;

      return true;
    });
  }, [programs, searchQuery, startDate, endDate]);

  const stats = useMemo(() => {
    const completedCount = filteredPrograms.filter((program) => program.status === '실시완료').length;
    const inProgressCount = filteredPrograms.filter((program) => program.status === '진행중').length;
    const totalParticipants = filteredPrograms.reduce((sum, program) => sum + program.participants, 0);

    return [
      { label: '조회 결과', value: `${filteredPrograms.length}건`, tone: 'from-slate-900 to-slate-700' },
      { label: '진행 중', value: `${inProgressCount}건`, tone: 'from-blue-600 to-cyan-500' },
      { label: '완료', value: `${completedCount}건`, tone: 'from-emerald-600 to-teal-500' },
      { label: '참여 인원', value: `${totalParticipants}명`, tone: 'from-amber-500 to-orange-500' }
    ];
  }, [filteredPrograms]);

  const resetFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  const handleAddProgram = async () => {
    const today = new Date();
    const isoDate = today.toISOString().split('T')[0];
    const displayDate = isoDate.replace(/-/g, '.');
    const newProgram = {
      id: Math.max(0, ...programs.map((program) => Number(program.id) || 0)) + 1,
      title: `${today.getMonth() + 1}월 신규 프로그램`,
      category: '특별활동',
      date: isoDate,
      displayDate,
      time: '14:00~15:00',
      tutor: '담당자 미지정',
      participants: 0,
      status: '예정'
    };

    try {
      await authApi('/api/programs', {
        method: 'POST',
        body: JSON.stringify({ program: newProgram }),
      });
      setPrograms((prev) => [newProgram, ...prev]);
    } catch (error) {
      alert('신규 프로그램 등록에 실패했습니다.');
    }
  };

  const openProgramDetail = (program) => {
    setSelectedProgram(cloneData(program));
  };

  const closeProgramDetail = () => {
    setSelectedProgram(null);
  };

  const updateSelectedProgramField = (field, value) => {
    setSelectedProgram((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSaveProgram = async () => {
    if (!selectedProgram) return;

    const normalizedProgram = {
      ...selectedProgram,
      participants: Number(selectedProgram.participants) || 0,
      displayDate: selectedProgram.date ? selectedProgram.date.replace(/-/g, '.') : selectedProgram.displayDate,
    };

    setIsSavingProgram(true);
    try {
      await authApi(`/api/programs/${normalizedProgram.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ updates: normalizedProgram }),
      });
      setPrograms((prev) => prev.map((program) => (
        String(program.id) === String(normalizedProgram.id) ? normalizedProgram : program
      )));
      setSelectedProgram(normalizedProgram);
      alert('프로그램 정보가 저장되었습니다.');
    } catch (error) {
      alert('프로그램 저장에 실패했습니다.');
    } finally {
      setIsSavingProgram(false);
    }
  };

  const handleDeleteProgram = async (programId) => {
    if (!window.confirm('이 프로그램을 삭제하시겠습니까?')) return;

    try {
      await authApi(`/api/programs/${programId}`, {
        method: 'DELETE',
      });
      setPrograms((prev) => prev.filter((program) => String(program.id) !== String(programId)));
      setSelectedProgram((prev) => (prev && String(prev.id) === String(programId) ? null : prev));
    } catch (error) {
      alert('프로그램 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="font-['Outfit'] space-y-5 md:space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.25),_transparent_35%),linear-gradient(135deg,_#fff7ed,_#ffffff_45%,_#f8fafc)] p-5 shadow-xl shadow-amber-100/40 md:rounded-[2.5rem] md:p-8">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">
              <Sparkles className="h-3.5 w-3.5" />
              Program Studio
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">프로그램 관리</h2>
              <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
                운영 일정, 담당자, 참여 인원을 한 화면에서 관리하고 모바일에서도 빠르게 진행 상황을 확인할 수 있도록 정리했습니다.
              </p>
            </div>
          </div>

          <button onClick={handleAddProgram} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-amber-200 transition-all hover:bg-amber-600 active:scale-[0.98] md:px-6">
            <Plus className="h-4 w-4" />
            신규 프로그램 등록
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
            <div className={`mb-3 h-2 w-16 rounded-full bg-gradient-to-r ${stat.tone}`} />
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/80 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="프로그램명, 카테고리, 담당자 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition-all focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] lg:min-w-[360px]">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              <CalendarIcon className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-transparent text-sm font-bold text-slate-600 outline-none"
              />
            </div>
            <div className="hidden items-center justify-center text-slate-300 sm:flex">~</div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
              <CalendarIcon className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-transparent text-sm font-bold text-slate-600 outline-none"
              />
            </div>
          </div>

          <button
            onClick={resetFilters}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-500 transition-all hover:bg-slate-50"
            title="필터 초기화"
          >
            <RotateCcw className="h-4 w-4" />
            초기화
          </button>
        </div>
      </section>

      <section className="space-y-4 md:hidden">
        {filteredPrograms.length > 0 ? (
          filteredPrograms.map((program) => (
            <article key={program.id} className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
              <div className="border-b border-slate-100 bg-slate-50/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${statusStyles[program.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {program.status}
                    </span>
                    <h3 className="mt-3 text-lg font-black tracking-tight text-slate-900">{program.title}</h3>
                    <p className="mt-1 text-xs font-bold text-slate-400">{program.category}</p>
                  </div>
                  <button onClick={() => openProgramDetail(program)} className="rounded-xl p-2 text-slate-400 transition-all hover:bg-white hover:text-slate-600">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">일정</p>
                    <p className="mt-2 font-black text-slate-900">{program.displayDate}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{program.time}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">담당</p>
                    <p className="mt-2 font-black text-slate-900">{program.tutor}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                      <Users className="h-3.5 w-3.5" />
                      {program.participants}명 참여
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => openProgramDetail(program)} className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600 transition-all hover:bg-slate-50">
                    <Eye className="mr-2 inline h-4 w-4" />
                    상세 보기
                  </button>
                  <button onClick={() => openProgramDetail(program)} className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition-all hover:bg-slate-700">
                    <Clock3 className="mr-2 inline h-4 w-4" />
                    기록 관리
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm font-bold text-slate-400">
            일치하는 프로그램이 없습니다.
          </div>
        )}
      </section>

      <section className="hidden overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/30 md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50 text-slate-400">
              <tr className="font-black uppercase tracking-widest">
                <th className="px-6 py-4">프로그램명</th>
                <th className="px-6 py-4">카테고리</th>
                <th className="px-6 py-4">일시</th>
                <th className="px-6 py-4">담당/강사</th>
                <th className="px-6 py-4">인원</th>
                <th className="px-6 py-4">상태</th>
                <th className="px-6 py-4 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPrograms.length > 0 ? (
                filteredPrograms.map((program) => (
                  <tr key={program.id} className="group transition-colors hover:bg-amber-50/40">
                    <td className="px-6 py-4 font-black text-slate-900">{program.title}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 font-bold text-slate-500">{program.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{program.displayDate}</span>
                        <span className="text-[10px] text-slate-400">{program.time}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-500">{program.tutor}</td>
                    <td className="px-6 py-4 font-medium text-slate-500">{program.participants}명</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusStyles[program.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {program.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openProgramDetail(program)} className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-white hover:text-blue-500 hover:shadow-md">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => openProgramDetail(program)} className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-white hover:shadow-md">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-20 text-center font-bold italic text-slate-400">
                    일치하는 프로그램이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl shadow-slate-900/20">
            <div className="border-b border-slate-100 px-6 py-5 md:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-500">Program Detail</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">프로그램 상세 편집</h3>
                </div>
                <button onClick={closeProgramDetail} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-500 transition-all hover:bg-slate-50">
                  닫기
                </button>
              </div>
            </div>

            <div className="grid gap-4 px-6 py-6 md:grid-cols-2 md:px-8">
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">프로그램명</span>
                <input value={selectedProgram.title || ''} onChange={(e) => updateSelectedProgramField('title', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">카테고리</span>
                <input value={selectedProgram.category || ''} onChange={(e) => updateSelectedProgramField('category', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">일자</span>
                <input type="date" value={selectedProgram.date || ''} onChange={(e) => updateSelectedProgramField('date', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">운영 시간</span>
                <input value={selectedProgram.time || ''} onChange={(e) => updateSelectedProgramField('time', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">담당/강사</span>
                <input value={selectedProgram.tutor || ''} onChange={(e) => updateSelectedProgramField('tutor', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">참여 인원</span>
                <input type="number" min="0" value={selectedProgram.participants ?? 0} onChange={(e) => updateSelectedProgramField('participants', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">진행 상태</span>
                <select value={selectedProgram.status || '예정'} onChange={(e) => updateSelectedProgramField('status', e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100">
                  <option value="예정">예정</option>
                  <option value="진행중">진행중</option>
                  <option value="실시완료">실시완료</option>
                </select>
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 md:flex-row md:justify-between md:px-8">
              <button onClick={() => handleDeleteProgram(selectedProgram.id)} className="rounded-2xl border border-rose-200 px-5 py-3 text-sm font-black text-rose-500 transition-all hover:bg-rose-50">
                프로그램 삭제
              </button>
              <div className="flex gap-3">
                <button onClick={closeProgramDetail} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-500 transition-all hover:bg-slate-50">
                  취소
                </button>
                <button onClick={handleSaveProgram} disabled={isSavingProgram} className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-white transition-all hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-200">
                  {isSavingProgram ? '저장 중...' : '변경 저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramPage;

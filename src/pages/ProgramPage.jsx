import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, MoreVertical, Calendar as CalendarIcon, Users, Eye, RotateCcw } from 'lucide-react';

const ProgramPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [programs] = useState([
    { id: 1, title: '창의 미술 교실', category: '정서지원', date: '2026.03.16', time: '14:00~15:30', tutor: '이영희', participants: 8, status: '실시완료' },
    { id: 2, title: '독서 토론 동아리', category: '교육지원', date: '2026.03.16', time: '16:00~17:30', tutor: '김민수', participants: 10, status: '진행중' },
    { id: 3, title: '지역 탐방 프로젝트', category: '문화체험', date: '2026.03.18', time: '13:00~17:00', tutor: '외부강사', participants: 12, status: '예정' },
  ]);

  const filteredPrograms = useMemo(() => {
    return programs.filter(p => {
      const matchesSearch = p.title.includes(searchQuery) || p.category.includes(searchQuery) || p.tutor.includes(searchQuery);
      if (!matchesSearch) return false;

      if (startDate && p.date < startDate) return false;
      if (endDate && p.date > endDate) return false;

      return true;
    });
  }, [programs, searchQuery, startDate, endDate]);

  const resetFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="font-['Outfit'] space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">프로그램 관리</h2>
          <p className="text-xs text-slate-500 font-medium">활동 계획, 실시 기록 및 AI 평가 관리</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-black shadow-lg shadow-amber-100 text-xs text-nowrap">
          <Plus className="w-4 h-4" />
          신규 프로그램 등록
        </button>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="프로그램명, 카테고리, 담당자 검색..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <CalendarIcon className="w-4 h-4 text-slate-400" />
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent text-xs font-bold outline-none text-slate-600"
          />
          <span className="text-slate-300">~</span>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent text-xs font-bold outline-none text-slate-600"
          />
        </div>

        <button 
          onClick={resetFilters}
          className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400"
          title="필터 초기화"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black uppercase tracking-widest">
              <tr>
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
                filteredPrograms.map((p) => (
                  <tr key={p.id} className="hover:bg-amber-50/30 transition-colors group">
                    <td className="px-6 py-4 font-black text-slate-900">{p.title}</td>
                    <td className="px-6 py-4 font-bold">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">{p.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{p.date}</span>
                        <span className="text-[10px] text-slate-400">{p.time}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{p.tutor}</td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{p.participants}명</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        p.status === '실시완료' ? 'bg-emerald-50 text-emerald-600' : 
                        p.status === '진행중' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-1.5 hover:bg-white hover:shadow-md rounded-lg transition-all text-slate-400 hover:text-blue-500">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 hover:bg-white hover:shadow-md rounded-lg transition-all text-slate-400">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-20 text-center text-slate-400 font-bold italic">
                    일치하는 프로그램이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProgramPage;

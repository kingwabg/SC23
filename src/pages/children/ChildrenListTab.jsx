import React from 'react';
import { Search, ChevronDown, Upload, Trash2, Users, Plus } from 'lucide-react';
import { ResizableTh, calculateAge, maskSsn } from './utils';
import { motion } from 'framer-motion';

const ChildrenListTab = ({
  selectedYear,
  filteredChildren,
  statusFilter, setStatusFilter,
  genderFilter, setGenderFilter,
  startDate, setStartDate,
  endDate, setEndDate,
  searchType, setSearchType,
  searchQuery, setSearchQuery,
  fileInputRef, handleExcelImport,
  setSelectedChildId,
  checkedIds, setCheckedIds, toggleCheck, toggleAll, handleDelete,
  sortField, sortAsc, toggleSort
}) => {

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 필터 바 (New Modern UI) */}
      <div className="bg-white border-b border-slate-200 px-5 py-4 flex flex-wrap items-center gap-6 shrink-0 transition-all">
        {/* 1. 이용 상태 (Segmented Control) */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <div className="w-1 h-1 bg-indigo-500 rounded-full" /> 입소/이용 상태
          </span>
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            {['ALL', 'ACTIVE', 'DISCHARGED'].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                  statusFilter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f === 'ALL' ? '전체' : f === 'ACTIVE' ? '이용' : '종결'}
              </button>
            ))}
          </div>
        </div>

        {/* 1-2. 성별 필터 (New) */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <div className="w-1 h-1 bg-rose-400 rounded-full" /> 성별 필터
          </span>
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            {['ALL', '남성', '여성'].map((g) => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                  genderFilter === g 
                  ? (g === '남성' ? 'bg-blue-500 text-white shadow-sm' : g === '여성' ? 'bg-rose-500 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm')
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {g === 'ALL' ? '전체' : g}
              </button>
            ))}
          </div>
        </div>

        {/* 2. 재원 기간 (Date Range) */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <div className="w-1 h-1 bg-emerald-500 rounded-full" /> 재원 기간 필터
          </span>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-200 w-32"
            />
            <span className="text-slate-300 font-bold text-[11px]">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-200 w-32"
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="ml-1 text-[10px] text-slate-400 hover:text-slate-600 font-bold underline"
              >
                초기화
              </button>
            )}
          </div>
        </div>

        {/* 3. 통합 검색 (Combined Search) */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <div className="w-1 h-1 bg-amber-500 rounded-full" /> 상세 검색
          </span>
          <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-200 transition-all">
            <select 
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="bg-white border-r border-slate-200 px-3 py-1.5 text-[11px] font-black text-slate-600 outline-none hover:bg-slate-50 transition-colors"
            >
              <option value="name">아동명</option>
              <option value="manager">담당자</option>
            </select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`${searchType === 'name' ? '아동 이름' : '담당자 성함'}을 입력하세요...`}
                className="w-full pl-9 pr-4 py-1.5 bg-transparent text-[11px] font-bold text-slate-700 outline-none"
              />
            </div>
          </div>
        </div>

        {/* 4. 액션 버튼 (오른쪽 정렬) */}
        <div className="flex items-center gap-2 self-end mb-0.5">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelImport} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black text-slate-600 hover:bg-slate-100 transition-all"
          >
            <Upload className="w-3.5 h-3.5" /> 엑셀 임포트
          </button>
          <div className="w-px h-5 bg-slate-200 mx-1"></div>
          <button
            type="button"
            onClick={() => setSelectedChildId('NEW')}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[11px] font-black shadow-lg hover:shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> 신규 아동 등록
          </button>
        </div>
      </div>

      <div className="bg-slate-50 px-5 py-2 flex items-center justify-between border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-black text-slate-500">검색 결과: <span className="text-indigo-600 font-black">{filteredChildren.length}</span>명</span>
          {checkedIds.length > 0 && (
            <>
              <div className="w-1 h-1 bg-slate-300 rounded-full mx-1" />
              <span className="text-[11px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">{checkedIds.length}명 선택됨</span>
              <button type="button" onClick={handleDelete} className="ml-2 flex items-center gap-1 text-[10px] font-black text-rose-600 hover:underline">
                <Trash2 className="w-3 h-3" /> 선택 삭제
              </button>
            </>
          )}
        </div>
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead className="sticky top-0 z-10 bg-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <ResizableTh columnKey="checkbox" className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={checkedIds.length === filteredChildren.length && filteredChildren.length > 0}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
                />
              </ResizableTh>
              <ResizableTh columnKey="idx" className="px-3 py-1.5 w-10">순번</ResizableTh>
              <ResizableTh columnKey="status" className="px-3 py-1.5 w-16">상태</ResizableTh>
              <ResizableTh columnKey="name" className={`px-3 py-1.5 cursor-pointer select-none transition-colors ${sortField === 'name' ? 'bg-slate-700 text-white' : ''}`} onClick={() => toggleSort('name')}>
                <div className="flex items-center gap-1">
                  성명 {sortField === 'name' ? (sortAsc ? <ChevronDown className="w-3 h-3" /> : <ChevronDown className="w-3 h-3 rotate-180" />) : <ChevronDown className="w-3 h-3 opacity-20" />}
                </div>
              </ResizableTh>
              <ResizableTh columnKey="gender" className={`px-3 py-1.5 cursor-pointer select-none transition-colors ${sortField === 'gender' || genderFilter !== 'ALL' ? 'bg-slate-700 text-white' : ''}`} onClick={() => toggleSort('gender')}>
                <div className="flex items-center gap-1">
                  성별 {sortField === 'gender' ? (sortAsc ? <ChevronDown className="w-3 h-3 text-rose-400" /> : <ChevronDown className="w-3 h-3 text-rose-400 rotate-180" />) : <ChevronDown className="w-3 h-3 opacity-20" />}
                  {genderFilter !== 'ALL' && <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />}
                </div>
              </ResizableTh>
              <ResizableTh columnKey="age" className={`px-3 py-1.5 cursor-pointer select-none transition-colors ${sortField === 'age' ? 'bg-slate-700 text-white' : ''}`} onClick={() => toggleSort('age')}>
                <div className="flex items-center gap-1">
                  나이 {sortField === 'age' ? (sortAsc ? <ChevronDown className="w-3 h-3 text-emerald-400" /> : <ChevronDown className="w-3 h-3 text-emerald-400 rotate-180" />) : <ChevronDown className="w-3 h-3 opacity-20" />}
                </div>
              </ResizableTh>
              <ResizableTh columnKey="ssn" className="px-3 py-1.5">주민번호</ResizableTh>
              <ResizableTh columnKey="phone" className="px-3 py-1.5">연락처</ResizableTh>
              <ResizableTh columnKey="school" className="px-3 py-1.5">학교</ResizableTh>
              <ResizableTh columnKey="grade" className="px-3 py-1.5">학년</ResizableTh>
              <ResizableTh columnKey="enrollment" className="px-3 py-1.5">입소일</ResizableTh>
              <ResizableTh columnKey="discharge" className="px-3 py-1.5 text-rose-400">퇴소일</ResizableTh>
              <ResizableTh columnKey="address" className="px-3 py-1.5">주소 / 이용유형</ResizableTh>
              <ResizableTh columnKey="guardian" className="px-3 py-1.5">보호자</ResizableTh>
              <ResizableTh columnKey="relation" className="px-3 py-1.5">관계 / 유형</ResizableTh>
              <ResizableTh columnKey="guardianPhone" className="px-3 py-1.5">보호자 연락처</ResizableTh>
              <ResizableTh columnKey="kidsCall" className="px-3 py-1.5">키즈콜</ResizableTh>
              <ResizableTh columnKey="manager" className="px-3 py-1.5">담당자</ResizableTh>
              <ResizableTh columnKey="notes" className="px-3 py-1.5">비고</ResizableTh>
              <ResizableTh columnKey="detail" className="px-3 py-1.5 text-right">상세</ResizableTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredChildren.length === 0 && (
              <tr>
                <td colSpan={15} className="px-6 py-16 text-center text-slate-400 text-sm">
                  {selectedYear}년도 등록된 아동이 없습니다.
                </td>
              </tr>
            )}
            {filteredChildren.map((child, idx) => {
              const yd = child.yearlyData?.[selectedYear] || {};
              const isChecked = checkedIds.includes(child.id);
              return (
                <tr
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={`cursor-pointer transition-colors text-[12px] group ${isChecked ? 'bg-indigo-50' : 'odd:bg-slate-50/50 hover:bg-indigo-50/50'}`}
                >
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={e => toggleCheck(e, child.id)}
                      className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-1 text-slate-400 font-bold border-b border-slate-100 italic">{idx + 1}</td>
                  <td className="px-3 py-1 border-b border-slate-100">
                    { (yd.dischargeDate || child.dischargeDate) ? (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black border border-slate-200">종결</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black border border-emerald-100">이용</span>
                    )}
                  </td>
                  <td className="px-3 py-1 font-black text-slate-900 border-b border-slate-100 leading-tight">
                    <span className="block mb-0.5">{child.name}</span>
                    <span className="text-[9px] font-bold text-slate-400 opacity-70 italic">{child.displayId || child.cardId || ''}</span>
                  </td>
                  <td className="px-3 py-1 font-bold text-slate-600 border-b border-slate-100">{child.gender || '-'}</td>
                  <td className="px-3 py-1 font-bold text-slate-600 border-b border-slate-100">
                    {calculateAge(child.birth) !== '' ? `${calculateAge(child.birth)}세` : '-'}
                  </td>
                  <td className="px-3 py-1 font-bold text-slate-500 border-b border-slate-100 tracking-wider text-[10px]">{maskSsn(child.ssn) || '-'}</td>
                  <td className="px-3 py-1 font-bold text-slate-600 border-b border-slate-100">{yd.phone || child.phone || '-'}</td>
                  <td className="px-3 py-1 font-bold text-slate-800 border-b border-slate-100">{yd.school || '-'}</td>
                  <td className="px-3 py-1 font-bold text-indigo-600 border-b border-slate-100">{yd.grade ? `${String(yd.grade).replace('학년','')}학년` : '-'}</td>
                  <td className="px-3 py-1 font-bold text-emerald-600 border-b border-slate-100 text-[10px]">{yd.enrollment || child.enrollment || '-'}</td>
                  <td className="px-3 py-1 font-bold text-rose-500 border-b border-slate-100 text-[10px]">{yd.dischargeDate || child.dischargeDate || '-'}</td>
                  <td className="px-3 py-1 font-bold text-slate-600 max-w-[200px] border-b border-slate-100 leading-relaxed">
                    <div className="truncate">{yd.address || '-'}</div>
                    <div className="text-[9px] text-slate-400 font-bold">{yd.useType || '-'}</div>
                  </td>
                  <td className="px-3 py-1 font-bold text-slate-700 border-b border-slate-100">{yd.guardian || '-'}</td>
                  <td className="px-3 py-1 font-bold text-slate-500 border-b border-slate-100 text-[10px]">
                    <div>{yd.guardianRel || '-'}</div>
                    <div className="text-slate-400">{child.familyType || yd.familyType || '-'}</div>
                  </td>
                  <td className="px-3 py-1 font-bold text-indigo-500 border-b border-slate-100 text-[11px]">{yd.contact || '-'}</td>
                  <td className="px-3 py-1 font-bold text-slate-400 border-b border-slate-100 text-[10px]">{yd.kidsCallId || child.kidsCallId || '-'}</td>
                  <td className="px-3 py-1 font-bold text-slate-600 border-b border-slate-100">{yd.manager || child.manager || '-'}</td>
                  <td className="px-3 py-1 font-normal text-slate-400 max-w-[120px] truncate border-b border-slate-100 text-[10px]" title={child.notes || yd.notes || ''}>{child.notes || yd.notes || '-'}</td>
                  <td className="px-3 py-1 text-right border-b border-slate-100">
                    <button className="relative z-10 px-2 py-0.5 bg-indigo-500 text-white rounded text-[9px] font-black shadow-sm hover:bg-indigo-600 transition-all active:scale-95">
                      상세
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChildrenListTab;

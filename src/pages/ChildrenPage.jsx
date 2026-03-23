import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Plus, X, User, FileSpreadsheet, ChevronDown,
  ChevronLeft, ChevronRight, CheckCircle2, Eye, EyeOff, Save,
  Printer, Upload, Trash2, AlertCircle
} from 'lucide-react';
import { authApi } from '../utils/apiClient.js';

// ── 유틸 ──────────────────────────────────────────────────────────────────────
const calculateAge = (birth) => {
  if (!birth) return '';
  const today = new Date();
  const b = new Date(birth);
  if (isNaN(b)) return '';
  let age = today.getFullYear() - b.getFullYear();
  if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--;
  return age >= 0 ? age : '';
};

const maskSsn = (v) => {
  if (!v) return '';
  const s = String(v).replace(/\s/g, '');
  return s.length > 8 ? `${s.slice(0, 8)}******` : s;
};

const YEAR_RANGE = Array.from({ length: 15 }, (_, i) => 2015 + i).reverse();

const EMPTY_YEAR_DATA = () => ({
  school: '', grade: '', address: '', guardian: '', guardianRel: '', guardianType: '',
  contact: '', useType: '일반', ssn: '', phone: '', manager: '', kidsCallId: '',
  enrollment: '', prevEnrollment: '', dischargeDate: '', notes: '',
  incomeRate: '', disabilityType: '', healthNotes: '',
});

const FALLBACK_CHILDREN = [
  {
    id: 1, name: '김민수', birth: '2011-05-12', gender: '남', photo: null,
    cardId: 'E7FDCD66', displayId: '',
    yearlyData: {
      2018: { school: '숲속초등학교', grade: '1', address: '서울시 강남구 A단지', guardian: '김철수', contact: '010-1111-1111', useType: '일반' },
      2026: { school: '숲속중학교', grade: '3', address: '서울시 서초구 D단지', guardian: '김철수', contact: '010-1234-5678', useType: '일반', phone: '010-1111-1234' },
    },
    logs: { 2026: { observation: [], h1: null, h2: null } },
    attendance: {},
  },
  {
    id: 2, name: '이영희', birth: '2018-11-20', gender: '여', photo: null,
    cardId: 'A1B2C3D4', displayId: '',
    yearlyData: {
      2025: { school: '산새초등학교', grade: '1', address: '서울시 서초구 서초대로', guardian: '박영순', contact: '010-9999-8888', useType: '일반' },
      2026: { school: '숲속초등학교', grade: '2', address: '서울시 서초구 서초대로', guardian: '박영순', contact: '010-4321-8765', useType: '일반' },
    },
    logs: { 2026: { observation: [], h1: null, h2: null } },
    attendance: {},
  },
  {
    id: 3, name: '박지훈', birth: '2019-02-15', gender: '남', photo: null,
    cardId: 'BG774211', displayId: '',
    yearlyData: {
      2026: { school: '푸른들초등학교', grade: '1', address: '서울시 송파구 잠실동', guardian: '박철웅', contact: '010-5555-5555', useType: '일반' },
    },
    logs: { 2026: { observation: [], h1: null, h2: null } },
    attendance: {},
  },
  {
    id: 4, name: '정우성', birth: '2018-05-20', gender: '남', photo: null,
    cardId: '37B0B566', displayId: 'NF561136',
    yearlyData: {
      2026: { school: '숲속초등학교', grade: '2', address: '서울시 서초구', guardian: '정철학', contact: '010-8888-8888', useType: '일반' },
    },
    logs: { 2026: { observation: [], h1: null, h2: null } },
    attendance: {},
  },
];

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
const ChildrenPage = () => {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [yearOpen, setYearOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [children, setChildren] = useState(() => {
    try {
      const s = localStorage.getItem('forestChildrenList');
      if (s) { const p = JSON.parse(s); if (p?.length) return p; }
    } catch {}
    return FALLBACK_CHILDREN;
  });
  const [checkedIds, setCheckedIds] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sortField, setSortField] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [syncReady, setSyncReady] = useState(false);

  const fileInputRef = useRef(null);

  // persist
  useEffect(() => { localStorage.setItem('forestChildrenList', JSON.stringify(children)); }, [children]);

  // server sync
  useEffect(() => {
    (async () => {
      try {
        const data = await authApi('/api/children');
        const serverChildren = Array.isArray(data?.children) ? data.children : [];
        if (serverChildren.length > 0) setChildren(serverChildren);
        else {
          await authApi('/api/children/bulk', { method: 'PUT', body: JSON.stringify({ children: FALLBACK_CHILDREN }) });
        }
      } catch {}
      setSyncReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!syncReady) return;
    const t = setTimeout(() => {
      authApi('/api/children/bulk', { method: 'PUT', body: JSON.stringify({ children }) }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [children, syncReady]);

  const filteredChildren = useMemo(() => {
    let list = children.filter(c => {
      const hasYear = !!c.yearlyData?.[selectedYear];
      const matchSearch = !searchQuery || c.name.includes(searchQuery);
      return hasYear && matchSearch;
    });
    list = [...list].sort((a, b) => {
      let av = '', bv = '';
      if (sortField === 'name') { av = a.name; bv = b.name; }
      else if (sortField === 'gender') { av = a.gender || ''; bv = b.gender || ''; }
      else if (sortField === 'age') { av = a.birth || ''; bv = b.birth || ''; }
      const cmp = av.localeCompare(bv, 'ko');
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [children, selectedYear, searchQuery, sortField, sortAsc]);

  const selectedChild = useMemo(() => children.find(c => c.id === selectedChildId) || null, [children, selectedChildId]);

  const toggleSort = (field) => {
    if (sortField === field) setSortAsc(p => !p);
    else { setSortField(field); setSortAsc(true); }
  };

  const toggleCheck = (e, id) => {
    e.stopPropagation();
    setCheckedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleAll = () => {
    if (checkedIds.length === filteredChildren.length) setCheckedIds([]);
    else setCheckedIds(filteredChildren.map(c => c.id));
  };

  const handleDelete = () => {
    if (!checkedIds.length) return;
    if (!window.confirm(`선택한 ${checkedIds.length}명을 삭제하시겠습니까?`)) return;
    
    // 즉각적인 상태 갱신을 위해 setTimeout 활용으로 React 렌더링 사이클 안정화
    setTimeout(() => {
      setChildren(prev => prev.filter(c => !checkedIds.includes(c.id)));
      if (checkedIds.includes(selectedChildId)) setSelectedChildId(null);
      setCheckedIds([]);
    }, 0);
  };

  // RFID keyboard wedge
  useEffect(() => {
    let buf = '', t0 = Date.now();
    const onKey = (e) => {
      const now = Date.now();
      if (now - t0 > 80) buf = '';
      t0 = now;
      if (e.key === 'Enter') {
        if (buf.length >= 4) {
          const found = children.find(c => c.cardId === buf.toUpperCase());
          if (found) {
            const today = new Date().toISOString().split('T')[0];
            setChildren(prev => prev.map(c => c.id === found.id
              ? { ...c, attendance: { ...c.attendance, [today]: { status: 'PRESENT', time: new Date().toLocaleTimeString() } } }
              : c));
          }
        }
        buf = '';
      } else if (e.key.length === 1) buf += e.key;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [children]);

  // Excel import
  const handleExcelImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (rows.length < 2) return;
        const headers = rows[0];
        const newChildren = rows.slice(1).map((row, i) => {
          const get = (key) => {
            const idx = headers.findIndex(h => String(h).includes(key));
            return idx >= 0 ? String(row[idx] ?? '') : '';
          };
          return {
            id: Date.now() + i,
            name: get('성명') || get('이름') || '미입력',
            birth: get('생년월일') || get('생년'),
            gender: get('성별'),
            photo: null, cardId: get('카드'), displayId: get('관리번호'),
            yearlyData: {
              [selectedYear]: {
                school: get('학교'), grade: get('학년'),
                address: get('주소'), guardian: get('보호자'),
                contact: get('연락처'), useType: get('이용유형') || '일반',
              }
            },
            logs: { [selectedYear]: { observation: [], h1: null, h2: null } },
            attendance: {},
          };
        }).filter(c => c.name && c.name !== '미입력');
        if (!newChildren.length) { alert('가져올 아동 데이터가 없습니다.'); return; }
        if (window.confirm(`${newChildren.length}명을 등록하시겠습니까?`)) {
          setChildren(prev => [...prev, ...newChildren]);
          alert(`${newChildren.length}명이 등록되었습니다.`);
        }
      } catch (err) { alert('파일을 읽을 수 없습니다.'); }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  // ── RENDER ────────────────────────────────────────────────────────────────────
  return (
    <div className="font-['Outfit'] min-h-screen bg-[#f0f2f5] flex flex-col">
      {/* 상단 헤더 */}
      <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0 shadow-sm z-50">
        {/* 좌: 타이틀 + 연도 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 m-0 leading-none">아동 기록 통합 관리</h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest m-0">숲속 지능형 시스템 V3.0</p>
            </div>
          </div>

          {/* 연도 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setYearOpen(p => !p)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-[11px] font-black shadow"
            >
              <span className="text-indigo-200 text-[9px] font-bold uppercase tracking-widest">활성 장부 연도</span>
              <span>{selectedYear}년도 아카이브</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${yearOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {yearOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute top-full left-0 mt-1 w-44 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[200]"
                >
                  <div className="max-h-60 overflow-y-auto p-1.5">
                    {YEAR_RANGE.map(y => (
                      <button key={y} onClick={() => { setSelectedYear(y); setYearOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-between ${selectedYear === y ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 text-slate-600'}`}>
                        {y}년 데이터
                        {selectedYear === y && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 우: 탭 + 등록 */}
        <div className="flex items-center gap-2">
          {checkedIds.length > 0 && (
            <div className="flex items-center gap-2 mr-2">
              <span className="text-[11px] font-black text-slate-500">{checkedIds.length}명 선택</span>
              <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-[11px] font-black hover:bg-rose-100 transition-all">
                <Trash2 className="w-3.5 h-3.5" /> 삭제
              </button>
            </div>
          )}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-[11px] font-black shadow">
              <Users className="w-3.5 h-3.5" /> 아동 목록/관리
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 text-slate-500 rounded-lg text-[11px] font-black hover:bg-white transition-all">
              <FileSpreadsheet className="w-3.5 h-3.5" /> 출결대장
            </button>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-[11px] font-black shadow hover:bg-emerald-700 transition-all"
          >
            <Plus className="w-4 h-4" /> 신규 아동 등록
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 flex overflow-hidden" onClick={() => setYearOpen(false)}>
        {!selectedChildId ? (
          /* ── 목록 뷰 ── */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 툴바 */}
            <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-black text-slate-700 m-0">아동 명부 및 연도별 이력 관리</h3>
                <span className="text-[10px] font-bold text-slate-400">{filteredChildren.length}명</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="이름으로 찾기..."
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-300 w-48"
                  />
                </div>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelImport} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" /> 엑셀 임포트
                </button>
              </div>
            </div>

            {/* 테이블 */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse min-w-[1100px]">
                <thead className="sticky top-0 z-10 bg-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={checkedIds.length === filteredChildren.length && filteredChildren.length > 0}
                        onChange={toggleAll}
                        className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-3 w-10">순번</th>
                    <th className="px-3 py-3 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                      성명 {sortField === 'name' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th className="px-3 py-3 cursor-pointer select-none" onClick={() => toggleSort('gender')}>
                      성별 {sortField === 'gender' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th className="px-3 py-3 cursor-pointer select-none" onClick={() => toggleSort('age')}>
                      나이 {sortField === 'age' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th className="px-3 py-3">연락처</th>
                    <th className="px-3 py-3">학교</th>
                    <th className="px-3 py-3">학년</th>
                    <th className="px-3 py-3">입소일</th>
                    <th className="px-3 py-3">주소 / 이용유형</th>
                    <th className="px-3 py-3">보호자</th>
                    <th className="px-3 py-3">보호자 연락처</th>
                    <th className="px-3 py-3">키즈콜</th>
                    <th className="px-3 py-3">담당자</th>
                    <th className="px-3 py-3 text-right">상세</th>
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
                        className={`cursor-pointer transition-colors text-[12px] group ${isChecked ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-4 py-max border-b border-slate-100" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-col h-full absolute inset-0 opacity-0 group-hover:opacity-100 cursor-row-resize"
                             onMouseDown={(e) => {
                                e.stopPropagation();
                                const tr = e.currentTarget.closest('tr');
                                const startY = e.clientY;
                                const startHeight = tr.offsetHeight;
                                const onMouseMove = (moveEvent) => {
                                  const newHeight = startHeight + (moveEvent.clientY - startY);
                                  tr.style.height = `${Math.max(40, newHeight)}px`;
                                };
                                const onMouseUp = () => {
                                  document.removeEventListener('mousemove', onMouseMove);
                                  document.removeEventListener('mouseup', onMouseUp);
                                };
                                document.addEventListener('mousemove', onMouseMove);
                                document.addEventListener('mouseup', onMouseUp);
                             }}
                          >
                          </div>
                          <div className="relative z-10 flex items-center h-full py-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => toggleCheck(e, child.id)}
                              className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-400 font-bold border-b border-slate-100">{idx + 1}</td>
                        <td className="px-3 py-3 font-black text-slate-900 border-b border-slate-100">{child.name}<br/><span className="text-[10px] font-bold text-slate-400">{child.displayId || child.cardId || ''}</span></td>
                        <td className="px-3 py-3 font-bold text-slate-600 border-b border-slate-100">{child.gender || '-'}</td>
                        <td className="px-3 py-3 font-bold text-slate-600 border-b border-slate-100">
                          {calculateAge(child.birth) !== '' ? `${calculateAge(child.birth)}세` : '-'}
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-600 border-b border-slate-100">{yd.phone || child.phone || '-'}</td>
                        <td className="px-3 py-3 font-bold text-slate-800 border-b border-slate-100">{yd.school || '-'}</td>
                        <td className="px-3 py-3 font-bold text-indigo-600 border-b border-slate-100">{yd.grade ? `${yd.grade}학년` : '-'}</td>
                        <td className="px-3 py-3 font-bold text-emerald-600 border-b border-slate-100">{yd.enrollment || child.enrollment || '-'}</td>
                        <td className="px-3 py-3 font-bold text-slate-600 max-w-[200px] border-b border-slate-100">
                          <div className="truncate">{yd.address || '-'}</div>
                          <div className="text-[10px] text-slate-400">{yd.useType || '-'}</div>
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-700 border-b border-slate-100">{yd.guardian || '-'}</td>
                        <td className="px-3 py-3 font-bold text-indigo-500 border-b border-slate-100">{yd.contact || '-'}</td>
                        <td className="px-3 py-3 font-bold text-slate-400 border-b border-slate-100">{yd.kidsCallId || child.kidsCallId || '-'}</td>
                        <td className="px-3 py-3 font-bold text-slate-400 border-b border-slate-100">{yd.manager || child.manager || '-'}</td>
                        <td className="px-3 py-3 text-right border-b border-slate-100">
                          <button className="relative z-10 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black shadow hover:bg-indigo-700 transition-all">
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
        ) : (
          /* ── 상세 뷰 ── */
          <ChildDetailView
            child={selectedChild}
            children={filteredChildren}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            onSelectChild={setSelectedChildId}
            onClose={() => setSelectedChildId(null)}
            onSave={(updated) => setChildren(prev => prev.map(c => c.id === updated.id ? updated : c))}
          />
        )}
      </div>

      {/* 신규 등록 모달 */}
      <AnimatePresence>
        {showAddModal && (
          <AddChildModal
            selectedYear={selectedYear}
            onClose={() => setShowAddModal(false)}
            onAdd={(child) => { setChildren(prev => [...prev, child]); setShowAddModal(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── 상세 뷰 ───────────────────────────────────────────────────────────────────
const INFO_TABS = ['기본인적사항', '자격및이용정보', '장애및건강정보', '가구원연고자정보', '특이사항'];

const ChildDetailView = ({ child, children, selectedYear, onYearChange, onSelectChild, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('기본인적사항');
  const [showSsn, setShowSsn] = useState(false);
  const [form, setForm] = useState(null);
  const [detailYear, setDetailYear] = useState(selectedYear);

  const availableYears = useMemo(() => {
    if (!child) return [];
    return Object.keys(child.yearlyData || {}).map(Number).sort((a, b) => b - a);
  }, [child]);

  useEffect(() => {
    if (!child) return;
    const yd = child.yearlyData?.[detailYear] || EMPTY_YEAR_DATA();
    setForm({
      name: child.name || '',
      gender: child.gender || '남',
      birth: child.birth || '',
      phone: yd.phone || child.phone || '',
      ssn: child.ssn || yd.ssn || '',
      school: yd.school || '',
      grade: yd.grade || '',
      address: yd.address || '',
      guardian: yd.guardian || '',
      guardianRel: yd.guardianRel || '',
      guardianType: yd.guardianType || '',
      contact: yd.contact || '',
      useType: yd.useType || '일반',
      manager: yd.manager || child.manager || '',
      kidsCallId: yd.kidsCallId || child.kidsCallId || '',
      enrollment: yd.enrollment || child.enrollment || '',
      prevEnrollment: yd.prevEnrollment || child.prevEnrollment || '',
      dischargeDate: yd.dischargeDate || child.dischargeDate || '',
      notes: yd.notes || child.notes || '',
      incomeRate: yd.incomeRate || '',
      displayId: child.displayId || '',
      cardId: child.cardId || '',
      disabilityType: yd.disabilityType || '',
      healthNotes: yd.healthNotes || '',
    });
    setShowSsn(false);
  }, [child?.id, detailYear]);

  if (!child || !form) return null;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    const updatedChild = {
      ...child,
      name: form.name,
      gender: form.gender,
      birth: form.birth,
      phone: form.phone,
      ssn: form.ssn,
      enrollment: form.enrollment,
      prevEnrollment: form.prevEnrollment,
      dischargeDate: form.dischargeDate,
      manager: form.manager,
      kidsCallId: form.kidsCallId,
      displayId: form.displayId,
      cardId: form.cardId,
      notes: form.notes,
      yearlyData: {
        ...(child.yearlyData || {}),
        [detailYear]: {
          ...(child.yearlyData?.[detailYear] || {}),
          phone: form.phone,
          school: form.school,
          grade: form.grade,
          address: form.address,
          guardian: form.guardian,
          guardianRel: form.guardianRel,
          guardianType: form.guardianType,
          contact: form.contact,
          useType: form.useType,
          manager: form.manager,
          kidsCallId: form.kidsCallId,
          enrollment: form.enrollment,
          prevEnrollment: form.prevEnrollment,
          dischargeDate: form.dischargeDate,
          notes: form.notes,
          incomeRate: form.incomeRate,
          disabilityType: form.disabilityType,
          healthNotes: form.healthNotes,
        },
      },
    };
    onSave(updatedChild);
    alert('저장되었습니다.');
  };

  const F = ({ label, children: ch, span = 1, red = false }) => (
    <div className={`flex border border-slate-200 ${span === 2 ? 'col-span-2' : ''}`}>
      <div className="bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-600 flex items-center min-w-[90px] border-r border-slate-200 whitespace-nowrap">
        {label}
      </div>
      <div className={`flex-1 px-3 py-2 ${red ? 'text-rose-500' : ''}`}>{ch}</div>
    </div>
  );

  const Input = ({ field, type = 'text', placeholder = '', className = '', onChangeExtra }) => (
    <input
      type={type}
      value={form[field] ?? ''}
      placeholder={placeholder}
      onChange={e => { set(field, e.target.value); onChangeExtra?.(); }}
      className={`w-full text-[12px] font-bold text-slate-900 bg-transparent outline-none ${className}`}
    />
  );

  const Select = ({ field, options }) => (
    <select
      value={form[field] ?? ''}
      onChange={e => set(field, e.target.value)}
      className="w-full text-[12px] font-bold text-slate-900 bg-transparent outline-none"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="flex-1 flex overflow-hidden bg-[#f0f2f5]">
      {/* 좌측 목록 패널 */}
      <div className="w-[220px] shrink-0 bg-slate-900 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black text-white m-0">아동 목록</p>
            <p className="text-[9px] font-bold text-slate-400 m-0 uppercase tracking-widest">선택해서 상세 편집</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-all">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {children.map(c => (
            <button
              key={c.id}
              onClick={() => onSelectChild(c.id)}
              className={`w-full rounded-xl px-3 py-3 text-left transition-all ${child.id === c.id ? 'bg-indigo-600 shadow-lg' : 'hover:bg-white/5'}`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black ${child.id === c.id ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-300'}`}>
                  {c.name.charAt(0)}
                </div>
                <div>
                  <p className={`text-[12px] font-black m-0 ${child.id === c.id ? 'text-white' : 'text-slate-200'}`}>{c.name}</p>
                  <p className={`text-[9px] font-bold m-0 ${child.id === c.id ? 'text-indigo-200' : 'text-slate-500'}`}>
                    {c.yearlyData?.[selectedYear]?.school || '학교 미입력'}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 우측 상세 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 상단바 */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black">
              {child.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 m-0">{child.name}</h3>
              <p className="text-[10px] text-slate-400 font-bold m-0">{detailYear}년도 상세 정보</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-black shadow hover:bg-indigo-700 transition-all">
              <Save className="w-3.5 h-3.5" /> 저장 (F2)
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-[11px] font-black hover:bg-slate-700 transition-all">
              <Printer className="w-3.5 h-3.5" /> 기록지출력
            </button>
          </div>
        </div>

        {/* 연도 이력 탭 */}
        <div className="bg-white border-b border-slate-200 px-6 flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 py-3">이력 보유 연도</span>
          {YEAR_RANGE.map(y => {
            const has = !!child.yearlyData?.[y];
            if (!has && y < Math.min(...(availableYears.length ? availableYears : [2026])) - 1) return null;
            return (
              <button
                key={y}
                onClick={() => setDetailYear(y)}
                className={`px-3 py-3 text-[11px] font-black border-b-2 transition-all whitespace-nowrap ${detailYear === y ? 'border-indigo-600 text-indigo-600' : has ? 'border-transparent text-slate-600 hover:text-slate-900' : 'border-transparent text-slate-300'}`}
              >
                {y}년
              </button>
            );
          }).filter(Boolean)}
        </div>

        {/* 정보 탭 */}
        <div className="bg-white border-b border-slate-200 px-6 flex items-center gap-1 shrink-0">
          {INFO_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-[11px] font-black border-b-2 transition-all whitespace-nowrap ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === '기본인적사항' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm max-w-5xl">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] font-bold text-amber-700">주민등록번호 등 고유식별정보 변경 시 주의가 필요합니다.</span>
              </div>
              <div className="p-4">
                <div className="flex gap-4">
                  {/* 메인 그리드 */}
                  <div className="flex-1 grid grid-cols-2 border border-slate-200 divide-x divide-y divide-slate-200">
                    <F label="관리번호"><Input field="displayId" placeholder="관리번호" /></F>
                    <F label="성명">
                      <div className="flex items-center gap-2">
                        <Input field="name" className="flex-1" />
                        <Select field="gender" options={['남', '여']} />
                      </div>
                    </F>
                    <F label="주민번호" span={2}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          {showSsn
                            ? <Input field="ssn" placeholder="000000-0000000" />
                            : <span className="text-[12px] font-bold text-slate-400">{form.ssn ? maskSsn(form.ssn) : '000000-0000000'}</span>
                          }
                        </div>
                        <button onClick={() => setShowSsn(p => !p)} className="text-slate-400 hover:text-slate-600">
                          {showSsn ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <span className="text-[10px] text-slate-400">생년월일: {form.birth} (만 {calculateAge(form.birth)}세)</span>
                      </div>
                    </F>
                    <F label="성별"><Select field="gender" options={['남', '여']} /></F>
                    <F label="휴대폰"><Input field="phone" placeholder="010-0000-0000" /></F>
                    <F label="주소" span={2}><Input field="address" placeholder="주소" /></F>
                    <F label="학교명"><Input field="school" placeholder="학교명" /></F>
                    <F label="학년"><Input field="grade" placeholder="학년" /></F>
                    <F label="보호자"><Input field="guardian" placeholder="보호자명" /></F>
                    <F label="보호자 연락처"><Input field="contact" placeholder="010-0000-0000" /></F>
                    <F label="입소일" red><Input field="enrollment" type="date" /></F>
                    <F label="퇴소일" red>
                      <div className="flex items-center gap-2">
                        <Input field="dischargeDate" type="date" />
                      </div>
                    </F>
                    <F label="이전 입소일"><Input field="prevEnrollment" type="date" /></F>
                    <F label="소득분위(%)"><Input field="incomeRate" placeholder="%" /></F>
                    <F label="키즈콜 ID"><Input field="kidsCallId" placeholder="키즈콜 ID" /></F>
                    <F label="카드 번호"><Input field="cardId" placeholder="카드 ID" /></F>
                  </div>

                  {/* 우측 사진+저장 */}
                  <div className="w-28 flex flex-col gap-2 shrink-0">
                    <div className="border-2 border-dashed border-slate-200 rounded-xl aspect-[3/4] flex flex-col items-center justify-center gap-1 bg-slate-50">
                      {child.photo
                        ? <img src={child.photo} className="w-full h-full object-cover rounded-xl" alt="" />
                        : <>
                            <User className="w-8 h-8 text-slate-300" />
                            <span className="text-[9px] text-slate-400">사진없음</span>
                          </>
                      }
                    </div>
                    <Printer className="w-5 h-5 text-slate-400 mx-auto" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === '자격및이용정보' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm max-w-5xl">
              <div className="p-4 grid grid-cols-2 border border-slate-200 divide-x divide-y divide-slate-200">
                <F label="이용유형"><Select field="useType" options={['일반', '방과후', '종일', '시간제', '기타']} /></F>
                <F label="담당자"><Input field="manager" placeholder="담당자명" /></F>
                <F label="보호자 관계"><Input field="guardianRel" placeholder="부/모/기타" /></F>
                <F label="보호자 유형"><Input field="guardianType" placeholder="부모/조부모/기타" /></F>
              </div>
            </div>
          )}

          {activeTab === '장애및건강정보' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm max-w-5xl">
              <div className="p-4 grid grid-cols-2 border border-slate-200 divide-x divide-y divide-slate-200">
                <F label="장애 유형" span={2}><Input field="disabilityType" placeholder="장애 유형 (없으면 공란)" /></F>
                <F label="건강 특이사항" span={2}><Input field="healthNotes" placeholder="알레르기, 복약 정보 등" /></F>
              </div>
            </div>
          )}

          {activeTab === '가구원연고자정보' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-5xl">
              <p className="text-slate-400 font-bold text-sm">가구원/연고자 정보 입력 기능은 준비 중입니다.</p>
            </div>
          )}

          {activeTab === '특이사항' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm max-w-5xl">
              <div className="p-4">
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="특이사항을 입력하세요..."
                  className="w-full h-40 border border-slate-200 rounded-xl p-3 text-[12px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── 신규 등록 모달 ─────────────────────────────────────────────────────────────
const AddChildModal = ({ selectedYear, onClose, onAdd }) => {
  const [form, setForm] = useState({ name: '', gender: '남', birth: '', school: '', grade: '', address: '', guardian: '', contact: '', cardId: '', useType: '일반' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const F = ({ label, ch }) => (
    <div>
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{label}</label>
      {ch}
    </div>
  );
  const I = ({ field, type = 'text', placeholder = '' }) => (
    <input type={type} value={form[field]} onChange={e => set(field, e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] font-bold outline-none focus:ring-2 focus:ring-indigo-300" />
  );

  const handleSubmit = () => {
    if (!form.name) { alert('성명은 필수입니다.'); return; }
    onAdd({
      id: Date.now(),
      name: form.name, gender: form.gender, birth: form.birth,
      photo: null, cardId: form.cardId, displayId: '',
      yearlyData: {
        [selectedYear]: {
          school: form.school, grade: form.grade, address: form.address,
          guardian: form.guardian, contact: form.contact, useType: form.useType,
          enrollment: new Date().toISOString().split('T')[0],
        }
      },
      logs: { [selectedYear]: { observation: [], h1: null, h2: null } },
      attendance: {},
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-900">신규 아동 등록 — {selectedYear}년도</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <F label="성명 *"><I field="name" placeholder="홍길동" /></F>
          <F label="성별">
            <select value={form.gender} onChange={e => set('gender', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] font-bold outline-none">
              <option value="남">남</option><option value="여">여</option>
            </select>
          </F>
          <F label="생년월일"><I field="birth" type="date" /></F>
          <F label="카드 ID"><I field="cardId" placeholder="예: AABBCCDD" /></F>
          <F label="학교"><I field="school" placeholder="숲속초등학교" /></F>
          <F label="학년"><I field="grade" placeholder="1" /></F>
          <div className="col-span-2"><F label="주소"><I field="address" placeholder="서울시 ..." /></F></div>
          <F label="보호자"><I field="guardian" placeholder="보호자명" /></F>
          <F label="연락처"><I field="contact" placeholder="010-0000-0000" /></F>
        </div>
        <div className="px-6 pb-6 flex gap-2 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-[12px] font-black hover:bg-slate-200 transition-all">취소</button>
          <button onClick={handleSubmit} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[12px] font-black shadow hover:bg-indigo-700 transition-all">
            <Plus className="w-4 h-4 inline mr-1" />등록
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ChildrenPage;

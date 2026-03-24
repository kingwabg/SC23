import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ChevronDown, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { authApi } from '../utils/apiClient.js';
import { calculateAge, EMPTY_YEAR_DATA, YEAR_RANGE } from './children/utils';
import { IMPORTED_CHILDREN } from '../imported_children.js';

import ChildrenListTab from './children/ChildrenListTab';
import AttendanceRegistryTab from './children/AttendanceRegistryTab';
import ChildDetailView from './children/ChildDetailView';
import AddChildModal from './children/AddChildModal';

const FALLBACK_CHILDREN = IMPORTED_CHILDREN;

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

  // ── FILTER STATES ──
  const [statusFilter, setStatusFilter] = useState('ALL'); 
  const [genderFilter, setGenderFilter] = useState('ALL'); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchType, setSearchType] = useState('name'); 
  const [syncReady, setSyncReady] = useState(false);

  const fileInputRef = useRef(null);

  const [activeViewId, setActiveViewId] = useState(() => localStorage.getItem('forestActiveViewId') || 'children_view');
  const [ledgerYear, setLedgerYear] = useState(() => Number(localStorage.getItem('forestLedgerYear')) || new Date().getFullYear());
  const [ledgerMonth, setLedgerMonth] = useState(() => Number(localStorage.getItem('forestLedgerMonth')) || new Date().getMonth() + 1);

  // persist
  useEffect(() => { localStorage.setItem('forestChildrenList', JSON.stringify(children)); }, [children]);
  useEffect(() => { localStorage.setItem('forestActiveViewId', activeViewId); }, [activeViewId]);
  useEffect(() => { localStorage.setItem('forestLedgerYear', String(ledgerYear)); }, [ledgerYear]);
  useEffect(() => { localStorage.setItem('forestLedgerMonth', String(ledgerMonth)); }, [ledgerMonth]);

  // server sync
  useEffect(() => {
    (async () => {
      try {
        const data = await authApi('/api/children');
        const serverChildren = Array.isArray(data?.children) ? data.children : [];
        if (serverChildren.length > 0) {
          setChildren(serverChildren);
        } else {
          localStorage.removeItem('forestChildrenList');
          setChildren(FALLBACK_CHILDREN);
          await authApi('/api/children/bulk', { method: 'PUT', body: JSON.stringify({ children: FALLBACK_CHILDREN }) });
        }
      } catch (err) {
        console.error("Sync Error:", err);
      }
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
    let list = children.filter(child => {
      const yd = child.yearlyData?.[selectedYear];
      if (!yd) return false;

      const isDischarged = !!(yd.dischargeDate || child.dischargeDate);
      if (statusFilter === 'ACTIVE' && isDischarged) return false;
      if (statusFilter === 'DISCHARGED' && !isDischarged) return false;

      if (genderFilter !== 'ALL' && child.gender !== genderFilter) return false;

      const q = searchQuery.toLowerCase();
      if (q) {
        if (searchType === 'name') {
          if (!child.name.toLowerCase().includes(q)) return false;
        } else if (searchType === 'manager') {
          const m = (yd.manager || child.manager || '').toLowerCase();
          if (!m.includes(q)) return false;
        }
      }

      if (startDate || endDate) {
        const enrollStr = yd.enrollment || child.enrollment;
        const dischStr = yd.dischargeDate || child.dischargeDate;
        if (!enrollStr) return false;

        const enrollDate = new Date(enrollStr);
        const dischDate = dischStr ? new Date(dischStr) : new Date('9999-12-31');
        
        if (startDate) {
          const s = new Date(startDate);
          if (dischDate < s) return false;
        }
        if (endDate) {
          const e = new Date(endDate);
          if (enrollDate > e) return false;
        }
      }

      return true;
    });

    list = [...list].sort((a, b) => {
      let av = '', bv = '';
      if (sortField === 'name') { av = a.name; bv = b.name; }
      else if (sortField === 'gender') { av = a.gender || ''; bv = b.gender || ''; }
      else if (sortField === 'age') { 
        av = calculateAge(a.birth) || 0; 
        bv = calculateAge(b.birth) || 0; 
        return sortAsc ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv), 'ko');
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [children, selectedYear, searchQuery, sortField, sortAsc, statusFilter, startDate, endDate, searchType]);

  const selectedChild = useMemo(() => {
    if (selectedChildId === 'NEW') {
      return { 
        id: 'NEW', name: '', gender: '', birth: '', phone: '', ssn: '', manager: '', displayId: '', cardId: '',
        isNew: true, yearlyData: { [selectedYear]: EMPTY_YEAR_DATA() } 
      };
    }
    return children.find(c => c.id === selectedChildId) || null;
  }, [children, selectedChildId, selectedYear]);

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

  const handleDelete = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (checkedIds.length === 0) return;
    
    setChildren(prev => prev.filter(c => !checkedIds.includes(c.id)));
    if (checkedIds.includes(selectedChildId)) setSelectedChildId(null);
    setCheckedIds([]);
    alert('삭제 완료되었습니다.');
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
            const val = idx >= 0 ? row[idx] : undefined;
            if (val === undefined || val === null) return '';
            if (typeof val === 'number' && (key.includes('일') || key.includes('생년월일'))) {
              try {
                const date = XLSX.SSF.parse_date_code(val);
                const f = (n) => n.toString().padStart(2, '0');
                return `${date.y}-${f(date.m)}-${f(date.d)}`;
              } catch (e) { return String(val); }
            }
            return String(val).trim();
          };

          const name = get('성명') || get('이름');
          if (!name || name === '미입력') return null;
          const enroll = get('입소일');
          const disch = get('퇴소일');

          return {
            id: Date.now() + i,
            name: name, birth: get('생년월일'), gender: get('성별'), ssn: get('주민번호'), phone: get('연락처'),
            enrollment: enroll, dischargeDate: disch, familyType: get('유형'), manager: get('담당자'), kidsCallId: get('키즈콜'),
            notes: get('비고'), photo: null, cardId: get('카드') || get('키즈콜'), displayId: get('관리번호'),
            yearlyData: {
              [selectedYear]: {
                school: get('학교'), grade: get('학년').replace(/[^0-9]/g, ''), address: get('주소'), guardian: get('보호자'),
                guardianRel: get('보호자관계'), contact: get('보호자연락처') || get('연락처'), useType: get('이용유형') || '일반',
                enrollment: enroll, dischargeDate: disch, manager: get('담당자'), notes: get('비고')
              }
            },
            logs: { [selectedYear]: { observation: [], h1: null, h2: null } },
            attendance: {},
          };
        }).filter(Boolean);
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

  return (
    <div className="font-['Outfit'] min-h-screen bg-[#f0f2f5] flex flex-col">
      <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0 shadow-sm z-50">
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

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => { setActiveViewId('children_view'); setSelectedChildId(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-black shadow transition-all ${activeViewId === 'children_view' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-white'}`}
            >
              <Users className="w-3.5 h-3.5" /> 아동 목록/관리
            </button>
            <button
              onClick={() => { setActiveViewId('attendance_view'); setSelectedChildId(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-black transition-all ${activeViewId === 'attendance_view' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-white'}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> 출결대장
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden" onClick={() => setYearOpen(false)}>
        {activeViewId === 'attendance_view' ? (
          <AttendanceRegistryTab 
             childrenList={children}
             setChildrenList={setChildren}
             ledgerYear={ledgerYear}
             setLedgerYear={setLedgerYear}
             ledgerMonth={ledgerMonth}
             setLedgerMonth={setLedgerMonth}
             setActiveViewId={setActiveViewId}
             setSelectedChildId={setSelectedChildId}
          />
        ) : !selectedChildId ? (
          <ChildrenListTab 
             selectedYear={selectedYear}
             filteredChildren={filteredChildren}
             statusFilter={statusFilter}
             setStatusFilter={setStatusFilter}
             genderFilter={genderFilter}
             setGenderFilter={setGenderFilter}
             startDate={startDate}
             setStartDate={setStartDate}
             endDate={endDate}
             setEndDate={setEndDate}
             searchType={searchType}
             setSearchType={setSearchType}
             searchQuery={searchQuery}
             setSearchQuery={setSearchQuery}
             fileInputRef={fileInputRef}
             handleExcelImport={handleExcelImport}
             setSelectedChildId={setSelectedChildId}
             checkedIds={checkedIds}
             setCheckedIds={setCheckedIds}
             toggleCheck={toggleCheck}
             toggleAll={toggleAll}
             handleDelete={handleDelete}
             sortField={sortField}
             sortAsc={sortAsc}
             toggleSort={toggleSort}
          />
        ) : (
          <ChildDetailView
            child={selectedChild}
            children={filteredChildren}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            onSelectChild={setSelectedChildId}
            onClose={() => setSelectedChildId(null)}
            onSave={(updated) => {
              if (selectedChildId === 'NEW') {
                const newId = Date.now().toString();
                const newChild = { ...updated, id: newId };
                delete newChild.isNew;
                setChildren(prev => [...prev, newChild]);
                setSelectedChildId(newId);
              } else {
                setChildren(prev => prev.map(c => c.id === updated.id ? updated : c));
              }
            }}
          />
        )}
      </div>

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

export default ChildrenPage;

// Trigger HMR

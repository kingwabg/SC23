import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  Plus, 
  X, 
  User, 
  Calendar as CalendarIcon,
  FileSpreadsheet,
  Fingerprint,
  MoreVertical,
  GraduationCap,
  Printer,
  BookOpen,
  MessageSquare,
  ShieldCheck,
  ClipboardCheck,
  History,
  TrendingUp,
  Heart,
  CheckCircle2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Table as TableIcon,
  ChevronDown,
  Timer,
  Eye,
  EyeOff,
  Save
} from 'lucide-react';

const calculateAge = (birth) => {
  if (!birth) return '';
  const today = new Date();
  const birthDate = new Date(birth);
  if (Number.isNaN(birthDate.getTime())) return '';
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 ? String(age) : '';
};

const maskSsn = (ssn) => {
  if (!ssn) return '';
  const cleaned = String(ssn).replace(/\s+/g, '');
  if (cleaned.length <= 7) return cleaned;
  return `${cleaned.slice(0, 8)}******`;
};

const buildChildForm = (child, yearData) => ({
  name: child?.name || '',
  gender: child?.gender || '',
  phone: child?.phone || yearData?.contact || '',
  ssn: child?.ssn || '',
  birth: child?.birth || '',
  school: yearData?.school || child?.school || '',
  grade: yearData?.grade || child?.grade || '',
  enrollment: child?.enrollment || '',
  prevEnrollment: child?.prevEnrollment || '',
  address: yearData?.address || child?.address || '',
  useType: child?.useType || '',
  guardianName: yearData?.guardian || child?.guardianName || '',
  guardianRel: yearData?.guardianRel || child?.guardianRel || '',
  guardianType: yearData?.guardianType || child?.guardianType || '',
  guardianContact: yearData?.contact || child?.guardianContact || '',
  notes: child?.notes || '',
  manager: child?.manager || '',
  kidsCallId: child?.kidsCallId || '',
  dischargeDate: child?.dischargeDate || '',
  displayId: child?.displayId || '',
  cardId: child?.cardId || '',
});
const ChildrenPage = () => {
  // --- 글로벌 시스템 상태 ---
  const userRole = localStorage.getItem('userRole') || 'ADMIN';
  const [selectedYear, setSelectedYear] = useState(2026);
  const [activeTab, setActiveTab] = useState('active'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [detailTab, setDetailTab] = useState('info');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newChild, setNewChild] = useState({ name: '', gender: '남', birth: '', school: '', grade: 1, address: '', guardian: '', contact: '', cardId: '' });
  const [showSsn, setShowSsn] = useState(false);
  const [editForm, setEditForm] = useState(null);

  // 초1 -> 중3까지의 긴 추적을 위한 연도 범위 (15년)
  const years = useMemo(() => Array.from({ length: 15 }, (_, i) => 2015 + i).reverse(), []);

  // --- 권한 레이어 ---
  const permissions = useMemo(() => {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser && userRole === 'NON_STAFF') {
      const user = JSON.parse(currentUser);
      return { 'NON_STAFF': user.permissions || {} };
    }
    const saved = localStorage.getItem('appPermissions');
    return saved ? JSON.parse(saved) : {
      'NON_STAFF': {
        'children_view': true,
        'children_create': false,
        'children_edit': false,
        'children_delete': false,
        'attendance_view': true,
        'attendance_edit': false,
        'attendance_excel': false,
        'rfid_access': true
      }
    };
  }, [userRole]);

  const can = (perm) => userRole === 'ADMIN' || permissions.NON_STAFF[perm];

  // --- 데이터 유지 및 테스트 세트 ---
  const [children, setChildren] = useState(() => {
    const saved = localStorage.getItem('forestChildrenList');
    if (saved) {
      const parsed = JSON.parse(saved);
      // 기존 구조에 장기 히스토리 데이터가 없는 경우 새로고침
      if (parsed.length > 0 && (!parsed[0].yearlyData || !parsed[0].yearlyData[2018])) {
        localStorage.removeItem('forestChildrenList');
      } else {
        return parsed;
      }
    }
    return [
      { 
        id: 1, name: '김민수', birth: '2011-05-12', gender: '남', photo: null, enrollment: '2018-03-02', cardId: 'E7FDCD66',
        // 9년 장기 히스토리 (초1 -> 중3)
        yearlyData: {
          2018: { school: '숲속초등학교', grade: 1, address: '서울시 강남구 A단지', guardian: '김철수', contact: '010-1111-1111' },
          2019: { school: '숲속초등학교', grade: 2, address: '서울시 강남구 A단지', guardian: '김철수', contact: '010-1111-1111' },
          2020: { school: '숲속초등학교', grade: 3, address: '서울시 강남구 B빌라', guardian: '김철수', contact: '010-2222-2222' },
          2021: { school: '숲속초등학교', grade: 4, address: '서울시 강남구 B빌라', guardian: '김철수', contact: '010-2222-2222' },
          2022: { school: '숲속초등학교', grade: 5, address: '서울시 서초구 C아파트', guardian: '김철수', contact: '010-3333-3333' },
          2023: { school: '숲속초등학교', grade: 6, address: '서울시 서초구 C아파트', guardian: '김철수', contact: '010-3333-3333' },
          2024: { school: '숲속중학교', grade: '중1', address: '서울시 서초구 D단지', guardian: '김철수', contact: '010-4444-4444' },
          2025: { school: '숲속중학교', grade: '중2', address: '서울시 서초구 D단지', guardian: '김철수', contact: '010-4444-4444' },
          2026: { school: '숲속중학교', grade: '중3', address: '서울시 서초구 D단지', guardian: '김철수', contact: '010-1234-5678' }
        },
        logs: { 
          2018: { observation: [{ date: '2018-03-12', content: '1학년 입학! 너무 귀엽고 씩씩함.' }], h1: { date: '2018-05-10', content: '적응 아주 빠름' }, h2: { date: '2018-11-20', content: '친구들과 잘 어울림' }, guardian: [] },
          2026: { observation: [{ date: '2026-03-10', content: '중3 사춘기 없이 성숙함. 진로 고민 중.' }], h1: { date: '2026-03-15', content: '진로 집중 상담' }, h2: null, guardian: [] }
        },
        attendance: {}
      },
      { 
        id: 2, name: '이영희', birth: '2018-11-20', gender: '여', photo: null, enrollment: '2025-03-02', cardId: 'A1B2C3D4',
        yearlyData: {
          2025: { school: '산새초등학교', grade: 1, address: '서울시 서초구 서초대로', guardian: '박영순', contact: '010-9999-8888' },
          2026: { school: '숲속초등학교', grade: 2, address: '서울시 서초구 서초대로', guardian: '박영순', contact: '010-4321-8765' }
        },
        logs: { 2025: { observation: [], h1: { date: '2025-05-02', content: '입소 초기 상담' }, h2: null, guardian: [] }, 2026: { observation: [], h1: null, h2: null, guardian: [] } },
        attendance: {}
      },
      {
        id: 3, name: '박지훈', birth: '2019-02-15', gender: '남', photo: null, enrollment: '2026-03-02', cardId: 'BG774211',
        yearlyData: {
          2026: { school: '푸른들초등학교', grade: 1, address: '서울시 송파구 잠실동', guardian: '박철웅', contact: '010-5555-5555' }
        },
        logs: { 2026: { observation: [], h1: null, h2: null, guardian: [] } },
        attendance: {}
      },
      {
        id: 4, 
        name: '정우성', // 예시 이름
        birth: '2018-05-20', 
        gender: '남', 
        photo: null, 
        enrollment: '2026-03-02', 
        displayId: 'NF561136', // 카드에 써있는 번호
        cardId: '37B0B566',    // 실제 단말기가 읽는 ID
        yearlyData: { 2026: { school: '숲속초등학교', grade: 2, address: '서울시 서초구', guardian: '정철학', contact: '010-8888-8888' } },
        logs: { 2026: { observation: [], h1: null, h2: null, guardian: [] } },
        attendance: {}
      }
    ];
  });

  // --- RFID 스캔 및 단말기 로그 상태 ---
  const [scanLogs, setScanLogs] = useState(() => {
    const saved = localStorage.getItem('forestScanLogs');
    return saved ? JSON.parse(saved) : [];
  });

  const [lastScannedChild, setLastScannedChild] = useState(null);

  useEffect(() => {
    localStorage.setItem('forestChildrenList', JSON.stringify(children));
  }, [children]);

  useEffect(() => {
    localStorage.setItem('forestScanLogs', JSON.stringify(scanLogs));
  }, [scanLogs]);

  // 중계 서버로부터 데이터 실시간 동기화
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const response = await fetch('http://localhost:5005/api/attendance');
        const externalData = await response.json();
        
        // 가져온 데이터를 바탕으로 내부 상태 업데이트
        externalData.forEach(item => {
          if (item.time && item.time !== '-') {
            // 이미 스캔 로그에 있는지 확인 (이름과 시간 기준)
            const isAlreadyProcessed = scanLogs.some(log => 
              log.name === item.name && 
              new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) === item.time
            );

            if (!isAlreadyProcessed) {
              const child = children.find(c => c.name === item.name);
              if (child) {
                // 수동으로 로그와 출결 업데이트 (handleTerminalScan은 시간을 현재로 잡으므로 별도 처리)
                const newLog = {
                  id: Date.now() + Math.random(),
                  terminalId: '900446',
                  cardId: child.cardId,
                  name: child.name,
                  timestamp: new Date(`${new Date().toISOString().split('T')[0]}T${item.time}`).toISOString(),
                  status: 'SUCCESS'
                };
                setScanLogs(prev => [newLog, ...prev].slice(0, 50));
                
                const today = new Date().toISOString().split('T')[0];
                setChildren(prev => prev.map(c => {
                  if (c.id === child.id) {
                    return {
                      ...c,
                      attendance: { ...c.attendance, [today]: { status: 'PRESENT', time: item.time } }
                    };
                  }
                  return c;
                }));
              }
            }
          }
        });
      } catch (err) {
        console.log('중계 서버 연결 대기 중...');
      }
    };

    const interval = setInterval(fetchAttendance, 60000);
    fetchAttendance();
    return () => clearInterval(interval);
  }, [children, scanLogs]); // scanLogs도 의존성에 추가하여 중복 체크 반영

  // 전역 키보드 리스너 (USB형 단말기/Keyboard Wedge 방식 대응)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      const currentTime = Date.now();
      
      // 타이핑 속도가 매우 빠르면 단말기 스캔으로 간주 (일반적인 RFID 리더기 동작)
      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }

      if (e.key === 'Enter') {
        if (buffer.length >= 4) { // 최소 ID 길이
          handleTerminalScan(buffer.toUpperCase());
        }
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
      }

      lastKeyTime = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [children]); // children 데이터가 변경될 때마다 리스너 갱신

  // 단말기(900446) 스캔 처리 함수
  const handleTerminalScan = (cardId) => {
    const child = children.find(c => c.cardId === cardId);
    const newLog = {
      id: Date.now(),
      terminalId: '900446',
      cardId: cardId,
      name: child ? child.name : '미등록 카드',
      timestamp: new Date().toISOString(),
      status: child ? 'SUCCESS' : 'UNKNOWN'
    };

    setScanLogs(prev => [newLog, ...prev].slice(0, 50)); // 최근 50개 유지
    
    if (child) {
      setLastScannedChild(child);
      // 알림창 3초 후 제거
      setTimeout(() => setLastScannedChild(null), 3000);
      
      // 출결 데이터 업데이트 (예시: 오늘 날짜 출결 true)
      const today = new Date().toISOString().split('T')[0];
      setChildren(prev => prev.map(c => {
        if (c.id === child.id) {
          return {
            ...c,
            attendance: {
              ...c.attendance,
              [today]: { status: 'PRESENT', time: new Date().toLocaleTimeString() }
            }
          };
        }
        return c;
      }));
    }
  };

  const handleAddChild = () => {
    if (!newChild.name || !newChild.cardId) {
      alert('아동 이름과 카드 번호는 필수입니다.');
      return;
    }

    const id = Date.now();
    const childData = {
      id,
      name: newChild.name,
      birth: newChild.birth,
      gender: newChild.gender,
      photo: null,
      enrollment: new Date().toISOString().split('T')[0],
      cardId: newChild.cardId,
      yearlyData: {
        [selectedYear]: {
          school: newChild.school,
          grade: parseInt(newChild.grade),
          address: newChild.address,
          guardian: newChild.guardian,
          contact: newChild.contact
        }
      },
      logs: {
        [selectedYear]: { observation: [], h1: null, h2: null, guardian: [] }
      },
      attendance: {}
    };

    setChildren(prev => [...prev, childData]);
    setIsAddModalOpen(false);
    setNewChild({ name: '', gender: '남', birth: '', school: '', grade: 1, address: '', guardian: '', contact: '', cardId: '' });
  };

  const selectedChild = useMemo(() => children.find(c => c.id === selectedChildId), [children, selectedChildId]);
  
  const currentYearData = useMemo(() => {
    if (!selectedChild) return null;
    return selectedChild.yearlyData?.[selectedYear] || null;
  }, [selectedChild, selectedYear]);

  const filteredChildren = useMemo(() => {
    return children.filter(c => {
      const matchesSearch = c.name.includes(searchQuery);
      const hasDataThisYear = !!c.yearlyData?.[selectedYear];
      return matchesSearch && hasDataThisYear;
    });
  }, [children, searchQuery, selectedYear]);

  const currentYearLogs = useMemo(() => {
    if (!selectedChild) return null;
    return selectedChild.logs?.[selectedYear] || { observation: [], h1: null, h2: null, guardian: [] };
  }, [selectedChild, selectedYear]);

  useEffect(() => {
    if (!selectedChild) {
      setEditForm(null);
      return;
    }
    setEditForm(buildChildForm(selectedChild, currentYearData || {}));
    setShowSsn(false);
  }, [selectedChildId, selectedYear]);

  const handleSaveChildInfo = () => {
    if (!selectedChild || !editForm) return;
    if (!editForm.name?.trim()) {
      alert('이름은 필수입니다.');
      return;
    }

    setChildren(prev => prev.map(child => {
      if (child.id !== selectedChild.id) return child;
      const nextYearData = {
        ...(child.yearlyData || {}),
        [selectedYear]: {
          ...(child.yearlyData?.[selectedYear] || {}),
          school: editForm.school,
          grade: editForm.grade,
          address: editForm.address,
          guardian: editForm.guardianName,
          guardianRel: editForm.guardianRel,
          guardianType: editForm.guardianType,
          contact: editForm.guardianContact,
        }
      };

      return {
        ...child,
        name: editForm.name,
        gender: editForm.gender,
        phone: editForm.phone,
        ssn: editForm.ssn,
        birth: editForm.birth,
        enrollment: editForm.enrollment,
        prevEnrollment: editForm.prevEnrollment,
        address: editForm.address,
        useType: editForm.useType,
        guardianName: editForm.guardianName,
        guardianRel: editForm.guardianRel,
        guardianType: editForm.guardianType,
        guardianContact: editForm.guardianContact,
        notes: editForm.notes,
        manager: editForm.manager,
        kidsCallId: editForm.kidsCallId,
        dischargeDate: editForm.dischargeDate,
        displayId: editForm.displayId,
        cardId: editForm.cardId,
        yearlyData: nextYearData,
      };
    }));

    alert('아동 정보가 저장되었습니다.');
  };

  const fileInputRef = useRef(null);

  const handleAttendanceImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      if (data.length < 2) return;

      const headers = data[0]; 
      const rows = data.slice(1);

      const newChildren = [...children];
      const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

      rows.forEach(row => {
        const name = row[0];
        const childIndex = newChildren.findIndex(c => c.name === name);
        if (childIndex > -1) {
          if (!newChildren[childIndex].attendance) newChildren[childIndex].attendance = {};
          
          headers.forEach((header, idx) => {
            if (idx === 0) return;
            const day = String(header).padStart(2, '0');
            const status = row[idx];
            
            if (status === '출' || status === 'PRESENT' || status === 'O' || status === 1) {
              const dateKey = `${selectedYear}-${currentMonth}-${day}`;
              newChildren[childIndex].attendance[dateKey] = {
                status: 'PRESENT',
                time: '09:00:00',
                memo: '엑셀 데이터 일괄 임포트'
              };
            }
          });
        }
      });

      setChildren(newChildren);
      alert('출결 데이터가 성공적으로 통합되었습니다.');
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  return (
    <div className="font-['Outfit'] min-h-screen bg-[#f8fafc] flex flex-col">
      {/* 상단 헤더 */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shrink-0 shadow-sm z-[100]">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 rounded-xl shadow-xl rotate-3"><Users className="w-6 h-6 text-indigo-400" /></div>
            <div>
               <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase m-0 italic">아동 기록 통합 관리</h2>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] m-0">숲속 지능형 시스템 v3.0</p>
            </div>
          </div>
          
          {/* 연도 통합 드롭다운 */}
          <div className="relative">
             <button 
               onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
               className="flex items-center gap-4 bg-slate-900 text-white px-8 py-3 rounded-2xl shadow-2xl hover:bg-slate-800 transition-all border border-slate-700 group"
             >
                <div className="flex flex-col items-start">
                   <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">활성 장부 연도</span>
                   <span className="text-sm font-black italic">{selectedYear}년도 아카이브</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isYearPickerOpen ? 'rotate-180' : ''}`} />
             </button>

             <AnimatePresence>
                {isYearPickerOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-3 w-64 bg-white rounded-[2rem] shadow-3xl border border-slate-100 overflow-hidden z-[1000]"
                  >
                     <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">저장소 기록 선택</span>
                        <Timer className="w-4 h-4 text-indigo-500" />
                     </div>
                     <div className="max-h-80 overflow-y-auto p-2 custom-scrollbar">
                        {years.map(y => (
                          <button 
                            key={y} 
                            onClick={() => { setSelectedYear(y); setIsYearPickerOpen(false); }}
                            className={`w-full text-left px-6 py-4 rounded-xl text-xs font-black transition-all flex items-center justify-between ${selectedYear === y ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 text-slate-600'}`}
                          >
                             {y}년 데이터
                             {selectedYear === y && <CheckCircle2 className="w-4 h-4" />}
                          </button>
                        ))}
                     </div>
                  </motion.div>
                )}
             </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {/* 내비게이션 탭 */}
           <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
             {[
               { id: 'active', label: '아동 목록/관리', icon: Users, key: 'children_view' },
               { id: 'ledger', label: '출결대장', icon: FileSpreadsheet, key: 'attendance_view' }
             ].filter(t => can(t.key)).map(t => (
               <button key={t.id} onClick={() => { setActiveTab(t.id); setSelectedChildId(null); }} className={`flex items-center gap-2.5 px-6 py-2 rounded-xl text-[11px] font-black transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-900'}`}>
                 <t.icon className="w-4 h-4" />
                 {t.label}
               </button>
             ))}
           </div>
           {can('children_create') && (
             <button 
               onClick={() => setIsAddModalOpen(true)}
               className="px-6 py-3 bg-emerald-600 text-white rounded-xl shadow-xl hover:bg-emerald-700 font-black text-[11px] flex items-center gap-2 uppercase tracking-widest transition-all"
             >
               <Plus className="w-4 h-4" /> 신규 아동 등록
             </button>
           )}
        </div>
      </div>


      <div className="flex-1 flex overflow-hidden relative">
        {/* 출결대장 뷰 */}
        {activeTab === 'ledger' && (
          <div className="flex-1 overflow-y-auto p-12 bg-white flex flex-col">
            <div className="max-w-7xl mx-auto w-full space-y-10">
              <div className="flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Attendance Registry</span>
                  </div>
                  <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                    월간 출결 현황 대장 <span className="text-indigo-600">.</span>
                  </h3>
                </div>
                 <div className="flex gap-4">
                   <input 
                     type="file" 
                     ref={fileInputRef} 
                     onChange={handleAttendanceImport} 
                     className="hidden" 
                     accept=".xlsx, .xls, .csv" 
                   />
                   <button 
                     onClick={() => fileInputRef.current.click()}
                     className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[11px] uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all"
                   >
                     데이터 가져오기
                   </button>
                   <button className="px-6 py-3 bg-slate-100 text-slate-900 rounded-xl font-black text-[11px] uppercase tracking-widest">인쇄</button>
                   <button className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl">EXCEL</button>
                 </div>
              </div>

              <div className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead>
                      <tr className="bg-[#0f172a] text-slate-400">
                        <th className="px-10 py-8 font-black uppercase tracking-widest text-[10px] sticky left-0 z-20 bg-[#0f172a]">전체 아동 성명</th>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <th key={day} className="px-2 py-8 text-center font-black text-[10px] w-12">{day}</th>
                        ))}
                        <th className="px-8 py-8 text-center font-black uppercase text-[10px] bg-slate-800 text-indigo-400">합계</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {children.map(child => {
                        const days = Array.from({ length: 31 }, (_, i) => {
                          const date = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(i+1).padStart(2, '0')}`;
                          return child.attendance?.[date];
                        });
                        const presentCount = days.filter(d => d?.status === 'PRESENT').length;

                        return (
                          <tr key={child.id} className="hover:bg-indigo-50/30 transition-all">
                            <td className="px-10 py-6 font-black text-slate-900 sticky left-0 bg-white z-10">{child.name}</td>
                            {days.map((day, i) => (
                              <td key={i} className="px-1 py-6 text-center border-r border-slate-50">
                                {day?.status === 'PRESENT' ? (
                                  <div className="flex flex-col items-center gap-1 group/day">
                                    <div className="w-7 h-7 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-emerald-500/20 group-hover/day:scale-125 transition-all">출</div>
                                    <span className="text-[7px] font-black text-slate-400 tracking-tighter">{day.time?.slice(0,5)}</span>
                                  </div>
                                ) : (
                                  <div className="w-2 h-2 bg-slate-100 rounded-full mx-auto" />
                                )}
                              </td>
                            ))}
                            <td className="px-8 py-6 text-center bg-indigo-50/50">
                              <span className="text-base font-black text-indigo-600 italic">{presentCount}</span>
                              <span className="text-[9px] font-bold text-slate-400 ml-1">Days</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 실시간 스캔 알림 (피드백) */}
        <AnimatePresence>
          {lastScannedChild && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="fixed bottom-12 right-12 z-[1000] flex items-center gap-6 bg-slate-900 text-white p-8 rounded-[3rem] shadow-3xl border border-white/10"
            >
              <div className="w-20 h-20 rounded-[2rem] border-4 border-indigo-500/30 overflow-hidden shadow-2xl relative">
                {lastScannedChild.photo ? <img src={lastScannedChild.photo} className="w-full h-full object-cover" /> : <User className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-700" />}
              </div>
              <div className="space-y-1 pr-8">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black italic">{lastScannedChild.name}</span>
                  <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20">Checked IN</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] m-0">단말기 900446 인증 성공</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 아동 테이블 목록 (초기 화면) */}
        {activeTab === 'active' && !selectedChildId && (
          <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
             <div className="flex justify-between items-end">
                <div>
                   <h3 className="text-3xl font-black text-slate-900 tracking-tighter m-0 uppercase italic">기관 아동 명부 (MODIFIED) <span className="text-indigo-600">.</span></h3>
                   <p className="text-xs font-bold text-slate-400 m-0 uppercase tracking-widest mt-1">{selectedYear}년도 데이터베이스에 {filteredChildren.length}명의 아동이 검색되었습니다.</p>
                </div>
                <div className="relative w-80">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input 
                     type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder="이름, 학교 등으로 검색..."
                     className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-[1.5rem] text-sm font-black shadow-xl shadow-slate-200/40 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                   />
                </div>
             </div>

             <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto max-h-[calc(100vh-260px)]">
                  <table className="w-full min-w-[1900px] text-left text-sm">
                     <thead className="sticky top-0 bg-[#0f172a] text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] z-20">
                        <tr>
                           <th className="px-6 py-4">이름 / 성별</th>
                           <th className="px-6 py-4">휴대폰 / 주민번호</th>
                           <th className="px-6 py-4">생년월일 / 연령</th>
                           <th className="px-6 py-4">학교 / 학년</th>
                           <th className="px-6 py-4">입소 / 이전입소 / 퇴소</th>
                           <th className="px-6 py-4">주소 / 이용유형</th>
                           <th className="px-6 py-4">보호자 / 관계 / 유형</th>
                           <th className="px-6 py-4">연락처 / 비고</th>
                           <th className="px-6 py-4">담당자 / 키즈콜ID</th>
                           <th className="px-6 py-4">관리번호 / 카드ID</th>
                           <th className="px-6 py-4 text-right">상세</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {filteredChildren.map(child => {
                          const yearData = child.yearlyData?.[selectedYear] || {};
                          return (
                          <tr key={child.id} onClick={() => setSelectedChildId(child.id)} className="cursor-pointer hover:bg-indigo-50/40 transition-all align-top">
                             <td className="px-6 py-4"><div className="font-black text-slate-900">{child.name || '미입력'}</div><div className="mt-1 text-xs font-bold text-slate-500">{child.gender || '미입력'}</div></td>
                             <td className="px-6 py-4"><div className="font-bold text-slate-800">{child.phone || '미입력'}</div><div className="mt-1 text-xs font-bold text-slate-400">{maskSsn(child.ssn) || '미입력'}</div></td>
                             <td className="px-6 py-4"><div className="font-bold text-slate-800">{child.birth || '미입력'}</div><div className="mt-1 text-xs font-bold text-slate-500">만 {calculateAge(child.birth) || '미입력'}</div></td>
                             <td className="px-6 py-4"><div className="font-bold text-slate-800">{yearData.school || child.school || '미입력'}</div><div className="mt-1 text-xs font-bold text-slate-500">{yearData.grade || child.grade || '미입력'}</div></td>
                             <td className="px-6 py-4 text-xs font-bold text-slate-600 leading-6"><div>입소: {child.enrollment || '미입력'}</div><div>이전: {child.prevEnrollment || '미입력'}</div><div>퇴소: {child.dischargeDate || '미입력'}</div></td>
                             <td className="px-6 py-4 text-xs font-bold text-slate-600 leading-6"><div className="max-w-[220px] truncate">{yearData.address || child.address || '미입력'}</div><div className="mt-1 text-slate-500">{child.useType || '미입력'}</div></td>
                             <td className="px-6 py-4 text-xs font-bold text-slate-600 leading-6"><div>{yearData.guardian || child.guardianName || '미입력'}</div><div>{yearData.guardianRel || child.guardianRel || '미입력'}</div><div>{yearData.guardianType || child.guardianType || '미입력'}</div></td>
                             <td className="px-6 py-4 text-xs font-bold text-slate-600 leading-6"><div>{yearData.contact || child.guardianContact || '미입력'}</div><div className="max-w-[220px] truncate text-slate-500">{child.notes || '미입력'}</div></td>
                             <td className="px-6 py-4 text-xs font-bold text-slate-600 leading-6"><div>{child.manager || '미입력'}</div><div className="text-slate-500">{child.kidsCallId || '미입력'}</div></td>
                             <td className="px-6 py-4 text-xs font-bold text-slate-600 leading-6"><div>{child.displayId || '미입력'}</div><div className="text-slate-500">{child.cardId || '미입력'}</div></td>
                             <td className="px-6 py-4 text-right"><button className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase shadow-lg">상세 열기</button></td>
                          </tr>
                        )})}
                     </tbody>
                  </table>
                </div>
             </div>
          </div>
        </div>
        )}

        {/* 상세 뷰 레이아웃 (아동 선택 시 표시) */}
        {selectedChildId && (
          <div className="flex-1 flex w-full animate-in fade-in duration-500 bg-slate-100">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: isSidebarCollapsed ? '0px' : '340px' }}
               className="bg-white border-r border-slate-200 flex flex-col shrink-0 h-full overflow-hidden shadow-xl relative z-40"
             >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
                   <div>
                     <h4 className="text-sm font-black tracking-tight m-0">아동 목록</h4>
                     <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">선택해서 상세 편집</p>
                   </div>
                   <button onClick={() => setSelectedChildId(null)} className="p-2 hover:bg-white/10 rounded-lg transition-all"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                   <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="이름, 학교, 보호자 검색"
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[12px] font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none"
                      />
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                   {filteredChildren.map(child => {
                     const yearData = child.yearlyData?.[selectedYear] || {};
                     return (
                     <button 
                       key={child.id}
                       onClick={() => setSelectedChildId(child.id)}
                       className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${selectedChildId === child.id ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg' : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'}`}
                     >
                        <div className="flex items-center justify-between gap-3">
                           <div>
                              <div className="text-sm font-black">{child.name}</div>
                              <div className={`mt-1 text-[11px] font-bold ${selectedChildId === child.id ? 'text-indigo-100' : 'text-slate-500'}`}>{yearData.school || '학교 미입력'} / {yearData.grade || '학년 미입력'}</div>
                           </div>
                           <div className={`rounded-xl px-3 py-1 text-[10px] font-black ${selectedChildId === child.id ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>{child.gender || '미입력'}</div>
                        </div>
                     </button>
                   )})}
                </div>
             </motion.div>

             <div className="flex-1 overflow-y-auto p-8 md:p-10">
                <div className="mx-auto max-w-7xl space-y-6">
                   <div className="rounded-[2rem] border border-slate-200 bg-white px-8 py-6 shadow-sm">
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                         <div className="flex items-start gap-5">
                            <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-slate-200 bg-slate-50 shadow-inner">
                               {selectedChild.photo ? <img src={selectedChild.photo} className="h-full w-full rounded-[1.75rem] object-cover" /> : <User className="w-10 h-10 text-slate-300" />}
                            </div>
                            <div>
                               <div className="flex flex-wrap items-center gap-3">
                                  <h3 className="text-4xl font-black tracking-tight text-slate-900">{selectedChild.name}</h3>
                                  <span className="rounded-full bg-indigo-600 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-white">{selectedYear}년도</span>
                               </div>
                               <p className="mt-2 text-sm font-bold text-slate-500">아동 상세정보 편집 화면입니다. 필요한 항목을 수정한 뒤 저장하세요.</p>
                               <div className="mt-4 flex flex-wrap gap-2">
                                 {Object.keys(selectedChild.yearlyData || {}).sort().map(year => (
                                   <button
                                     key={year}
                                     onClick={() => setSelectedYear(parseInt(year))}
                                     className={`rounded-xl border px-3 py-2 text-[11px] font-black ${selectedYear === parseInt(year) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200'}`}
                                   >
                                     {year}년
                                   </button>
                                 ))}
                               </div>
                            </div>
                         </div>
                         <div className="flex gap-3">
                            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-500 shadow-sm hover:bg-slate-50">{isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}</button>
                            <button onClick={handleSaveChildInfo} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-lg hover:bg-black"><Save className="w-4 h-4" /> 저장</button>
                         </div>
                      </div>
                   </div>

                   <div className="flex flex-wrap gap-3">
                     {[
                       { id: 'info', label: '기본 정보', icon: User },
                       { id: 'obs', label: '관찰 일지', icon: BookOpen },
                       { id: 'consult', label: '전문 상담', icon: ClipboardCheck },
                       { id: 'guardian', label: '보호자 상담', icon: MessageSquare },
                     ].map(tab => (
                       <button
                         key={tab.id}
                         onClick={() => setDetailTab(tab.id)}
                         className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black transition-all ${detailTab === tab.id ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                       >
                         <tab.icon className="w-4 h-4" />
                         {tab.label}
                       </button>
                     ))}
                   </div>

                   {detailTab === 'info' && editForm && (
                     <div className="space-y-6">
                       <div className="rounded-[2rem] border border-slate-200 bg-slate-900 px-7 py-6 text-white shadow-xl">
                         <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300">입력 폼 모드</p>
                         <h4 className="mt-2 text-2xl font-black tracking-tight">아동 상세정보 통합 수정</h4>
                         <p className="mt-2 text-sm font-bold text-slate-300">이름부터 보호자, 행정 항목까지 한 화면에서 수정할 수 있습니다.</p>
                       </div>

                       <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,0.85fr)]">
                         <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                           <div className="mb-5 border-b border-slate-100 pb-4">
                             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">기본 정보</p>
                             <h5 className="mt-2 text-xl font-black text-slate-900">개인 인적사항</h5>
                           </div>
                           <div className="grid gap-4 md:grid-cols-2">
                             <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">이름</label><input value={editForm.name || ''} onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                             <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">성별</label><input value={editForm.gender || ''} onChange={(e) => setEditForm(prev => ({ ...prev, gender: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                             <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">휴대폰</label><input value={editForm.phone || ''} onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                             <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">주민번호</label><div className="flex gap-2"><input value={showSsn ? (editForm.ssn || '') : maskSsn(editForm.ssn)} onChange={(e) => setEditForm(prev => ({ ...prev, ssn: e.target.value }))} className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /><button type="button" onClick={() => setShowSsn(prev => !prev)} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-slate-500 hover:bg-slate-100">{showSsn ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
                             <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">생년월일</label><input type="date" value={editForm.birth || ''} onChange={(e) => setEditForm(prev => ({ ...prev, birth: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                             <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">연령</label><input readOnly value={calculateAge(editForm.birth) || '미입력'} className="w-full rounded-2xl border border-slate-100 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-500 outline-none" /></div>
                           </div>
                         </section>

                         <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                           <div className="mb-5 border-b border-slate-100 pb-4">
                             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">학적 / 이용 정보</p>
                             <h5 className="mt-2 text-xl font-black text-slate-900">기관 이용 및 재원 정보</h5>
                           </div>
                           <div className="grid gap-4 md:grid-cols-2">
                             <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">학교</label><input value={editForm.school || ''} onChange={(e) => setEditForm(prev => ({ ...prev, school: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                             <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">학년</label><input value={editForm.grade || ''} onChange={(e) => setEditForm(prev => ({ ...prev, grade: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                             <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">입소일</label><input type="date" value={editForm.enrollment || ''} onChange={(e) => setEditForm(prev => ({ ...prev, enrollment: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                             <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">이전입소일</label><input type="date" value={editForm.prevEnrollment || ''} onChange={(e) => setEditForm(prev => ({ ...prev, prevEnrollment: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                             <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">퇴소일</label><input type="date" value={editForm.dischargeDate || ''} onChange={(e) => setEditForm(prev => ({ ...prev, dischargeDate: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                             <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">이용유형</label><input value={editForm.useType || ''} onChange={(e) => setEditForm(prev => ({ ...prev, useType: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                             <div className="space-y-2 md:col-span-2"><label className="text-[11px] font-black text-slate-500">주소</label><input value={editForm.address || ''} onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                           </div>
                         </section>

                         <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                           <div className="mb-5 border-b border-slate-100 pb-4">
                             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">보호자 / 행정 정보</p>
                             <h5 className="mt-2 text-xl font-black text-slate-900">보호자 및 운영 정보</h5>
                           </div>
                           <div className="space-y-4">
                             <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">보호자 성명</label><input value={editForm.guardianName || ''} onChange={(e) => setEditForm(prev => ({ ...prev, guardianName: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                             <div className="grid gap-4 md:grid-cols-2">
                               <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">보호자 관계</label><input value={editForm.guardianRel || ''} onChange={(e) => setEditForm(prev => ({ ...prev, guardianRel: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                               <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">유형</label><input value={editForm.guardianType || ''} onChange={(e) => setEditForm(prev => ({ ...prev, guardianType: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                             </div>
                             <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">연락처</label><input value={editForm.guardianContact || ''} onChange={(e) => setEditForm(prev => ({ ...prev, guardianContact: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                             <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">비고</label><textarea rows={3} value={editForm.notes || ''} onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                             <div className="grid gap-4 md:grid-cols-2">
                               <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">담당자</label><input value={editForm.manager || ''} onChange={(e) => setEditForm(prev => ({ ...prev, manager: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                               <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">키즈콜ID</label><input value={editForm.kidsCallId || ''} onChange={(e) => setEditForm(prev => ({ ...prev, kidsCallId: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                             </div>
                             <div className="grid gap-4 md:grid-cols-2">
                               <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">관리번호</label><input value={editForm.displayId || ''} onChange={(e) => setEditForm(prev => ({ ...prev, displayId: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                               <div className="space-y-2"><label className="text-[11px] font-black text-slate-500">카드ID</label><input value={editForm.cardId || ''} onChange={(e) => setEditForm(prev => ({ ...prev, cardId: e.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></div>
                             </div>
                           </div>
                         </section>
                       </div>
                     </div>
                   )}

                   {detailTab === 'obs' && (
                     <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                       <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                         <div>
                           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">관찰 일지</p>
                           <h4 className="mt-2 text-xl font-black text-slate-900">연도별 관찰 기록</h4>
                         </div>
                         <span className="rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-black text-slate-500">{currentYearLogs.observation?.length || 0}건</span>
                       </div>
                       <div className="mt-5 space-y-4">
                         {currentYearLogs.observation?.length > 0 ? currentYearLogs.observation.map((log, idx) => (
                           <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                             <div className="text-[11px] font-black text-indigo-600">{log.date}</div>
                             <div className="mt-2 text-sm font-bold text-slate-700">{log.content}</div>
                           </div>
                         )) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm font-bold text-slate-400">등록된 관찰 일지가 없습니다.</div>}
                       </div>
                     </div>
                   )}

                   {detailTab === 'consult' && (
                     <div className="grid gap-6 lg:grid-cols-2">
                       {[
                         { label: '상반기 전문 상담', data: currentYearLogs.h1 },
                         { label: '하반기 전문 상담', data: currentYearLogs.h2 },
                       ].map(item => (
                         <div key={item.label} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">전문 상담</p>
                           <h4 className="mt-2 text-xl font-black text-slate-900">{item.label}</h4>
                           <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-700 min-h-[180px]">
                             {item.data?.content || '등록된 상담 내용이 없습니다.'}
                           </div>
                         </div>
                       ))}
                     </div>
                   )}

                   {detailTab === 'guardian' && (
                     <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">보호자 상담</p>
                       <h4 className="mt-2 text-xl font-black text-slate-900">보호자 상담 이력</h4>
                       <div className="mt-5 space-y-4">
                         {currentYearLogs.guardian?.length > 0 ? currentYearLogs.guardian.map((log, idx) => (
                           <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                             <div className="text-[11px] font-black text-indigo-600">{log.date || '날짜 미입력'}</div>
                             <div className="mt-2 text-sm font-bold text-slate-700">{log.content || '내용 없음'}</div>
                           </div>
                         )) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm font-bold text-slate-400">등록된 보호자 상담 이력이 없습니다.</div>}
                       </div>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}
      </div>

      {/* 신규 아동 등록 모달 */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] shadow-3xl relative z-10 overflow-hidden"
            >
              <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500 rounded-2xl"><Plus className="w-6 h-6 text-white" /></div>
                  <div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter m-0">신규 아동 시스템 등록</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest m-0 mt-1">RFID 카드 연동 및 기본 정보 입력</p>
                  </div>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X className="w-6 h-6" /></button>
              </div>

              <div className="p-12 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">성명 (필수)</label>
                    <input type="text" value={newChild.name} onChange={e => setNewChild({...newChild, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 font-black outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" placeholder="이름 입력" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">RFID 카드 ID (필수)</label>
                    <input type="text" value={newChild.cardId} onChange={e => setNewChild({...newChild, cardId: e.target.value.toUpperCase()})} className="w-full bg-slate-900 text-emerald-400 border-none rounded-2xl py-4 px-6 font-black tracking-widest outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all" placeholder="예: E7FDCD66" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">성별</label>
                    <div className="flex gap-2">
                      {['남', '여'].map(g => (
                        <button key={g} onClick={() => setNewChild({...newChild, gender: g})} className={`flex-1 py-4 rounded-2xl font-black transition-all ${newChild.gender === g ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>{g}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">생년월일</label>
                    <input type="date" value={newChild.birth} onChange={e => setNewChild({...newChild, birth: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 font-black outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">학교 정보 / 학년</label>
                  <div className="flex gap-4">
                    <input type="text" value={newChild.school} onChange={e => setNewChild({...newChild, school: e.target.value})} className="flex-[2] bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 font-black outline-none placeholder:font-bold" placeholder="학교명" />
                    <select value={newChild.grade} onChange={e => setNewChild({...newChild, grade: e.target.value})} className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 font-black outline-none">
                      {[1,2,3,4,5,6].map(g => <option key={g} value={g}>{g}학년</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">보호자 성함</label>
                    <input type="text" value={newChild.guardian} onChange={e => setNewChild({...newChild, guardian: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 font-black outline-none" placeholder="보호자 성명" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">연락처</label>
                    <input type="text" value={newChild.contact} onChange={e => setNewChild({...newChild, contact: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 font-black outline-none" placeholder="010-0000-0000" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">실거주 주소</label>
                  <input type="text" value={newChild.address} onChange={e => setNewChild({...newChild, address: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 font-black outline-none" placeholder="상세 주소 입력" />
                </div>
              </div>

              <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4">
                <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-5 bg-white border border-slate-200 text-slate-500 rounded-3xl font-black text-[12px] uppercase tracking-widest shadow-sm hover:bg-slate-100 transition-all">취소</button>
                <button onClick={handleAddChild} className="flex-[2] py-5 bg-emerald-600 text-white rounded-3xl font-black text-[12px] uppercase tracking-widest shadow-2xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all">아동 정보 저장 및 카드 연동</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChildrenPage;





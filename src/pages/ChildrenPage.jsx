import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import starInfoBg from '../assets/star-info-bg.webp';
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
  EyeOff
} from 'lucide-react';

const ChildrenPage = () => {
  // --- 글로벌 시스템 상태 ---
  const userRole = localStorage.getItem('userRole') || 'ADMIN';
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [activeTab, setActiveTab] = useState('active'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [gradeFilter, setGradeFilter] = useState('전체');
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [detailTab, setDetailTab] = useState('info');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newChild, setNewChild] = useState({ name: '', gender: '남', birth: '', school: '', grade: 1, address: '', guardian: '', contact: '', cardId: '' });

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editInfoForm, setEditInfoForm] = useState(null);
  const [showSsn, setShowSsn] = useState(false);

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
        id: 1, name: '김민수', birth: '2011-05-12', gender: '남', photo: null, enrollment: '2018-03-02', prevEnrollment: '2016-03-01', dischargeDate: '', useType: '일반', manager: '박선생', notes: '알러지 주의 (견과류)', cardId: 'E7FDCD66', displayId: 'NF1000', ssn: '110512-3XXXXXX', phone: '010-1234-5678',
        // 9년 장기 히스토리 (초1 -> 중3)
        yearlyData: {
          2018: { school: '숲속초등학교', grade: 1, address: '서울시 강남구 A단지', guardian: '김철수', guardianRel: '부', guardianType: '주보호자', contact: '010-1111-1111' },
          2019: { school: '숲속초등학교', grade: 2, address: '서울시 강남구 A단지', guardian: '김철수', guardianRel: '부', guardianType: '주보호자', contact: '010-1111-1111' },
          2020: { school: '숲속초등학교', grade: 3, address: '서울시 강남구 B빌라', guardian: '김철수', guardianRel: '부', guardianType: '주보호자', contact: '010-2222-2222' },
          2021: { school: '숲속초등학교', grade: 4, address: '서울시 강남구 B빌라', guardian: '김철수', guardianRel: '부', guardianType: '주보호자', contact: '010-2222-2222' },
          2022: { school: '숲속초등학교', grade: 5, address: '서울시 서초구 C아파트', guardian: '김철수', guardianRel: '부', guardianType: '주보호자', contact: '010-3333-3333' },
          2023: { school: '숲속초등학교', grade: 6, address: '서울시 서초구 C아파트', guardian: '김철수', guardianRel: '부', guardianType: '주보호자', contact: '010-3333-3333' },
          2024: { school: '숲속중학교', grade: '중1', address: '서울시 서초구 D단지', guardian: '김철수', guardianRel: '부', guardianType: '주보호자', contact: '010-4444-4444' },
          2025: { school: '숲속중학교', grade: '중2', address: '서울시 서초구 D단지', guardian: '김철수', guardianRel: '부', guardianType: '주보호자', contact: '010-4444-4444' },
          2026: { school: '숲속중학교', grade: '중3', address: '서울시 서초구 D단지', guardian: '김철수', guardianRel: '부', guardianType: '주보호자', contact: '010-1234-5678' }
        },
        logs: { 
          2018: { observation: [{ date: '2018-03-12', content: '1학년 입학! 너무 귀엽고 씩씩함.' }], h1: { date: '2018-05-10', content: '적응 아주 빠름' }, h2: { date: '2018-11-20', content: '친구들과 잘 어울림' }, guardian: [] },
          2026: { observation: [{ date: '2026-03-10', content: '중3 사춘기 없이 성숙함. 진로 고민 중.' }], h1: { date: '2026-03-15', content: '진로 집중 상담' }, h2: null, guardian: [] }
        },
        attendance: {}
      },
      { 
        id: 2, name: '이영희', birth: '2018-11-20', gender: '여', photo: null, enrollment: '2025-03-02', cardId: 'A1B2C3D4', prevEnrollment: '', dischargeDate: '', useType: '돌봄', manager: '김선생', notes: '', ssn: '181120-4XXXXXX', phone: '',
        yearlyData: {
          2025: { school: '산새초등학교', grade: 1, address: '서울시 서초구 서초대로', guardian: '박영순', guardianRel: '모', guardianType: '주보호자', contact: '010-9999-8888' },
          2026: { school: '숲속초등학교', grade: 2, address: '서울시 서초구 서초대로', guardian: '박영순', guardianRel: '모', guardianType: '주보호자', contact: '010-4321-8765' }
        },
        logs: { 2025: { observation: [], h1: { date: '2025-05-02', content: '입소 초기 상담' }, h2: null, guardian: [] }, 2026: { observation: [], h1: null, h2: null, guardian: [] } },
        attendance: {}
      },
      {
        id: 3, name: '박지훈', birth: '2019-02-15', gender: '남', photo: null, enrollment: '2026-03-02', cardId: 'BG774211', prevEnrollment: '', dischargeDate: '', useType: '단기', manager: '최선생', notes: '', ssn: '190215-3XXXXXX', phone: '',
        yearlyData: {
          2026: { school: '푸른들초등학교', grade: 1, address: '서울시 송파구 잠실동', guardian: '박철웅', guardianRel: '부', guardianType: '주보호자', contact: '010-5555-5555' }
        },
        logs: { 2026: { observation: [], h1: null, h2: null, guardian: [] } },
        attendance: {}
      },
      {
        id: 4, 
        name: '정우성', 
        birth: '2018-05-20', 
        gender: '남', 
        photo: null, 
        enrollment: '2026-03-02', 
        displayId: 'NF561136', 
        cardId: '37B0B566',    
        prevEnrollment: '', dischargeDate: '', useType: '일반', manager: '박선생', notes: '', ssn: '180520-3XXXXXX', phone: '',
        yearlyData: { 2026: { school: '숲속초등학교', grade: 2, address: '서울시 서초구', guardian: '정철학', guardianRel: '조부', guardianType: '부보호자', contact: '010-8888-8888' } },
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
      ssn: '',
      phone: '',
      gender: newChild.gender,
      photo: null,
      enrollment: new Date().toISOString().split('T')[0],
      prevEnrollment: '',
      dischargeDate: '',
      useType: '일반',
      manager: '',
      notes: '',
      cardId: newChild.cardId,
      displayId: '',
      yearlyData: {
        [selectedYear]: {
          school: newChild.school,
          grade: parseInt(newChild.grade),
          address: newChild.address,
          guardian: newChild.guardian,
          guardianRel: '부',
          guardianType: '주보호자',
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

  const handleSaveEditInfo = () => {
    if (!editInfoForm) return;
    setChildren(prev => prev.map(c => {
      if (selectedChildId === c.id) {
        return {
          ...c,
          name: editInfoForm.name,
          gender: editInfoForm.gender,
          birth: editInfoForm.birth,
          ssn: editInfoForm.ssn,
          phone: editInfoForm.phone,
          cardId: editInfoForm.cardId,
          displayId: editInfoForm.displayId,
          enrollment: editInfoForm.enrollment,
          prevEnrollment: editInfoForm.prevEnrollment,
          dischargeDate: editInfoForm.dischargeDate,
          useType: editInfoForm.useType,
          manager: editInfoForm.manager,
          notes: editInfoForm.notes,
          yearlyData: {
            ...c.yearlyData,
            [selectedYear]: {
              ...(c.yearlyData?.[selectedYear] || {}),
              school: editInfoForm.school,
              grade: editInfoForm.grade,
              address: editInfoForm.address,
              guardian: editInfoForm.guardian,
              guardianRel: editInfoForm.guardianRel,
              guardianType: editInfoForm.guardianType,
              contact: editInfoForm.contact
            }
          }
        };
      }
      return c;
    }));
    setIsEditingInfo(false);
  };


  const selectedChild = useMemo(() => children.find(c => c.id === selectedChildId), [children, selectedChildId]);
  
  const currentYearData = useMemo(() => {
    if (!selectedChild) return null;
    return selectedChild.yearlyData?.[selectedYear] || null;
  }, [selectedChild, selectedYear]);

  const filteredChildren = useMemo(() => {
    return children.filter(c => {
      const yearData = c.yearlyData?.[selectedYear];
      if (!yearData) return false; // 해당 연도 데이터 없으면 제외

      // 1. 상태 필터 (퇴소 여부)
      if (statusFilter === '재원중' && c.dischargeDate) return false;
      if (statusFilter === '퇴소' && !c.dischargeDate) return false;

      // 2. 학년 필터
      if (gradeFilter !== '전체' && String(yearData.grade) !== String(gradeFilter)) return false;

      // 3. 텍스트 검색 (이름, 학교, 보호자, 카드ID)
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch = 
          c.name.toLowerCase().includes(q) ||
          (yearData.school && yearData.school.toLowerCase().includes(q)) ||
          (yearData.guardian && yearData.guardian.toLowerCase().includes(q)) ||
          (c.cardId && c.cardId.toLowerCase().includes(q)) ||
          (c.displayId && c.displayId.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [children, searchQuery, selectedYear, statusFilter, gradeFilter]);

  const currentYearLogs = useMemo(() => {
    if (!selectedChild) return null;
    return selectedChild.logs?.[selectedYear] || { observation: [], h1: null, h2: null, guardian: [] };
  }, [selectedChild, selectedYear]);

  const fileInputRef = useRef(null);

  const handleAttendanceImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array', codepage: 65001 }); // UTF-8로 시도
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (jsonRows.length < 2) return;

        let newChildren = [...children];
        let currentYearMonth = null;
        let isDataSection = false;
        let importedCount = 0;
        let newChildrenAdded = 0;

        jsonRows.forEach((row) => {
          if (!row || row.length === 0) return;

          // 문자열 정규화 및 트림 함수
          const clean = (val) => String(val || '').trim().normalize('NFC');

          // 월 정보 행 찾기 (예: ,일자,2026년02월,,,,)
          const dateCell = clean(row[2]);
          if (clean(row[1]) === '일자' && dateCell) {
            const match = dateCell.match(/(\d{4})년(\d{1,2})월/);
            if (match) {
              currentYearMonth = { year: match[1], month: match[2].padStart(2, '0') };
            }
            isDataSection = false;
          }

          // 데이터 시작 행 찾기 (번호,이름,학교,1일,2일...)
          if (clean(row[0]) === '번호' && clean(row[1]) === '이름') {
            isDataSection = true;
            return;
          }

          // 데이터 섹션 처리
          if (isDataSection && currentYearMonth && row[1]) {
            const name = clean(row[1]);
            if (name === '이름' || name === '') return;

            // 아동 찾기 또는 생성
            let childIndex = newChildren.findIndex(c => clean(c.name) === name);
            if (childIndex === -1) {
              // 아동이 없으면 자동 등록
              const newId = Date.now() + Math.random();
              const newChildData = {
                id: newId,
                name: name,
                birth: '',
                gender: clean(row[38]) || '미지정', // 성별 열 (인덱스 보정 필요할 수 있음)
                cardId: `IMP_${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                yearlyData: {
                  [currentYearMonth.year]: {
                    school: clean(row[2]) || '',
                    grade: 1,
                    address: '',
                    guardian: '',
                    contact: ''
                  }
                },
                logs: {
                  [currentYearMonth.year]: { observation: [], h1: null, h2: null, guardian: [] }
                },
                attendance: {}
              };
              newChildren.push(newChildData);
              childIndex = newChildren.length - 1;
              newChildrenAdded++;
            }

            // 1일부터 31일까지 출결 확인 (인덱스 3 ~ 33)
            for (let day = 1; day <= 31; day++) {
              const status = clean(row[day + 2]);
              const dateKey = `${currentYearMonth.year}-${currentYearMonth.month}-${String(day).padStart(2, '0')}`;
              
              if (['출석', '출', 'O', 'V', '1'].includes(status)) {
                newChildren[childIndex].attendance[dateKey] = {
                  status: 'PRESENT',
                  time: '09:00:00',
                  memo: 'CSV 통합 임포트'
                };
                importedCount++;
              } else if (['결석', 'X', '0'].includes(status)) {
                newChildren[childIndex].attendance[dateKey] = {
                  status: 'ABSENT',
                  time: '-',
                  memo: 'CSV 통합 임포트'
                };
              }
            }
          }
        });

        setChildren(newChildren);
        alert(`${newChildrenAdded}명의 아동을 새로 등록하고, ${importedCount}건의 출결 기록을 통합했습니다.`);
      } catch (err) {
        console.error(err);
        alert('파일을 읽는 중 오류가 발생했습니다. CSV 형식을 확인해 주세요.');
      }
    };
    reader.readAsArrayBuffer(file);
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
                    {selectedMonth}월 출결 현황 대장 <span className="text-indigo-600">.</span>
                  </h3>
                </div>
                 <div className="flex gap-4">
                   <div className="relative">
                     <button 
                       onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                       className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-black text-[11px] flex items-center gap-2"
                     >
                       {selectedMonth}월 <ChevronDown className="w-4 h-4" />
                     </button>
                     <AnimatePresence>
                       {isMonthPickerOpen && (
                         <motion.div 
                           initial={{ opacity: 0, scale: 0.95 }}
                           animate={{ opacity: 1, scale: 1 }}
                           exit={{ opacity: 0, scale: 0.95 }}
                           className="absolute top-full right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 p-2 grid grid-cols-3 gap-1 w-48"
                         >
                           {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                             <button 
                               key={m} 
                               onClick={() => { setSelectedMonth(m); setIsMonthPickerOpen(false); }}
                               className={`p-2 rounded-lg text-xs font-black transition-all ${selectedMonth === m ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50'}`}
                             >
                               {m}월
                             </button>
                           ))}
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>
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
                          const date = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(i+1).padStart(2, '0')}`;
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
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6 mb-2">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight m-0">기관 아동 명부</h3>
                   <p className="text-xs font-medium text-slate-500 m-0 mt-1">{selectedYear}년도 데이터베이스 · {filteredChildren.length}명 검색됨</p>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                   <select 
                     value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                     className="w-full md:w-auto px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer text-slate-700"
                   >
                     <option value="전체">상태: 전체보기</option>
                     <option value="재원중">상태: 재원중</option>
                     <option value="퇴소">상태: 퇴소 이력</option>
                   </select>

                   <select 
                     value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}
                     className="w-full md:w-auto px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer text-slate-700"
                   >
                     <option value="전체">학년: 전체보기</option>
                     <option value="1">1학년</option>
                     <option value="2">2학년</option>
                     <option value="3">3학년</option>
                     <option value="4">4학년</option>
                     <option value="5">5학년</option>
                     <option value="6">6학년</option>
                     <option value="중1">중학교 1학년</option>
                     <option value="중2">중학교 2학년</option>
                     <option value="중3">중학교 3학년</option>
                   </select>

                   <div className="relative w-full md:w-64 shrink-0">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="이름, 학교명 검색..."
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                      />
                   </div>
                </div>
             </div>

             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-500 font-bold text-xs border-b border-slate-200">
                         <tr>
                            <th className="px-6 py-4 hidden md:table-cell w-16 text-center">No.</th>
                            <th className="px-6 py-4">성명 및 기본 정보</th>
                            <th className="px-6 py-4">학교 및 거주지</th>
                            <th className="px-6 py-4 text-center">이용유형 / 학년</th>
                            <th className="px-6 py-4 hidden lg:table-cell">입/퇴소 이력</th>
                            <th className="px-6 py-4 text-right">기록 관리</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {filteredChildren.map((child, index) => {
                           const yearData = child.yearlyData?.[selectedYear] || {};
                           return (
                           <tr key={child.id} onClick={() => setSelectedChildId(child.id)} className="group hover:bg-slate-50 transition-all cursor-pointer">
                              <td className="px-6 py-4 hidden md:table-cell text-center text-slate-400 font-bold text-xs">{String(index + 1).padStart(2, '0')}</td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-full border border-indigo-100 flex items-center justify-center shrink-0 overflow-hidden text-indigo-500 font-black">
                                      {child.photo ? <img src={child.photo} className="w-full h-full object-cover" /> : child.name.slice(0,1)}
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{child.name}</span>
                                       <div className="flex items-center gap-2 mt-1">
                                         <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{child.displayId || 'ID미정'}</span>
                                         <span className="text-[10px] font-medium text-slate-400">{child.phone || '연락처 없음'}</span>
                                       </div>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-4 flex flex-col justify-center min-h-[72px]">
                                 <span className="font-bold text-slate-700 block">{yearData.school || '미지정'}</span>
                                 <span className="text-[10px] text-slate-400 block truncate max-w-[200px] mt-0.5">{yearData.address || '주소지 정보 없음'}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <div className="flex flex-col items-center gap-1.5">
                                   <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-black">{child.useType || '일반결정'}</span>
                                   <span className="text-xs font-bold text-slate-500">{yearData.grade || '?'}학년</span>
                                 </div>
                              </td>
                              <td className="px-6 py-4 hidden lg:table-cell">
                                <div className="flex flex-col">
                                   <span className="text-xs font-bold text-slate-600 border-b border-slate-100 pb-1 mb-1 max-w-max">입: {child.enrollment || '정보없음'}</span>
                                   {child.dischargeDate ? (
                                     <span className="text-[10px] font-bold text-rose-500 tracking-tight">퇴소: {child.dischargeDate}</span>
                                   ) : (
                                     <span className="text-[10px] font-bold text-emerald-500 tracking-widest text-center uppercase bg-emerald-50 px-2 py-0.5 rounded max-w-max">이용중</span>
                                   )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-xs group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all shadow-sm">상세 기록</button>
                              </td>
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
          <div className="flex-1 flex w-full animate-in fade-in duration-500">
             {/* 사이드바 리스트 (선택 항목 이동) */}
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: isSidebarCollapsed ? '0px' : '380px' }}
               className="bg-white border-r border-slate-200 flex flex-col shrink-0 h-full overflow-hidden shadow-2xl relative z-40"
             >
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white">
                   <h4 className="text-xs font-bold text-slate-900 m-0">아동 선택 리스트</h4>
                   <button onClick={() => setSelectedChildId(null)} className="p-2 hover:bg-slate-100 text-slate-500 rounded-lg transition-all"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-4 border-b border-slate-200 bg-white">
                   <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="빠른 필터링..."
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 p-4 bg-slate-50 scroll-smooth">
                   {filteredChildren.map(child => {
                     const yearData = child.yearlyData?.[selectedYear] || {};
                     return (
                     <div 
                       key={child.id} 
                       onClick={() => setSelectedChildId(child.id)}
                       className={`p-4 rounded-xl cursor-pointer transition-all border flex items-center gap-4 ${selectedChildId === child.id ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500' : 'bg-white border-transparent hover:border-slate-200 shadow-sm'}`}
                     >
                        <div className={`w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden ${selectedChildId === child.id ? 'bg-indigo-50' : 'bg-slate-100'}`}>
                           {child.photo ? <img src={child.photo} className="w-full h-full object-cover" /> : <User className={`w-5 h-5 ${selectedChildId === child.id ? 'text-indigo-400' : 'text-slate-400'}`} />}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-bold text-slate-900 truncate">{child.name}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${selectedChildId === child.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{yearData.grade || '?'}학년</span>
                           </div>
                           <p className={`text-[11px] font-medium truncate m-0 ${selectedChildId === child.id ? 'text-indigo-600' : 'text-slate-500'}`}>{yearData.school || '미지정'}</p>
                        </div>
                     </div>
                   )})}
                </div>
             </motion.div>

             {/* 상세 기록 영역 */}
             {/* 상세 기록 영역 */}
             <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 md:p-8 custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-6">
                   {/* 아동 카드 메인 */}
                   <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group/card">
                      
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10 mb-10 gap-6">
                         <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 w-full md:w-auto">
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-slate-50 bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                               {selectedChild.photo ? <img src={selectedChild.photo} className="w-full h-full object-cover" /> : <User className="w-10 h-10 md:w-12 md:h-12 text-slate-300" />}
                            </div>
                            <div className="space-y-4 w-full md:w-auto">
                               <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                  <h3 className="text-3xl md:text-4xl font-black text-slate-900 m-0 tracking-tight">{selectedChild.name}</h3>
                                  <div className="flex items-center gap-2">
                                     <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-md text-xs font-bold border border-indigo-100">{selectedYear}년 데이터</span>
                                  </div>
                               </div>

                               {/* 개별 아동 데이터 보유 연도 타임라인 */}
                               <div className="flex flex-col space-y-2">
                                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                                     <History className="w-4 h-4" /> 연도별 기록
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                     {Object.keys(selectedChild.yearlyData).sort().map(year => (
                                        <button 
                                          key={year}
                                          onClick={() => setSelectedYear(parseInt(year))}
                                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${selectedYear === parseInt(year) ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                           {year}년
                                        </button>
                                     ))}
                                  </div>
                               </div>

                               <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-600 pt-2">
                                  <span className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200"><GraduationCap className="w-4 h-4 text-slate-400" /> {currentYearData?.school || '미지정'}</span>
                                  <span className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200"><MapPin className="w-4 h-4 text-slate-400" /> {currentYearData?.address?.split(' ')[1] || '정보 없음'} 지역</span>
                               </div>
                            </div>
                         </div>
                         <div className="flex gap-3 w-full md:w-auto justify-end">
                            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-all text-slate-500 hidden md:block">
                               {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                            </button>
                            <button className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-sm shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                               <Printer className="w-4 h-4" /> 레포트 출력
                            </button>
                         </div>
                      </div>

                      {/* 상세 기록 서브 탭 */}
                      <div className="flex gap-2 relative z-10 border-t border-slate-200 pt-6 overflow-x-auto pb-2 custom-scrollbar">
                         {[
                           { id: 'info', label: '기본 정보', icon: User },
                           { id: 'obs', label: '관찰 일지', icon: BookOpen, count: currentYearLogs.observation?.length },
                           { id: 'consult', label: '전문 상담', icon: ClipboardCheck, alert: !currentYearLogs.h1 || !currentYearLogs.h2 },
                           { id: 'guardian', label: '보호자 상담', icon: MessageSquare }
                         ].map(tab => (
                           <button key={tab.id} onClick={() => setDetailTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all relative border whitespace-nowrap ${detailTab === tab.id ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-500 hover:bg-slate-50 border-transparent hover:border-slate-200'}`}>
                              <tab.icon className="w-4 h-4" />
                              {tab.label}
                              {tab.count > 0 && <span className={`ml-2 px-2 py-1 rounded-lg text-[10px] ${detailTab === tab.id ? 'bg-white text-indigo-600 font-black' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span>}
                              {tab.alert && <div className="absolute top-3 right-3 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse" />}
                           </button>
                         ))}
                      </div>

                       <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 md:p-8 min-h-[400px] shadow-sm">
                         <div className="flex justify-between items-center mb-6">
                            <span className="text-xs font-bold text-slate-400">데이터베이스 동기화: 활성화</span>
                         </div>
                         
                         {detailTab === 'info' && (
                           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                              <div className="flex items-center justify-between mb-2">
                                 <div>
                                    <h4 className="text-lg font-black tracking-tight text-slate-900 m-0">상세 기록 열람</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">등록번호 {selectedChild.id.toString().padStart(6, '0')} · 최종 등록 연도 {selectedYear}년</p>
                                 </div>
                                 {isEditingInfo ? (
                                   <div className="flex gap-2">
                                     <button onClick={() => setIsEditingInfo(false)} className="px-5 py-2.5 text-xs font-black text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all">취소</button>
                                     <button onClick={handleSaveEditInfo} className="px-5 py-2.5 text-xs font-black text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all">저장 완료</button>
                                   </div>
                                 ) : (
                                   <button onClick={() => {
                                     setEditInfoForm({
                                       name: selectedChild.name,
                                       gender: selectedChild.gender,
                                       birth: selectedChild.birth,
                                       ssn: selectedChild.ssn || '',
                                       phone: selectedChild.phone || '',
                                       cardId: selectedChild.cardId,
                                       displayId: selectedChild.displayId || '',
                                       enrollment: selectedChild.enrollment || '',
                                       prevEnrollment: selectedChild.prevEnrollment || '',
                                       dischargeDate: selectedChild.dischargeDate || '',
                                       useType: selectedChild.useType || '일반',
                                       manager: selectedChild.manager || '',
                                       notes: selectedChild.notes || '',
                                       school: currentYearData?.school || '',
                                       grade: currentYearData?.grade || '',
                                       address: currentYearData?.address || '',
                                       guardian: currentYearData?.guardian || '',
                                       guardianRel: currentYearData?.guardianRel || '부',
                                       guardianType: currentYearData?.guardianType || '주보호자',
                                       contact: currentYearData?.contact || ''
                                     });
                                     setIsEditingInfo(true);
                                   }} className="px-5 py-2.5 text-xs font-black text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition-all flex items-center gap-2">
                                     정보 수정
                                   </button>
                                 )}
                              </div>

                              {/* Section 1: 아동 신원 정보 */}
                              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                 <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/50">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    <h5 className="text-xs font-black text-slate-900 m-0 uppercase tracking-widest">기본 신원 정보</h5>
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">아동 성명</label>
                                       <input type="text" readOnly={!isEditingInfo} value={isEditingInfo ? editInfoForm.name : selectedChild.name} onChange={e => setEditInfoForm({...editInfoForm, name: e.target.value})} className={`w-full rounded-xl py-3 px-4 font-black shadow-none transition-all ${isEditingInfo ? 'bg-white border-2 border-indigo-200 focus:border-indigo-500 text-slate-900' : 'bg-transparent border-0 text-slate-900 px-0'}`} />
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">생년월일 (성별)</label>
                                       <div className="flex gap-2">
                                         <input type="text" readOnly={!isEditingInfo} value={isEditingInfo ? editInfoForm.birth : selectedChild.birth} onChange={e => setEditInfoForm({...editInfoForm, birth: e.target.value})} className={`w-32 rounded-xl py-3 px-4 font-black transition-all ${isEditingInfo ? 'bg-white border-2 border-indigo-200 focus:border-indigo-500 text-slate-900' : 'bg-transparent border-0 text-slate-900 px-0'}`} />
                                         <input type="text" readOnly={!isEditingInfo} value={isEditingInfo ? editInfoForm.gender : selectedChild.gender} onChange={e => setEditInfoForm({...editInfoForm, gender: e.target.value})} className={`w-16 rounded-xl py-3 px-4 font-black text-center transition-all ${isEditingInfo ? 'bg-white border-2 border-indigo-200 focus:border-indigo-500 text-slate-900' : 'bg-transparent border-0 text-slate-500 px-0'}`} />
                                       </div>
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                          주민등록번호
                                          {!isEditingInfo && (
                                            <button onClick={() => setShowSsn(!showSsn)} className="flex items-center gap-1 text-slate-400 hover:text-indigo-500 transition-colors">
                                              {showSsn ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                            </button>
                                          )}
                                       </label>
                                       <input type="text" readOnly={!isEditingInfo} value={isEditingInfo ? editInfoForm.ssn : (showSsn ? (selectedChild.ssn || '미입력') : '●●●●●●-●●●●●●●')} onChange={e => setEditInfoForm({...editInfoForm, ssn: e.target.value})} className={`w-full rounded-xl py-3 px-4 font-black tracking-widest transition-all ${isEditingInfo ? 'bg-white border-2 border-indigo-200 focus:border-indigo-500 text-slate-900' : 'bg-transparent border-0 text-slate-900 px-0'}`} placeholder="미입력" />
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">본인 휴대폰</label>
                                       <input type="text" readOnly={!isEditingInfo} value={isEditingInfo ? editInfoForm.phone : (selectedChild.phone || '미입력')} onChange={e => setEditInfoForm({...editInfoForm, phone: e.target.value})} className={`w-full rounded-xl py-3 px-4 font-black transition-all ${isEditingInfo ? 'bg-white border-2 border-indigo-200 focus:border-indigo-500 text-slate-900' : 'bg-transparent border-0 text-slate-900 px-0'}`} placeholder="미입력" />
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">하드웨어/카드 ID</label>
                                       <div className="flex gap-2">
                                          <input type="text" readOnly={!isEditingInfo} value={isEditingInfo ? editInfoForm.displayId : (selectedChild.displayId || 'N/A')} onChange={e => setEditInfoForm({...editInfoForm, displayId: e.target.value})} className={`w-20 rounded-xl py-3 px-4 font-bold text-center transition-all ${isEditingInfo ? 'bg-white border-2 border-indigo-200 text-slate-900' : 'bg-slate-200/50 border-0 text-slate-500'}`} placeholder="번호" />
                                          <input type="text" readOnly={!isEditingInfo} value={isEditingInfo ? editInfoForm.cardId : selectedChild.cardId} onChange={e => setEditInfoForm({...editInfoForm, cardId: e.target.value})} className={`flex-1 rounded-xl py-3 px-4 font-black tracking-widest transition-all ${isEditingInfo ? 'bg-white border-2 border-indigo-200 text-slate-900' : 'bg-slate-900 text-emerald-400 border-none'}`} placeholder="RFID" />
                                       </div>
                                    </div>
                                 </div>
                              </div>

                              {/* Section 2: 학적 및 거주지 */}
                              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                 <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/50">
                                    <GraduationCap className="w-4 h-4 text-indigo-500" />
                                    <h5 className="text-xs font-black text-slate-900 m-0 uppercase tracking-widest">학적 및 거주지 정보</h5>
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="space-y-2 md:col-span-2">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">학교명 및 학년</label>
                                       {isEditingInfo ? (
                                          <div className="flex gap-2">
                                             <input type="text" value={editInfoForm.school} onChange={e => setEditInfoForm({...editInfoForm, school: e.target.value})} className="flex-1 bg-white border-2 border-indigo-200 rounded-xl py-3 px-4 font-black outline-none" placeholder="학교명" />
                                             <input type="text" value={editInfoForm.grade} onChange={e => setEditInfoForm({...editInfoForm, grade: e.target.value})} className="w-20 bg-white border-2 border-indigo-200 rounded-xl py-3 px-4 font-black outline-none text-center" placeholder="학년" />
                                          </div>
                                       ) : (
                                          <input type="text" readOnly value={`${currentYearData?.school || '미입력'} (${currentYearData?.grade || '?'}학년)`} className="w-full bg-transparent border-0 py-3 font-black text-slate-900" />
                                       )}
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">실거주 매핑 주소</label>
                                       <input type="text" readOnly={!isEditingInfo} value={isEditingInfo ? editInfoForm.address : (currentYearData?.address || '데이터 없음')} onChange={e => setEditInfoForm({...editInfoForm, address: e.target.value})} className={`w-full rounded-xl py-3 px-4 font-black transition-all ${isEditingInfo ? 'bg-white border-2 border-indigo-200' : 'bg-transparent border-0 text-slate-900 px-0'}`} />
                                    </div>
                                 </div>
                              </div>

                              {/* Section 3: 보호자 정보 */}
                              <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                 <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200/50">
                                    <Users className="w-4 h-4 text-amber-500" />
                                    <h5 className="text-xs font-black text-slate-900 m-0 uppercase tracking-widest">보호자 비상 연락망</h5>
                                 </div>
                                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">성명</label>
                                       <input type="text" readOnly={!isEditingInfo} value={isEditingInfo ? editInfoForm.guardian : (currentYearData?.guardian || '미입력')} onChange={e => setEditInfoForm({...editInfoForm, guardian: e.target.value})} className={`w-full rounded-xl py-3 px-4 font-black transition-all ${isEditingInfo ? 'bg-white border-2 border-indigo-200' : 'bg-transparent border-0 text-slate-900 px-0'}`} />
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">관계</label>
                                       {isEditingInfo ? (
                                         <select value={editInfoForm.guardianRel} onChange={e => setEditInfoForm({...editInfoForm, guardianRel: e.target.value})} className="w-full bg-white border-2 border-indigo-200 rounded-xl py-3 px-4 font-black outline-none">
                                           <option value="부">부</option>
                                           <option value="모">모</option>
                                           <option value="조부">조부</option>
                                           <option value="조모">조모</option>
                                           <option value="기타">기타</option>
                                         </select>
                                       ) : (
                                          <input type="text" readOnly value={currentYearData?.guardianRel || '미입력'} className="w-full bg-transparent border-0 py-3 font-black text-slate-900" />
                                       )}
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">연락처 <span className="px-2 py-0.5 bg-rose-100 text-rose-600 rounded text-[9px]">{currentYearData?.guardianType || '분류 없음'}</span></label>
                                       <input type="text" readOnly={!isEditingInfo} value={isEditingInfo ? editInfoForm.contact : (currentYearData?.contact || '미입력')} onChange={e => setEditInfoForm({...editInfoForm, contact: e.target.value})} className={`w-full rounded-xl py-3 px-4 font-black transition-all ${isEditingInfo ? 'bg-white border-2 border-indigo-200' : 'bg-transparent border-0 text-slate-900 px-0'}`} />
                                    </div>
                                 </div>
                              </div>

                              {/* Section 4: 센터 운영 데이터 */}
                              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                 <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500" />
                                 <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 pl-4">
                                    <LayoutGrid className="w-4 h-4 text-slate-400" />
                                    <h5 className="text-xs font-black text-slate-900 m-0 uppercase tracking-widest">센터 이용 행정 데이터</h5>
                                 </div>
                                 <div className="pl-4 grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">최종 입소일</label>
                                       {isEditingInfo ? (
                                         <input type="date" value={editInfoForm.enrollment} onChange={e => setEditInfoForm({...editInfoForm, enrollment: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-bold outline-none" />
                                       ) : (
                                         <div className="font-bold py-3 text-sm">{selectedChild.enrollment || '미지정'}</div>
                                       )}
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">이전 입소일</label>
                                       {isEditingInfo ? (
                                         <input type="date" value={editInfoForm.prevEnrollment} onChange={e => setEditInfoForm({...editInfoForm, prevEnrollment: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-bold outline-none" />
                                       ) : (
                                         <div className="font-bold py-3 text-sm text-slate-500">{selectedChild.prevEnrollment || '해당 없음'}</div>
                                       )}
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">퇴소 예정 / 확정일</label>
                                       {isEditingInfo ? (
                                         <input type="date" value={editInfoForm.dischargeDate} onChange={e => setEditInfoForm({...editInfoForm, dischargeDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-bold outline-none" />
                                       ) : (
                                         <div className="font-bold py-3 text-sm text-slate-500">{selectedChild.dischargeDate || '해당 없음'}</div>
                                       )}
                                    </div>
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">이용 유형</label>
                                       {isEditingInfo ? (
                                         <select value={editInfoForm.useType} onChange={e => setEditInfoForm({...editInfoForm, useType: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-bold outline-none">
                                           <option value="일반">일반아동</option>
                                           <option value="돌봄">우선돌봄</option>
                                           <option value="단기">단기이용</option>
                                         </select>
                                       ) : (
                                         <div className="font-bold py-3 text-sm text-indigo-600">{selectedChild.useType || '일반결정'}</div>
                                       )}
                                    </div>
                                 </div>
                                 <div className="pl-4 mt-6 grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">행정 특이 메모 / 비고</label>
                                       {isEditingInfo ? (
                                         <textarea value={editInfoForm.notes} onChange={e => setEditInfoForm({...editInfoForm, notes: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-4 font-bold outline-none min-h-[100px] resize-y" placeholder="알러지, 귀가 관련 등 특이사항 기재" />
                                       ) : (
                                         <div className="font-medium p-4 bg-slate-50 rounded-xl text-sm text-slate-700 min-h-[80px]">{selectedChild.notes || '등록된 비고 사항이 없습니다.'}</div>
                                       )}
                                    </div>
                                 </div>
                              </div>
                           </div>
                         )}

                         {detailTab === 'obs' && (
                           <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                 <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><BookOpen className="w-4 h-4" /></div>
                                    <div>
                                       <h4 className="text-sm font-bold text-slate-900 m-0">성장 케이스 추적 로그</h4>
                                       <p className="text-xs font-medium text-slate-500 m-0 mt-0.5">{selectedYear}년도 · 총 {currentYearLogs.observation?.length}건</p>
                                    </div>
                                 </div>
                                 <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-xs shadow-sm transition-all hover:bg-slate-50 flex items-center gap-2">새 기록 작성</button>
                              </div>
                              <div className="space-y-4">
                                 {currentYearLogs.observation?.length > 0 ? (
                                   currentYearLogs.observation.map((log, idx) => (
                                     <div key={idx} className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 hover:border-slate-300 transition-all">
                                        <div className="md:w-32 shrink-0 md:border-r border-slate-200 flex flex-col justify-center">
                                           <span className="text-[10px] font-bold text-slate-400 mb-1">기록 일자</span>
                                           <span className="text-xs font-bold text-slate-700">{log.date}</span>
                                        </div>
                                        <div className="flex-1 text-sm text-slate-600 leading-relaxed">{log.content}</div>
                                     </div>
                                   ))
                                 ) : (
                                   <div className="py-16 text-center text-slate-400 font-medium text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">등록된 관찰 기록이 없습니다.</div>
                                 )}
                              </div>
                           </div>
                         )}

                          {detailTab === 'consult' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4">
                               {[
                                 { key: 'h1', label: '상반기 전문 상담', period: '1월 - 6월', data: currentYearLogs.h1 },
                                 { key: 'h2', label: '하반기 전문 상담', period: '7월 - 12월', data: currentYearLogs.h2 }
                               ].map(h => (
                                 <div key={h.key} className={`p-6 rounded-xl border transition-all flex flex-col justify-between min-h-[280px] ${h.data ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-dashed border-slate-200'}`}>
                                    <div className="space-y-2">
                                       <div className="flex justify-between items-center mb-2">
                                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">{h.period}</span>
                                          {h.data && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                       </div>
                                       <h5 className="text-base font-bold text-slate-900 m-0">{h.label}</h5>
                                       <p className="text-xs font-medium text-slate-400 m-0">필수 항목</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600 border border-slate-100 flex-1 my-4 flex items-center">
                                        {h.data ? h.data.content : <span className="text-slate-400 text-center w-full text-sm">상담 내역이 없습니다.</span>}
                                     </div>
                                     <button className={`w-full py-3 rounded-lg font-bold text-xs transition-all ${h.data ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-slate-900 text-white shadow-sm hover:bg-slate-800'}`}>
                                        {h.data ? '기록 열람 및 수정' : '새 상담 기록 시작'}
                                     </button>
                                  </div>
                               ))}
                            </div>
                         )}
                      </div>
                   </div>
                   
                   {/* 데이터 상태 푸터 */}
                   <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                         <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm"><History className="w-5 h-5" /></div>
                         <div className="space-y-1">
                            <h4 className="text-sm font-bold text-slate-900 m-0">보안 장부 아카이브</h4>
                            <p className="text-xs font-medium text-slate-500 m-0">실시간 동기화 상태 유지 중</p>
                         </div>
                      </div>
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
                         <div className="text-left md:text-right">
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">상태 규정</div>
                            <div className="flex items-center gap-2"><span className="text-sm font-bold text-emerald-600">인증됨</span><ShieldCheck className="w-4 h-4 text-emerald-500" /></div>
                         </div>
                         <div className="hidden md:block w-px h-8 bg-slate-200" />
                         <div className="text-left md:text-right">
                            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">보관 시점</div>
                            <div className="text-sm font-bold text-slate-900">{selectedChild.enrollment.split('-')[0]}년</div>
                         </div>
                      </div>
                   </div>
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

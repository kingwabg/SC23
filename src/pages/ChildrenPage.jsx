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
  Timer
} from 'lucide-react';

const parseRRN = (rrn) => {
  if (!rrn || rrn.length < 7) return null;
  const cleanRRN = rrn.replace('-', '');
  if (cleanRRN.length < 7) return null;
  
  const yearPrefix = cleanRRN.substring(0, 2);
  const month = cleanRRN.substring(2, 4);
  const day = cleanRRN.substring(4, 6);
  const genderCode = cleanRRN.charAt(6);
  
  let fullYear;
  if (genderCode === '1' || genderCode === '2' || genderCode === '5' || genderCode === '6') {
    fullYear = '19' + yearPrefix;
  } else if (genderCode === '3' || genderCode === '4' || genderCode === '7' || genderCode === '8') {
    fullYear = '20' + yearPrefix;
  } else {
    fullYear = (parseInt(yearPrefix) > 30 ? '19' : '20') + yearPrefix;
  }
  
  const birthDate = `${fullYear}.${month}.${day}`;
  const now = new Date();
  const currentYear = now.getFullYear();
  const age = currentYear - parseInt(fullYear);
  
  return {
    birth: birthDate,
    age: age,
    gender: (genderCode % 2 === 0) ? '여' : '남'
  };
};

const ChildrenPage = () => {
  // --- 글로벌 시스템 상태 ---
  const userRole = localStorage.getItem('userRole') || 'ADMIN';
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [activeTab, setActiveTab] = useState('active'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [detailTab, setDetailTab] = useState('info');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // --- 필터링 시스템 상태 ---
  const [filterGender, setFilterGender] = useState('전체');
  const [filterGrade, setFilterGrade] = useState('전체');
  const [filterUsageType, setFilterUsageType] = useState('전체');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [sheetId, setSheetId] = useState(() => localStorage.getItem('googleSheetId') || '');
  const [newChild, setNewChild] = useState({ 
    name: '', gender: '남', birth: '', school: '', grade: 1, address: '', 
    guardian: '', contact: '', cardId: '', rrn: '', phone: '',
    enrollment: new Date().toISOString().split('T')[0],
    prevEnrollment: '', usageType: '일반', familyType: '양부모', remarks: '',
    family: [] // { name: '', relation: '', contact: '', job: '', cohab: true }
  });

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

  // 주민번호 파싱 및 자동 연산 함수
  const parseRRN = (rrn) => {
    if (!rrn || rrn.length < 7) return null;
    const cleanRRN = rrn.replace('-', '');
    const birthPart = cleanRRN.substring(0, 6);
    const genderDigit = parseInt(cleanRRN.substring(6, 7));

    let yearPrefix = '19';
    let gender = '남';

    if (genderDigit === 3 || genderDigit === 4) yearPrefix = '20';
    if (genderDigit === 2 || genderDigit === 4) gender = '여';

    const year = yearPrefix + birthPart.substring(0, 2);
    const month = birthPart.substring(2, 4);
    const day = birthPart.substring(4, 6);
    const birthStr = `${year}-${month}-${day}`;
    
    const age = new Date().getFullYear() - parseInt(year) + 1;

    return { gender, birth: birthStr, age };
  };

  useEffect(() => {
    const parsed = parseRRN(newChild.rrn);
    if (parsed) {
      setNewChild(prev => ({ ...prev, gender: parsed.gender, birth: parsed.birth }));
    }
  }, [newChild.rrn]);

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
      
      // 출결 데이터 업데이트
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
      rrn: newChild.rrn,
      phone: newChild.phone,
      photo: null,
      enrollment: newChild.enrollment,
      prevEnrollment: newChild.prevEnrollment,
      cardId: newChild.cardId,
      usageType: newChild.usageType,
      familyType: newChild.familyType,
      remarks: newChild.remarks,
      family: newChild.family,
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
    setNewChild({ 
      name: '', gender: '남', birth: '', school: '', grade: 1, address: '', 
      guardian: '', contact: '', cardId: '', rrn: '', phone: '',
      enrollment: new Date().toISOString().split('T')[0],
      prevEnrollment: '', usageType: '일반', familyType: '양부모', remarks: '',
      family: []
    });
  };

  const selectedChild = useMemo(() => children.find(c => c.id === selectedChildId), [children, selectedChildId]);
  
  const currentYearData = useMemo(() => {
    if (!selectedChild) return null;
    return selectedChild.yearlyData?.[selectedYear] || null;
  }, [selectedChild, selectedYear]);

  const filteredChildren = useMemo(() => {
    return children.filter(c => {
      const yearData = c.yearlyData?.[selectedYear];
      const hasDataThisYear = !!yearData;
      if (!hasDataThisYear) return false;

      const matchesSearch = c.name.includes(searchQuery) || (yearData.school && yearData.school.includes(searchQuery));
      const matchesGender = filterGender === '전체' || c.gender === filterGender;
      const matchesGrade = filterGrade === '전체' || (yearData.grade && yearData.grade.toString() === filterGrade);
      const matchesUsageType = filterUsageType === '전체' || c.usageType === filterUsageType;

      return matchesSearch && matchesGender && matchesGrade && matchesUsageType;
    });
  }, [children, searchQuery, selectedYear, filterGender, filterGrade, filterUsageType]);

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

  const handleGoogleSheetSync = async () => {
    if (!sheetId) {
      alert('구글 시트 ID 또는 전체 공개 링크를 입력해주세요.');
      return;
    }

    setIsSyncing(true);
    try {
      let url = '';
      
      // 전체 URL이 입력된 경우 처리
      if (sheetId.startsWith('http')) {
        url = sheetId;
        // 출력이 csv가 아니면 강제로 추가 또는 변환
        if (!url.includes('output=csv') && !url.includes('format=csv')) {
          url += (url.includes('?') ? '&' : '?') + 'output=csv';
        }
      } else {
        // ID만 입력된 경우 (기본 내보내기 방식)
        url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('시트 데이터를 가져오는데 실패했습니다. 웹 게시 설정과 링크가 올바른지 확인해주세요.');
      
      const csvData = await response.text();
      processSpreadsheetData(csvData, 'string');
      localStorage.setItem('googleSheetId', sheetId);
      alert('구글 시트로부터 최신 출결 데이터를 동기화했습니다.');
    } catch (error) {
       console.error(error);
       alert('동기화 실패: ' + error.message + '\n\n도움말: 시트 메뉴의 [파일] -> [공유] -> [웹에 게시] 에서 "쉼표로 구분된 값(.csv)"으로 게시했는지 확인해 주세요.');
    } finally {
      setIsSyncing(false);
    }
  };

  const processSpreadsheetData = (dataStr, type) => {
    const wb = XLSX.read(dataStr, { type: type });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

    if (data.length < 2) return;

    // 헤더 행 찾기 ( "이름" 이 포함된 행을 찾음 )
    let headerRowIndex = -1;
    for (let i = 0; i < data.length; i++) {
      if (data[i].includes('이름')) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      alert('스프레드시트에서 "이름" 컬럼을 찾을 수 없습니다. 양식을 확인해주세요.');
      return;
    }

    const headers = data[headerRowIndex];
    const rows = data.slice(headerRowIndex + 1);

    const nameIdx = headers.indexOf('이름');
    const newChildren = [...children];
    
    // 현재 시트에서 연도와 월 추출 (일자 행 근처에서 "2026년02월" 같은 패턴 찾기)
    let sheetYear = selectedYear;
    let sheetMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // 시트 내의 텍스트에서 날짜 정보 검색 (예: "2026년02월")
    const datePattern = /(\d{4})년\s*(\d{1,2})월/;
    for (let i = 0; i < headerRowIndex; i++) {
      const rowStr = data[i].join('');
      const match = rowStr.match(datePattern);
      if (match) {
        sheetYear = parseInt(match[1]);
        sheetMonth = match[2].padStart(2, '0');
        break;
      }
    }

    let updatedCount = 0;

    rows.forEach(row => {
      const name = row[nameIdx];
      if (!name) return;

      const childIndex = newChildren.findIndex(c => c.name === name);
      if (childIndex > -1) {
        if (!newChildren[childIndex].attendance) newChildren[childIndex].attendance = {};
        
        headers.forEach((header, idx) => {
          // "1일", "2일" 혹은 숫자만 있는 헤더 확인
          const dayMatch = String(header).match(/^(\d+)(일)?$/);
          if (dayMatch) {
            const day = dayMatch[1].padStart(2, '0');
            const status = row[idx];
            
            // "출석", "출", "O", "PRESENT", 1 등의 값 확인
            if (status === '출석' || status === '출' || status === 'PRESENT' || status === 'O' || status === 1) {
              const dateKey = `${sheetYear}-${sheetMonth}-${day}`;
              newChildren[childIndex].attendance[dateKey] = {
                status: 'PRESENT',
                time: '09:00:00',
                memo: `시트 동기화 (${sheetYear}-${sheetMonth})`
              };
              updatedCount++;
            }
          }
        });
      }
    });

    if (updatedCount > 0) {
      setChildren(newChildren);
      alert(`${updatedCount}건의 출결 데이터가 동기화되었습니다.`);
    } else {
      alert('동기화할 데이터를 찾지 못했습니다. 아동 이름이 시스템에 등록된 이름과 일치하는지 확인해주세요.');
    }
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
                 <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <div className="relative">
                      <button 
                        onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                        className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-black text-[11px] flex items-center gap-2"
                      >
                        {selectedMonth}월 출결 데이터 <ChevronDown className="w-4 h-4" />
                      </button>
                      <AnimatePresence>
                        {isMonthPickerOpen && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute top-full left-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 p-2 grid grid-cols-3 gap-1 w-48"
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

                    <div className="w-px h-8 bg-slate-200 mx-1" />

                    <div className="flex flex-col px-4">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Google Sheet URL / ID</span>
                      <input 
                        type="text" 
                        value={sheetId}
                        onChange={(e) => setSheetId(e.target.value)}
                        placeholder="ID 또는 링크 입력..."
                        className="bg-transparent border-none outline-none font-bold text-xs w-48 p-0 placeholder:text-slate-300"
                      />
                    </div>
                    <button 
                      onClick={handleGoogleSheetSync}
                      disabled={isSyncing}
                      className={`px-8 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl transition-all flex items-center gap-2 ${isSyncing ? 'bg-slate-400 cursor-wait' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >
                      {isSyncing ? (
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          동기화...
                        </span>
                      ) : (
                        <>
                          <TrendingUp className="w-4 h-4" />
                          시트 동기화
                        </>
                      )}
                    </button>
                   <input 
                     type="file" 
                     ref={fileInputRef} 
                     onChange={handleAttendanceImport} 
                     className="hidden" 
                     accept=".xlsx, .xls, .csv" 
                   />
                   <button 
                     onClick={() => fileInputRef.current.click()}
                     className="px-6 py-3 bg-white text-slate-600 rounded-xl font-black text-[11px] uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all"
                   >
                     파일 업로드
                   </button>
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
          <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl space-y-8">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                   <div>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tighter m-0 uppercase italic">기관 아동 명부 <span className="text-indigo-600">.</span></h3>
                      <p className="text-xs font-bold text-slate-400 m-0 uppercase tracking-widest mt-1">{selectedYear}년도 데이터베이스에 {filteredChildren.length}명의 아동이 검색되었습니다.</p>
                   </div>
                   
                   <div className="flex items-center gap-4 w-full lg:w-auto">
                      <div className="relative flex-1 lg:w-80">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                         <input 
                           type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                           placeholder="성명, 학교명 검색..."
                           className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black shadow-inner focus:bg-white transition-all outline-none"
                         />
                      </div>
                      <button 
                        onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                        className={`p-4 rounded-2xl border transition-all flex items-center gap-3 font-black text-[11px] uppercase tracking-widest ${isFilterPanelOpen || filterGender !== '전체' || filterGrade !== '전체' || filterUsageType !== '전체' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'}`}
                      >
                         <LayoutGrid className="w-5 h-5" />
                         상세 필터 {(!isFilterPanelOpen && (filterGender !== '전체' || filterGrade !== '전체' || filterUsageType !== '전체')) && <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />}
                      </button>
                   </div>
                </div>

                <AnimatePresence>
                   {isFilterPanelOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                         <div className="pt-6 border-t border-slate-50 grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-3">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">성별 구분</label>
                               <div className="flex gap-2">
                                  {['전체', '남', '여'].map(g => (
                                     <button key={g} onClick={() => setFilterGender(g)} className={`flex-1 py-3 rounded-xl font-black text-[11px] transition-all ${filterGender === g ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-white border border-transparent hover:border-slate-200'}`}>{g}</button>
                                  ))}
                               </div>
                            </div>

                            <div className="space-y-3">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">학년별 필터</label>
                               <select 
                                 value={filterGrade} 
                                 onChange={(e) => setFilterGrade(e.target.value)}
                                 className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 font-black text-[11px] outline-none shadow-inner"
                               >
                                  <option value="전체">전체 학년</option>
                                  {[1,2,3,4,5,6].map(g => <option key={g} value={g}>{g}학년 교육생</option>)}
                               </select>
                            </div>

                            <div className="space-y-3">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">이용 유형</label>
                               <select 
                                 value={filterUsageType} 
                                 onChange={(e) => setFilterUsageType(e.target.value)}
                                 className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 font-black text-[11px] outline-none shadow-inner"
                               >
                                  <option value="전체">전체 유형</option>
                                  {['일반', '다문화', '장애', '기타'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                               </select>
                            </div>
                            <div className="flex items-end">
                               <button 
                                 onClick={() => { setFilterGender('전체'); setFilterGrade('전체'); setFilterUsageType('전체'); setSearchQuery(''); }}
                                 className="w-full py-3 bg-rose-50 text-rose-500 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
                               >
                                  <X className="w-4 h-4" /> 필터 초기화
                               </button>
                            </div>
                         </div>
                      </motion.div>
                   )}
                </AnimatePresence>
             </div>

             <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                   <thead className="bg-[#0f172a] text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">
                      <tr>
                         <th className="px-10 py-6">성명 및 기본 정보</th>
                         <th className="px-10 py-6">학교 정보</th>
                         <th className="px-10 py-6 text-center">학년 상태</th>
                         <th className="px-10 py-6">보호자 / 거주지</th>
                         <th className="px-10 py-6 text-right">기록 관리</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {filteredChildren.map(child => {
                        const yearData = child.yearlyData?.[selectedYear] || {};
                        return (
                        <tr key={child.id} onClick={() => setSelectedChildId(child.id)} className="group hover:bg-indigo-50/50 transition-all cursor-pointer">
                           <td className="px-10 py-6">
                              <div className="flex items-center gap-6">
                                 <div className="w-14 h-14 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-110 transition-all">
                                   {child.photo ? <img src={child.photo} className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-slate-200" />}
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-lg font-black text-slate-900">{child.name}</span>
                                    <div className="flex items-center gap-2">
                                       <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{child.cardId}</span>
                                       <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-2 py-0.5 rounded-lg border border-slate-100 uppercase">{child.usageType}</span>
                                    </div>
                                 </div>
                              </div>
                           </td>
                           <td className="px-10 py-6 font-bold text-slate-600 uppercase italic">{yearData.school || '미지정'}</td>
                           <td className="px-10 py-6 text-center">
                              <span className="px-5 py-2 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-[11px] uppercase tracking-widest border border-indigo-100">{yearData.grade || '?'}학년 교육생</span>
                           </td>
                           <td className="px-10 py-6 space-y-1">
                              <div className="font-black text-slate-800">{yearData.guardian || '없음'} <small className="text-slate-400 font-bold">(보호자)</small></div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{yearData.address || '주소 정보 없음'}</div>
                           </td>
                           <td className="px-10 py-6 text-right">
                              <button className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase opacity-0 group-hover:opacity-100 transition-all shadow-xl">전체 기록 열기</button>
                           </td>
                        </tr>
                      )})}
                   </tbody>
                </table>
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
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-[#0f172a] text-white">
                   <h4 className="text-[11px] font-black uppercase tracking-[0.4em] m-0">아동 선택 리스트</h4>
                   <button onClick={() => setSelectedChildId(null)} className="p-2 hover:bg-white/10 rounded-lg transition-all"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                   <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="빠른 필터링..."
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[11px] font-black focus:ring-4 focus:ring-indigo-500/10 outline-none"
                      />
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 p-3 scroll-smooth">
                   {filteredChildren.map(child => {
                     const yearData = child.yearlyData?.[selectedYear] || {};
                     return (
                     <div 
                       key={child.id} 
                       onClick={() => setSelectedChildId(child.id)}
                       className={`p-5 rounded-[1.5rem] cursor-pointer transition-all border flex items-center gap-4 ${selectedChildId === child.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-500 border-transparent hover:bg-slate-50'}`}
                     >
                        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 overflow-hidden ${selectedChildId === child.id ? 'bg-white/20 border-white/40' : 'bg-slate-100 border-slate-200'}`}>
                           {child.photo ? <img src={child.photo} className="w-full h-full object-cover" /> : <User className={`w-6 h-6 ${selectedChildId === child.id ? 'text-white/40' : 'text-slate-300'}`} />}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-center mb-1">
                              <span className="text-[15px] font-black truncate">{child.name}</span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase ${selectedChildId === child.id ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-400'}`}>{yearData.grade || '?'}학년</span>
                           </div>
                           <p className={`text-[10px] font-bold truncate m-0 uppercase tracking-widest ${selectedChildId === child.id ? 'text-indigo-200' : 'text-slate-400'}`}>{yearData.school || '미지정'}</p>
                        </div>
                     </div>
                   )})}
                </div>
             </motion.div>

             {/* 상세 기록 영역 */}
             <div className="flex-1 overflow-y-auto bg-[#f1f5f9] p-12 custom-scrollbar">
                <div className="max-w-6xl mx-auto space-y-10">
                   {/* 아동 카드 메인 */}
                   <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-2xl relative overflow-hidden group/card shadow-indigo-900/5">
                      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-50 rounded-full blur-[120px] -translate-y-64 translate-x-64 opacity-50" />
                      
                      <div className="flex justify-between items-start relative z-10 mb-12">
                         <div className="flex items-center gap-12">
                            <div className="w-40 h-40 rounded-[3.5rem] border-8 border-white bg-slate-50 shadow-2xl overflow-hidden rotate-2 group-hover/card:rotate-0 transition-all duration-700">
                               {selectedChild.photo ? <img src={selectedChild.photo} className="w-full h-full object-cover" /> : <User className="w-16 h-16 text-slate-100" />}
                            </div>
                            <div className="space-y-4">
                               <div className="flex items-center gap-6">
                                  <h3 className="text-6xl font-black text-slate-900 m-0 tracking-tighter italic uppercase">{selectedChild.name}</h3>
                                  <div className="flex flex-col gap-1">
                                     <span className="px-5 py-2 bg-indigo-900 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-[0.4em] shadow-xl">{selectedYear}년도 스냅샷</span>
                                     <span className="text-[10px] font-black text-slate-300 ml-1 tracking-[0.5em] uppercase">데이터 아카이브</span>
                                  </div>
                               </div>

                               {/* 개별 아동 데이터 보유 연도 타임라인 */}
                               <div className="flex flex-col space-y-3">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                     <History className="w-3 h-3" /> 개별 데이터 보유 타임라인
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                     {Object.keys(selectedChild.yearlyData).sort().map(year => (
                                        <button 
                                          key={year}
                                          onClick={() => setSelectedYear(parseInt(year))}
                                          className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${selectedYear === parseInt(year) ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'}`}
                                        >
                                           {year.slice(2)}년
                                        </button>
                                     ))}
                                  </div>
                               </div>

                               <div className="flex items-center gap-6 text-[13px] font-black text-slate-400 uppercase tracking-widest pt-2">
                                  <span className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm"><GraduationCap className="w-5 h-5 text-indigo-500" /> {currentYearData?.school || '미지정'}</span>
                                  <span className="flex items-center gap-3 bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-2xl border border-indigo-100"><MapPin className="w-5 h-5" /> {currentYearData?.address?.split(' ')[1] || '정보 없음'} 지역</span>
                               </div>
                            </div>
                         </div>
                         <div className="flex gap-4">
                            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-5 bg-white border border-slate-200 rounded-[2rem] shadow-sm hover:shadow-xl transition-all text-slate-400">
                               {isSidebarCollapsed ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
                            </button>
                            <button className="px-12 py-6 bg-slate-900 text-white rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all">레포트 내보내기</button>
                         </div>
                      </div>

                      {/* 상세 기록 서브 탭 */}
                      <div className="flex gap-3 relative z-10 border-t border-slate-50 pt-10">
                         {[
                           { id: 'info', label: '1. 아동 카드 (기본)', icon: User },
                           { id: 'obs', label: '2. 관찰 일지', icon: BookOpen, count: currentYearLogs.observation?.length },
                           { id: 'consult', label: '3. 전문 상담 (상/하반기)', icon: ClipboardCheck, alert: !currentYearLogs.h1 || !currentYearLogs.h2 },
                           { id: 'guardian', label: '4. 보호자 상담', icon: MessageSquare }
                         ].map(tab => (
                           <button key={tab.id} onClick={() => setDetailTab(tab.id)} className={`flex items-center gap-3 px-10 py-5 rounded-[2.5rem] text-[12px] font-black transition-all relative border ${detailTab === tab.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xl shadow-indigo-600/30' : 'bg-white text-slate-400 hover:bg-slate-50 border-slate-100'}`}>
                              <tab.icon className="w-5 h-5" />
                              {tab.label}
                              {tab.count > 0 && <span className={`ml-2 px-2 py-1 rounded-lg text-[10px] ${detailTab === tab.id ? 'bg-white text-indigo-600 font-black' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span>}
                              {tab.alert && <div className="absolute top-3 right-3 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse" />}
                           </button>
                         ))}
                      </div>

                      <div className="mt-10 bg-[#f8fcfd] rounded-[3.5rem] border border-blue-50/50 p-12 min-h-[500px] relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-32 translate-x-32" />
                         <div className="absolute top-6 right-10 text-[10px] font-black text-slate-300 uppercase tracking-widest italic">데이터베이스 동기화: 활성화</div>
                         {detailTab === 'info' && (
                            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8">
                               {/* 프리미엄 강조 섹션: 신원 및 법적 식별 */}
                               <div 
                                 className="relative grid grid-cols-3 gap-8 overflow-hidden rounded-[4rem] border border-sky-100/80 p-12 shadow-2xl shadow-indigo-900/5 group/info"
                                 style={{
                                   backgroundImage: `linear-gradient(180deg, rgba(248,252,253,0.82) 0%, rgba(248,252,253,0.92) 32%, rgba(248,252,253,0.98) 100%), url(${starInfoBg})`,
                                   backgroundSize: 'cover',
                                   backgroundPosition: 'center',
                                 }}
                               >
                                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(99,102,241,0.08),transparent_45%)] pointer-events-none" />
                                  <div className="col-span-3 border-b border-white pb-6 flex items-center justify-between relative z-10">
                                    <h5 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em] m-0 flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-sky-500"/> 개인 신원 및 보안 프로필 ({selectedYear})</h5>
                                    <span className="text-[9px] font-black text-slate-400 bg-white/60 px-3 py-1 rounded-lg border border-white">UID: {selectedChild.id}</span>
                                  </div>
                                  
                                  <div className="space-y-2 relative z-10">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">주민등록번호</label>
                                     <div className="bg-slate-900 text-sky-400 rounded-[1.8rem] py-6 px-8 font-black tracking-[0.4em] shadow-2xl relative group/rrn overflow-hidden">
                                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/rrn:translate-x-full transition-transform duration-1000" />
                                       <span className="group-hover/rrn:hidden">*******-*******</span>
                                       <span className="hidden group-hover/rrn:inline">{selectedChild.rrn || '미등록'}</span>
                                       <button className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] bg-white/10 px-3 py-1.5 rounded-xl font-bold uppercase backdrop-blur-sm">Decrypt</button>
                                     </div>
                                  </div>

                                  <div className="space-y-2 relative z-10">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">성별 / 생체 연령</label>
                                     <div className="bg-white/94 border border-white rounded-[1.8rem] py-6 px-8 font-black flex justify-between items-center shadow-inner">
                                       <span className="text-slate-900">{selectedChild.gender}</span>
                                       <div className="flex items-center gap-2">
                                          <TrendingUp className="w-3 h-3 text-emerald-500" />
                                          <span className="text-indigo-600 italic">만 {parseRRN(selectedChild.rrn)?.age || '?'}세</span>
                                       </div>
                                     </div>
                                  </div>

                                  <div className="space-y-2 relative z-10">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">카드 식별 시스템 (RFID)</label>
                                     <div className="flex gap-2">
                                        <div className="flex-1 bg-white/94 border border-white rounded-[1.8rem] py-6 px-6 font-black text-center shadow-inner text-[10px] text-slate-400">
                                          {selectedChild.displayId || '관리 미부여'}
                                        </div>
                                        <div className="flex-1 bg-sky-600 text-white rounded-[1.8rem] py-6 px-6 font-black tracking-widest text-center shadow-xl shadow-sky-600/20 text-[11px]">
                                          {selectedChild.cardId}
                                        </div>
                                     </div>
                                  </div>

                                  <div className="space-y-2 col-span-3 relative z-10 pt-2">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">공식 거주지 주소</label>
                                     <div className="bg-white/94 border border-white rounded-[1.8rem] py-6 px-10 font-black shadow-inner flex items-center gap-4">
                                       <MapPin className="w-4 h-4 text-rose-400" />
                                       <span className="text-slate-700">{currentYearData?.address || '정보 없음'}</span>
                                     </div>
                                  </div>
                               </div>

                               {/* 입소 및 관리 정보 */}
                               <div className="grid grid-cols-4 gap-8">
                                  <div className="col-span-4 border-b border-slate-100 pb-4">
                                    <h5 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em] m-0 flex items-center gap-3"><History className="w-5 h-5 text-indigo-500"/> 입소 및 이용 히스토리</h5>
                                  </div>
                                  
                                  <div className="space-y-2">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">최종 입소일</label>
                                     <div className="bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 font-black text-slate-700">{selectedChild.enrollment}</div>
                                  </div>
                                  <div className="space-y-2">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">이전 입소일</label>
                                     <div className="bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 font-black text-slate-700">{selectedChild.prevEnrollment || '-'}</div>
                                  </div>
                                  <div className="space-y-2">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">이용 유형</label>
                                     <div className="bg-indigo-50 text-indigo-600 rounded-2xl py-4 px-6 font-black text-center border border-indigo-100">{selectedChild.usageType}</div>
                                  </div>
                                  <div className="space-y-2">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">가정 유형</label>
                                     <div className="bg-emerald-50 text-emerald-600 rounded-2xl py-4 px-6 font-black text-center border border-emerald-100">{selectedChild.familyType}</div>
                                  </div>
                               </div>

                               {/* 가족 관계 목록 */}
                               <div className="space-y-6">
                                  <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                                    <h5 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em] m-0 flex items-center gap-3"><Users className="w-5 h-5 text-indigo-500"/> 가족 관계 데이터베이스</h5>
                                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{selectedChild.family?.length || 0}명 등록됨</span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-6">
                                    {selectedChild.family && selectedChild.family.length > 0 ? (
                                      selectedChild.family.map((f, idx) => (
                                        <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl flex items-center gap-6 group hover:border-indigo-500 transition-all">
                                          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black text-lg border border-slate-100">
                                            {f.relation ? f.relation[0] : '?'}
                                          </div>
                                          <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                              <span className="text-sm font-black text-slate-900">{f.name} <small className="text-indigo-400 ml-1">({f.relation})</small></span>
                                              {f.cohab && <span className="text-[8px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase">동거</span>}
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-400 mt-1">{f.contact}</p>
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{f.job}</p>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="col-span-2 py-12 text-center text-slate-200 font-black uppercase tracking-widest italic border-2 border-dashed border-slate-100 rounded-[3rem]">가족 정보가 등록되지 않았습니다.</div>
                                    )}
                                  </div>
                               </div>
                               
                               {/* 비고란 */}
                               <div className="space-y-4">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">종합 비고 및 특이사항</label>
                                  <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-inner font-bold text-slate-600 leading-relaxed min-h-[120px]">
                                    {selectedChild.remarks || '특이사항이 없습니다.'}
                                  </div>
                               </div>
                            </div>
                          )}

                          {detailTab === 'obs' && (
                            <div className="space-y-12 animate-in fade-in slide-in-from-right-12">
                               <div className="flex justify-between items-center border-b border-slate-100 pb-8">
                                  <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 bg-indigo-900 rounded-2xl flex items-center justify-center text-indigo-400 shadow-xl"><BookOpen className="w-6 h-6" /></div>
                                     <div>
                                        <h4 className="text-xl font-black text-slate-900 m-0 uppercase tracking-tight italic">성장 케이스 추적 로그</h4>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest m-0 mt-1">{selectedYear}년도 기간에 총 {currentYearLogs.observation?.length}건의 기록이 발견되었습니다.</p>
                                     </div>
                                  </div>
                                  <button className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-200">새 기록 작성</button>
                               </div>
                               <div className="space-y-6">
                                  {currentYearLogs.observation?.length > 0 ? (
                                    currentYearLogs.observation.map((log, idx) => (
                                      <div key={idx} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl flex gap-10 group hover:border-indigo-500 transition-all border-l-8 border-l-indigo-600">
                                         <div className="w-28 shrink-0 text-center flex flex-col items-center justify-center border-r border-slate-50 pr-10">
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">기록 일자</span>
                                            <span className="text-sm font-black text-slate-900">{log.date}</span>
                                         </div>
                                         <div className="flex-1 text-lg font-bold text-slate-700 leading-relaxed italic-none">{log.content}</div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="py-32 text-center text-slate-200 font-extrabold uppercase tracking-[1em] italic">데이터_없음: 발견된 기록이 없습니다.</div>
                                  )}
                               </div>
                            </div>
                          )}

                          {detailTab === 'consult' && (
                            <div className="grid grid-cols-2 gap-12 animate-in fade-in slide-in-from-right-12">
                               {[
                                 { key: 'h1', label: '상반기 전문 상담', period: '1월 - 6월', data: currentYearLogs.h1, color: 'emerald' },
                                 { key: 'h2', label: '하반기 전문 상담', period: '7월 - 12월', data: currentYearLogs.h2, color: 'blue' }
                               ].map(h => (
                                 <div key={h.key} className={`p-12 rounded-[4rem] border-4 shadow-2xl flex flex-col justify-between min-h-[440px] transition-all relative overflow-hidden ${h.data ? `bg-${h.color}-50 border-${h.color}-500 shadow-${h.color}-900/10` : 'bg-white border-dashed border-slate-200 opacity-60'}`}>
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-slate-900/5 rounded-full blur-3xl -translate-y-24 translate-x-24" />
                                    <div className="space-y-4 relative z-10">
                                       <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-1.5 rounded-full shadow-sm">{h.period} 필수 기록</span>{h.data && <CheckCircle2 className={`w-8 h-8 text-${h.color}-500`} />}</div>
                                       <h5 className="text-3xl font-black text-slate-900 m-0 uppercase tracking-tighter leading-tight">{h.label}</h5>
                                       <p className="text-[10px] font-bold text-slate-400 m-0 uppercase tracking-widest italic-none">기관 준수 프로토콜: 필수 작성</p>
                                    </div>
                                    <div className="bg-white/80 p-8 rounded-[2rem] italic-none font-bold text-base text-slate-600 border border-slate-100 shadow-inner flex-1 my-8">
                                       {h.data ? h.data.content : "상담 내역이 감지되지 않았습니다. 규정 준수를 위해 기록 작성이 필요합니다."}
                                    </div>
                                    <button className={`w-full py-6 rounded-3xl font-black text-[12px] uppercase tracking-[0.2em] relative z-10 transition-all ${h.data ? `bg-slate-900 text-white shadow-xl` : 'bg-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white'}`}>
                                       {h.data ? '기록 열람 및 수정' : '새 상담 기록 시작'}
                                    </button>
                                 </div>
                               ))}
                            </div>
                          )}
                       </div>
                    </div>
                    
                    {/* 보안 데이터 푸터 */}
                    <div className="bg-[#0f172a] p-12 rounded-[4rem] text-white shadow-3xl relative overflow-hidden flex items-center justify-between border-b-8 border-b-indigo-600">
                       <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] -translate-x-48 -translate-y-48" />
                       <div className="flex items-center gap-10 relative z-10">
                          <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center text-indigo-400 border border-white/10 shadow-3xl scale-110"><History className="w-10 h-10" /></div>
                          <div className="space-y-2">
                             <h4 className="text-2xl font-black tracking-tighter uppercase m-0 italic">보안 암호화 장부 아카이브</h4>
                             <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.5em] m-0">실시간 동기화 및 기관 데이터 스냅샷 보호 중</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-10 relative z-10">
                          <div className="text-right">
                             <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">규정 준수 상태</div>
                             <div className="flex items-center gap-3"><span className="text-3xl font-black text-indigo-400 uppercase tracking-tighter italic">인증 완료</span><ShieldCheck className="w-8 h-8 text-emerald-500" /></div>
                          </div>
                          <div className="w-px h-16 bg-white/10" />
                          <div className="text-right">
                             <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">최초 보관 시점</div>
                             <div className="text-3xl font-black text-white italic">{selectedChild.enrollment ? selectedChild.enrollment.split('-')[0] : '2026'}년 <span className="text-indigo-600">.</span></div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        )}
      </div>

      {/* 신규 아동 등록 모달 - 프리미엄 리디자인 */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-8 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white w-full max-w-5xl rounded-[4rem] shadow-4xl relative z-10 overflow-hidden my-auto"
            >
              {/* 모달 헤더 */}
              <div className="p-12 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[80px] -translate-y-32 translate-x-32" />
                <div className="flex items-center gap-8 relative z-10">
                  <div className="p-5 bg-emerald-500 rounded-[2rem] shadow-2xl shadow-emerald-500/30 rotate-3">
                    <Plus className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-4xl font-black italic uppercase tracking-tighter m-0">스마트 아동 카드 발급</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em] m-0 mt-2">인공지능 데이터 자동 매핑 및 RFID 보안 연동</p>
                  </div>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="p-4 hover:bg-white/10 rounded-[1.5rem] transition-all relative z-10">
                  <X className="w-8 h-8" />
                </button>
              </div>

              {/* 모달 본문 */}
              <div className="p-16 grid grid-cols-12 gap-16 max-h-[70vh] overflow-y-auto custom-scrollbar bg-[#f8fafc]">
                
                {/* 섹션 1: 핵심 식별 정보 (좌측) */}
                <div className="col-span-12 lg:col-span-5 space-y-12">
                   <div className="space-y-8 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
                      <h4 className="text-[12px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-6">
                        <ShieldCheck className="w-4 h-4" /> 01. 핵심 식별 정보
                      </h4>
                      
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">주민등록번호 (자동인식)</label>
                        <input 
                          type="text" 
                          value={newChild.rrn} 
                          onChange={e => setNewChild({...newChild, rrn: e.target.value})} 
                          className="w-full bg-slate-900 text-indigo-400 border-none rounded-2xl py-6 px-8 font-black tracking-[0.5em] shadow-2xl focus:ring-4 focus:ring-indigo-500/20 outline-none" 
                          placeholder="000000-0000000" 
                        />
                        <p className="text-[9px] font-bold text-slate-400 ml-2 italic">입력 시 성별, 생년월일, 연령이 자동 계산됩니다.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">성명</label>
                           <input type="text" value={newChild.name} onChange={e => setNewChild({...newChild, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 font-black outline-none focus:bg-white transition-all shadow-inner" placeholder="이름" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">RFID 카드 ID</label>
                           <input type="text" value={newChild.cardId} onChange={e => setNewChild({...newChild, cardId: e.target.value.toUpperCase()})} className="w-full bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl py-5 px-6 font-black tracking-widest outline-none shadow-inner" placeholder="E7FDCD66" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">성별</label>
                           <input type="text" readOnly value={newChild.gender} className="w-full bg-slate-100 text-slate-500 border-none rounded-2xl py-5 px-6 font-black text-center" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">연령 (만)</label>
                           <input type="text" readOnly value={parseRRN(newChild.rrn)?.age || '-'} className="w-full bg-slate-100 text-slate-500 border-none rounded-2xl py-5 px-6 font-black text-center" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">휴대폰 번호</label>
                        <input type="text" value={newChild.phone} onChange={e => setNewChild({...newChild, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 font-black shadow-inner" placeholder="010-0000-0000" />
                      </div>
                   </div>

                   <div className="space-y-8 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
                      <h4 className="text-[12px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-6">
                        <GraduationCap className="w-4 h-4" /> 02. 학업 및 소속 정보
                      </h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2 col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">학교명</label>
                          <input type="text" value={newChild.school} onChange={e => setNewChild({...newChild, school: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 font-black shadow-inner" placeholder="학교 이름 입력" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">학년</label>
                           <select value={newChild.grade} onChange={e => setNewChild({...newChild, grade: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 font-black outline-none shadow-inner">
                              {[1,2,3,4,5,6].map(g => <option key={g} value={g}>{g}학년</option>)}
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">이용 유형</label>
                           <select value={newChild.usageType} onChange={e => setNewChild({...newChild, usageType: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 font-black outline-none shadow-inner">
                              {['일반', '다문화', '장애', '기타'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                           </select>
                        </div>
                      </div>
                   </div>
                </div>

                {/* 섹션 2: 거주 및 입소 정보 (우측) */}
                <div className="col-span-12 lg:col-span-7 space-y-12">
                   <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
                      <h4 className="text-[12px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-8">
                        <MapPin className="w-4 h-4" /> 03. 거주 및 행정 정보
                      </h4>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2 col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">실거주 주소</label>
                          <input type="text" value={newChild.address} onChange={e => setNewChild({...newChild, address: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-8 font-black shadow-inner" placeholder="주소 정보를 상세하게 입력하세요." />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">최초 입소일</label>
                           <input type="date" value={newChild.enrollment} onChange={e => setNewChild({...newChild, enrollment: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 font-black shadow-inner" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">이전(전입) 입소일</label>
                           <input type="date" value={newChild.prevEnrollment} onChange={e => setNewChild({...newChild, prevEnrollment: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 font-black shadow-inner" />
                        </div>
                      </div>
                   </div>

                   <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
                      <div className="flex justify-between items-center mb-8">
                        <h4 className="text-[12px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                          <Users className="w-4 h-4" /> 04. 가족 관계 및 구성원
                        </h4>
                        <button 
                          onClick={() => setNewChild({ ...newChild, family: [...newChild.family, { name: '', relation: '', contact: '', job: '', cohab: true }] })}
                          className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 transition-all"
                        >
                          구성원 추가 +
                        </button>
                      </div>

                      <div className="space-y-4">
                        {newChild.family.map((f, idx) => (
                           <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-4 gap-4 relative animate-in fade-in slide-in-from-top-4">
                              <input type="text" placeholder="이름" value={f.name} onChange={e => {
                                 const updated = [...newChild.family]; updated[idx].name = e.target.value; setNewChild({...newChild, family: updated});
                              }} className="bg-white border-none rounded-xl py-3 px-4 font-bold text-xs shadow-sm" />
                              <input type="text" placeholder="관계(부/모/형..)" value={f.relation} onChange={e => {
                                 const updated = [...newChild.family]; updated[idx].relation = e.target.value; setNewChild({...newChild, family: updated});
                              }} className="bg-white border-none rounded-xl py-3 px-4 font-bold text-xs shadow-sm" />
                              <input type="text" placeholder="연락처" value={f.contact} onChange={e => {
                                 const updated = [...newChild.family]; updated[idx].contact = e.target.value; setNewChild({...newChild, family: updated});
                              }} className="bg-white border-none rounded-xl py-3 px-4 font-bold text-xs shadow-sm" />
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => {
                                    const updated = [...newChild.family]; updated[idx].cohab = !updated[idx].cohab; setNewChild({...newChild, family: updated});
                                  }}
                                  className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${f.cohab ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}
                                >
                                  {f.cohab ? '동거 중' : '비동거'}
                                </button>
                                <button onClick={() => {
                                  const updated = newChild.family.filter((_, i) => i !== idx); setNewChild({...newChild, family: updated});
                                }} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><X className="w-4 h-4" /></button>
                              </div>
                           </div>
                        ))}
                        {newChild.family.length === 0 && (
                          <div className="py-8 text-center text-slate-300 font-bold text-xs italic">가족 구성원을 추가해 주세요.</div>
                        )}
                      </div>
                   </div>

                   <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
                      <h4 className="text-[12px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-6">
                        <MessageSquare className="w-4 h-4" /> 05. 특이사항 및 비고
                      </h4>
                      <textarea 
                        value={newChild.remarks} 
                        onChange={e => setNewChild({...newChild, remarks: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] p-8 font-bold text-slate-600 outline-none focus:bg-white transition-all shadow-inner h-40 resize-none"
                        placeholder="아동의 건강상태, 주의사항, 특징 등을 자유롭게 기록하세요."
                      />
                   </div>
                </div>
              </div>

              {/* 모달 푸터 */}
              <div className="p-12 bg-white border-t border-slate-100 flex gap-6">
                <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-6 bg-slate-100 text-slate-500 rounded-[2.5rem] font-black text-[14px] uppercase tracking-widest hover:bg-slate-200 transition-all">취소 및 폐기</button>
                <button onClick={handleAddChild} className="flex-[2] py-6 bg-slate-900 text-white rounded-[2.5rem] font-black text-[14px] uppercase tracking-widest shadow-3xl shadow-indigo-900/40 hover:bg-indigo-600 transition-all flex items-center justify-center gap-4">
                   <ShieldCheck className="w-6 h-6 text-indigo-400" />
                   아동 스마트 카드 발급 및 시스템 저장
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChildrenPage;

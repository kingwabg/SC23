import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import starInfoBg from '../assets/star-info-bg.webp';
import { authApi } from '../utils/apiClient';
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

const FALLBACK_CHILDREN = [
  {
    id: 1, name: '김민수', birth: '2011-05-12', gender: '남', photo: null, enrollment: '2018-03-02', cardId: 'E7FDCD66',
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
    yearlyData: { 2026: { school: '푸른들초등학교', grade: 1, address: '서울시 송파구 잠실동', guardian: '박철웅', contact: '010-5555-5555' } },
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
    yearlyData: { 2026: { school: '숲속초등학교', grade: 2, address: '서울시 서초구', guardian: '정철학', contact: '010-8888-8888' } },
    logs: { 2026: { observation: [], h1: null, h2: null, guardian: [] } },
    attendance: {}
  }
];

const isValidChildrenDataset = (items) => (
  Array.isArray(items) &&
  (items.length === 0 || (items[0].yearlyData && (items[0].yearlyData[2018] || items[0].yearlyData[2026])))
);

const loadLegacyChildren = () => {
  const saved = localStorage.getItem('forestChildrenList');
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved);
    return isValidChildrenDataset(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const loadLegacyScanLogs = () => {
  const saved = localStorage.getItem('forestScanLogs');
  if (!saved) return [];

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
};

const cloneData = (value) => JSON.parse(JSON.stringify(value));

const ChildrenPage = () => {
  // --- 글로벌 시스템 상태 ---
  const userRole = localStorage.getItem('userRole') || 'ADMIN';
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [activeTab, setActiveTab] = useState('active'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter] = useState('ALL');
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [detailTab, setDetailTab] = useState('info');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newChild, setNewChild] = useState({ name: '', gender: '남', birth: '', school: '', grade: 1, address: '', guardian: '', contact: '', cardId: '' });
  const [childInfoDraft, setChildInfoDraft] = useState({
    gender: '남',
    birth: '',
    displayId: '',
    cardId: '',
    guardian: '',
    grade: '',
    contact: '',
    address: '',
  });
  const [isSavingChildInfo, setIsSavingChildInfo] = useState(false);
  const [observationDraft, setObservationDraft] = useState('');
  const [isSavingObservation, setIsSavingObservation] = useState(false);
  const [consultDrafts, setConsultDrafts] = useState({ h1: '', h2: '' });
  const [isSavingConsult, setIsSavingConsult] = useState({ h1: false, h2: false });
  const [guardianDraft, setGuardianDraft] = useState({ date: new Date().toISOString().split('T')[0], content: '' });
  const [isSavingGuardian, setIsSavingGuardian] = useState(false);

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
  const [children, setChildren] = useState(() => cloneData(loadLegacyChildren() || FALLBACK_CHILDREN));

  // --- RFID 스캔 및 단말기 로그 상태 ---
  const [scanLogs, setScanLogs] = useState(() => loadLegacyScanLogs());
  const [childrenSyncReady, setChildrenSyncReady] = useState(false);

  const [lastScannedChild, setLastScannedChild] = useState(null);

  const patchChildOnServer = async (childId, updates) => {
    await authApi(`/api/children/${childId}`, {
      method: 'PATCH',
      body: JSON.stringify({ updates }),
    });
  };

  useEffect(() => {
    const hydrateChildren = async () => {
      const legacyChildren = loadLegacyChildren();
      const legacyScanLogs = loadLegacyScanLogs();

      try {
        const data = await authApi('/api/children');
        const serverChildren = Array.isArray(data.children) ? data.children : [];
        const serverScanLogs = Array.isArray(data.scanLogs) ? data.scanLogs : [];

        if (serverChildren.length > 0) {
          setChildren(serverChildren);
          setScanLogs(serverScanLogs);
        } else {
          const seedChildren = cloneData(legacyChildren || FALLBACK_CHILDREN);
          const seedScanLogs = cloneData(legacyScanLogs);
          setChildren(seedChildren);
          setScanLogs(seedScanLogs);
          await authApi('/api/children/bulk', {
            method: 'PUT',
            body: JSON.stringify({ children: seedChildren }),
          });
          await authApi('/api/children/scan-logs', {
            method: 'PUT',
            body: JSON.stringify({ scanLogs: seedScanLogs }),
          });
        }
      } catch (err) {
        console.error('아동 데이터를 서버에서 불러오지 못했습니다.', err);
        setChildren(cloneData(legacyChildren || FALLBACK_CHILDREN));
        setScanLogs(cloneData(legacyScanLogs));
      } finally {
        setChildrenSyncReady(true);
      }
    };

    hydrateChildren();
  }, []);

  useEffect(() => {
    localStorage.setItem('forestChildrenList', JSON.stringify(children));
    if (!childrenSyncReady) return;

    const timeoutId = setTimeout(() => {
      authApi('/api/children/bulk', {
        method: 'PUT',
        body: JSON.stringify({ children }),
      }).catch((err) => {
        console.error('아동 목록 서버 동기화 실패:', err);
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [children, childrenSyncReady]);

  useEffect(() => {
    localStorage.setItem('forestScanLogs', JSON.stringify(scanLogs));
    if (!childrenSyncReady) return;

    const timeoutId = setTimeout(() => {
      authApi('/api/children/scan-logs', {
        method: 'PUT',
        body: JSON.stringify({ scanLogs }),
      }).catch((err) => {
        console.error('스캔 로그 서버 동기화 실패:', err);
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [scanLogs, childrenSyncReady]);

  // 중계 서버로부터 데이터 실시간 동기화
  useEffect(() => {
    if (!childrenSyncReady) return undefined;

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
                const updatedAttendance = { ...child.attendance, [today]: { status: 'PRESENT', time: item.time } };
                setChildren(prev => prev.map(c => (
                  c.id === child.id
                    ? { ...c, attendance: updatedAttendance }
                    : c
                )));
                patchChildOnServer(child.id, { attendance: updatedAttendance }).catch((error) => {
                  console.error('중계 출결 서버 반영 실패:', error);
                });
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
  }, [children, scanLogs, childrenSyncReady]); // scanLogs도 의존성에 추가하여 중복 체크 반영

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
  const handleTerminalScan = async (cardId) => {
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
      const updatedAttendance = {
        ...child.attendance,
        [today]: { status: 'PRESENT', time: new Date().toLocaleTimeString() }
      };

      setChildren(prev => prev.map(c => (
        c.id === child.id
          ? { ...c, attendance: updatedAttendance }
          : c
      )));

      try {
        await patchChildOnServer(child.id, { attendance: updatedAttendance });
      } catch (error) {
        console.error('RFID 출결 서버 반영 실패:', error);
      }
    }
  };

  const handleAddChild = async () => {
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

    try {
      await authApi('/api/children', {
        method: 'POST',
        body: JSON.stringify({ child: childData }),
      });
      setChildren(prev => [...prev, childData]);
      setIsAddModalOpen(false);
      setNewChild({ name: '', gender: '남', birth: '', school: '', grade: 1, address: '', guardian: '', contact: '', cardId: '' });
    } catch (error) {
      console.error('아동 등록 실패:', error);
      alert('아동 정보를 서버에 저장하지 못했습니다.');
    }
  };

  const selectedChild = useMemo(() => children.find(c => c.id === selectedChildId), [children, selectedChildId]);
  
  const currentYearData = useMemo(() => {
    if (!selectedChild) return null;
    return selectedChild.yearlyData?.[selectedYear] || null;
  }, [selectedChild, selectedYear]);

  const filteredChildren = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return children.filter(c => {
      const matchesSearch = c.name.includes(searchQuery);
      const hasDataThisYear = !!c.yearlyData?.[selectedYear];
      const todayStatus = c.attendance?.[today]?.status;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PRESENT' && todayStatus === 'PRESENT') ||
        (statusFilter === 'ABSENT' && todayStatus === 'ABSENT') ||
        (statusFilter === 'UNMARKED' && !todayStatus);
      return matchesSearch && hasDataThisYear && matchesStatus;
    });
  }, [children, searchQuery, selectedYear, statusFilter]);

  const currentYearLogs = useMemo(() => {
    if (!selectedChild) return null;
    return selectedChild.logs?.[selectedYear] || { observation: [], h1: null, h2: null, guardian: [] };
  }, [selectedChild, selectedYear]);

  useEffect(() => {
    if (!selectedChild) return;
    setChildInfoDraft({
      gender: selectedChild.gender || '남',
      birth: selectedChild.birth || '',
      displayId: selectedChild.displayId || '',
      cardId: selectedChild.cardId || '',
      guardian: currentYearData?.guardian || '',
      grade: currentYearData?.grade || '',
      contact: currentYearData?.contact || '',
      address: currentYearData?.address || '',
    });
  }, [selectedChild, currentYearData, selectedYear]);

  useEffect(() => {
    setObservationDraft('');
    setConsultDrafts({
      h1: currentYearLogs?.h1?.content || '',
      h2: currentYearLogs?.h2?.content || '',
    });
    setGuardianDraft({
      date: new Date().toISOString().split('T')[0],
      content: '',
    });
  }, [currentYearLogs, selectedChildId, selectedYear]);

  const fileInputRef = useRef(null);

  const handleChildInfoSave = async () => {
    if (!selectedChild) return;

    const nextYearlyData = {
      ...(selectedChild.yearlyData || {}),
      [selectedYear]: {
        ...(selectedChild.yearlyData?.[selectedYear] || {}),
        guardian: childInfoDraft.guardian,
        grade: childInfoDraft.grade,
        contact: childInfoDraft.contact,
        address: childInfoDraft.address,
      },
    };

    const updates = {
      gender: childInfoDraft.gender,
      birth: childInfoDraft.birth,
      displayId: childInfoDraft.displayId || undefined,
      cardId: childInfoDraft.cardId,
      yearlyData: nextYearlyData,
    };

    setIsSavingChildInfo(true);
    try {
      await patchChildOnServer(selectedChild.id, updates);
      setChildren((prev) => prev.map((child) => (
        child.id === selectedChild.id
          ? {
            ...child,
            ...updates,
          }
          : child
      )));
      alert('아동 기본 정보가 서버에 저장되었습니다.');
    } catch (error) {
      console.error('아동 상세정보 저장 실패:', error);
      alert('아동 정보를 저장하지 못했습니다.');
    } finally {
      setIsSavingChildInfo(false);
    }
  };

  const handleDeleteChild = async () => {
    if (!selectedChild) return;
    if (!can('children_delete')) {
      alert('아동 삭제 권한이 없습니다.');
      return;
    }

    const confirmed = window.confirm(`${selectedChild.name} 아동 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`);
    if (!confirmed) return;

    try {
      await authApi(`/api/children/${selectedChild.id}`, {
        method: 'DELETE',
      });

      setChildren((prev) => prev.filter((child) => child.id !== selectedChild.id));
      setSelectedChildId(null);
      alert('아동 데이터가 삭제되었습니다.');
    } catch (error) {
      console.error('아동 삭제 실패:', error);
      alert('아동 데이터를 삭제하지 못했습니다.');
    }
  };

  const handleSaveObservation = async () => {
    if (!selectedChild) return;
    const content = observationDraft.trim();
    if (!content) {
      alert('관찰일지 내용을 입력해주세요.');
      return;
    }

    const nextLogs = {
      ...(selectedChild.logs || {}),
      [selectedYear]: {
        ...(selectedChild.logs?.[selectedYear] || { observation: [], h1: null, h2: null, guardian: [] }),
        observation: [
          ...(selectedChild.logs?.[selectedYear]?.observation || []),
          { date: new Date().toISOString().split('T')[0], content },
        ],
      },
    };

    setIsSavingObservation(true);
    try {
      await patchChildOnServer(selectedChild.id, { logs: nextLogs });
      setChildren((prev) => prev.map((child) => (
        child.id === selectedChild.id ? { ...child, logs: nextLogs } : child
      )));
      setObservationDraft('');
      alert('관찰일지가 저장되었습니다.');
    } catch (error) {
      console.error('관찰일지 저장 실패:', error);
      alert('관찰일지를 저장하지 못했습니다.');
    } finally {
      setIsSavingObservation(false);
    }
  };

  const handleSaveConsult = async (key) => {
    if (!selectedChild) return;
    const content = (consultDrafts[key] || '').trim();
    if (!content) {
      alert('상담 내용을 입력해주세요.');
      return;
    }

    const nextLogs = {
      ...(selectedChild.logs || {}),
      [selectedYear]: {
        ...(selectedChild.logs?.[selectedYear] || { observation: [], h1: null, h2: null, guardian: [] }),
        [key]: {
          date: new Date().toISOString().split('T')[0],
          content,
        },
      },
    };

    setIsSavingConsult((prev) => ({ ...prev, [key]: true }));
    try {
      await patchChildOnServer(selectedChild.id, { logs: nextLogs });
      setChildren((prev) => prev.map((child) => (
        child.id === selectedChild.id ? { ...child, logs: nextLogs } : child
      )));
      alert('상담 기록이 저장되었습니다.');
    } catch (error) {
      console.error('상담 기록 저장 실패:', error);
      alert('상담 기록을 저장하지 못했습니다.');
    } finally {
      setIsSavingConsult((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleSaveGuardianConsult = async () => {
    if (!selectedChild) return;
    const content = guardianDraft.content.trim();
    if (!content) {
      alert('보호자 상담 내용을 입력해주세요.');
      return;
    }

    const nextLogs = {
      ...(selectedChild.logs || {}),
      [selectedYear]: {
        ...(selectedChild.logs?.[selectedYear] || { observation: [], h1: null, h2: null, guardian: [] }),
        guardian: [
          ...(selectedChild.logs?.[selectedYear]?.guardian || []),
          {
            date: guardianDraft.date,
            content,
          },
        ],
      },
    };

    setIsSavingGuardian(true);
    try {
      await patchChildOnServer(selectedChild.id, { logs: nextLogs });
      setChildren((prev) => prev.map((child) => (
        child.id === selectedChild.id ? { ...child, logs: nextLogs } : child
      )));
      setGuardianDraft({
        date: new Date().toISOString().split('T')[0],
        content: '',
      });
      alert('보호자 상담 기록이 저장되었습니다.');
    } catch (error) {
      console.error('보호자 상담 저장 실패:', error);
      alert('보호자 상담 기록을 저장하지 못했습니다.');
    } finally {
      setIsSavingGuardian(false);
    }
  };

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

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
           {/* 내비게이션 탭 */}
           <div className="flex w-full gap-1 rounded-2xl bg-slate-100 p-1.5 md:w-auto">
             {[
               { id: 'active', label: '아동 목록/관리', icon: Users, key: 'children_view' },
               { id: 'ledger', label: '출결대장', icon: FileSpreadsheet, key: 'attendance_view' }
             ].filter(t => can(t.key)).map(t => (
               <button key={t.id} onClick={() => { setActiveTab(t.id); setSelectedChildId(null); }} className={`flex flex-1 items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-[11px] font-black transition-all md:flex-none md:px-6 md:py-2 ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-900'}`}>
                 <t.icon className="w-4 h-4" />
                 {t.label}
               </button>
             ))}
           </div>
           {can('children_create') && (
             <button 
               onClick={() => setIsAddModalOpen(true)}
               className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-xl transition-all hover:bg-emerald-700 md:w-auto"
             >
               <Plus className="w-4 h-4" /> 신규 아동 등록
             </button>
           )}
        </div>
      </div>


      <div className="flex-1 flex overflow-hidden relative">
        {/* 출결대장 뷰 */}
        {activeTab === 'ledger' && (
          <div className="flex-1 overflow-y-auto bg-white p-4 md:p-12 flex flex-col">
            <div className="max-w-7xl mx-auto w-full space-y-10">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Attendance Registry</span>
                  </div>
                  <h3 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                    {selectedMonth}월 출결 현황 대장 <span className="text-indigo-600">.</span>
                  </h3>
                </div>
                 <div className="flex flex-wrap gap-3 md:gap-4">
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
          <div className="max-w-7xl mx-auto space-y-8">
             <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                   <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter m-0 uppercase italic">기관 아동 명부 <span className="text-indigo-600">.</span></h3>
                   <p className="text-xs font-bold text-slate-400 m-0 uppercase tracking-widest mt-1">{selectedYear}년도 데이터베이스에 {filteredChildren.length}명의 아동이 검색되었습니다.</p>
                </div>
                <div className="relative w-full md:w-80">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input 
                     type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder="이름, 학교 등으로 검색..."
                     className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-[1.5rem] text-sm font-black shadow-xl shadow-slate-200/40 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                   />
                </div>
             </div>

             <div className="grid gap-4 md:hidden">
                {filteredChildren.map(child => {
                  const yearData = child.yearlyData?.[selectedYear] || {};
                  return (
                    <button
                      key={`mobile-${child.id}`}
                      onClick={() => setSelectedChildId(child.id)}
                      className="rounded-[1.8rem] border border-slate-100 bg-white p-4 text-left shadow-[0_18px_45px_rgba(148,163,184,0.14)] transition hover:border-indigo-200 hover:bg-indigo-50/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            {child.photo ? <img src={child.photo} className="h-full w-full object-cover" /> : <User className="w-5 h-5 text-slate-200" />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-base font-black text-slate-900">{child.name}</p>
                            <p className="truncate text-[10px] font-black uppercase tracking-[0.24em] text-indigo-400">{child.cardId}</p>
                          </div>
                        </div>
                        <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">
                          {yearData.grade || '?'}학년
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 text-left">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">학교</p>
                          <p className="mt-1 text-sm font-bold text-slate-700">{yearData.school || '미지정'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">보호자</p>
                          <p className="mt-1 text-sm font-bold text-slate-700">{yearData.guardian || '없음'}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
             </div>

             <div className="hidden md:block bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden">
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
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{child.cardId}</span>
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
                            {can('children_delete') && (
                              <button
                                type="button"
                                onClick={handleDeleteChild}
                                className="px-8 py-5 bg-rose-50 text-rose-600 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] border border-rose-100 shadow-lg hover:bg-rose-100 transition-all"
                              >
                                아동 삭제
                              </button>
                            )}
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
                           <div
                             className="relative grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-bottom-8 overflow-hidden rounded-[3rem] border border-sky-100/80 p-6 md:grid-cols-2 md:gap-12 md:p-10"
                             style={{
                               backgroundImage: `linear-gradient(180deg, rgba(248,252,253,0.74) 0%, rgba(248,252,253,0.88) 32%, rgba(248,252,253,0.96) 100%), url(${starInfoBg})`,
                               backgroundSize: 'cover',
                               backgroundPosition: 'center',
                             }}
                           >
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(121,182,255,0.16),transparent_38%)] pointer-events-none" />
                              <div className="relative z-10 col-span-1 flex flex-col gap-4 border-b border-white/70 pb-6 md:col-span-2 md:flex-row md:items-center md:justify-between md:pb-8">
                                <h5 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em] m-0 flex items-center gap-3">
                                  <ShieldCheck className="w-5 h-5 text-sky-500" />
                                  개인 신원 및 법적 식별 정보 ({selectedYear})
                                </h5>
                                <button
                                  type="button"
                                  onClick={handleChildInfoSave}
                                  disabled={isSavingChildInfo}
                                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-xl transition-all hover:bg-black disabled:bg-slate-300"
                                >
                                  {isSavingChildInfo ? '저장 중...' : '기본정보 저장'}
                                </button>
                              </div>

                              <div className="space-y-3 relative z-10">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">성별 / 생년월일</label>
                                <div className="flex gap-4">
                                  <select
                                    value={childInfoDraft.gender}
                                    onChange={(e) => setChildInfoDraft((prev) => ({ ...prev, gender: e.target.value }))}
                                    className="w-28 bg-white/92 border border-white rounded-2xl py-6 px-4 font-black text-center shadow-inner outline-none"
                                  >
                                    <option value="남">남</option>
                                    <option value="여">여</option>
                                  </select>
                                  <input
                                    type="date"
                                    value={childInfoDraft.birth}
                                    onChange={(e) => setChildInfoDraft((prev) => ({ ...prev, birth: e.target.value }))}
                                    className="flex-1 bg-white/92 border border-white rounded-2xl py-6 px-6 font-black shadow-inner outline-none"
                                  />
                                </div>
                              </div>

                              <div className="space-y-3 relative z-10">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">RFID 보안 태그 ID</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={childInfoDraft.displayId}
                                    onChange={(e) => setChildInfoDraft((prev) => ({ ...prev, displayId: e.target.value }))}
                                    className="flex-1 bg-white/88 text-slate-500 border border-white rounded-2xl py-6 px-6 font-black tracking-widest shadow-inner outline-none"
                                    placeholder="관리번호"
                                  />
                                  <input
                                    type="text"
                                    value={childInfoDraft.cardId}
                                    onChange={(e) => setChildInfoDraft((prev) => ({ ...prev, cardId: e.target.value.toUpperCase() }))}
                                    className="flex-1 bg-slate-900/92 text-sky-300 border-none rounded-2xl py-6 px-6 font-black tracking-widest shadow-2xl outline-none"
                                    placeholder="하드웨어 ID"
                                  />
                                </div>
                              </div>

                              <div className="space-y-3 relative z-10">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">주 보호자 / 당시 학년</label>
                                <div className="flex gap-4">
                                  <input
                                    type="text"
                                    value={childInfoDraft.guardian}
                                    onChange={(e) => setChildInfoDraft((prev) => ({ ...prev, guardian: e.target.value }))}
                                    className="flex-1 bg-white/92 border border-white rounded-2xl py-6 px-6 font-black shadow-inner outline-none"
                                    placeholder="보호자 이름"
                                  />
                                  <input
                                    type="text"
                                    value={childInfoDraft.grade}
                                    onChange={(e) => setChildInfoDraft((prev) => ({ ...prev, grade: e.target.value }))}
                                    className="w-28 bg-white/92 border border-white rounded-2xl py-6 px-4 font-black text-center shadow-inner outline-none"
                                    placeholder="학년"
                                  />
                                </div>
                              </div>

                              <div className="space-y-3 relative z-10">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">비상 연락처 체계</label>
                                <input
                                  type="text"
                                  value={childInfoDraft.contact}
                                  onChange={(e) => setChildInfoDraft((prev) => ({ ...prev, contact: e.target.value }))}
                                  className="w-full bg-white/92 border border-white rounded-2xl py-6 px-6 font-black shadow-inner outline-none"
                                  placeholder="010-0000-0000"
                                />
                              </div>

                              <div className="space-y-3 col-span-1 relative z-10 md:col-span-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">실거주지 매핑 주소</label>
                                <input
                                  type="text"
                                  value={childInfoDraft.address}
                                  onChange={(e) => setChildInfoDraft((prev) => ({ ...prev, address: e.target.value }))}
                                  className="w-full bg-white/92 border border-white rounded-2xl py-6 px-6 font-black shadow-inner outline-none"
                                  placeholder="실거주 주소 입력"
                                />
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
                                 <button
                                   type="button"
                                   onClick={handleSaveObservation}
                                   disabled={isSavingObservation}
                                   className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-200 disabled:bg-slate-300"
                                 >
                                   {isSavingObservation ? '저장 중...' : '관찰일지 저장'}
                                 </button>
                               </div>
                               <div className="rounded-[2.5rem] border border-indigo-100 bg-indigo-50/40 p-6">
                                 <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">New Observation</p>
                                 <textarea
                                   value={observationDraft}
                                   onChange={(e) => setObservationDraft(e.target.value)}
                                   placeholder="오늘의 행동 변화, 관계, 정서 상태를 기록하세요."
                                   className="mt-4 min-h-[140px] w-full rounded-[1.5rem] border border-white bg-white/90 px-5 py-4 text-sm font-bold text-slate-700 outline-none shadow-inner"
                                 />
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
                            <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-right-12 md:grid-cols-2 md:gap-12">
                               {[
                                 { key: 'h1', label: '상반기 전문 상담', period: '1월 - 6월', data: currentYearLogs.h1, color: 'emerald' },
                                 { key: 'h2', label: '하반기 전문 상담', period: '7월 - 12월', data: currentYearLogs.h2, color: 'blue' }
                               ].map(h => (
                                 <div key={h.key} className={`p-8 md:p-12 rounded-[4rem] border-4 shadow-2xl flex flex-col justify-between min-h-[440px] transition-all relative overflow-hidden ${h.data ? `bg-${h.color}-50 border-${h.color}-500 shadow-${h.color}-900/10` : 'bg-white border-dashed border-slate-200 opacity-60'}`}>
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-slate-900/5 rounded-full blur-3xl -translate-y-24 translate-x-24" />
                                    <div className="space-y-4 relative z-10">
                                       <div className="flex justify-between items-center"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-1.5 rounded-full shadow-sm">{h.period} 필수 기록</span>{h.data && <CheckCircle2 className={`w-8 h-8 text-${h.color}-500`} />}</div>
                                       <h5 className="text-3xl font-black text-slate-900 m-0 uppercase tracking-tighter leading-tight">{h.label}</h5>
                                       <p className="text-[10px] font-bold text-slate-400 m-0 uppercase tracking-widest italic-none">기관 준수 프로토콜: 필수 작성</p>
                                    </div>
                                    <div className="bg-white/80 p-6 rounded-[2rem] border border-slate-100 shadow-inner flex-1 my-8 space-y-4">
                                       <p className="text-sm font-bold text-slate-500">
                                         {h.data ? `최근 저장일: ${h.data.date}` : '상담 내역이 아직 없습니다. 아래에 새 기록을 작성하세요.'}
                                       </p>
                                       <textarea
                                         value={consultDrafts[h.key] || ''}
                                         onChange={(e) => setConsultDrafts((prev) => ({ ...prev, [h.key]: e.target.value }))}
                                         placeholder="상담 목표, 주요 대화 내용, 후속 조치를 입력하세요."
                                         className="min-h-[180px] w-full rounded-[1.5rem] border border-slate-100 bg-white px-5 py-4 text-sm font-bold text-slate-700 outline-none"
                                       />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveConsult(h.key)}
                                      disabled={isSavingConsult[h.key]}
                                      className={`w-full py-6 rounded-3xl font-black text-[12px] uppercase tracking-[0.2em] relative z-10 transition-all ${h.data ? `bg-slate-900 text-white shadow-xl` : 'bg-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white'} disabled:bg-slate-300`}
                                    >
                                       {isSavingConsult[h.key] ? '저장 중...' : (h.data ? '상담 기록 저장' : '새 상담 기록 저장')}
                                    </button>
                                 </div>
                                ))}
                             </div>
                           )}

                         {detailTab === 'guardian' && (
                           <div className="space-y-8 animate-in fade-in slide-in-from-right-12">
                             <div className="flex flex-col gap-4 rounded-[3rem] border border-amber-100 bg-[linear-gradient(135deg,#fffdf7,#ffffff)] p-6 shadow-xl shadow-amber-100/40 md:flex-row md:items-start md:justify-between md:p-8">
                               <div>
                                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Guardian Channel</p>
                                 <h4 className="mt-2 text-2xl font-black tracking-tight text-slate-900">보호자 상담 기록</h4>
                                 <p className="mt-2 text-sm font-medium text-slate-500">
                                   보호자와의 통화, 방문 상담, 요청사항 및 후속 조치 내용을 연도별로 보관합니다.
                                 </p>
                               </div>
                               <button
                                 type="button"
                                 onClick={handleSaveGuardianConsult}
                                 disabled={isSavingGuardian}
                                 className="inline-flex items-center justify-center rounded-2xl bg-amber-500 px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-amber-200 disabled:bg-slate-300"
                               >
                                 {isSavingGuardian ? '저장 중...' : '보호자 상담 저장'}
                               </button>
                             </div>

                             <div className="rounded-[3rem] border border-slate-100 bg-white p-6 shadow-xl md:p-8">
                               <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                                 <div className="space-y-2">
                                   <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">상담 일자</label>
                                   <input
                                     type="date"
                                     value={guardianDraft.date}
                                     onChange={(e) => setGuardianDraft((prev) => ({ ...prev, date: e.target.value }))}
                                     className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-black text-slate-700 outline-none"
                                   />
                                 </div>
                                 <div className="space-y-2">
                                   <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">상담 내용</label>
                                   <textarea
                                     value={guardianDraft.content}
                                     onChange={(e) => setGuardianDraft((prev) => ({ ...prev, content: e.target.value }))}
                                     placeholder="상담 배경, 보호자 의견, 센터 대응, 후속 조치를 기록하세요."
                                     className="min-h-[180px] w-full rounded-[1.75rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-700 outline-none"
                                   />
                                 </div>
                               </div>
                             </div>

                             <div className="space-y-4">
                               {(currentYearLogs.guardian || []).length > 0 ? (
                                 currentYearLogs.guardian.map((log, idx) => (
                                   <div key={`${log.date}-${idx}`} className="rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-lg">
                                     <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                       <div>
                                         <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500">Guardian Consult</p>
                                         <h5 className="mt-2 text-lg font-black text-slate-900">{log.date}</h5>
                                       </div>
                                       <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">
                                         보호자 상담
                                       </span>
                                     </div>
                                     <p className="mt-4 whitespace-pre-wrap text-sm font-bold leading-7 text-slate-600">{log.content}</p>
                                   </div>
                                 ))
                               ) : (
                                 <div className="rounded-[2.5rem] border border-dashed border-slate-300 bg-white px-6 py-20 text-center text-sm font-black text-slate-300">
                                   등록된 보호자 상담 기록이 없습니다.
                                 </div>
                               )}
                             </div>
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
                            <div className="text-3xl font-black text-white italic">{selectedChild.enrollment.split('-')[0]}년 <span className="text-indigo-600">.</span></div>
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

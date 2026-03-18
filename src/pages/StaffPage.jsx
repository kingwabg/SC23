import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  UserPlus, 
  MoreVertical, 
  X, 
  Camera, 
  Save, 
  ShieldCheck, 
  Phone, 
  Calendar as CalendarIcon,
  CheckCircle2,
  RotateCcw,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Printer,
  Zap,
  Briefcase,
  HeartPulse,
  Palmtree,
  Clock,
  Users,
  UserCheck,
  LayoutDashboard,
  Settings2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { authApi } from '../utils/apiClient';

const FALLBACK_STAFF = [
  {
    id: 1, name: '김민수', role: '시설장', type: '정규직', joinDate: '2022.01.01', contact: '010-1111-2222', status: '재직', email: 'minsu@forest.com', address: '서울시 강남구...', birth: '1975.03.15',
    permissions: { children_list: true, children_ledger: true, children_scan: true },
    attendanceData: { '2026-02-01': '출근', '2026-02-02': '출근', '2026-02-03': '출근' }
  },
  {
    id: 2, name: '이영희', role: '생활복지사', type: '정규직', joinDate: '2023.05.10', contact: '010-3333-4444', status: '재직', email: 'yh@forest.com', address: '서울시 서초구...', birth: '1988.11.20',
    permissions: { children_list: false, children_ledger: true, children_scan: true },
    attendanceData: { '2026-02-01': '출근', '2026-02-02': '출근' }
  },
  {
    id: 3, name: '박철수', role: '조리원', type: '계약직', joinDate: '2024.02.15', contact: '010-5555-6666', status: '재직', email: 'cs@forest.com', address: '서울시 송파구...', birth: '1965.07.05',
    permissions: { children_list: false, children_ledger: false, children_scan: true },
    attendanceData: {}
  }
];

const loadLegacyStaff = () => {
  const saved = localStorage.getItem('forestStaffList');
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const cloneData = (value) => JSON.parse(JSON.stringify(value));

const StaffPage = () => {
  const isAdmin = (localStorage.getItem('userRole') || 'ADMIN') === 'ADMIN';
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'terminated', 'attendance', 'permissions'
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    role: '',
    type: '정규직',
    contact: '',
    joinDate: new Date().toISOString().split('T')[0],
    email: '',
    address: '',
    birth: '',
  });
  const [systemUsers, setSystemUsers] = useState([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditModuleFilter, setAuditModuleFilter] = useState('');
  const [auditActorFilter, setAuditActorFilter] = useState('');
  const [expandedAuditLogId, setExpandedAuditLogId] = useState(null);
  const [isMigratingLocalData, setIsMigratingLocalData] = useState(false);
  const [migrationSummary, setMigrationSummary] = useState(null);
  const [newSystemUser, setNewSystemUser] = useState({
    id: '',
    name: '',
    password: '',
    role: 'NON_STAFF',
  });
  const [passwordDrafts, setPasswordDrafts] = useState({});

  const auditActorOptions = useMemo(() => {
    const map = new Map();
    systemUsers.forEach((user) => {
      map.set(user.id, user.name);
    });
    auditLogs.forEach((log) => {
      if (!map.has(log.actorId)) {
        map.set(log.actorId, log.actorId);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [auditLogs, systemUsers]);

  // Dynamic Permissions State (Persisted in localStorage)
  const [permissions, setPermissions] = useState(() => {
    const saved = localStorage.getItem('appPermissions');
    return saved ? JSON.parse(saved) : {
      'NON_STAFF': {
        'dashboard': true,
        'children': true,
        'children_view': true,
        'children_create': false,
        'children_edit': false,
        'children_delete': false,
        'attendance_view': true,
        'attendance_edit': false,
        'attendance_excel': false,
        'rfid_access': true,
        'calendar': true,
        'calendar_google': true,
        'calendar_local': true,
        'calendar_sync': false,
        'staff': false,
        'staff_view': false,
        'staff_attendance': false,
        'staff_permissions': false,
        'programs': false,
        'meetings': false,
        'stats': false,
        'facility': false,
        'public': false,
        'records_view': true,
        'records_children': true,
        'records_meeting': false,
        'records_autonomy': true,
        'records_heart': false
      }
    };
  });

  const savePermissions = async (newPermissions) => {
    setPermissions(newPermissions);
    localStorage.setItem('appPermissions', JSON.stringify(newPermissions));

    if (!isAdmin) return;

    try {
      await authApi('/api/admin/role-permissions/non-staff', {
        method: 'PUT',
        body: JSON.stringify({ permissions: newPermissions.NON_STAFF }),
      });
    } catch (err) {
      console.error('권한 서버 저장 실패:', err);
    }
  };

  const togglePermission = (role, key) => {
    const newPerms = {
      ...permissions,
      [role]: { ...permissions[role], [key]: !permissions[role][key] }
    };
    savePermissions(newPerms);
  };

  useEffect(() => {
    if (!isAdmin) return;

    const syncPermissions = async () => {
      try {
        const data = await authApi('/api/admin/role-permissions/non-staff');
        const synced = {
          ...permissions,
          NON_STAFF: data.permissions,
        };
        setPermissions(synced);
        localStorage.setItem('appPermissions', JSON.stringify(synced));
      } catch (err) {
        console.error('권한 서버 조회 실패:', err);
      }
    };

    syncPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const loadSystemUsers = async () => {
    if (!isAdmin) return;

    setUserLoading(true);
    setUserError('');
    try {
      const data = await authApi('/api/admin/users');
      setSystemUsers(data.users || []);
    } catch (err) {
      setUserError('사용자 목록을 불러오지 못했습니다.');
    } finally {
      setUserLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    if (!isAdmin) return;

    setAuditLoading(true);
    try {
      const params = new URLSearchParams({ limit: '30' });
      if (auditModuleFilter) params.set('module', auditModuleFilter);
      if (auditActorFilter) params.set('actor', auditActorFilter);
      const data = await authApi(`/api/admin/audit-logs?${params.toString()}`);
      setAuditLogs(data.logs || []);
      setExpandedAuditLogId(null);
    } catch (err) {
      setUserError('감사로그를 불러오지 못했습니다.');
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'permissions' || !isAdmin) return;
    loadSystemUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (activeTab !== 'permissions' || !isAdmin) return;
    loadAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdmin, auditModuleFilter, auditActorFilter]);

  const handleCreateSystemUser = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!newSystemUser.id || !newSystemUser.name || !newSystemUser.password) {
      setUserError('아이디, 이름, 비밀번호를 모두 입력해주세요.');
      return;
    }

    setIsCreatingUser(true);
    setUserError('');
    try {
      await authApi('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(newSystemUser),
      });
      setNewSystemUser({ id: '', name: '', password: '', role: 'NON_STAFF' });
      await loadSystemUsers();
    } catch (err) {
      setUserError('계정 생성에 실패했습니다. 아이디 중복 여부를 확인해주세요.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleToggleSystemUserActive = async (user) => {
    if (!isAdmin) return;
    setUserError('');
    try {
      await authApi(`/api/admin/users/${user.id}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !user.active }),
      });
      await loadSystemUsers();
    } catch (err) {
      setUserError('활성화 상태 변경에 실패했습니다.');
    }
  };

  const handleSystemUserPasswordChange = async (userId) => {
    if (!isAdmin) return;
    const password = (passwordDrafts[userId] || '').trim();
    if (!password) {
      setUserError('변경할 비밀번호를 입력해주세요.');
      return;
    }

    setUserError('');
    try {
      await authApi(`/api/admin/users/${userId}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password }),
      });
      setPasswordDrafts((prev) => ({ ...prev, [userId]: '' }));
    } catch (err) {
      setUserError('비밀번호 변경에 실패했습니다.');
    }
  };

  const handleMigrateLocalData = async () => {
    if (!isAdmin) return;

    const loadJson = (key, fallback) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    };

    const calendarState = loadJson('forestCalendarState', {});
    const payload = {
      children: loadJson('forestChildrenList', []),
      scanLogs: loadJson('forestScanLogs', []),
      staff: loadJson('forestStaffList', []),
      meetings: loadJson('operationMeetingsData', []),
      programs: loadJson('forestProgramsData', []),
      calendarUrl: calendarState?.calendarUrl || '',
      events: Array.isArray(calendarState?.events) ? calendarState.events : [],
    };

    setIsMigratingLocalData(true);
    setMigrationSummary(null);
    setUserError('');

    try {
      const data = await authApi('/api/admin/migrate/local-data', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setMigrationSummary(data.summary || null);
      await loadAuditLogs();
      alert('브라우저 로컬 데이터 이관이 완료되었습니다.');
    } catch (error) {
      setUserError('브라우저 로컬 데이터 이관에 실패했습니다.');
    } finally {
      setIsMigratingLocalData(false);
    }
  };
  
  const [staff, setStaff] = useState(() => cloneData(loadLegacyStaff() || FALLBACK_STAFF));
  const [staffSyncReady, setStaffSyncReady] = useState(false);

  const patchStaffOnServer = async (staffId, updates) => {
    await authApi(`/api/staff/${staffId}`, {
      method: 'PATCH',
      body: JSON.stringify({ updates }),
    });
  };

  useEffect(() => {
    const hydrateStaff = async () => {
      const legacyStaff = loadLegacyStaff();

      try {
        const data = await authApi('/api/staff');
        const serverStaff = Array.isArray(data.staff) ? data.staff : [];

        if (serverStaff.length > 0) {
          setStaff(serverStaff);
        } else {
          const seedStaff = cloneData(legacyStaff || FALLBACK_STAFF);
          setStaff(seedStaff);
          await authApi('/api/staff/bulk', {
            method: 'PUT',
            body: JSON.stringify({ staff: seedStaff }),
          });
        }
      } catch (err) {
        console.error('종사자 데이터를 서버에서 불러오지 못했습니다.', err);
        setStaff(cloneData(legacyStaff || FALLBACK_STAFF));
      } finally {
        setStaffSyncReady(true);
      }
    };

    hydrateStaff();
  }, []);

  useEffect(() => {
    localStorage.setItem('forestStaffList', JSON.stringify(staff));
    if (!staffSyncReady) return;

    const timeoutId = setTimeout(() => {
      authApi('/api/staff/bulk', {
        method: 'PUT',
        body: JSON.stringify({ staff }),
      }).catch((err) => {
        console.error('종사자 목록 서버 동기화 실패:', err);
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [staff, staffSyncReady]);

  useEffect(() => {
    if (!selectedStaff) return;
    const nextSelected = staff.find((item) => item.id === selectedStaff.id) || null;
    setSelectedStaff(nextSelected);
  }, [staff, selectedStaff?.id]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Attendance Year/Month Selectors
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(2);

  const excelUploadRef = useRef(null);

  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      if (activeTab === 'active' && s.status !== '재직') return false;
      if (activeTab === 'terminated' && s.status !== '퇴사') return false;
      const matchesSearch = s.name.includes(searchQuery) || s.role.includes(searchQuery) || s.contact.includes(searchQuery);
      if (!matchesSearch) return false;
      return true;
    });
  }, [staff, activeTab, searchQuery]);

  // Calendar Logic
  const daysInMonth = useMemo(() => new Date(selectedYear, selectedMonth, 0).getDate(), [selectedYear, selectedMonth]);
  const monthDates = useMemo(() => {
    const dates = [];
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(selectedYear, selectedMonth - 1, i);
      dates.push({
        num: i, day: weekdays[date.getDay()],
        full: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      });
    }
    return dates;
  }, [selectedYear, selectedMonth, daysInMonth]);

  const statusMap = {
    '출근': { label: 'V', color: 'text-emerald-600 bg-emerald-50', icon: UserCheck },
    '연가': { label: '연', color: 'text-blue-600 bg-blue-50', icon: Palmtree },
    '병가': { label: '병', color: 'text-red-600 bg-red-50', icon: HeartPulse },
    '조퇴': { label: '조', color: 'text-orange-600 bg-orange-50', icon: Clock },
    '기타': { label: '기', color: 'text-slate-500 bg-slate-50', icon: Briefcase },
  };

  const handleStatusChange = (staffId, dateStr, currentStatus) => {
    const statuses = ['-','출근', '연가', '병가', '조퇴', '기타'];
    const nextIndex = (statuses.indexOf(currentStatus || '-') + 1) % statuses.length;
    const nextStatus = statuses[nextIndex] === '-' ? null : statuses[nextIndex];

    const target = staff.find((item) => item.id === staffId);
    if (!target) return;

    const nextAttendance = { ...target.attendanceData, [dateStr]: nextStatus };
    setStaff(prev => prev.map(s => (
      s.id === staffId ? { ...s, attendanceData: nextAttendance } : s
    )));
    patchStaffOnServer(staffId, { attendanceData: nextAttendance }).catch((error) => {
      console.error('종사자 출결 저장 실패:', error);
    });
  };

  const resetFilters = () => { setSearchQuery(''); setStartDate(''); setEndDate(''); };

  const handleSaveIndividual = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updated = {
      ...selectedStaff,
      name: formData.get('name'),
      joinDate: formData.get('joinDate').replace(/-/g, '.'),
      role: formData.get('role'),
    };

    try {
      await patchStaffOnServer(updated.id, updated);
      setStaff(prev => prev.map(s => s.id === updated.id ? updated : s));
      setSelectedStaff(null);
      alert('인사 정보와 개별 권한이 저장되었습니다.');
    } catch (error) {
      console.error('종사자 저장 실패:', error);
      alert('종사자 정보를 저장하지 못했습니다.');
    }
  };

  const handleCreateStaff = async () => {
    if (!newStaff.name || !newStaff.role) {
      alert('이름과 직위를 입력해주세요.');
      return;
    }

    const member = {
      id: Date.now(),
      name: newStaff.name,
      role: newStaff.role,
      type: newStaff.type,
      joinDate: newStaff.joinDate.replace(/-/g, '.'),
      contact: newStaff.contact,
      status: '재직',
      email: newStaff.email,
      address: newStaff.address,
      birth: newStaff.birth,
      permissions: {
        children_list: false,
        children_ledger: false,
        children_scan: true,
      },
      attendanceData: {},
    };

    setIsSavingStaff(true);
    try {
      await authApi('/api/staff', {
        method: 'POST',
        body: JSON.stringify({ member }),
      });
      setStaff((prev) => [...prev, member]);
      setIsAddStaffOpen(false);
      setNewStaff({
        name: '',
        role: '',
        type: '정규직',
        contact: '',
        joinDate: new Date().toISOString().split('T')[0],
        email: '',
        address: '',
        birth: '',
      });
      alert('종사자가 등록되었습니다.');
    } catch (error) {
      console.error('종사자 등록 실패:', error);
      alert('종사자를 등록하지 못했습니다.');
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;
    if (!window.confirm(`${selectedStaff.name} 종사자 정보를 삭제하시겠습니까?`)) return;

    try {
      await authApi(`/api/staff/${selectedStaff.id}`, {
        method: 'DELETE',
      });
      setStaff((prev) => prev.filter((item) => item.id !== selectedStaff.id));
      setSelectedStaff(null);
      alert('종사자 정보가 삭제되었습니다.');
    } catch (error) {
      console.error('종사자 삭제 실패:', error);
      alert('종사자 정보를 삭제하지 못했습니다.');
    }
  };

  const simulateLogin = (s) => {
    localStorage.setItem('userRole', 'NON_STAFF');
    localStorage.setItem('currentUser', JSON.stringify(s));
    window.location.reload(); // Reload to apply specific staff permissions
  };

  return (
    <div className="font-['Outfit'] space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-4 bg-white p-4 md:p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 md:flex-row md:items-end md:justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-indigo-900 rounded-2xl flex items-center justify-center shadow-lg"><Briefcase className="w-6 h-6 text-indigo-400" /></div>
             <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic m-0">종사자 관리 <span className="text-[10px] not-italic bg-indigo-600 text-white px-3 py-1 rounded-full uppercase tracking-widest font-black">관리자 모드</span></h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 m-0">종사자 출결 및 인사 기록 시스템</p>
             </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'active', label: '재직 종사자', icon: UserCheck },
              { id: 'attendance', label: '종사자 출결대장', icon: FileSpreadsheet },
              { id: 'permissions', label: '메뉴/탭 권한 설정', icon: ShieldCheck },
              { id: 'terminated', label: '퇴사 종사자', icon: X }
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 py-2 px-4 md:px-5 rounded-xl text-[11px] font-black transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:bg-slate-50'}`}>
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:mb-1">
           {activeTab === 'attendance' ? (
             <>
               <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 text-slate-700 font-bold text-[11px] transition-all"><Download className="w-4 h-4 text-indigo-500" /> 대장 양식</button>
               <button className="flex items-center gap-2 px-6 py-3 bg-indigo-900 text-white rounded-2xl shadow-xl shadow-indigo-900/20 hover:bg-black font-black text-[11px] transition-all"><Printer className="w-4 h-4" /> 인쇄하기</button>
             </>
           ) : activeTab === 'permissions' ? (
             <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 font-black text-[11px] transition-all whitespace-nowrap"><Save className="w-4 h-4" /> 권한 변경사항 즉시 적용</button>
           ) : (
             <button onClick={() => setIsAddStaffOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 font-black text-[11px] transition-all"><UserPlus className="w-4 h-4" /> 종사자 추가</button>
           )}
        </div>
      </div>

      {activeTab === 'permissions' ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 p-2 max-w-[1400px] mx-auto">
           <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden border-b-4 border-emerald-500">
              <div className="relative z-10 flex items-center justify-between">
                 <div className="space-y-1">
                    <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-400" /><h3 className="text-xl font-black tracking-tighter uppercase m-0 text-white">시스템 권한 매트릭스</h3></div>
                    <p className="text-[10px] font-bold text-slate-400 m-0 italic-none">직급 및 개별 종사자의 접근 권한을 실시간으로 관리합니다. 변경사항은 즉시 반영됩니다.</p>
                 </div>
                 <div className="px-5 py-2 bg-white/10 rounded-xl border border-white/10 font-black text-xs tracking-widest uppercase text-white">대상 권한: 일반 사용자</div>
              </div>
           </div>

           {isAdmin && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
               <form onSubmit={handleCreateSystemUser} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-lg p-5 space-y-4">
                 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                   <h4 className="text-xs font-black uppercase tracking-widest text-slate-600">계정 생성</h4>
                   <span className="text-[10px] font-black text-slate-400 uppercase">관리자 API</span>
                 </div>
                 <input
                   type="text"
                   value={newSystemUser.id}
                   onChange={(e) => setNewSystemUser((prev) => ({ ...prev, id: e.target.value.trim() }))}
                   placeholder="아이디"
                   className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                 />
                 <input
                   type="text"
                   value={newSystemUser.name}
                   onChange={(e) => setNewSystemUser((prev) => ({ ...prev, name: e.target.value }))}
                   placeholder="이름"
                   className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                 />
                 <input
                   type="password"
                   value={newSystemUser.password}
                   onChange={(e) => setNewSystemUser((prev) => ({ ...prev, password: e.target.value }))}
                   placeholder="비밀번호 (6자 이상)"
                   className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                 />
                 <select
                   value={newSystemUser.role}
                   onChange={(e) => setNewSystemUser((prev) => ({ ...prev, role: e.target.value }))}
                   className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-black outline-none"
                 >
                   <option value="NON_STAFF">일반 사용자</option>
                   <option value="ADMIN">관리자</option>
                 </select>
                 <button
                   type="submit"
                   disabled={isCreatingUser}
                   className="w-full py-3 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:bg-slate-300"
                 >
                   {isCreatingUser ? '생성 중...' : '계정 생성'}
                 </button>
                 {userError && (
                   <div className="text-[11px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-3 py-2 rounded-lg">
                     {userError}
                   </div>
                 )}
               </form>

               <div className="lg:col-span-2 bg-white rounded-[1.5rem] border border-slate-100 shadow-lg p-5 space-y-4">
                 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                   <h4 className="text-xs font-black uppercase tracking-widest text-slate-600">시스템 사용자 목록</h4>
                   <button
                     onClick={loadSystemUsers}
                     className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                   >
                     새로고침
                   </button>
                 </div>

                 {userLoading ? (
                   <div className="py-10 text-center text-sm font-bold text-slate-400">사용자 목록 조회 중...</div>
                 ) : (
                   <div className="space-y-3">
                     {systemUsers.map((user) => (
                       <div key={user.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50/60 space-y-3">
                         <div className="flex flex-wrap items-center justify-between gap-3">
                           <div>
                             <div className="text-sm font-black text-slate-900">{user.name} <span className="text-slate-400 font-bold">({user.id})</span></div>
                             <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{user.role}</div>
                           </div>
                           <button
                             onClick={() => handleToggleSystemUserActive(user)}
                             className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${user.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                           >
                             {user.active ? '활성' : '비활성'}
                           </button>
                         </div>
                         <div className="flex gap-2">
                           <input
                             type="password"
                             value={passwordDrafts[user.id] || ''}
                             onChange={(e) => setPasswordDrafts((prev) => ({ ...prev, [user.id]: e.target.value }))}
                             placeholder="새 비밀번호"
                             className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                           />
                           <button
                             onClick={() => handleSystemUserPasswordChange(user.id)}
                             className="px-3 py-2 rounded-lg bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                           >
                             비번 변경
                           </button>
                         </div>
                       </div>
                     ))}
                     {systemUsers.length === 0 && (
                       <div className="py-8 text-center text-sm font-bold text-slate-400">등록된 사용자가 없습니다.</div>
                     )}
                   </div>
                 )}
               </div>

               <div className="lg:col-span-3 rounded-[1.5rem] border border-amber-100 bg-amber-50/70 p-5 shadow-lg space-y-4">
                 <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                   <div>
                     <h4 className="text-xs font-black uppercase tracking-widest text-amber-700">브라우저 로컬 데이터 이관</h4>
                     <p className="mt-1 text-[11px] font-bold text-amber-900/70">현재 브라우저 `localStorage` 에 남아 있는 아동, 종사자, 회의록, 프로그램, 캘린더 데이터를 서버 저장소로 한 번에 옮깁니다.</p>
                   </div>
                   <button
                     onClick={handleMigrateLocalData}
                     disabled={isMigratingLocalData}
                     className="rounded-xl bg-amber-500 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-amber-600 disabled:bg-amber-300"
                   >
                     {isMigratingLocalData ? '이관 중...' : '지금 이관'}
                   </button>
                 </div>
                 {migrationSummary && (
                   <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
                     {[
                       { label: '아동', value: migrationSummary.children },
                       { label: '스캔 로그', value: migrationSummary.scanLogs },
                       { label: '종사자', value: migrationSummary.staff },
                       { label: '회의록', value: migrationSummary.meetings },
                       { label: '프로그램', value: migrationSummary.programs },
                       { label: '일정', value: migrationSummary.events },
                       { label: '캘린더 URL', value: migrationSummary.calendarUrlUpdated ? '업데이트' : '건너뜀' },
                     ].map((item) => (
                       <div key={item.label} className="rounded-xl border border-amber-100 bg-white px-4 py-3">
                         <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">{item.label}</p>
                         <p className="mt-2 text-lg font-black text-slate-900">{item.value}</p>
                       </div>
                     ))}
                   </div>
                 )}
               </div>

               <div className="lg:col-span-3 bg-white rounded-[1.5rem] border border-slate-100 shadow-lg p-5 space-y-4">
                 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                   <div>
                     <h4 className="text-xs font-black uppercase tracking-widest text-slate-600">최근 감사로그</h4>
                     <p className="mt-1 text-[11px] font-bold text-slate-400">아동, 종사자, 회의록, 프로그램, 권한 변경 이력을 최근 순으로 표시합니다.</p>
                   </div>
                   <button
                     onClick={loadAuditLogs}
                     className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                   >
                     새로고침
                   </button>
                 </div>

                 <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                   <select
                     value={auditModuleFilter}
                     onChange={(e) => setAuditModuleFilter(e.target.value)}
                     className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100"
                   >
                     <option value="">전체 모듈</option>
                     <option value="children">children</option>
                     <option value="staff">staff</option>
                     <option value="meetings">meetings</option>
                     <option value="programs">programs</option>
                     <option value="admin">admin</option>
                   </select>
                   <select
                     value={auditActorFilter}
                     onChange={(e) => setAuditActorFilter(e.target.value)}
                     className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100"
                   >
                     <option value="">전체 사용자</option>
                     {auditActorOptions.map((actor) => (
                       <option key={actor.id} value={actor.id}>
                         {actor.name} ({actor.id})
                       </option>
                     ))}
                   </select>
                   <button
                     onClick={() => {
                       setAuditModuleFilter('');
                       setAuditActorFilter('');
                     }}
                     className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-500 transition-all hover:bg-slate-50"
                   >
                     필터 초기화
                   </button>
                 </div>

                 {auditLoading ? (
                   <div className="py-10 text-center text-sm font-bold text-slate-400">감사로그 조회 중...</div>
                 ) : auditLogs.length > 0 ? (
                   <div className="space-y-3">
                     {auditLogs.map((log) => (
                       <div key={log.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                         <div className="flex flex-wrap items-center justify-between gap-3">
                           <div className="flex flex-wrap items-center gap-2">
                             <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">{log.module}</span>
                             <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-600">{log.action}</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{new Date(log.at).toLocaleString('ko-KR')}</span>
                             <button
                               onClick={() => setExpandedAuditLogId((prev) => (prev === log.id ? null : log.id))}
                               className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-100"
                             >
                               {expandedAuditLogId === log.id ? '상세 닫기' : '상세 보기'}
                             </button>
                           </div>
                         </div>
                         <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                           <div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">행위자</p>
                             <p className="mt-1 font-black text-slate-900">{log.actorId}</p>
                           </div>
                           <div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">대상</p>
                             <p className="mt-1 font-black text-slate-900">{log.targetLabel || log.targetId || '-'}</p>
                           </div>
                           <div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">유형</p>
                             <p className="mt-1 font-black text-slate-900">{log.targetType}</p>
                           </div>
                         </div>
                         {expandedAuditLogId === log.id && (
                           <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">변경 상세</p>
                             <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-[11px] font-semibold leading-6 text-slate-100">
{JSON.stringify(log.details || {}, null, 2)}
                             </pre>
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="py-8 text-center text-sm font-bold text-slate-400">표시할 감사로그가 없습니다.</div>
                 )}
               </div>
             </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-lg p-5 space-y-4">
                 <div className="flex items-center gap-3 border-b border-slate-50 pb-3 uppercase tracking-widest font-black text-[9px] text-slate-400"><LayoutDashboard className="w-4 h-4" /> 메인 메뉴 접근 권한</div>
                 <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { key: 'dashboard', label: '대시보드' },
                      { key: 'children', label: '아동 관리/출결' },
                      { key: 'calendar', label: '일정/캘린더' },
                      { key: 'staff', label: '종사자 관리' },
                      { key: 'programs', label: '프로그램 관리' },
                      { key: 'meetings', label: '운영회의록' },
                      { key: 'stats', label: '행정 보고/통계' },
                      { key: 'facility', label: '시설/자산 관리' },
                    ].map((item) => (
                      <div key={item.key} onClick={() => togglePermission('NON_STAFF', item.key)} className={`flex items-center justify-between px-4 py-2 rounded-lg border transition-all cursor-pointer ${permissions.NON_STAFF[item.key] ? 'border-indigo-100 bg-indigo-50/30' : 'border-slate-50 bg-white opacity-40'}`}>
                         <span className={`text-[10px] font-black ${permissions.NON_STAFF[item.key] ? 'text-indigo-900' : 'text-slate-400'}`}>{item.label}</span>
                         <div className={`w-8 h-4 rounded-full relative transition-all ${permissions.NON_STAFF[item.key] ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                            <div className={`absolute top-1 w-2 h-2 bg-white rounded-full transition-all ${permissions.NON_STAFF[item.key] ? (permissions.NON_STAFF[item.key] ? 'right-1' : 'left-1') : 'left-1'}`} style={{ right: permissions.NON_STAFF[item.key] ? '4px' : 'auto', left: !permissions.NON_STAFF[item.key] ? '4px' : 'auto' }} />
                         </div>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-lg p-5 space-y-4">
                 <div className="flex items-center gap-3 border-b border-slate-50 pb-3 uppercase tracking-widest font-black text-[9px] text-slate-400"><Users className="w-4 h-4" /> 아동 및 출결 권한</div>
                 <div className="space-y-3">
                    <div className="p-4 bg-slate-900 rounded-xl space-y-3">
                       <h6 className="text-[8px] font-black text-blue-400 uppercase tracking-widest">아동 기록 권한</h6>
                       <div className="grid grid-cols-2 gap-2">
                          {[{key:'children_view', label:'조회'}, {key:'children_create', label:'신규'}, {key:'children_edit', label:'수정'}, {key:'children_delete', label:'삭제'}].map(p => (
                            <div key={p.key} onClick={() => togglePermission('NON_STAFF', p.key)} className={`px-2 py-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${permissions.NON_STAFF[p.key] ? 'border-blue-500 bg-blue-500/20 text-white' : 'border-slate-800 text-slate-600'}`}>
                               <span className="text-[9px] font-black">{p.label}</span>
                               {permissions.NON_STAFF[p.key] ? <CheckCircle2 className="w-3 h-3 text-blue-400" /> : <div className="w-3 h-3 rounded-sm border border-slate-700" />}
                            </div>
                          ))}
                       </div>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-xl space-y-3 border border-indigo-100">
                       <h6 className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">출결 관리 권한</h6>
                       <div className="grid grid-cols-2 gap-2">
                          {[{key:'attendance_view', label:'대장조회'}, {key:'attendance_edit', label:'상태편집'}, {key:'attendance_excel', label:'엑셀작업'}, {key:'rfid_access', label:'RFID처리'}].map(p => (
                            <div key={p.key} onClick={() => togglePermission('NON_STAFF', p.key)} className={`px-2 py-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${permissions.NON_STAFF[p.key] ? 'border-indigo-600 bg-white text-indigo-600 shadow-sm' : 'border-slate-200 text-slate-300'}`}>
                               <span className="text-[9px] font-black">{p.label}</span>
                               {permissions.NON_STAFF[p.key] ? <CheckCircle2 className="w-3 h-3 text-indigo-600" /> : <div className="w-3 h-3 rounded-sm border border-slate-200" />}
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-lg p-5 space-y-4">
                 <div className="flex items-center gap-3 border-b border-slate-50 pb-3 uppercase tracking-widest font-black text-[9px] text-slate-400"><Settings2 className="w-4 h-4" /> 기타 모듈 권한</div>
                 <div className="space-y-3">
                    <div className="p-4 bg-emerald-50 rounded-xl space-y-3 border border-emerald-100">
                       <h6 className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">종사자 관리 권한</h6>
                       <div className="grid grid-cols-1 gap-1.5">
                          {[{key:'staff_view', label:'종사자 리스트'}, {key:'staff_attendance', label:'종사자 출결대장'}, {key:'staff_permissions', label:'권한 매트릭스 설정'}].map(p => (
                            <div key={p.key} onClick={() => togglePermission('NON_STAFF', p.key)} className={`px-3 py-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${permissions.NON_STAFF[p.key] ? 'border-emerald-500 bg-white text-emerald-600 shadow-sm' : 'border-slate-200 text-slate-300'}`}>
                               <span className="text-[9px] font-black">{p.label}</span>
                               <div className={`w-3 h-3 rounded-full flex items-center justify-center ${permissions.NON_STAFF[p.key] ? 'bg-emerald-500 text-white' : 'bg-slate-100'}`}><CheckCircle2 className="w-2 h-2" /></div>
                            </div>
                          ))}
                       </div>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-xl space-y-3 border border-amber-100">
                       <h6 className="text-[8px] font-black text-amber-600 uppercase tracking-widest">캘린더 권한</h6>
                       <div className="grid grid-cols-2 gap-2">
                          {[{key:'calendar_google', label:'구글 연동'}, {key:'calendar_local', label:'기관 일정'}, {key:'calendar_sync', label:'연동 설정'}].map(p => (
                            <div key={p.key} onClick={() => togglePermission('NON_STAFF', p.key)} className={`px-2 py-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${permissions.NON_STAFF[p.key] ? 'border-amber-500 bg-white text-amber-600 shadow-sm' : 'border-slate-200 text-slate-300'}`}>
                               <span className="text-[9px] font-black">{p.label}</span>
                               <div className={`w-2.5 h-2.5 rounded-full border ${permissions.NON_STAFF[p.key] ? 'bg-amber-500 border-amber-500' : 'border-slate-300'}`} />
                            </div>
                          ))}
                       </div>
                    </div>
                    <div className="p-4 bg-rose-50 rounded-xl space-y-3 border border-rose-100">
                       <h6 className="text-[8px] font-black text-rose-600 uppercase tracking-widest">기록 보관 권한</h6>
                       <div className="grid grid-cols-2 gap-2">
                          {[
                            {key:'records_children', label:'아동기록'}, 
                            {key:'records_meeting', label:'회의록'}, 
                            {key:'records_autonomy', label:'자치회의'}, 
                            {key:'records_heart', label:'마음편지'}
                          ].map(p => (
                            <div key={p.key} onClick={() => togglePermission('NON_STAFF', p.key)} className={`px-2 py-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${permissions.NON_STAFF[p.key] ? 'border-rose-500 bg-white text-rose-600 shadow-sm' : 'border-slate-200 text-slate-300'}`}>
                               <span className="text-[9px] font-black">{p.label}</span>
                               {permissions.NON_STAFF[p.key] ? <CheckCircle2 className="w-2 h-2 text-rose-600" /> : <div className="w-2 h-2 rounded-sm border border-slate-200" />}
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      ) : activeTab === 'attendance' ? (
        <div className="space-y-6">
           <div className="bg-white p-4 md:p-6 rounded-[2rem] border border-slate-100 shadow-lg flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                 <div className="flex items-center overflow-x-auto bg-slate-100 rounded-[1.25rem] p-1.5 border border-slate-200 shadow-inner">
                    {[2024, 2025, 2026].map(y => (
                      <button key={y} onClick={() => setSelectedYear(y)} className={`px-6 py-2.5 rounded-xl text-[11px] font-black transition-all ${selectedYear === y ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-400'}`}>{y}년</button>
                    ))}
                 </div>
                 <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedMonth(m => m > 1 ? m - 1 : 12)} className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"><ChevronLeft className="w-5 h-5 text-slate-400" /></button>
                    <div className="text-2xl font-black text-slate-900 tracking-tighter w-20 text-center">{selectedMonth}월</div>
                    <button onClick={() => setSelectedMonth(m => m < 12 ? m + 1 : 1)} className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"><ChevronRight className="w-5 h-5 text-slate-400" /></button>
                 </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 px-4 md:px-6 py-3 rounded-2xl border border-slate-100 shadow-inner">
                 {Object.entries(statusMap).map(([key, value]) => (
                   <div key={key} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg ${value.color} flex items-center justify-center text-[10px]`}>{value.label}</div>
                      <span>{key}</span>
                   </div>
                 ))}
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden overflow-x-auto relative">
              <table className="w-full text-center border-collapse text-[10px]" style={{ minWidth: '1600px' }}>
                 <thead className="sticky top-0 z-20">
                    <tr className="bg-slate-900 text-slate-300 font-black uppercase tracking-[0.2em] text-[9px]">
                       <th className="sticky left-0 z-30 bg-slate-900 border-r border-white/10 px-8 py-5 min-w-[200px] text-left" rowSpan={2}>성명 / 직위</th>
                       {monthDates.map(d => (
                         <th key={d.num} className={`border-r border-white/5 py-3 min-w-[50px] ${d.isWeekend ? (d.day === '일' ? 'text-red-400 bg-red-400/10' : 'text-indigo-400 bg-indigo-400/10') : ''}`}>
                           {d.num}
                         </th>
                       ))}
                       <th className="px-5 py-5 min-w-[80px]" rowSpan={2}>출근</th>
                       <th className="px-5 py-5 min-w-[80px]" rowSpan={2}>연가</th>
                       <th className="px-5 py-5 min-w-[80px]" rowSpan={2}>병가</th>
                    </tr>
                    <tr className="bg-slate-800 text-[10px] font-black text-slate-400 border-b border-white/5">
                       {monthDates.map(d => (
                         <th key={d.num} className={`border-r border-white/5 py-2 ${d.isWeekend ? (d.day === '일' ? 'text-red-400' : 'text-indigo-400') : ''}`}>
                            {d.day}
                         </th>
                       ))}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {staff.filter(s => s.status === '재직').map(s => {
                      const logs = s.attendanceData || {};
                      const counts = Object.values(logs).reduce((acc, curr) => {
                        if (curr === '출근') acc.work++;
                        if (curr === '연가') acc.vacation++;
                        if (curr === '병가') acc.sick++;
                        return acc;
                      }, { work: 0, vacation: 0, sick: 0 });

                      return (
                        <tr key={s.id} className="hover:bg-slate-50 transition-all group">
                           <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-100 px-8 py-4 text-left shadow-xl shadow-slate-900/5">
                              <div className="flex flex-col">
                                 <span className="text-slate-900 text-sm font-black">{s.name}</span>
                                 <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{s.role}</span>
                              </div>
                           </td>
                           {monthDates.map(d => {
                             const status = logs[d.full];
                             const mapping = statusMap[status];
                             return (
                               <td 
                                 key={d.num} 
                                 onClick={() => handleStatusChange(s.id, d.full, status)}
                                 className={`border-r border-slate-50 p-1 cursor-pointer transition-all hover:bg-indigo-50/50 relative ${d.isWeekend ? (d.day === '일' ? 'bg-red-50/10' : 'bg-indigo-50/10') : ''}`}
                               >
                                  <div className={`w-9 h-9 mx-auto rounded-xl flex items-center justify-center font-black transition-all ${mapping ? mapping.color + ' shadow-sm' : 'text-slate-200'}`}>
                                     {mapping ? mapping.label : '-'}
                                  </div>
                               </td>
                             )
                           })}
                           <td className="px-2 py-4 font-black text-emerald-600 bg-slate-50/30 text-xs">{counts.work}일</td>
                           <td className="px-2 py-4 font-black text-blue-600 bg-slate-50/30 text-xs">{counts.vacation}일</td>
                           <td className="px-2 py-4 font-black text-red-600 bg-slate-50/30 text-xs">{counts.sick}일</td>
                        </tr>
                      )
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-4 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="이름, 직위 또는 연락처 검색..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="grid gap-4 md:hidden">
            {filteredStaff.length > 0 ? (
              filteredStaff.map((s) => (
                <button
                  key={`mobile-${s.id}`}
                  onClick={() => setSelectedStaff(s)}
                  className="rounded-[1.8rem] border border-slate-200 bg-white p-4 text-left shadow-[0_18px_40px_rgba(148,163,184,0.12)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-black text-slate-900">{s.name}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-indigo-500">{s.role}</p>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black text-indigo-600">{s.type}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">연락처</p>
                      <p className="mt-1 text-sm font-bold text-slate-700">{s.contact}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{activeTab === 'terminated' ? '퇴사일' : '입사일'}</p>
                      <p className="mt-1 text-sm font-bold text-slate-700">{activeTab === 'terminated' ? s.termination : s.joinDate}</p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[1.8rem] border border-slate-200 bg-white px-6 py-16 text-center text-sm font-black text-slate-300">
                No Personnel Records Found
              </div>
            )}
          </div>

          <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden p-2">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-slate-900 text-slate-300 font-black uppercase tracking-[0.3em] text-[9px]">
                <tr>
                  <th className="px-8 py-5">성명</th>
                  <th className="px-8 py-5">직위</th>
                  <th className="px-8 py-5">고용형태</th>
                  <th className="px-8 py-5">연락처</th>
                  <th className="px-8 py-5">{activeTab === 'terminated' ? '퇴사일' : '입사일'}</th>
                  <th className="px-8 py-5 text-right">상세조회</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((s) => (
                    <tr key={s.id} onClick={() => setSelectedStaff(s)} className="hover:bg-indigo-50/40 transition-all cursor-pointer group">
                      <td className="px-8 py-5 font-black text-slate-900 text-base">{s.name}</td>
                      <td className="px-8 py-5"><span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-tighter">{s.role}</span></td>
                      <td className="px-8 py-5 text-slate-500 font-black">{s.type}</td>
                      <td className="px-8 py-5 text-slate-500 font-black">{s.contact}</td>
                      <td className="px-8 py-5 text-slate-400 font-black">{activeTab === 'terminated' ? s.termination : s.joinDate}</td>
                      <td className="px-8 py-5 text-right"><button className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black opacity-0 group-hover:opacity-100 transition-all uppercase tracking-[0.2rem] shadow-xl">상세 열기</button></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-32 text-center text-slate-300 font-black italic uppercase tracking-[0.5em]">No Personnel Records Found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Card Modal */}
      <AnimatePresence>
        {selectedStaff && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedStaff(null)} className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 50 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 50 }} className="relative w-full max-w-6xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border-8 border-white">
              <div className="w-full md:w-[400px] bg-slate-50 p-12 flex flex-col items-center border-r border-slate-100 relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full blur-3xl -translate-y-20 translate-x-20" />
                <div className="w-full aspect-[3/4] bg-white rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-200 group hover:border-indigo-400 transition-all shadow-xl relative z-10 overflow-hidden">
                   <Camera className="w-12 h-12 mb-4 group-hover:scale-110 transition-transform" />
                   <span className="text-[10px] font-black uppercase tracking-widest bg-slate-50 px-5 py-2 rounded-full">Official Photo</span>
                </div>
                <div className="mt-8 text-center relative z-10 w-full space-y-4">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{selectedStaff.name}</h3>
                    <div className="text-indigo-600 font-black text-xs uppercase mt-2 tracking-[0.3em] bg-indigo-50 px-6 py-2 rounded-full italic shadow-sm">{selectedStaff.role}</div>
                  </div>
                  <button onClick={() => simulateLogin(selectedStaff)} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 transition-all">
                    <UserCheck className="w-4 h-4" /> 이 종사자로 로그인 테스트
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveIndividual} className="flex-1 p-12 overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><UserCheck className="w-6 h-6 text-white" /></div>
                    <div>
                       <h4 className="text-xl font-black text-slate-900 m-0">개별 권한 및 인사정보 설정 <small className="text-slate-400 ml-2 text-[10px] uppercase font-black tracking-widest">PERM_NODE_{selectedStaff.id}</small></h4>
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 m-0">Individual Access Control Panel</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedStaff(null)} className="p-4 hover:bg-slate-50 rounded-full transition-all active:scale-75"><X className="w-7 h-7 text-slate-300" /></button>
                </div>

                <div className="space-y-10">
                  <section className="space-y-6">
                    <h5 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-indigo-50 pb-4"><ShieldCheck className="w-4 h-4" /> 세부 기능 접근 권한 (Granular Control)</h5>
                    <div className="space-y-6">
                       <div className="bg-slate-900 p-8 rounded-[2.5rem] space-y-4">
                          <h6 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Children Management (아동관리)</h6>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                             {[
                               { key: 'children_view', label: '목록 조회' },
                               { key: 'children_create', label: '신규 등록' },
                               { key: 'children_edit', label: '정보 수정' },
                               { key: 'children_delete', label: '데이터 삭제' },
                             ].map(p => (
                               <div key={p.key} onClick={() => {
                                 const newPerms = { ...selectedStaff.permissions, [p.key]: !selectedStaff.permissions?.[p.key] };
                                 setSelectedStaff({ ...selectedStaff, permissions: newPerms });
                               }} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${selectedStaff.permissions?.[p.key] ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-slate-800 bg-transparent text-slate-500'}`}>
                                  <span className="text-[11px] font-black">{p.label}</span>
                                  {selectedStaff.permissions?.[p.key] ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded border border-slate-700" />}
                               </div>
                             ))}
                          </div>
                       </div>

                       <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-4">
                         <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">출결 및 RFID 권한</h6>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                             {[
                               { key: 'attendance_view', label: '대장 조회' },
                               { key: 'attendance_edit', label: '수동 편집' },
                               { key: 'attendance_excel', label: '엑셀 작업' },
                               { key: 'rfid_access', label: 'RFID 처리' },
                             ].map(p => (
                               <div key={p.key} onClick={() => {
                                 const newPerms = { ...selectedStaff.permissions, [p.key]: !selectedStaff.permissions?.[p.key] };
                                 setSelectedStaff({ ...selectedStaff, permissions: newPerms });
                               }} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${selectedStaff.permissions?.[p.key] ? 'border-indigo-600 bg-indigo-600/10 text-indigo-600' : 'border-slate-200 bg-white text-slate-300'}`}>
                                  <span className="text-[11px] font-black">{p.label}</span>
                                  {selectedStaff.permissions?.[p.key] ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded border border-slate-200" />}
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-slate-50 pb-4"><Briefcase className="w-4 h-4" /> 기본 인사정보</h5>
                    <div className="grid grid-cols-2 gap-8">
                       <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">성명</label><input name="name" type="text" defaultValue={selectedStaff.name} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-base shadow-inner outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" /></div>
                       <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">직위</label><input name="role" type="text" defaultValue={selectedStaff.role} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-base shadow-inner outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" /></div>
                       <div className="space-y-3 col-span-2"><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">입사일</label><input name="joinDate" type="date" defaultValue={selectedStaff.joinDate.replace(/\./g, '-')} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-base shadow-inner outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" /></div>
                    </div>
                  </section>
                </div>

                <div className="mt-12 flex flex-col gap-4 md:flex-row">
                  <button type="button" onClick={handleDeleteStaff} className="w-full md:w-auto px-8 py-6 bg-rose-50 text-rose-600 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] border border-rose-100 shadow-lg hover:bg-rose-100 transition-all">
                    종사자 삭제
                  </button>
                  <button type="submit" className="flex-1 py-6 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.5em] shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-4">
                    <Save className="w-5 h-5 text-emerald-400" /> 개별 권한 및 정보 저장
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddStaffOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddStaffOpen(false)} className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 30 }} className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[3rem] bg-white shadow-2xl">
              <div className="flex items-center justify-between bg-slate-900 px-8 py-6 text-white">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter uppercase italic">신규 종사자 등록</h3>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Personnel onboarding node</p>
                </div>
                <button type="button" onClick={() => setIsAddStaffOpen(false)} className="rounded-2xl p-3 transition-all hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-5 p-8 md:grid-cols-2">
                <input value={newStaff.name} onChange={(e) => setNewStaff((prev) => ({ ...prev, name: e.target.value }))} placeholder="이름" className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-black outline-none" />
                <input value={newStaff.role} onChange={(e) => setNewStaff((prev) => ({ ...prev, role: e.target.value }))} placeholder="직위" className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-black outline-none" />
                <select value={newStaff.type} onChange={(e) => setNewStaff((prev) => ({ ...prev, type: e.target.value }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-black outline-none">
                  <option value="정규직">정규직</option>
                  <option value="계약직">계약직</option>
                  <option value="시간제">시간제</option>
                </select>
                <input type="date" value={newStaff.joinDate} onChange={(e) => setNewStaff((prev) => ({ ...prev, joinDate: e.target.value }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-black outline-none" />
                <input value={newStaff.contact} onChange={(e) => setNewStaff((prev) => ({ ...prev, contact: e.target.value }))} placeholder="연락처" className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-black outline-none" />
                <input type="date" value={newStaff.birth} onChange={(e) => setNewStaff((prev) => ({ ...prev, birth: e.target.value }))} className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-black outline-none" />
                <input value={newStaff.email} onChange={(e) => setNewStaff((prev) => ({ ...prev, email: e.target.value }))} placeholder="이메일" className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-black outline-none md:col-span-2" />
                <input value={newStaff.address} onChange={(e) => setNewStaff((prev) => ({ ...prev, address: e.target.value }))} placeholder="주소" className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-black outline-none md:col-span-2" />
              </div>

              <div className="flex gap-4 border-t border-slate-100 bg-slate-50 px-8 py-6">
                <button type="button" onClick={() => setIsAddStaffOpen(false)} className="flex-1 rounded-[1.5rem] border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-500 transition-all hover:bg-slate-100">
                  취소
                </button>
                <button type="button" onClick={handleCreateStaff} disabled={isSavingStaff} className="flex-[1.5] rounded-[1.5rem] bg-indigo-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-indigo-500/20 transition-all hover:bg-indigo-700 disabled:bg-slate-300">
                  {isSavingStaff ? '등록 중...' : '종사자 등록'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Footer Branding */}
      <div className="flex justify-center items-center py-6 opacity-20 pointer-events-none">
         <Briefcase className="w-5 h-5 mr-3" />
         <span className="text-[11px] font-black uppercase tracking-[1em]">Personnel Core Layer v4.0.2</span>
      </div>
    </div>
  );
};

export default StaffPage;

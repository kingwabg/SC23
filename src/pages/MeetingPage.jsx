import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  FileEdit, 
  MoreVertical, 
  Calendar as CalendarIcon, 
  User, 
  Download, 
  RotateCcw,
  Users,
  MessageSquare,
  ShieldCheck,
  ClipboardList,
  Heart,
  Plus,
  ArrowRight,
  Filter,
  History,
  FileText,
  Clock,
  SearchIcon,
  Trash2,
  FilePlus,
  Printer,
  CheckCircle2,
  AlertCircle,
  Stamp,
  CheckSquare
} from 'lucide-react';
import LexicalApp from '../components/LexicalEditor/App';
import '../components/LexicalEditor/index.css';
import { authApi } from '../utils/apiClient';

const cloneData = (value) => JSON.parse(JSON.stringify(value));

const FALLBACK_MEETINGS = [
  {
    id: 6,
    year: 2026,
    date: '2026.03.20',
    type: 'LOG',
    title: '시설 운영일지 - 3월 20일 목요일',
    writer: '최하은',
    status: '작성중',
    startTime: '10:00',
    endTime: '19:00',
    approval: {
      manager: { name: '최하은', confirmed: false, date: null },
      director: { name: '김민수', confirmed: false, date: null }
    },
    stats: {
      children: {
        male: { pre: 0, elem: 2, mid: 2, high: 0, extra: 5, total: 9 },
        female: { pre: 0, elem: 14, mid: 2, high: 0, extra: 9, total: 25 }
      },
      attendance: { limit: 40, current: 34, present: 32, official: 1, alt: 0, absent: 1, extra: 0 },
      meals: { morning: 0, lunch: 0, dinner: 32 },
      staff: { total: 3, teachers: 2, instructors: 1, extra: 0 }
    },
    content: '<h3>시설 운영일지 (3월 20일)</h3><p>금일은 학기중 운영 시간표에 맞춰 정상 운영되었습니다.</p>'
  }
];

const loadLegacyMeetings = () => {
  try {
    const saved = localStorage.getItem('operationMeetingsData');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch (error) {
    return null;
  }
};

const MeetingPage = () => {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [activeCategory, setActiveCategory] = useState('LOG'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [checkedLogs, setCheckedLogs] = useState([]);
  const [tableContextMenu, setTableContextMenu] = useState({ visible: false, x: 0, y: 0, cell: null });
  const editorRef = useRef();
  
  // Load staff and children for auto-aggregation
  const staffList = useMemo(() => {
    const saved = localStorage.getItem('forestStaffList');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: '김민수', role: '시설장' },
      { id: 2, name: '이영희', role: '생활복지사' },
      { id: 3, name: '박철수', role: '조리원' }
    ];
  }, []);

  const childrenList = useMemo(() => {
    const saved = localStorage.getItem('forestChildrenList');
    return saved ? JSON.parse(saved) : [];
  }, []);

  // 샘플 데이터 구조 - 결재 및 집계 데이터 확장
  const [meetings, setMeetings] = useState(() => cloneData(loadLegacyMeetings() || FALLBACK_MEETINGS));
  const [meetingsSyncReady, setMeetingsSyncReady] = useState(false);

  useEffect(() => {
    const hydrateMeetings = async () => {
      const legacyMeetings = loadLegacyMeetings();
      try {
        const data = await authApi('/api/meetings');
        const serverMeetings = Array.isArray(data.meetings) ? data.meetings : [];

        if (serverMeetings.length > 0) {
          setMeetings(cloneData(serverMeetings));
        } else {
          const seedMeetings = cloneData(legacyMeetings || FALLBACK_MEETINGS);
          setMeetings(seedMeetings);
          await authApi('/api/meetings/bulk', {
            method: 'PUT',
            body: JSON.stringify({ meetings: seedMeetings }),
          });
        }
      } catch (error) {
        setMeetings(cloneData(legacyMeetings || FALLBACK_MEETINGS));
      } finally {
        setMeetingsSyncReady(true);
      }
    };

    hydrateMeetings();
  }, []);

  useEffect(() => {
    if (!selectedLogId && meetings.length > 0) {
      const firstLog = meetings.find(m => m.type === 'LOG' && m.year === selectedYear);
      if (firstLog) setSelectedLogId(firstLog.id);
    }
  }, [meetings, selectedLogId, selectedYear]);

  useEffect(() => {
    localStorage.setItem('operationMeetingsData', JSON.stringify(meetings));
    if (!meetingsSyncReady) return;

    const timeoutId = setTimeout(() => {
      authApi('/api/meetings/bulk', {
        method: 'PUT',
        body: JSON.stringify({ meetings }),
      }).catch(() => {});
    }, 700);

    return () => clearTimeout(timeoutId);
  }, [meetings, meetingsSyncReady]);

  const categories = [
    { id: 'ALL', label: '전체 기록', icon: ClipboardList },
    { id: 'LOG', label: '운영일지', icon: FileEdit },
    { id: 'GOV', label: '운영위원회', icon: ShieldCheck },
    { id: 'STAFF', label: '종사자 회의록', icon: Users },
    { id: 'CHILD_AUTO', label: '아동 자치회의', icon: Users },
    { id: 'HEART', label: '마음의 편지', icon: Heart }
  ];

  // 공식 헤더와 직인이 포함된 HTML 생성 (최종확정용)
  const generateOfficialSignatureHeaderHtml = (log) => {
    if (!log) return '';
    const mName = log.approval?.manager?.name || log.writer || '담당자';
    const dName = log.approval?.director?.name || '김민수';
    return `
<p style="text-align: center;"><br></p>
<table cellspacing="0" cellpadding="0" border="1" align="right" style="width: 250px; height: 90px; border-collapse: collapse; border: 1px solid rgb(0,0,0); font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;">
  <tbody>
    <tr>
      <td rowspan="2" style="width: 30px; height: 90px; border: 1px solid rgb(204,204,204); background-color: rgb(238,238,238); text-align: center; vertical-align: middle; font-size: 13px;">
        결<br/>재
      </td>
      <td style="width: 110px; height: 25px; border: 1px solid rgb(204,204,204); text-align: center; vertical-align: middle; font-size: 13px;">
        담당자
      </td>
      <td style="width: 110px; height: 25px; border: 1px solid rgb(204,204,204); text-align: center; vertical-align: middle; font-size: 13px;">
        센터장
      </td>
    </tr>
    <tr>
      <td style="height: 65px; border: 1px solid rgb(204,204,204); text-align: center; vertical-align: middle;">
        <div style="width: 50px; height: 50px; margin: 0 auto; border: 1.5px solid #d9412e; border-radius: 50%; color: #d9412e; font-weight: 800; font-size: 14px; display: flex; align-items: center; justify-content: center; transform: rotate(8deg); letter-spacing: -0.5px;">
           ${mName.slice(-2)}<br/>인
        </div>
      </td>
      <td style="height: 65px; border: 1px solid rgb(204,204,204); text-align: center; vertical-align: middle;">
        <div style="width: 50px; height: 50px; margin: 0 auto; border: 2.5px double #d9412e; border-radius: 50%; color: #d9412e; font-weight: 800; font-size: 14px; display: flex; align-items: center; justify-content: center; transform: rotate(-5deg); letter-spacing: -0.5px;">
           ${dName.slice(-2)}<br/>인
        </div>
      </td>
    </tr>
  </tbody>
</table>
<p style="clear: both;"><br/></p>
<p style="text-align: center;"><span style="font-size: 28px; font-weight: 900; color: #000; letter-spacing: -1px;">운영일지 (아동)</span></p>
<p style="text-align: center;"><span style="font-size: 11px; font-weight: 900; color: #666; letter-spacing: 3px;">DAILY INSTITUTIONAL LEDGER ENGINE</span></p>
<p><br/></p>
    `;
  };

  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => {
      if (m.year !== selectedYear) return false;
      if (activeCategory !== 'ALL' && m.type !== activeCategory) return false;
      if (searchQuery && !m.title.includes(searchQuery)) return false;
      return true;
    });
  }, [meetings, selectedYear, activeCategory, searchQuery]);

  const selectedLog = useMemo(() => meetings.find(m => m.id === selectedLogId) || null, [meetings, selectedLogId]);

  const getPeriodLabel = (start, end) => {
    if (start === '10:00' && end === '19:00') return '학기중';
    if (start === '09:00' && end === '18:00') return '방학중';
    return '기타';
  };

  // HTML로 된 표 생성 엔진 (에디터 삽입용)
  const generateAggregationTableHtml = (log) => {
    if (!log || !log.stats) return '';
    const s = log.stats;
    const periodLabel = getPeriodLabel(log.startTime, log.endTime);
    
    return `
        <!-- 날짜 및 작성자 표 -->
        <table align="center" border="1" cellspacing="0" cellpadding="0" style="margin-bottom: 15px; border-collapse: collapse; font-size: 13px; width: 100%; text-align: center; font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;">
          <tbody>
            <tr>
              <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; width: 15%; text-align: center; font-weight: bold;">일자</td>
              <td style="border: 1px solid rgb(221,221,221); padding: 8px; width: 20%; text-align: center;">${log.date}</td>
              <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; width: 15%; text-align: center; font-weight: bold;">운영시간</td>
              <td style="border: 1px solid rgb(221,221,221); padding: 8px; width: 30%; text-align: center;">${log.startTime} ~ ${log.endTime} (${periodLabel})</td>
              <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; width: 10%; text-align: center; font-weight: bold;">담당자</td>
              <td style="border: 1px solid rgb(221,221,221); padding: 8px; width: 10%; text-align: center;">${log.writer}</td>
            </tr>
          </tbody>
        </table>

        <!-- 통계 집계 표 -->
        <table align="center" border="1" cellspacing="0" cellpadding="0" style="border-collapse: collapse; font-size: 13px; width: 100%; text-align: center; font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;">
          <tbody>
          <tr>
            <td rowspan="3" style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; width: 10%; text-align: center;">아동현황<br>(취학구분)</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">성별</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">취학전</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">탈학교</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">초등학교</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">중학교</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">고등학교</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">기타</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">계</td>
            <td rowspan="3" style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; width: 10%; text-align: center;">급식현황</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">조식</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; color: blue; font-weight: bold; text-align: center;">${s.meals.morning} 명</td>
          </tr>
          <tr>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">남</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">${s.children.male.pre}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">0</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">${s.children.male.elem}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">${s.children.male.mid}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">${s.children.male.high}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">${s.children.male.extra}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; font-weight: bold; text-align: center;">${s.children.male.total}</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">중식</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; color: blue; font-weight: bold; text-align: center;">${s.meals.lunch} 명</td>
          </tr>
          <tr>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">여</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">${s.children.female.pre}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">0</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">${s.children.female.elem}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">${s.children.female.mid}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">${s.children.female.high}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">${s.children.female.extra}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; font-weight: bold; text-align: center;">${s.children.female.total}</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">석식</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; color: blue; font-weight: bold; text-align: center;">${s.meals.dinner} 명</td>
          </tr>
          <tr>
            <td rowspan="2" style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">아동출석<br>(출석구분)</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">정원</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">현원</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">출석</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">공결</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">대체출석</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">결석</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">기타</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">계</td>
            <td rowspan="2" style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">교사현황</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">종사자</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">교사인원</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">강사인원</td>
            <td style="border: 1px solid rgb(221,221,221); background-color: rgb(245,245,245); padding: 8px; text-align: center;">기타인원</td>
          </tr>
          <tr>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">${s.attendance.limit}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">${s.attendance.current}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; color: blue; font-weight: bold; text-align: center;">${s.attendance.present}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">${s.attendance.official}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">${s.attendance.alt}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; color: red; font-weight: bold; text-align: center;">${s.attendance.absent}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">${s.attendance.extra}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; font-weight: bold; text-align: center;">${s.attendance.present + s.attendance.absent}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">${s.staff.total}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">${s.staff.teachers}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">${s.staff.instructors}</td>
            <td style="border: 1px solid rgb(221,221,221); padding: 8px; text-align: center;">${s.staff.extra}</td>
          </tr>
          </tbody>
        </table>
        <p><br/></p>
    `;
  };

  // 자동 집계 로직
  const runAutoAggregate = () => {
    if (!selectedLogId) return;
    const activeChildren = childrenList.filter(c => c.yearlyData?.[selectedYear]);
    const maleStats = { pre: 0, elem: 0, mid: 0, high: 0, extra: 0, total: 0 };
    const femaleStats = { pre: 0, elem: 0, mid: 0, high: 0, extra: 0, total: 0 };

    activeChildren.forEach(c => {
      const grade = c.yearlyData[selectedYear].grade;
      const target = c.gender === '남' ? maleStats : femaleStats;
      if (typeof grade === 'number') {
        if (grade >= 1 && grade <= 6) target.elem++;
        else target.pre++;
      } else if (typeof grade === 'string') {
        if (grade.includes('중')) target.mid++;
        else if (grade.includes('고')) target.high++;
        else target.extra++;
      }
      target.total++;
    });

    const currentStats = selectedLog?.stats || {
      children: { male: { pre: 0, elem: 0, mid: 0, high: 0, extra: 0, total: 0 }, female: { pre: 0, elem: 0, mid: 0, high: 0, extra: 0, total: 0 } },
      attendance: { limit: 40, current: 0, present: 0, official: 0, alt: 0, absent: 0, extra: 0 },
      meals: { morning: 0, lunch: 0, dinner: 0 },
      staff: { total: 0, teachers: 0, instructors: 0, extra: 0 }
    };

    const newStats = {
      ...currentStats,
      children: { male: maleStats, female: femaleStats },
      attendance: { ...currentStats.attendance, current: activeChildren.length, present: activeChildren.length },
      meals: { ...currentStats.meals, dinner: activeChildren.length },
      staff: { 
        total: staffList.length, 
        teachers: staffList.filter(s => s.role?.includes('교사') || s.role?.includes('복지사')).length, 
        instructors: 0, 
        extra: 1 
      }
    };

    updateLogData(selectedLogId, 'stats', newStats);
    alert('실시간 데이터 집계가 완료되었습니다. [확정] 시 에디터에 자동 반영됩니다.');
  };

  // 결제 프로세스
  const handleConfirm = () => {
    if (!selectedLogId || !selectedLog) return;
    
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '.');
    const baseApproval = selectedLog.approval || {
      manager: { name: selectedLog.writer || '담당자', confirmed: false, date: null },
      director: { name: '김민수', confirmed: false, date: null }
    };

    const updatedApproval = {
      ...baseApproval,
      manager: { ...baseApproval.manager, confirmed: true, date: today }
    };

    // 1단계 확정 시 에디터 라이브 DOM에 직접 접근하여 안전하게 교체
    const tableHtml = generateAggregationTableHtml(selectedLog);
    let finalContent = selectedLog.content || '';

    // 기존 데이터의 맨 앞에 추가
    finalContent = tableHtml + finalContent;

    setMeetings(prev => prev.map(m => m.id === selectedLogId ? { 
      ...m, 
      approval: updatedApproval, 
      status: '확정',
      content: finalContent 
    } : m));
    
    alert('담당자 확정이 완료되었습니다. 일자, 운영시간, 담당자 정보 및 집계표가 본문에 자동 교체/삽입되었습니다.');
  };

  const handleFinalConfirm = () => {
    if (!selectedLogId || !selectedLog) return;
    if (!selectedLog.approval.manager.confirmed) {
      alert('담당자 확정(집계표 삽입)이 먼저 이루어져야 합니다.');
      return;
    }
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '.');
    const updatedApproval = {
      ...selectedLog.approval,
      director: { ...selectedLog.approval.director, confirmed: true, date: today }
    };
    
    // 최종확정 시 에디터 라이브 DOM에 접근하여 교체
    const headerHtml = generateOfficialSignatureHeaderHtml({ ...selectedLog, approval: updatedApproval });
    let finalContent = selectedLog.content || '';

    finalContent = headerHtml + finalContent;

    setMeetings(prev => prev.map(m => m.id === selectedLogId ? { 
        ...m, 
        approval: updatedApproval, 
        status: '최종확정',
        content: finalContent
    } : m));
    
    alert('최종확정되었습니다. 공식 결재 직인과 헤더가 본문에 자동 교체/삽입되었습니다. 이제 인쇄가 가능합니다.');
  };

  const handleAddNew = async () => {
    const newId = Math.max(0, ...meetings.map(m => m.id)) + 1;
    const newLog = {
      id: newId, year: selectedYear,
      date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
      type: 'LOG', status: '작성중',
      title: `${new Date().getMonth() + 1}월 ${new Date().getDate()}일 운영일지`,
      writer: staffList[0]?.name || '담당자',
      startTime: '10:00', endTime: '19:00',
      approval: { manager: { name: '최하은', confirmed: false, date: null }, director: { name: '김민수', confirmed: false, date: null } },
      stats: {
        children: { male: { pre: 0, elem: 0, mid: 0, high: 0, extra: 0, total: 0 }, female: { pre: 0, elem: 0, mid: 0, high: 0, extra: 0, total: 0 } },
        attendance: { limit: 40, current: 0, present: 0, official: 0, alt: 0, absent: 0, extra: 0 },
        meals: { morning: 0, lunch: 0, dinner: 0 },
        staff: { total: 0, teachers: 0, instructors: 0, extra: 0 }
      },
      content: ''
    };
    try {
      await authApi('/api/meetings', {
        method: 'POST',
        body: JSON.stringify({ meeting: newLog }),
      });
      setMeetings(prev => [newLog, ...prev]);
      setSelectedLogId(newId);
    } catch (error) {
      alert('신규 기록 생성에 실패했습니다.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await authApi(`/api/meetings/${id}`, {
          method: 'DELETE',
        });
        const newMeetings = meetings.filter(m => m.id !== id);
        setMeetings(newMeetings);
        if (selectedLogId === id) {
          const nextLog = newMeetings.find(m => m.type === 'LOG' && m.year === selectedYear);
          setSelectedLogId(nextLog ? nextLog.id : null);
        }
      } catch (error) {
        alert('기록 삭제에 실패했습니다.');
      }
    }
  };

  const toggleCheck = (e, id) => {
    e.stopPropagation();
    setCheckedLogs(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (checkedLogs.length === filteredMeetings.length) {
      setCheckedLogs([]);
    } else {
      setCheckedLogs(filteredMeetings.map(m => m.id));
    }
  };

  const handleBatchDelete = () => {
    if (checkedLogs.length === 0) return;
    if (window.confirm(`선택한 ${checkedLogs.length}개의 기록을 모두 삭제하시겠습니까?`)) {
      const newMeetings = meetings.filter(m => !checkedLogs.includes(m.id));
      setMeetings(newMeetings);
      setCheckedLogs([]);
      if (checkedLogs.includes(selectedLogId)) {
        const nextLog = newMeetings.find(m => m.type === 'LOG' && m.year === selectedYear);
        setSelectedLogId(nextLog ? nextLog.id : null);
      }
    }
  };

  const handleBatchPrint = () => {
    if (checkedLogs.length === 0) return;
    alert(`선택한 ${checkedLogs.length}개의 기록을 인쇄 대기열에 추가했습니다.`);
  };

  const updateLogData = (id, field, value) => {
    setMeetings(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const Seal = ({ name, type }) => (
    <div className={`relative w-16 h-16 rounded-full border-4 ${type === 'director' ? 'border-red-600 text-red-600' : 'border-rose-500 text-rose-500'} flex items-center justify-center font-black text-[12px] rotate-12 bg-white/80 shadow-inner select-none`}>
      <div className="absolute inset-0 border border-current rounded-full m-1 opacity-40" />
      <span className="relative z-10">{name?.slice(-2)}<br/>인</span>
    </div>
  );

  const selectedStatusTone =
    selectedLog?.status === '최종확정'
      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
      : selectedLog?.status === '확정'
        ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
        : 'bg-slate-100 text-slate-500 border-slate-200';

  const mobileSummaryCards = [
    {
      label: '출석',
      value: `${selectedLog?.stats?.attendance?.present ?? 0}명`,
      hint: `현원 ${selectedLog?.stats?.attendance?.current ?? 0}명`,
      tone: 'from-indigo-600 to-cyan-500'
    },
    {
      label: '급식',
      value: `${selectedLog?.stats?.meals?.dinner ?? 0}명`,
      hint: '석식 기준',
      tone: 'from-amber-500 to-orange-500'
    },
    {
      label: '종사자',
      value: `${selectedLog?.stats?.staff?.total ?? 0}명`,
      hint: `교사 ${selectedLog?.stats?.staff?.teachers ?? 0}명`,
      tone: 'from-emerald-600 to-teal-500'
    }
  ];

  // 커스텀 표 컨텍스트 메뉴 액션
  const generateEmptyRow = (referenceTr) => {
    const newTr = document.createElement('tr');
    Array.from(referenceTr.children).forEach(c => {
       const td = document.createElement(c.tagName);
       td.innerHTML = '<br>';
       td.style.border = '1px solid #ced4da';
       td.style.padding = '5px';
       newTr.appendChild(td);
    });
    return newTr;
  };

  const handleTableContextMenuAction = (action, color = null) => {
    if (!tableContextMenu.cell) return;
    const { cell } = tableContextMenu;
    const tr = cell.closest('tr');
    const table = cell.closest('table');
    const tbody = cell.closest('tbody');
    if (!tr || !table || !tbody) return;
    
    const cellIndex = Array.from(tr.children).indexOf(cell);
    
    let changed = false;

    if (action === 'insertRowAbove') {
      tr.parentNode.insertBefore(generateEmptyRow(tr), tr);
      changed = true;
    } else if (action === 'insertRowBelow') {
      const newTr = generateEmptyRow(tr);
      if (tr.nextSibling) tr.parentNode.insertBefore(newTr, tr.nextSibling);
      else tr.parentNode.appendChild(newTr);
      changed = true;
    } else if (action === 'insertColLeft' || action === 'insertColRight') {
      Array.from(tbody.children).forEach(row => {
        const newTd = document.createElement(cell.tagName);
        newTd.innerHTML = '<br>';
        newTd.style.border = '1px solid #ced4da';
        newTd.style.padding = '5px';
        const targetTd = row.children[cellIndex];
        if (action === 'insertColLeft') {
          if (targetTd) row.insertBefore(newTd, targetTd);
          else row.appendChild(newTd);
        } else {
          if (targetTd && targetTd.nextSibling) row.insertBefore(newTd, targetTd.nextSibling);
          else row.appendChild(newTd);
        }
      });
      changed = true;
    } else if (action === 'deleteRow') {
      tr.remove();
      changed = true;
    } else if (action === 'deleteCol') {
      Array.from(tbody.children).forEach(row => {
         if (row.children[cellIndex]) row.children[cellIndex].remove();
      });
      changed = true;
    } else if (action === 'deleteTable') {
      table.remove();
      changed = true;
    } else if (action === 'bgColor' && color) {
      if (cell.tagName === 'TH') {
          cell.style.backgroundColor = color;
      } else {
          cell.style.backgroundColor = color;
      }
      changed = true;
    }

    if (changed && editorRef.current) {
      // 강제로 onChange 이벤트를 발생시켜 본문 업데이트
      const currentContent = editorRef.current.getContents();
      updateLogData(selectedLogId, 'content', currentContent);
    }
    setTableContextMenu({ visible: false, x: 0, y: 0, cell: null });
  };

  // 팝업 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleGlobalClick = () => setTableContextMenu(prev => prev.visible ? { ...prev, visible: false } : prev);
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  return (
    <div className="font-['Outfit'] space-y-6 max-w-[1600px] mx-auto p-2">
      {/* Table Context Menu Portal */}
      {tableContextMenu.visible && createPortal(
        <div 
          onClick={(e) => e.stopPropagation()}
          className="fixed bg-white border border-slate-200 shadow-xl rounded-xl p-2 z-50 flex flex-col gap-1 w-48 text-[13px] font-['Malgun_Gothic',sans-serif]"
          style={{ top: Math.min(tableContextMenu.y, window.innerHeight - 300), left: Math.min(tableContextMenu.x, window.innerWidth - 200) }}
        >
          <button onClick={() => handleTableContextMenuAction('insertRowAbove')} className="text-left px-3 py-2 hover:bg-slate-100 rounded-lg text-slate-700">위로 행 삽입</button>
          <button onClick={() => handleTableContextMenuAction('insertRowBelow')} className="text-left px-3 py-2 hover:bg-slate-100 rounded-lg text-slate-700">아래로 행 삽입</button>
          <button onClick={() => handleTableContextMenuAction('insertColLeft')} className="text-left px-3 py-2 hover:bg-slate-100 rounded-lg text-slate-700">왼쪽 열 삽입</button>
          <button onClick={() => handleTableContextMenuAction('insertColRight')} className="text-left px-3 py-2 hover:bg-slate-100 rounded-lg text-slate-700">오른쪽 열 삽입</button>
          <div className="h-px bg-slate-100 my-1" />
          <button onClick={() => handleTableContextMenuAction('deleteRow')} className="text-left px-3 py-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors">행 삭제</button>
          <button onClick={() => handleTableContextMenuAction('deleteCol')} className="text-left px-3 py-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors">열 삭제</button>
          <button onClick={() => handleTableContextMenuAction('deleteTable')} className="text-left px-3 py-2 hover:bg-rose-50 text-rose-600 rounded-lg font-bold transition-colors">표 완전 삭제</button>
          <div className="h-px bg-slate-100 my-1" />
          <div className="px-3 py-2">
            <span className="text-[11px] font-bold text-slate-400 mb-2 block">셀 배경색</span>
            <div className="flex gap-1.5 flex-wrap">
              {['transparent', '#f8fafc', '#fee2e2', '#fef3c7', '#dcfce3', '#e0e7ff', '#f3e8ff', '#ffecd2', '#b2fefa'].map(c => (
                 <button 
                   key={c} onClick={() => handleTableContextMenuAction('bgColor', c)}
                   className="w-5 h-5 rounded border border-slate-200 hover:scale-110 transition-transform shadow-sm"
                   style={{ background: c }}
                   title={c === 'transparent' ? '배경색 지우기' : c}
                 >
                   {c === 'transparent' && <span className="text-slate-300 text-[10px]">&times;</span>}
                 </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 프리미엄 헤더 영역 */}
      <div className="bg-white p-5 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-2xl shadow-indigo-900/5 space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
           <div className="flex items-center gap-4 md:gap-5">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center shadow-2xl rotate-3">
                 <ClipboardList className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                 <h2 className="text-2xl md:text-4xl font-black text-slate-900 m-0 italic tracking-tighter uppercase">Corporate Archive</h2>
                 <p className="text-[10px] font-black text-slate-400 m-0 uppercase tracking-[0.35em] md:tracking-[0.5em] mt-1">통합 운영 기록 시스템</p>
              </div>
           </div>
           
           <div className="flex w-full md:w-auto flex-col sm:flex-row gap-3 md:gap-4">
              <div className="relative w-full md:w-80">
                 <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                   type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="문서 검색..." 
                   className="w-full pl-12 md:pl-14 pr-5 md:pr-8 py-4 md:py-5 bg-slate-50 border border-slate-100 rounded-[1.25rem] md:rounded-[1.5rem] text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" 
                 />
              </div>
              <button onClick={handleAddNew} className="px-6 md:px-10 py-4 md:py-5 bg-indigo-600 text-white rounded-[1.25rem] md:rounded-[1.5rem] shadow-2xl shadow-indigo-600/20 hover:bg-black font-black text-[12px] transition-all uppercase tracking-widest active:scale-95">
                 <Plus className="w-5 h-5 inline mr-2" /> 신규 기록
              </button>
           </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between border-t border-slate-50 pt-6 md:pt-8 gap-4 md:gap-6">
           <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] gap-1 shadow-inner overflow-x-auto w-full md:w-auto">
              {categories.map(cat => (
                <button 
                  key={cat.id} onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center justify-center gap-3 px-5 md:px-8 py-3.5 rounded-2xl text-[11px] font-black transition-all whitespace-nowrap ${activeCategory === cat.id ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                >
                   <cat.icon className="w-4 h-4" /> {cat.label}
                </button>
              ))}
           </div>

           <div className="flex bg-indigo-50/50 p-1.5 rounded-[1.5rem] gap-2 border border-indigo-100/50 overflow-x-auto">
             {[2024, 2025, 2026].map(year => (
               <button 
                 key={year} onClick={() => setSelectedYear(year)} 
                 className={`px-6 md:px-8 py-3.5 rounded-2xl text-[11px] font-black transition-all whitespace-nowrap ${selectedYear === year ? 'bg-indigo-600 text-white shadow-xl' : 'text-indigo-300 hover:text-indigo-400'}`}
               >
                 {year}년도
               </button>
             ))}
           </div>
        </div>
      </div>

      {activeCategory === 'LOG' ? (
        <>
        <div className="space-y-4 pt-1 md:hidden">
           <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-xl shadow-indigo-900/5">
              <div className="flex items-start justify-between gap-4">
                 <div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black ${selectedStatusTone}`}>{selectedLog?.status || '선택 없음'}</span>
                    <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900">{selectedLog?.title || '운영일지를 선택해 주세요'}</h3>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      {selectedLog ? `${selectedLog.date} · ${selectedLog.startTime} ~ ${selectedLog.endTime}` : '아래 카드에서 문서를 선택하면 상세 내용을 바로 볼 수 있습니다.'}
                    </p>
                 </div>
                 <button onClick={handleAddNew} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                    <Plus className="h-5 w-5" />
                 </button>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {mobileSummaryCards.map((card) => (
                  <div key={card.label} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3">
                    <div className={`mb-3 h-2 w-12 rounded-full bg-gradient-to-r ${card.tone}`} />
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
                    <p className="mt-2 text-lg font-black tracking-tight text-slate-900">{card.value}</p>
                    <p className="mt-1 text-[11px] font-medium text-slate-500">{card.hint}</p>
                  </div>
                ))}
              </div>

              {selectedLog && (
                <div className="mt-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">담당자</p>
                      <p className="mt-2 font-black text-slate-900">{selectedLog.writer}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">운영 구분</p>
                      <p className="mt-2 font-black text-slate-900">{getPeriodLabel(selectedLog.startTime, selectedLog.endTime)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={runAutoAggregate} className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20">
                      <RotateCcw className="mr-2 inline h-4 w-4" />
                      데이터 집계
                    </button>
                    <button onClick={handleConfirm} disabled={selectedLog?.approval?.manager?.confirmed} className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-400">
                      <CheckCircle2 className="mr-2 inline h-4 w-4" />
                      담당 확정
                    </button>
                  </div>
                </div>
              )}
           </div>

           <div className="space-y-3">
             {filteredMeetings.map((m) => (
               <button
                 key={m.id}
                 onClick={() => setSelectedLogId(m.id)}
                 className={`w-full rounded-[1.75rem] border p-4 text-left transition-all ${selectedLogId === m.id ? 'border-indigo-200 bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'border-slate-200 bg-white text-slate-700 shadow-sm shadow-slate-200/70'}`}
               >
                 <div className="flex items-start justify-between gap-3">
                   <div>
                     <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${m.status === '최종확정' ? 'bg-emerald-500 text-white' : m.status === '확정' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                       {m.status}
                     </span>
                     <h4 className="mt-3 text-base font-black leading-tight">{m.title}</h4>
                   </div>
                   <button
                     onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                     className={`rounded-xl p-2 ${selectedLogId === m.id ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-400'}`}
                   >
                     <Trash2 className="h-4 w-4" />
                   </button>
                 </div>
                 <div className={`mt-3 flex items-center justify-between text-xs font-bold ${selectedLogId === m.id ? 'text-white/70' : 'text-slate-400'}`}>
                   <span>{m.date}</span>
                   <span>{m.writer}</span>
                 </div>
               </button>
             ))}
           </div>

           {selectedLog && (
             <div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-xl shadow-indigo-900/5">
               <div className="flex items-center justify-between gap-3">
                 <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">문서 본문</p>
                   <h4 className="mt-2 text-lg font-black text-slate-900">모바일 편집 보기</h4>
                 </div>
                 <button onClick={handleFinalConfirm} disabled={selectedLog?.status === '최종확정'} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:bg-slate-200">
                   최종확정
                 </button>
               </div>
               <div className="mt-4 max-h-[420px] overflow-y-auto rounded-[1.5rem] bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                 {selectedLog.content ? (
                   <div dangerouslySetInnerHTML={{ __html: selectedLog.content }} />
                 ) : (
                   <p className="font-medium text-slate-400">아직 작성된 본문이 없습니다.</p>
                 )}
               </div>
             </div>
           )}
        </div>

        <div className="hidden md:grid grid-cols-12 gap-8 pt-4">
           {/* 운영일지 목록 */}
           <div className="col-span-12 lg:col-span-3">
              <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl h-[950px] overflow-hidden flex flex-col relative">
                 <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <FileText className="w-4 h-4 text-indigo-600" />
                       <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest m-0">운영일지 목록</h4>
                    </div>
                    <button 
                      onClick={handleAddNew}
                      className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-black transition-all shadow-lg active:scale-95"
                      title="신규 일지 추가"
                    >
                       <Plus className="w-4 h-4" />
                    </button>
                 </div>
                 
                 {/* 전체 선택 및 일괄 툴바 */}
                 <div className="px-6 py-4 bg-white border-b border-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={toggleAll}>
                       <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${checkedLogs.length > 0 && checkedLogs.length === filteredMeetings.length ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                          {checkedLogs.length === filteredMeetings.length && <CheckSquare className="w-3 h-3" />}
                       </div>
                       <span className="text-[11px] font-bold text-slate-500">전체선택</span>
                    </div>
                    
                    <AnimatePresence>
                      {checkedLogs.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                          className="flex items-center gap-2"
                        >
                           <button onClick={handleBatchPrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition-all"><Printer className="w-3 h-3" /> 인쇄</button>
                           <button onClick={handleBatchDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg text-[10px] font-bold transition-all"><Trash2 className="w-3 h-3" /> 삭제</button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                 </div>

                 <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {filteredMeetings.map(m => (
                      <div 
                        key={m.id} 
                        className={`group relative p-5 rounded-3xl cursor-pointer transition-all border flex flex-col gap-3 flex-1 ${selectedLogId === m.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl scale-[1.02]' : 'bg-white text-slate-500 border-slate-50 hover:bg-slate-50'}`}
                      >
                         <div className="flex justify-between items-start" onClick={() => setSelectedLogId(m.id)}>
                            <div className="flex items-start gap-3 flex-1">
                               <div 
                                 onClick={(e) => toggleCheck(e, m.id)}
                                 className={`mt-1 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all ${checkedLogs.includes(m.id) ? (selectedLogId === m.id ? 'bg-white text-indigo-600 border-white' : 'bg-indigo-600 border-indigo-600 text-white') : (selectedLogId === m.id ? 'border-white/50' : 'border-slate-300')}`}
                               >
                                  {checkedLogs.includes(m.id) && <CheckSquare className="w-3 h-3" />}
                               </div>
                               <span className="text-[14px] font-black leading-tight pr-2">{m.title}</span>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                              className={`w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center transition-all ${selectedLogId === m.id ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-500'}`}
                            >
                               <Trash2 className="w-3.5 h-3.5" />
                            </button>
                         </div>
                         <div className="flex justify-between items-center" onClick={() => setSelectedLogId(m.id)}>
                            <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase ${m.status === '최종확정' ? 'bg-emerald-500 text-white shadow-lg' : m.status === '확정' ? 'bg-indigo-400 text-white' : 'bg-slate-100 text-slate-400'}`}>{m.status}</span>
                            <span className="text-[11px] font-bold opacity-40">{m.date}</span>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* 작업 영역 */}
           <div className="col-span-12 lg:col-span-9 space-y-6">
              <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl flex flex-col min-h-[950px] overflow-hidden">
                 {/* 결재 영역 */}
                 <div className="p-10 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter m-0">운영일지 (아동)</h1>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Daily Institutional Ledger Engine</p>
                    </div>

                    <div className="flex items-center gap-6">
                       <div className="bg-white border border-slate-200 rounded-[2.5rem] flex p-1 shadow-inner pr-10">
                          <div className="flex flex-col items-center border-r border-slate-50 px-8 py-4">
                             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">결재</span>
                             <div className="w-[1px] h-10 bg-slate-100" />
                          </div>
                          <div className="flex gap-4">
                             <div className="flex flex-col items-center px-4 py-2 min-w-[100px]">
                                <span className="text-[10px] font-black text-slate-400 mb-2">담당자</span>
                                <div className="h-16 flex items-center justify-center">
                                   {selectedLog?.approval?.manager?.confirmed ? <Seal name={selectedLog.approval.manager.name} type="manager" /> : <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-100 flex items-center justify-center text-[10px] text-slate-200">미결</div>}
                                </div>
                             </div>
                             <div className="flex flex-col items-center px-4 py-2 min-w-[100px]">
                                <span className="text-[10px] font-black text-slate-400 mb-2">센터장</span>
                                <div className="h-16 flex items-center justify-center">
                                   {selectedLog?.approval?.director?.confirmed ? <Seal name={selectedLog.approval.director.name} type="director" /> : <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-100 flex items-center justify-center text-[10px] text-slate-200">미결</div>}
                                </div>
                             </div>
                          </div>
                       </div>
                       <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                             <button onClick={handleAddNew} className="flex-1 px-6 py-2 bg-white text-indigo-600 rounded-xl text-[10px] font-black hover:bg-indigo-50 transition-all border border-slate-200 shadow-sm"><FilePlus className="w-3.5 h-3.5 inline mr-1" /> 신규 작성</button>
                             <button onClick={() => selectedLogId && handleDelete(selectedLogId)} className="flex-1 px-6 py-2 bg-white text-rose-500 rounded-xl text-[10px] font-black hover:bg-rose-50 transition-all border border-slate-200 shadow-sm"><Trash2 className="w-3.5 h-3.5 inline mr-1" /> 이 일지 삭제</button>
                          </div>
                          <button onClick={handleConfirm} disabled={selectedLog?.approval?.manager?.confirmed} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl text-[11px] font-black hover:bg-black transition-all active:scale-95 disabled:bg-slate-200 disabled:text-slate-400">확정 (담당)</button>
                          <button onClick={handleFinalConfirm} disabled={selectedLog?.status === '최종확정'} className="px-10 py-3 bg-slate-900 text-white rounded-2xl text-[11px] font-black hover:bg-emerald-600 transition-all active:scale-95 disabled:bg-slate-200">최종확정</button>
                       </div>
                    </div>
                 </div>

                 {/* 집계 표 시각화 영역 */}
                 <div className="p-10 space-y-8">
                    <div className="flex justify-between items-end">
                        <div className="flex gap-4">
                            <div className="bg-slate-50 px-6 py-4 rounded-3xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">일자</span>
                                <span className="text-sm font-black text-slate-900">{selectedLog?.date}</span>
                            </div>
                            <div className="bg-slate-50 px-6 py-4 rounded-3xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">운영시간</span>
                                <span className="text-sm font-black text-slate-900">{selectedLog?.startTime} ~ {selectedLog?.endTime} ({getPeriodLabel(selectedLog?.startTime, selectedLog?.endTime)})</span>
                            </div>
                            <div className="bg-slate-50 px-6 py-4 rounded-3xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">담당자</span>
                                <span className="text-sm font-black text-slate-900">{selectedLog?.writer}</span>
                            </div>
                        </div>
                        <button onClick={runAutoAggregate} className="flex items-center gap-3 px-8 py-5 bg-emerald-500 text-white rounded-[2rem] text-[11px] font-black shadow-2xl shadow-emerald-500/30 hover:bg-black transition-all">
                            <RotateCcw className="w-4 h-4" /> 데이터 실시간 집계
                        </button>
                    </div>

                    <div className="overflow-hidden border border-slate-100 rounded-[3rem] shadow-2xl shadow-indigo-900/5">
                       <table className="w-full text-[11px] border-collapse bg-white table-fixed">
                          <tbody>
                             <tr className="border-b border-slate-100">
                                <td rowSpan={3} className="w-32 bg-slate-50 p-6 font-black text-center border-r border-slate-100 leading-tight">아동현황<br/>(취학구분)</td>
                                <td className="bg-slate-50/50 p-3 text-center border-r border-slate-100 font-bold">성별</td>
                                <td className="bg-slate-50/50 p-3 text-center border-r border-slate-100 font-bold">미취학</td>
                                <td className="bg-slate-50/50 p-3 text-center border-r border-slate-100 font-bold">탈학교</td>
                                <td className="bg-slate-50/50 p-3 text-center border-r border-slate-100 font-bold text-indigo-600">초등학교</td>
                                <td className="bg-slate-50/50 p-3 text-center border-r border-slate-100 font-bold">중학교</td>
                                <td className="bg-slate-50/50 p-3 text-center border-r border-slate-100 font-bold">고등학교</td>
                                <td className="bg-slate-50/50 p-3 text-center border-r border-slate-100 font-bold">기타</td>
                                <td className="bg-slate-50/50 p-3 text-center border-r border-slate-100 font-bold bg-indigo-50/30">계</td>
                                <td rowSpan={3} className="w-32 bg-slate-50 p-6 font-black text-center border-r border-slate-100 uppercase tracking-widest">급식현황</td>
                                <td className="bg-slate-100 p-3 text-center border-r border-slate-100 font-black">조식</td>
                                <td className="p-3 text-center font-black text-indigo-600 tracking-widest">{selectedLog?.stats?.meals?.morning} EA</td>
                             </tr>
                             <tr className="border-b border-slate-100">
                                <td className="p-3 text-center border-r border-slate-100 font-bold text-blue-500 italic">M</td>
                                <td className="p-3 text-center border-r border-slate-100">{selectedLog?.stats?.children?.male?.pre}</td>
                                <td className="p-3 text-center border-r border-slate-100">0</td>
                                <td className="p-3 text-center border-r border-slate-100 font-bold">{selectedLog?.stats?.children?.male?.elem}</td>
                                <td className="p-3 text-center border-r border-slate-100">{selectedLog?.stats?.children?.male?.mid}</td>
                                <td className="p-3 text-center border-r border-slate-100">0</td>
                                <td className="p-3 text-center border-r border-slate-100">{selectedLog?.stats?.children?.male?.extra}</td>
                                <td className="p-3 text-center border-r border-slate-100 font-black bg-indigo-50/30">{selectedLog?.stats?.children?.male?.total}</td>
                                <td className="bg-slate-100 p-3 text-center border-r border-slate-100 font-black">중식</td>
                                <td className="p-3 text-center font-black text-indigo-600 tracking-widest">{selectedLog?.stats?.meals?.lunch} EA</td>
                             </tr>
                             <tr className="border-b border-slate-100">
                                <td className="p-3 text-center border-r border-slate-100 font-bold text-rose-400 italic">F</td>
                                <td className="p-3 text-center border-r border-slate-100">{selectedLog?.stats?.children?.female?.pre}</td>
                                <td className="p-3 text-center border-r border-slate-100">0</td>
                                <td className="p-3 text-center border-r border-slate-100 font-bold">{selectedLog?.stats?.children?.female?.elem}</td>
                                <td className="p-3 text-center border-r border-slate-100">{selectedLog?.stats?.children?.female?.mid}</td>
                                <td className="p-3 text-center border-r border-slate-100">0</td>
                                <td className="p-3 text-center border-r border-slate-100">{selectedLog?.stats?.children?.female?.extra}</td>
                                <td className="p-3 text-center border-r border-slate-100 font-black bg-indigo-50/30">{selectedLog?.stats?.children?.female?.total}</td>
                                <td className="bg-slate-100 p-3 text-center border-r border-slate-100 font-black">석식</td>
                                <td className="p-3 text-center font-black text-indigo-600 tracking-widest">{selectedLog?.stats?.meals?.dinner} EA</td>
                             </tr>
                             <tr>
                                <td rowSpan={2} className="bg-slate-50 p-6 font-black text-center border-r border-slate-100 leading-tight">출석현황<br/>(출석구분)</td>
                                <td className="bg-slate-50/50 p-3 text-center border-r border-slate-100 font-bold">정원</td>
                                <td className="bg-slate-50/50 p-3 text-center border-r border-slate-100 font-bold">현원</td>
                                <td className="bg-slate-50/50 p-3 text-center border-r border-slate-100 font-bold text-indigo-600">출석</td>
                                <td className="bg-slate-50/50 p-3 text-center border-r border-slate-100 font-bold">공결</td>
                                <td className="bg-slate-50/50 p-3 text-center border-r border-slate-100 font-bold">대체</td>
                                <td className="bg-slate-50/50 p-3 text-center border-r border-slate-100 font-bold text-rose-500">결석</td>
                                <td className="bg-slate-50/50 p-3 text-center border-r border-slate-100 font-bold">기타</td>
                                <td className="bg-slate-50/50 p-3 text-center border-r border-slate-100 font-bold bg-indigo-50/30">계</td>
                                <td rowSpan={2} className="bg-slate-50 p-6 font-black text-center border-r border-slate-100 uppercase tracking-widest">교사현황</td>
                                <td className="bg-slate-100 p-3 text-center border-r border-slate-100 font-black">종사자</td>
                                <td className="bg-slate-100 p-3 text-center border-r border-slate-100 font-black">교사</td>
                                <td className="bg-slate-100 p-3 text-center border-r border-slate-100 font-black">강사</td>
                                <td className="bg-slate-100 p-3 text-center font-black">기타</td>
                             </tr>
                             <tr>
                                <td className="p-3 text-center border-r border-slate-100 font-black">{selectedLog?.stats?.attendance?.limit}</td>
                                <td className="p-3 text-center border-r border-slate-100">{selectedLog?.stats?.attendance?.current}</td>
                                <td className="p-3 text-center border-r border-slate-100 font-black text-indigo-600 underline decoration-indigo-200 underline-offset-8">{selectedLog?.stats?.attendance?.present}</td>
                                <td className="p-3 text-center border-r border-slate-100">0</td>
                                <td className="p-3 text-center border-r border-slate-100">0</td>
                                <td className="p-3 text-center border-r border-slate-100 font-black text-rose-500">{selectedLog?.stats?.attendance?.absent}</td>
                                <td className="p-3 text-center border-r border-slate-100">0</td>
                                <td className="p-3 text-center border-r border-slate-100 font-black bg-indigo-50/30">{selectedLog?.stats?.attendance?.present}</td>
                                <td className="p-3 text-center border-r border-slate-100 font-black">{selectedLog?.stats?.staff?.total}</td>
                                <td className="p-3 text-center border-r border-slate-100 font-black">{selectedLog?.stats?.staff?.teachers}</td>
                                <td className="p-3 text-center border-r border-slate-100 font-black">{selectedLog?.stats?.staff?.instructors}</td>
                                <td className="p-3 text-center font-black">{selectedLog?.stats?.staff?.extra}</td>
                             </tr>
                          </tbody>
                       </table>
                    </div>
                 </div>

                 <div className="flex-1 p-8 bg-slate-50 relative overflow-hidden border-t border-slate-100">
                    <LexicalApp 
                       key={`${selectedLogId}-${selectedLog?.status}`} 
                       initialHtml={selectedLog?.content || ''}
                       onChangeHtml={(htmlContent) => {
                           setMeetings(prev => prev.map(m => 
                               m.id === selectedLogId ? {...m, content: htmlContent} : m
                           ));
                       }}
                    />
                 </div>
              </div>
           </div>
        </div>
        </>
      ) : (
        <div className="p-20 text-center opacity-20">
           <ClipboardList className="w-24 h-24 mx-auto mb-4" />
           <p className="font-black tracking-widest uppercase">준비 중인 카테고리입니다</p>
        </div>
      )}
    </div>
  );
};

export default MeetingPage;

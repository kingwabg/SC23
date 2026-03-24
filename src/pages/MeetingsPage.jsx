import React, { useState, useEffect, useRef, useMemo } from 'react';
import RoosterApp from '../components/RoosterEditor/RoosterApp';
import { 
  FileText, 
  Search, 
  Plus, 
  Save, 
  Printer, 
  ChevronRight, 
  MessageSquare, 
  Calendar,
  Clock,
  User,
  MoreVertical,
  ArrowRight,
  Database,
  ShieldCheck,
  CheckSquare,
  Trash2
} from 'lucide-react';
import { authApi } from '../utils/apiClient';

const MeetingsPage = () => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);

  useEffect(() => {
    const fetchMeetings = async () => {
      const loadFallback = (attemptSync) => {
        const saved = localStorage.getItem('forestMeetings');
        if (saved && saved !== '[]') {
          const parsed = JSON.parse(saved);
          const migrated = parsed.map(m => ({ ...m, type: 'STAFF_MEETING' }));
          setMeetings(migrated);
          if (attemptSync) {
            for (const m of migrated) {
              authApi('/api/meetings', { method: 'POST', body: JSON.stringify({ meeting: m }) }).catch(() => null);
            }
          }
        } else {
          const defaultMeeting = { id: Date.now(), title: '3월 16일 월요일 기안', type: 'STAFF_MEETING', date: '2026.03.16', author: '홍길동', dept: '운영팀', status: '작성 중', content: '' };
          setMeetings([defaultMeeting]);
          if (attemptSync) {
            authApi('/api/meetings', { method: 'POST', body: JSON.stringify({ meeting: defaultMeeting }) }).catch(() => null);
          }
        }
      };

      try {
        const data = await authApi('/api/meetings');
        const dbMeetings = Array.isArray(data.meetings) ? data.meetings : [];
        const staffMeetings = dbMeetings.filter(m => m.type === 'STAFF_MEETING');
        
        if (staffMeetings.length > 0) {
          setMeetings(staffMeetings);
        } else {
          loadFallback(true);
        }
      } catch (err) {
        if (err.message === 'unauthenticated') {
           console.info('ℹ️ [오프라인 모드] 로그인이 되어있지 않아 로컬 저장소 모드로 전환되었습니다.');
        } else {
           console.warn('⚠️ DB 통신 실패 - 로컬 데이터로 대체합니다.', err);
        }
        loadFallback(false);
      }
    };
    fetchMeetings();
  }, []);

  useEffect(() => {
    if (meetings.length === 0) return;
    let currentMeetings = [...meetings];
    let savedSync = false;
    let attempts = 0;

    while (!savedSync && currentMeetings.length > 0 && attempts < 50) {
      try {
        localStorage.setItem('forestMeetings', JSON.stringify(currentMeetings));
        savedSync = true;
      } catch (error) {
        currentMeetings.pop();
        attempts++;
      }
    }

    if (savedSync && currentMeetings.length < meetings.length) {
      alert(`⚠️ 용량 부족: 브라우저 저장 공간 확보를 위해 가장 오래된 임시 기록 ${meetings.length - currentMeetings.length}개가 지워졌습니다.`);
      setMeetings(currentMeetings);
    }
  }, [meetings]);

  useEffect(() => {
    if (meetings.length > 0 && !selectedMeetingId) {
      setSelectedMeetingId(meetings[0].id);
    }
  }, [meetings, selectedMeetingId]);

  const [checkedMeetings, setCheckedMeetings] = useState([]);
  const selectedMeeting = useMemo(() => meetings.find(m => m.id === selectedMeetingId), [meetings, selectedMeetingId]);

  const toggleCheck = (e, id) => {
    e.stopPropagation();
    setCheckedMeetings(prev => prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (checkedMeetings.length === meetings.length) {
      setCheckedMeetings([]);
    } else {
      setCheckedMeetings(meetings.map(m => m.id));
    }
  };

  const requestDelete = (e, id) => {
    e.stopPropagation();
    setDeleteTargetId(id);
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await authApi(`/api/meetings/${deleteTargetId}`, { method: 'DELETE' });
    } catch (err) {}
    const newM = meetings.filter(m => m.id !== deleteTargetId);
    setMeetings(newM);
    if (selectedMeetingId === deleteTargetId) setSelectedMeetingId(newM[0]?.id || null);
    setCheckedMeetings(prev => prev.filter(mid => mid !== deleteTargetId));
    setDeleteTargetId(null);
  };

  const executeBatchDelete = async () => {
    if (checkedMeetings.length === 0) return;
    for (const id of checkedMeetings) {
      try { await authApi(`/api/meetings/${id}`, { method: 'DELETE' }); } catch(err) {}
    }
    const newM = meetings.filter(m => !checkedMeetings.includes(m.id));
    setMeetings(newM);
    if (checkedMeetings.includes(selectedMeetingId)) setSelectedMeetingId(newM[0]?.id || null);
    setCheckedMeetings([]);
    setShowBatchDeleteModal(false);
  };


  // Initial Content Template (HWP Style)
  const initialTemplate = `
    <div style="text-align: center; margin-bottom: 30px; padding: 20px;">
        <h2 style="font-size: 26px; font-weight: 800; border-bottom: 2px solid #333; display: inline-block; padding-bottom: 8px; margin-bottom: 5px;">OO부 운영 회의록</h2>
        <p style="font-size: 11px; color: #888; letter-spacing: 2px;">OFFICIAL RECORD</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <tbody>
            <tr>
                <td style="border: 1px solid #111; background-color: #f8f9fa; width: 15%; padding: 12px; font-weight: bold; text-align: center;">회의명</td>
                <td style="border: 1px solid #111; width: 35%; padding: 12px;">정기 주간 회의</td>
                <td style="border: 1px solid #111; background-color: #f8f9fa; width: 15%; padding: 12px; font-weight: bold; text-align: center;">일시</td>
                <td style="border: 1px solid #111; width: 35%; padding: 12px;">2026. 03. 16. 14:00</td>
            </tr>
            <tr>
                <td style="border: 1px solid #111; background-color: #f8f9fa; padding: 12px; font-weight: bold; text-align: center;">장소</td>
                <td style="border: 1px solid #111; padding: 12px;">대회의실</td>
                <td style="border: 1px solid #111; background-color: #f8f9fa; padding: 12px; font-weight: bold; text-align: center;">기록자</td>
                <td style="border: 1px solid #111; padding: 12px;">홍길동 (주임)</td>
            </tr>
        </tbody>
    </table>

    <div style="margin-bottom: 40px;">
        <p style="font-weight: 800; font-size: 16px; margin-bottom: 15px; border-left: 5px solid #4f46e5; padding-left: 10px;">1. 회의 안건</p>
        <p>&nbsp;&nbsp;가. 아동 시설 안전 점검 결과 보고 및 보수 계획</p>
        <p>&nbsp;&nbsp;나. 신규 입소 아동 적응 지원 프로세서 고도화</p>
        <p>&nbsp;</p>
        <p style="font-weight: 800; font-size: 16px; margin-bottom: 15px; border-left: 5px solid #4f46e5; padding-left: 10px;">2. 회의 내용</p>
        <p>&nbsp;&nbsp;- 세부 논의 사항 기술...</p>
        <p>&nbsp;</p>
        <p style="font-weight: 800; font-size: 16px; margin-bottom: 15px; border-left: 5px solid #4f46e5; padding-left: 10px;">3. 결정 사항 및 향후 조치</p>
        <p>&nbsp;&nbsp;- 조치 내용 기술...</p>
        <p>&nbsp;</p>
        <p style="text-align: right; margin-top: 100px; font-weight: 700;">이상 끝.</p>
    </div>
  `;

  const contentRef = useRef('');
  useEffect(() => {
    contentRef.current = selectedMeeting?.content || initialTemplate;
  }, [selectedMeetingId, selectedMeeting, initialTemplate]);

  const handleSave = () => {
    setShowConfirmModal(true);
  };

  const executeSave = async () => {
    const content = contentRef.current;
    const targetMeeting = meetings.find(m => m.id === selectedMeetingId);
    if (!targetMeeting) return;

    const updatedMeeting = { ...targetMeeting, content };
    setMeetings(prev => prev.map(m => m.id === selectedMeetingId ? updatedMeeting : m));
    setShowConfirmModal(false);

    try {
      await authApi(`/api/meetings/${selectedMeetingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ updates: updatedMeeting })
      });
    } catch (e) {
      await authApi('/api/meetings', {
        method: 'POST',
        body: JSON.stringify({ meeting: updatedMeeting })
      }).catch(() => null);
    }

    setShowSaveModal(true);
    setTimeout(() => setShowSaveModal(false), 800);
  };

  const handleNewMeeting = async () => {
    const id = Date.now();
    const newDoc = {
      id,
      title: `${new Date().toLocaleDateString()} 신규 회의록`,
      date: new Date().toISOString().split('T')[0],
      author: '시스템 관리자',
      dept: '운영팀',
      status: '작성 중',
      type: 'STAFF_MEETING',
      content: initialTemplate
    };
    try {
      await authApi('/api/meetings', { method: 'POST', body: JSON.stringify({ meeting: newDoc }) });
    } catch(err) {}
    
    setMeetings([newDoc, ...meetings]);
    setSelectedMeetingId(id);
  };

  const handleUpdateField = (field, value) => {
    setMeetings(prev => prev.map(m => m.id === selectedMeetingId ? { ...m, [field]: value } : m));
  };

  useEffect(() => {
    const main = document.querySelector('main');
    if (main) {
      main.style.padding = '0';
      main.style.overflow = 'hidden';
    }
    return () => {
      if (main) {
        main.style.padding = '';
        main.style.overflow = '';
      }
    };
  }, []);

  return (
    <div className="flex h-[100vh] bg-slate-50 overflow-hidden font-['Outfit']">
      <div className="w-[340px] bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
           <div className="flex flex-col">
              <h2 className="text-[16px] font-black text-slate-900 tracking-tight">운영 회의록</h2>
              <span className="text-[11px] font-bold text-slate-400">Total {meetings.length} Documents</span>
           </div>
           <button onClick={handleNewMeeting} className="w-8 h-8 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all flex items-center justify-center">
              <Plus className="w-4 h-4" />
           </button>
        </div>

        <div className="p-3 bg-slate-50 border-b border-slate-100 flex flex-col gap-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="회의명, 주체 검색..." className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-[12px] font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:font-medium" />
          </div>
          <div className="flex justify-between items-center px-1">
             <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer" checked={checkedMeetings.length > 0 && checkedMeetings.length === meetings.length} onChange={toggleAll} />
                <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-800 transition-colors">전체선택</span>
             </label>
             {checkedMeetings.length > 0 && (
               <button onClick={() => setShowBatchDeleteModal(true)} className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-1 rounded">
                 <Trash2 className="w-3 h-3" /> 일괄삭제
               </button>
             )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
          {meetings.map(m => (
            <div
              key={m.id}
              onClick={() => setSelectedMeetingId(m.id)}
              className={`group flex items-start gap-3 p-4 border-b border-slate-100 cursor-pointer transition-all ${selectedMeetingId === m.id ? 'bg-indigo-50/50 relative' : 'hover:bg-slate-50'}`}
            >
              {selectedMeetingId === m.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r-full" />}
              
              <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                 <input type="checkbox" className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer" checked={checkedMeetings.includes(m.id)} onChange={(e) => toggleCheck(e, m.id)} />
              </div>
              
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <div className="flex justify-between items-start gap-2">
                   <h4 className={`text-[13px] font-black truncate leading-tight ${selectedMeetingId === m.id ? 'text-indigo-900' : 'text-slate-800'}`}>{m.title}</h4>
                   <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${m.status === '완료' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {m.status}
                   </span>
                </div>
                
                <div className="flex justify-between items-end mt-1">
                   <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-bold text-slate-400 tracking-wide">{m.date}</span>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                         <span className={selectedMeetingId === m.id ? 'text-indigo-600 font-bold' : ''}>{m.author}</span>
                         <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                         <span>{m.termType || '학기중'}</span>
                      </div>
                   </div>
                   <button onClick={(e) => requestDelete(e, m.id)} className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${selectedMeetingId === m.id ? 'text-indigo-400 hover:text-rose-500 hover:bg-rose-50' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                   </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center Column: Editor */}
      <div className="flex-1 flex flex-col bg-slate-100/50 relative overflow-hidden">
        <div className="h-16 bg-white border-b border-slate-200 px-8 flex justify-between items-center shrink-0 z-10 shadow-sm">
           <div className="flex items-center gap-4 flex-1 mr-4">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-black"><FileText className="w-4 h-4" /></div>
              <input 
                type="text" 
                value={selectedMeeting?.title || ''} 
                onChange={(e) => handleUpdateField('title', e.target.value)}
                className="flex-1 text-[15px] font-black text-slate-900 bg-transparent border-none outline-none focus:ring-0 p-0"
                placeholder="문서 제목을 입력하세요"
              />
           </div>
           <div className="flex gap-2 shrink-0">
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"><Printer className="w-4 h-4" /> 인쇄</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"><Save className="w-4 h-4" /> 기록 저장</button>
           </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:24px_24px]">
          {/* RoosterJS Editor — TableEditPlugin 내장으로 표 성능 최적화 */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar" style={{scrollbarGutter: 'stable'}}>
              <RoosterApp
                key={selectedMeetingId}
                initialHtml={selectedMeeting?.content || initialTemplate}
                onChangeHtml={(htmlContent) => {
                  contentRef.current = htmlContent;
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Metadata */}
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0">
        <div className="p-8 space-y-10 overflow-y-auto custom-scrollbar">
           <section className="space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <Database className="w-4 h-4 text-slate-400" />
                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Document Meta</h5>
              </div>
              
              <div className="space-y-5">
                <div className="space-y-1.5 focus-within:text-indigo-600 transition-colors">
                  <label className="text-[10px] font-black text-inherit uppercase tracking-widest px-1">기안 연월일</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                    <input 
                      type="date" 
                      value={selectedMeeting?.date || ''} 
                      onChange={(e) => handleUpdateField('date', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 rounded-xl pl-10 pr-3 py-2.5 text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 focus-within:text-indigo-600 transition-colors">
                  <label className="text-[10px] font-black text-inherit uppercase tracking-widest px-1">운영 상태 및 시간</label>
                  <div className="flex gap-2">
                     <select 
                       value={selectedMeeting?.termType || '학기중'} 
                       onChange={(e) => handleUpdateField('termType', e.target.value)}
                       className="w-24 bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 rounded-xl px-2 py-2.5 text-xs font-bold text-slate-700 outline-none transition-all cursor-pointer appearance-none text-center"
                     >
                        <option value="학기중">학기중</option>
                        <option value="방학중">방학중</option>
                        <option value="기타">기타</option>
                     </select>
                     <div className="flex-1 bg-slate-50 border border-slate-200 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 rounded-xl px-3 py-2.5 flex items-center gap-1 transition-all">
                        <input 
                          type="text" 
                          value={selectedMeeting?.startTime || '09:00'} 
                          onChange={(e) => handleUpdateField('startTime', e.target.value)}
                          className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none text-center"
                          placeholder="시작"
                        />
                        <span className="text-slate-400 font-black text-xs">~</span>
                        <input 
                          type="text" 
                          value={selectedMeeting?.endTime || '18:00'} 
                          onChange={(e) => handleUpdateField('endTime', e.target.value)}
                          className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none text-center"
                          placeholder="종료"
                        />
                     </div>
                  </div>
                </div>

                <div className="space-y-1.5 focus-within:text-emerald-600 transition-colors">
                  <label className="text-[10px] font-black text-inherit uppercase tracking-widest px-1">기안자</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
                    <input 
                      type="text" 
                      value={selectedMeeting?.author || ''} 
                      onChange={(e) => handleUpdateField('author', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 rounded-xl pl-10 pr-3 py-2.5 text-xs font-bold text-slate-700 outline-none transition-all"
                      placeholder="기안자 이름"
                    />
                  </div>
                </div>
              </div>
           </section>

           <section className="space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Approval Matrix</h5>
              </div>
              <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-4 shadow-xl">
                 <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-xs">장</div>
                    <div>
                       <p className="text-[11px] font-bold">시설장 검토 대기</p>
                       <p className="text-[9px] text-slate-500 uppercase tracking-widest">Pending Boss</p>
                    </div>
                 </div>
                 <div className="pt-4 border-t border-white/10">
                    <button className="w-full py-2 bg-white/10 hover:bg-white/20 transition-all rounded-lg text-[10px] font-black uppercase tracking-widest">결재 요청하기</button>
                 </div>
              </div>
           </section>

           <div className="p-8 bg-indigo-50 rounded-3xl space-y-3 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-indigo-100 rounded-full blur-2xl group-hover:scale-150 transition-all" />
              <h6 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest relative z-10">Smart AI Assistant</h6>
              <p className="text-[11px] font-bold text-slate-400 leading-relaxed relative z-10">회의록 내용을 기반으로 아동별 관찰일지를 자동 생성할 수 있습니다.</p>
              <button className="flex items-center gap-2 text-indigo-600 text-[10px] font-black uppercase tracking-widest mt-2 relative z-10">일지 생성 실행 <ArrowRight className="w-3 h-3" /></button>
           </div>
        </div>
      </div>

      {/* Delete Single Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 shadow-2xl flex flex-col items-center gap-6 min-w-[320px] animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center shadow-inner">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">문서 삭제</h3>
              <p className="text-sm font-bold text-slate-500">정말로 이 문서를 삭제하시겠습니까?</p>
            </div>
            <div className="flex gap-3 w-full mt-2">
               <button onClick={() => setDeleteTargetId(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all">취소</button>
               <button onClick={executeDelete} className="flex-1 py-3 bg-rose-600 text-white font-black rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20">삭제하기</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Batch Modal */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 shadow-2xl flex flex-col items-center gap-6 min-w-[320px] animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center shadow-inner">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">일괄 삭제 확인</h3>
              <p className="text-sm font-bold text-slate-500">선택한 {checkedMeetings.length}개의 문서를 모두 삭제하시겠습니까?</p>
            </div>
            <div className="flex gap-3 w-full mt-2">
               <button onClick={() => setShowBatchDeleteModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all">취소</button>
               <button onClick={executeBatchDelete} className="flex-1 py-3 bg-rose-600 text-white font-black rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20">일괄 삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 shadow-2xl flex flex-col items-center gap-6 min-w-[320px] animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center shadow-inner">
              <MessageSquare className="w-8 h-8 text-indigo-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">수정 확인</h3>
              <p className="text-sm font-bold text-slate-500">기록을 수정하시겠습니까?</p>
            </div>
            <div className="flex gap-3 w-full mt-2">
               <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-all">취소</button>
               <button onClick={executeSave} className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-black transition-all shadow-lg shadow-indigo-600/20">확인</button>
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 shadow-2xl flex flex-col items-center gap-5 min-w-[320px] animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-[6px] border-emerald-100 flex items-center justify-center shadow-inner">
              <CheckSquare className="w-10 h-10 text-emerald-500" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">저장 완료</h3>
              <p className="text-sm font-bold text-slate-400">기록이 안전하게 저장되었습니다</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingsPage;

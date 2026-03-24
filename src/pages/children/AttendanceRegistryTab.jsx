import React, { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { FileSpreadsheet, CheckCircle2, X } from 'lucide-react';
import { YEAR_RANGE } from './utils';

const AttendanceRegistryTab = ({
  childrenList,
  setChildrenList,
  ledgerYear,
  setLedgerYear,
  ledgerMonth,
  setLedgerMonth,
  setActiveViewId,
  setSelectedChildId
}) => {
  const [editingCell, setEditingCell] = useState(null); // { childId, date, current }
  const [applyToAll, setApplyToAll] = useState(false);
  const [excludeWeekends, setExcludeWeekends] = useState(true);

  const daysInMonth = new Date(ledgerYear, ledgerMonth, 0).getDate();
  
  const ledgerChildren = childrenList.filter(child => {
    const yd = child.yearlyData?.[ledgerYear] || {};
    const enroll = child.enrollment || yd.enrollment;
    const discharge = child.dischargeDate || yd.dischargeDate;
    
    const firstDay = new Date(ledgerYear, ledgerMonth - 1, 1);
    const lastDay = new Date(ledgerYear, ledgerMonth, 0);
    
    if (enroll) {
      const d = new Date(enroll);
      if (!isNaN(d) && d > lastDay) return false;
    }
    if (discharge) {
      const d = new Date(discharge);
      if (!isNaN(d) && d <= lastDay) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* 상단 컨트롤 영역 (Sticky) */}
      <div className="p-4 border-b border-slate-100 bg-white z-50">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance Registry</span>
            </div>
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic flex items-center gap-2">
                월간 출결 현황 대장 <span className="text-indigo-600">.</span>
              </h3>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <select
                  value={ledgerYear}
                  onChange={e => setLedgerYear(Number(e.target.value))}
                  className="bg-white border-0 text-slate-700 font-black px-3 py-1.5 rounded-lg text-xs outline-none w-28 shadow-sm"
                >
                  {YEAR_RANGE.map(y => <option key={y} value={y}>{y}년도</option>)}
                </select>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <select
                  value={ledgerMonth}
                  onChange={e => setLedgerMonth(Number(e.target.value))}
                  className="bg-white border-0 text-slate-700 font-black px-3 py-1.5 rounded-lg text-xs outline-none w-20 shadow-sm"
                >
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
                </select>
              </div>
              <span className="text-[11px] bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-black border border-indigo-100">
                총원: {ledgerChildren.length}명
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-black text-[11px] hover:bg-slate-200 transition-all">인쇄하기</button>
            <button className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[11px] shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">EXCEL 다운로드</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-max">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-50 bg-slate-900">
                <tr className="text-slate-300">
                  <th className="px-1 py-4 w-10 text-center font-black uppercase tracking-widest text-[8px] sticky left-0 z-[60] bg-slate-900 border-r border-slate-800">No</th>
                  <th className="px-2 py-4 w-20 font-black uppercase tracking-widest text-[9px] sticky left-[40px] z-[60] bg-slate-900 border-r border-slate-800 whitespace-nowrap text-center">성명</th>
                  <th className="px-2 py-4 w-24 font-black uppercase tracking-widest text-[9px] sticky left-[120px] z-[60] bg-slate-900 border-r border-slate-800 whitespace-nowrap text-center">학교 학년</th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                    <th key={day} className="py-4 text-center font-black text-[9px] w-8 border-r border-slate-800 last:border-0">{day}</th>
                  ))}
                  <th className="px-1 py-4 w-14 text-center font-black uppercase text-[9px] bg-indigo-900 text-indigo-100 border-l border-indigo-800 sticky right-[112px] z-[60]">출석</th>
                  <th className="px-1 py-4 w-14 text-center font-black uppercase text-[9px] bg-slate-800 text-slate-100 sticky right-[56px] z-[60]">결석</th>
                  <th className="px-1 py-4 w-14 text-center font-black uppercase text-[9px] bg-emerald-900 text-emerald-100 sticky right-0 z-[60]">비율</th>
                </tr>
              </thead>
              <Reorder.Group 
                as="tbody" 
                axis="y" 
                values={ledgerChildren} 
                onReorder={(newOrder) => {
                  const updated = [...childrenList];
                  newOrder.forEach((item, idx) => {
                    const originalIdx = updated.findIndex(c => c.id === item.id);
                    const targetIdx = updated.findIndex(c => c.id === ledgerChildren[idx].id);
                    if (originalIdx !== -1 && targetIdx !== -1) {
                       const [moved] = updated.splice(originalIdx, 1);
                       updated.splice(targetIdx, 0, moved);
                    }
                  });
                  setChildrenList(updated);
                }}
                className="divide-y divide-slate-100"
              >
                {ledgerChildren.map((child, idx) => {
                  const yearData = child.yearlyData?.[ledgerYear] || {};
                  const days = Array.from({ length: daysInMonth }, (_, i) => {
                    const date = `${ledgerYear}-${String(ledgerMonth).padStart(2, '0')}-${String(i+1).padStart(2, '0')}`;
                    return child.attendance?.[date];
                  });
                  
                  const presentCount = days.filter(d => d?.status === 'PRESENT').length;
                  const absentCount = days.filter(d => d?.status === 'ABSENT').length;
                  const rate = daysInMonth > 0 ? (((presentCount + days.filter(d => d?.status === 'OFFICIAL').length) / (days.filter(d => d?.status).length || 1)) * 100).toFixed(1) : 0;

                  return (
                    <Reorder.Item 
                      key={child.id} 
                      value={child}
                      as="tr" 
                      className="hover:bg-indigo-50/20 transition-all group border-b border-slate-50"
                    >
                      <td className="px-1 py-1 text-center font-bold text-slate-400 text-[9px] sticky left-0 bg-white group-hover:bg-indigo-50 transition-colors z-40 border-r border-slate-100">
                        <span className="italic">{idx + 1}</span>
                      </td>
                      <td 
                        className="px-2 py-1 font-black text-slate-900 text-[11px] sticky left-[40px] bg-white group-hover:bg-indigo-50 transition-colors z-40 border-r border-slate-100 cursor-pointer whitespace-nowrap text-center align-middle"
                        onClick={() => { setSelectedChildId(child.id); setActiveViewId('children_view'); }}
                      >
                        {child.name}
                      </td>
                      <td className="px-1 py-1 text-[9px] font-bold text-slate-500 sticky left-[120px] bg-white group-hover:bg-indigo-50 transition-colors z-40 border-r border-slate-100 whitespace-nowrap text-center align-middle">
                        <div className="flex flex-col leading-none items-center justify-center h-full">
                          <span>{yearData.school || child.school || '-'}</span>
                          <span className="text-[7px] opacity-70 scale-90">{yearData.grade || child.grade ? `${yearData.grade || child.grade}학년` : ''}</span>
                        </div>
                      </td>
                      {days.map((day, i) => {
                          const dateStr = `${ledgerYear}-${String(ledgerMonth).padStart(2, '0')}-${String(i+1).padStart(2, '0')}`;
                          return (
                            <td 
                              key={i} 
                              onClick={() => {
                                setEditingCell({ childId: child.id, date: dateStr, current: day || {} });
                                setApplyToAll(false);
                                setExcludeWeekends(true);
                              }}
                              className="py-1 px-0.5 text-center border-r border-slate-50 cursor-pointer hover:bg-indigo-50 transition-colors"
                            >
                              {day?.status === 'PRESENT' ? (
                                <div className="flex flex-col items-center justify-center gap-0.5 scale-90 origin-center">
                                  <div className="flex flex-col items-center leading-none">
                                    <div className="flex flex-col items-center font-black text-[7.5px] text-slate-400">
                                      <span className="text-emerald-600/90">{day.entryTime || day.time || '--:--'}</span>
                                      <span className="text-slate-500 border-t border-slate-50 mt-0.5 pt-0.5">{day.exitTime || '--:--'}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : day?.status === 'ABSENT' ? (
                                <div className="text-[9px] font-black text-rose-500 scale-90">결석</div>
                              ) : day?.status === 'OFFICIAL' ? (
                                <div className="text-[9px] font-black text-indigo-500 scale-90">공결</div>
                              ) : day?.status === 'LATE' ? (
                                <div className="text-[9px] font-black text-amber-500 scale-90">지각</div>
                              ) : (
                                <div className="w-1 h-1 bg-slate-200 rounded-full mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      <td className="px-1 py-1 text-center bg-indigo-50/50 border-l border-indigo-100 sticky right-[112px] z-30 group-hover:bg-indigo-100/50 transition-colors align-middle">
                        <span className="text-[10px] font-black text-indigo-600">{presentCount + (days.filter(d => d?.status === 'OFFICIAL').length)}</span>
                        <span className="text-[7.5px] font-bold text-slate-400 ml-0.5">일</span>
                      </td>
                      <td className="px-1 py-1 text-center bg-rose-50/50 sticky right-[56px] z-30 group-hover:bg-rose-100/50 transition-colors align-middle">
                        <span className="text-[10px] font-black text-rose-600">{absentCount}</span>
                        <span className="text-[7.5px] font-bold text-slate-400 ml-0.5">일</span>
                      </td>
                      <td className="px-1 py-1 text-center bg-emerald-50/50 sticky right-0 z-30 group-hover:bg-emerald-100/50 transition-colors align-middle">
                        <span className="text-[9px] font-black text-emerald-600 italic">
                          {daysInMonth > 0 ? (((presentCount + days.filter(d => d?.status === 'OFFICIAL').length) / (days.filter(d => d?.status).length || 1)) * 100).toFixed(0) : 0}%
                        </span>
                      </td>
                    </Reorder.Item>
                  );
                })}
                {ledgerChildren.length === 0 && (
                  <tr>
                    <td colSpan={daysInMonth + 6} className="px-6 py-20 text-center text-slate-400 text-sm font-bold">
                      {ledgerYear}년 {ledgerMonth}월에 해당 조건의 아동이 없습니다.
                    </td>
                  </tr>
                )}
              </Reorder.Group>
            </table>
          </div>
        </div>

      {/* 출결 개별 수정 모달 */}
      <AnimatePresence>
        {editingCell && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[3rem] shadow-3xl overflow-hidden border border-white/20"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
                <div>
                  <h4 className="text-xl font-black tracking-tight m-0 italic">출결 세부 정보 수정 <span className="text-indigo-400">.</span></h4>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">{editingCell.date} ({childrenList.find(c => c.id === editingCell.childId)?.name})</p>
                </div>
                <button onClick={() => setEditingCell(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-10 space-y-8">
                {/* 상태 선택 */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">출결 상태 선택</label>
                  <div className="grid grid-cols-2 gap-2">
                     {[
                       { id: 'PRESENT', label: '정상 등원', color: 'emerald' },
                       { id: 'ABSENT', label: '결석', color: 'rose' },
                       { id: 'OFFICIAL', label: '공결', color: 'indigo' },
                       { id: 'LATE', label: '지각/조퇴', color: 'amber' },
                       { id: null, label: '기록 삭제', color: 'slate' }
                     ].map(st => (
                       <button
                         key={st.id}
                         onClick={() => {
                           const next = { ...editingCell.current, status: st.id };
                           if (!st.id) {
                              setEditingCell({ ...editingCell, current: {} });
                           } else {
                              setEditingCell({ ...editingCell, current: next });
                           }
                         }}
                         className={`py-3 px-4 rounded-2xl text-[11px] font-black transition-all border-2 ${editingCell.current?.status === st.id ? `bg-${st.color}-500 border-${st.color}-500 text-white shadow-lg` : `bg-white border-slate-100 text-slate-400 hover:border-${st.color}-200`}`}
                       >
                         {st.label}
                       </button>
                     ))}
                  </div>
                </div>

                {/* 시간 입력 (등원 상태일 때만) */}
                {editingCell.current?.status === 'PRESENT' || editingCell.current?.status === 'LATE' || editingCell.current?.status === 'OFFICIAL' ? (
                  <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-top-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">등원 시간</label>
                      <input 
                        type="time" 
                        value={editingCell.current?.entryTime || editingCell.current?.time || ''} 
                        onChange={e => setEditingCell({ ...editingCell, current: { ...editingCell.current, entryTime: e.target.value, time: e.target.value } })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 font-black text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">하원 시간</label>
                      <input 
                        type="time" 
                        value={editingCell.current?.exitTime || ''} 
                        onChange={e => setEditingCell({ ...editingCell, current: { ...editingCell.current, exitTime: e.target.value } })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 font-black text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-200 font-black uppercase tracking-widest italic border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                    시간 입력이 필요 없는 상태입니다.
                  </div>
                )}

                {/* 일괄 적용 옵션 */}
                <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${applyToAll ? 'bg-indigo-600 text-white' : 'bg-white border-2 border-slate-200 group-hover:border-indigo-400'}`}>
                      {applyToAll && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={applyToAll} 
                      onChange={(e) => setApplyToAll(e.target.checked)} 
                    />
                    <div>
                      <div className="text-[12px] font-black text-slate-700">이 아동의 {ledgerMonth}월 전체 요일에 동일하게 일괄 적용하기</div>
                      <div className="text-[10px] font-bold text-slate-500 mt-0.5">선택한 출결 상태와 시간을 한 달치 기록에 덮어씁니다.</div>
                    </div>
                  </label>
                  
                  <AnimatePresence>
                    {applyToAll && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 'auto', opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden pl-8"
                      >
                        <label className="flex items-center gap-2 cursor-pointer group pt-2">
                          <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${excludeWeekends ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-200 group-hover:border-emerald-400'}`}>
                            {excludeWeekends && <CheckCircle2 className="w-3 h-3" />}
                          </div>
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={excludeWeekends} 
                            onChange={(e) => setExcludeWeekends(e.target.checked)} 
                          />
                          <span className="text-[11px] font-bold text-slate-600">주말(토, 일)은 기록에서 제외하기</span>
                        </label>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4">
                 <button onClick={() => setEditingCell(null)} className="flex-1 py-5 bg-white border border-slate-200 text-slate-500 rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-sm">취소</button>
                 <button 
                   onClick={() => {
                     const child = childrenList.find(c => c.id === editingCell.childId);
                     let updatedAttendance = { ...child.attendance };
                     
                     if (applyToAll) {
                       const days = new Date(ledgerYear, ledgerMonth, 0).getDate();
                       for (let i = 1; i <= days; i++) {
                         const dateObj = new Date(ledgerYear, ledgerMonth - 1, i);
                         const dayOfWeek = dateObj.getDay();
                         
                         if (excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) continue;
                         
                         const dateStr = `${ledgerYear}-${String(ledgerMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                         if (!editingCell.current?.status) {
                           delete updatedAttendance[dateStr];
                         } else {
                           updatedAttendance[dateStr] = { ...editingCell.current };
                         }
                       }
                     } else {
                       if (!editingCell.current?.status) {
                         delete updatedAttendance[editingCell.date];
                       } else {
                         updatedAttendance[editingCell.date] = { ...editingCell.current };
                       }
                     }
                     
                     setChildrenList(prev => prev.map(c => c.id === editingCell.childId ? { ...c, attendance: updatedAttendance } : c));
                     setEditingCell(null);
                   }} 
                   className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-indigo-200"
                 >
                  설정 저장
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AttendanceRegistryTab;

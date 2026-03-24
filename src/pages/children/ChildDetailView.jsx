import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDaumPostcodePopup } from 'react-daum-postcode';
import SunEditor from 'suneditor-react';
import lang from 'suneditor/src/lang/ko';
import 'suneditor/dist/css/suneditor.min.css';
import {
  X, Save, Printer, User, IdCard, FileSpreadsheet, Calendar as CalendarIcon,
  AlertCircle, MapPin, School, Eye, EyeOff, CheckCircle2, ArrowRight, Clock, Plus
} from 'lucide-react';
import SchoolSearchModal from './SchoolSearchModal';
import { calculateAge, maskSsn, EMPTY_YEAR_DATA, YEAR_RANGE } from './utils';

const F = ({ label, children: ch, span = 1, red = false }) => (
  <div className={`flex border border-slate-200 ${span === 2 ? 'col-span-2' : ''}`}>
    <div className="bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-600 flex items-center min-w-[90px] border-r border-slate-200 whitespace-nowrap">
      {label}
    </div>
    <div className={`flex-1 px-3 py-2 ${red ? 'text-rose-500' : ''}`}>{ch}</div>
  </div>
);

const Input = ({ field, form, set, type = 'text', placeholder = '', className = '', onChangeExtra }) => (
  <input
    type={type}
    value={form[field] ?? ''}
    placeholder={placeholder}
    onChange={e => { set(field, e.target.value); onChangeExtra?.(); }}
    className={`w-full text-[12px] font-bold text-slate-900 bg-transparent outline-none ${className}`}
  />
);

const Select = ({ field, form, set, options }) => (
  <select
    value={form[field] ?? ''}
    onChange={e => set(field, e.target.value)}
    className="w-full text-[12px] font-bold text-slate-900 bg-transparent outline-none"
  >
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

const ChildDetailView = ({ child, children, selectedYear, onYearChange, onSelectChild, onClose, onSave }) => {
  const [showSsn, setShowSsn] = useState(false);
  const [form, setForm] = useState(null);
  const [detailYear, setDetailYear] = useState(selectedYear);
  const [showSchoolSearch, setShowSchoolSearch] = useState(false);
  const [activeTab, setActiveTab] = useState('기본인적사항');
  const [selectedCardId, setSelectedCardId] = useState(null);
  const editorRef = useRef();

  const openDaum = useDaumPostcodePopup();

  // 출결 현황 탭을 위한 로컬 상태
  const [ledgerYear, setLedgerYear] = useState(detailYear);
  const [ledgerMonth, setLedgerMonth] = useState(new Date().getMonth() + 1);

  const handleAddressSearch = () => {
    openDaum({
      onComplete: (data) => {
        let fullAddress = data.address;
        let extraAddress = '';

        if (data.addressType === 'R') {
          if (data.bname !== '') extraAddress += data.bname;
          if (data.buildingName !== '') extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
          fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
        }

        set('address', fullAddress);
      },
    });
  };

  const availableYears = useMemo(() => {
    if (!child) return [];
    return Object.keys(child.yearlyData || {}).map(Number).sort((a, b) => b - a);
  }, [child]);

  useEffect(() => {
    if (!child) return;
    const yd = child.yearlyData?.[detailYear] || EMPTY_YEAR_DATA();
    setForm({
      name: child.name || '',
      gender: child.gender || '',
      birth: child.birth || '',
      phone: yd.phone || child.phone || '',
      ssn: child.ssn || yd.ssn || '',
      school: yd.school || '',
      grade: yd.grade || '',
      address: yd.address || '',
      guardian: yd.guardian || '',
      guardianRel: yd.guardianRel || child.guardianRel || '',
      familyType: yd.familyType || child.familyType || '',
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
      cardRecords: yd.cardRecords || child.cardRecords || [],
      attendance: child.attendance || yd.attendance || {},
    });
    setShowSsn(child.id === 'NEW');
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
          familyType: form.familyType,
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
          cardRecords: form.cardRecords,
          attendance: form.attendance,
        },
      },
      attendance: form.attendance,
    };
    onSave(updatedChild);
    alert('저장되었습니다.');
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#f0f2f5]">
      {showSchoolSearch && (
        <SchoolSearchModal 
          onClose={() => setShowSchoolSearch(false)}
          onSelect={(school) => {
            set('school', school);
            setShowSchoolSearch(false);
          }}
        />
      )}

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

        <div className="bg-white border-b border-slate-200 px-6 flex items-center gap-1 shrink-0 z-10">
          <button
            onClick={() => setActiveTab('기본인적사항')}
            className={`px-6 py-4 text-[13px] font-black border-b-2 transition-all flex items-center gap-2 ${activeTab === '기본인적사항' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <User className="w-4 h-4" /> 기본인적사항
          </button>
          <button
            onClick={() => setActiveTab('아동카드')}
            className={`px-6 py-4 text-[13px] font-black border-b-2 transition-all flex items-center gap-2 ${activeTab === '아동카드' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <IdCard className="w-4 h-4" /> 아동카드
          </button>
          <button
            onClick={() => setActiveTab('아동카드정보')}
            className={`px-6 py-4 text-[13px] font-black border-b-2 transition-all flex items-center gap-2 ${activeTab === '아동카드정보' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <FileSpreadsheet className="w-4 h-4" /> 아동카드정보
          </button>
          <button
            onClick={() => setActiveTab('출결현황')}
            className={`px-6 py-4 text-[13px] font-black border-b-2 transition-all flex items-center gap-2 ${activeTab === '출결현황' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <CalendarIcon className="w-4 h-4" /> 출결현황
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {activeTab === '기본인적사항' ? (
            <div className="p-8 space-y-10">
              <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-indigo-600 rounded-full shadow-sm shadow-indigo-200" />
              <h4 className="text-[13px] font-black text-slate-900 tracking-tight">기본인적사항</h4>
              <div className="flex-1 h-px bg-slate-200 ml-2" />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm max-w-5xl">
              <div className="px-5 py-3 bg-indigo-50/50 border-b border-indigo-100 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Administrative Identification Info</span>
              </div>
              <div className="p-4">
                <div className="flex gap-6">
                  <div className="flex-1 grid grid-cols-2 border border-slate-200 divide-x divide-y divide-slate-200 rounded-xl overflow-hidden shadow-inner bg-white">
                    <F label="관리번호"><Input field="displayId" form={form} set={set} placeholder="관리번호" /></F>
                    <F label="성명"><Input field="name" form={form} set={set} className="flex-1" /></F>
                    <F label="주민번호" span={2}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          { (showSsn || child.id === 'NEW')
                            ? (
                              <input
                                type="text"
                                value={form.ssn || ''}
                                placeholder="000000-0000000"
                                onChange={e => {
                                  const rawVal = e.target.value;
                                  let digits = rawVal.replace(/\D/g, '');
                                  let formatted = digits;
                                  if (digits.length > 6) {
                                    formatted = digits.slice(0, 6) + '-' + digits.slice(6, 13);
                                  }
                                  
                                  const updates = { ssn: formatted };
                                  if (digits.length >= 7) {
                                    const g = digits.charAt(6);
                                    if ('13579'.includes(g)) updates.gender = '남';
                                    else if ('24680'.includes(g)) updates.gender = '여';
                                    
                                    const yy = digits.slice(0, 2);
                                    const mm = digits.slice(2, 4);
                                    const dd = digits.slice(4, 6);
                                    let fullYear = parseInt(yy);
                                    if ('3478'.includes(g)) fullYear += 2000;
                                    else if ('1256'.includes(g)) fullYear += 1900;
                                    else if ('90'.includes(g)) fullYear += 1800;
                                    else fullYear += (fullYear < 40 ? 2000 : 1900);
                                    updates.birth = `${fullYear}-${mm}-${dd}`;
                                  }
                                  setForm(p => ({ ...p, ...updates }));
                                }}
                                className="w-full text-[12px] font-bold text-slate-900 bg-transparent outline-none"
                              />
                            )
                            : <span className="text-[12px] font-bold text-slate-400">{form.ssn ? maskSsn(form.ssn) : '000000-0000000'}</span>
                          }
                        </div>
                        <button onClick={() => setShowSsn(p => !p)} className="text-slate-400 hover:text-slate-600">
                          {showSsn ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <span className="text-[10px] text-slate-400">생년월일: {form.birth} (만 {calculateAge(form.birth)}세)</span>
                      </div>
                    </F>
                    <F label="성별"><Select field="gender" form={form} set={set} options={['', '남', '여']} /></F>
                    <F label="휴대폰"><Input field="phone" form={form} set={set} placeholder="010-0000-0000" /></F>
                    <F label="주소" span={2}>
                      <div className="flex items-center gap-2">
                        <Input field="address" form={form} set={set} placeholder="주소" className="flex-1" />
                        <button 
                          type="button"
                          onClick={handleAddressSearch}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black border border-slate-200 transition-colors flex items-center gap-1 shrink-0"
                        >
                          <MapPin className="w-3 h-3" /> 주소 검색
                        </button>
                      </div>
                    </F>
                    <F label="학교명">
                      <div className="flex items-center gap-2">
                        <Input field="school" form={form} set={set} placeholder="학교명" className="flex-1" />
                        <button 
                          type="button"
                          onClick={() => setShowSchoolSearch(true)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black border border-slate-200 transition-colors flex items-center gap-1 shrink-0"
                        >
                          <School className="w-3 h-3" /> 학교 검색
                        </button>
                      </div>
                    </F>
                    <F label="학년"><Input field="grade" form={form} set={set} placeholder="학년" /></F>
                    <F label="보호자"><Input field="guardian" form={form} set={set} placeholder="보호자명" /></F>
                    <F label="보호자 연락처"><Input field="contact" form={form} set={set} placeholder="010-0000-0000" /></F>
                    <F label="입소일" red><Input field="enrollment" form={form} set={set} type="date" /></F>
                    <F label="퇴소일" red>
                      <div className="flex items-center gap-2">
                        <Input field="dischargeDate" form={form} set={set} type="date" />
                      </div>
                    </F>
                    <F label="이전 입소일"><Input field="prevEnrollment" form={form} set={set} type="date" /></F>
                    <F label="소득분위(%)"><Input field="incomeRate" form={form} set={set} placeholder="%" /></F>
                    <F label="키즈콜 ID"><Input field="kidsCallId" form={form} set={set} placeholder="키즈콜 ID" /></F>
                    <F label="카드 번호"><Input field="cardId" form={form} set={set} placeholder="카드 ID" /></F>
                  </div>

                  <div className="w-32 flex flex-col gap-3 shrink-0">
                    <div className="border border-slate-200 rounded-2xl aspect-[3/4] flex flex-col items-center justify-center gap-2 bg-slate-100 shadow-inner overflow-hidden">
                      {child.photo
                        ? <img src={child.photo} className="w-full h-full object-cover" alt="" />
                        : <>
                            <User className="w-10 h-10 text-slate-300" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">No Photo</span>
                          </>
                      }
                    </div>
                    <button className="py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                       <Printer className="w-3.5 h-3.5" /> 대장 출력
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-indigo-600 rounded-full shadow-sm shadow-indigo-200" />
              <h4 className="text-[13px] font-black text-slate-900 tracking-tight">자격 및 이용정보</h4>
              <div className="flex-1 h-px bg-slate-200 ml-2" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm max-w-5xl">
              <div className="p-4 grid grid-cols-2 border border-slate-200 divide-x divide-y divide-slate-200 rounded-xl overflow-hidden bg-white">
                <F label="이용유형"><Select field="useType" form={form} set={set} options={['일반', '방과후', '종일', '시간제', '기타', '다문화', '다자녀 가정', '차상위', '교육급여']} /></F>
                <F label="담당자"><Input field="manager" form={form} set={set} placeholder="담당자명" /></F>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-indigo-600 rounded-full shadow-sm shadow-indigo-200" />
              <h4 className="text-[13px] font-black text-slate-900 tracking-tight">장애 및 건강정보</h4>
              <div className="flex-1 h-px bg-slate-200 ml-2" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm max-w-5xl">
              <div className="p-4 grid grid-cols-2 border border-slate-200 divide-x divide-y divide-slate-200 rounded-xl overflow-hidden bg-white">
                <F label="장애 유형" span={2}><Input field="disabilityType" form={form} set={set} placeholder="장애 유형 (없으면 공란)" /></F>
                <F label="건강 특이사항" span={2}><Input field="healthNotes" form={form} set={set} placeholder="알레르기, 복약 정보 등" /></F>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-indigo-600 rounded-full shadow-sm shadow-indigo-200" />
              <h4 className="text-[13px] font-black text-slate-900 tracking-tight">가구원 및 연고자 정보</h4>
              <div className="flex-1 h-px bg-slate-200 ml-2" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm max-w-5xl">
              <div className="p-4 grid grid-cols-2 border border-slate-200 divide-x divide-y divide-slate-200 rounded-xl overflow-hidden bg-white">
                <F label="가족 유형"><Input field="familyType" form={form} set={set} placeholder="양부모/한부모/조손 등" /></F>
                <F label="보호자 관계"><Input field="guardianRel" form={form} set={set} placeholder="부/모/조부/조모 등" /></F>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-indigo-600 rounded-full shadow-sm shadow-indigo-200" />
              <h4 className="text-[13px] font-black text-slate-900 tracking-tight">특이사항</h4>
              <div className="flex-1 h-px bg-slate-200 ml-2" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm max-w-5xl">
              <div className="p-4">
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="특이사항을 입력하세요..."
                  className="w-full h-40 border border-slate-200 rounded-xl p-4 text-[12px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-50/50 focus:border-indigo-400 transition-all resize-none shadow-inner bg-slate-50/30"
                />
              </div>
            </div>
          </section>
            </div>
          ) : activeTab === '아동카드정보' ? (
            <div className="flex h-full bg-slate-50 overflow-hidden">
              <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h5 className="text-[11px] font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-tighter">아동 카드 기록 <span className="text-indigo-600">.</span></h5>
                  <button 
                    onClick={() => {
                      const id = Date.now();
                      const newRecord = { id, title: '새 기록', date: new Date().toISOString().split('T')[0], content: '' };
                      const updatedRecords = [newRecord, ...(form.cardRecords || [])];
                      set('cardRecords', updatedRecords);
                      setSelectedCardId(id);
                    }}
                    className="p-1 px-2 border border-slate-200 rounded-lg bg-white text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3 h-3" /> 추가
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 font-['Outfit']">
                  {(form.cardRecords || []).map(rec => (
                    <button
                      key={rec.id}
                      onClick={() => setSelectedCardId(rec.id)}
                      className={`w-full text-left px-3 py-3 rounded-xl transition-all border ${selectedCardId === rec.id ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-white border-transparent hover:border-slate-100'}`}
                    >
                      <div className={`text-[9px] font-bold mb-1 ${selectedCardId === rec.id ? 'text-indigo-200' : 'text-slate-400'}`}>{rec.date}</div>
                      <div className={`text-[11px] font-black truncate ${selectedCardId === rec.id ? 'text-white' : 'text-slate-900'}`}>{rec.title}</div>
                    </button>
                  ))}
                  {(!form.cardRecords || form.cardRecords.length === 0) && (
                    <div className="py-20 text-center space-y-2 opacity-30">
                       <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-400" />
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No Records Yet</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/30 font-['Outfit']">
                {selectedCardId ? (
                  <>
                    <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black shadow-inner"><Save className="w-4 h-4" /></div>
                         <div className="space-y-0.5">
                            <input 
                              type="text" 
                              value={(form.cardRecords || []).find(r => r.id === selectedCardId)?.title || ''}
                              onChange={e => {
                                const val = e.target.value;
                                const updated = (form.cardRecords || []).map(r => r.id === selectedCardId ? { ...r, title: val } : r);
                                set('cardRecords', updated);
                              }}
                              className="text-sm font-black text-slate-900 bg-transparent border-none outline-none focus:ring-0 p-0"
                              placeholder="기록 명칭을 입력하세요"
                            />
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Editing Record Instance</p>
                         </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            const content = editorRef.current.editor.getContents();
                            const updated = (form.cardRecords || []).map(r => r.id === selectedCardId ? { ...r, content } : r);
                            set('cardRecords', updated);
                            alert('에디터 내용이 하단 폼에 반영되었습니다. 최종 저장을 위해 상단의 [저장] 버튼을 눌러주세요.');
                          }}
                          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                          <Save className="w-3.5 h-3.5" /> 내용 반영
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 p-8 overflow-y-auto">
                      <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-sm p-1 border border-slate-200">
                        <SunEditor 
                          ref={editorRef}
                          setContents={(form.cardRecords || []).find(r => r.id === selectedCardId)?.content || ''}
                          setOptions={{
                            buttonList: [
                              ['undo', 'redo'],
                              ['font', 'fontSize', 'formatBlock'],
                              ['bold', 'underline', 'italic', 'strike'],
                              ['fontColor', 'hiliteColor'],
                              ['removeFormat'],
                              ['outdent', 'indent'],
                              ['align', 'list', 'lineHeight'],
                              ['table', 'link', 'image'],
                              ['fullScreen', 'showBlocks', 'codeView'],
                              ['preview', 'print']
                            ],
                            height: '600px',
                            lang: lang,
                            tableCellController: true,
                            resizingBar: false,
                            placeholder: '아동에 관한 상세 정보를 기록해 주세요...'
                          }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-40 grayscale space-y-4">
                     <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                        <ArrowRight className="w-8 h-8 text-slate-300" />
                     </div>
                     <div className="text-center">
                        <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Select a record</p>
                        <p className="text-[10px] font-bold text-slate-400">편집할 기록을 왼쪽 목록에서 선택해 주세요.</p>
                     </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === '출결현황' ? (
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 space-y-8 font-['Outfit']">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                       <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div>
                       <h4 className="text-lg font-black text-slate-900 tracking-tight">개인별 출결 관리</h4>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Personal Attendance Registry</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-sm">
                     <button onClick={() => {
                        const prev = new Date(ledgerYear, ledgerMonth - 2, 1);
                        setLedgerYear(prev.getFullYear());
                        setLedgerMonth(prev.getMonth() + 1);
                     }} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
                     <span className="px-3 text-xs font-black text-slate-700">{ledgerYear}년 {ledgerMonth}월</span>
                     <button onClick={() => {
                        const next = new Date(ledgerYear, ledgerMonth, 1);
                        setLedgerYear(next.getFullYear());
                        setLedgerMonth(next.getMonth() + 1);
                     }} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400"><ChevronRight className="w-4 h-4" /></button>
                  </div>
               </div>

               <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/40">
                  <div className="p-6">
                    <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                       {['일','월','화','수','목','금','토'].map(d => (
                         <div key={d} className={`p-3 text-center text-[10px] font-black uppercase tracking-widest bg-slate-50 ${d==='일'?'text-rose-500':d==='토'?'text-blue-500':'text-slate-400'}`}>{d}</div>
                       ))}
                       {(() => {
                          const start = new Date(ledgerYear, ledgerMonth - 1, 1).getDay();
                          const days = new Date(ledgerYear, ledgerMonth, 0).getDate();
                          const items = [];
                          for(let i=0; i<start; i++) items.push(<div key={`empty-${i}`} className="bg-white/50 backdrop-blur-sm" />);
                          for(let d=1; d<=days; d++) {
                             const dateStr = `${ledgerYear}-${String(ledgerMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                             const att = (form.attendance || {})[dateStr] || {};
                             const isToday = new Date().toISOString().split('T')[0] === dateStr;
                             const isSat = (start + d - 1) % 7 === 6;
                             const isSun = (start + d - 1) % 7 === 0;

                             items.push(
                               <div key={d} className={`min-h-[100px] p-2 bg-white flex flex-col items-end gap-1 group border-r border-b border-slate-100 last:border-r-0 hover:bg-indigo-50/10 transition-colors ${isToday?'ring-2 ring-inset ring-indigo-500 z-10':''}`}>
                                  <div className={`text-[11px] font-black ${isToday?'text-indigo-600':isSun?'text-rose-400':isSat?'text-blue-400':'text-slate-300'}`}>{d}</div>
                                  <div className="flex-1 w-full flex flex-col justify-end gap-1">
                                     <button 
                                        onClick={() => {
                                           const nextStatus = att.status === 'PRESENT' ? 'ABSENT' : att.status === 'ABSENT' ? 'LATE' : att.status === 'LATE' ? null : 'PRESENT';
                                           const updated = { ...form.attendance, [dateStr]: nextStatus ? { status: nextStatus, time: att.time || new Date().toLocaleTimeString('en-US',{hour12:false, hour:'2-digit', minute:'2-digit'}) } : null };
                                           set('attendance', updated);
                                        }}
                                        className={`w-full py-2 rounded-xl text-[9px] font-black tracking-tighter uppercase transition-all flex flex-col items-center justify-center gap-0.5 ${
                                           att.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm shadow-emerald-200/50' :
                                           att.status === 'ABSENT' ? 'bg-rose-50 text-rose-600 border border-rose-100 shadow-sm shadow-rose-200/50' :
                                           att.status === 'LATE' ? 'bg-amber-50 text-amber-600 border border-amber-100 shadow-sm shadow-amber-200/50' :
                                           'bg-slate-50 text-slate-300 border border-transparent hover:bg-slate-100 opacity-40 group-hover:opacity-100'
                                        }`}
                                     >
                                        {att.status === 'PRESENT' && <><CheckCircle2 className="w-3 h-3" /> 출석</>}
                                        {att.status === 'ABSENT' && <><X className="w-3 h-3" /> 결석</>}
                                        {att.status === 'LATE' && <><Clock className="w-3 h-3" /> 지각</>}
                                        {!att.status && '미등록'}
                                        {att.status && <span className="text-[7px] opacity-70 mt-0.5">{att.time}</span>}
                                     </button>
                                  </div>
                               </div>
                             );
                          }
                          return items;
                       })()}
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-900 border-t border-white/10 flex items-center justify-between text-white">
                     <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                           <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                           <span className="text-[10px] font-black uppercase tracking-widest">출석 일수: {Object.values(form.attendance || {}).filter(v => v?.status === 'PRESENT').length}일</span>
                        </div>
                        <div className="flex items-center gap-2 text-rose-400">
                           <div className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
                           <span className="text-[10px] font-black uppercase tracking-widest">결석 일수: {Object.values(form.attendance || {}).filter(v => v?.status === 'ABSENT').length}일</span>
                        </div>
                     </div>
                     <p className="text-[9px] font-bold text-slate-500 italic">클릭하여 상태를 순환 변경합니다 (출석→결석→지각→취소)</p>
                  </div>
               </div>
            </div>
          ) : (
            <div className="p-12 flex flex-col items-center font-['Outfit']">
              <motion.div 
                initial={{ rotateY: -30, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }}
                className="w-[480px] h-[300px] bg-white rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-200 relative overflow-hidden flex"
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-600/5 rounded-bl-[10rem]" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-slate-100 rounded-full" />
                
                <div className="w-[180px] h-full p-8 flex flex-col items-center justify-center relative z-10 border-r border-slate-100/50">
                  <div className="w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl shadow-indigo-200 border-4 border-white bg-slate-50 mb-3">
                    {child.photo ? <img src={child.photo} className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-slate-200 m-auto" />}
                  </div>
                  <div className="text-[10px] font-black tracking-widest text-slate-300 uppercase">Child ID #{child.id.toString().slice(-4)}</div>
                </div>

                <div className="flex-1 p-10 flex flex-col justify-between relative z-10">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-black text-indigo-600 tracking-tighter uppercase tracking-widest">Child Care Card</span>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="flex items-end gap-2 mb-6">
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">{child.name || '미입력'}</h2>
                      <span className="text-sm font-bold text-slate-400 mb-1">{form.gender}</span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Birthday</span>
                        <span className="text-sm font-bold text-slate-700">{form.birth || '-'} ({calculateAge(form.birth)}세)</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Affiliation</span>
                        <span className="text-sm font-bold text-slate-700">{form.school || '미소속'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Identification</span>
                        <span className="text-[11px] font-bold text-slate-500 tracking-wider">
                          {showSsn ? form.ssn : maskSsn(form.ssn)}
                          <button onClick={() => setShowSsn(!showSsn)} className="ml-2 inline-block">
                             {showSsn ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 grayscale opacity-30">
                       <div className="w-10 h-6 bg-slate-900 rounded" />
                       <div className="w-14 h-4 bg-slate-200 rounded-sm" />
                    </div>
                    <div className="text-[10px] font-bold text-slate-400">© 2026 SC-System</div>
                  </div>
                </div>
              </motion.div>

              <div className="mt-12 max-w-lg text-center">
                 <p className="text-sm font-bold text-slate-400">이 카드는 아동의 핵심 식별 정보를 한눈에 확인하고 인쇄하기 위한 카드형 뷰입니다.</p>
                 <button className="mt-6 px-10 py-4 bg-white border border-slate-200 rounded-3xl text-sm font-black text-slate-900 shadow-xl shadow-slate-200/50 hover:bg-slate-50 transition-all flex items-center gap-3 mx-auto">
                    <Printer className="w-5 h-5 text-indigo-600" /> 카드 형태 인쇄하기
                 </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChildDetailView;

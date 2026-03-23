import React, { useState, useEffect, useRef, useMemo } from 'react';
import SunEditor from 'suneditor-react';
import lang from 'suneditor/src/lang/ko';
import 'suneditor/dist/css/suneditor.min.css';
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
  ShieldCheck
} from 'lucide-react';

const MeetingsPage = () => {
  const [meetings, setMeetings] = useState(() => {
    const saved = localStorage.getItem('forestMeetings');
    if (saved) return JSON.parse(saved);
    return [
      { id: 1, title: '3월 16일 월요일 기안', date: '2026.03.16', author: '홍길동', dept: '운영팀', status: '작성 중', content: '' },
      { id: 2, title: '주간 운영보고서 - 영업지원팀', date: '2026.03.13', author: '김철수', dept: '지원팀', status: '완료', content: '' },
      { id: 3, title: '3월 12일 목 운영일지', date: '2026.03.12', author: '이영희', dept: '운영팀', status: '완료', content: '' },
    ];
  });

  const [selectedMeetingId, setSelectedMeetingId] = useState(1);
  const selectedMeeting = useMemo(() => meetings.find(m => m.id === selectedMeetingId), [meetings, selectedMeetingId]);
  
  const editorRef = useRef();

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

  const handleSave = () => {
    const editorInstance = editorRef.current.editor;
    const content = editorInstance.getContents();
    
    setMeetings(prev => prev.map(m => m.id === selectedMeetingId ? { ...m, content } : m));
    alert('기록이 안전하게 저장되었습니다.');
  };

  useEffect(() => {
    localStorage.setItem('forestMeetings', JSON.stringify(meetings));
  }, [meetings]);

  const handleNewMeeting = () => {
    const id = Date.now();
    const newDoc = {
      id,
      title: `${new Date().toLocaleDateString()} 신규 회의록`,
      date: new Date().toISOString().split('T')[0],
      author: '시스템 관리자',
      dept: '운영팀',
      status: '작성 중',
      content: initialTemplate
    };
    setMeetings([newDoc, ...meetings]);
    setSelectedMeetingId(id);
  };

  return (
    <div className="flex h-[calc(100vh-120px)] bg-slate-50 -m-6 overflow-hidden font-['Outfit']">
      {/* Left Column: Document List */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 space-y-4">
          <div className="flex justify-between items-center">
             <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 tracking-tighter italic">운영 회의 목록 <span className="text-indigo-600">.</span></h2>
             <button onClick={handleNewMeeting} className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="회의명, 주체 검색..." className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {meetings.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMeetingId(m.id)}
              className={`w-full text-left p-4 rounded-2xl transition-all border ${selectedMeetingId === m.id ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-600/20' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-[9px] font-black uppercase tracking-widest ${selectedMeetingId === m.id ? 'text-indigo-200' : 'text-slate-400'}`}>{m.date}</span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black ${selectedMeetingId === m.id ? 'bg-white/20 text-white' : (m.status === '완료' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')}`}>
                  {m.status}
                </span>
              </div>
              <h4 className={`text-[12px] font-black leading-snug ${selectedMeetingId === m.id ? 'text-white' : 'text-slate-900'}`}>{m.title}</h4>
              <div className={`mt-2 flex items-center justify-between text-[10px] font-bold ${selectedMeetingId === m.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                <span>{m.author}</span>
                <span>{m.dept}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Center Column: Editor */}
      <div className="flex-1 flex flex-col bg-slate-100/50 relative overflow-hidden">
        <div className="h-16 bg-white border-b border-slate-200 px-8 flex justify-between items-center shrink-0 z-10">
           <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-black"><FileText className="w-4 h-4" /></div>
              <h3 className="text-sm font-black text-slate-900">{selectedMeeting?.title}</h3>
           </div>
           <div className="flex gap-2">
              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"><Printer className="w-4 h-4" /> 인쇄</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"><Save className="w-4 h-4" /> 기록 저장</button>
           </div>
        </div>

        <div className="flex-1 p-10 overflow-y-auto custom-scrollbar flex justify-center bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:24px_24px]">
          <div className="w-full max-w-4xl bg-white shadow-2xl rounded-sm p-1">
            <SunEditor
              ref={editorRef}
              setContents={selectedMeeting?.content || initialTemplate}
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
                height: 'calc(100vh - 280px)',
                lang: lang,
                tableCellController: true,
                resizingBar: false,
                placeholder: '회의 내용을 상세히 입력해 주세요...'
              }}
            />
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
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">기안 연월일</label>
                  <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold text-slate-700 flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-indigo-400" /> {selectedMeeting?.date}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">기록자 / 부서</label>
                  <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold text-slate-700 flex items-center gap-3">
                    <User className="w-4 h-4 text-emerald-400" /> {selectedMeeting?.author} ({selectedMeeting?.dept})
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">상태 정보</label>
                  <div className={`w-full border rounded-xl p-3 text-xs font-bold flex items-center gap-3 ${selectedMeeting?.status === '완료' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                    <Clock className="w-4 h-4" /> {selectedMeeting?.status}
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
    </div>
  );
};

export default MeetingsPage;

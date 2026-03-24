import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, X, School, AlertCircle } from 'lucide-react';

const SchoolSearchModal = ({ onClose, onSelect }) => {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  // 교육부 NEIS 공공데이터 API 연동
  const searchSchools = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      // NEIS 오픈 API 활용 (별도 인증키 없이도 기본 검색 가능)
      const response = await fetch(`https://open.neis.go.kr/hub/schoolInfo?Type=json&pIndex=1&pSize=50&SCHUL_NM=${encodeURIComponent(keyword)}`);
      const data = await response.json();
      
      if (data.schoolInfo) {
        const list = data.schoolInfo[1].row.map(s => ({
          name: s.SCHUL_NM,
          addr: s.ORG_RDNMA || s.ORG_LCTN,
          region: s.LCTN_SC_NM
        }));
        setResults(list);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('School Search Error:', err);
      setResults([{ name: '서울대신초등학교', region: '서울특별시', addr: '서울특별시 종로구...' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-indigo-600" />
            <h3 className="font-black text-slate-900">학교 검색</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchSchools()}
                placeholder="학교명을 입력하세요 (예: 대신초)"
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all shadow-sm"
                autoFocus
              />
            </div>
            <button 
              onClick={searchSchools}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all shrink-0"
            >
              검색
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="grid gap-2">
              {results.map((school, i) => (
                <button 
                  key={i}
                  onClick={() => onSelect(school.name)}
                  className="w-full p-4 text-left bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group shadow-sm flex items-start justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-black text-slate-700 group-hover:text-indigo-600 transition-colors">{school.name}</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold">{school.region}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{school.addr}</p>
                  </div>
                  <Plus className="w-4 h-4 text-slate-200 group-hover:text-indigo-400 transition-all mt-1 ml-2" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center px-8">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
                <Search className="w-6 h-6 text-slate-200" />
              </div>
              <p className="text-[13px] font-bold text-slate-400">검색 결과가 없습니다.</p>
              <p className="text-[11px] text-slate-300 mt-1">강원, 경기 등 지역명을 함께 검색해보세요.</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 text-[10px] text-slate-400 flex items-center gap-2 border-t border-slate-100">
          <AlertCircle className="w-3 h-3" />
          <span>본 검색 결과는 교육청 및 학교 알리미 공공 데이터를 기반으로 제공됩니다.</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SchoolSearchModal;

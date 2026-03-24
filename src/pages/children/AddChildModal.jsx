import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';

const AddChildModal = ({ selectedYear, onClose, onAdd }) => {
  const [form, setForm] = useState({ name: '', gender: '남', birth: '', school: '', grade: '', address: '', guardian: '', contact: '', cardId: '', useType: '일반' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const F = ({ label, ch }) => (
    <div>
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{label}</label>
      {ch}
    </div>
  );
  const I = ({ field, type = 'text', placeholder = '' }) => (
    <input type={type} value={form[field]} onChange={e => set(field, e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] font-bold outline-none focus:ring-2 focus:ring-indigo-300" />
  );

  const handleSubmit = () => {
    if (!form.name) { alert('성명은 필수입니다.'); return; }
    onAdd({
      id: Date.now(),
      name: form.name, gender: form.gender, birth: form.birth,
      photo: null, cardId: form.cardId, displayId: '',
      yearlyData: {
        [selectedYear]: {
          school: form.school, grade: form.grade, address: form.address,
          guardian: form.guardian, contact: form.contact, useType: form.useType,
          enrollment: new Date().toISOString().split('T')[0],
        }
      },
      logs: { [selectedYear]: { observation: [], h1: null, h2: null } },
      attendance: {},
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-900">신규 아동 등록 — {selectedYear}년도</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <F label="성명 *"><I field="name" placeholder="홍길동" /></F>
          <F label="성별">
            <select value={form.gender} onChange={e => set('gender', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] font-bold outline-none">
              <option value="남">남</option><option value="여">여</option>
            </select>
          </F>
          <F label="생년월일"><I field="birth" type="date" /></F>
          <F label="카드 ID"><I field="cardId" placeholder="예: AABBCCDD" /></F>
          <F label="학교"><I field="school" placeholder="숲속초등학교" /></F>
          <F label="학년"><I field="grade" placeholder="1" /></F>
          <div className="col-span-2"><F label="주소"><I field="address" placeholder="서울시 ..." /></F></div>
          <F label="보호자"><I field="guardian" placeholder="보호자명" /></F>
          <F label="연락처"><I field="contact" placeholder="010-0000-0000" /></F>
        </div>
        <div className="px-6 pb-6 flex gap-2 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-[12px] font-black hover:bg-slate-200 transition-all">취소</button>
          <button onClick={handleSubmit} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[12px] font-black shadow hover:bg-indigo-700 transition-all">
            <Plus className="w-4 h-4 inline mr-1" />등록
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AddChildModal;

import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Wrench, ShieldCheck, Zap } from 'lucide-react';

const FacilityPage = () => {
  return (
    <div className="font-['Outfit']">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">시설 및 자산 관리</h2>
          <p className="text-slate-500 font-medium italic">안전 점검 내역 및 시설 유지보수 기록을 관리합니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50">
          <h3 className="text-xl font-black mb-6 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            정기 안전 점검 (2026.03)
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="font-bold">소방 안전 점검</span>
              <span className="text-emerald-500 font-black">완료</span>
            </div>
            <div className="flex justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="font-bold">전기 설비 안전 검사</span>
              <span className="text-amber-500 font-black">진행중</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50">
          <h3 className="text-xl font-black mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" />
            주요 시설 현황
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-2xl text-center">
              <p className="text-xs font-black text-blue-400 uppercase">PC/태블릿</p>
              <p className="text-2xl font-black text-blue-600">12대</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-2xl text-center">
              <p className="text-xs font-black text-purple-400 uppercase">공기청정기</p>
              <p className="text-2xl font-black text-purple-600">4대</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacilityPage;

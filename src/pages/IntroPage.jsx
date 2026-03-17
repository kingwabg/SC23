import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Briefcase, MapIcon } from 'lucide-react';

const IntroPage = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="min-h-screen w-full relative overflow-hidden flex items-center bg-slate-900"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1518717202715-9fa9d1c7eb1b?q=80&w=2574&auto=format&fit=crop')", // Beautiful nature landscape
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Background Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/16 via-blue-900/10 to-sky-400/12" />

      {/* Top Left Logo / Text */}
      <div className="absolute top-10 left-12 z-10 flex items-center gap-3">
        <div className="text-white font-black text-2xl tracking-tighter drop-shadow-md flex items-center">
          <span className="text-3xl italic font-serif tracking-widest mr-3 font-medium opacity-90 text-amber-200 drop-shadow-lg">Active</span> 
          <span>2026 서창방문의해</span>
        </div>
      </div>

      {/* Main Interactive Blocks - Right aligned, vertically stacked */}
      <div className="absolute right-[5%] md:right-[10%] top-1/2 -translate-y-1/2 flex flex-col gap-6 w-full max-w-[480px] z-10 px-4 md:px-0">
        
        {/* Block 1: Office Room (Staff Only) */}
        <button 
          onClick={() => navigate('/login')}
          className="group relative overflow-hidden backdrop-blur-[15px] bg-[#23364d]/56 hover:bg-[#2b4665]/66 transition-all duration-300 border border-white/24 rounded-[2rem] p-8 md:p-10 flex items-center justify-between shadow-2xl hover:shadow-sky-400/25 text-left"
        >
          <div className="flex flex-col gap-3 relative z-10">
            <span className="text-sky-200 font-bold text-[11px] tracking-[0.2em] uppercase">Seochang Portal</span>
            <span className="text-white font-black text-3xl md:text-4xl drop-shadow-lg tracking-tight">서창 업무방</span>
            <div className="mt-4 flex items-center text-sky-100/70 group-hover:text-sky-200 transition-colors">
              <span className="text-[12px] mr-2 font-black uppercase tracking-widest">입장하기</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </div>
          </div>
          <div className="relative z-10 bg-sky-200/16 p-5 rounded-full border border-sky-100/28 group-hover:scale-110 group-hover:bg-sky-200/24 transition-all">
            <Briefcase className="w-14 h-14 md:w-16 md:h-16 text-sky-100 drop-shadow-lg" strokeWidth={1.5} />
          </div>
        </button>

        {/* Block 2: Visit Seochang (Public) */}
        <button 
          onClick={() => navigate('/visit')}
          className="group relative overflow-hidden backdrop-blur-[15px] bg-[#6f99c8]/28 hover:bg-[#82addf]/34 transition-all duration-300 border border-white/30 rounded-[2rem] p-8 md:p-10 flex items-center justify-between shadow-2xl hover:shadow-sky-300/28 text-left cursor-pointer"
        >
          <div className="flex flex-col gap-2 relative z-10">
            <span className="text-amber-100 font-bold text-[11px] tracking-[0.2em] uppercase">Visit Seochang</span>
            <span className="text-white font-black text-3xl md:text-4xl drop-shadow-lg leading-[1.15] tracking-tight">
              2026<br/>
              서창방문의해
            </span>
            <div className="mt-4 flex items-center text-sky-50/75 group-hover:text-white transition-colors">
              <span className="text-[12px] mr-2 font-black uppercase tracking-widest">구경하기</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </div>
          </div>
          <div className="relative z-10 bg-white/12 p-5 rounded-full border border-sky-100/28 group-hover:scale-110 group-hover:bg-white/18 transition-all mt-4">
            <MapIcon className="w-14 h-14 md:w-16 md:h-16 text-sky-50 drop-shadow-lg" strokeWidth={1.5} />
          </div>
        </button>

      </div>
      
      {/* Footer text */}
      <div className="absolute bottom-6 left-12 z-10 text-white/40 text-xs font-bold tracking-widest">
        © 2026 SEOCHANG. ALL RIGHTS RESERVED.
      </div>
    </div>
  );
};

export default IntroPage;

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
      <div className="absolute inset-0 bg-black/20" />

      {/* Top Left Logo / Text */}
      <div className="absolute top-10 left-12 z-10 flex items-center gap-3">
        <div className="text-white font-black text-2xl tracking-tighter drop-shadow-md flex items-center">
          <span className="text-3xl italic font-serif tracking-widest mr-3 font-medium opacity-90 text-yellow-400 drop-shadow-lg">Active</span> 
          <span>2026 서창방문의해</span>
        </div>
      </div>

      {/* Main Interactive Blocks - Right aligned, vertically stacked */}
      <div className="absolute right-[5%] md:right-[10%] top-1/2 -translate-y-1/2 flex flex-col gap-6 w-full max-w-[480px] z-10 px-4 md:px-0">
        
        {/* Block 1: Office Room (Staff Only) */}
        <button 
          onClick={() => navigate('/login')}
          className="group relative overflow-hidden backdrop-blur-[15px] bg-[#3a3520]/60 hover:bg-[#4a4220]/70 transition-all duration-300 border border-white/20 rounded-[2rem] p-8 md:p-10 flex items-center justify-between shadow-2xl hover:shadow-yellow-500/30 text-left"
        >
          <div className="flex flex-col gap-3 relative z-10">
            <span className="text-yellow-400/90 font-bold text-[11px] tracking-[0.2em] uppercase">Seochang Portal</span>
            <span className="text-white font-black text-3xl md:text-4xl drop-shadow-lg tracking-tight">서창 업무방</span>
            <div className="mt-4 flex items-center text-yellow-200/50 group-hover:text-yellow-300 transition-colors">
              <span className="text-[12px] mr-2 font-black uppercase tracking-widest">입장하기</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </div>
          </div>
          <div className="relative z-10 bg-yellow-500/20 p-5 rounded-full border border-yellow-400/30 group-hover:scale-110 group-hover:bg-yellow-500/30 transition-all">
            <Briefcase className="w-14 h-14 md:w-16 md:h-16 text-yellow-300 drop-shadow-lg" strokeWidth={1.5} />
          </div>
        </button>

        {/* Block 2: Visit Seochang (Public) */}
        <button 
          onClick={() => navigate('/visit')}
          className="group relative overflow-hidden backdrop-blur-[15px] bg-[#2a3a2a]/60 hover:bg-[#354f35]/70 transition-all duration-300 border border-white/20 rounded-[2rem] p-8 md:p-10 flex items-center justify-between shadow-2xl hover:shadow-emerald-500/30 text-left cursor-pointer"
        >
          <div className="flex flex-col gap-2 relative z-10">
            <span className="text-emerald-400/90 font-bold text-[11px] tracking-[0.2em] uppercase">Visit Seochang</span>
            <span className="text-white font-black text-3xl md:text-4xl drop-shadow-lg leading-[1.15] tracking-tight">
              2026<br/>
              서창방문의해
            </span>
            <div className="mt-4 flex items-center text-emerald-200/50 group-hover:text-emerald-300 transition-colors">
              <span className="text-[12px] mr-2 font-black uppercase tracking-widest">구경하기</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </div>
          </div>
          <div className="relative z-10 bg-emerald-500/20 p-5 rounded-full border border-emerald-400/30 group-hover:scale-110 group-hover:bg-emerald-500/30 transition-all mt-4">
            <MapIcon className="w-14 h-14 md:w-16 md:h-16 text-emerald-300 drop-shadow-lg" strokeWidth={1.5} />
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

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Briefcase, MapIcon, Sparkles } from 'lucide-react';

const IntroPage = () => {
  const navigate = useNavigate();

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden bg-slate-950"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1518717202715-9fa9d1c7eb1b?q=80&w=2574&auto=format&fit=crop')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
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

            <button
              onClick={() => navigate('/visit')}
              className="group relative overflow-hidden rounded-[2rem] border border-white/16 bg-[linear-gradient(135deg,rgba(96,165,250,0.28),rgba(59,130,246,0.18),rgba(245,158,11,0.16))] p-6 text-left shadow-[0_28px_70px_rgba(2,6,23,0.28)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-[0_32px_80px_rgba(14,165,233,0.22)] md:p-8"
            >
              <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-amber-200/10 blur-2xl transition group-hover:bg-amber-200/18" />
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-100">Public Experience</p>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-white md:text-3xl">홍보 사이트 보기</h2>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-white/72">
                    기관 외부용 소개와 방문형 콘텐츠를 별도 경험으로 분리해 두고, 같은 브랜드 감도로 연결합니다.
                  </p>
                </div>
                <div className="rounded-[1.6rem] border border-white/16 bg-white/10 p-4 transition group-hover:scale-105 group-hover:bg-white/14">
                  <MapIcon className="h-8 w-8 text-amber-100 md:h-10 md:w-10" strokeWidth={1.6} />
                </div>
              </div>
              <div className="relative z-10 mt-8 flex items-center text-sm font-black uppercase tracking-[0.2em] text-white/82">
                둘러보기
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-2" />
              </div>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-[11px] font-bold uppercase tracking-[0.24em] text-white/45 md:flex-row md:items-center md:justify-between">
          <span>Mobile-first shell ready</span>
          <span>© 2026 SEOCHANG. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
};

export default IntroPage;

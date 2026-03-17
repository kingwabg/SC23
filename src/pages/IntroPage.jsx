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
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.28)_0%,rgba(2,6,23,0.56)_24%,rgba(2,6,23,0.82)_62%,rgba(2,6,23,0.94)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.28),transparent_35%)]" />

      <div className="relative z-10 flex min-h-screen flex-col px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] md:px-12 md:pb-10">
        <div className="flex items-center justify-between">
          <div className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-white/84 backdrop-blur-md">
            Forest Workspace
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-bold text-white/70 backdrop-blur-md md:flex">
            <Sparkles className="h-4 w-4 text-amber-300" />
            One Experience for Web & App
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between gap-8 py-8 md:py-12">
          <div className="max-w-3xl">
            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.35em] text-blue-200 md:text-xs">
              Active 2026 Seochang
            </p>
            <h1 className="max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-white md:text-6xl lg:text-7xl">
              모바일과 웹이
              <br />
              하나처럼 이어지는
              <br />
              <span className="bg-gradient-to-r from-blue-200 via-white to-amber-200 bg-clip-text text-transparent">
                아이숲 워크스페이스
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm font-medium leading-6 text-white/72 md:mt-7 md:text-lg md:leading-8">
              기관 운영, 일정, 기록, 권한 관리를 앱처럼 빠르게 연결한 첫 진입 화면입니다.
              지금은 웹 기반으로 동작하지만, 모바일 앱 셸과 같은 흐름으로 확장할 수 있게 맞춰 두었습니다.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            <button
              onClick={() => navigate('/login')}
              className="group relative overflow-hidden rounded-[2rem] border border-white/16 bg-[linear-gradient(135deg,rgba(15,23,42,0.74),rgba(30,41,59,0.68),rgba(37,99,235,0.42))] p-6 text-left shadow-[0_28px_70px_rgba(2,6,23,0.38)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-[0_32px_80px_rgba(37,99,235,0.24)] md:p-8"
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/8 blur-2xl transition group-hover:bg-blue-200/14" />
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-200">Internal Groupware</p>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-white md:text-3xl">업무방 입장</h2>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-white/68">
                    관리자 로그인, 권한 관리, 운영 기록, 출결과 일정까지 하나의 워크스페이스에서 이어집니다.
                  </p>
                </div>
                <div className="rounded-[1.6rem] border border-white/16 bg-white/10 p-4 transition group-hover:scale-105 group-hover:bg-white/14">
                  <Briefcase className="h-8 w-8 text-blue-100 md:h-10 md:w-10" strokeWidth={1.6} />
                </div>
              </div>
              <div className="relative z-10 mt-8 flex items-center text-sm font-black uppercase tracking-[0.2em] text-white/82">
                시작하기
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-2" />
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

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, 
  Menu, 
  Utensils, 
  BedDouble, 
  Bus, 
  BookOpen, 
  MailPlus, 
  ChevronLeft, 
  ChevronRight,
  ArrowRight,
  MapPin,
  Calendar,
  ChevronDown
} from 'lucide-react';

const VisitPage = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeMonth, setActiveMonth] = useState(3);
  const scrollRef = useRef(null);

  useEffect(() => {
    const handleScroll = (e) => {
      setIsScrolled(e.target.scrollTop > 50);
    };
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const quickMenus = [
    { icon: Utensils, label: '서창맛집' },
    { icon: BedDouble, label: '숙박안내' },
    { icon: Bus, label: '교통정보' },
    { icon: BookOpen, label: '가이드북' },
    { icon: MailPlus, label: '홍보물신청' }
  ];

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div 
      ref={scrollRef} 
      className="h-screen w-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory bg-slate-50 font-sans relative custom-scrollbar"
      style={{ scrollBehavior: 'smooth' }}
    >
      
      {/* Header (Sticky) */}
      <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-emerald-900/90 backdrop-blur-md py-4 shadow-lg' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-6 lg:px-12 flex justify-between items-center">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xl italic ${isScrolled ? 'bg-yellow-400 text-emerald-950' : 'bg-emerald-500 text-white'}`}>
              S
            </div>
            <div className="text-white font-black text-xl tracking-tight flex items-baseline gap-2">
              <span>SEO<span className="text-yellow-400">CHANG</span></span>
              <span className="text-sm font-medium opacity-80 hidden md:block">문화관광체육</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button className="text-white hover:text-yellow-400 transition-colors">
              <Search className="w-6 h-6" />
            </button>
            <button className="text-white hover:text-yellow-400 transition-colors">
              <Menu className="w-7 h-7" />
            </button>
          </div>
        </div>
      </header>

      {/* 1. Hero Section */}
      <section className="snap-start shrink-0 relative h-screen w-full overflow-hidden bg-emerald-950">
        <div 
          className="absolute inset-0 bg-cover bg-center transform scale-105 animate-[kenburns_20s_ease-out_infinite_alternate]"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1542408375-39db9ea146eb?q=80&w=2574&auto=format&fit=crop')", // Beautiful korean landscape or nature
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/80 via-emerald-900/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 py-20 to-transparent" />
        
        <div className="relative z-10 container mx-auto px-6 lg:px-12 h-full flex flex-col justify-center pt-20">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <h2 className="text-yellow-400 font-bold tracking-widest text-sm md:text-base lg:text-lg mb-4 uppercase inline-block border-b-2 border-yellow-400 pb-1">
              자연과 문화가 숨쉬는 곳
            </h2>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[1.1] mb-6 drop-shadow-lg tracking-tight">
              서창의<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500 drop-shadow-sm">랜드마크,</span><br/>
              천성산
            </h1>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed max-w-2xl font-medium drop-shadow-md border-l-4 border-yellow-400 pl-4">
              맑은 공기와 수려한 경관을 자랑하는 서창의 대표 명소입니다. 탁 트인 시야를 통해 도심 전경을 조망할 수 있으며, 특히 야경이 아름다워 야간 관광명소로 많은 사랑을 받고 있습니다.
            </p>
          </motion.div>

          <div className="absolute bottom-12 left-6 lg:left-12 flex items-center gap-6">
            <div className="flex items-center gap-4 text-white font-bold tracking-widest text-sm">
              <span className="text-2xl text-yellow-400">01</span>
              <span className="w-10 h-[2px] bg-white/30 relative">
                <span className="absolute top-0 left-0 h-full w-1/3 bg-yellow-400"></span>
              </span>
              <span className="opacity-50">03</span>
            </div>
            <div className="flex gap-2 text-white/50 text-xs font-bold uppercase tracking-widest ml-4">
              <span className="text-yellow-400">스크롤하여 이동</span> <ChevronDown className="w-4 h-4 animate-bounce text-yellow-400" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Quick Menu + Festival Section */}
      <section className="snap-start shrink-0 min-h-screen w-full flex flex-col relative bg-white overflow-hidden">
        {/* Quick Menu Bar */}
        <div className="bg-emerald-700 w-full relative z-20 shadow-xl border-t border-emerald-600 flex-shrink-0">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="container mx-auto px-4"
          >
            <div className="flex flex-col md:flex-row items-center">
              <div className="bg-emerald-800 text-yellow-400 font-extrabold italic text-xl md:text-2xl px-8 py-5 md:py-6 tracking-wider w-full md:w-auto text-center md:text-left flex items-center justify-center md:justify-start">
                Quick Menu <ArrowRight className="w-5 h-5 ml-2 hidden md:block" />
              </div>
              
              <div className="flex-1 overflow-x-auto w-full">
                <div className="flex items-center justify-between min-w-max px-4 md:px-8 py-4 md:py-0">
                   {quickMenus.map((menu, idx) => (
                     <button key={idx} className="group flex items-center gap-3 px-3 lg:px-6 py-4 transition-all hover:-translate-y-1">
                       <div className="w-10 h-10 rounded-full border-2 border-emerald-400/50 flex items-center justify-center text-yellow-100 group-hover:bg-yellow-400 group-hover:border-yellow-400 group-hover:text-emerald-900 transition-all shadow-lg group-hover:shadow-yellow-400/50">
                         <menu.icon className="w-5 h-5" />
                       </div>
                       <span className="text-white font-bold tracking-widest whitespace-nowrap text-sm group-hover:text-yellow-300 transition-colors">{menu.label}</span>
                     </button>
                   ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Festival Content */}
        <div className="flex-1 flex flex-col justify-center py-12 relative overflow-y-auto">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '40px 40px' }} />

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="container mx-auto px-6 lg:px-12 relative z-10 my-auto"
          >
            <div className="text-center mb-8 lg:mb-12">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-emerald-950 tracking-tight">
                서창, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-yellow-500">즐길 준비</span> 완료!
              </h2>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-6 lg:mb-8 pb-3 border-b-2 border-slate-100">
                <div className="flex items-center gap-4 lg:gap-6">
                  <button className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-300 transition-all hover:bg-emerald-50 shadow-sm">
                    <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
                  </button>
                  <div className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tighter">
                    2026
                  </div>
                  <button className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-300 transition-all hover:bg-emerald-50 shadow-sm">
                    <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6" />
                  </button>
                </div>
                <button className="text-sm font-bold text-slate-500 flex items-center gap-1 hover:text-emerald-600 transition-colors">
                  일정 더보기 <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Months Grid */}
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 lg:gap-3 mb-8 lg:mb-12">
                {months.map(month => (
                  <button 
                    key={month}
                    onClick={() => setActiveMonth(month)}
                    className={`flex flex-col items-center justify-center py-2 lg:py-4 rounded-xl lg:rounded-2xl border-2 transition-all ${
                      activeMonth === month 
                        ? 'border-yellow-400 bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 transform scale-110 z-10' 
                        : 'border-slate-100 bg-white text-slate-500 hover:border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    <span className={`text-[9px] lg:text-[10px] font-black uppercase tracking-widest mb-1 ${activeMonth === month ? 'text-emerald-200' : 'text-slate-400'}`}>
                      {new Date(2026, month - 1, 1).toLocaleString('en-US', { month: 'short' }) }
                    </span>
                    <span className={`text-lg lg:text-xl font-bold ${activeMonth === month ? 'text-white' : 'text-slate-800'}`}>
                      {month}월
                    </span>
                  </button>
                ))}
              </div>

              {/* Event Card */}
              <div className="max-w-xl mx-auto relative group cursor-pointer">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-yellow-400 rounded-[2.5rem] blur opacity-25 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 rounded-[2rem] lg:rounded-[2.5rem] p-8 lg:p-10 overflow-hidden shadow-2xl">
                  {/* Decoration blob */}
                  <div className="absolute -top-20 -right-20 w-48 h-48 lg:w-64 lg:h-64 bg-yellow-400/20 rounded-full blur-[50px] pointer-events-none"></div>
                  
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <span className="px-4 py-1.5 bg-yellow-400 text-emerald-950 rounded-full text-xs font-black tracking-widest uppercase mb-6 lg:mb-8 shadow-sm">
                      축제중
                    </span>
                    
                    <h3 className="text-2xl lg:text-3xl font-black text-white mb-6 lg:mb-8 tracking-tight leading-snug">
                      2026 서창 <br/>
                      <span className="text-yellow-400">온(ON)골목</span> 페스티벌
                    </h3>
                    
                    <div className="w-full bg-white/10 rounded-xl lg:rounded-2xl p-5 lg:p-6 backdrop-blur-sm border border-white/10 space-y-4 text-left">
                      <div className="flex items-start gap-4">
                        <Calendar className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="block text-xs font-bold text-emerald-200 mb-1">기간</span>
                          <span className="text-white font-medium text-sm md:text-base">2026.03.14.(토) ~ 2026.03.15.(일)</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <MapPin className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="block text-xs font-bold text-emerald-200 mb-1">장소</span>
                          <span className="text-white font-medium text-sm md:text-base leading-relaxed">경남 양산시 서창동 일대<br/>(서창 골목 상권 특화거리)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. Course + Footer Section */}
      <section className="snap-start shrink-0 min-h-screen w-full flex flex-col relative bg-slate-50 border-t border-slate-200">
        <div className="flex-1 flex flex-col justify-center py-12">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="container mx-auto px-6 lg:px-12 my-auto"
          >
            <div className="text-center mb-10 lg:mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-emerald-950 tracking-tight">
                서창, <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-600 border-b-4 border-yellow-400 pb-1">코스별</span> 여행 추천!
              </h2>
              <p className="mt-4 lg:mt-6 text-base lg:text-lg text-slate-500 font-medium">
                누구와 함께하든, 즐거운 추억을 만들어 드립니다.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto px-4 lg:px-0">
              {/* Course Card 1 */}
              <div className="group cursor-pointer rounded-[1.5rem] lg:rounded-[2rem] overflow-hidden bg-white shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-all duration-300">
                <div className="h-48 lg:h-60 overflow-hidden relative">
                  <div className="absolute inset-0 bg-emerald-900/20 group-hover:bg-transparent transition-colors z-10" />
                  <img src="https://images.unsplash.com/photo-1546874177-9e664107314e?q=80&w=2669&auto=format&fit=crop" alt="Family" className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-4 left-4 z-20">
                    <span className="bg-yellow-400 text-emerald-900 px-3 py-1.5 rounded-xl text-xs font-black tracking-widest shadow-lg">가족여행</span>
                  </div>
                </div>
                <div className="p-6 lg:p-8">
                  <h3 className="text-xl lg:text-2xl font-black text-slate-800 mb-2 lg:mb-3 group-hover:text-emerald-600 transition-colors">아이와 함께 걷는 힐링 길</h3>
                  <p className="text-slate-500 text-sm lg:text-base font-medium leading-relaxed max-w-sm mb-4 lg:mb-6">천성산 산책로에서 시작해 생태공원까지 이어지는 자연 친화 코스입니다.</p>
                  <div className="flex items-center text-emerald-600 font-bold text-xs lg:text-sm">
                    코스 상세보기 <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Course Card 2 */}
              <div className="group cursor-pointer rounded-[1.5rem] lg:rounded-[2rem] overflow-hidden bg-white shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-all duration-300">
                <div className="h-48 lg:h-60 overflow-hidden relative">
                  <div className="absolute inset-0 bg-emerald-900/20 group-hover:bg-transparent transition-colors z-10" />
                  <img src="https://images.unsplash.com/photo-1512468449733-470ee64d8434?q=80&w=2670&auto=format&fit=crop" alt="Couple" className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-4 left-4 z-20">
                    <span className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-xs font-black tracking-widest shadow-lg">데이트</span>
                  </div>
                </div>
                <div className="p-6 lg:p-8">
                  <h3 className="text-xl lg:text-2xl font-black text-slate-800 mb-2 lg:mb-3 group-hover:text-emerald-600 transition-colors">로맨틱 야간 스팟 탐방</h3>
                  <p className="text-slate-500 text-sm lg:text-base font-medium leading-relaxed max-w-sm mb-4 lg:mb-6">서창의 밤은 낮보다 아름답습니다. 달빛이 내리는 명소들을 소개합니다.</p>
                  <div className="flex items-center text-emerald-600 font-bold text-xs lg:text-sm">
                    코스 상세보기 <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Course Card 3 */}
              <div className="group hidden md:flex cursor-pointer rounded-[1.5rem] lg:rounded-[2rem] overflow-hidden bg-emerald-900 text-white shadow-xl border border-emerald-800 hover:-translate-y-2 transition-all duration-300 flex-col justify-center items-center text-center p-8 lg:p-10 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-transparent" />
                <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-white/10 flex items-center justify-center mb-4 lg:mb-6 text-yellow-400 border border-white/20 z-10">
                  <Search className="w-6 h-6 lg:w-8 lg:h-8" />
                </div>
                <h3 className="text-xl lg:text-2xl font-black mb-2 lg:mb-3 z-10">나만의 맞춤 코스</h3>
                <p className="text-emerald-200/80 text-sm lg:text-base font-medium leading-relaxed mb-6 lg:mb-8 z-10">취향과 시간에 딱 맞는<br/>특별한 서창 여행 코스를<br/>찾아보세요.</p>
                <button className="bg-yellow-400 z-10 text-emerald-950 px-6 lg:px-8 py-2.5 lg:py-3 rounded-full font-black text-sm hover:bg-white transition-colors duration-300 shadow-lg shadow-yellow-400/20">
                  찾기 시작
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="bg-emerald-950 py-10 lg:py-12 text-center border-t border-emerald-900 shadow-[inset_0_10px_30px_rgba(0,0,0,0.5)] shrink-0">
           <div className="text-emerald-500 font-black text-xl lg:text-2xl tracking-tighter mb-3 lg:mb-4 italic">Active <span className="text-emerald-400">SEO</span><span className="text-yellow-400">CHANG</span></div>
           <p className="text-emerald-600/50 text-xs lg:text-sm font-medium tracking-widest uppercase">
             © 2026 SEOCHANG TOURISM. ALL RIGHTS RESERVED.
           </p>
        </footer>
      </section>

    </div>
  );
};

export default VisitPage;

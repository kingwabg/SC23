import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogIn, ArrowRight, ShieldCheck, Heart, AlertCircle } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ id: '', password: '' });
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // 관리자 계정 설정
    if (formData.id === 'admin' && formData.password === 'admin777') {
      localStorage.setItem('userRole', 'ADMIN');
      localStorage.removeItem('currentUser'); // Clear any individual simulation
      navigate('/dashboard');
    } else {
      setError('아이디 또는 비밀번호가 일치하지 않습니다.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white text-slate-800">
      {/* Left Side: Promotional Section (Bright & Cheerful) */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="flex-1 relative overflow-hidden flex flex-col justify-center px-12 py-20 bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-400"
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <circle cx="20" cy="20" r="30" fill="white" />
            <circle cx="80" cy="80" r="40" fill="white" />
          </svg>
        </div>

        <div className="relative z-10 max-w-lg">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 mb-8"
          >
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-xl border border-white/40">
              <Heart className="w-8 h-8 text-white fill-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">아이숲 센터</h1>
          </motion.div>

          <h2 className="text-5xl font-extrabold mb-6 leading-tight text-white">
            아이들의 꿈이 <br />
            <span className="text-yellow-200">밝게 빛나는 공간</span>
          </h2>
          <p className="text-xl text-white/90 mb-10 leading-relaxed font-medium">
            지역아동센터의 모든 활동과 기록을 스마트하게 관리하세요. <br />
            따뜻한 마음과 효율적인 시스템이 만나는 곳.
          </p>

          <motion.button
            onClick={() => navigate('/visit')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-3 px-8 py-4 bg-white text-indigo-600 rounded-full font-bold text-lg shadow-2xl hover:bg-slate-50 transition-colors"
          >
            홍보 사이트 바로가기
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </div>

        <div className="absolute bottom-10 left-12 flex gap-8">
          <div className="text-center text-white">
            <p className="text-3xl font-bold">10+</p>
            <p className="text-white/80 text-sm font-medium">함께하는 아이들</p>
          </div>
          <div className="text-center text-white">
            <p className="text-3xl font-bold">100%</p>
            <p className="text-white/80 text-sm font-medium">운영일지 자동화</p>
          </div>
        </div>
      </motion.div>

      {/* Right Side: Login Section (Light Theme) */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="flex-1 flex flex-col justify-center px-8 md:px-24 py-20 bg-slate-50"
      >
        <div className="max-w-md w-full mx-auto">
          <div className="mb-12">
            <h3 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">좋은 하루입니다! ✨</h3>
            <p className="text-slate-500 font-medium">관리 시스템 접속을 위해 인증해주세요.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">내부 서버 ID</label>
              <input 
                type="text" 
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
                placeholder="admin"
                className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">비밀번호</label>
              <input 
                type="password" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="••••••••"
                className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-rose-500 text-sm font-bold bg-rose-50 p-4 rounded-xl border border-rose-100"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            <div className="flex items-center justify-between py-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-slate-500 font-medium group-hover:text-slate-700 transition-colors">로그인 유지</span>
              </label>
              <a href="#" className="text-sm font-bold text-blue-600 hover:text-blue-700 underline-offset-4 hover:underline">비밀번호 찾기</a>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-xl shadow-blue-200"
            >
              <LogIn className="w-5 h-5" />
              로그인하기
            </motion.button>
          </form>

          <div className="mt-12 p-6 rounded-3xl bg-blue-50 border border-blue-100 flex items-start gap-4">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              <ShieldCheck className="w-6 h-6 text-blue-500 flex-shrink-0" />
            </div>
            <div>
              <p className="text-sm font-bold text-blue-900">알림</p>
              <p className="text-xs text-blue-700 mt-1 leading-relaxed font-medium">
                서버 테스트용 계정: <span className="font-bold underline">admin</span> / <span className="font-bold underline">admin777</span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;

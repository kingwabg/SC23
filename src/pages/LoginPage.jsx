import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogIn, ArrowLeft, ShieldCheck, Heart, AlertCircle, Sparkles } from 'lucide-react';
import axios from 'axios';
import { setAuthSession } from '../utils/auth';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ id: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError('');
    setIsLoading(true);

    try {
      const baseURL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5050';
      const { data } = await axios.post(`${baseURL}/api/auth/login`, {
        id: formData.id,
        password: formData.password,
      });

      setAuthSession(data.tokens, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError('아이디 또는 비밀번호가 일치하지 않습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e0f2fe_0%,#eff6ff_32%,#f8fafc_100%)] text-slate-800">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] md:grid md:grid-cols-[1.08fr_0.92fr] md:gap-6 md:px-6 md:py-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative mb-5 overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#0f172a_0%,#172554_38%,#2563eb_100%)] px-5 pb-7 pt-5 shadow-[0_30px_70px_rgba(37,99,235,0.18)] md:mb-0 md:flex md:min-h-[calc(100vh-3rem)] md:flex-col md:justify-between md:rounded-[2.5rem] md:px-10 md:pb-10 md:pt-8"
        >
          <div className="absolute -left-16 top-16 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -right-10 bottom-0 h-52 w-52 rounded-full bg-amber-200/16 blur-3xl" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/14 bg-white/10 p-2.5 backdrop-blur-md">
                <Heart className="h-5 w-5 fill-blue-100 text-blue-100" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.32em] text-blue-200">Forest Groupware</p>
                <h1 className="text-base font-black tracking-tight text-white md:text-lg">아이숲 모바일 워크스페이스</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/8 text-white/84 transition hover:bg-white/12"
              aria-label="뒤로 가기"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="relative z-10 mt-8 md:mt-0">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-blue-100">
              <Sparkles className="h-3.5 w-3.5 text-amber-200" />
              Secure Sign-In Layer
            </div>
            <h2 className="max-w-xl text-3xl font-black leading-[1.04] tracking-tight text-white md:text-5xl">
              앱처럼 빠르게,
              <br />
              내부 운영은 더 단단하게.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/74 md:mt-6 md:text-base md:leading-7">
              출결, 일정, 회의록, 권한 설정까지 한 곳에서 다루는 그룹웨어 로그인 화면입니다.
              모바일에서도 첫 진입이 자연스럽도록 온보딩 카드 구조로 정리했습니다.
            </p>
          </div>

          <div className="relative z-10 mt-8 grid grid-cols-2 gap-3 md:max-w-md">
            <div className="rounded-[1.4rem] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-md">
              <p className="text-2xl font-black text-white md:text-3xl">JWT</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-200">Token Auth</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-md">
              <p className="text-2xl font-black text-white md:text-3xl">Role</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-200">Permission Ready</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08 }}
          className="flex flex-1 flex-col justify-center"
        >
          <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/88 p-5 shadow-[0_30px_70px_rgba(148,163,184,0.16)] backdrop-blur-xl md:rounded-[2.5rem] md:p-8">
            <div className="mb-8 flex items-start gap-4">
              <div className="rounded-[1.2rem] bg-blue-50 p-3 text-blue-600 shadow-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-500">Admin Access</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">인증 후 업무방 입장</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  서버 인증과 권한 정책을 통과한 계정만 내부 워크스페이스에 접근합니다.
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="ml-1 text-sm font-bold text-slate-700">내부 서버 ID</label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="admin"
                  className="w-full rounded-[1.4rem] border-2 border-slate-200 bg-slate-50 px-5 py-4 text-base font-bold outline-none transition-all placeholder:text-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="space-y-2">
                <label className="ml-1 text-sm font-bold text-slate-700">비밀번호</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full rounded-[1.4rem] border-2 border-slate-200 bg-slate-50 px-5 py-4 text-base font-bold outline-none transition-all placeholder:text-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-[1.2rem] border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-500"
                >
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </motion.div>
              )}

              <div className="flex items-center justify-between gap-3 py-1">
                <label className="group flex items-center gap-2 text-sm text-slate-500">
                  <input type="checkbox" className="h-5 w-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="font-medium transition-colors group-hover:text-slate-700">로그인 유지</span>
                </label>
                <button
                  type="button"
                  className="text-sm font-bold text-blue-600 transition-colors hover:text-blue-700"
                >
                  비밀번호 찾기
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-[linear-gradient(135deg,#2563eb_0%,#4f46e5_100%)] py-4 text-base font-black text-white shadow-[0_20px_40px_rgba(37,99,235,0.28)] transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogIn className="h-5 w-5" />
                {isLoading ? '인증 중...' : '로그인하기'}
              </motion.button>
            </form>

            <div className="mt-6 rounded-[1.5rem] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#f8fbff_100%)] p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-white p-2 shadow-sm">
                  <ShieldCheck className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-900">안내</p>
                  <p className="mt-1 text-xs leading-5 text-blue-700">
                    로그인 계정은 서버 인증 정책과 사용자 권한 설정을 따릅니다. 관리자 화면에서 계정 생성과 비밀번호 변경이 가능합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;

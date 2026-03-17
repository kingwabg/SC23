import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Menu, Bell, Download, X, Smartphone, WifiOff, RefreshCw } from 'lucide-react';

const Layout = ({ children }) => {
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('sidebarPinned');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallVisible, setIsInstallVisible] = useState(false);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [swUpdate, setSwUpdate] = useState(null);

  useEffect(() => {
    localStorage.setItem('sidebarPinned', JSON.stringify(isPinned));
  }, [isPinned]);

  useEffect(() => {
    const dismissed = localStorage.getItem('pwaInstallDismissed') === 'true';

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      if (!dismissed) {
        setIsInstallVisible(true);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallVisible(false);
      localStorage.setItem('pwaInstallDismissed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleSwUpdate = (event) => {
      setSwUpdate(event.detail);
    };

    window.addEventListener('sw-update-available', handleSwUpdate);

    return () => {
      window.removeEventListener('sw-update-available', handleSwUpdate);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome !== 'accepted') {
      setIsInstallVisible(true);
    } else {
      setIsInstallVisible(false);
      localStorage.setItem('pwaInstallDismissed', 'true');
    }

    setDeferredPrompt(null);
  };

  const handleDismissInstall = () => {
    setIsInstallVisible(false);
    localStorage.setItem('pwaInstallDismissed', 'true');
  };

  const handleApplyUpdate = () => {
    if (!swUpdate?.worker) return;
    swUpdate.worker.postMessage({ type: 'SKIP_WAITING' });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_22%,#f8fafc_58%,#f8fafc_100%)]">
      <Sidebar
        isPinned={isPinned}
        setIsPinned={setIsPinned}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="md:hidden sticky top-0 z-40 border-b border-white/70 bg-white/88 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 backdrop-blur-xl shadow-[0_18px_40px_rgba(148,163,184,0.12)]">
        <div className="flex items-center justify-between rounded-[1.4rem] border border-slate-200/80 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 px-4 py-3 text-white shadow-[0_18px_40px_rgba(15,23,42,0.25)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 transition hover:bg-white/15"
              aria-label="메뉴 열기"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-200">Forest Groupware</p>
              <h1 className="text-sm font-black tracking-tight">아이숲 모바일 워크스페이스</h1>
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
            <Bell className="h-4.5 w-4.5 text-blue-100" />
          </div>
        </div>
      </div>
      {isOffline && (
        <div
          className={`sticky z-30 mx-4 mt-4 md:mr-6 ${
            isPinned ? 'md:ml-[16.5rem]' : 'md:ml-[6.5rem]'
          } ${isInstallVisible && deferredPrompt ? 'top-[calc(var(--app-shell-top)+11.75rem)] md:top-32' : 'top-[calc(var(--app-shell-top)+5.5rem)] md:top-6'}`}
        >
          <div className="mx-auto max-w-4xl rounded-[1.5rem] border border-amber-200 bg-[linear-gradient(135deg,#fff7ed,#fef3c7)] p-4 shadow-[0_18px_40px_rgba(245,158,11,0.14)]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-200">
                <WifiOff className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600">Offline Mode</p>
                <h2 className="mt-1 text-sm font-black tracking-tight text-slate-900 md:text-base">네트워크가 끊겨 일부 기능만 사용할 수 있습니다.</h2>
                <p className="mt-1 text-xs font-medium text-slate-500 md:text-sm">
                  저장된 화면은 볼 수 있지만 로그인, 서버 저장, 동기화 작업은 연결 복구 후 다시 시도해 주세요.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {isInstallVisible && deferredPrompt && (
        <div
          className={`sticky top-[calc(var(--app-shell-top)+5.5rem)] z-30 mx-4 mt-4 md:top-6 md:mr-6 ${
            isPinned ? 'md:ml-[16.5rem]' : 'md:ml-[6.5rem]'
          }`}
        >
          <div className="mx-auto max-w-4xl overflow-hidden rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(135deg,#0f172a,#1e3a8a_65%,#0ea5e9)] p-4 text-white shadow-[0_24px_60px_rgba(15,23,42,0.28)] md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
                  <Smartphone className="h-5 w-5 text-cyan-100" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-100">Install App</p>
                  <h2 className="mt-1 text-lg font-black tracking-tight">아이숲 그룹웨어를 홈 화면에 추가</h2>
                  <p className="mt-1 text-sm font-medium text-white/75">
                    앱처럼 빠르게 실행하고 하단 탭 구조 그대로 사용할 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 self-end md:self-auto">
                <button
                  type="button"
                  onClick={handleDismissInstall}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white/80 transition hover:bg-white/15"
                >
                  <X className="mr-2 h-4 w-4" />
                  나중에
                </button>
                <button
                  type="button"
                  onClick={handleInstall}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-900 transition hover:bg-cyan-50"
                >
                  <Download className="mr-2 h-4 w-4" />
                  설치하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {swUpdate && (
        <div className="fixed bottom-24 right-4 z-40 w-[min(92vw,24rem)] md:bottom-6 md:right-6">
          <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                <RefreshCw className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">Update Ready</p>
                <h2 className="mt-1 text-sm font-black tracking-tight text-slate-900 md:text-base">새 버전이 준비되었습니다.</h2>
                <p className="mt-1 text-xs font-medium text-slate-500 md:text-sm">
                  지금 적용하면 최신 화면과 기능으로 새로고침됩니다.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSwUpdate(null)}
                    className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-500 transition hover:bg-slate-50"
                  >
                    나중에
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyUpdate}
                    className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-indigo-700"
                  >
                    지금 업데이트
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <main
        className={`transition-all duration-300 ${isPinned ? 'md:ml-60' : 'md:ml-20'} px-4 pb-28 pt-4 md:p-6 md:pb-6 overflow-y-auto`}
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;

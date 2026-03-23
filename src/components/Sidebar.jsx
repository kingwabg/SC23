import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserSquare2,
  ClipboardList,
  BarChart3,
  Building2,
  Globe,
  UserCircle,
  CalendarDays,
  Heart,
  LogOut,
  Pin,
  PinOff,
  X,
} from 'lucide-react';
import { logoutSession } from '../utils/auth';

const Sidebar = ({
  isPinned,
  setIsPinned,
  isMobileMenuOpen,
  onMobileMenuClose,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = React.useState(false);
  const isExpanded = isPinned || isHovered;
  const [userRole] = React.useState(localStorage.getItem('userRole') || 'ADMIN');
  const [currentUser] = React.useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const permissions = React.useMemo(() => {
    if (currentUser && userRole === 'NON_STAFF') {
      return { NON_STAFF: currentUser.permissions };
    }
    const saved = localStorage.getItem('appPermissions');
    return saved
      ? JSON.parse(saved)
      : {
          NON_STAFF: {
            dashboard: true,
            children: true,
            calendar: true,
            staff: false,
            programs: false,
            meetings: false,
            stats: false,
            facility: false,
            public: false,
          },
        };
  }, [currentUser, userRole]);

  const handleLogout = async () => {
    await logoutSession();
    onMobileMenuClose?.();
    navigate('/login');
  };

  const menuItems = [
    { key: 'dashboard', name: '대시보드', icon: LayoutDashboard, path: '/dashboard' },
    { key: 'children', name: '아동 관리', icon: Users, path: '/children' },
    { key: 'staff', name: '종사자 관리', icon: UserSquare2, path: '/staff' },
    { key: 'calendar', name: '캘린더', icon: CalendarDays, path: '/calendar' },
    { key: 'programs', name: '프로그램', icon: ClipboardList, path: '/programs' },
    { key: 'meetings', name: '회의록', icon: Building2, path: '/meetings' },
    { key: 'stats', name: '통계', icon: BarChart3, path: '/stats' },
    { key: 'facility', name: '시설', icon: Globe, path: '/facility' },
    { key: 'public', name: '홍보', icon: Globe, path: '/public-admin' },
  ].filter((item) => {
    if (userRole === 'ADMIN') return true;
    return permissions.NON_STAFF[item.key] !== false;
  });

  const primaryMobileItems = menuItems.slice(0, 4);

  const userName = userRole === 'ADMIN' ? '시스템 관리자' : currentUser?.name || '종사자 계정';
  const userBadge = userRole === 'ADMIN' ? 'ADMIN' : currentUser?.role || 'STAFF';

  const renderMenuLink = (item, expanded = true, mobile = false) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        key={`${mobile ? 'mobile' : 'desktop'}-${item.path}`}
        to={item.path}
        onClick={() => mobile && onMobileMenuClose?.()}
        className={`flex items-center rounded-xl text-sm font-bold transition-all ${
          isActive
            ? 'bg-blue-50 text-blue-600 shadow-sm'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        } ${expanded ? 'gap-2.5 justify-start px-3 py-2.5' : 'justify-center px-0 py-2.5'}`}
        title={!expanded ? item.name : undefined}
      >
        <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
        <span
          className={`whitespace-nowrap transition-all duration-300 ${
            expanded ? 'w-full opacity-100' : 'w-0 overflow-hidden opacity-0'
          }`}
        >
          {item.name}
        </span>
      </Link>
    );
  };

  return (
    <>
      <div
        className={`fixed left-0 top-0 z-50 hidden min-h-screen border-r border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 ease-in-out md:flex ${
          isExpanded ? 'w-60' : 'w-20'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex w-full flex-col">
          <div className={`relative mb-8 flex items-center gap-2.5 px-2 ${isExpanded ? '' : 'justify-center'}`}>
            <div className="rounded-lg bg-blue-600 p-2 shadow-md shadow-blue-100">
              <Heart className="h-5 w-5 fill-white text-white" />
            </div>

            <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'w-full opacity-100' : 'w-0 opacity-0'}`}>
              <div className="whitespace-nowrap">
                <h1 className="text-lg font-black tracking-tight text-slate-900">아이숲 Admin</h1>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${userRole === 'ADMIN' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{userRole} MODE</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`absolute -right-2 top-1/2 z-50 -translate-y-1/2 rounded-full border border-slate-200 bg-white p-1.5 text-slate-400 shadow-sm transition-all hover:text-blue-600 ${isExpanded ? 'opacity-100' : 'hidden opacity-0'}`}
              title={isPinned ? '사이드바 고정 해제' : '사이드바 고정'}
            >
              {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </button>
          </div>

          <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto overflow-x-hidden">
            {menuItems.map((item) => renderMenuLink(item, isExpanded))}
          </nav>

          <div className={`flex flex-col gap-4 border-t border-slate-100 pt-4 ${isExpanded ? '' : 'items-center'}`}>
            <div className={`flex items-center gap-3 ${isExpanded ? 'px-2' : 'justify-center'}`}>
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 ${userRole === 'ADMIN' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                {currentUser && userRole === 'NON_STAFF' ? (
                  <span className="text-sm font-black">{currentUser.name[0]}</span>
                ) : (
                  <UserCircle className="h-5 w-5" />
                )}
              </div>

              <div className={`flex flex-col overflow-hidden whitespace-nowrap transition-all duration-300 ${isExpanded ? 'w-full opacity-100' : 'w-0 opacity-0'}`}>
                <span className="text-sm font-black tracking-tight text-slate-800">{userName}</span>
                <span className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{userBadge}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className={`w-full rounded-xl p-2.5 text-rose-500 transition-all hover:bg-rose-50 ${isExpanded ? 'flex items-center justify-start gap-3 px-3' : 'flex justify-center px-0'}`}
              title={!isExpanded ? '로그아웃' : undefined}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span className={`whitespace-nowrap text-sm font-bold transition-all duration-300 ${isExpanded ? 'w-full opacity-100' : 'w-0 overflow-hidden opacity-0'}`}>
                로그아웃
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className={`fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm transition md:hidden ${isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}>
        <div
          className={`absolute left-0 top-0 flex h-full w-[86%] max-w-[22rem] flex-col bg-[linear-gradient(180deg,#0f172a_0%,#111827_52%,#172554_100%)] px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] shadow-[0_35px_80px_rgba(15,23,42,0.45)] transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-2.5">
                <Heart className="h-5 w-5 fill-blue-300 text-blue-300" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-200">Forest Groupware</p>
                <h2 className="text-base font-black tracking-tight text-white">아이숲 업무방</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onMobileMenuClose?.()}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80"
              aria-label="메뉴 닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-6 rounded-[1.6rem] border border-white/10 bg-white/6 p-4 text-white shadow-[0_16px_40px_rgba(15,23,42,0.2)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-blue-100">
                {currentUser && userRole === 'NON_STAFF' ? (
                  <span className="text-base font-black">{currentUser.name[0]}</span>
                ) : (
                  <UserCircle className="h-6 w-6" />
                )}
              </div>
              <div>
                <p className="text-sm font-black">{userName}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-200">{userBadge}</p>
              </div>
            </div>
          </div>

          <nav className="custom-scrollbar flex-1 space-y-2 overflow-y-auto pr-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={`drawer-${item.path}`}
                  to={item.path}
                  onClick={() => onMobileMenuClose?.()}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-black transition-all ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-[0_16px_40px_rgba(255,255,255,0.16)]'
                      : 'bg-white/5 text-white/72 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-blue-200'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3.5 text-sm font-black text-rose-200 transition hover:bg-rose-500/16"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
        <button type="button" onClick={() => onMobileMenuClose?.()} className="absolute inset-0 -z-10" aria-label="메뉴 닫기 배경" />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/92 px-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-4 gap-2 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-2">
          {primaryMobileItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={`bottom-${item.path}`}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 rounded-[1.1rem] px-2 py-2 text-[10px] font-black transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-[0_18px_30px_rgba(37,99,235,0.32)]'
                    : 'text-slate-500 hover:bg-white hover:text-slate-900'
                }`}
              >
                <item.icon className="h-4.5 w-4.5" />
                <span>{item.name.replace('/출결', '')}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Sidebar;

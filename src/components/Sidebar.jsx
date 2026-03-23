import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserSquare2, 
  ClipboardList, 
  BarChart3, 
  Building2, 
  Globe, 
  ShieldCheck,
  ShieldAlert,
  UserCircle,
  CalendarDays,
  Heart,
  LogOut,
  Pin,
  PinOff
} from 'lucide-react';

const Sidebar = ({ isPinned, setIsPinned }) => {
  const location = useLocation();
  const [isHovered, setIsHovered] = React.useState(false);
  const isExpanded = isPinned || isHovered;
  const userRole = 'ADMIN';
  const currentUser = null;

  const permissions = {
    'ADMIN': {
      'dashboard': true,
      'children': true,
      'stats': true,
      'staff': true,
      'programs': true
    }
  };
  
  const menuItems = [
    { key: 'dashboard', name: '대시보드', icon: LayoutDashboard, path: '/dashboard' },
    { key: 'children', name: '아동 관리/출결', icon: Users, path: '/children' },
    { key: 'staff', name: '종사자 관리/출결', icon: UserSquare2, path: '/staff' },
    { key: 'programs', name: '프로그램 관리', icon: ClipboardList, path: '/programs' },
    { key: 'stats', name: '운영일지/통계', icon: BarChart3, path: '/stats' },
  ].filter(item => {
    if (userRole === 'ADMIN') return true;
    return permissions.NON_STAFF[item.key] !== false; // Default true unless explicitly false in role, but individual might control sub-tabs
  });

  return (
    <div 
      className={`min-h-screen bg-white border-r border-slate-200 p-4 flex flex-col shadow-sm fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out ${isExpanded ? 'w-60' : 'w-20'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex items-center gap-2.5 mb-8 px-2 relative ${isExpanded ? '' : 'justify-center'}`}>
        <div className="p-2 bg-blue-600 rounded-lg shadow-md shadow-blue-100 flex-shrink-0">
          <Heart className="w-5 h-5 text-white fill-white" />
        </div>
        
        <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'w-full opacity-100' : 'w-0 opacity-0'}`}>
          <div className="whitespace-nowrap">
            <h1 className="text-lg font-black text-slate-900 tracking-tight">아이숲 Admin</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${userRole === 'ADMIN' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{userRole} MODE</span>
            </div>
          </div>
        </div>

        {/* Pin Button - Only show when expanded */}
        <button 
          onClick={() => setIsPinned(!isPinned)}
          className={`absolute -right-2 top-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-full p-1.5 shadow-sm text-slate-400 hover:text-blue-600 transition-all z-50 ${isExpanded ? 'opacity-100' : 'opacity-0 delay-0 hidden'}`}
          title={isPinned ? "사이드바 고정 해제" : "사이드바 고정"}
        >
          {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
        </button>
      </div>



      <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                isActive 
                  ? 'bg-blue-50 text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              } ${isExpanded ? 'gap-2.5 justify-start' : 'justify-center'}`}
              title={!isExpanded ? item.name : undefined}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              
              <span className={`whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100 w-full' : 'opacity-0 w-0 overflow-hidden'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className={`pt-4 border-t border-slate-100 flex flex-col gap-4 ${isExpanded ? '' : 'items-center'}`}>
        {/* User Info */}
        <div className={`flex items-center gap-3 transition-all ${isExpanded ? 'px-2' : 'justify-center'}`} title={!isExpanded ? '시스템 관리자' : undefined}>
           <div className={`w-9 h-9 flex-shrink-0 rounded-full border border-slate-200 flex items-center justify-center overflow-hidden bg-emerald-50 text-emerald-600`}>
              <UserCircle className="w-5 h-5" />
           </div>
           
           <div className={`flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-full' : 'opacity-0 w-0'}`}>
              <span className="text-sm font-black text-slate-800 tracking-tight">
                시스템 관리자
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                ADMIN
              </span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

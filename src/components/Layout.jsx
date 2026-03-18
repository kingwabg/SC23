import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('sidebarPinned');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('sidebarPinned', JSON.stringify(isPinned));
  }, [isPinned]);

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar isPinned={isPinned} setIsPinned={setIsPinned} />
      <main className={`flex-1 transition-all duration-300 ${isPinned ? 'ml-60' : 'ml-20'} p-6 overflow-y-auto`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;

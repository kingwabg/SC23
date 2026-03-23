import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ensureValidSession, hasMenuPermission } from '../utils/auth';

const ProtectedRoute = ({ children, menuKey = null }) => {
  const location = useLocation();
  const [isChecking, setIsChecking] = React.useState(true);
  const [isAuthed, setIsAuthed] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    const check = async () => {
      const ok = await ensureValidSession();
      if (!mounted) return;
      setIsAuthed(ok);
      setIsChecking(false);
    };

    check();
    return () => {
      mounted = false;
    };
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm font-bold">
        인증 상태 확인 중...
      </div>
    );
  }

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (menuKey && !hasMenuPermission(menuKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;

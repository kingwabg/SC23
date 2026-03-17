import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ChildrenPage = lazy(() => import('./pages/ChildrenPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
const FacilityPage = lazy(() => import('./pages/FacilityPage'));
const ProgramPage = lazy(() => import('./pages/ProgramPage'));
const MeetingPage = lazy(() => import('./pages/MeetingPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const IntroPage = lazy(() => import('./pages/IntroPage'));
const VisitPage = lazy(() => import('./pages/VisitPage'));

const AppShellFallback = () => (
  <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-8 font-['Outfit'] md:px-6">
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="h-28 animate-pulse rounded-[2rem] bg-white/80 shadow-sm shadow-slate-200/70" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-40 animate-pulse rounded-[1.75rem] bg-white/80 shadow-sm shadow-slate-200/70" />
        <div className="h-40 animate-pulse rounded-[1.75rem] bg-white/80 shadow-sm shadow-slate-200/70" />
        <div className="h-40 animate-pulse rounded-[1.75rem] bg-white/80 shadow-sm shadow-slate-200/70" />
      </div>
      <div className="h-[380px] animate-pulse rounded-[2rem] bg-white/80 shadow-sm shadow-slate-200/70" />
    </div>
  </div>
);

const AppRoute = ({ element }) => <Suspense fallback={<AppShellFallback />}>{element}</Suspense>;

const ProtectedPage = ({ menuKey, children }) => (
  <ProtectedRoute menuKey={menuKey}>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppRoute element={<IntroPage />} />} />
        <Route path="/visit" element={<AppRoute element={<VisitPage />} />} />
        <Route path="/login" element={<AppRoute element={<LoginPage />} />} />

        <Route path="/dashboard" element={<AppRoute element={<ProtectedPage menuKey="dashboard"><Dashboard /></ProtectedPage>} />} />
        <Route path="/children" element={<AppRoute element={<ProtectedPage menuKey="children"><ChildrenPage /></ProtectedPage>} />} />
        <Route path="/stats" element={<AppRoute element={<ProtectedPage menuKey="stats"><StatsPage /></ProtectedPage>} />} />
        <Route path="/staff" element={<AppRoute element={<ProtectedPage menuKey="staff"><StaffPage /></ProtectedPage>} />} />
        <Route path="/facility" element={<AppRoute element={<ProtectedPage menuKey="facility"><FacilityPage /></ProtectedPage>} />} />
        <Route path="/programs" element={<AppRoute element={<ProtectedPage menuKey="programs"><ProgramPage /></ProtectedPage>} />} />
        <Route path="/meetings" element={<AppRoute element={<ProtectedPage menuKey="meetings"><MeetingPage /></ProtectedPage>} />} />
        <Route path="/calendar" element={<AppRoute element={<ProtectedPage menuKey="calendar"><CalendarPage /></ProtectedPage>} />} />
        <Route
          path="/public-admin"
          element={
            <AppRoute
              element={
                <ProtectedPage menuKey="public">
                  <div className="p-20 text-center text-4xl font-black text-slate-300">홍보 사이트 관리 준비중</div>
                </ProtectedPage>
              }
            />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ChildrenPage from './pages/ChildrenPage';
import StatsPage from './pages/StatsPage';
import StaffPage from './pages/StaffPage';
import FacilityPage from './pages/FacilityPage';
import ProgramPage from './pages/ProgramPage';
import MeetingPage from './pages/MeetingPage';
import CalendarPage from './pages/CalendarPage';
import IntroPage from './pages/IntroPage';
import VisitPage from './pages/VisitPage';
import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<IntroPage />} />
        <Route path="/visit" element={<VisitPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Admin Secret Routes Wrapped in Layout */}
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/children" element={<Layout><ChildrenPage /></Layout>} />
        <Route path="/stats" element={<Layout><StatsPage /></Layout>} />
        <Route path="/staff" element={<Layout><StaffPage /></Layout>} />
        <Route path="/facility" element={<Layout><FacilityPage /></Layout>} />
        <Route path="/programs" element={<Layout><ProgramPage /></Layout>} />
        <Route path="/meetings" element={<Layout><MeetingPage /></Layout>} />
        <Route path="/calendar" element={<Layout><CalendarPage /></Layout>} />
        <Route path="/public-admin" element={<Layout><div className="p-20 text-center font-black text-slate-300 text-4xl">홍보 사이트 관리 준비중</div></Layout>} />
      </Routes>
    </Router>
  );
}

export default App;

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ChildrenPage from './pages/ChildrenPage';
import StatsPage from './pages/StatsPage';
import StaffPage from './pages/StaffPage';
import ProgramPage from './pages/ProgramPage';
import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/children" element={<Layout><ChildrenPage /></Layout>} />
        <Route path="/stats" element={<Layout><StatsPage /></Layout>} />
        <Route path="/staff" element={<Layout><StaffPage /></Layout>} />
        <Route path="/programs" element={<Layout><ProgramPage /></Layout>} />
      </Routes>
    </Router>
  );
}

export default App;

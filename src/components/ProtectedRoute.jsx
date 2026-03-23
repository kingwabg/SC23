import React from 'react';

// 개발 모드: 로그인 없이 ADMIN으로 바로 접근
// localStorage에 가짜 세션 세팅
if (!localStorage.getItem('userRole')) {
  localStorage.setItem('userRole', 'ADMIN');
  localStorage.setItem('currentUser', JSON.stringify({
    id: 1, name: '시스템 관리자', role: 'ADMIN', email: 'admin@forest.kr',
    permissions: {}
  }));
  localStorage.setItem('accessToken', 'dev-bypass-token');
}

const ProtectedRoute = ({ children }) => {
  return children;
};

export default ProtectedRoute;

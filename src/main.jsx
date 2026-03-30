import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// --- 긴급 수정: 기존에 남아있는 서비스 워커를 완전히 삭제하여 새로고침 지옥 해결 ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister()
    }
  }).catch((err) => {
    console.error('기존 서비스 워커 삭제 실패:', err)
  })
}
// -------------------------------------------------------------

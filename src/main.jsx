import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (isLocalhost) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister())
      }).catch((error) => {
        console.error('Service worker cleanup failed:', error)
      })
      return
    }

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      const notifyUpdate = (worker) => {
        window.dispatchEvent(new CustomEvent('sw-update-available', { detail: { registration, worker } }))
      }

      if (registration.waiting) {
        notifyUpdate(registration.waiting)
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing

        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            notifyUpdate(newWorker)
          }
        })
      })

      let isRefreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (isRefreshing) return
        isRefreshing = true
        window.location.reload()
      })
    }).catch((error) => {
      console.error('Service worker registration failed:', error)
    })
  })
}

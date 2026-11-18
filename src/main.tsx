import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { isDesktop } from './lib/desktop'
import './styles.css'

if (isDesktop) {
  document.documentElement.classList.add('desktop')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// The desktop shell serves files from disk, so a service worker is pointless there.
if (!isDesktop && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => undefined)
  })
}

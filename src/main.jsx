// ── Polyfills pro starší iOS Safari (musí být před importy pdfjs!) ──────────
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function () {
    let resolve, reject
    const promise = new this((res, rej) => { resolve = res; reject = rej })
    return { promise, resolve, reject }
  }
}
if (!Array.prototype.at) {
  Array.prototype.at = function (n) {
    n = Math.trunc(n) || 0
    if (n < 0) n += this.length
    return n < 0 || n >= this.length ? undefined : this[n]
  }
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App'

// Auto-reload když service worker aktivuje novou verzi — jinak na iOS PWA
// uživatel drží starou app napořád.
if ('serviceWorker' in navigator) {
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)

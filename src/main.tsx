import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(<App />)

// ── TEMPORARY DEBUG: touch/gesture event diagnostic ──
// Shows a fixed green banner at the top of the screen with event info.
// This runs outside React so it works regardless of component state.
;(() => {
  const d = document.createElement('div')
  d.id = 'pinch-debug'
  d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:rgba(0,0,0,0.9);color:#0f0;padding:6px 10px;font:12px/1.4 monospace;pointer-events:none;white-space:pre-wrap;'
  d.textContent = `v${__APP_VERSION__} | GestureEvent=${('GestureEvent' in window)} | waiting for touch...`
  document.body.appendChild(d)

  const log = (msg: string) => { d.textContent = `v${__APP_VERSION__} | ${msg}` }

  document.addEventListener('gesturestart', (e) => {
    log(`gesturestart scale=${(e as unknown as {scale:number}).scale?.toFixed(2)}`)
  }, true)
  document.addEventListener('gesturechange', (e) => {
    log(`gesturechange scale=${(e as unknown as {scale:number}).scale?.toFixed(2)}`)
  }, true)
  document.addEventListener('gestureend', () => {
    log('gestureend')
  }, true)
  document.addEventListener('touchstart', (e) => {
    log(`touchstart touches=${e.touches.length}`)
  }, true)
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length >= 2) log(`touchmove touches=${e.touches.length}`)
  }, true)
})()

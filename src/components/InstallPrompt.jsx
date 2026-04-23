import { useState, useEffect } from 'react'
import { X, Download, Share, Plus, ArrowDown } from 'lucide-react'

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem('installDismissed'))

  useEffect(() => {
    if (dismissed) return

    const ua = navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(ua) || (/macintosh/.test(ua) && 'ontouchend' in document)
    const standalone = window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches
    setIsIOS(ios)

    if (ios && !standalone) {
      setTimeout(() => setShow(true), 3000)
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setPrompt(e)
      setTimeout(() => setShow(true), 2000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [dismissed])

  const dismiss = () => {
    setShow(false)
    setShowIOSGuide(false)
    localStorage.setItem('installDismissed', '1')
    setDismissed(true)
  }

  const install = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') dismiss()
    else setShow(false)
  }

  if (!show) return null

  // ── iOS — detailní návod v modálu ──────────────────────────────────────
  if (isIOS && showIOSGuide) {
    return (
      <div
        className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={() => setShowIOSGuide(false)}
      >
        <div
          className="bg-white dark:bg-slate-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-500 to-navy-700 flex items-center justify-center">
                <span className="text-lg">⚓</span>
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Přidat SailMate na plochu</p>
                <p className="text-xs text-slate-500">Rychlejší, bez adresního řádku</p>
              </div>
            </div>
            <button onClick={() => setShowIOSGuide(false)} className="text-slate-400 hover:text-slate-600 -m-2 p-2">
              <X size={18} />
            </button>
          </div>

          <ol className="px-5 py-4 space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-ocean-500 text-white text-xs font-bold flex items-center justify-center">1</span>
              <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                Ve spodní liště Safari klepni na ikonu
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-700">
                  <Share size={14} className="text-ocean-500" />
                </span>
                <span className="text-slate-500 text-xs">(Sdílet)</span>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-ocean-500 text-white text-xs font-bold flex items-center justify-center">2</span>
              <span className="text-slate-700 dark:text-slate-200">
                V menu sjeď dolů a vyber
                <span className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-md bg-slate-100 dark:bg-slate-700 text-xs font-semibold">
                  <Plus size={11} /> Přidat na plochu
                </span>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-ocean-500 text-white text-xs font-bold flex items-center justify-center">3</span>
              <span className="text-slate-700 dark:text-slate-200">
                Potvrď <strong>Přidat</strong> vpravo nahoře. Hotovo — ikonu najdeš na ploše jako obyčejnou appku.
              </span>
            </li>
          </ol>

          <div className="px-5 pt-2 pb-1 flex items-center gap-2 text-ocean-500 text-xs">
            <ArrowDown size={14} className="animate-bounce" />
            <span>Ikona sdílení je úplně dole v Safari</span>
          </div>

          <div className="px-5 pt-3 flex gap-2">
            <button onClick={dismiss} className="btn-ghost flex-1 text-sm">Už nezobrazovat</button>
            <button onClick={() => setShowIOSGuide(false)} className="btn-ocean flex-1 text-sm">Rozumím</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Spodní banner ──────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-500 to-navy-700 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">⚓</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">Přidat SailMate na plochu</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rychlejší start, funguje i offline
            </p>
          </div>
          <button onClick={dismiss} className="text-slate-300 hover:text-slate-500 flex-shrink-0 -m-2 p-2">
            <X size={16} />
          </button>
        </div>
        {isIOS ? (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="mt-3 w-full btn-ocean flex items-center justify-center gap-2 text-sm"
          >
            <Share size={14} /> Ukaž mi jak
          </button>
        ) : (
          <button
            onClick={install}
            className="mt-3 w-full btn-ocean flex items-center justify-center gap-2 text-sm"
          >
            <Download size={15} /> Nainstalovat
          </button>
        )}
      </div>
    </div>
  )
}

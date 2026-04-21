import { useState, useEffect } from 'react'
import { X, Download, Share } from 'lucide-react'

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem('installDismissed'))

  useEffect(() => {
    if (dismissed) return

    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    const standalone = window.navigator.standalone === true
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

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-500 to-navy-700 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">⚓</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">Přidat SailMate na plochu</p>
            {isIOS ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Klikni na <Share size={11} className="inline" /> → <strong>Přidat na plochu</strong>
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Funguje offline, jako nativní apka
              </p>
            )}
          </div>
          <button onClick={dismiss} className="text-slate-300 hover:text-slate-500 flex-shrink-0">
            <X size={16} />
          </button>
        </div>
        {!isIOS && (
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

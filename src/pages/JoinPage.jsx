import { useState, useEffect, useRef } from 'react'
import { Anchor, Loader2, LogIn, Users2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useStore from '../store/useStore'

export default function JoinPage() {
  const [code, setCode] = useState('')
  const [voyage, setVoyage] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [entering, setEntering] = useState(false)
  const didAutoLookup = useRef(false)

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('code')
    if (c && !didAutoLookup.current) {
      didAutoLookup.current = true
      const upper = c.toUpperCase()
      setCode(upper)
      doLookup(upper)
    }
  }, [])

  const SUPA_URL = 'https://kgteeyrfzwdptdvhjtbs.supabase.co/rest/v1'
  const SUPA_KEY = 'sb_publishable_BxQtNqD8PO7NOuDK7GRneA_96IrOJAa'
  const supaFetch = (path) => fetch(`${SUPA_URL}${path}`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
  }).then((r) => r.json())

  const doLookup = async (codeVal) => {
    setLoading(true)
    setError('')
    setVoyage(null)
    try {
      const rows = await supaFetch(`/voyage_invites?select=*&code=eq.${encodeURIComponent(codeVal.trim().toUpperCase())}&limit=1`)
      const data = Array.isArray(rows) ? rows[0] ?? null : null
      setLoading(false)
      if (!data) { setError('Kód nenalezen. Zkontroluj zadání.'); return }
      setVoyage(data)
    } catch {
      setLoading(false)
      setError('Chyba připojení. Zkus to znovu.')
    }
  }

  const lookup = (e) => { e?.preventDefault(); doLookup(code) }

  const enterVoyage = () => {
    if (!voyage) return
    setEntering(true)
    // Odhlas případnou Supabase session (kapitán nemůže být zároveň posádkou)
    supabase.auth.signOut().catch(() => {})
    // Ulož kód a pokračuj do aplikace v crew modu
    useStore.getState().enterCrewMode(voyage.code)
    // Hard reload zajistí čistý boot do crew modu v App.jsx
    setTimeout(() => { window.location.href = '/' }, 150)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 to-ocean-700 p-4 flex flex-col items-center">
      <div className="w-full max-w-md mt-8 space-y-4">
        <div className="text-center mb-6">
          <Anchor size={36} className="text-white mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-white">Připojit se k výpravě</h1>
          <p className="text-blue-200 text-sm mt-1">Zadej kód od kapitána</p>
        </div>

        {!voyage ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl">
            <form onSubmit={lookup} className="space-y-4">
              <div>
                <label className="label">Kód výpravy</label>
                <input
                  className="input text-center text-2xl font-bold tracking-widest uppercase"
                  placeholder="ABC123"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                  maxLength={6}
                  autoFocus
                />
              </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <button type="submit" disabled={loading || code.length < 4} className="btn-ocean w-full flex items-center justify-center gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                Najít výpravu
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Voyage info */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-2xl">
              <p className="text-xs text-slate-400 mb-1">Výprava nalezena ✓</p>
              <h2 className="text-lg font-bold text-navy-800 dark:text-white">
                {voyage.voyage_data.voyage?.name ?? voyage.voyage_data.name}
              </h2>
              {(voyage.voyage_data.voyage?.boatName ?? voyage.voyage_data.boatName) && (
                <p className="text-sm text-slate-500 mt-0.5">
                  ⛵ {voyage.voyage_data.voyage?.boatName ?? voyage.voyage_data.boatName}
                </p>
              )}
              {(() => {
                const v = voyage.voyage_data.voyage ?? voyage.voyage_data
                return (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-sm text-slate-600 dark:text-slate-300">
                    {v.startDate && <span>📅 {new Date(v.startDate).toLocaleDateString('cs')}</span>}
                    {v.homePort && <span>⚓ {v.homePort}</span>}
                    <span>👥 {(v.crew ?? []).length} lidí</span>
                  </div>
                )
              })()}
            </div>

            {/* Enter voyage */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Users2 size={16} className="text-ocean-500" />
                <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">Vstoupit jako člen posádky</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                Získáš plný přístup k výpravě — deník, trasa, supplies, tracking, regaty i výdaje.
                Nebudeš moct smazat výpravu ani závodní pokyny, ale vše ostatní můžeš vyplňovat
                a kapitán to uvidí hned jakmile změníš.
              </p>
              <button
                onClick={enterVoyage}
                disabled={entering}
                className="btn-ocean w-full flex items-center justify-center gap-2"
              >
                {entering ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                Vstoupit do výpravy
              </button>
            </div>

            <button
              onClick={() => { setVoyage(null); setCode('') }}
              className="w-full text-blue-200 text-sm underline text-center py-2"
            >
              Zadat jiný kód
            </button>
          </>
        )}
      </div>
    </div>
  )
}


import { useState, useEffect, useRef } from 'react'
import { Anchor, Loader2, LogIn, Users2, UserPlus, ArrowLeft, ArrowRight, Check, Calendar, Sailboat, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useStore from '../store/useStore'

const SUPA_URL = 'https://kgteeyrfzwdptdvhjtbs.supabase.co/rest/v1'
const SUPA_KEY = 'sb_publishable_BxQtNqD8PO7NOuDK7GRneA_96IrOJAa'

const supaFetch = (path) => fetch(`${SUPA_URL}${path}`, {
  headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
}).then((r) => r.json())

// ── Step 1: Kód ──────────────────────────────────────────────────
function StepCode({ code, setCode, error, loading, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
      <div className="text-center space-y-1">
        <h2 className="font-bold text-lg text-navy-800 dark:text-white">Zadej kód výpravy</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">6 znaků, dostal jsi je od kapitána</p>
      </div>
      <input
        className="input text-center text-3xl font-bold tracking-[0.4em] uppercase py-4"
        placeholder="ABC123"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
        maxLength={6}
        autoFocus
        autoComplete="off"
        inputMode="text"
      />
      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 text-center">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || code.length < 4}
        className="btn-ocean w-full flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        Najít výpravu
        {!loading && <ArrowRight size={16} />}
      </button>
    </form>
  )
}

// ── Step 2: Náhled výpravy + výběr identity ─────────────────────
function StepIdentity({ voyage, voyageData, onBack, onConfirm, entering }) {
  const [pickedId, setPickedId] = useState(null)
  const [newName, setNewName] = useState('')
  const [mode, setMode] = useState('pick') // 'pick' | 'new'
  const crew = voyageData.crew ?? []

  const v = voyageData.voyage ?? voyageData

  return (
    <div className="space-y-4">
      {/* Voyage preview */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-ocean-500 to-navy-600 px-5 py-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Check size={14} className="text-emerald-300" />
            <span className="text-[11px] uppercase tracking-wider font-semibold opacity-90">
              Výprava nalezena
            </span>
          </div>
          <h2 className="text-xl font-bold leading-tight">{v.name}</h2>
        </div>
        <div className="p-5 space-y-2 text-sm text-slate-700 dark:text-slate-300">
          {v.boatName && (
            <div className="flex items-center gap-2.5">
              <Sailboat size={14} className="text-slate-400" />
              <span>{v.boatName}{v.boatLoa ? ` · ${v.boatLoa} m` : ''}</span>
            </div>
          )}
          {v.startDate && (
            <div className="flex items-center gap-2.5">
              <Calendar size={14} className="text-slate-400" />
              <span>
                {new Date(v.startDate).toLocaleDateString('cs')}
                {v.endDate && ` – ${new Date(v.endDate).toLocaleDateString('cs')}`}
              </span>
            </div>
          )}
          {v.homePort && (
            <div className="flex items-center gap-2.5">
              <MapPin size={14} className="text-slate-400" />
              <span>{v.homePort}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <Users2 size={14} className="text-slate-400" />
            <span>{crew.length} {crew.length === 1 ? 'člen posádky' : crew.length >= 2 && crew.length <= 4 ? 'členové posádky' : 'členů posádky'}</span>
          </div>
        </div>
      </div>

      {/* Identity */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-2xl space-y-3">
        <div>
          <h3 className="font-semibold text-base text-navy-800 dark:text-white">Kdo jsi?</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Vyber se ze seznamu nebo se přidej jako nový člen.
          </p>
        </div>

        {mode === 'pick' ? (
          <>
            {crew.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {crew.map((c) => {
                  const picked = pickedId === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => setPickedId(c.id)}
                      className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        picked
                          ? 'border-ocean-400 bg-ocean-50 dark:bg-ocean-500/10 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                        c.isSkipper
                          ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                          : 'bg-gradient-to-br from-ocean-400 to-navy-600'
                      }`}>
                        {c.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate text-slate-800 dark:text-slate-100">{c.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {c.isSkipper
                            ? '⚓ Kapitán'
                            : (c.roles ?? []).length > 0
                              ? `${c.roles.length} ${c.roles.length === 1 ? 'funkce' : 'funkcí'}`
                              : 'Bez funkce'}
                        </p>
                      </div>
                      {picked && <Check size={18} className="text-ocean-500 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}
            <button
              onClick={() => setMode('new')}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 py-3 text-sm font-medium text-slate-500 hover:border-ocean-400 hover:text-ocean-600 dark:hover:text-ocean-400 transition-colors"
            >
              <UserPlus size={15} /> Jsem nový — přidat mě
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="label">Tvoje jméno</label>
              <input
                className="input"
                placeholder="Martin Novák"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value.replace(/(^|\s)\S/g, (c) => c.toUpperCase()))}
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Kapitán uvidí, že ses přidal — můžeš si vyžádat funkci v aplikaci.
              </p>
            </div>
            <button
              onClick={() => setMode('pick')}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
            >
              ← Zpět na seznam
            </button>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          disabled={entering}
          className="btn-secondary flex-shrink-0"
          title="Zpět"
        >
          <ArrowLeft size={16} />
        </button>
        <button
          onClick={() => {
            if (mode === 'new' && newName.trim()) onConfirm({ newName: newName.trim() })
            else if (pickedId) onConfirm({ memberId: pickedId })
          }}
          disabled={entering || (mode === 'new' ? !newName.trim() : !pickedId)}
          className="btn-ocean flex-1 disabled:opacity-50"
        >
          {entering ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          Vstoupit do výpravy
        </button>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────
export default function JoinPage() {
  const [code, setCode] = useState('')
  const [voyageRow, setVoyageRow] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [entering, setEntering] = useState(false)
  const didAutoLookup = useRef(false)

  const doLookup = async (codeVal) => {
    setLoading(true)
    setError('')
    setVoyageRow(null)
    try {
      const rows = await supaFetch(`/voyage_invites?select=*&code=eq.${encodeURIComponent(codeVal.trim().toUpperCase())}&limit=1`)
      const data = Array.isArray(rows) ? rows[0] ?? null : null
      setLoading(false)
      if (!data) { setError('Kód nenalezen. Zkontroluj zadání.'); return }
      setVoyageRow(data)
    } catch {
      setLoading(false)
      setError('Chyba připojení. Zkus to znovu.')
    }
  }

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('code')
    if (c && !didAutoLookup.current) {
      didAutoLookup.current = true
      const upper = c.toUpperCase()
      setCode(upper)
      doLookup(upper)
    }
  }, [])

  const handleSubmit = (e) => { e?.preventDefault(); doLookup(code) }

  const enterVoyage = ({ memberId, newName }) => {
    if (!voyageRow) return
    setEntering(true)
    supabase.auth.signOut().catch(() => {})

    const store = useStore.getState()
    store.enterCrewMode(voyageRow.code)
    // Aplikuj snapshot, abychom hned měli crew listu k výběru
    if (voyageRow.voyage_data) store.mergeSharedVoyage(voyageRow.voyage_data)

    setTimeout(() => {
      const s2 = useStore.getState()
      const voyage = s2.voyages.find((v) => v.inviteCode === voyageRow.code)
      if (!voyage) { window.location.href = '/'; return }

      if (memberId) {
        s2.setCrewMemberId(memberId)
      } else if (newName) {
        s2.addCrewMember(voyage.id, { name: newName, isSkipper: false, roles: [] })
        // Najdi posledně přidaného člena se shodným jménem
        setTimeout(() => {
          const s3 = useStore.getState()
          const v3 = s3.voyages.find((x) => x.id === voyage.id)
          const me = (v3?.crew ?? []).slice().reverse().find((c) => c.name === newName)
          if (me) s3.setCrewMemberId(me.id)
          window.location.href = '/'
        }, 200)
        return
      }
      window.location.href = '/'
    }, 100)
  }

  return (
    <div
      className="min-h-screen p-4 flex flex-col items-center"
      style={{
        background:
          'radial-gradient(800px 500px at 100% 0%, rgba(14,165,233,0.35), transparent 60%),' +
          'radial-gradient(700px 500px at 0% 100%, rgba(99,102,241,0.30), transparent 60%),' +
          'linear-gradient(135deg, #071830 0%, #0c2340 50%, #0284c7 100%)',
      }}
    >
      <div className="w-full max-w-md mt-8 space-y-4 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 mb-4">
            <Anchor size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Připojit se</h1>
          <p className="text-blue-200 text-sm mt-1">k výpravě jako člen posádky</p>
        </div>

        {!voyageRow ? (
          <StepCode
            code={code}
            setCode={setCode}
            error={error}
            loading={loading}
            onSubmit={handleSubmit}
          />
        ) : (
          <StepIdentity
            voyage={voyageRow}
            voyageData={voyageRow.voyage_data}
            entering={entering}
            onBack={() => { setVoyageRow(null); setCode('') }}
            onConfirm={enterVoyage}
          />
        )}

        {!voyageRow && (
          <a
            href="/"
            className="block text-center text-blue-200/80 hover:text-white text-sm py-2 transition-colors"
          >
            Mám účet → přihlásit se
          </a>
        )}
      </div>
    </div>
  )
}

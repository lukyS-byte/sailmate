import { useState, useEffect, useRef } from 'react'
import { Anchor, Plus, Check, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { EXPENSE_CATEGORIES, formatCurrency } from '../utils/calc'

export default function JoinPage() {
  const [code, setCode] = useState('')
  const [voyage, setVoyage] = useState(null)
  const [crewExpenses, setCrewExpenses] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [userId, setUserId] = useState(null)
  const didAutoLookup = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })
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
      const exps = await supaFetch(`/crew_expenses?select=*&code=eq.${encodeURIComponent(data.code)}&order=created_at.desc`)
      setCrewExpenses(Array.isArray(exps) ? exps : [])
    } catch {
      setLoading(false)
      setError('Chyba připojení. Zkus to znovu.')
    }
  }

  const lookup = (e) => { e?.preventDefault(); doLookup(code) }

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
              <h2 className="text-lg font-bold text-navy-800 dark:text-white">{voyage.voyage_data.name}</h2>
              {voyage.voyage_data.boatName && (
                <p className="text-sm text-slate-500 mt-0.5">⛵ {voyage.voyage_data.boatName}</p>
              )}
              <div className="flex gap-3 mt-3 text-sm text-slate-600 dark:text-slate-300">
                {voyage.voyage_data.startDate && (
                  <span>📅 {new Date(voyage.voyage_data.startDate).toLocaleDateString('cs')}</span>
                )}
                <span>👥 {(voyage.voyage_data.crew ?? []).length} lidí</span>
              </div>

              {/* Crew list */}
              {(voyage.voyage_data.crew ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {voyage.voyage_data.crew.map((c) => (
                    <span key={c.id} className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-1">
                      {c.name}{c.isSkipper ? ' ⚓' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Add expense form */}
            {!submitted ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-2xl">
                {!showForm ? (
                  <button onClick={() => setShowForm(true)} className="btn-ocean w-full flex items-center justify-center gap-2">
                    <Plus size={16} /> Přidat výdaj
                  </button>
                ) : (
                  <AddCrewExpenseForm
                    voyageData={voyage.voyage_data}
                    code={voyage.code}
                    userId={userId}
                    onSubmitted={(exp) => {
                      setCrewExpenses((p) => [exp, ...p])
                      setShowForm(false)
                      setSubmitted(true)
                      setTimeout(() => setSubmitted(false), 3000)
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                <Check size={24} className="text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-emerald-700">Výdaj přidán!</p>
                <p className="text-sm text-emerald-600 mt-1">Kapitán ho uvidí při synchronizaci.</p>
                <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-emerald-700 underline">
                  Přidat další
                </button>
              </div>
            )}

            {/* Crew expenses list */}
            {crewExpenses.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-2xl">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">
                  Výdaje posádky ({crewExpenses.length})
                </p>
                <div className="space-y-2">
                  {crewExpenses.map((e) => {
                    const cat = EXPENSE_CATEGORIES.find((c) => c.id === e.data.category)
                    const payer = voyage.voyage_data.crew?.find((c) => c.id === e.data.paidBy)
                    return (
                      <div key={e.id} className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                        <span className="text-lg">{cat?.icon ?? '💰'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{e.data.description}</p>
                          <p className="text-xs text-slate-400">{payer?.name ?? '—'}</p>
                        </div>
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-200">
                          {formatCurrency(e.data.amount, voyage.voyage_data.currency)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => { setVoyage(null); setCode(''); setCrewExpenses([]) }}
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

function AddCrewExpenseForm({ voyageData, code, userId, onSubmitted }) {
  const crew = voyageData.crew ?? []
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'food',
    paidBy: crew[0]?.id ?? '',
    splitAmong: crew.map((c) => c.id),
    date: new Date().toISOString().slice(0, 10),
  })

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const toggleSplit = (id) => setForm((p) => ({
    ...p,
    splitAmong: p.splitAmong.includes(id) ? p.splitAmong.filter((x) => x !== id) : [...p.splitAmong, id],
  }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.amount) return
    const data = {
      description: form.description || EXPENSE_CATEGORIES.find((c) => c.id === form.category)?.label,
      amount: parseFloat(form.amount),
      currency: voyageData.currency,
      category: form.category,
      paidBy: form.paidBy,
      splitAmong: form.splitAmong,
      date: form.date,
      voyageId: voyageData.id,
    }
    const { data: row, error } = await supabase
      .from('crew_expenses')
      .insert({ code, data, added_by: userId })
      .select()
      .single()
    if (!error) onSubmitted(row)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nový výdaj</p>
      <div>
        <label className="label">Popis (volitelné)</label>
        <input className="input" placeholder="Večeře v restauraci..." value={form.description} onChange={f('description')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Částka ({voyageData.currency})</label>
          <input className="input" type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={f('amount')} required autoFocus />
        </div>
        <div>
          <label className="label">Datum</label>
          <input className="input" type="date" value={form.date} onChange={f('date')} />
        </div>
      </div>
      <div>
        <label className="label">Kategorie</label>
        <div className="grid grid-cols-4 gap-1.5">
          {EXPENSE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setForm((p) => ({ ...p, category: cat.id }))}
              className={`flex flex-col items-center gap-0.5 rounded-xl p-2 text-xs transition-colors ${
                form.category === cat.id ? 'bg-ocean-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <span className="text-base">{cat.icon}</span>
              <span className="leading-tight text-center">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
      {crew.length > 0 && (
        <>
          <div>
            <label className="label">Zaplatil/a</label>
            <select className="input" value={form.paidBy} onChange={f('paidBy')} required>
              {crew.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Rozdělit mezi</label>
            <div className="flex flex-wrap gap-2">
              {crew.map((c) => (
                <button key={c.id} type="button" onClick={() => toggleSplit(c.id)}
                  className={`badge text-sm px-3 py-1.5 transition-colors ${
                    form.splitAmong.includes(c.id) ? 'bg-ocean-100 text-ocean-700 border border-ocean-300' : 'bg-slate-100 text-slate-500'
                  }`}
                >{c.name}</button>
              ))}
              <button type="button" onClick={() => setForm((p) => ({ ...p, splitAmong: crew.map((c) => c.id) }))}
                className="badge text-sm px-3 py-1.5 bg-slate-100 text-slate-500">Všichni</button>
            </div>
          </div>
        </>
      )}
      <button type="submit" className="btn-ocean w-full">Přidat výdaj</button>
    </form>
  )
}

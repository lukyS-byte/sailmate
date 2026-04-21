import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Anchor, Users, Wallet, Map, Wind, Calendar, ChevronRight, Plus, Sailboat } from 'lucide-react'
import useStore from '../store/useStore'
import { splitExpenses, formatCurrency } from '../utils/calc'
import Modal from '../components/Modal'

// Known charter boats: model → LOA in meters
const BOATS = [
  { model: 'Beneteau First 35', loa: 10.5 },
  { model: 'Beneteau First 40', loa: 12.0 },
  { model: 'Beneteau Oceanis 38.1', loa: 11.6 },
  { model: 'Beneteau Oceanis 40.1', loa: 12.3 },
  { model: 'Beneteau Oceanis 45', loa: 13.8 },
  { model: 'Beneteau Oceanis 51.1', loa: 15.6 },
  { model: 'Bavaria Cruiser 34', loa: 10.4 },
  { model: 'Bavaria Cruiser 37', loa: 11.4 },
  { model: 'Bavaria Cruiser 40', loa: 12.5 },
  { model: 'Bavaria Cruiser 46', loa: 14.1 },
  { model: 'Bavaria Cruiser 51', loa: 15.6 },
  { model: 'Jeanneau Sun Odyssey 319', loa: 9.8 },
  { model: 'Jeanneau Sun Odyssey 349', loa: 10.6 },
  { model: 'Jeanneau Sun Odyssey 379', loa: 11.5 },
  { model: 'Jeanneau Sun Odyssey 410', loa: 12.5 },
  { model: 'Jeanneau Sun Odyssey 440', loa: 13.5 },
  { model: 'Jeanneau Sun Odyssey 519', loa: 15.8 },
  { model: 'Elan 35', loa: 10.5 },
  { model: 'Elan 40', loa: 12.1 },
  { model: 'Elan 45', loa: 13.7 },
  { model: 'Elan 50', loa: 15.2 },
  { model: 'Hanse 348', loa: 10.6 },
  { model: 'Hanse 388', loa: 11.9 },
  { model: 'Hanse 418', loa: 12.8 },
  { model: 'Hanse 458', loa: 14.0 },
  { model: 'Dufour 390 GL', loa: 11.8 },
  { model: 'Dufour 430 GL', loa: 13.1 },
  { model: 'Dufour 460 GL', loa: 14.2 },
  { model: 'Salona 38', loa: 11.6 },
  { model: 'Salona 40', loa: 12.4 },
  { model: 'Salona 44', loa: 13.4 },
  { model: 'Salona 48', loa: 14.6 },
  { model: 'X-Yachts X4.0', loa: 12.0 },
  { model: 'Sunbeam 42', loa: 12.9 },
]

const FT_TO_M = 0.3048

function loaFromModel(model) {
  if (!model) return ''
  const known = BOATS.find((b) => b.model.toLowerCase() === model.toLowerCase())
  if (known) return known.loa.toString()
  // extract trailing number — interpret as feet if < 80, else as dm (/10)
  const match = model.match(/(\d+(?:\.\d+)?)$/)
  if (!match) return ''
  const num = parseFloat(match[1])
  if (num < 80) return (num * FT_TO_M).toFixed(1)
  if (num >= 100) return (num / 10).toFixed(1) // e.g. 349 → 34.9/10 → handled above
  return ''
}

const HR_PORTS = [
  'Split','Trogir','Šibenik','Zadar','Biograd na Moru','Murter','Primošten',
  'Hvar','Korčula','Dubrovnik','Omiš','Makarska','Vis','Brač (Supetar)',
  'Rovinj','Pula','Mali Lošinj','Krk','Rab','Skradin','Tribunj',
]

function NewVoyageModal({ onClose }) {
  const addVoyage = useStore((s) => s.addVoyage)
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    boatName: '',
    boatModel: '',
    boatLoa: '',
    homePort: '',
    charterCost: '',
    currency: 'EUR',
    notes: '',
  })
  const [loaAuto, setLoaAuto] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showPortSuggestions, setShowPortSuggestions] = useState(false)

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleModelChange = (e) => {
    const model = e.target.value
    const loa = loaFromModel(model)
    setForm((p) => ({ ...p, boatModel: model, boatLoa: loa || p.boatLoa }))
    setLoaAuto(!!loa)
    setShowSuggestions(true)
  }

  const submit = (e) => {
    e.preventDefault()
    if (!form.name) return
    addVoyage({
      ...form,
      boatName: form.boatName || form.boatModel,
      boatLoa: parseFloat(form.boatLoa) || 12,
      charterCost: parseFloat(form.charterCost) || 0,
      crew: [],
      status: 'planning',
    })
    onClose()
    navigate('/voyage')
  }

  const modelSuggestions = showSuggestions && form.boatModel.length >= 2
    ? BOATS.filter((b) => b.model.toLowerCase().includes(form.boatModel.toLowerCase())).slice(0, 5)
    : []

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label">Název výpravy *</label>
        <input className="input" placeholder="Léto v Chorvatsku 2025" value={form.name} onChange={f('name')} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Od</label>
          <input className="input" type="date" value={form.startDate} onChange={f('startDate')} />
        </div>
        <div>
          <label className="label">Do</label>
          <input className="input" type="date" value={form.endDate} min={form.startDate || undefined} onChange={f('endDate')} />
        </div>
      </div>

      {/* Boat name (custom name) */}
      <div>
        <label className="label">Jméno lodě</label>
        <input className="input" placeholder="Neptun, Laguna II..." value={form.boatName} onChange={f('boatName')} />
      </div>

      {/* Boat model with autocomplete */}
      <div className="relative">
        <label className="label">Typ / model lodě</label>
        <input
          className="input"
          placeholder="First 35, Bavaria 40, Oceanis 45..."
          value={form.boatModel}
          onChange={handleModelChange}
          autoComplete="off"
        />
        {modelSuggestions.length > 0 && (
          <div className="absolute z-10 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg mt-1 overflow-hidden">
            {modelSuggestions.map((b) => (
              <button
                key={b.model}
                type="button"
                onClick={() => {
                  setForm((p) => ({ ...p, boatModel: b.model, boatLoa: b.loa.toString() }))
                  setLoaAuto(true)
                  setShowSuggestions(false)
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0 dark:text-slate-200"
              >
                <span>{b.model}</span>
                <span className="text-xs text-slate-400">{b.loa} m</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* LOA auto or manual */}
      <div>
        <label className="label">
          LOA (m)
          {loaAuto && <span className="ml-1 text-emerald-600 text-[10px] font-semibold">✓ Automaticky přepočteno</span>}
        </label>
        <input
          className="input"
          type="number"
          step="0.1"
          placeholder="12.0"
          value={form.boatLoa}
          onChange={(e) => { setForm((p) => ({ ...p, boatLoa: e.target.value })); setLoaAuto(false) }}
        />
      </div>

      {/* Home port with custom suggestions */}
      <div className="relative">
        <label className="label">Výchozí přístav</label>
        <input
          className="input"
          placeholder="Split, Trogir, Šibenik..."
          value={form.homePort}
          autoComplete="off"
          onChange={(e) => { setForm((p) => ({ ...p, homePort: e.target.value })); setShowPortSuggestions(true) }}
        />
        {showPortSuggestions && form.homePort.length >= 1 && (
          <div className="absolute z-10 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg mt-1 overflow-hidden">
            {HR_PORTS.filter((p) => p.toLowerCase().includes(form.homePort.toLowerCase())).slice(0, 5).map((port) => (
              <button
                key={port}
                type="button"
                onClick={() => { setForm((p) => ({ ...p, homePort: port })); setShowPortSuggestions(false) }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 last:border-0"
              >
                {port}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Cena charteru</label>
          <input className="input" type="number" placeholder="0" value={form.charterCost} onChange={f('charterCost')} />
        </div>
        <div>
          <label className="label">Měna</label>
          <select className="input" value={form.currency} onChange={f('currency')}>
            <option value="EUR">EUR €</option>
            <option value="USD">USD $</option>
            <option value="CZK">CZK Kč</option>
          </select>
        </div>
      </div>
      <button type="submit" className="btn-ocean w-full mt-2">
        Vytvořit výpravu
      </button>
    </form>
  )
}

export default function Dashboard() {
  const [showNew, setShowNew] = useState(false)
  const { voyages, expenses, activeVoyageId, setActiveVoyage } = useStore()
  const active = voyages.find((v) => v.id === activeVoyageId)
  const voyageExpenses = expenses.filter((e) => e.voyageId === activeVoyageId)
  const totalExpenses = voyageExpenses.reduce((s, e) => s + e.amount, 0)
  const { transactions } = active?.crew?.length
    ? splitExpenses(voyageExpenses, active.crew)
    : { transactions: [] }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-navy-800 dark:text-white flex items-center gap-2">
            <Anchor size={20} className="text-ocean-500" /> SailMate
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Kapitánův lodní asistent</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-ocean flex items-center gap-1.5 text-sm">
          <Plus size={16} /> Nová výprava
        </button>
      </div>

      {/* Active voyage */}
      {active ? (
        <div className="rounded-2xl overflow-hidden shadow-md">
          <div className="bg-gradient-to-br from-navy-800 to-navy-600 p-5 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-blue-200 text-xs font-medium uppercase tracking-wide">Aktivní výprava</p>
                <h2 className="text-xl font-bold mt-1">{active.name}</h2>
                {active.boatName && (
                  <p className="text-blue-200 text-sm mt-0.5 flex items-center gap-1">
                    <Sailboat size={13} /> {active.boatName} · {active.boatLoa}m
                  </p>
                )}
              </div>
              <span className="badge bg-ocean-500/30 text-blue-100 border border-ocean-400/30">
                {active.status === 'planning' ? '📋 Plánování' : active.status === 'active' ? '⛵ Plavba' : '✅ Hotovo'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-5">
              <Stat icon={<Users size={14} />} value={active.crew?.length ?? 0} label="Posádka" />
              <Stat icon={<Wallet size={14} />} value={formatCurrency(totalExpenses, active.currency)} label="Náklady" />
              <Stat
                icon={<Calendar size={14} />}
                value={active.startDate ? new Date(active.startDate).toLocaleDateString('cs', { day: 'numeric', month: 'short' }) : '—'}
                label="Odjezd"
              />
            </div>
          </div>
          {transactions.length > 0 && (
            <div className="bg-amber-50 border-t border-amber-200 px-5 py-3">
              <p className="text-xs font-semibold text-amber-700 mb-2">💸 Kdo komu dluží</p>
              <div className="space-y-1">
                {transactions.slice(0, 3).map((t, i) => {
                  const from = active.crew.find((c) => c.id === t.from)
                  const to = active.crew.find((c) => c.id === t.to)
                  return (
                    <p key={i} className="text-xs text-amber-800">
                      <span className="font-medium">{from?.name}</span> → <span className="font-medium">{to?.name}</span>:{' '}
                      <span className="font-bold">{formatCurrency(t.amount, active.currency)}</span>
                    </p>
                  )
                })}
                {transactions.length > 3 && (
                  <p className="text-xs text-amber-600">+ {transactions.length - 3} dalších</p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className="card flex flex-col items-center justify-center py-12 text-center cursor-pointer border-dashed border-2 border-slate-200"
          onClick={() => setShowNew(true)}
        >
          <Anchor size={40} className="text-slate-200 mb-3" />
          <p className="font-medium text-slate-500">Zatím žádná výprava</p>
          <p className="text-sm text-slate-400 mt-1">Klikni a vytvoř svou první plavbu</p>
        </div>
      )}

      {/* Quick links */}
      {active && (
        <div className="space-y-2">
          <p className="section-title">Rychlý přístup</p>
          <div className="grid grid-cols-2 gap-2">
            <QuickLink icon={<Users size={18} className="text-ocean-500" />} label="Posádka" sub={`${active.crew?.length ?? 0} členů`} to="/voyage" />
            <QuickLink icon={<Wallet size={18} className="text-amber-500" />} label="Přidat výdaj" sub="Rozdělit náklady" to="/expenses" state={{ openAdd: true }} />
            <QuickLink icon={<Map size={18} className="text-emerald-500" />} label="Trasa" sub="Waypoints & čas" to="/route" />
            <QuickLink icon={<Wind size={18} className="text-purple-500" />} label="Lodní deník" sub="Záznamy plavby" to="/log" />
          </div>
        </div>
      )}

      {/* Other voyages */}
      {voyages.filter((v) => v.id !== activeVoyageId).length > 0 && (
        <div>
          <p className="section-title">Ostatní výpravy</p>
          <div className="space-y-2">
            {voyages
              .filter((v) => v.id !== activeVoyageId)
              .map((v) => (
                <button
                  key={v.id}
                  onClick={() => setActiveVoyage(v.id)}
                  className="card w-full flex items-center justify-between text-left hover:border-ocean-300 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{v.name}</p>
                    <p className="text-xs text-slate-400">{v.boatName || 'Bez lodě'} · {v.crew?.length ?? 0} osob</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
              ))}
          </div>
        </div>
      )}

      {showNew && <NewVoyageModal onClose={() => setShowNew(false)} />}
    </div>
  )
}

function Stat({ icon, value, label }) {
  return (
    <div className="bg-white/10 rounded-xl p-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-blue-200 mb-1">{icon}</div>
      <p className="text-sm font-bold text-white leading-none">{value}</p>
      <p className="text-[10px] text-blue-300 mt-0.5">{label}</p>
    </div>
  )
}

function QuickLink({ icon, label, sub, to, state }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to, { state })}
      className="card flex items-center gap-3 text-left hover:shadow-md transition-shadow"
    >
      <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[11px] text-slate-400">{sub}</p>
      </div>
    </button>
  )
}

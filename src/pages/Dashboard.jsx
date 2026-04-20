import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Anchor, Users, Wallet, Map, Wind, Calendar, ChevronRight, Plus, Sailboat } from 'lucide-react'
import useStore from '../store/useStore'
import { splitExpenses, formatCurrency } from '../utils/calc'
import Modal from '../components/Modal'

function NewVoyageModal({ onClose }) {
  const addVoyage = useStore((s) => s.addVoyage)
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    boatName: '',
    boatLoa: '',
    homePort: '',
    charterCost: '',
    currency: 'EUR',
    notes: '',
  })

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.name) return
    addVoyage({
      ...form,
      boatLoa: parseFloat(form.boatLoa) || 12,
      charterCost: parseFloat(form.charterCost) || 0,
      crew: [],
      status: 'planning',
    })
    onClose()
    navigate('/voyage')
  }

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
          <input className="input" type="date" value={form.endDate} onChange={f('endDate')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Název lodě</label>
          <input className="input" placeholder="Beneteau 45" value={form.boatName} onChange={f('boatName')} />
        </div>
        <div>
          <label className="label">LOA (m)</label>
          <input className="input" type="number" placeholder="12" value={form.boatLoa} onChange={f('boatLoa')} />
        </div>
      </div>
      <div>
        <label className="label">Výchozí přístav</label>
        <input className="input" placeholder="Split, Chorvatsko" value={form.homePort} onChange={f('homePort')} />
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
          <h1 className="text-xl font-bold text-navy-800 flex items-center gap-2">
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
            <QuickLink icon={<Wind size={18} className="text-purple-500" />} label="Deník" sub="Záznamy plavby" to="/log" />
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
      <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[11px] text-slate-400">{sub}</p>
      </div>
    </button>
  )
}

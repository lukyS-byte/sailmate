import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Trash2, Wallet, ArrowRight, ChevronDown, ChevronUp, Share2, Copy, Check } from 'lucide-react'
import useStore from '../store/useStore'
import { splitExpenses, formatCurrency, EXPENSE_CATEGORIES } from '../utils/calc'
import Modal from '../components/Modal'

function AddExpenseModal({ voyage, onClose }) {
  const addExpense = useStore((s) => s.addExpense)
  const crew = voyage.crew ?? []
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'food',
    paidBy: crew[0]?.id ?? '',
    splitAmong: crew.map((c) => c.id),
    date: new Date().toISOString().slice(0, 10),
  })

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const toggleSplit = (id) => {
    setForm((p) => ({
      ...p,
      splitAmong: p.splitAmong.includes(id) ? p.splitAmong.filter((x) => x !== id) : [...p.splitAmong, id],
    }))
  }

  const submit = (e) => {
    e.preventDefault()
    if (!form.amount) return
    addExpense({
      voyageId: voyage.id,
      description: form.description || EXPENSE_CATEGORIES.find((c) => c.id === form.category)?.label,
      amount: parseFloat(form.amount),
      currency: voyage.currency,
      category: form.category,
      paidBy: form.paidBy,
      splitAmong: form.splitAmong,
      date: form.date,
    })
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Popis (volitelné)</label>
        <input className="input" placeholder="Večeře v restauraci..." value={form.description} onChange={f('description')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Částka ({voyage.currency})</label>
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
              <option value="">Vyber...</option>
              {crew.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Rozdělit mezi</label>
            <div className="flex flex-wrap gap-2">
              {crew.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleSplit(c.id)}
                  className={`badge text-sm px-3 py-1.5 transition-colors ${
                    form.splitAmong.includes(c.id) ? 'bg-ocean-100 text-ocean-700 border border-ocean-300' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {c.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, splitAmong: crew.map((c) => c.id) }))}
                className="badge text-sm px-3 py-1.5 bg-slate-100 text-slate-500"
              >
                Všichni
              </button>
            </div>
          </div>
        </>
      )}
      <button type="submit" className="btn-ocean w-full">Přidat výdaj</button>
    </form>
  )
}

export default function ExpensesPage() {
  const location = useLocation()
  const [showAdd, setShowAdd] = useState(() => !!location.state?.openAdd)
  const [showSettlement, setShowSettlement] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareSettlement = () => {
    if (!voyage) return
    const lines = [
      `⛵ ${voyage.name} — Vyúčtování`,
      `📅 ${voyage.startDate ? new Date(voyage.startDate).toLocaleDateString('cs') : ''} – ${voyage.endDate ? new Date(voyage.endDate).toLocaleDateString('cs') : ''}`,
      ``,
      `💰 Celkové náklady: ${formatCurrency(total, voyage.currency)}`,
      crew.length > 0 ? `👥 Na osobu: ${formatCurrency(total / crew.length, voyage.currency)}` : '',
      ``,
      `💸 Kdo komu zaplatí:`,
      ...transactions.map((t) => {
        const from = crew.find((c) => c.id === t.from)
        const to = crew.find((c) => c.id === t.to)
        return `  ${from?.name} → ${to?.name}: ${formatCurrency(t.amount, voyage.currency)}`
      }),
      transactions.length === 0 ? '  Vše vyrovnáno ✓' : '',
      ``,
      `📊 Výdaje podle kategorií:`,
      ...catTotals.map((c) => `  ${c.icon} ${c.label}: ${formatCurrency(c.total, voyage.currency)}`),
      ``,
      `Vygenerováno v SailMate`,
    ].filter((l) => l !== undefined).join('\n')

    if (navigator.share) {
      navigator.share({ title: `${voyage.name} — Vyúčtování`, text: lines })
    } else {
      navigator.clipboard.writeText(lines)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  const { voyages, activeVoyageId, expenses, deleteExpense } = useStore()
  const voyage = voyages.find((v) => v.id === activeVoyageId)
  const crew = voyage?.crew ?? []
  const voyageExpenses = expenses.filter((e) => e.voyageId === activeVoyageId)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  const total = voyageExpenses.reduce((s, e) => s + e.amount, 0)
  const { balance, transactions } = crew.length
    ? splitExpenses(voyageExpenses, crew)
    : { balance: {}, transactions: [] }

  const catTotals = EXPENSE_CATEGORIES.map((cat) => ({
    ...cat,
    total: voyageExpenses.filter((e) => e.category === cat.id).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total)

  if (!voyage) return <EmptyState />

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-navy-800 dark:text-white">Náklady</h1>
        <div className="flex gap-2">
          {voyageExpenses.length > 0 && (
            <button onClick={shareSettlement} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${copied ? 'bg-emerald-500 text-white' : 'btn-secondary'}`}>
              {copied ? <Check size={15} /> : <Share2 size={15} />}
              {copied ? 'Zkopírováno' : 'Sdílet'}
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="btn-ocean flex items-center gap-1.5">
            <Plus size={16} /> Přidat
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="card bg-gradient-to-br from-navy-800 to-navy-600 text-white">
        <p className="text-blue-200 text-xs mb-1">Celkové výdaje</p>
        <p className="text-3xl font-bold">{formatCurrency(total, voyage.currency)}</p>
        {crew.length > 0 && (
          <p className="text-blue-200 text-sm mt-1">
            {formatCurrency(total / crew.length, voyage.currency)} / osoba ({crew.length} lidí)
          </p>
        )}
        {catTotals.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {catTotals.slice(0, 4).map((c) => (
              <span key={c.id} className="badge bg-white/10 text-blue-100 text-xs px-2 py-1">
                {c.icon} {c.label}: {formatCurrency(c.total, voyage.currency)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Settlement */}
      {transactions.length > 0 && (
        <div>
          <button
            onClick={() => setShowSettlement((p) => !p)}
            className="w-full card flex items-center justify-between py-3 hover:border-amber-300 transition-colors"
          >
            <span className="font-semibold text-sm text-amber-700">💸 Vyúčtování ({transactions.length} plateb)</span>
            {showSettlement ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>
          {showSettlement && (
            <div className="card mt-1 space-y-2 border-amber-200 bg-amber-50">
              {transactions.map((t, i) => {
                const from = crew.find((c) => c.id === t.from)
                const to = crew.find((c) => c.id === t.to)
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-7 h-7 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 font-bold text-xs flex-shrink-0">
                      {from?.name[0]}
                    </div>
                    <span className="font-medium text-amber-900">{from?.name}</span>
                    <ArrowRight size={14} className="text-amber-400 flex-shrink-0" />
                    <span className="font-medium text-amber-900">{to?.name}</span>
                    <span className="ml-auto font-bold text-amber-800">{formatCurrency(t.amount, voyage.currency)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Per-person balance */}
      {crew.length > 0 && Object.keys(balance).length > 0 && (
        <div>
          <p className="section-title">Zůstatky</p>
          <div className="space-y-2">
            {crew.map((c) => {
              const b = balance[c.id] ?? 0
              return (
                <div key={c.id} className="card flex items-center gap-3 py-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ocean-400 to-navy-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {c.name[0]}
                  </div>
                  <span className="flex-1 text-sm font-medium">{c.name}</span>
                  <span className={`font-bold text-sm ${b > 0 ? 'text-emerald-600' : b < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    {b > 0 ? '+' : ''}{formatCurrency(b, voyage.currency)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Expense list */}
      <div>
        <p className="section-title">Výdaje ({voyageExpenses.length})</p>
        {voyageExpenses.length === 0 ? (
          <div className="card border-dashed border-2 flex flex-col items-center py-10 text-slate-400 cursor-pointer" onClick={() => setShowAdd(true)}>
            <Wallet size={32} className="mb-2 text-slate-200" />
            <p className="text-sm">Zatím žádné výdaje</p>
          </div>
        ) : (
          <div className="space-y-2">
            {voyageExpenses.map((exp) => {
              const payer = crew.find((c) => c.id === exp.paidBy)
              const cat = EXPENSE_CATEGORIES.find((c) => c.id === exp.category)
              return (
                <div key={exp.id} className="card flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg flex-shrink-0">
                    {cat?.icon ?? '💰'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{exp.description}</p>
                    <p className="text-xs text-slate-400">
                      {payer?.name ?? '—'} · {new Date(exp.date).toLocaleDateString('cs', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className="font-bold text-sm text-slate-800 flex-shrink-0">{formatCurrency(exp.amount, voyage.currency)}</span>
                  <button onClick={() => deleteExpense(exp.id)} className="p-1.5 text-slate-300 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showAdd && <AddExpenseModal voyage={voyage} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <Wallet size={48} className="text-slate-200 mb-4" />
      <p className="text-slate-500 font-medium">Žádná aktivní výprava</p>
    </div>
  )
}

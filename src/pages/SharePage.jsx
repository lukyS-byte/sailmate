import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Anchor, ArrowRight, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { splitExpenses, formatCurrency, EXPENSE_CATEGORIES } from '../utils/calc'

export default function SharePage() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('voyage_shares')
      .select('data')
      .eq('token', token)
      .maybeSingle()
      .then(({ data: row, error: err }) => {
        if (err || !row) setError('Odkaz neexistuje nebo vypršel.')
        else setData(row.data)
      })
  }, [token])

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div>
          <Anchor size={40} className="text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-900 to-ocean-700 flex items-center justify-center">
        <Loader2 size={32} className="text-white animate-spin" />
      </div>
    )
  }

  const { voyage, crew, expenses } = data
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const { balance, transactions } = crew.length
    ? splitExpenses(expenses, crew)
    : { balance: {}, transactions: [] }
  const catTotals = EXPENSE_CATEGORIES.map((cat) => ({
    ...cat,
    total: expenses.filter((e) => e.category === cat.id).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-navy-800 to-navy-600 text-white p-5 pt-10">
        <div className="flex items-center gap-2 mb-1">
          <Anchor size={16} className="text-ocean-400" />
          <span className="text-blue-200 text-xs font-medium uppercase tracking-wide">SailMate · Vyúčtování výpravy</span>
        </div>
        <h1 className="text-2xl font-bold mt-1">{voyage.name}</h1>
        {(voyage.startDate || voyage.endDate) && (
          <p className="text-blue-200 text-sm mt-0.5">
            {voyage.startDate ? new Date(voyage.startDate).toLocaleDateString('cs') : ''}{' '}
            {voyage.endDate ? `— ${new Date(voyage.endDate).toLocaleDateString('cs')}` : ''}
          </p>
        )}
        {voyage.boatName && <p className="text-blue-200 text-sm">⛵ {voyage.boatName}</p>}
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-blue-200 text-xs">Celkové náklady</p>
          <p className="text-3xl font-bold">{formatCurrency(total, voyage.currency)}</p>
          {crew.length > 0 && (
            <p className="text-blue-200 text-sm mt-1">{formatCurrency(total / crew.length, voyage.currency)} / osoba · {crew.length} lidí</p>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Settlement */}
        {transactions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">💸 Kdo komu zaplatí</p>
            <div className="card bg-amber-50 border-amber-200 space-y-2">
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
          </div>
        )}
        {transactions.length === 0 && crew.length > 0 && (
          <div className="card bg-emerald-50 border-emerald-200 text-center py-4">
            <p className="text-emerald-700 font-semibold">✅ Vše vyrovnáno</p>
          </div>
        )}

        {/* Per-person balance */}
        {crew.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Zůstatky</p>
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

        {/* Categories */}
        {catTotals.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Výdaje podle kategorií</p>
            <div className="card space-y-2">
              {catTotals.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{c.icon} {c.label}</span>
                  <span className="font-semibold">{formatCurrency(c.total, voyage.currency)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expense list */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Výdaje ({expenses.length})</p>
          <div className="space-y-2">
            {expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map((exp) => {
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
                </div>
              )
            })}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">Vygenerováno v SailMate</p>
      </div>
    </div>
  )
}

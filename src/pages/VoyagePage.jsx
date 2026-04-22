import { useState } from 'react'
import { Plus, Trash2, UserPlus, Anchor, Check, Share2, Copy, Pencil, Users2, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'

const HR_PORTS = [
  'Split','Trogir','Šibenik','Zadar','Biograd na Moru','Murter','Primošten',
  'Hvar','Korčula','Dubrovnik','Omiš','Makarska','Vis','Brač (Supetar)',
  'Rovinj','Pula','Mali Lošinj','Krk','Rab','Skradin','Tribunj',
]

function AddCrewModal({ voyageId, onClose }) {
  const addCrewMember = useStore((s) => s.addCrewMember)
  const [name, setName] = useState('')
  const [isSkipper, setIsSkipper] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    addCrewMember(voyageId, { name: name.trim(), isSkipper })
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Jméno</label>
        <input
          className="input"
          placeholder="Martin Novák"
          autoFocus
          value={name}
          onChange={(e) => {
            const val = e.target.value
            setName(val.replace(/(^|\s)\S/g, (c) => c.toUpperCase()))
          }}
          autoCapitalize="words"
          autoCorrect="off"
          required
        />
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setIsSkipper((p) => !p)}
          className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${isSkipper ? 'bg-ocean-500' : 'bg-slate-200'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isSkipper ? 'translate-x-4' : ''}`} />
        </div>
        <span className="text-sm font-medium">Kapitán ⚓</span>
      </label>
      <button type="submit" className="btn-ocean w-full">Přidat člena</button>
    </form>
  )
}

function EditVoyageModal({ voyage, onClose }) {
  const updateVoyage = useStore((s) => s.updateVoyage)
  const [form, setForm] = useState({
    name: voyage.name ?? '',
    startDate: voyage.startDate ?? '',
    endDate: voyage.endDate ?? '',
    boatName: voyage.boatName ?? '',
    boatModel: voyage.boatModel ?? '',
    boatLoa: voyage.boatLoa?.toString() ?? '',
    homePort: voyage.homePort ?? '',
    charterCost: voyage.charterCost?.toString() ?? '',
    currency: voyage.currency ?? 'EUR',
    budget: voyage.budget?.toString() ?? '',
    notes: voyage.notes ?? '',
  })
  const [showPortSuggestions, setShowPortSuggestions] = useState(false)
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    updateVoyage(voyage.id, {
      ...form,
      boatLoa: parseFloat(form.boatLoa) || voyage.boatLoa,
      charterCost: parseFloat(form.charterCost) || 0,
      budget: parseFloat(form.budget) || 0,
    })
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label">Název výpravy *</label>
        <input className="input" value={form.name} onChange={f('name')} required />
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
      <div>
        <label className="label">Jméno lodě</label>
        <input className="input" value={form.boatName} onChange={f('boatName')} />
      </div>
      <div>
        <label className="label">Typ / model lodě</label>
        <input className="input" value={form.boatModel} onChange={f('boatModel')} />
      </div>
      <div>
        <label className="label">LOA (m)</label>
        <input className="input" type="number" step="0.1" value={form.boatLoa} onChange={f('boatLoa')} />
      </div>
      <div className="relative">
        <label className="label">Výchozí přístav</label>
        <input
          className="input"
          value={form.homePort}
          autoComplete="off"
          onChange={(e) => { setForm((p) => ({ ...p, homePort: e.target.value })); setShowPortSuggestions(true) }}
        />
        {showPortSuggestions && form.homePort.length >= 1 && (
          <div className="absolute z-10 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg mt-1 overflow-hidden">
            {HR_PORTS.filter((p) => p.toLowerCase().includes(form.homePort.toLowerCase())).slice(0, 5).map((port) => (
              <button key={port} type="button"
                onClick={() => { setForm((p) => ({ ...p, homePort: port })); setShowPortSuggestions(false) }}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 last:border-0"
              >{port}</button>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Cena charteru</label>
          <input className="input" type="number" value={form.charterCost} onChange={f('charterCost')} />
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
      <div>
        <label className="label">Celkový rozpočet výpravy</label>
        <input className="input" type="number" placeholder="Volitelné" value={form.budget} onChange={f('budget')} />
      </div>
      <div>
        <label className="label">Poznámky</label>
        <textarea className="input" rows={2} value={form.notes} onChange={f('notes')} />
      </div>
      <button type="submit" className="btn-ocean w-full">Uložit změny</button>
    </form>
  )
}

export default function VoyagePage() {
  const [showAddCrew, setShowAddCrew] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [charterAdded, setCharterAdded] = useState(false)
  const [shared, setShared] = useState(false)
  const [inviteCode, setInviteCode] = useState(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncCount, setSyncCount] = useState(null)
  const navigate = useNavigate()
  const { voyages, activeVoyageId, updateVoyage, removeCrewMember, deleteVoyage, addExpense, expenses } = useStore()

  const charterAlreadyAdded = expenses.some(
    (e) => e.voyageId === activeVoyageId && e.category === 'charter'
  )

  const handleDelete = () => {
    deleteVoyage(activeVoyageId)
    navigate('/')
  }

  const generateInviteCode = async () => {
    if (!voyage) return
    const code = Math.random().toString(36).substr(2, 6).toUpperCase()
    setInviteCode(code)
    const { data: { session } } = await supabase.auth.getSession()
    supabase.from('voyage_invites').upsert({
      code,
      owner_id: session.user.id,
      voyage_data: voyage,
      updated_at: new Date().toISOString(),
    }).then(({ error }) => { if (error) console.error('invite upsert:', error.message) })
  }

  const copyInviteLink = () => {
    const url = `${window.location.origin}/join?code=${inviteCode}`
    navigator.clipboard.writeText(url)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2500)
  }

  const syncCrewExpenses = async () => {
    if (!inviteCode) return
    setSyncing(true)
    const { data } = await supabase
      .from('crew_expenses')
      .select('*')
      .eq('code', inviteCode)
    setSyncing(false)
    if (!data?.length) { setSyncCount(0); return }
    const existingIds = expenses.map((e) => e.crewExpenseId).filter(Boolean)
    const newOnes = data.filter((row) => !existingIds.includes(row.id))
    newOnes.forEach((row) => addExpense({ ...row.data, crewExpenseId: row.id }))
    setSyncCount(newOnes.length)
    setTimeout(() => setSyncCount(null), 3000)
  }

  const handleShare = async () => {
    if (!voyage) return
    const token = crypto.randomUUID()
    const voyageExpenses = expenses.filter((e) => e.voyageId === activeVoyageId)
    await supabase.from('voyage_shares').upsert({
      token,
      data: { voyage, crew: voyage.crew ?? [], expenses: voyageExpenses },
    })
    const url = `${window.location.origin}/share/${token}`
    if (navigator.share) {
      navigator.share({ title: `${voyage.name} — Vyúčtování`, url })
    } else {
      navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 2500)
    }
  }

  const voyage = voyages.find((v) => v.id === activeVoyageId)

  if (!voyage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <Anchor size={48} className="text-slate-200 mb-4" />
        <p className="text-slate-500 font-medium">Žádná aktivní výprava</p>
        <p className="text-sm text-slate-400 mt-1">Vytvoř novou výpravu na přehledu</p>
      </div>
    )
  }

  const statuses = [
    { id: 'planning', label: 'Plánování', color: 'bg-slate-100 text-slate-600' },
    { id: 'active', label: '⛵ Plavba', color: 'bg-ocean-100 text-ocean-700' },
    { id: 'completed', label: '✅ Dokončeno', color: 'bg-emerald-100 text-emerald-700' },
  ]

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-navy-800 dark:text-white">Výprava</h1>
        <button
          onClick={() => updateVoyage(voyage.id, { status: statuses[(statuses.findIndex((s) => s.id === voyage.status) + 1) % 3].id })}
          className={`badge text-sm px-3 py-1 cursor-pointer ${statuses.find((s) => s.id === voyage.status)?.color ?? 'bg-slate-100 text-slate-600'}`}
        >
          {statuses.find((s) => s.id === voyage.status)?.label ?? 'Plánování'}
        </button>
      </div>

      {/* Voyage info card */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-navy-800 dark:text-white">{voyage.name}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              <Pencil size={12} /> Upravit
            </button>
            <button
              onClick={handleShare}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${shared ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
            >
              {shared ? <><Copy size={12} /> Zkopírováno</> : <><Share2 size={12} /> Sdílet</>}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoRow label="Loď" value={voyage.boatName || '—'} />
          <InfoRow label="LOA" value={voyage.boatLoa ? `${voyage.boatLoa} m` : '—'} />
          <InfoRow label="Od" value={voyage.startDate ? new Date(voyage.startDate).toLocaleDateString('cs') : '—'} />
          <InfoRow label="Do" value={voyage.endDate ? new Date(voyage.endDate).toLocaleDateString('cs') : '—'} />
          <InfoRow label="Výchozí přístav" value={voyage.homePort || '—'} />
          <InfoRow label="Charter" value={voyage.charterCost ? `${voyage.charterCost} ${voyage.currency}` : '—'} />
        </div>
        {voyage.notes && <p className="text-sm text-slate-500 bg-slate-50 dark:bg-slate-700 dark:text-slate-300 rounded-xl p-3">{voyage.notes}</p>}
      </div>

      {/* Crew */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="section-title mb-0">Posádka ({voyage.crew?.length ?? 0})</p>
          <button onClick={() => setShowAddCrew(true)} className="btn-ocean flex items-center gap-1 text-xs py-1.5">
            <UserPlus size={14} /> Přidat
          </button>
        </div>
        <div className="space-y-2">
          {(voyage.crew ?? []).length === 0 && (
            <div
              className="card border-dashed border-2 flex items-center justify-center py-8 cursor-pointer text-slate-400"
              onClick={() => setShowAddCrew(true)}
            >
              <Plus size={16} className="mr-2" /> Přidej členy posádky
            </div>
          )}
          {(voyage.crew ?? []).map((member) => (
            <div key={member.id} className="card flex items-center gap-3 py-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ocean-400 to-navy-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {member.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{member.name}</p>
                <p className="text-xs text-slate-400">{member.isSkipper ? '⚓ Kapitán' : 'Posádka'}</p>
              </div>
              <button onClick={() => removeCrewMember(voyage.id, member.id)} className="p-2 text-slate-300 hover:text-red-400 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Charter split hint */}
      {voyage.charterCost > 0 && voyage.crew?.length > 0 && (
        <div className="card bg-amber-50 border-amber-200">
          <p className="text-xs font-semibold text-amber-700 mb-1">⛵ Rozdělení charteru</p>
          <p className="text-sm text-amber-800">
            {voyage.charterCost} {voyage.currency} ÷ {voyage.crew.length} osob ={' '}
            <span className="font-bold">{Math.ceil(voyage.charterCost / voyage.crew.length)} {voyage.currency}/osoba</span>
          </p>
          <button
            onClick={() => {
              if (charterAlreadyAdded) return
              addExpense({
                voyageId: voyage.id,
                description: `Charter ${voyage.boatName || voyage.boatModel || ''}`.trim(),
                amount: voyage.charterCost,
                currency: voyage.currency,
                category: 'charter',
                paidBy: voyage.crew.find((c) => c.isSkipper)?.id ?? voyage.crew[0].id,
                splitAmong: voyage.crew.map((c) => c.id),
                date: voyage.startDate || new Date().toISOString().slice(0, 10),
              })
              setCharterAdded(true)
            }}
            className={`mt-3 w-full rounded-xl py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              charterAlreadyAdded || charterAdded
                ? 'bg-emerald-100 text-emerald-700 cursor-default'
                : 'bg-amber-200 text-amber-800 hover:bg-amber-300'
            }`}
          >
            {charterAlreadyAdded || charterAdded ? <><Check size={14} /> Přidáno do vyúčtování</> : '+ Přidat do vyúčtování'}
          </button>
        </div>
      )}

      {/* Crew invite */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <Users2 size={16} className="text-ocean-500" />
          <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">Pozvat posádku</p>
        </div>
        {!inviteCode ? (
          <button onClick={generateInviteCode} className="btn-ocean w-full text-sm">
            Vygenerovat kód
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-50 dark:bg-slate-700 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-bold tracking-widest text-navy-800 dark:text-white">{inviteCode}</p>
              </div>
              <button
                onClick={copyInviteLink}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-medium transition-all ${codeCopied ? 'bg-emerald-100 text-emerald-700' : 'bg-ocean-500 text-white'}`}
              >
                {codeCopied ? <><Check size={14} /> Zkopírováno</> : <><Copy size={14} /> Kopírovat odkaz</>}
              </button>
            </div>
            <p className="text-xs text-slate-400 text-center">Pošli odkaz posádce — přidají výdaje přes prohlížeč</p>
            <button
              onClick={syncCrewExpenses}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-ocean-200 text-ocean-600 py-2 text-sm font-medium hover:bg-ocean-50 transition-colors"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Načítám...' : syncCount !== null ? `Načteno ${syncCount} nových výdajů` : 'Načíst výdaje posádky'}
            </button>
          </div>
        )}
      </div>

      {/* Delete voyage */}
      <button
        onClick={() => setConfirmDelete(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 text-red-500 py-2.5 text-sm font-medium hover:bg-red-50 transition-colors"
      >
        <Trash2 size={15} /> Smazat výpravu
      </button>

      {showEdit && (
        <Modal title="Upravit výpravu" onClose={() => setShowEdit(false)}>
          <EditVoyageModal voyage={voyage} onClose={() => setShowEdit(false)} />
        </Modal>
      )}

      {showAddCrew && (
        <Modal title="Přidat člena posádky" onClose={() => setShowAddCrew(false)}>
          <AddCrewModal voyageId={voyage.id} onClose={() => setShowAddCrew(false)} />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Smazat výpravu?" onClose={() => setConfirmDelete(false)} size="sm">
          <p className="text-sm text-slate-600 mb-4">
            Smažou se všechna data výpravy <strong>{voyage.name}</strong> — posádka, výdaje, trasa i záznamy. Tato akce je nevratná.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="btn-secondary flex-1">Zrušit</button>
            <button onClick={handleDelete} className="flex-1 bg-red-500 text-white rounded-xl px-4 py-2.5 font-medium text-sm">Smazat</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{value}</p>
    </div>
  )
}

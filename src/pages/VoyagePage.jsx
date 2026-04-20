import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, UserPlus, Anchor } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import Modal from '../components/Modal'

function AddCrewModal({ voyageId, onClose }) {
  const addCrewMember = useStore((s) => s.addCrewMember)
  const [name, setName] = useState('')
  const [isSkipper, setIsSkipper] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(t)
  }, [])

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
          ref={inputRef}
          className="input"
          placeholder="Martin Novák"
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

export default function VoyagePage() {
  const [showAddCrew, setShowAddCrew] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const navigate = useNavigate()
  const { voyages, activeVoyageId, updateVoyage, removeCrewMember, deleteVoyage } = useStore()

  const handleDelete = () => {
    deleteVoyage(activeVoyageId)
    navigate('/')
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
        <h1 className="text-xl font-bold text-navy-800">Výprava</h1>
        <button
          onClick={() => updateVoyage(voyage.id, { status: statuses[(statuses.findIndex((s) => s.id === voyage.status) + 1) % 3].id })}
          className={`badge text-sm px-3 py-1 cursor-pointer ${statuses.find((s) => s.id === voyage.status)?.color ?? 'bg-slate-100 text-slate-600'}`}
        >
          {statuses.find((s) => s.id === voyage.status)?.label ?? 'Plánování'}
        </button>
      </div>

      {/* Voyage info card */}
      <div className="card space-y-4">
        <h2 className="font-bold text-lg text-navy-800">{voyage.name}</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoRow label="Loď" value={voyage.boatName || '—'} />
          <InfoRow label="LOA" value={voyage.boatLoa ? `${voyage.boatLoa} m` : '—'} />
          <InfoRow label="Od" value={voyage.startDate ? new Date(voyage.startDate).toLocaleDateString('cs') : '—'} />
          <InfoRow label="Do" value={voyage.endDate ? new Date(voyage.endDate).toLocaleDateString('cs') : '—'} />
          <InfoRow label="Výchozí přístav" value={voyage.homePort || '—'} />
          <InfoRow label="Charter" value={voyage.charterCost ? `${voyage.charterCost} ${voyage.currency}` : '—'} />
        </div>
        {voyage.notes && <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-3">{voyage.notes}</p>}
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
              <button
                onClick={() => removeCrewMember(voyage.id, member.id)}
                className="p-2 text-slate-300 hover:text-red-400 transition-colors"
              >
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
          <p className="text-xs text-amber-600 mt-1">Přidej charter jako výdaj v záložce Náklady pro automatické vyúčtování.</p>
        </div>
      )}

      {/* Delete voyage */}
      <button
        onClick={() => setConfirmDelete(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 text-red-500 py-2.5 text-sm font-medium hover:bg-red-50 transition-colors"
      >
        <Trash2 size={15} /> Smazat výpravu
      </button>

      {showAddCrew && <AddCrewModal voyageId={voyage.id} onClose={() => setShowAddCrew(false)} />}

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
      <p className="font-medium text-slate-800 truncate">{value}</p>
    </div>
  )
}

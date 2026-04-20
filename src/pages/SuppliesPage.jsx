import { useState } from 'react'
import { Plus, Trash2, ShoppingCart, Check } from 'lucide-react'
import useStore from '../store/useStore'
import Modal from '../components/Modal'

const SUPPLY_CATEGORIES = [
  { id: 'food', label: 'Jídlo', icon: '🥘', color: 'bg-orange-100 text-orange-700' },
  { id: 'drinks', label: 'Nápoje', icon: '🍺', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'safety', label: 'Bezpečnost', icon: '🦺', color: 'bg-red-100 text-red-700' },
  { id: 'equipment', label: 'Vybavení', icon: '🔧', color: 'bg-blue-100 text-blue-700' },
  { id: 'hygiene', label: 'Hygiena', icon: '🧴', color: 'bg-pink-100 text-pink-700' },
  { id: 'other', label: 'Ostatní', icon: '📦', color: 'bg-slate-100 text-slate-700' },
]

const DEFAULT_LISTS = {
  food: ['Snídaně × 7', 'Pasta × 3', 'Rýže × 2', 'Konzervy', 'Sýry & uzeniny', 'Zelenina', 'Ovoce', 'Chléb', 'Vejce', 'Olej, sůl, koření'],
  drinks: ['Voda (na osobu 3l/den)', 'Pivo', 'Víno', 'Džusy', 'Káva, čaj', 'Soft drinks'],
  safety: ['Záchranné vesty (kontrola)', 'Světlice', 'Lékárnička', 'Signální zrcadlo', 'Záložní VHF', 'MOB vybavení'],
  equipment: ['Slunečník', 'Snorkeling sady', 'Ložní prádlo', 'Ručníky', 'Repelent', 'Opalovací krém'],
  hygiene: ['Šampon', 'Mýdlo', 'Zubní kartáčky', 'WC papír', 'Prací prášek'],
}

function AddSupplyModal({ voyageId, onClose }) {
  const { addSupply, getVoyageSupplies } = useStore()
  const existing = getVoyageSupplies(voyageId)
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [category, setCategory] = useState('food')
  const [activePreset, setActivePreset] = useState(null)

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    addSupply({ voyageId, name: name.trim(), quantity: qty, category })
    setName('')
    setQty('')
  }

  const addPreset = (cat) => {
    const items = DEFAULT_LISTS[cat] ?? []
    const existingNames = new Set(existing.map((x) => x.name.toLowerCase()))
    items.forEach((item) => {
      if (!existingNames.has(item.toLowerCase())) {
        addSupply({ voyageId, name: item, quantity: '', category: cat })
      }
    })
    onClose()
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Položka</label>
            <input className="input" placeholder="Olivový olej" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Množství</label>
            <input className="input" placeholder="2× 1L" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div>
            <label className="label">Kategorie</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {SUPPLY_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className="btn-ocean w-full" disabled={!name.trim()}>
          + Přidat položku
        </button>
      </form>
      <div>
        <p className="section-title">Nebo přidej celý seznam</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(DEFAULT_LISTS).map(([cat, items]) => {
            const sc = SUPPLY_CATEGORIES.find((c) => c.id === cat)
            return (
              <button
                key={cat}
                onClick={() => addPreset(cat)}
                className="card text-left hover:border-ocean-300 transition-colors py-3"
              >
                <p className="text-sm font-medium">{sc?.icon} {sc?.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{items.length} položek</p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function SuppliesPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [filterCat, setFilterCat] = useState('all')
  const { voyages, activeVoyageId, getVoyageSupplies, toggleSupply, deleteSupply } = useStore()
  const voyage = voyages.find((v) => v.id === activeVoyageId)
  const all = getVoyageSupplies(activeVoyageId)
  const supplies = filterCat === 'all' ? all : all.filter((x) => x.category === filterCat)
  const checked = all.filter((x) => x.checked).length

  if (!voyage) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <ShoppingCart size={48} className="text-slate-200 mb-4" />
      <p className="text-slate-500 font-medium">Žádná aktivní výprava</p>
    </div>
  )

  const grouped = SUPPLY_CATEGORIES.map((cat) => ({
    ...cat,
    items: supplies.filter((x) => x.category === cat.id),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-navy-800">Zásoby</h1>
          {all.length > 0 && (
            <p className="text-xs text-slate-400">{checked}/{all.length} zabaleno</p>
          )}
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-ocean flex items-center gap-1.5">
          <Plus size={16} /> Přidat
        </button>
      </div>

      {/* Progress bar */}
      {all.length > 0 && (
        <div className="card py-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Připravenost</span>
            <span className="font-semibold">{Math.round((checked / all.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-ocean-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(checked / all.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Category filter */}
      {all.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          <button
            onClick={() => setFilterCat('all')}
            className={`flex-shrink-0 badge text-sm px-3 py-1.5 ${filterCat === 'all' ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Vše ({all.length})
          </button>
          {SUPPLY_CATEGORIES.filter((c) => all.some((x) => x.category === c.id)).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCat(cat.id)}
              className={`flex-shrink-0 badge text-sm px-3 py-1.5 ${filterCat === cat.id ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {cat.icon} {all.filter((x) => x.category === cat.id).length}
            </button>
          ))}
        </div>
      )}

      {/* Supply items grouped by category */}
      {all.length === 0 ? (
        <div
          className="card border-dashed border-2 flex flex-col items-center py-12 text-slate-400 cursor-pointer"
          onClick={() => setShowAdd(true)}
        >
          <ShoppingCart size={36} className="mb-2 text-slate-200" />
          <p className="text-sm">Žádné zásoby</p>
          <p className="text-xs mt-1">Přidej položky nebo použij předpřipravené seznamy</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.id}>
              <p className="section-title">{group.icon} {group.label} ({group.items.filter((x) => x.checked).length}/{group.items.length})</p>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className={`card flex items-center gap-3 py-3 transition-opacity ${item.checked ? 'opacity-50' : ''}`}
                  >
                    <button
                      onClick={() => toggleSupply(item.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                      }`}
                    >
                      {item.checked && <Check size={12} className="text-white" strokeWidth={3} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${item.checked ? 'line-through text-slate-400' : ''}`}>{item.name}</p>
                      {item.quantity && <p className="text-xs text-slate-400">{item.quantity}</p>}
                    </div>
                    <button onClick={() => deleteSupply(item.id)} className="p-1.5 text-slate-300 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddSupplyModal voyageId={activeVoyageId} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

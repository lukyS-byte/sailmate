import { useState } from 'react'
import { UserPlus, Plus, Check, X } from 'lucide-react'
import { ROLES, getRole, makeCustomRole } from '../lib/roles'
import useStore from '../store/useStore'
import Modal from './Modal'

// ── Badge zobrazující jednu roli ──────────────────────────────────────────
export function RoleBadge({ role, onRemove, compact }) {
  const r = getRole(role)
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 ${compact ? 'py-0.5 text-[10px]' : 'py-1 text-xs'} font-medium ${r.color}`}>
      <span>{r.icon}</span>
      <span>{r.label}</span>
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:text-red-600" title="Odebrat">
          <X size={compact ? 10 : 11} />
        </button>
      )}
    </span>
  )
}

// ── Modal: Kdo jsi? (první vstup posádky přes kód) ────────────────────────
export function CrewIdentityModal({ voyage, onSelected }) {
  const addCrewMember = useStore((s) => s.addCrewMember)
  const setCrewMemberId = useStore((s) => s.setCrewMemberId)
  const [mode, setMode] = useState('pick')  // 'pick' | 'new'
  const [name, setName] = useState('')
  const crew = voyage.crew ?? []

  const pickExisting = (memberId) => {
    setCrewMemberId(memberId)
    onSelected?.(memberId)
  }

  const createNew = (e) => {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) return
    // addCrewMember generuje id uvnitř store — musíme si ho zjistit z updated state
    addCrewMember(voyage.id, { name: clean, isSkipper: false, roles: [] })
    // Najdi posledního přidaného člena (se stejným jménem) — nejjednodušeji po setTimeoutu
    setTimeout(() => {
      const s = useStore.getState()
      const v = s.voyages.find((x) => x.id === voyage.id)
      const me = (v?.crew ?? []).slice().reverse().find((c) => c.name === clean)
      if (me) { setCrewMemberId(me.id); onSelected?.(me.id) }
    }, 50)
  }

  return (
    <Modal title="Kdo jsi?" onClose={() => {}} hideClose>
      <div className="space-y-3">
        {mode === 'pick' ? (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Vyber se ze seznamu, nebo přidej nového člena.
            </p>
            {crew.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {crew.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => pickExisting(c.id)}
                    className="w-full flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-left hover:border-ocean-400 hover:bg-ocean-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ocean-400 to-navy-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {c.isSkipper ? '⚓ Kapitán' : ((c.roles ?? []).length > 0 ? `${c.roles.length} funkcí` : 'Bez funkce')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Kapitán zatím nikoho nepřidal.</p>
            )}
            <button
              onClick={() => setMode('new')}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 py-3 text-sm text-slate-500 hover:border-ocean-400 hover:text-ocean-600"
            >
              <UserPlus size={14} /> Jsem nový — přidat mě
            </button>
          </>
        ) : (
          <form onSubmit={createNew} className="space-y-3">
            <div>
              <label className="label">Tvoje jméno</label>
              <input
                className="input"
                placeholder="Martin Novák"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value.replace(/(^|\s)\S/g, (c) => c.toUpperCase()))}
                required
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode('pick')} className="btn-secondary flex-1">Zpět</button>
              <button type="submit" className="btn-ocean flex-1">Pokračovat</button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}

// ── Modal: Výběr role (pro žádost nebo přidělení) ─────────────────────────
export function RolePickerModal({ title, existingRoles = [], onPick, onClose, actionLabel = 'Zvolit' }) {
  const [customLabel, setCustomLabel] = useState('')
  const existingIds = new Set(existingRoles.map((r) => (typeof r === 'string' ? r : r.id)))

  const handleCustom = (e) => {
    e.preventDefault()
    const role = makeCustomRole(customLabel)
    if (role) { onPick(role); onClose() }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3">
        <p className="section-label mb-1">Nabídnuté funkce</p>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map((r) => {
            const taken = existingIds.has(r.id)
            return (
              <button
                key={r.id}
                disabled={taken}
                onClick={() => { onPick(r.id); onClose() }}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm ${
                  taken
                    ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200'
                    : `${r.color} hover:shadow`
                }`}
              >
                <span className="text-lg">{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold leading-tight">{r.label}</p>
                  {taken && <p className="text-[10px] leading-tight opacity-80">již má</p>}
                </div>
              </button>
            )
          })}
        </div>
        <form onSubmit={handleCustom} className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
          <p className="section-label mb-1">Vlastní funkce</p>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="např. Baristka, Fotograf, Překladatel…"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              maxLength={30}
            />
            <button type="submit" disabled={!customLabel.trim()} className="btn-ocean disabled:bg-slate-300">
              <Plus size={14} />
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

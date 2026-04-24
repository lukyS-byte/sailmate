// Katalog funkcí na lodi. Custom role má id ve tvaru "custom:<slug>".

export const ROLES = [
  { id: 'captain',     label: 'Kapitán',      icon: '⚓', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'navigator',   label: 'Navigátor',    icon: '🧭', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'helmsman',    label: 'Kormidelník',  icon: '🛞', color: 'bg-ocean-100 text-ocean-800 border-ocean-200' },
  { id: 'cook',        label: 'Kuchař',       icon: '👨‍🍳', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'engineer',    label: 'Motorář',      icon: '🔧', color: 'bg-slate-200 text-slate-800 border-slate-300' },
  { id: 'sailtrimmer', label: 'Plachtař',     icon: '⛵', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'logkeeper',   label: 'Lodník',       icon: '📋', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'safety',      label: 'Bezpečák',     icon: '🦺', color: 'bg-red-100 text-red-800 border-red-200' },
]

// Najdi roli podle id. Pro "custom:..." vrátí objekt s custom labelem.
export function getRole(role) {
  // role může být string id nebo objekt { id, label } (custom)
  if (typeof role === 'object' && role?.id?.startsWith('custom:')) {
    return {
      id: role.id,
      label: role.label ?? role.id.slice(7),
      icon: role.icon ?? '📌',
      color: 'bg-slate-100 text-slate-800 border-slate-200',
    }
  }
  const id = typeof role === 'string' ? role : role?.id
  return ROLES.find((r) => r.id === id) ?? {
    id,
    label: id ?? '—',
    icon: '📌',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  }
}

export function makeCustomRole(label) {
  const clean = (label ?? '').trim()
  if (!clean) return null
  const slug = clean.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)
  return { id: `custom:${slug}-${Date.now().toString(36)}`, label: clean, icon: '📌' }
}

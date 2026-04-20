import { useState } from 'react'
import { Plus, Trash2, BookOpen, Wind, Gauge, Fuel, Phone, Anchor, Search } from 'lucide-react'
import useStore from '../store/useStore'
import { formatCurrency } from '../utils/calc'
import Modal from '../components/Modal'

// ── Emergency contacts ───────────────────────────────────────
const EMERGENCY = [
  {
    country: 'Chorvatsko 🇭🇷',
    contacts: [
      { label: 'MRCC Split (záchrana na moři)', number: '195', type: 'sos' },
      { label: 'Záchranná služba', number: '112', type: 'sos' },
      { label: 'Policie', number: '192', type: 'police' },
      { label: 'VHF kanál', number: '16', type: 'vhf' },
    ],
  },
  {
    country: 'Řecko 🇬🇷',
    contacts: [
      { label: 'Pobřežní stráž', number: '108', type: 'sos' },
      { label: 'Záchranná služba', number: '112', type: 'sos' },
      { label: 'MRCC Pireus', number: '+30 210 4191101', type: 'sos' },
      { label: 'VHF kanál', number: '16', type: 'vhf' },
    ],
  },
  {
    country: 'Itálie 🇮🇹',
    contacts: [
      { label: 'Guardia Costiera', number: '1530', type: 'sos' },
      { label: 'Záchranná služba', number: '112', type: 'sos' },
      { label: 'VHF kanál', number: '16', type: 'vhf' },
    ],
  },
  {
    country: 'Černá Hora 🇲🇪',
    contacts: [
      { label: 'Záchranná služba', number: '112', type: 'sos' },
      { label: 'Námořní záchrana', number: '+382 30 311 644', type: 'sos' },
      { label: 'VHF kanál', number: '16', type: 'vhf' },
    ],
  },
  {
    country: 'Španělsko 🇪🇸',
    contacts: [
      { label: 'Salvamento Marítimo', number: '900 202 202', type: 'sos' },
      { label: 'Záchranná služba', number: '112', type: 'sos' },
      { label: 'VHF kanál', number: '16', type: 'vhf' },
    ],
  },
]

// ── Marina database ──────────────────────────────────────────
const MARINAS = [
  // Chorvatsko
  { name: 'ACI Marina Split', country: 'HR', city: 'Split', lat: 43.505, lng: 16.439, depth: 3.5, price: 55, water: true, power: true, wifi: true, fuel: true, notes: 'Centrum města, pěší dostupnost' },
  { name: 'ACI Marina Hvar', country: 'HR', city: 'Hvar', lat: 43.172, lng: 16.441, depth: 4, price: 60, water: true, power: true, wifi: true, fuel: false, notes: 'Nejrušnější chorvatský přístav' },
  { name: 'ACI Marina Korčula', country: 'HR', city: 'Korčula', lat: 42.96, lng: 17.135, depth: 4, price: 48, water: true, power: true, wifi: true, fuel: false, notes: 'Krásné staré město' },
  { name: 'ACI Marina Dubrovnik', country: 'HR', city: 'Dubrovník', lat: 42.648, lng: 18.077, depth: 5, price: 75, water: true, power: true, wifi: true, fuel: true, notes: 'Drahý, rezervuj předem' },
  { name: 'Marina Šibenik', country: 'HR', city: 'Šibenik', lat: 43.737, lng: 15.896, depth: 4, price: 45, water: true, power: true, wifi: true, fuel: true, notes: 'Vstup řekou Krka' },
  { name: 'ACI Marina Rovinj', country: 'HR', city: 'Rovinj', lat: 45.079, lng: 13.637, depth: 3.5, price: 52, water: true, power: true, wifi: true, fuel: false, notes: 'Istrie, romantické město' },
  { name: 'Marina Primošten', country: 'HR', city: 'Primošten', lat: 43.587, lng: 15.922, depth: 3, price: 38, water: true, power: true, wifi: false, fuel: false, notes: 'Klidnější alternativa k Splitu' },
  { name: 'ACI Marina Trogir', country: 'HR', city: 'Trogir', lat: 43.517, lng: 16.249, depth: 4, price: 50, water: true, power: true, wifi: true, fuel: true, notes: 'UNESCO, 7 km od Splitu' },
  { name: 'Palača Hvar (kotviště)', country: 'HR', city: 'Hvar (kotviště)', lat: 43.176, lng: 16.455, depth: 6, price: 0, water: false, power: false, wifi: false, fuel: false, notes: 'Zdarma, bójky €5-10' },
  // Řecko
  { name: 'Marina Lefkada', country: 'GR', city: 'Lefkada', lat: 38.833, lng: 20.706, depth: 5, price: 30, water: true, power: true, wifi: true, fuel: true, notes: 'Výchozí bod Iónie' },
  { name: 'Marina Fiskardo', country: 'GR', city: 'Kefalónia', lat: 38.464, lng: 20.578, depth: 4, price: 20, water: true, power: false, wifi: false, fuel: false, notes: 'Malebná vesnice, zakotvit na bójce' },
  { name: 'Port Gaios (Paxos)', country: 'GR', city: 'Paxos', lat: 39.196, lng: 20.162, depth: 3.5, price: 15, water: true, power: false, wifi: false, fuel: false, notes: 'Tiché kotviště' },
  { name: 'Marina Corfu (Gouvia)', country: 'GR', city: 'Korfu', lat: 39.649, lng: 19.839, depth: 4, price: 40, water: true, power: true, wifi: true, fuel: true, notes: 'Největší marina Korfú' },
  { name: 'Marina Zea (Pireus)', country: 'GR', city: 'Athény', lat: 37.934, lng: 23.636, depth: 6, price: 55, water: true, power: true, wifi: true, fuel: true, notes: 'Hlavní marina Athén' },
]

// ── Fuel calculator ─────────────────────────────────────────
function FuelTab() {
  const { voyages, activeVoyageId, addExpense } = useStore()
  const voyage = voyages.find((v) => v.id === activeVoyageId)
  const [consumption, setConsumption] = useState('8')
  const [hours, setHours] = useState('10')
  const [pricePerL, setPricePerL] = useState('1.80')
  const [added, setAdded] = useState(false)

  const liters = parseFloat(consumption) * parseFloat(hours) || 0
  const total = liters * parseFloat(pricePerL) || 0

  const addAsExpense = () => {
    if (!voyage || !total) return
    addExpense({
      voyageId: voyage.id,
      description: `Palivo (${liters.toFixed(0)} l)`,
      amount: Math.round(total * 100) / 100,
      currency: voyage.currency ?? 'EUR',
      category: 'fuel',
      paidBy: voyage.crew?.[0]?.id ?? '',
      splitAmong: voyage.crew?.map((c) => c.id) ?? [],
      date: new Date().toISOString().slice(0, 10),
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="space-y-5">
      <div className="card bg-gradient-to-br from-orange-50 to-amber-50 border-amber-200">
        <p className="text-xs text-amber-600 font-medium mb-3">⛽ Kalkulačka paliva</p>
        <div className="space-y-3">
          <div>
            <label className="label">Spotřeba motoru (l/hod)</label>
            <input className="input" type="number" step="0.5" value={consumption} onChange={(e) => setConsumption(e.target.value)} />
            <p className="text-xs text-slate-400 mt-1">Typicky: 4T motor = 5–8 l/h, 5T = 7–10 l/h</p>
          </div>
          <div>
            <label className="label">Plánované motorové hodiny</label>
            <input className="input" type="number" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
          <div>
            <label className="label">Cena nafty (€/litr)</label>
            <input className="input" type="number" step="0.05" value={pricePerL} onChange={(e) => setPricePerL(e.target.value)} />
            <p className="text-xs text-slate-400 mt-1">Chorvatsko ~1.7€, Řecko ~1.9€, Itálie ~2.0€</p>
          </div>
        </div>
      </div>

      <div className="card border-2 border-amber-300 bg-amber-50">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-amber-700">{liters.toFixed(0)} l</p>
            <p className="text-xs text-amber-600">Celkem litrů</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-700">{formatCurrency(total, voyage?.currency ?? 'EUR')}</p>
            <p className="text-xs text-amber-600">Celková cena</p>
          </div>
        </div>
        {voyage?.crew?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-amber-200 text-center">
            <p className="text-sm text-amber-700">
              {formatCurrency(total / voyage.crew.length, voyage.currency)} / osoba ({voyage.crew.length} lidí)
            </p>
          </div>
        )}
      </div>

      {voyage && (
        <button onClick={addAsExpense} className={`w-full rounded-xl px-4 py-3 font-medium text-sm transition-all ${added ? 'bg-emerald-500 text-white' : 'btn-ocean'}`}>
          {added ? '✓ Přidáno do výdajů' : '+ Přidat jako výdaj výpravy'}
        </button>
      )}
    </div>
  )
}

// ── SOS tab ─────────────────────────────────────────────────
function SOSTab() {
  const typeColor = {
    sos: 'bg-red-100 text-red-700 border-red-200',
    police: 'bg-blue-100 text-blue-700 border-blue-200',
    vhf: 'bg-purple-100 text-purple-700 border-purple-200',
  }
  return (
    <div className="space-y-4">
      <div className="card bg-red-50 border-red-300">
        <p className="font-bold text-red-700 text-sm">🆘 V nouzi vždy nejdřív:</p>
        <p className="text-red-600 text-sm mt-1">1. VHF kanál <strong>16</strong> — mayday volání</p>
        <p className="text-red-600 text-sm">2. Telefonní číslo <strong>112</strong> — EU tísňová linka</p>
        <p className="text-red-600 text-sm">3. Světlice — aktivuj pouze pokud vidíš záchranáře</p>
      </div>
      {EMERGENCY.map((country) => (
        <div key={country.country} className="card">
          <p className="font-semibold text-sm mb-2">{country.country}</p>
          <div className="space-y-1.5">
            {country.contacts.map((c, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-slate-600">{c.label}</span>
                <a
                  href={c.type === 'vhf' ? undefined : `tel:${c.number.replace(/\s/g, '')}`}
                  className={`badge text-sm px-2.5 py-1 border font-bold ${typeColor[c.type]}`}
                >
                  {c.type === 'vhf' ? `VHF ${c.number}` : c.number}
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="card bg-blue-50 border-blue-200">
        <p className="text-xs font-semibold text-blue-700 mb-2">📻 VHF protokol — Mayday</p>
        <p className="text-xs text-blue-600 font-mono leading-relaxed">
          "MAYDAY MAYDAY MAYDAY<br/>
          Here is [název lodě] [3×]<br/>
          MAYDAY [název lodě]<br/>
          Position: [GPS nebo popis]<br/>
          [Popis nouze]<br/>
          [Počet osob na palubě]<br/>
          Over."
        </p>
      </div>
    </div>
  )
}

// ── Marina guide tab ────────────────────────────────────────
function MarinaTab() {
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('all')

  const filtered = MARINAS.filter((m) => {
    const matchCountry = country === 'all' || m.country === country
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.city.toLowerCase().includes(search.toLowerCase())
    return matchCountry && matchSearch
  })

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-8" placeholder="Hvar, Split..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-28" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="all">Vše</option>
          <option value="HR">🇭🇷 HR</option>
          <option value="GR">🇬🇷 GR</option>
        </select>
      </div>
      <div className="space-y-2">
        {filtered.map((m) => (
          <div key={m.name} className="card py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{m.name}</p>
                <p className="text-xs text-slate-400">{m.city}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-sm text-navy-800">{m.price > 0 ? `~${m.price}€/noc` : 'Zdarma'}</p>
                <p className="text-xs text-slate-400">hloubka {m.depth}m</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {m.water && <span className="badge bg-blue-50 text-blue-600 text-[10px]">💧 Voda</span>}
              {m.power && <span className="badge bg-yellow-50 text-yellow-600 text-[10px]">⚡ Proud</span>}
              {m.wifi && <span className="badge bg-slate-100 text-slate-500 text-[10px]">📶 WiFi</span>}
              {m.fuel && <span className="badge bg-orange-50 text-orange-600 text-[10px]">⛽ Palivo</span>}
            </div>
            {m.notes && <p className="text-xs text-slate-400 mt-1.5 italic">{m.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Logbook tab ─────────────────────────────────────────────
const WEATHER = ['☀️ Slunečno', '⛅ Polojasno', '☁️ Oblačno', '🌧️ Déšť', '⛈️ Bouřka', '🌫️ Mlha']
const WIND_DIRS = ['S', 'SSV', 'SV', 'VSV', 'V', 'VJV', 'JV', 'JJV', 'J', 'JJZ', 'JZ', 'ZJZ', 'Z', 'ZSZ', 'SZ', 'SSZ']

function AddLogModal({ voyageId, onClose }) {
  const addLogEntry = useStore((s) => s.addLogEntry)
  const [form, setForm] = useState({
    timestamp: new Date().toISOString().slice(0, 16),
    position: '', windSpeed: '', windDirection: 'S',
    weather: '☀️ Slunečno', motorHours: '', notes: '',
  })
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))
  const submit = (e) => {
    e.preventDefault()
    const [lat, lng] = form.position.split(',').map((x) => parseFloat(x.trim()))
    addLogEntry({
      voyageId, timestamp: new Date(form.timestamp).toISOString(),
      position: !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null,
      windSpeed: parseFloat(form.windSpeed) || null,
      windDirection: form.windDirection, weather: form.weather,
      motorHours: parseFloat(form.motorHours) || null, notes: form.notes,
    })
    onClose()
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div><label className="label">Čas</label><input className="input" type="datetime-local" value={form.timestamp} onChange={f('timestamp')} /></div>
      <div><label className="label">Poloha (lat, lng)</label><input className="input" placeholder="43.1729, 16.4412" value={form.position} onChange={f('position')} /></div>
      <div>
        <label className="label">Počasí</label>
        <div className="flex flex-wrap gap-1.5">
          {WEATHER.map((w) => (
            <button key={w} type="button" onClick={() => setForm((p) => ({ ...p, weather: w }))}
              className={`badge text-sm px-2.5 py-1 ${form.weather === w ? 'bg-ocean-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{w}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Vítr (uzly)</label><input className="input" type="number" value={form.windSpeed} onChange={f('windSpeed')} /></div>
        <div><label className="label">Směr</label>
          <select className="input" value={form.windDirection} onChange={f('windDirection')}>
            {WIND_DIRS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div><label className="label">Motorové hodiny</label><input className="input" type="number" step="0.1" value={form.motorHours} onChange={f('motorHours')} /></div>
      <div><label className="label">Poznámky</label><textarea className="input" rows={2} value={form.notes} onChange={f('notes')} /></div>
      <button type="submit" className="btn-ocean w-full">Uložit</button>
    </form>
  )
}

function LogTab() {
  const [showAdd, setShowAdd] = useState(false)
  const { voyages, activeVoyageId, getVoyageLog, deleteLogEntry } = useStore()
  const voyage = voyages.find((v) => v.id === activeVoyageId)
  const entries = getVoyageLog(activeVoyageId)
  const totalMotorH = entries.reduce((s, e) => s + (e.motorHours ?? 0), 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {totalMotorH > 0 && <p className="text-xs text-slate-400">{totalMotorH.toFixed(1)} mot. hodin celkem</p>}
        <button onClick={() => setShowAdd(true)} className="btn-ocean flex items-center gap-1.5 ml-auto">
          <Plus size={14} /> Záznam
        </button>
      </div>
      {entries.length === 0 ? (
        <div className="card border-dashed border-2 flex flex-col items-center py-10 text-slate-400 cursor-pointer" onClick={() => setShowAdd(true)}>
          <BookOpen size={32} className="mb-2 text-slate-200" /><p className="text-sm">Zatím žádné záznamy</p>
        </div>
      ) : entries.map((entry) => (
        <div key={entry.id} className="card space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400">{new Date(entry.timestamp).toLocaleDateString('cs', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              <p className="font-semibold text-sm mt-0.5">{entry.weather}</p>
            </div>
            <button onClick={() => deleteLogEntry(entry.id)} className="p-1.5 text-slate-300 hover:text-red-400"><Trash2 size={14} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {entry.windSpeed && <span className="badge bg-blue-50 text-blue-700"><Wind size={11} /> {entry.windSpeed} uzlů {entry.windDirection}</span>}
            {entry.motorHours && <span className="badge bg-orange-50 text-orange-700"><Gauge size={11} /> Motor {entry.motorHours} h</span>}
          </div>
          {entry.notes && <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2">{entry.notes}</p>}
        </div>
      ))}
      {showAdd && voyage && <AddLogModal voyageId={activeVoyageId} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────
const TABS = [
  { id: 'fuel', label: '⛽ Palivo', icon: Fuel },
  { id: 'sos', label: '🆘 SOS', icon: Phone },
  { id: 'marinas', label: '⚓ Mariny', icon: Anchor },
  { id: 'log', label: '📖 Deník', icon: BookOpen },
]

export default function ToolsPage() {
  const [active, setActive] = useState('fuel')

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-navy-800">Nástroje</h1>
      </div>
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`flex-1 rounded-xl py-2 text-xs font-medium transition-all ${active === t.id ? 'bg-white shadow-sm text-navy-800' : 'text-slate-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {active === 'fuel' && <FuelTab />}
      {active === 'sos' && <SOSTab />}
      {active === 'marinas' && <MarinaTab />}
      {active === 'log' && <LogTab />}
    </div>
  )
}

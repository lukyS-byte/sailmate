import { useState, useEffect } from 'react'
import { Plus, Trash2, BookOpen, Wind, Gauge, Search, RefreshCw, Check, RotateCcw } from 'lucide-react'
import useStore from '../store/useStore'
import { formatCurrency } from '../utils/calc'

// ── Helpers ──────────────────────────────────────────────────
const wmoInfo = (code) => {
  if (code === 0)  return { emoji: '☀️', desc: 'Jasno' }
  if (code <= 2)   return { emoji: '🌤️', desc: 'Polojasno' }
  if (code <= 3)   return { emoji: '☁️', desc: 'Zataženo' }
  if (code <= 48)  return { emoji: '🌫️', desc: 'Mlha' }
  if (code <= 55)  return { emoji: '🌦️', desc: 'Mrholení' }
  if (code <= 65)  return { emoji: '🌧️', desc: 'Déšť' }
  if (code <= 77)  return { emoji: '❄️', desc: 'Sníh' }
  if (code <= 82)  return { emoji: '🌦️', desc: 'Přeháňky' }
  if (code <= 99)  return { emoji: '⛈️', desc: 'Bouřka' }
  return { emoji: '❓', desc: '—' }
}

const beaufort = (kn) => {
  const scale = [1, 4, 7, 11, 17, 22, 28, 34, 41, 48, 56, 64]
  return scale.findIndex((v) => kn < v) === -1 ? 12 : scale.findIndex((v) => kn < v)
}

const bfColor = (bf) => {
  if (bf <= 3) return 'bg-emerald-100 text-emerald-700'
  if (bf <= 5) return 'bg-amber-100 text-amber-700'
  if (bf <= 7) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

const bfLabel = (bf) => ['Bezvětří', 'Vánek', 'Vánek', 'Slabý vítr', 'Mírný vítr', 'Čerstvý vítr', 'Silný vítr', 'Prudký vítr', 'Bouřlivý vítr', 'Bouře', 'Silná bouře', 'Vichřice', 'Orkán'][bf] ?? '—'

const degToCompass = (d) => ['S','SSV','SV','VSV','V','VJV','JV','JJV','J','JJZ','JZ','ZJZ','Z','ZSZ','SZ','SSZ'][Math.round(d / 22.5) % 16]

// ── Weather tab ───────────────────────────────────────────────
function WeatherTab() {
  const { activeVoyageId, getVoyageWaypoints } = useStore()
  const wps = getVoyageWaypoints(activeVoyageId).filter((w) => w.lat && w.lng)
  const locations = wps.length ? wps : [{ id: 'split', name: 'Split (výchozí)', lat: 43.508, lng: 16.440 }, { id: 'hvar', name: 'Hvar', lat: 43.172, lng: 16.441 }, { id: 'dubrovnik', name: 'Dubrovník', lat: 42.648, lng: 18.077 }]
  const [selIdx, setSelIdx] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loc = locations[selIdx] ?? locations[0]

  const load = async (lat, lng) => {
    setLoading(true); setError(null)
    try {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,windspeed_10m,winddirection_10m,windgusts_10m,weathercode` +
        `&hourly=windspeed_10m,winddirection_10m,weathercode,temperature_2m` +
        `&windspeed_unit=kn&forecast_days=5&timezone=auto&models=best_match`
      )
      setData(await r.json())
    } catch { setError('Nepodařilo se načíst počasí. Zkontroluj připojení.') }
    setLoading(false)
  }

  useEffect(() => { load(loc.lat, loc.lng) }, [selIdx])

  const cur = data?.current
  const bf = cur ? beaufort(cur.windspeed_10m) : null

  // Get daily summary from hourly (max wind per day)
  const dailySummary = (() => {
    if (!data?.hourly) return []
    const { time, windspeed_10m, winddirection_10m, weathercode } = data.hourly
    const days = {}
    time.forEach((t, i) => {
      const day = t.slice(0, 10)
      if (!days[day]) days[day] = { speeds: [], dirs: [], codes: [] }
      days[day].speeds.push(windspeed_10m[i])
      days[day].dirs.push(winddirection_10m[i])
      days[day].codes.push(weathercode[i])
    })
    return Object.entries(days).slice(0, 5).map(([date, v]) => ({
      date,
      maxWind: Math.max(...v.speeds),
      avgDir: v.dirs[Math.floor(v.dirs.length / 2)],
      code: v.codes[Math.floor(v.codes.length / 2)],
    }))
  })()

  return (
    <div className="space-y-4">
      {/* Location selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {locations.map((l, i) => (
          <button
            key={l.id ?? i}
            onClick={() => setSelIdx(i)}
            className={`flex-shrink-0 badge text-sm px-3 py-1.5 transition-colors ${selIdx === i ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {l.name}
          </button>
        ))}
      </div>

      {loading && (
        <div className="card flex items-center justify-center py-10 text-slate-400">
          <RefreshCw size={20} className="animate-spin mr-2" /> Načítám počasí...
        </div>
      )}

      {error && (
        <div className="card bg-red-50 border-red-200 text-red-600 text-sm flex items-center gap-2">
          ⚠️ {error}
          <button onClick={() => load(loc.lat, loc.lng)} className="ml-auto text-xs underline">Zkusit znovu</button>
        </div>
      )}

      {cur && !loading && (
        <>
          {/* Current conditions */}
          <div className="card bg-gradient-to-br from-navy-800 to-navy-600 text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-blue-200 text-xs uppercase tracking-wide">Aktuálně · {loc.name}</p>
                <p className="text-4xl mt-1">{wmoInfo(cur.weathercode).emoji}</p>
                <p className="text-white font-medium mt-1">{wmoInfo(cur.weathercode).desc}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{Math.round(cur.temperature_2m)}°C</p>
                <button onClick={() => load(loc.lat, loc.lng)} className="mt-2 text-blue-300 hover:text-white">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <WindStat label="Vítr" value={`${Math.round(cur.windspeed_10m)} kn`} sub={degToCompass(cur.winddirection_10m)} />
              <WindStat label="Nárazy" value={`${Math.round(cur.windgusts_10m)} kn`} sub="max" />
              <div className={`rounded-xl px-2 py-2 text-center ${bfColor(bf)}`}>
                <p className="text-lg font-bold leading-none">Bf {bf}</p>
                <p className="text-[10px] mt-1 leading-tight font-medium">{bfLabel(bf)}</p>
              </div>
            </div>
          </div>

          {/* 5-day forecast */}
          <div>
            <p className="section-title">Předpověď 5 dní</p>
            <div className="space-y-2">
              {dailySummary.map((d, i) => {
                const bf = beaufort(d.maxWind)
                const info = wmoInfo(d.code)
                const date = new Date(d.date)
                return (
                  <div key={d.date} className="card flex items-center gap-3 py-3">
                    <span className="text-2xl">{info.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {i === 0 ? 'Dnes' : i === 1 ? 'Zítra' : date.toLocaleDateString('cs', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-xs text-slate-400">{info.desc}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{Math.round(d.maxWind)} kn</p>
                      <p className="text-xs text-slate-400">{degToCompass(d.avgDir)}</p>
                    </div>
                    <span className={`badge text-xs px-2 py-1 font-bold ${bfColor(bf)}`}>Bf {bf}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center">Zdroj: Open-Meteo.com · Aktualizováno nyní</p>
        </>
      )}
    </div>
  )
}

function WindStat({ label, value, sub }) {
  return (
    <div className="bg-white/10 rounded-xl px-2 py-2 text-center">
      <p className="text-[10px] text-blue-200">{label}</p>
      <p className="text-sm font-bold text-white mt-0.5">{value}</p>
      <p className="text-[10px] text-blue-300">{sub}</p>
    </div>
  )
}

// ── Checklists tab ───────────────────────────────────────────
const LISTS = {
  departure: {
    label: 'Před odplutím', icon: '⛵',
    items: ['Záchranné vesty — počet a stav', 'Záchranný kruh + světlo', 'Světlice (datum platnosti)', 'VHF rádio funkční + nabito', 'Navigační světla funkční', 'Kotva + dostatečný řetěz', 'Palivo zkontrolováno', 'Voda dostatečná', 'Předpověď počasí OK', 'Posádka poučena o MOB', 'Dokumenty lodě (patent, pojistka)', 'Pasy a doklady posádky', 'Odhlásit z přístavu (VHF/recepce)', 'Lékárnička zkontrolována', 'EPIRB / PLB aktivní'],
  },
  arrival: {
    label: 'Příjezd do přístavu', icon: '⚓',
    items: ['Kontaktovat marinu VHF ch. 17', 'Připravit lodní lana (4 ks)', 'Připravit fendery', 'Lodní doklady připraveny', 'Pasová kontrola (mimo EU)', 'Přihlásit se na recepci mariny', 'Napojit vodu a proud', 'Zavřít seacocks', 'Motor vypnout, odjistit plachty'],
  },
  anchoring: {
    label: 'Kotevní manévr', icon: '🪝',
    items: ['Zkontrolovat hloubku (echolot)', 'Typ dna OK (písek/bahno)', 'Délka řetězu: hloubka × 4', 'Swinging room od okolních lodí', 'Motor přímý kurz, slow ahead', 'Spustit kotvu na dno', 'Pomalu couváme, pouštíme řetěz', 'Test kotvy (full astern)', 'GPS anchor alarm nastaven', 'Kotva ve watch po 2 hodinách'],
  },
  mob: {
    label: 'MOB — Člověk přes palubu', icon: '🆘',
    items: ['1. VOLAT "Člověk přes palubu!"', '2. IHNED hodit záchranný kruh', '3. Jeden člen sleduje osobu STÁLE', '4. VHF Mayday / PAN PAN (ch. 16)', '5. Stisknout MOB na GPS/chartplotteru', '6. Williamsonův záchranný obrat', '7. Motor NEUTRÁL při přiblížení', '8. Vytáhnout osobu na palubu', '9. Hlásit záchranné službě výsledek'],
  },
  storm: {
    label: 'Příprava na bouřku', icon: '⛈️',
    items: ['Ověřit předpověď (Windy, SHMU)', 'Zajistit vše volné na palubě', 'Záchranné vesty na ALL crew', 'Safety liny zapnuty', 'Zmenšit plachtu (reef / storm jib)', 'Zvednout věci z kajut', 'Zavřít všechny průlezy a ventilátory', 'Informovat MRCC o poloze (VHF 16)', 'Navigační světla ZAP', 'Záchranné signály připraveny'],
  },
}

function ChecklistTab() {
  const [active, setActive] = useState('departure')
  const [checked, setChecked] = useState({})
  const list = LISTS[active]
  const toggle = (i) => setChecked((p) => ({ ...p, [`${active}-${i}`]: !p[`${active}-${i}`] }))
  const reset = () => setChecked((p) => {
    const n = { ...p }
    list.items.forEach((_, i) => delete n[`${active}-${i}`])
    return n
  })
  const doneCount = list.items.filter((_, i) => checked[`${active}-${i}`]).length

  return (
    <div className="space-y-3">
      {/* List selector */}
      <div className="space-y-1.5">
        {Object.entries(LISTS).map(([id, l]) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors text-left ${active === id ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            <span className="text-lg">{l.icon}</span>
            <span className="flex-1">{l.label}</span>
            {active === id && <span className="text-xs opacity-70">{doneCount}/{l.items.length}</span>}
          </button>
        ))}
      </div>

      {/* Progress */}
      <div className="card py-3">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-medium text-slate-700">{list.icon} {list.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">{doneCount}/{list.items.length}</span>
            <button onClick={reset} className="text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <RotateCcw size={11} /> Reset
            </button>
          </div>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-ocean-500 to-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${(doneCount / list.items.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1.5">
        {list.items.map((item, i) => {
          const done = !!checked[`${active}-${i}`]
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={`w-full flex items-center gap-3 card py-3 text-left transition-opacity ${done ? 'opacity-50' : ''}`}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                {done && <Check size={12} className="text-white" strokeWidth={3} />}
              </div>
              <span className={`text-sm ${done ? 'line-through text-slate-400' : 'text-slate-800'}`}>{item}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Fuel tab ─────────────────────────────────────────────────
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
    addExpense({ voyageId: voyage.id, description: `Palivo (${liters.toFixed(0)} l)`, amount: Math.round(total * 100) / 100, currency: voyage.currency ?? 'EUR', category: 'fuel', paidBy: voyage.crew?.[0]?.id ?? '', splitAmong: voyage.crew?.map((c) => c.id) ?? [], date: new Date().toISOString().slice(0, 10) })
    setAdded(true); setTimeout(() => setAdded(false), 2000)
  }
  return (
    <div className="space-y-4">
      <div className="card bg-amber-50 border-amber-200 space-y-3">
        <p className="text-xs font-semibold text-amber-700">⛽ Kalkulačka paliva</p>
        <div>
          <label className="label">Spotřeba motoru (l/hod)</label>
          <input className="input" type="number" step="0.5" value={consumption} onChange={(e) => setConsumption(e.target.value)} />
          <p className="text-xs text-slate-400 mt-1">Typicky: 4T = 5–8 l/h · 5T = 7–10 l/h</p>
        </div>
        <div><label className="label">Plánované motorové hodiny</label><input className="input" type="number" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} /></div>
        <div>
          <label className="label">Cena nafty (€/litr)</label>
          <input className="input" type="number" step="0.05" value={pricePerL} onChange={(e) => setPricePerL(e.target.value)} />
          <p className="text-xs text-slate-400 mt-1">HR ~1.7€ · GR ~1.9€ · IT ~2.0€</p>
        </div>
      </div>
      <div className="card border-2 border-amber-300 bg-amber-50">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div><p className="text-2xl font-bold text-amber-700">{liters.toFixed(0)} l</p><p className="text-xs text-amber-600">Celkem litrů</p></div>
          <div><p className="text-2xl font-bold text-amber-700">{formatCurrency(total, voyage?.currency ?? 'EUR')}</p><p className="text-xs text-amber-600">Celková cena</p></div>
        </div>
        {voyage?.crew?.length > 0 && <p className="mt-3 pt-3 border-t border-amber-200 text-sm text-amber-700 text-center">{formatCurrency(total / voyage.crew.length, voyage.currency)} / osoba ({voyage.crew.length} lidí)</p>}
      </div>
      {voyage && <button onClick={addAsExpense} className={`w-full rounded-xl px-4 py-3 font-medium text-sm transition-all ${added ? 'bg-emerald-500 text-white' : 'btn-ocean'}`}>{added ? '✓ Přidáno do výdajů' : '+ Přidat jako výdaj výpravy'}</button>}
    </div>
  )
}

// ── SOS tab ───────────────────────────────────────────────────
const EMERGENCY = [
  { country: 'Chorvatsko 🇭🇷', contacts: [{ label: 'MRCC Split', number: '195', type: 'sos' }, { label: 'Záchranná služba', number: '112', type: 'sos' }, { label: 'Policie', number: '192', type: 'police' }, { label: 'VHF kanál', number: '16', type: 'vhf' }] },
  { country: 'Řecko 🇬🇷', contacts: [{ label: 'Pobřežní stráž', number: '108', type: 'sos' }, { label: 'Záchranná služba', number: '112', type: 'sos' }, { label: 'VHF kanál', number: '16', type: 'vhf' }] },
  { country: 'Itálie 🇮🇹', contacts: [{ label: 'Guardia Costiera', number: '1530', type: 'sos' }, { label: 'Záchranná služba', number: '112', type: 'sos' }, { label: 'VHF kanál', number: '16', type: 'vhf' }] },
  { country: 'Černá Hora 🇲🇪', contacts: [{ label: 'Záchranná služba', number: '112', type: 'sos' }, { label: 'VHF kanál', number: '16', type: 'vhf' }] },
  { country: 'Španělsko 🇪🇸', contacts: [{ label: 'Salvamento Marítimo', number: '900 202 202', type: 'sos' }, { label: 'Záchranná služba', number: '112', type: 'sos' }, { label: 'VHF kanál', number: '16', type: 'vhf' }] },
]

function SOSTab() {
  const typeColor = { sos: 'bg-red-100 text-red-700 border-red-200', police: 'bg-blue-100 text-blue-700 border-blue-200', vhf: 'bg-purple-100 text-purple-700 border-purple-200' }
  return (
    <div className="space-y-4">
      <div className="card bg-red-50 border-red-300"><p className="font-bold text-red-700 text-sm">🆘 V nouzi nejdřív:</p><p className="text-red-600 text-sm mt-1">1. VHF kanál <strong>16</strong> — mayday volání</p><p className="text-red-600 text-sm">2. Telefonní číslo <strong>112</strong> — EU tísňová</p><p className="text-red-600 text-sm">3. Světlice — jen pokud vidíš záchranáře</p></div>
      {EMERGENCY.map((c) => (
        <div key={c.country} className="card">
          <p className="font-semibold text-sm mb-2">{c.country}</p>
          <div className="space-y-1.5">
            {c.contacts.map((ct, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-slate-600">{ct.label}</span>
                <a href={ct.type === 'vhf' ? undefined : `tel:${ct.number.replace(/\s/g,'')}`} className={`badge text-sm px-2.5 py-1 border font-bold ${typeColor[ct.type]}`}>{ct.type === 'vhf' ? `VHF ${ct.number}` : ct.number}</a>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="card bg-blue-50 border-blue-200"><p className="text-xs font-semibold text-blue-700 mb-2">📻 Mayday volání (VHF 16)</p><p className="text-xs text-blue-600 font-mono leading-relaxed">"MAYDAY MAYDAY MAYDAY<br/>Here is [název lodě] ×3<br/>Position: [GPS]<br/>[Popis nouze + počet osob]<br/>Over."</p></div>
    </div>
  )
}

// ── Marina tab ────────────────────────────────────────────────
const MARINAS = [
  { name: 'ACI Marina Split', country: 'HR', city: 'Split', depth: 3.5, price: 55, water: true, power: true, wifi: true, fuel: true, notes: 'Centrum města' },
  { name: 'ACI Marina Hvar', country: 'HR', city: 'Hvar', depth: 4, price: 60, water: true, power: true, wifi: true, fuel: false, notes: 'Nejrušnější přístav' },
  { name: 'ACI Marina Korčula', country: 'HR', city: 'Korčula', depth: 4, price: 48, water: true, power: true, wifi: true, fuel: false, notes: 'Krásné staré město' },
  { name: 'ACI Marina Dubrovnik', country: 'HR', city: 'Dubrovník', depth: 5, price: 75, water: true, power: true, wifi: true, fuel: true, notes: 'Rezervuj předem' },
  { name: 'Marina Šibenik', country: 'HR', city: 'Šibenik', depth: 4, price: 45, water: true, power: true, wifi: true, fuel: true, notes: 'Vstup řekou Krka' },
  { name: 'ACI Marina Rovinj', country: 'HR', city: 'Rovinj', depth: 3.5, price: 52, water: true, power: true, wifi: true, fuel: false, notes: 'Istrie' },
  { name: 'Marina Primošten', country: 'HR', city: 'Primošten', depth: 3, price: 38, water: true, power: true, wifi: false, fuel: false, notes: 'Klidnější alternativa' },
  { name: 'ACI Marina Trogir', country: 'HR', city: 'Trogir', depth: 4, price: 50, water: true, power: true, wifi: true, fuel: true, notes: 'UNESCO, 7 km od Splitu' },
  { name: 'Marina Lefkada', country: 'GR', city: 'Lefkada', depth: 5, price: 30, water: true, power: true, wifi: true, fuel: true, notes: 'Výchozí bod Iónie' },
  { name: 'Marina Fiskardo', country: 'GR', city: 'Kefalónia', depth: 4, price: 20, water: true, power: false, wifi: false, fuel: false, notes: 'Malebná vesnice' },
  { name: 'Port Gaios (Paxos)', country: 'GR', city: 'Paxos', depth: 3.5, price: 15, water: true, power: false, wifi: false, fuel: false, notes: 'Tiché kotviště' },
  { name: 'Marina Gouvia (Korfu)', country: 'GR', city: 'Korfu', depth: 4, price: 40, water: true, power: true, wifi: true, fuel: true, notes: 'Největší marina Korfú' },
  { name: 'Marina Zea (Pireus)', country: 'GR', city: 'Athény', depth: 6, price: 55, water: true, power: true, wifi: true, fuel: true, notes: 'Hlavní marina Athén' },
]

function MarinaTab() {
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('all')
  const filtered = MARINAS.filter((m) => (country === 'all' || m.country === country) && (!search || m.name.toLowerCase().includes(search.toLowerCase()) || m.city.toLowerCase().includes(search.toLowerCase())))
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input pl-8" placeholder="Hvar, Split..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="input w-28" value={country} onChange={(e) => setCountry(e.target.value)}><option value="all">Vše</option><option value="HR">🇭🇷 HR</option><option value="GR">🇬🇷 GR</option></select>
      </div>
      <div className="space-y-2">
        {filtered.map((m) => (
          <div key={m.name} className="card py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0"><p className="font-semibold text-sm">{m.name}</p><p className="text-xs text-slate-400">{m.city}</p></div>
              <div className="text-right flex-shrink-0"><p className="font-bold text-sm text-navy-800">{m.price > 0 ? `~${m.price}€/noc` : 'Zdarma'}</p><p className="text-xs text-slate-400">hloubka {m.depth}m</p></div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {m.water && <span className="badge bg-blue-50 text-blue-600 text-[10px]">💧 Voda</span>}
              {m.power && <span className="badge bg-yellow-50 text-yellow-600 text-[10px]">⚡ Proud</span>}
              {m.wifi && <span className="badge bg-slate-100 text-slate-500 text-[10px]">📶 WiFi</span>}
              {m.fuel && <span className="badge bg-orange-50 text-orange-600 text-[10px]">⛽ Palivo</span>}
            </div>
            {m.notes && <p className="text-xs text-slate-400 mt-1 italic">{m.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Logbook tab ───────────────────────────────────────────────
const WEATHER_OPTIONS = ['☀️ Slunečno', '⛅ Polojasno', '☁️ Oblačno', '🌧️ Déšť', '⛈️ Bouřka', '🌫️ Mlha']
const WIND_DIRS = ['S','SSV','SV','VSV','V','VJV','JV','JJV','J','JJZ','JZ','ZJZ','Z','ZSZ','SZ','SSZ']

function AddLogModal({ voyageId, onClose }) {
  const addLogEntry = useStore((s) => s.addLogEntry)
  const [form, setForm] = useState({ timestamp: new Date().toISOString().slice(0, 16), position: '', windSpeed: '', windDirection: 'S', weather: '☀️ Slunečno', motorHours: '', notes: '' })
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))
  const submit = (e) => {
    e.preventDefault()
    const [lat, lng] = form.position.split(',').map((x) => parseFloat(x.trim()))
    addLogEntry({ voyageId, timestamp: new Date(form.timestamp).toISOString(), position: !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null, windSpeed: parseFloat(form.windSpeed) || null, windDirection: form.windDirection, weather: form.weather, motorHours: parseFloat(form.motorHours) || null, notes: form.notes })
    onClose()
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div><label className="label">Čas</label><input className="input" type="datetime-local" value={form.timestamp} onChange={f('timestamp')} /></div>
      <div><label className="label">Poloha (lat, lng)</label><input className="input" placeholder="43.1729, 16.4412" value={form.position} onChange={f('position')} /></div>
      <div><label className="label">Počasí</label><div className="flex flex-wrap gap-1.5">{WEATHER_OPTIONS.map((w) => <button key={w} type="button" onClick={() => setForm((p) => ({ ...p, weather: w }))} className={`badge text-sm px-2.5 py-1 ${form.weather === w ? 'bg-ocean-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{w}</button>)}</div></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Vítr (uzly)</label><input className="input" type="number" value={form.windSpeed} onChange={f('windSpeed')} /></div>
        <div><label className="label">Směr</label><select className="input" value={form.windDirection} onChange={f('windDirection')}>{WIND_DIRS.map((d) => <option key={d}>{d}</option>)}</select></div>
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
        <button onClick={() => setShowAdd(true)} className="btn-ocean flex items-center gap-1.5 ml-auto"><Plus size={14} /> Záznam</button>
      </div>
      {entries.length === 0 ? (
        <div className="card border-dashed border-2 flex flex-col items-center py-10 text-slate-400 cursor-pointer" onClick={() => setShowAdd(true)}>
          <BookOpen size={32} className="mb-2 text-slate-200" /><p className="text-sm">Zatím žádné záznamy</p>
        </div>
      ) : entries.map((entry) => (
        <div key={entry.id} className="card space-y-2">
          <div className="flex items-start justify-between">
            <div><p className="text-xs text-slate-400">{new Date(entry.timestamp).toLocaleDateString('cs', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p><p className="font-semibold text-sm mt-0.5">{entry.weather}</p></div>
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

// ── Main ──────────────────────────────────────────────────────
const TABS = [
  { id: 'weather', label: '🌬️ Počasí' },
  { id: 'checklists', label: '✅ Listy' },
  { id: 'fuel', label: '⛽ Palivo' },
  { id: 'sos', label: '🆘 SOS' },
  { id: 'marinas', label: '⚓ Mariny' },
  { id: 'log', label: '📖 Deník' },
]

export default function ToolsPage() {
  const [active, setActive] = useState('weather')
  return (
    <div className="p-4 space-y-4">
      <div className="pt-2"><h1 className="text-xl font-bold text-navy-800">Nástroje</h1></div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActive(t.id)}
            className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${active === t.id ? 'bg-navy-800 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {active === 'weather'    && <WeatherTab />}
      {active === 'checklists' && <ChecklistTab />}
      {active === 'fuel'       && <FuelTab />}
      {active === 'sos'        && <SOSTab />}
      {active === 'marinas'    && <MarinaTab />}
      {active === 'log'        && <LogTab />}
    </div>
  )
}

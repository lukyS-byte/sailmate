import { useState } from 'react'
import { Plus, Trash2, BookOpen, Wind, Gauge } from 'lucide-react'
import useStore from '../store/useStore'
import Modal from '../components/Modal'

const WEATHER = ['☀️ Slunečno', '⛅ Polojasno', '☁️ Oblačno', '🌧️ Déšť', '⛈️ Bouřka', '🌫️ Mlha']
const WIND_DIRS = ['S', 'SSV', 'SV', 'VSV', 'V', 'VJV', 'JV', 'JJV', 'J', 'JJZ', 'JZ', 'ZJZ', 'Z', 'ZSZ', 'SZ', 'SSZ']

function AddLogModal({ voyageId, onClose }) {
  const addLogEntry = useStore((s) => s.addLogEntry)
  const [form, setForm] = useState({
    timestamp: new Date().toISOString().slice(0, 16),
    position: '',
    windSpeed: '',
    windDirection: 'S',
    weather: '☀️ Slunečno',
    motorHours: '',
    notes: '',
  })
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const [lat, lng] = form.position.split(',').map((x) => parseFloat(x.trim()))
    addLogEntry({
      voyageId,
      timestamp: new Date(form.timestamp).toISOString(),
      position: !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null,
      windSpeed: parseFloat(form.windSpeed) || null,
      windDirection: form.windDirection,
      weather: form.weather,
      motorHours: parseFloat(form.motorHours) || null,
      notes: form.notes,
    })
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label">Čas záznamu</label>
        <input className="input" type="datetime-local" value={form.timestamp} onChange={f('timestamp')} />
      </div>
      <div>
        <label className="label">Poloha (lat, lng — volitelné)</label>
        <input className="input" placeholder="43.1729, 16.4412" value={form.position} onChange={f('position')} />
      </div>
      <div>
        <label className="label">Počasí</label>
        <div className="flex flex-wrap gap-1.5">
          {WEATHER.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setForm((p) => ({ ...p, weather: w }))}
              className={`badge text-sm px-2.5 py-1 transition-colors ${form.weather === w ? 'bg-ocean-500 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Vítr (uzly)</label>
          <input className="input" type="number" placeholder="12" value={form.windSpeed} onChange={f('windSpeed')} />
        </div>
        <div>
          <label className="label">Směr větru</label>
          <select className="input" value={form.windDirection} onChange={f('windDirection')}>
            {WIND_DIRS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Motorové hodiny</label>
        <input className="input" type="number" step="0.1" placeholder="2.5" value={form.motorHours} onChange={f('motorHours')} />
      </div>
      <div>
        <label className="label">Poznámky</label>
        <textarea className="input" rows={3} placeholder="Krásné podmínky, vlny 0.5m, delfíni..." value={form.notes} onChange={f('notes')} />
      </div>
      <button type="submit" className="btn-ocean w-full">Uložit záznam</button>
    </form>
  )
}

export default function LogbookPage() {
  const [showAdd, setShowAdd] = useState(false)
  const { voyages, activeVoyageId, getVoyageLog, deleteLogEntry } = useStore()
  const voyage = voyages.find((v) => v.id === activeVoyageId)
  const entries = getVoyageLog(activeVoyageId)

  const totalMotorHours = entries.reduce((s, e) => s + (e.motorHours ?? 0), 0)

  if (!voyage) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <BookOpen size={48} className="text-slate-200 mb-4" />
      <p className="text-slate-500 font-medium">Žádná aktivní výprava</p>
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-navy-800">Lodní deník</h1>
          {totalMotorHours > 0 && (
            <p className="text-xs text-slate-400">{totalMotorHours.toFixed(1)} motorových hodin celkem</p>
          )}
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-ocean flex items-center gap-1.5">
          <Plus size={16} /> Záznam
        </button>
      </div>

      {entries.length === 0 ? (
        <div
          className="card border-dashed border-2 flex flex-col items-center py-12 text-slate-400 cursor-pointer"
          onClick={() => setShowAdd(true)}
        >
          <BookOpen size={36} className="mb-2 text-slate-200" />
          <p className="text-sm">Zatím žádné záznamy</p>
          <p className="text-xs mt-1">Zaznamenávej průběh plavby</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="card space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400">
                    {new Date(entry.timestamp).toLocaleDateString('cs', {
                      weekday: 'short', day: 'numeric', month: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                  <p className="font-semibold text-sm mt-0.5">{entry.weather}</p>
                </div>
                <button onClick={() => deleteLogEntry(entry.id)} className="p-1.5 text-slate-300 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {entry.windSpeed && (
                  <span className="badge bg-blue-50 text-blue-700">
                    <Wind size={11} /> {entry.windSpeed} uzlů {entry.windDirection}
                  </span>
                )}
                {entry.motorHours && (
                  <span className="badge bg-orange-50 text-orange-700">
                    <Gauge size={11} /> Motor {entry.motorHours} h
                  </span>
                )}
                {entry.position && (
                  <span className="badge bg-slate-100 text-slate-600 text-xs">
                    📍 {entry.position.lat.toFixed(4)}, {entry.position.lng.toFixed(4)}
                  </span>
                )}
              </div>
              {entry.notes && (
                <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2">{entry.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddLogModal voyageId={activeVoyageId} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

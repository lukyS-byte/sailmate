import { useState, useRef } from 'react'
import { Plus, Trash2, BookOpen, Wind, Gauge, FileText, Loader, Check, MapPin, X } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import useStore from '../store/useStore'
import Modal from '../components/Modal'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

async function extractPdfText(file) {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const pages = []
  for (let i = 1; i <= Math.min(pdf.numPages, 60); i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map((it) => it.str).join(' '))
  }
  return pages.join('\n').slice(0, 40000)
}

async function analyzeWithClaude(text) {
  const res = await fetch('/api/analyze-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Chyba ${res.status}`)
  }
  return res.json()
}

function PDFImportModal({ voyageId, onClose }) {
  const { addLogEntry, addWaypoint, getVoyageWaypoints } = useStore()
  const [phase, setPhase] = useState('idle')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [selLogs, setSelLogs] = useState([])
  const [selWps, setSelWps] = useState([])
  const inputRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setError(''); setPhase('extracting')
    try {
      const text = await extractPdfText(file)
      setPhase('analyzing')
      const data = await analyzeWithClaude(text)
      setResult(data)
      setSelLogs((data.logEntries ?? []).map((_, i) => i))
      setSelWps((data.waypoints ?? []).map((_, i) => i))
      setPhase('done')
    } catch (err) {
      setError(err.message)
      setPhase('error')
    }
    e.target.value = ''
  }

  const toggleLog = (i) => setSelLogs((p) => p.includes(i) ? p.filter((x) => x !== i) : [...p, i])
  const toggleWp = (i) => setSelWps((p) => p.includes(i) ? p.filter((x) => x !== i) : [...p, i])

  const doImport = () => {
    const existingNames = new Set(getVoyageWaypoints(voyageId).map((w) => w.name))
    selLogs.forEach((i) => {
      const e = result.logEntries[i]
      addLogEntry({ voyageId, timestamp: e.timestamp, weather: e.weather ?? '☀️ Slunečno', windSpeed: e.windSpeed, windDirection: e.windDirection, notes: e.notes })
    })
    selWps.forEach((i) => {
      const w = result.waypoints[i]
      if (!existingNames.has(w.name)) {
        addWaypoint({ voyageId, name: w.name, lat: w.lat ?? null, lng: w.lng ?? null, type: w.type ?? 'waypoint', notes: w.notes ?? '', country: 'HR', portFees: 0 })
      }
    })
    onClose()
  }

  return (
    <div className="space-y-4">
      {(phase === 'idle' || phase === 'error') && (
        <>
          <button className="btn-ocean w-full flex items-center justify-center gap-2" onClick={() => inputRef.current?.click()}>
            <FileText size={16} /> Nahrát PDF deník / bulletin
          </button>
          <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        </>
      )}

      {(phase === 'extracting' || phase === 'analyzing') && (
        <div className="flex flex-col items-center py-8 gap-3 text-slate-500">
          <Loader size={28} className="animate-spin text-ocean-500" />
          <p className="text-sm font-medium">{phase === 'extracting' ? 'Čtu PDF…' : 'AI analyzuje obsah…'}</p>
        </div>
      )}

      {phase === 'done' && result && (
        <div className="space-y-3">
          <div className="bg-ocean-50 dark:bg-ocean-900/20 rounded-2xl p-3">
            <p className="font-semibold text-sm">{result.event ?? 'Neznámá akce'}</p>
            {result.location && <p className="text-xs text-slate-500">{result.location}{result.dates ? ` · ${result.dates}` : ''}</p>}
            {result.summary && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{result.summary}</p>}
          </div>

          {(result.logEntries ?? []).length > 0 && (
            <div>
              <p className="label">Záznamy do deníku ({selLogs.length}/{result.logEntries.length})</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {result.logEntries.map((e, i) => (
                  <button key={i} type="button" onClick={() => toggleLog(i)}
                    className={`w-full text-left rounded-xl px-3 py-2 text-xs flex gap-2 items-start transition-colors ${selLogs.includes(i) ? 'bg-ocean-100 dark:bg-ocean-800/30' : 'bg-slate-50 dark:bg-slate-800'}`}>
                    <Check size={12} className={`mt-0.5 flex-shrink-0 ${selLogs.includes(i) ? 'text-ocean-500' : 'text-slate-300'}`} />
                    <span>
                      <span className="text-slate-400 mr-1">{new Date(e.timestamp).toLocaleDateString('cs', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      {e.weather} {e.windSpeed ? `· ${e.windSpeed}kn ${e.windDirection ?? ''}` : ''}
                      {e.notes && <span className="block text-slate-500 mt-0.5">{e.notes}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(result.waypoints ?? []).length > 0 && (
            <div>
              <p className="label">Zastávky na trase ({selWps.length}/{result.waypoints.length})</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {result.waypoints.map((w, i) => (
                  <button key={i} type="button" onClick={() => toggleWp(i)}
                    className={`w-full text-left rounded-xl px-3 py-2 text-xs flex gap-2 items-start transition-colors ${selWps.includes(i) ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
                    <MapPin size={12} className={`mt-0.5 flex-shrink-0 ${selWps.includes(i) ? 'text-emerald-500' : 'text-slate-300'}`} />
                    <span>
                      <span className="font-medium">{w.name}</span>
                      {w.lat && <span className="text-slate-400 ml-1">{w.lat.toFixed(4)}, {w.lng?.toFixed(4)}</span>}
                      {w.notes && <span className="block text-slate-500 mt-0.5">{w.notes}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button className="btn-ghost" onClick={() => { setPhase('idle'); setResult(null) }}>Zpět</button>
            <button className="btn-ocean" onClick={doImport} disabled={selLogs.length === 0 && selWps.length === 0}>
              Importovat ({selLogs.length + selWps.length})
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const WEATHER_OPTIONS = ['☀️ Slunečno', '⛅ Polojasno', '☁️ Oblačno', '🌧️ Déšť', '⛈️ Bouřka', '🌫️ Mlha']
const WIND_DIRS = ['S','SSV','SV','VSV','V','VJV','JV','JJV','J','JJZ','JZ','ZJZ','Z','ZSZ','SZ','SSZ']

function AddLogModal({ voyageId, crew, onClose }) {
  const addLogEntry = useStore((s) => s.addLogEntry)
  const [form, setForm] = useState({
    timestamp: new Date().toISOString().slice(0, 16),
    position: '',
    windSpeed: '',
    windDirection: 'S',
    weather: '☀️ Slunečno',
    motorHours: '',
    watchOfficer: crew[0]?.id ?? '',
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
      watchOfficer: form.watchOfficer || null,
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
        <label className="label">Počasí</label>
        <div className="flex flex-wrap gap-1.5">
          {WEATHER_OPTIONS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setForm((p) => ({ ...p, weather: w }))}
              className={`badge text-sm px-2.5 py-1.5 transition-colors ${form.weather === w ? 'bg-ocean-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}
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
            {WIND_DIRS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Motorové hodiny</label>
          <input className="input" type="number" step="0.1" placeholder="0.0" value={form.motorHours} onChange={f('motorHours')} />
        </div>
        {crew.length > 0 && (
          <div>
            <label className="label">Hlídka</label>
            <select className="input" value={form.watchOfficer} onChange={f('watchOfficer')}>
              <option value="">—</option>
              {crew.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <div>
        <label className="label">Poloha (lat, lng)</label>
        <input className="input" placeholder="43.1729, 16.4412" value={form.position} onChange={f('position')} />
      </div>
      <div>
        <label className="label">Poznámky</label>
        <textarea className="input" rows={3} placeholder="Plavba pod plachtami, viditelnost 10 NM..." value={form.notes} onChange={f('notes')} />
      </div>
      <button type="submit" className="btn-ocean w-full">Uložit záznam</button>
    </form>
  )
}

export default function LogPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [showPDF, setShowPDF] = useState(false)
  const { voyages, activeVoyageId, getVoyageLog, deleteLogEntry } = useStore()
  const voyage = voyages.find((v) => v.id === activeVoyageId)
  const entries = getVoyageLog(activeVoyageId)
  const totalMotorH = entries.reduce((s, e) => s + (e.motorHours ?? 0), 0)
  const crew = voyage?.crew ?? []

  if (!voyage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <BookOpen size={48} className="text-slate-200 mb-4" />
        <p className="text-slate-500 font-medium">Žádná aktivní výprava</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-navy-800 dark:text-white">Lodní deník</h1>
          {totalMotorH > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">{totalMotorH.toFixed(1)} mot. hodin celkem</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPDF(true)} className="btn-ghost flex items-center gap-1.5 text-sm">
            <FileText size={15} /> PDF
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-ocean flex items-center gap-1.5">
            <Plus size={16} /> Záznam
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div
          className="card border-dashed border-2 flex flex-col items-center py-16 text-slate-400 cursor-pointer"
          onClick={() => setShowAdd(true)}
        >
          <BookOpen size={40} className="mb-3 text-slate-200" />
          <p className="text-sm font-medium">Žádné záznamy</p>
          <p className="text-xs mt-1">Zaznamenávej průběh plavby</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const officer = crew.find((c) => c.id === entry.watchOfficer)
            return (
              <div key={entry.id} className="card space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-400">
                      {new Date(entry.timestamp).toLocaleDateString('cs', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {officer && <span className="ml-2">· {officer.name}</span>}
                    </p>
                    <p className="font-semibold text-sm mt-0.5">{entry.weather}</p>
                  </div>
                  <button onClick={() => deleteLogEntry(entry.id)} className="p-1.5 text-slate-300 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry.windSpeed && (
                    <span className="badge bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      <Wind size={11} /> {entry.windSpeed} uzlů {entry.windDirection}
                    </span>
                  )}
                  {entry.motorHours && (
                    <span className="badge bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                      <Gauge size={11} /> Motor {entry.motorHours} h
                    </span>
                  )}
                  {entry.position && (
                    <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                      📍 {entry.position.lat.toFixed(3)}, {entry.position.lng.toFixed(3)}
                    </span>
                  )}
                </div>
                {entry.notes && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 rounded-xl px-3 py-2">
                    {entry.notes}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <Modal title="Nový záznam" onClose={() => setShowAdd(false)}>
          <AddLogModal voyageId={activeVoyageId} crew={crew} onClose={() => setShowAdd(false)} />
        </Modal>
      )}
      {showPDF && (
        <Modal title="Importovat z PDF" onClose={() => setShowPDF(false)}>
          <PDFImportModal voyageId={activeVoyageId} onClose={() => setShowPDF(false)} />
        </Modal>
      )}
    </div>
  )
}

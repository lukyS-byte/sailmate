import { useState } from 'react'
import {
  Plus, Trash2, BookOpen, ChevronDown, ChevronUp, Calendar, Anchor,
  Navigation, Wind, Eye, Droplets, Gauge, Waves, Ship, Cloud, Clock, Save,
} from 'lucide-react'
import useStore from '../store/useStore'

// ── Column definitions for the main log table ─────────────────────────────
const LOG_COLS = [
  { key: 'time', label: 'Čas', w: 'w-16', ph: 'hh:mm' },
  { key: 'lat', label: 'Latitude', w: 'w-24', ph: '43°10\'N' },
  { key: 'lng', label: 'Longitude', w: 'w-24', ph: '16°26\'E' },
  { key: 'log', label: 'Log', w: 'w-16', ph: 'nm' },
  { key: 'kk', label: 'KK', w: 'w-14', ph: '°' },
  { key: 'gps', label: 'GPS kurs', w: 'w-16', ph: '°' },
  { key: 'speed', label: 'Rychlost', w: 'w-16', ph: 'kn' },
  { key: 'wind', label: 'Vítr', w: 'w-20', ph: 'NE 12kn' },
  { key: 'clouds', label: 'Oblačnost', w: 'w-20', ph: '3/8' },
  { key: 'pressure', label: 'Tlak', w: 'w-16', ph: 'hPa' },
  { key: 'sea', label: 'Stav moře', w: 'w-20', ph: '0-4' },
  { key: 'visibility', label: 'Viditelnost', w: 'w-20', ph: 'km' },
  { key: 'info', label: 'Plachty / motor / info', w: 'w-48', ph: 'hlavní + genoa…' },
]

function emptyRow() {
  return Object.fromEntries(LOG_COLS.map((c) => [c.key, '']))
}

function emptyWatch() {
  return { time: '', name: '' }
}

// ── One day — expandable card with full logbook form ─────────────────────
function DayCard({ day, dayNumber, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false)
  const [d, setD] = useState(day)

  const save = (patch) => {
    const next = { ...d, ...patch }
    setD(next)
    onUpdate(next)
  }

  const setField = (k) => (e) => save({ [k]: e.target.value })
  const setRow = (i, k, v) => {
    const rows = [...(d.rows ?? [])]
    rows[i] = { ...rows[i], [k]: v }
    save({ rows })
  }
  const addRow = () => save({ rows: [...(d.rows ?? []), emptyRow()] })
  const removeRow = (i) => save({ rows: d.rows.filter((_, j) => j !== i) })

  const setWatch = (i, k, v) => {
    const watches = [...(d.watches ?? [])]
    watches[i] = { ...watches[i], [k]: v }
    save({ watches })
  }
  const addWatch = () => save({ watches: [...(d.watches ?? []), emptyWatch()] })
  const removeWatch = (i) => save({ watches: d.watches.filter((_, j) => j !== i) })

  // Auto sums
  const sailNm = parseFloat(d.sailNm) || 0
  const motorNm = parseFloat(d.motorNm) || 0
  const totalNm = sailNm + motorNm
  const motorH = parseFloat(d.motorH) || 0
  const avgSpeed = totalNm && d.sailHours ? (totalNm / parseFloat(d.sailHours)).toFixed(1) : ''

  const dateLabel = d.date
    ? new Date(d.date).toLocaleDateString('cs', { weekday: 'short', day: 'numeric', month: 'long' })
    : 'Bez data'

  return (
    <div className="card p-0 overflow-hidden mb-3">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
        onClick={() => setOpen(!open)}
      >
        <span className="w-9 h-9 rounded-full bg-ocean-500 text-white text-sm font-bold flex items-center justify-center shrink-0">
          {dayNumber}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-navy-800 dark:text-white truncate">{dateLabel}</p>
          <div className="flex flex-wrap gap-x-2 text-[11px] text-slate-500">
            {(d.from || d.to) && <span>{d.from || '…'} → {d.to || '…'}</span>}
            {(d.rows?.length ?? 0) > 0 && <span>· {d.rows.length} záznamů</span>}
            {totalNm > 0 && <span>· {totalNm.toFixed(1)} nm</span>}
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-700 p-3 sm:p-4 space-y-4">
          {/* Header fields */}
          <section>
            <p className="section-label"><Calendar size={12} /> Hlavička</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <L label="Den" value={d.dayLabel ?? ''} onChange={setField('dayLabel')} placeholder={`${dayNumber}.`} />
              <L label="Datum" type="date" value={d.date ?? ''} onChange={setField('date')} />
              <L label="Čas T" value={d.timeT ?? ''} onChange={setField('timeT')} placeholder="08:00" />
              <L label="Oblast" value={d.area ?? ''} onChange={setField('area')} placeholder="Kornati" />
              <L label="Odkud" value={d.from ?? ''} onChange={setField('from')} placeholder="Murter" />
              <L label="Kam" value={d.to ?? ''} onChange={setField('to')} placeholder="Žut" />
            </div>
          </section>

          {/* Entries table */}
          <section>
            <p className="section-label"><Navigation size={12} /> Záznamy plavby</p>
            <div className="overflow-x-auto -mx-3 sm:-mx-4 px-3 sm:px-4">
              <table className="text-[11px] border-collapse">
                <thead>
                  <tr className="text-slate-500 dark:text-slate-400">
                    {LOG_COLS.map((c) => (
                      <th key={c.key} className={`${c.w} font-medium text-left px-1.5 py-1.5 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap`}>
                        {c.label}
                      </th>
                    ))}
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {(d.rows ?? []).map((row, i) => (
                    <tr key={i} className="group">
                      {LOG_COLS.map((c) => (
                        <td key={c.key} className={`${c.w} border-b border-slate-100 dark:border-slate-800 px-0.5`}>
                          <input
                            className="w-full px-1.5 py-1.5 bg-transparent text-slate-800 dark:text-slate-100 focus:bg-ocean-50 dark:focus:bg-ocean-900/20 focus:outline-none rounded text-[11px]"
                            placeholder={c.ph}
                            value={row[c.key] ?? ''}
                            onChange={(e) => setRow(i, c.key, e.target.value)}
                          />
                        </td>
                      ))}
                      <td className="border-b border-slate-100 dark:border-slate-800 text-center">
                        <button
                          onClick={() => removeRow(i)}
                          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        >
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addRow} className="btn-ghost mt-2 text-xs flex items-center gap-1.5">
              <Plus size={12} /> Přidat řádek
            </button>
          </section>

          {/* Weather forecast + watches + summary */}
          <div className="grid sm:grid-cols-3 gap-4">
            <section>
              <p className="section-label"><Cloud size={12} /> Předpověď počasí</p>
              <textarea
                className="input text-xs"
                rows={4}
                value={d.forecast ?? ''}
                onChange={setField('forecast')}
                placeholder="SV 15-20 kn, jasno, vlny 0,5 m…"
              />
            </section>

            <section>
              <p className="section-label"><Clock size={12} /> Hlídky</p>
              <div className="space-y-1">
                {(d.watches ?? []).map((w, i) => (
                  <div key={i} className="flex gap-1 items-center">
                    <input
                      className="input text-xs px-2 py-1.5 flex-1"
                      placeholder="08-12"
                      value={w.time ?? ''}
                      onChange={(e) => setWatch(i, 'time', e.target.value)}
                    />
                    <input
                      className="input text-xs px-2 py-1.5 flex-[1.5]"
                      placeholder="Jméno"
                      value={w.name ?? ''}
                      onChange={(e) => setWatch(i, 'name', e.target.value)}
                    />
                    <button onClick={() => removeWatch(i)} className="text-slate-300 hover:text-red-500 p-1">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <button onClick={addWatch} className="btn-ghost text-xs flex items-center gap-1.5 mt-1">
                  <Plus size={12} /> Hlídka
                </button>
              </div>
            </section>

            <section>
              <p className="section-label"><Gauge size={12} /> Suma</p>
              <div className="space-y-1.5">
                <L compact label="Upluto na plachty (nm)" type="number" value={d.sailNm ?? ''} onChange={setField('sailNm')} />
                <L compact label="Upluto na motor (nm)" type="number" value={d.motorNm ?? ''} onChange={setField('motorNm')} />
                <div className="text-[11px] font-semibold text-navy-800 dark:text-white bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 flex justify-between">
                  <span>Upluto celkem:</span>
                  <span>{totalNm > 0 ? `${totalNm.toFixed(1)} nm` : '—'}</span>
                </div>
                <L compact label="Motohodin dnes" type="number" value={d.motorH ?? ''} onChange={setField('motorH')} />
                <L compact label="Motohodin celkem" type="number" value={d.motorHTotal ?? ''} onChange={setField('motorHTotal')} />
                <L compact label="Hodin plavby" type="number" value={d.sailHours ?? ''} onChange={setField('sailHours')} />
                <div className="text-[11px] font-semibold text-navy-800 dark:text-white bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 flex justify-between">
                  <span>Průměrná rychlost:</span>
                  <span>{avgSpeed ? `${avgSpeed} kn` : '—'}</span>
                </div>
              </div>
            </section>
          </div>

          {/* Notes */}
          <section>
            <p className="section-label"><BookOpen size={12} /> Poznámky</p>
            <textarea
              className="input text-sm"
              rows={4}
              value={d.notes ?? ''}
              onChange={setField('notes')}
              placeholder="Průběh plavby, události, setkání s jinými loděmi, technické problémy…"
            />
          </section>

          {/* Verification */}
          <section>
            <p className="section-label">Ověření</p>
            <div className="grid grid-cols-2 gap-2">
              <L label="Datum ověření" type="date" value={d.verifyDate ?? ''} onChange={setField('verifyDate')} />
              <L label="Podpis kapitána" value={d.captainSign ?? ''} onChange={setField('captainSign')} placeholder="Jméno / iniciály" />
            </div>
          </section>

          {/* Footer actions */}
          <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={() => { if (confirm('Smazat celou stránku deníku?')) onDelete() }}
              className="btn-ghost text-red-500 flex items-center gap-1.5 text-xs"
            >
              <Trash2 size={13} /> Smazat den
            </button>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Save size={11} /> Ukládá se automaticky
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Compact labeled input ─────────────────────────────────────────────────
function L({ label, value, onChange, type = 'text', placeholder, compact }) {
  if (compact) {
    return (
      <label className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
        <input
          type={type}
          className="input text-xs px-2 py-1 w-20 text-right"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      </label>
    )
  }
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <input
        type={type}
        className="input text-sm mt-0.5"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </label>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function LogPage() {
  const { voyages, activeVoyageId, getVoyageLogDays, addLogDay, updateLogDay, deleteLogDay } = useStore()
  const voyage = voyages.find((v) => v.id === activeVoyageId)
  const days = getVoyageLogDays(activeVoyageId)

  if (!voyage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <BookOpen size={48} className="text-slate-200 mb-4" />
        <p className="text-slate-500 font-medium">Žádná aktivní výprava</p>
        <p className="text-slate-400 text-sm mt-1">Nejdřív si založ výpravu v Přehledu</p>
      </div>
    )
  }

  const createDay = () => {
    const today = new Date().toISOString().slice(0, 10)
    addLogDay({
      voyageId: activeVoyageId,
      date: today,
      rows: [emptyRow()],
      watches: [],
    })
  }

  const totalNm = days.reduce((s, d) =>
    s + (parseFloat(d.sailNm) || 0) + (parseFloat(d.motorNm) || 0), 0)
  const totalMotorH = days.reduce((s, d) => s + (parseFloat(d.motorH) || 0), 0)

  return (
    <div className="p-4 pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pt-2 mb-4">
        <div className="flex items-center gap-2">
          <BookOpen size={22} className="text-ocean-500" />
          <div>
            <h1 className="text-xl font-bold text-navy-800 dark:text-white leading-tight">Lodní deník</h1>
            <p className="text-[11px] text-slate-400">
              {days.length} {days.length === 1 ? 'den' : days.length >= 2 && days.length <= 4 ? 'dny' : 'dnů'}
              {totalNm > 0 && ` · ${totalNm.toFixed(1)} nm`}
              {totalMotorH > 0 && ` · ${totalMotorH.toFixed(1)} mot.h`}
            </p>
          </div>
        </div>
        <button onClick={createDay} className="btn-ocean flex items-center gap-1.5 text-sm">
          <Plus size={15} /> Nový den
        </button>
      </div>

      {days.length === 0 ? (
        <div className="card border-dashed border-2 flex flex-col items-center py-16 text-center">
          <Ship size={40} className="text-slate-200 mb-3" />
          <p className="font-semibold text-slate-500">Deník je prázdný</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">Vytvoř si první den a zaznamenávej plavbu<br/>v klasickém formátu lodního deníku</p>
          <button onClick={createDay} className="btn-ocean flex items-center gap-1.5 text-sm">
            <Plus size={15} /> Založit první den
          </button>
        </div>
      ) : (
        days.map((day, i) => (
          <DayCard
            key={day.id}
            day={day}
            dayNumber={i + 1}
            onUpdate={(patch) => updateLogDay(day.id, patch)}
            onDelete={() => deleteLogDay(day.id)}
          />
        ))
      )}
    </div>
  )
}

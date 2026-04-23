import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Square, Navigation, Gauge, MapPin, Clock, Download, Trash2, ArrowLeft, Compass, Ruler, Activity, AlertTriangle } from 'lucide-react'
import useStore from '../store/useStore'
import { trackStats, formatDuration, downloadGPX, toDMS } from '../utils/gpx'

const INTERVAL_OPTIONS = [
  { sec: 60, label: '1 min' },
  { sec: 300, label: '5 min' },
  { sec: 900, label: '15 min' },
  { sec: 1800, label: '30 min' },
  { sec: 3600, label: '1 h' },
]

function useWakeLock(active) {
  const lockRef = useRef(null)
  useEffect(() => {
    let cancelled = false
    async function acquire() {
      try {
        if ('wakeLock' in navigator && active) {
          lockRef.current = await navigator.wakeLock.request('screen')
        }
      } catch {}
    }
    async function release() {
      try {
        if (lockRef.current) { await lockRef.current.release(); lockRef.current = null }
      } catch {}
    }
    if (active) acquire()
    else release()

    const onVis = () => { if (active && document.visibilityState === 'visible') acquire() }
    document.addEventListener('visibilitychange', onVis)
    return () => { cancelled = true; release(); document.removeEventListener('visibilitychange', onVis) }
  }, [active])
}

export default function TrackPage() {
  const navigate = useNavigate()
  const { tracks, activeVoyageId, getActiveTrack, startTrack, stopTrack, addTrackPoint, deleteTrack, updateTrack } = useStore()
  const activeTrack = getActiveTrack()
  const activeId = activeTrack?.id ?? null

  const [live, setLive] = useState(null)  // { lat, lng, speed, heading, accuracy, t }
  const [error, setError] = useState('')
  const [intervalSec, setIntervalSec] = useState(900)
  const lastLogTimeRef = useRef(0)
  const watchIdRef = useRef(null)

  useWakeLock(!!activeId)

  // Live watchPosition
  useEffect(() => {
    if (!activeId) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }
    if (!navigator.geolocation) { setError('GPS není v tomto prohlížeči k dispozici'); return }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setError('')
        const p = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed != null ? pos.coords.speed * 1.94384 : null,  // m/s → kn
          heading: pos.coords.heading,
          accuracy: pos.coords.accuracy,
          t: new Date().toISOString(),
        }
        setLive(p)

        const now = Date.now()
        if (now - lastLogTimeRef.current >= intervalSec * 1000) {
          lastLogTimeRef.current = now
          addTrackPoint(activeId, p)
        }
      },
      (err) => setError(err.message || 'GPS chyba'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
    )

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [activeId, intervalSec, addTrackPoint])

  const handleStart = () => {
    // Immediately grab one point before watch warms up
    setError('')
    const id = startTrack(activeVoyageId, intervalSec)
    lastLogTimeRef.current = 0
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            speed: pos.coords.speed != null ? pos.coords.speed * 1.94384 : null,
            heading: pos.coords.heading,
            accuracy: pos.coords.accuracy,
            t: new Date().toISOString(),
          }
          setLive(p)
          addTrackPoint(id, p)
          lastLogTimeRef.current = Date.now()
        },
        (err) => setError(err.message || 'GPS chyba'),
        { enableHighAccuracy: true, timeout: 15000 }
      )
    }
  }

  const handleStop = () => {
    if (!activeId) return
    // capture final point
    if (live) addTrackPoint(activeId, { ...live, t: new Date().toISOString() })
    stopTrack(activeId)
    setLive(null)
  }

  const finishedTracks = tracks
    .filter((t) => t.endedAt)
    .sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''))

  // Live stats (include current live point)
  const liveTrackForStats = activeTrack
    ? { ...activeTrack, points: live ? [...activeTrack.points, live] : activeTrack.points }
    : null
  const stats = liveTrackForStats ? trackStats(liveTrackForStats) : null

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-500"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Activity size={20} className="text-ocean-500" /> Tracking
        </h1>
      </div>

      {error && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-200">{error}</p>
        </div>
      )}

      {activeId ? (
        <>
          {/* Live panel */}
          <div className="rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-ocean-500 to-navy-700 text-white">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/80">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                  Nahrávání
                </span>
                <span className="text-[11px] text-white/70">
                  {stats?.pointCount ?? 0} bodů · interval {INTERVAL_OPTIONS.find(o => o.sec === activeTrack.intervalSec)?.label ?? `${activeTrack.intervalSec}s`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <BigMetric icon={<Gauge size={14} />} label="Rychlost" value={live?.speed != null ? live.speed.toFixed(1) : '—'} unit="kn" />
                <BigMetric icon={<Compass size={14} />} label="Kurz" value={live?.heading != null ? Math.round(live.heading) : '—'} unit="°" />
                <BigMetric icon={<Ruler size={14} />} label="Ujeto" value={stats ? stats.totalNm.toFixed(2) : '—'} unit="NM" />
                <BigMetric icon={<Clock size={14} />} label="Čas" value={stats ? formatDuration(stats.durationMs) : '—'} unit="" />
              </div>

              <div className="mt-3 pt-3 border-t border-white/20 space-y-1">
                <div className="flex items-center gap-2 text-xs text-white/90">
                  <MapPin size={11} />
                  <span>{live ? toDMS(live.lat, true) : '—'} &nbsp; {live ? toDMS(live.lng, false) : '—'}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-white/70">
                  {live?.accuracy != null && <span>± {Math.round(live.accuracy)} m</span>}
                  {stats && <span>max {stats.maxSpeed.toFixed(1)} kn</span>}
                  {stats && <span>ø {stats.avgSpeed.toFixed(1)} kn</span>}
                </div>
              </div>
            </div>

            <button onClick={handleStop} className="w-full py-3 bg-red-500 hover:bg-red-600 font-semibold text-sm flex items-center justify-center gap-2">
              <Square size={16} /> Ukončit plavbu
            </button>
          </div>

          <p className="text-[11px] text-slate-400 text-center px-2">
            Nechej aplikaci otevřenou. Obrazovka zůstane rozsvícená (Wake Lock). Na iOS nelze trackovat na pozadí.
          </p>
        </>
      ) : (
        <>
          {/* Start panel */}
          <div className="card space-y-4">
            <div>
              <h2 className="font-semibold text-sm mb-1 flex items-center gap-2">
                <Play size={16} className="text-ocean-500" /> Spustit novou plavbu
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sleduje polohu, rychlost a kurz v reálném čase a zapisuje body na mapu.
              </p>
            </div>

            <div>
              <label className="label">Interval logování</label>
              <div className="grid grid-cols-5 gap-1.5">
                {INTERVAL_OPTIONS.map((o) => (
                  <button
                    key={o.sec}
                    onClick={() => setIntervalSec(o.sec)}
                    className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                      intervalSec === o.sec
                        ? 'bg-ocean-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Jak často se uloží bod do tracku. Živá rychlost/pozice se aktualizuje průběžně.
              </p>
            </div>

            <button onClick={handleStart} className="btn-ocean w-full py-3 flex items-center justify-center gap-2">
              <Play size={16} /> Start
            </button>
          </div>
        </>
      )}

      {/* Finished tracks */}
      {finishedTracks.length > 0 && (
        <div>
          <p className="section-title">Uložené plavby</p>
          <div className="space-y-2">
            {finishedTracks.map((t) => (
              <TrackCard key={t.id} track={t} onDelete={() => deleteTrack(t.id)} onRename={(name) => updateTrack(t.id, { name })} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BigMetric({ icon, label, value, unit }) {
  return (
    <div className="bg-white/10 rounded-xl p-3">
      <div className="flex items-center gap-1 text-[11px] text-white/70 mb-1">{icon} {label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold leading-none">{value}</span>
        {unit && <span className="text-xs text-white/70">{unit}</span>}
      </div>
    </div>
  )
}

function TrackCard({ track, onDelete, onRename }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(track.name || '')
  const stats = trackStats(track)
  const date = new Date(track.startedAt).toLocaleString('cs', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              className="input"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onBlur={() => { onRename(name); setEditing(false) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { onRename(name); setEditing(false) } }}
            />
          ) : (
            <button onClick={() => setEditing(true)} className="text-sm font-semibold truncate w-full text-left">
              {track.name || 'Bez názvu'}
            </button>
          )}
          <p className="text-[11px] text-slate-400 mt-0.5">{date}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => downloadGPX(track)}
            className="p-2 text-ocean-500 hover:bg-ocean-50 dark:hover:bg-slate-700 rounded-lg"
            title="Stáhnout GPX"
          >
            <Download size={16} />
          </button>
          <button
            onClick={() => { if (confirm('Smazat plavbu?')) onDelete() }}
            className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 text-center">
        <MiniStat label="NM" value={stats.totalNm.toFixed(2)} />
        <MiniStat label="Čas" value={formatDuration(stats.durationMs)} />
        <MiniStat label="Max" value={`${stats.maxSpeed.toFixed(1)} kn`} />
        <MiniStat label="Bodů" value={stats.pointCount} />
      </div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg py-1.5">
      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-none">{value}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}

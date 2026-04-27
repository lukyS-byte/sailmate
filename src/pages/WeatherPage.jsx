import { useState, useMemo } from 'react'
import { Wind, MapPin, ExternalLink } from 'lucide-react'
import useStore from '../store/useStore'

const OVERLAYS = [
  { key: 'wind', label: 'Vítr' },
  { key: 'gust', label: 'Poryvy' },
  { key: 'waves', label: 'Vlny' },
  { key: 'rain', label: 'Srážky' },
  { key: 'temp', label: 'Teplota' },
  { key: 'pressure', label: 'Tlak' },
  { key: 'clouds', label: 'Oblačnost' },
]

function buildWindyUrl({ lat, lng, zoom, overlay }) {
  const params = new URLSearchParams({
    lat: lat.toFixed(4),
    lon: lng.toFixed(4),
    detailLat: lat.toFixed(4),
    detailLon: lng.toFixed(4),
    zoom: String(zoom),
    level: 'surface',
    overlay,
    product: 'ecmwf',
    menu: '',
    message: 'true',
    marker: 'true',
    calendar: 'now',
    pressure: '',
    type: 'map',
    location: 'coordinates',
    detail: '',
    metricWind: 'kt',
    metricTemp: '°C',
    radarRange: '-1',
    lang: 'cs',
  })
  return `https://embed.windy.com/embed2.html?${params.toString()}`
}

export default function WeatherPage() {
  const voyages = useStore((s) => s.voyages)
  const [overlay, setOverlay] = useState('wind')

  // Najdi všechny waypointy se souřadnicemi napříč výpravami
  const allWaypoints = useMemo(() => {
    const pts = []
    for (const v of voyages ?? []) {
      for (const w of v.waypoints ?? []) {
        if (w.lat && w.lng) pts.push({ ...w, voyageName: v.name })
      }
    }
    return pts
  }, [voyages])

  // Default centrum: průměr všech waypointů, nebo Jadran
  const [center, setCenter] = useState(() => {
    if (allWaypoints.length === 0) return { lat: 43.5, lng: 16.5, zoom: 7 }
    const lat = allWaypoints.reduce((s, w) => s + w.lat, 0) / allWaypoints.length
    const lng = allWaypoints.reduce((s, w) => s + w.lng, 0) / allWaypoints.length
    return { lat, lng, zoom: 8 }
  })

  const url = buildWindyUrl({ ...center, overlay })

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-navy-800 dark:text-white flex items-center gap-2">
          <Wind size={22} className="text-ocean-500" /> Počasí
        </h1>
        <a
          href={`https://www.windy.com/?${overlay},${center.lat.toFixed(4)},${center.lng.toFixed(4)},${center.zoom}`}
          target="_blank"
          rel="noopener"
          className="text-xs text-ocean-500 hover:text-ocean-600 flex items-center gap-1"
        >
          Otevřít na Windy.com <ExternalLink size={12} />
        </a>
      </div>

      {/* Přepínač vrstev */}
      <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide">
        {OVERLAYS.map((o) => (
          <button
            key={o.key}
            onClick={() => setOverlay(o.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              overlay === o.key
                ? 'bg-ocean-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Windy iframe */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800" style={{ height: 480 }}>
        <iframe
          key={`${overlay}-${center.lat}-${center.lng}`}
          src={url}
          width="100%"
          height="100%"
          frameBorder="0"
          title="Windy"
          allow="fullscreen"
        />
      </div>

      {/* Přepnutí na waypointy */}
      {allWaypoints.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 px-1">
            Centrovat na waypoint:
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {allWaypoints.map((w) => (
              <button
                key={`${w.voyageName}-${w.id}`}
                onClick={() => setCenter({ lat: w.lat, lng: w.lng, zoom: 9 })}
                className="px-2.5 py-1 rounded-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-ocean-400 hover:text-ocean-600 flex items-center gap-1"
              >
                <MapPin size={11} /> {w.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center pt-2">
        Data: ECMWF přes Windy.com · zdarma, bez registrace
      </p>
    </div>
  )
}

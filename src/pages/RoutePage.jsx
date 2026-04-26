import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Map, Navigation, Clock, Anchor, Flag, Camera, X, Loader } from 'lucide-react'
import L from 'leaflet'
import { supabase } from '../lib/supabase'
import useStore from '../store/useStore'
import { nmBetween, hoursToETA, formatETA, estimatePortFee, COUNTRIES } from '../utils/calc'
import Modal from '../components/Modal'

const SHADOW = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
function makeIcon(color) {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: SHADOW,
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
  })
}
const ICONS = { start: makeIcon('blue'), end: makeIcon('green'), mid: makeIcon('grey') }

function RouteMap({ waypoints }) {
  const divRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!divRef.current) return
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }

    const map = L.map(divRef.current, { zoomControl: true, scrollWheelZoom: true })
    mapRef.current = map

    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>',
    }).addTo(map)
    const seamap = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openseamap.org">OpenSeaMap</a>',
      opacity: 0.7,
    }).addTo(map)

    L.control.layers(
      { 'OpenStreetMap': osm },
      { 'Námořní vrstva (OpenSeaMap)': seamap },
      { collapsed: true, position: 'topright' }
    ).addTo(map)

    // Tlačítko "Otevřít v Navionics" — centrum mapy
    const NavionicsCtrl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd() {
        const btn = L.DomUtil.create('a', 'leaflet-bar leaflet-control')
        btn.href = '#'
        btn.title = 'Otevřít v Navionics Web App'
        btn.innerHTML = '⚓'
        btn.style.cssText = 'background:#fff;width:30px;height:30px;line-height:30px;text-align:center;font-size:16px;text-decoration:none;color:#0a2540;'
        L.DomEvent.on(btn, 'click', (e) => {
          L.DomEvent.preventDefault(e)
          const c = map.getCenter()
          const z = Math.max(map.getZoom(), 10)
          window.open(`https://webapp.navionics.com/?lang=cs#boating@${z}&key=${c.lat.toFixed(5)}_${c.lng.toFixed(5)}`, '_blank')
        })
        return btn
      },
    })
    map.addControl(new NavionicsCtrl())

    const pts = waypoints.filter((w) => w.lat && w.lng)
    pts.forEach((wp, idx) => {
      const icon = idx === 0 ? ICONS.start : idx === pts.length - 1 ? ICONS.end : ICONS.mid
      const marker = L.marker([wp.lat, wp.lng], { icon }).addTo(map)
      let popup = `<strong>${wp.name}</strong>`
      if (wp.plannedArrival) popup += `<br>${new Date(wp.plannedArrival).toLocaleDateString('cs')}`
      if (wp.portFees > 0) popup += `<br>${wp.portFees} €/noc`
      const navUrl = `https://webapp.navionics.com/?lang=cs#boating@13&key=${wp.lat.toFixed(5)}_${wp.lng.toFixed(5)}`
      popup += `<br><a href="${navUrl}" target="_blank" rel="noopener" style="color:#0ea5e9;font-size:12px;">⚓ Otevřít v Navionics</a>`
      marker.bindPopup(popup)
    })

    if (pts.length > 1) {
      L.polyline(pts.map((w) => [w.lat, w.lng]), { color: '#0ea5e9', weight: 3, dashArray: '8 6' }).addTo(map)
      map.fitBounds(pts.map((w) => [w.lat, w.lng]), { padding: [40, 40] })
    } else if (pts.length === 1) {
      map.setView([pts[0].lat, pts[0].lng], 10)
    } else {
      map.setView([43.5, 16.5], 7)
    }

    return () => { map.remove(); mapRef.current = null }
  }, [waypoints])

  return <div ref={divRef} style={{ height: '100%', width: '100%' }} />
}

const BUCKET = 'voyage-photos'

function WaypointPhotos({ waypoint, voyageId }) {
  const updateWaypoint = useStore((s) => s.updateWaypoint)
  const photos = waypoint.photos ?? []
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const inputRef = useRef(null)

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {})
    const path = `${voyageId}/${waypoint.id}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
      updateWaypoint(waypoint.id, { photos: [...photos, publicUrl] })
    }
    setUploading(false)
    e.target.value = ''
  }

  const deletePhoto = async (url) => {
    const path = url.split(`/${BUCKET}/`)[1]?.split('?')[0]
    if (path) await supabase.storage.from(BUCKET).remove([path])
    updateWaypoint(waypoint.id, { photos: photos.filter((p) => p !== url) })
  }

  return (
    <>
      {photos.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-2">
          {photos.map((url) => (
            <div key={url} className="relative group">
              <img
                src={url}
                alt=""
                className="w-16 h-16 object-cover rounded-lg cursor-pointer"
                onClick={() => setLightbox(url)}
              />
              <button
                onClick={() => deletePhoto(url)}
                className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5 hidden group-hover:flex items-center justify-center"
              >
                <X size={10} className="text-white" />
              </button>
            </div>
          ))}
          <button
            onClick={() => inputRef.current?.click()}
            className="w-16 h-16 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex items-center justify-center text-slate-400 hover:border-ocean-400 hover:text-ocean-400 transition-colors"
          >
            {uploading ? <Loader size={16} className="animate-spin" /> : <Camera size={16} />}
          </button>
        </div>
      )}
      {photos.length === 0 && (
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-1.5 text-xs text-slate-400 flex items-center gap-1 hover:text-ocean-500 transition-colors"
        >
          {uploading ? <Loader size={12} className="animate-spin" /> : <Camera size={12} />}
          Přidat fotku
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} />
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          <button className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-2">
            <X size={20} />
          </button>
        </div>
      )}
    </>
  )
}

const WP_TYPES = [
  { id: 'marina', label: 'Marina', icon: '⚓' },
  { id: 'anchorage', label: 'Kotviště', icon: '🪝' },
  { id: 'waypoint', label: 'Waypoint', icon: '📍' },
  { id: 'fuel', label: 'Palivo', icon: '⛽' },
]

function AddWaypointModal({ voyageId, onClose }) {
  const addWaypoint = useStore((s) => s.addWaypoint)
  const voyage = useStore((s) => s.voyages.find((v) => v.id === voyageId))
  const [form, setForm] = useState({
    name: '',
    lat: '',
    lng: '',
    type: 'marina',
    country: 'HR',
    plannedArrival: '',
    plannedDeparture: '',
    portFees: '',
    notes: '',
  })

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const estimatedFee = form.country && voyage?.boatLoa
    ? estimatePortFee(form.country, voyage.boatLoa)
    : null

  const submit = (e) => {
    e.preventDefault()
    if (!form.name) return
    addWaypoint({
      voyageId,
      name: form.name,
      lat: parseFloat(form.lat) || null,
      lng: parseFloat(form.lng) || null,
      type: form.type,
      country: form.country,
      plannedArrival: form.plannedArrival,
      plannedDeparture: form.plannedDeparture,
      portFees: parseFloat(form.portFees) || (form.type === 'marina' ? estimatedFee : 0) || 0,
      notes: form.notes,
    })
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label">Název zastávky *</label>
        <input className="input" placeholder="Hvar, Chorvatsko" value={form.name} onChange={f('name')} required autoFocus />
      </div>
      <div>
        <label className="label">Typ</label>
        <div className="grid grid-cols-4 gap-1.5">
          {WP_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setForm((p) => ({ ...p, type: t.id }))}
              className={`flex flex-col items-center gap-0.5 rounded-xl p-2 text-xs transition-colors ${
                form.type === t.id ? 'bg-ocean-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <span className="text-base">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Zeměpisná šířka</label>
          <input className="input" type="number" step="0.0001" placeholder="43.1729" value={form.lat} onChange={f('lat')} />
        </div>
        <div>
          <label className="label">Zeměpisná délka</label>
          <input className="input" type="number" step="0.0001" placeholder="16.4412" value={form.lng} onChange={f('lng')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Příjezd</label>
          <input className="input" type="datetime-local" value={form.plannedArrival} onChange={f('plannedArrival')} />
        </div>
        <div>
          <label className="label">Odjezd</label>
          <input className="input" type="datetime-local" value={form.plannedDeparture} onChange={f('plannedDeparture')} />
        </div>
      </div>
      {form.type === 'marina' && (
        <>
          <div>
            <label className="label">Země</label>
            <select className="input" value={form.country} onChange={f('country')}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">
              Přístav. poplatek (€/noc)
              {estimatedFee && (
                <span className="ml-1 text-ocean-500">— odhad: {estimatedFee} €</span>
              )}
            </label>
            <input
              className="input"
              type="number"
              placeholder={estimatedFee ?? '0'}
              value={form.portFees}
              onChange={f('portFees')}
            />
          </div>
        </>
      )}
      <div>
        <label className="label">Poznámky</label>
        <textarea className="input" rows={2} placeholder="Dobré kotviště, mělčina na vstupu..." value={form.notes} onChange={f('notes')} />
      </div>
      <button type="submit" className="btn-ocean w-full">Přidat zastávku</button>
    </form>
  )
}

export default function RoutePage() {
  const [showAdd, setShowAdd] = useState(false)
  const [speed, setSpeed] = useState(5)
  const { voyages, activeVoyageId, getVoyageWaypoints, deleteWaypoint } = useStore()
  const voyage = voyages.find((v) => v.id === activeVoyageId)
  const waypoints = getVoyageWaypoints(activeVoyageId)

  if (!voyage) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <Map size={48} className="text-slate-200 mb-4" />
      <p className="text-slate-500 font-medium">Žádná aktivní výprava</p>
    </div>
  )

  // Calculate legs
  const legs = []
  let totalNm = 0
  let totalHours = 0
  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1]
    const curr = waypoints[i]
    let nm = null
    if (prev.lat && prev.lng && curr.lat && curr.lng) {
      nm = nmBetween(prev.lat, prev.lng, curr.lat, curr.lng)
      totalNm += nm
    }
    const eta = nm ? hoursToETA(nm, speed) : null
    if (eta) totalHours += eta.total
    legs.push({ nm, eta })
  }

  const totalPortFees = waypoints.reduce((s, w) => {
    if (w.type !== 'marina') return s
    const nights = w.plannedArrival && w.plannedDeparture
      ? Math.max(1, Math.round((new Date(w.plannedDeparture) - new Date(w.plannedArrival)) / 86400000))
      : 1
    return s + (w.portFees ?? 0) * nights
  }, 0)

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-navy-800 dark:text-white">Trasa</h1>
        <button onClick={() => setShowAdd(true)} className="btn-ocean flex items-center gap-1.5">
          <Plus size={16} /> Zastávka
        </button>
      </div>

      {/* Summary bar */}
      {waypoints.length > 1 && (
        <div className="card bg-gradient-to-r from-navy-800 to-navy-600 text-white grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-blue-200 text-[10px] uppercase">Celkem NM</p>
            <p className="font-bold text-lg">{totalNm.toFixed(1)}</p>
          </div>
          <div className="text-center border-x border-white/20">
            <p className="text-blue-200 text-[10px] uppercase">Čas plavby</p>
            <p className="font-bold text-lg">{formatETA({ hours: Math.floor(totalHours), mins: Math.round((totalHours % 1) * 60) })}</p>
          </div>
          <div className="text-center">
            <p className="text-blue-200 text-[10px] uppercase">Příst. popl.</p>
            <p className="font-bold text-lg">~{totalPortFees}€</p>
          </div>
        </div>
      )}

      {/* Speed selector */}
      <div className="card flex items-center gap-3">
        <Navigation size={16} className="text-ocean-500 flex-shrink-0" />
        <span className="text-sm text-slate-600 dark:text-slate-300">Průměrná rychlost:</span>
        <input
          type="range"
          min="3"
          max="12"
          value={speed}
          onChange={(e) => setSpeed(+e.target.value)}
          className="flex-1 accent-ocean-500"
        />
        <span className="text-sm font-bold text-navy-800 dark:text-white w-12 text-right">{speed} uzlů</span>
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700" style={{ height: 320 }}>
        <RouteMap waypoints={waypoints} />
      </div>
      {!waypoints.some((w) => w.lat && w.lng) && (
        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2 px-1">
          Tip: přidej waypointu GPS souřadnice a uvidíš ho na mapě. Mezitím můžeš mapu prohlížet a otevírat ji v Navionics ⚓.
        </p>
      )}

      {/* Waypoints */}
      <div className="space-y-1">
        {waypoints.length === 0 && (
          <div
            className="card border-dashed border-2 flex flex-col items-center py-12 text-slate-400 cursor-pointer"
            onClick={() => setShowAdd(true)}
          >
            <Map size={36} className="mb-2 text-slate-200" />
            <p className="text-sm">Přidej první zastávku</p>
          </div>
        )}
        {waypoints.map((wp, idx) => {
          const leg = idx > 0 ? legs[idx - 1] : null
          const wpType = WP_TYPES.find((t) => t.id === wp.type)
          const nights = wp.plannedArrival && wp.plannedDeparture
            ? Math.max(1, Math.round((new Date(wp.plannedDeparture) - new Date(wp.plannedArrival)) / 86400000))
            : 1

          return (
            <div key={wp.id}>
              {leg && leg.nm && (
                <div className="flex items-center gap-2 px-4 py-1 text-xs text-slate-400">
                  <div className="w-px h-5 bg-slate-200 dark:bg-slate-600 mx-1" />
                  <Navigation size={11} className="text-ocean-400" />
                  <span>{leg.nm.toFixed(1)} NM</span>
                  {leg.eta && <span>· ~{formatETA(leg.eta)}</span>}
                </div>
              )}
              <div className="card flex items-start gap-3 py-3.5">
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0 mt-0.5">
                  {idx === 0 ? <Anchor size={18} className="text-ocean-500" /> : idx === waypoints.length - 1 ? <Flag size={18} className="text-emerald-500" /> : <span className="text-lg leading-none">{wpType?.icon ?? '📍'}</span>}
                  <span className="text-[10px] text-slate-400 font-medium">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{wp.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {wp.plannedArrival && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(wp.plannedArrival).toLocaleDateString('cs', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {wp.portFees > 0 && (
                      <span className="text-xs text-amber-600 font-medium">
                        {wp.portFees}€/noc × {nights} = {wp.portFees * nights}€
                      </span>
                    )}
                    {wp.lat && <span className="text-xs text-slate-300">{wp.lat.toFixed(4)}, {wp.lng?.toFixed(4)}</span>}
                  </div>
                  {wp.notes && <p className="text-xs text-slate-400 mt-1 italic">{wp.notes}</p>}
                  <WaypointPhotos waypoint={wp} voyageId={activeVoyageId} />
                </div>
                <button onClick={() => deleteWaypoint(wp.id)} className="p-1.5 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {showAdd && <AddWaypointModal voyageId={activeVoyageId} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

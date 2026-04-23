// GPX export + track stats

export function trackToGPX(track) {
  const name = (track.name || 'SailMate Track').replace(/[<>&"']/g, '')
  const points = track.points ?? []
  const header = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SailMate" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${name}</name>
    <time>${track.startedAt}</time>
  </metadata>
  <trk>
    <name>${name}</name>
    <trkseg>
`
  const body = points.map((p) => {
    const parts = [`      <trkpt lat="${p.lat}" lon="${p.lng}">`]
    if (p.t) parts.push(`        <time>${p.t}</time>`)
    if (p.speed != null) parts.push(`        <extensions><speed>${p.speed}</speed></extensions>`)
    parts.push(`      </trkpt>`)
    return parts.join('\n')
  }).join('\n')
  const footer = `
    </trkseg>
  </trk>
</gpx>`
  return header + body + footer
}

export function downloadGPX(track) {
  const xml = trackToGPX(track)
  const blob = new Blob([xml], { type: 'application/gpx+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeName = (track.name || 'track').replace(/[^\w\-]+/g, '_')
  a.download = `${safeName}.gpx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Haversine distance in nautical miles
export function distanceNm(a, b) {
  const R = 3440.065 // nautical miles
  const toRad = (d) => d * Math.PI / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function trackStats(track) {
  const pts = track.points ?? []
  if (pts.length < 2) {
    return { totalNm: 0, durationMs: 0, maxSpeed: 0, avgSpeed: 0, pointCount: pts.length }
  }
  let totalNm = 0
  let maxSpeed = 0
  for (let i = 1; i < pts.length; i++) {
    totalNm += distanceNm(pts[i - 1], pts[i])
    if (pts[i].speed != null && pts[i].speed > maxSpeed) maxSpeed = pts[i].speed
  }
  const start = new Date(pts[0].t).getTime()
  const end = new Date(pts[pts.length - 1].t).getTime()
  const durationMs = end - start
  const hours = durationMs / 3600000
  const avgSpeed = hours > 0 ? totalNm / hours : 0
  return { totalNm, durationMs, maxSpeed, avgSpeed, pointCount: pts.length }
}

export function formatDuration(ms) {
  if (!ms || ms < 0) return '0:00'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function toDMS(deg, isLat) {
  if (deg == null || isNaN(deg)) return '—'
  const hemi = deg >= 0 ? (isLat ? 'N' : 'E') : (isLat ? 'S' : 'W')
  const abs = Math.abs(deg)
  const d = Math.floor(abs)
  const m = (abs - d) * 60
  return `${d}°${m.toFixed(2)}'${hemi}`
}

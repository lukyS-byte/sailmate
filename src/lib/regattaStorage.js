// Nahrávání obrázků regattových PDF stránek do Supabase Storage.
// Base64 obrázky jsou MB-velké → nemohou být ve voyage_invites.voyage_data JSONB
// (statement timeout při upsertu, taky payload limit). Místo toho:
//   1) Upload do bucketu `regatta-pages` (public read, authenticated write)
//   2) V JSONB si držíme jen URL (pageUrls) — malinké, sdílí se přes realtime
//   3) Crew (anon) načte <img src=url> přímo z public bucketu
//
// SETUP v Supabase dashboardu (jednorázově):
//   1. Storage → New bucket → name: "regatta-pages", public: ON
//   2. (případně Policies: default public bucket policies stačí)
//
// Když bucket neexistuje, funkce vyhodí chybu — zachytí ji caller a ukáže uživateli.

import { supabase } from './supabase'

const BUCKET = 'regatta-pages'

function base64ToBlob(b64, mime = 'image/jpeg') {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

// Nahraj jeden obrázek přes server-side proxy (obchází Storage RLS).
async function uploadOne(path, b64) {
  const res = await fetch('/api/upload-regatta-page', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, base64: b64, mime: 'image/jpeg' }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Upload ${res.status}`)
  }
  const { url } = await res.json()
  return url
}

// Nahraj všechny stránky regatty. pageData = [{full, crop} | null, ...]
// Vrátí pageUrls = [{full: url, crop: url} | null, ...]
export async function uploadRegattaPages(regattaId, pageData, onProgress) {
  const pageUrls = []
  for (let i = 0; i < pageData.length; i++) {
    const pd = pageData[i]
    if (!pd) { pageUrls.push(null); continue }
    onProgress?.(i + 1, pageData.length)
    const entry = {}
    if (pd.full) {
      entry.full = await uploadOne(`${regattaId}/${i}-full.jpg`, pd.full)
    }
    if (pd.crop) {
      entry.crop = await uploadOne(`${regattaId}/${i}-crop.jpg`, pd.crop)
    }
    pageUrls.push(entry)
  }
  return pageUrls
}

// Smaž všechny obrázky regatty. Volitelné — když se regatta smaže.
export async function deleteRegattaPages(regattaId) {
  const { data: list } = await supabase.storage.from(BUCKET).list(regattaId)
  if (!list || list.length === 0) return
  const paths = list.map((f) => `${regattaId}/${f.name}`)
  await supabase.storage.from(BUCKET).remove(paths)
}

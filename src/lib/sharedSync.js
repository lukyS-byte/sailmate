// Auto-sync sdílené výpravy přes Supabase Realtime.
// voyage_invites.voyage_data drží kompletní snapshot jedné výpravy
// { voyage, expenses, waypoints, supplies, logDays, tracks, regattas }.
// Kapitán i posádka píšou do stejného řádku, všichni se na něj přihlásí přes Realtime.

import { supabase } from './supabase'

// Publikuj snapshot (debounce se řeší výše v App.jsx)
export async function publishSharedVoyage(code, snapshot, ownerId = null) {
  if (!code || !snapshot?.voyage) return { error: new Error('missing code/snapshot') }
  const payload = {
    code,
    voyage_data: snapshot,
    updated_at: new Date().toISOString(),
  }
  if (ownerId) payload.owner_id = ownerId
  return await supabase.from('voyage_invites').upsert(payload, { onConflict: 'code' })
}

export async function loadSharedVoyage(code) {
  const { data, error } = await supabase
    .from('voyage_invites')
    .select('voyage_data, updated_at')
    .eq('code', code)
    .maybeSingle()
  if (error || !data) return null
  return data
}

// Přihlas se na Realtime změny v tomto kódu + polling fallback (8s).
// onChange(voyage_data, updated_at)
// Polling je pojistka pro případ, že voyage_invites není v supabase_realtime
// publikaci — pak Realtime tiše selže a sync by šel jen po reloadu.
// Když Realtime funguje, polling jen potvrzuje stav a nic nového nezpůsobí
// (lastPayload deduplikace v App.jsx).
export function subscribeSharedVoyage(code, onChange) {
  if (!code) return () => {}
  let lastAt = null

  const channel = supabase
    .channel(`shared-voyage:${code}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'voyage_invites', filter: `code=eq.${code}` },
      (payload) => {
        const row = payload.new ?? payload.record
        if (row?.voyage_data) {
          lastAt = row.updated_at
          onChange(row.voyage_data, row.updated_at)
        }
      }
    )
    .subscribe()

  // Polling fallback — every 8s. Zastaví se s unsubscribem.
  const pollInterval = setInterval(async () => {
    try {
      const row = await loadSharedVoyage(code)
      if (!row?.voyage_data) return
      if (row.updated_at === lastAt) return
      lastAt = row.updated_at
      onChange(row.voyage_data, row.updated_at)
    } catch {}
  }, 8000)

  return () => {
    clearInterval(pollInterval)
    supabase.removeChannel(channel)
  }
}

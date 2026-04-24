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

// Přihlas se na Realtime změny v tomto kódu. Vrací unsubscribe funkci.
// onChange(voyage_data, updated_at)
export function subscribeSharedVoyage(code, onChange) {
  if (!code) return () => {}
  const channel = supabase
    .channel(`shared-voyage:${code}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'voyage_invites', filter: `code=eq.${code}` },
      (payload) => {
        const row = payload.new ?? payload.record
        if (row?.voyage_data) onChange(row.voyage_data, row.updated_at)
      }
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}

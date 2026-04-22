export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY není nastaven' })

  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId chybí' })

  const supabaseUrl = process.env.SUPABASE_URL || 'https://kgteeyrfzwdptdvhjtbs.supabase.co'

  try {
    const r = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      return res.status(500).json({ error: err.message ?? `Supabase error ${r.status}` })
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

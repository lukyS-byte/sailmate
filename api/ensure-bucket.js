// Idempotentní vytvoření Storage bucketu pro regattové obrázky.
// Volá se z klienta při startu kapitánovy session — bez service role
// klíče by to z prohlížeče nešlo (RLS blokuje create bucket pro anon).

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY není nastaven na Vercelu' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://kgteeyrfzwdptdvhjtbs.supabase.co'
  const bucketId = 'regatta-pages'

  try {
    // Zkus načíst — když existuje, hotovo
    const head = await fetch(`${supabaseUrl}/storage/v1/bucket/${bucketId}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    if (head.ok) return res.json({ ok: true, created: false })

    // Vytvoř public bucket
    const create = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: bucketId,
        name: bucketId,
        public: true,
        file_size_limit: 10 * 1024 * 1024,  // 10 MB / soubor
        allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
      }),
    })
    if (!create.ok) {
      const err = await create.json().catch(() => ({}))
      // Race condition — může už existovat
      if (err?.error === 'Duplicate' || /already exists/i.test(err?.message ?? '')) {
        return res.json({ ok: true, created: false })
      }
      return res.status(500).json({ error: err.message ?? `Supabase ${create.status}` })
    }
    res.json({ ok: true, created: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

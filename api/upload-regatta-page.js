// Serverový proxy upload do Supabase Storage bucketu `regatta-pages`.
// Klient pošle base64 obrázek + cestu, my použijeme SERVICE_ROLE_KEY,
// který obchází RLS storage.objects — uživatel tak nemusí v Supabase
// nic ručně nastavovat.
//
// Body: { path: string, base64: string, mime?: 'image/jpeg' }
// Response: { url: string }

export const config = {
  api: {
    bodyParser: { sizeLimit: '15mb' },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.SUPABASE_URL || 'https://kgteeyrfzwdptdvhjtbs.supabase.co'
  if (!serviceKey) {
    return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY není nastaven' })
  }

  const { path, base64, mime = 'image/jpeg' } = req.body || {}
  if (!path || !base64) return res.status(400).json({ error: 'path a base64 jsou povinné' })
  if (!/^[a-zA-Z0-9_\-\/.]+$/.test(path)) return res.status(400).json({ error: 'neplatná cesta' })

  const bucket = 'regatta-pages'
  const buf = Buffer.from(base64, 'base64')

  try {
    const upstream = await fetch(
      `${supabaseUrl}/storage/v1/object/${bucket}/${path}`,
      {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': mime,
          'x-upsert': 'true',
          'Cache-Control': '31536000',
        },
        body: buf,
      }
    )
    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}))
      return res.status(upstream.status).json({
        error: err.message || err.error || `Storage ${upstream.status}`,
      })
    }
    const url = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
    res.json({ url })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { code } = req.body
  const expected = process.env.INVITE_CODE

  if (!expected) return res.json({ ok: true }) // žádný kód = otevřená registrace

  if (code?.trim().toUpperCase() === expected.trim().toUpperCase()) {
    res.json({ ok: true })
  } else {
    res.status(403).json({ ok: false, error: 'Nesprávný přístupový kód.' })
  }
}

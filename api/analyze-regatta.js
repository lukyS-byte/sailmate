import { jsonrepair } from 'jsonrepair'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const key = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY
  const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN

  if (!key && !oauthToken) {
    return res.status(503).json({ error: 'ANTHROPIC_KEY není nastaven' })
  }

  const authHeaders = key
    ? { 'x-api-key': key }
    : { 'Authorization': `Bearer ${oauthToken}` }

  const { text = '', images = [] } = req.body

  const imageContent = images.slice(0, 8).map((b64) => ({
    type: 'image',
    source: { type: 'base64', media_type: 'image/jpeg', data: b64 },
  }))

  const prompt = `Analyzuj závodní pokyny (Sailing Instructions). Vrať JEN validní JSON bez markdown:
{"event":"název regaty","location":"místo","dates":"termín","races":[{"number":1,"date":"YYYY-MM-DD","startTime":"HH:MM","distanceNm":číslo_nebo_null,"windNotes":"stručný popis nebo null","pageIndex":číslo_0_based}]}

pageIndex = index stránky PDF (0 = první stránka) kde je schéma/info pro tuto rozjížďku.

Pravidla: races max 15. Vrať POUZE JSON, žádný jiný text.

${text ? `Text:\n${text.slice(0, 8000)}` : ''}`

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        messages: [{ role: 'user', content: [...imageContent, { type: 'text', text: prompt }] }],
      }),
    })
    const json = await upstream.json()
    if (json.error || json.type === 'error') {
      return res.status(500).json({ error: json.error?.message ?? 'API error' })
    }
    const raw = json.content?.[0]?.text?.trim() ?? ''
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    const parsed = JSON.parse(jsonrepair(raw.slice(start, end + 1)))
    res.json(parsed)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

import { jsonrepair } from 'jsonrepair'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const key = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY
  const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN
  if (!key && !oauthToken) return res.status(503).json({ error: 'ANTHROPIC_KEY není nastaven' })

  const authHeaders = key ? { 'x-api-key': key } : { 'Authorization': `Bearer ${oauthToken}` }
  const { text = '', images = [] } = req.body

  const imageContent = images.slice(0, 10).map((b64) => ({
    type: 'image',
    source: { type: 'base64', media_type: 'image/jpeg', data: b64 },
  }))

  const prompt = `Jsi expert na plachetnicové závody. Analyzuj tento lodní deník / závodní pokyny (Sailing Instructions).

Dokument obsahuje rozjížďky seřazené po dnech. Každá rozjížďka má: název trasy, čas startu, délku v Nm, startovní bod, otočné body (bóje), cílový bod a případné poznámky.

Vrať JSON kde jsou rozjížďky seskupeny PO DNECH. Formát:
{
  "event": "název regaty",
  "location": "místo konání",
  "dates": "termín",
  "generalNotes": "nejdůležitější obecné pokyny: VHF kanál, pravidla, kontakty",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "dayName": "Neděle 10. května",
      "races": [
        {
          "number": 1,
          "name": "název trasy, např. Murterské moře",
          "startTime": "HH:MM nebo null",
          "distanceNm": číslo nebo null,
          "startMark": "startovní bod",
          "finishMark": "cílový bod",
          "marks": ["1. otočný bod: název, LB/PB", "2. otočný bod: název, LB/PB"],
          "notes": "důležité: vítr, alternativní trasa, kotvení, bezpečnost",
          "pageIndex": číslo 0-based stránky kde je diagram/schéma trasy
        }
      ]
    }
  ]
}

Pravidla:
- Zahrň KAŽDOU rozjížďku z dokumentu, nezastavuj se dříve
- Pokud jsou na jedné stránce dvě varianty trasy (různé třídy lodí), zahrň tu detailnější / delší
- pageIndex = index stránky PDF (0 = první strana) kde je mapa/schéma pro danou rozjížďku
- Vrať POUZE JSON, žádný jiný text

${text ? `Text z PDF:\n${text.slice(0, 25000)}` : ''}`

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8000,
        messages: [{ role: 'user', content: [...imageContent, { type: 'text', text: prompt }] }],
      }),
    })
    const json = await upstream.json()
    if (json.error || json.type === 'error') return res.status(500).json({ error: json.error?.message ?? 'API error' })
    const raw = json.content?.[0]?.text?.trim() ?? ''
    const start = raw.indexOf('{'); const end = raw.lastIndexOf('}')
    const parsed = JSON.parse(jsonrepair(raw.slice(start, end + 1)))
    res.json(parsed)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

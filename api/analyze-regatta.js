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

Vrať JSON se VŠEMI dny regaty od příjezdu po odjezd, seskupenými po dnech. Formát:
{
  "event": "název regaty",
  "location": "místo konání",
  "dates": "termín",
  "generalNotes": "nejdůležitější obecné pokyny: VHF kanál, pravidla, kontakty",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "dayName": "Sobota 9. května",
      "dayNotes": "program dne bez závodů — příjezd, přebírání lodí s časy, kotvení, večeře atd. Null pro závodní dny.",
      "races": [
        {
          "number": 1,
          "name": "název trasy, např. Murterské moře",
          "startTime": "HH:MM nebo null",
          "distanceNm": číslo nebo null,
          "startMark": "startovní bod",
          "finishMark": "cílový bod",
          "marks": ["1. otočný bod: název LB/PB", "2. otočný bod: název LB/PB"],
          "notes": "důležité poznámky (vítr, kotvení, bezpečnost)",
          "pageIndex": číslo 0-based stránky s mapou/schématem trasy
        }
      ]
    }
  ]
}

Pravidla:
- Zahrň KAŽDÝ den regaty — závodní i nezávodní (příjezd, volno, závěrečná večeře)
- Nezávodní dny: races = [], dayNotes = popis programu s časy
- Závodní dny: races = seznam závodů, dayNotes = null
- Zahrň KAŽDOU rozjížďku, nezastavuj se dříve
- Pokud jsou dvě varianty trasy (různé třídy), zahrni detailnější/delší
- pageIndex = index stránky PDF (0 = první strana) kde je MAPA trasy
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

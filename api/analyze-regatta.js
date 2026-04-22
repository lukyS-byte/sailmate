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

  const prompt = `Jsi expert na plachetnicové závody. Analyzuj závodní pokyny (Sailing Instructions).

KROK 1 — Nejdřív najdi v textu tabulku programu startů (Race Schedule / Programme / Harmonogram). Tabulka typicky vypadá takto:
  Race 1 | 12.7. | 11:00
  Race 2 | 12.7. | 14:00
  Race 3 | 13.7. | 10:00
  ...
Nebo: "Race 1 ... 11:00 ... Race 2 ... 14:00"

KROK 2 — Spočítej kolik je řádků/záznamů v tabulce. Každý řádek = jedna rozjížďka.

KROK 3 — Vrať JSON se VŠEMI rozjížďkami které jsi napočítal. Pokud je v tabulce 8 závodů, musí být v races[] 8 položek.

Vrať JEN validní JSON bez markdown:
{
  "event": "název regaty",
  "location": "místo konání",
  "dates": "termín konání",
  "generalNotes": "2-3 věty — nejdůležitější info",
  "importantPageIndexes": [čísla stránek 0-based se schématy tratí/mapami],
  "races": [
    {
      "number": 1,
      "date": "YYYY-MM-DD nebo null",
      "startTime": "HH:MM nebo null",
      "distanceNm": číslo nebo null,
      "courseType": "typ tratě nebo null",
      "marks": "popis bójek nebo null",
      "notes": "specifické pokyny nebo null",
      "windNotes": "poznámky k větru nebo null",
      "pageIndex": číslo 0-based
    }
  ]
}

Vrať POUZE JSON, žádný jiný text.

${text ? `Text z PDF (každá strana označena --- Strana X ---):\n${text.slice(0, 25000)}` : ''}`

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
        max_tokens: 8000,
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

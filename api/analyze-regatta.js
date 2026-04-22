import { jsonrepair } from 'jsonrepair'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const key = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY
  if (!key) return res.status(503).json({ error: 'ANTHROPIC_KEY není nastaven' })

  const { text = '', images = [] } = req.body

  const imageContent = images.slice(0, 8).map((b64) => ({
    type: 'image',
    source: { type: 'base64', media_type: 'image/jpeg', data: b64 },
  }))

  const prompt = `Jsi expert na plachetnicové závody. Pečlivě analyzuj tyto stránky závodních pokynů (Sailing Instructions) — prohlédni si obrázky i text.

Vrať JEN validní JSON bez markdown, v tomto formátu:
{
  "event": "název regaty",
  "location": "místo konání",
  "dates": "termín konání",
  "generalNotes": "2-3 věty — nejdůležitější obecné info: organizátor, kontakt, zvláštní pravidla, bezpečnost",
  "importantPageIndexes": [seznam čísel stránek 0-based které obsahují schémata tratí, mapy nebo diagramy bójek],
  "races": [
    {
      "number": 1,
      "date": "YYYY-MM-DD nebo null",
      "startTime": "HH:MM nebo null",
      "distanceNm": číslo nebo null,
      "courseType": "typ tratě např. triangle, windward-leeward, coastal nebo null",
      "marks": "stručný popis bójek a průjezdů nebo null",
      "notes": "specifické pokyny pro tuto rozjížďku nebo null",
      "windNotes": "poznámky k větru nebo null",
      "pageIndex": číslo 0-based — index stránky s nejrelevantnějším schématem pro tuto rozjížďku
    }
  ]
}

Pravidla: races max 15, importantPageIndexes max 8. Vrať POUZE JSON, žádný jiný text.

${text ? `Text z PDF:\n${text.slice(0, 6000)}` : ''}`

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
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

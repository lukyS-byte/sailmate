import { jsonrepair } from 'jsonrepair'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const key = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY
  const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN
  if (!key && !oauthToken) return res.status(503).json({ error: 'ANTHROPIC_KEY není nastaven' })

  const authHeaders = key
    ? { 'x-api-key': key }
    : { 'Authorization': `Bearer ${oauthToken}`, 'anthropic-beta': 'oauth-2025-04-20' }
  const { text = '', images = [] } = req.body

  const imageContent = images.slice(0, 10).map((b64) => ({
    type: 'image',
    source: { type: 'base64', media_type: 'image/jpeg', data: b64 },
  }))

  const prompt = `Jsi expert na plachetnicové závody. Pečlivě analyzuj CELÝ tento lodní deník / závodní pokyny (Sailing Instructions) od začátku do konce.

KROK 1 — PROJDI CELÝ DOKUMENT a najdi:
  a) VŠECHNY rozjížďky (závody) — podívej se na všechny strany, bývá jich 6-10. Nikdy nekonči u 2-3.
  b) VŠECHNY dny regaty — i dny bez závodu (příjezd, předání lodí, volný den, závěrečná večeře).
  c) VŠECHNY praktické/kapitánské informace — typicky: přejímka lodí, předání lodí, protesty, bezpečnost, kontrolní body, kotvení, VHF komunikace, kontakty, pojištění/spoluúčast, palubní vybavení, pokuty. Každé téma = samostatný objekt.

KROK 2 — Vrať POUZE tento JSON (žádný úvod, žádné markdown bloky):
{
  "event": "název regaty",
  "location": "místo konání",
  "dates": "termín",
  "generalNotes": "krátce: VHF kanál, hlavní kontakt",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "dayName": "Sobota 9. května",
      "dayNotes": "program nezávodního dne s časy (příjezd, přebírání, večeře) — jinak null",
      "races": [
        {
          "number": 1,
          "name": "název trasy",
          "startTime": "HH:MM nebo null",
          "distanceNm": číslo nebo null,
          "startMark": "startovní bod",
          "finishMark": "cílový bod",
          "marks": ["1. otočný bod: název LB/PB", "2. otočný bod: název LB/PB"],
          "notes": "důležité poznámky",
          "pageIndex": číslo 0-based stránky s mapou trasy
        }
      ]
    }
  ],
  "practicalInfo": [
    {
      "title": "Přejímka lodí",
      "content": "plný text zachovávající konkrétní detaily (časy, telefony, částky, postup)"
    }
  ]
}

DŮLEŽITÁ PRAVIDLA:
- NEUSTÁVEJ u několika prvních závodů — projdi CELÝ text a zahrni KAŽDOU rozjížďku
- Nezávodní dny: races = [], dayNotes = popis programu
- Závodní dny: races = seznam, dayNotes = null
- Pokud existují dvě varianty trasy (třídy), vyber delší/detailnější
- pageIndex = 0-based index strany s MAPOU
- practicalInfo: minimálně 3-5 témat pokud je v textu dostatek informací. Zachovej ČÍSELNÉ detaily (telefony, částky, časy, spoluúčasti).
- Nezkracuj — radši víc rozjížděk/témat než méně
- Vrať POUZE validní JSON

${text ? `TEXT DOKUMENTU:\n${text.slice(0, 40000)}` : ''}`

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 16000,
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

import { jsonrepair } from 'jsonrepair'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const key = process.env.OPENAI_API_KEY
  if (!key) return res.status(503).json({ error: 'OPENAI_API_KEY není nastaven na Vercelu' })

  const { text = '', images = [] } = req.body

  // OpenAI multimodal: typ "image_url" s data URL pro base64 vstup
  const imageContent = images.slice(0, 10).map((b64) => ({
    type: 'image_url',
    image_url: { url: `data:image/jpeg;base64,${b64}` },
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
- NIKDY si nic nevymýšlej. Pokud info není v textu, dej null nebo prázdný řetězec.
- NEUSTÁVEJ u několika prvních závodů — projdi CELÝ text a zahrni KAŽDOU rozjížďku
- DNY (days[]):
  * Použij POUZE dny, které jsou v dokumentu výslovně uvedené (program/harmonogram)
  * date: "YYYY-MM-DD" musí pocházet z dokumentu (např. z hlavičky nebo programu) — pokud rok není explicitně uvedený, použij rok z "dates"
  * dayName: česky, např. "Sobota 9. května" — den v týdnu MUSÍ odpovídat datu v daném roce. Když si nejsi 100% jistý dnem v týdnu, nepiš ho — dej jen "9. května".
  * Pokud nemáš jistotu o datu konkrétní rozjížďky, NEPŘIŘAZUJ ji k žádnému dni — radši ji zařaď do dne s dayName "Termín neurčen"
- Nezávodní dny: races = [], dayNotes = popis programu
- Závodní dny: races = seznam, dayNotes = null
- Pokud existují dvě varianty trasy (třídy), vyber delší/detailnější
- pageIndex = 0-based index strany s MAPOU dané rozjížďky
- practicalInfo: minimálně 3-5 témat pokud je v textu dostatek informací. Zachovej ČÍSELNÉ detaily (telefony, částky, časy, spoluúčasti).
- VYNECHEJ témata, která dávají smysl jen s obrázkem (vlajky, čísla lodí, barvy bez kontextu).
- Nezkracuj — radši víc rozjížděk/témat než méně
- Vrať POUZE validní JSON

${text ? `TEXT DOKUMENTU:\n${text.slice(0, 40000)}` : ''}`

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 16000,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [{
          role: 'user',
          content: [...imageContent, { type: 'text', text: prompt }],
        }],
      }),
    })
    const json = await upstream.json()
    if (!upstream.ok || json.error) {
      return res.status(upstream.status || 500).json({ error: json.error?.message ?? `OpenAI ${upstream.status}` })
    }
    const raw = json.choices?.[0]?.message?.content?.trim() ?? ''
    const start = raw.indexOf('{'); const end = raw.lastIndexOf('}')
    const parsed = JSON.parse(jsonrepair(raw.slice(start, end + 1)))
    res.json(parsed)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

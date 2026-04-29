import { jsonrepair } from 'jsonrepair'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const key = process.env.OPENAI_API_KEY
  if (!key) return res.status(503).json({ error: 'OPENAI_API_KEY není nastaven na Vercelu' })

  const { text = '' } = req.body

  const prompt = `Jsi asistent pro jachting. Z tohoto textu z lodního deníku nebo závodního bulletinu extrahuj všechny užitečné informace a vrať JEN validní JSON (bez markdown bloků):

{"event":"název závodu/výpravy","location":"místo","dates":"termín","summary":"krátké shrnutí 2-3 věty","logEntries":[{"timestamp":"ISO8601","weather":"popis počasí česky","windSpeed":číslo_nebo_null,"windDirection":"světová strana nebo null","notes":"důležité info"}],"waypoints":[{"name":"název","lat":číslo_nebo_null,"lng":číslo_nebo_null,"type":"marina|anchorage|waypoint","notes":"info"}]}

Pravidla: logEntries max 20, waypoints max 15, windSpeed v uzlech. Vrať POUZE JSON.

Text:
${text}`

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 2048,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const json = await upstream.json()
    if (!upstream.ok || json.error) {
      return res.status(upstream.status || 500).json({
        error: json.error?.message || `OpenAI ${upstream.status}`,
        upstream: json,
      })
    }
    const raw = json.choices?.[0]?.message?.content?.trim() ?? ''
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    const parsed = JSON.parse(jsonrepair(raw.slice(start, end + 1)))
    res.json(parsed)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

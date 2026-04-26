import { jsonrepair } from 'jsonrepair'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const key = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY
  const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN
  if (!key && !oauthToken) return res.status(503).json({ error: 'ANTHROPIC_KEY není nastaven' })

  const authHeaders = key
    ? { 'x-api-key': key }
    : { 'Authorization': `Bearer ${oauthToken}`, 'anthropic-beta': 'oauth-2025-04-20' }

  const { text = '' } = req.body

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
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `Jsi asistent pro jachting. Z tohoto textu z lodního deníku nebo závodního bulletinu extrahuj všechny užitečné informace a vrať JEN validní JSON (bez markdown bloků):\n\n{"event":"název závodu/výpravy","location":"místo","dates":"termín","summary":"krátké shrnutí 2-3 věty","logEntries":[{"timestamp":"ISO8601","weather":"popis počasí česky","windSpeed":číslo_nebo_null,"windDirection":"světová strana nebo null","notes":"důležité info"}],"waypoints":[{"name":"název","lat":číslo_nebo_null,"lng":číslo_nebo_null,"type":"marina|anchorage|waypoint","notes":"info"}]}\n\nPravidla: logEntries max 20, waypoints max 15, windSpeed v uzlech. Vrať POUZE JSON.\n\nText:\n${text}`,
        }],
      }),
    })
    const json = await upstream.json()
    const raw = json.content?.[0]?.text?.trim() ?? ''
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    const parsed = JSON.parse(jsonrepair(raw.slice(start, end + 1)))
    res.json(parsed)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { config as loadDotenv } from 'dotenv'
import { jsonrepair } from 'jsonrepair'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
const __dirname = fileURLToPath(new URL('.', import.meta.url))
loadDotenv({ path: resolve(__dirname, '.env.local'), override: true })

const buildSha = (() => {
  try {
    // Vercel expose COMMIT_SHA i VERCEL_GIT_COMMIT_SHA; lokálně použijeme git
    return (
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.COMMIT_SHA ||
      execSync('git rev-parse --short HEAD').toString().trim()
    ).slice(0, 7)
  } catch { return 'dev' }
})()

// Server-side Claude proxy — key never reaches the browser
function claudeProxyPlugin() {
  return {
    name: 'claude-proxy',
    configureServer(server) {
      // Invite code check — simple registration guard
      server.middlewares.use('/api/check-invite', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', () => {
          try {
            const { code } = JSON.parse(body)
            const expected = process.env.INVITE_CODE
            if (!expected) {
              // No invite code set — open registration
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
              return
            }
            if (code?.trim().toUpperCase() === expected.trim().toUpperCase()) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: true }))
            } else {
              res.statusCode = 403
              res.end(JSON.stringify({ ok: false, error: 'Nesprávný přístupový kód.' }))
            }
          } catch {
            res.statusCode = 400
            res.end(JSON.stringify({ ok: false, error: 'Chyba požadavku.' }))
          }
        })
      })

      server.middlewares.use('/api/analyze-regatta', async (req, res) => {
        const key = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY
        const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN
        if (!key && !oauthToken) {
          res.statusCode = 503
          res.end(JSON.stringify({ error: 'ANTHROPIC_KEY není nastaven' }))
          return
        }
        const authHeaders = key ? { 'x-api-key': key } : { 'Authorization': `Bearer ${oauthToken}` }
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', async () => {
          try {
            const { text, images = [] } = JSON.parse(body)

            // Build message content: images first, then text prompt
            const imageContent = images.slice(0, 10).map((b64) => ({
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
            if (json.error || json.type === 'error') {
              console.error('[upstream error]', JSON.stringify(json))
              throw new Error(`API: ${json.error?.message ?? json.error?.type ?? json.message ?? JSON.stringify(json)}`)
            }
            const raw = json.content?.[0]?.text?.trim() ?? ''
            const start = raw.indexOf('{'); const end = raw.lastIndexOf('}')
            const { jsonrepair } = await import('jsonrepair')
            const parsed = JSON.parse(jsonrepair(raw.slice(start, end + 1)))
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(parsed))
          } catch (e) {
            console.error('[analyze-regatta]', e)
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message || String(e), stack: e.stack }))
          }
        })
      })

      server.middlewares.use('/api/analyze-pdf', async (req, res) => {
        const key = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY
        const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN
        if (!key && !oauthToken) {
          res.statusCode = 503
          res.end(JSON.stringify({ error: 'ANTHROPIC_KEY není nastaven v .env.local' }))
          return
        }
        const authHeaders = key
          ? { 'x-api-key': key }
          : { 'Authorization': `Bearer ${oauthToken}` }
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', async () => {
          try {
            const { text } = JSON.parse(body)
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
            const jsonStr = raw.slice(start, end + 1)
            const parsed = JSON.parse(jsonrepair(jsonStr))
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(parsed))
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message }))
          }
        })
      })
      // Delete Supabase auth user (requires SUPABASE_SERVICE_ROLE_KEY in .env.local)
      server.middlewares.use('/api/delete-account', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end('Method Not Allowed'); return }
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!serviceKey) {
          res.statusCode = 503
          res.end(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY není nastaven' }))
          return
        }
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', async () => {
          try {
            const { userId } = JSON.parse(body)
            if (!userId) throw new Error('userId chybí')
            const supabaseUrl = process.env.SUPABASE_URL || 'https://kgteeyrfzwdptdvhjtbs.supabase.co'
            const r = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
              method: 'DELETE',
              headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
            })
            if (!r.ok) {
              const err = await r.json().catch(() => ({}))
              throw new Error(err.message ?? `Supabase error ${r.status}`)
            }
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  define: {
    __BUILD_SHA__: JSON.stringify(buildSha),
  },
  plugins: [
    claudeProxyPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: 'SailMate — Lodní deník',
        short_name: 'SailMate',
        description: 'Aplikace pro kapitány plachetnic — plánování, náklady, trasy',
        theme_color: '#0c2340',
        background_color: '#f0f9ff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
})

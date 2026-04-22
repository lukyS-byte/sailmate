const CACHE_KEY = 'fx_rates'
const CACHE_TTL = 24 * 60 * 60 * 1000

// Fallback rates relative to EUR (updated 2025)
const FALLBACK = {
  EUR: 1, CZK: 25.2, USD: 1.08, GBP: 0.86,
  CHF: 0.96, NOK: 11.8, SEK: 11.3, DKK: 7.46,
  PLN: 4.25, HUF: 395, HRK: 7.53,
}

export async function getRates(base = 'EUR') {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { ts, rates } = JSON.parse(cached)
      if (Date.now() - ts < CACHE_TTL) return rates
    }
  } catch {}

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`)
    if (!res.ok) throw new Error()
    const json = await res.json()
    const rates = json.rates
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), rates }))
    return rates
  } catch {
    return FALLBACK
  }
}

export function convert(amount, from, to, rates) {
  if (from === to) return amount
  const r = rates ?? FALLBACK
  const inEUR = amount / (r[from] ?? 1)
  return inEUR * (r[to] ?? 1)
}

export const SUPPORTED_CURRENCIES = [
  'EUR', 'CZK', 'USD', 'GBP', 'CHF', 'NOK', 'SEK', 'DKK', 'PLN', 'HUF',
]

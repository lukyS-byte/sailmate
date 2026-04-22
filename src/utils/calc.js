// Haversine — nautical miles between two lat/lng points
export function nmBetween(lat1, lon1, lat2, lon2) {
  const R = 3440.065
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function hoursToETA(nm, knots = 5) {
  if (!nm || !knots) return null
  const h = nm / knots
  const hours = Math.floor(h)
  const mins = Math.round((h - hours) * 60)
  return { hours, mins, total: h }
}

export function formatETA({ hours, mins }) {
  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours} h`
  return `${hours} h ${mins} min`
}

// Port fee estimate (€/night) by country for boat LOA in meters
export function estimatePortFee(country, loa) {
  const rates = {
    HR: [
      { maxLoa: 8, fee: 18 }, { maxLoa: 10, fee: 24 }, { maxLoa: 12, fee: 32 },
      { maxLoa: 14, fee: 42 }, { maxLoa: 16, fee: 55 }, { maxLoa: 20, fee: 70 },
      { maxLoa: 99, fee: 90 },
    ],
    GR: [
      { maxLoa: 8, fee: 10 }, { maxLoa: 10, fee: 15 }, { maxLoa: 12, fee: 22 },
      { maxLoa: 14, fee: 30 }, { maxLoa: 16, fee: 40 }, { maxLoa: 20, fee: 55 },
      { maxLoa: 99, fee: 75 },
    ],
    IT: [
      { maxLoa: 8, fee: 30 }, { maxLoa: 10, fee: 45 }, { maxLoa: 12, fee: 60 },
      { maxLoa: 14, fee: 80 }, { maxLoa: 16, fee: 100 }, { maxLoa: 20, fee: 130 },
      { maxLoa: 99, fee: 170 },
    ],
    ME: [
      { maxLoa: 8, fee: 15 }, { maxLoa: 10, fee: 20 }, { maxLoa: 12, fee: 28 },
      { maxLoa: 14, fee: 38 }, { maxLoa: 16, fee: 50 }, { maxLoa: 20, fee: 65 },
      { maxLoa: 99, fee: 85 },
    ],
    ES: [
      { maxLoa: 8, fee: 25 }, { maxLoa: 10, fee: 38 }, { maxLoa: 12, fee: 52 },
      { maxLoa: 14, fee: 70 }, { maxLoa: 16, fee: 90 }, { maxLoa: 20, fee: 115 },
      { maxLoa: 99, fee: 150 },
    ],
  }
  const table = rates[country] ?? rates.HR
  const row = table.find((r) => loa <= r.maxLoa) ?? table[table.length - 1]
  return row.fee
}

// Expense splitting — returns { crewId: balance } and transactions
// rates: exchange rate map relative to EUR (from getRates()), baseCurrency: voyage currency
export function splitExpenses(expenses, crew, rates = null, baseCurrency = 'EUR') {
  const toBase = (amount, currency) => {
    if (!rates || !currency || currency === baseCurrency) return amount
    const inEUR = amount / (rates[currency] ?? 1)
    return inEUR * (rates[baseCurrency] ?? 1)
  }

  const balance = {}
  crew.forEach((c) => (balance[c.id] = 0))

  expenses.forEach((exp) => {
    const amount = toBase(exp.amount, exp.currency)
    const among = exp.splitAmong?.length ? exp.splitAmong : crew.map((c) => c.id)
    const share = amount / among.length
    balance[exp.paidBy] = (balance[exp.paidBy] ?? 0) + amount
    among.forEach((id) => {
      balance[id] = (balance[id] ?? 0) - share
    })
  })

  // Minimise transactions
  const transactions = []
  const pos = Object.entries(balance)
    .filter(([, v]) => v > 0.01)
    .sort((a, b) => b[1] - a[1])
  const neg = Object.entries(balance)
    .filter(([, v]) => v < -0.01)
    .sort((a, b) => a[1] - b[1])

  let i = 0, j = 0
  const p = pos.map(([id, v]) => ({ id, v }))
  const n = neg.map(([id, v]) => ({ id, v: -v }))

  while (i < p.length && j < n.length) {
    const amount = Math.min(p[i].v, n[j].v)
    if (amount > 0.01) {
      transactions.push({ from: n[j].id, to: p[i].id, amount: Math.round(amount * 100) / 100 })
    }
    p[i].v -= amount
    n[j].v -= amount
    if (p[i].v < 0.01) i++
    if (n[j].v < 0.01) j++
  }

  return { balance, transactions }
}

export function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

export const EXPENSE_CATEGORIES = [
  { id: 'charter', label: 'Charter', icon: '⚓' },
  { id: 'fuel', label: 'Palivo', icon: '⛽' },
  { id: 'port', label: 'Přístav', icon: '🏔️' },
  { id: 'food', label: 'Jídlo', icon: '🥘' },
  { id: 'drinks', label: 'Pití', icon: '🍺' },
  { id: 'equipment', label: 'Vybavení', icon: '🔧' },
  { id: 'activity', label: 'Aktivity', icon: '🤿' },
  { id: 'other', label: 'Ostatní', icon: '💰' },
]

export const COUNTRIES = [
  { code: 'HR', name: 'Chorvatsko' },
  { code: 'GR', name: 'Řecko' },
  { code: 'IT', name: 'Itálie' },
  { code: 'ME', name: 'Černá Hora' },
  { code: 'ES', name: 'Španělsko' },
]

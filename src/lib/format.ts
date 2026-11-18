export const todayISO = () => toISO(new Date())

export function toISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return toISO(d)
}

export function daysUntil(iso: string) {
  if (!iso) return null
  const a = new Date(todayISO() + 'T12:00:00').getTime()
  const b = new Date(iso + 'T12:00:00').getTime()
  return Math.round((b - a) / 86400000)
}

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', opts)
}

export function fmtDateShort(iso: string) {
  return fmtDate(iso, { weekday: 'short', day: '2-digit', month: 'short' })
}

export function relDays(iso: string) {
  const d = daysUntil(iso)
  if (d === null) return ''
  if (d === 0) return 'heute'
  if (d === 1) return 'morgen'
  if (d === -1) return 'gestern'
  if (d > 0) return `in ${d} Tagen`
  return `vor ${-d} Tagen`
}

export function fmtMoney(n: number | null | undefined) {
  if (n === null || n === undefined || isNaN(n)) return '–'
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

export function fmtDuration(sec: number | null | undefined) {
  if (!sec) return '–'
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function parseDuration(s: string): number | null {
  const t = s.trim()
  if (!t) return null
  if (t.includes(':')) {
    const [m, sec] = t.split(':')
    return Number(m) * 60 + Number(sec || 0)
  }
  const n = Number(t.replace(',', '.'))
  if (isNaN(n)) return null
  return n < 20 ? Math.round(n * 60) : Math.round(n) // "4.5" = Minuten, "270" = Sekunden
}

export function timeAgo(ms: number) {
  const diff = Date.now() - ms
  const min = Math.round(diff / 60000)
  if (min < 1) return 'gerade eben'
  if (min < 60) return `vor ${min} Min.`
  const h = Math.round(min / 60)
  if (h < 24) return `vor ${h} Std.`
  const d = Math.round(h / 24)
  return `vor ${d} Tag${d === 1 ? '' : 'en'}`
}

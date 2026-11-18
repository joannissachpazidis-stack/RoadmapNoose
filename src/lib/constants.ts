import type { Area, ContactType, ContentStatus, EventType, GigStatus, GoalStatus, ReleaseStatus, ReleaseType, SongStage } from '../types'

export const SONG_STAGES: { key: SongStage; label: string; hint: string; color: string }[] = [
  { key: 'idee', label: 'Idee / Riff', hint: 'Riff, Melodie oder Konzept existiert – z.B. als Handy-Memo.', color: '#52525b' },
  { key: 'skizze', label: 'Skizze', hint: 'Grobe Struktur, die Hauptteile stehen.', color: '#6b7280' },
  { key: 'arrangement', label: 'Instrumental steht', hint: 'Instrumental weitgehend fertig (Struktur, Riffs, Drums programmiert) – Vocals & Lyrics fehlen noch.', color: '#a16207' },
  { key: 'demo', label: 'Pre-Prod mit Vocals', hint: 'Pre-Production-Demo mit Vocals & Lyrics – der Song ist komplett, Feinschliff folgt in Recording & Proben.', color: '#ca8a04' },
  { key: 'probereif', label: 'Live-ready', hint: 'Alle Parts sitzen inkl. Backing-Track/Click – bereit für die Bühne.', color: '#16a34a' },
  { key: 'liveerprobt', label: 'Live erprobt', hint: 'Mind. einmal live gespielt, Feedback ist eingearbeitet.', color: '#0d9488' },
  { key: 'aufnahme', label: 'Recording', hint: 'Finale Aufnahmen laufen.', color: '#2563eb' },
  { key: 'mix', label: 'Mix / Master', hint: 'Im Mixing oder Mastering.', color: '#7c3aed' },
  { key: 'veroeffentlicht', label: 'Veröffentlicht', hint: 'Draußen auf allen Plattformen.', color: '#dc2626' },
  { key: 'archiv', label: 'Archiv', hint: 'Auf Eis gelegt – Ideen bleiben erhalten.', color: '#3f3f46' },
]

export const STAGE_INDEX: Record<SongStage, number> = Object.fromEntries(SONG_STAGES.map((s, i) => [s.key, i])) as Record<SongStage, number>

export function stageAtLeast(stage: SongStage, min: SongStage): boolean {
  if (stage === 'archiv') return false
  return STAGE_INDEX[stage] >= STAGE_INDEX[min]
}

export const SONG_PARTS: { key: string; label: string; group: 'Instrumental' | 'Vocals' | 'Finish' }[] = [
  { key: 'riffs', label: 'Riffs & Hauptideen', group: 'Instrumental' },
  { key: 'structure', label: 'Songstruktur fix', group: 'Instrumental' },
  { key: 'drums', label: 'Drums programmiert', group: 'Instrumental' },
  { key: 'guitars', label: 'Gitarren', group: 'Instrumental' },
  { key: 'bass', label: 'Bass', group: 'Instrumental' },
  { key: 'leads', label: 'Leads / Melodien', group: 'Instrumental' },
  { key: 'electronics', label: 'Electronics / Synths / Samples', group: 'Instrumental' },
  { key: 'breakdown', label: 'Breakdown(s)', group: 'Instrumental' },
  { key: 'lyrics', label: 'Lyrics fertig', group: 'Vocals' },
  { key: 'screams', label: 'Screams / Shouts', group: 'Vocals' },
  { key: 'cleans', label: 'Cleans / Hook', group: 'Vocals' },
  { key: 'rap', label: 'Rap- / Trap-Parts', group: 'Vocals' },
  { key: 'transitions', label: 'Intro/Outro & Übergänge', group: 'Finish' },
  { key: 'demo', label: 'Pre-Prod-Demo mit Vocals', group: 'Finish' },
]

/** Fortschritt der Bausteine: 'na' (nicht nötig) zählt nicht mit */
export function partsProgress(parts: Record<string, boolean | 'na'> | undefined) {
  const p = parts ?? {}
  const relevant = SONG_PARTS.filter((x) => p[x.key] !== 'na')
  return { done: relevant.filter((x) => p[x.key] === true).length, total: relevant.length }
}

export function hasVocals(parts: Record<string, boolean | 'na'> | undefined) {
  const p = parts ?? {}
  return p.lyrics === true && (p.screams === true || p.cleans === true || p.rap === true)
}

export const READINESS = [
  { v: 0, label: 'Kann ich noch nicht', short: '✗', color: '#7f1d1d' },
  { v: 1, label: 'Wackelig', short: '~', color: '#a16207' },
  { v: 2, label: 'Sitzt', short: '✓', color: '#15803d' },
]

export const AREAS: Record<Area, { label: string; color: string }> = {
  fundament: { label: 'Fundament', color: '#a1a1aa' },
  songwriting: { label: 'Songwriting', color: '#eab308' },
  live: { label: 'Live', color: '#f97316' },
  release: { label: 'Release', color: '#dc2626' },
  promo: { label: 'Promo', color: '#ec4899' },
  merch: { label: 'Merch', color: '#8b5cf6' },
  business: { label: 'Business & Recht', color: '#3b82f6' },
  finanzen: { label: 'Finanzen', color: '#22c55e' },
}

export const GOAL_STATUS: Record<GoalStatus, { label: string; color: string }> = {
  offen: { label: 'Offen', color: '#71717a' },
  aktiv: { label: 'In Arbeit', color: '#eab308' },
  erledigt: { label: 'Erledigt', color: '#16a34a' },
  pausiert: { label: 'Pausiert', color: '#52525b' },
}

export const RELEASE_TYPES: Record<ReleaseType, string> = { single: 'Single', ep: 'EP', album: 'Album' }
export const RELEASE_STATUS: Record<ReleaseStatus, string> = {
  planung: 'Planung',
  produktion: 'Produktion',
  kampagne: 'Kampagne',
  veroeffentlicht: 'Veröffentlicht',
}

export const GIG_STATUS: Record<GigStatus, { label: string; color: string }> = {
  idee: { label: 'Idee', color: '#52525b' },
  angefragt: { label: 'Angefragt', color: '#a16207' },
  bestaetigt: { label: 'Bestätigt', color: '#16a34a' },
  gespielt: { label: 'Gespielt', color: '#2563eb' },
  abgesagt: { label: 'Abgesagt', color: '#7f1d1d' },
}

export const EVENT_TYPES: Record<EventType, string> = {
  probe: 'Probe',
  meeting: 'Band-Meeting',
  studio: 'Studio',
  shooting: 'Foto/Video',
  deadline: 'Deadline',
  sonstiges: 'Sonstiges',
}

export const CONTACT_TYPES: Record<ContactType, string> = {
  venue: 'Venue / Club',
  veranstalter: 'Veranstalter',
  band: 'Band',
  studio: 'Studio / Produzent',
  presse: 'Presse / Webzine / Podcast',
  fotograf: 'Foto / Video',
  label: 'Label',
  booking: 'Booking-Agentur',
  kandidat: 'Drummer-Kandidat:in',
  sonstiges: 'Sonstiges',
}

export const CONTENT_STATUS: Record<ContentStatus, string> = {
  idee: 'Idee',
  geplant: 'Geplant',
  produziert: 'Produziert',
  gepostet: 'Gepostet',
}

export const TX_CATEGORIES = [
  'Mitgliedsbeitrag',
  'Gage',
  'Merch-Verkauf',
  'Streaming/Downloads',
  'Förderung',
  'Proberaum',
  'Recording/Mix/Master',
  'Equipment',
  'Merch-Produktion',
  'Promo/Werbung',
  'Fahrtkosten',
  'Grafik/Foto/Video',
  'Gebühren/Abos',
  'Sonstiges',
]

export const MEMBER_COLORS = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

export const TUNINGS = ['E Standard', 'Eb Standard', 'D Standard', 'Drop D', 'C# Standard', 'Drop C#', 'C Standard', 'Drop C', 'B Standard', 'Drop B', 'Drop A', '7-Saiter B', '7-Saiter Drop A', '8-Saiter F#']

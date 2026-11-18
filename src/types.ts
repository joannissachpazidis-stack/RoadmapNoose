// Datenmodell der App. Jede Sammlung (collection) besteht aus Dokumenten mit einer id.

export interface Base {
  id: string
  createdAt?: number
}

export interface Task {
  id: string
  text: string
  done: boolean
}

export interface Member extends Base {
  name: string
  roles: string // z.B. "Gitarre, Backing Vocals"
  responsibilities: string // z.B. "Social Media, Bandkasse"
  color: string
}

export type Area =
  | 'fundament'
  | 'songwriting'
  | 'live'
  | 'release'
  | 'promo'
  | 'merch'
  | 'business'
  | 'finanzen'

export interface Phase extends Base {
  title: string
  description: string
  order: number
  horizon: string // z.B. "0–3 Monate"
}

export type GoalStatus = 'offen' | 'aktiv' | 'erledigt' | 'pausiert'

export interface Goal extends Base {
  title: string
  description: string
  why: string
  phaseId: string
  area: Area
  status: GoalStatus
  ownerIds: string[]
  due: string // ISO-Datum oder ''
  focus: boolean
  tasks: Task[]
  templateId?: string
  doneAt?: number
  lastTouched?: number
}

export type SongStage =
  | 'idee'
  | 'skizze'
  | 'arrangement'
  | 'demo'
  | 'probereif'
  | 'liveerprobt'
  | 'aufnahme'
  | 'mix'
  | 'veroeffentlicht'
  | 'archiv'

export interface Song extends Base {
  title: string
  stage: SongStage
  tuning: string
  bpm: number | null
  songKey: string
  durationSec: number | null
  parts: Record<string, boolean>
  readiness: Record<string, number> // memberId -> 0 (kann nicht), 1 (wackelig), 2 (sitzt)
  composers: string
  lyricists: string
  lyricsTheme: string
  lyrics: string
  notes: string
  links: string
  rating: number // 0-5 eigene Einschätzung
  gemaRegistered: boolean
  isrc: string
  click: boolean // zum Click geprobt
  stageChangedAt?: number
}

export type ReleaseType = 'single' | 'ep' | 'album'
export type ReleaseStatus = 'planung' | 'produktion' | 'kampagne' | 'veroeffentlicht'

export interface ReleaseTask extends Task {
  offsetDays: number // relativ zum Release-Tag, negativ = vorher
  area: string
}

export interface Release extends Base {
  title: string
  type: ReleaseType
  status: ReleaseStatus
  releaseDate: string
  songIds: string[]
  distributor: string
  studio: string
  budget: number | null
  tasks: ReleaseTask[]
  notes: string
}

export type GigStatus = 'idee' | 'angefragt' | 'bestaetigt' | 'gespielt' | 'abgesagt'

export interface Gig extends Base {
  date: string
  time: string
  venue: string
  city: string
  status: GigStatus
  fee: number | null
  contactId: string
  setlist: string[] // Song-IDs in Reihenfolge
  slotMinutes: number | null
  lineup: string
  attendance: number | null
  merchRevenue: number | null
  notes: string
  learnings: string
}

export type EventType = 'probe' | 'meeting' | 'studio' | 'shooting' | 'deadline' | 'sonstiges'

export interface CalEvent extends Base {
  title: string
  type: EventType
  date: string
  time: string
  notes: string
}

export type ContactType =
  | 'venue'
  | 'veranstalter'
  | 'band'
  | 'studio'
  | 'presse'
  | 'fotograf'
  | 'label'
  | 'booking'
  | 'sonstiges'

export interface Contact extends Base {
  name: string
  type: ContactType
  city: string
  email: string
  phone: string
  web: string
  notes: string
  lastContact: string
  nextStep: string
}

export interface MerchItem extends Base {
  name: string
  type: string
  unitCost: number | null
  price: number | null
  stock: string // z.B. "S:5, M:10, L:10, XL:5" oder Gesamtzahl
  sold: number
  supplier: string
  notes: string
}

export interface Transaction extends Base {
  date: string
  amount: number // positiv = Einnahme, negativ = Ausgabe
  category: string
  description: string
  memberId: string
}

export type ContentStatus = 'idee' | 'geplant' | 'produziert' | 'gepostet'

export interface ContentPost extends Base {
  title: string
  platform: string
  date: string
  status: ContentStatus
  format: string
  notes: string
}

export interface ChecklistItem extends Base {
  group: string // z.B. 'business', 'epk', 'live-tech'
  section: string
  title: string
  hint: string
  done: boolean
  notes: string
  order: number
}

export interface Settings extends Base {
  bandName: string
  genre: string
  hometown: string
  dismissedSuggestions: string[]
  lastReview: number
  seeded: boolean
  monthlyFee: number | null
}

export interface CollectionMap {
  members: Member
  phases: Phase
  goals: Goal
  songs: Song
  releases: Release
  gigs: Gig
  events: CalEvent
  contacts: Contact
  merch: MerchItem
  transactions: Transaction
  content: ContentPost
  checklist: ChecklistItem
  settings: Settings
}

export type CollectionName = keyof CollectionMap

// Band-Coach (Client): erkennt Ereignisse in der App, sammelt sie und lässt Claude
// über die Supabase Edge Function "coach" darauf reagieren. Antworten landen als
// Nachrichten in der Sammlung "coach" und sind für alle Bandmitglieder sichtbar.
import { useSyncExternalStore } from 'react'
import type { CoachMessage, CoachSuggestion } from '../types'
import { AREAS, CONTACT_TYPES, GIG_STATUS, GOAL_STATUS, RELEASE_STATUS, SONG_PARTS, SONG_STAGES, STAGE_INDEX } from './constants'
import { fmtDate } from './format'
import { store, uid } from './store'
import { sync } from './sync'

type Data = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const DEBOUNCE_MS = 90_000 // nach der letzten Änderung warten, um Ereignisse zu bündeln
const AUTO_COOLDOWN_MS = 10 * 60_000 // höchstens alle 10 Minuten eine automatische Reaktion
const MAX_QUEUE = 40

const q = (s: unknown) => `„${String(s ?? '').trim() || '–'}“`
const stageLabel = (k: string) => SONG_STAGES[STAGE_INDEX[k as keyof typeof STAGE_INDEX]]?.label ?? k

/** Übersetzt eine Änderung in lesbare Ereignisse (leer = nicht relevant) */
export function describeChange(collection: string, prev: Data | undefined, next: Data | undefined): string[] {
  const out: string[] = []
  const created = !prev && next
  const deleted = prev && !next
  const p = prev ?? {}
  const n = next ?? {}
  switch (collection) {
    case 'goals': {
      if (created) out.push(`Neues Ziel angelegt: ${q(n.title)} (${AREAS[n.area as keyof typeof AREAS]?.label ?? n.area})`)
      else if (deleted) out.push(`Ziel gelöscht: ${q(p.title)}`)
      else {
        if (p.status !== n.status) out.push(`Ziel ${q(n.title)}: Status ${GOAL_STATUS[p.status as keyof typeof GOAL_STATUS]?.label ?? p.status} → ${GOAL_STATUS[n.status as keyof typeof GOAL_STATUS]?.label ?? n.status}`)
        if (!p.focus && n.focus) out.push(`Als Fokus-Ziel markiert: ${q(n.title)}`)
        if (p.due !== n.due && n.due) out.push(`Zieldatum für ${q(n.title)}: ${fmtDate(n.due)}`)
        const before = new Set((p.tasks ?? []).filter((t: Data) => t.done).map((t: Data) => t.id))
        for (const t of n.tasks ?? []) if (t.done && !before.has(t.id)) out.push(`Schritt erledigt bei ${q(n.title)}: ${t.text}`)
        const known = new Set((p.tasks ?? []).map((t: Data) => t.id))
        for (const t of n.tasks ?? []) if (!known.has(t.id)) out.push(`Neuer Schritt bei ${q(n.title)}: ${t.text}`)
      }
      break
    }
    case 'songs': {
      if (created) out.push(`Neuer Song / neue Idee: ${q(n.title)} (Stadium: ${stageLabel(n.stage)})`)
      else if (deleted) out.push(`Song gelöscht: ${q(p.title)}`)
      else {
        if (p.stage !== n.stage) out.push(`Song ${q(n.title)}: ${stageLabel(p.stage)} → ${stageLabel(n.stage)}`)
        const done = SONG_PARTS.filter((x) => n.parts?.[x.key] === true && p.parts?.[x.key] !== true).map((x) => x.label)
        if (done.length) out.push(`Song ${q(n.title)}: fertig – ${done.join(', ')}`)
        if (!p.click && n.click) out.push(`Song ${q(n.title)} sitzt jetzt zum Click`)
        if (!p.lyrics && n.lyrics) out.push(`Song ${q(n.title)}: erste Lyrics eingetragen`)
        if (p.title && p.title !== n.title) out.push(`Song umbenannt: ${q(p.title)} → ${q(n.title)}`)
      }
      break
    }
    case 'gigs': {
      const label = (s: string) => GIG_STATUS[s as keyof typeof GIG_STATUS]?.label ?? s
      if (created) out.push(`Gig eingetragen: ${n.venue}${n.city ? ', ' + n.city : ''} (${label(n.status)}${n.date ? ', ' + fmtDate(n.date) : ''})`)
      else if (deleted) out.push(`Gig gelöscht: ${p.venue}`)
      else {
        if (p.status !== n.status) out.push(`Gig ${n.venue}: ${label(p.status)} → ${label(n.status)}`)
        if (!p.learnings && n.learnings) out.push(`Learnings zum Gig ${n.venue}: ${String(n.learnings).slice(0, 300)}`)
      }
      break
    }
    case 'releases': {
      if (created) out.push(`Release angelegt: ${q(n.title)} (${n.type}${n.releaseDate ? ', ' + fmtDate(n.releaseDate) : ''})`)
      else if (deleted) out.push(`Release gelöscht: ${q(p.title)}`)
      else {
        if (p.status !== n.status) out.push(`Release ${q(n.title)}: ${RELEASE_STATUS[p.status as keyof typeof RELEASE_STATUS]} → ${RELEASE_STATUS[n.status as keyof typeof RELEASE_STATUS]}`)
        if (p.releaseDate !== n.releaseDate && n.releaseDate) out.push(`Release ${q(n.title)}: Datum ${fmtDate(n.releaseDate)}`)
        const before = new Set((p.tasks ?? []).filter((t: Data) => t.done).map((t: Data) => t.id))
        for (const t of n.tasks ?? []) if (t.done && !before.has(t.id)) out.push(`Release ${q(n.title)} – erledigt: ${t.text}`)
      }
      break
    }
    case 'contacts': {
      if (created) out.push(`Neuer Kontakt: ${n.name} (${CONTACT_TYPES[n.type as keyof typeof CONTACT_TYPES] ?? n.type})`)
      else if (!deleted && p.lastContact !== n.lastContact && n.lastContact) out.push(`Kontakt gehalten mit ${n.name}`)
      break
    }
    case 'checklist':
      if (!deleted && !p.done && n.done) out.push(`Checkliste abgehakt: ${q(n.title)}`)
      break
    case 'events':
      if (created) out.push(`Termin eingetragen: ${n.title} am ${fmtDate(n.date)}${n.repeat && n.repeat !== 'none' ? ' (Serie)' : ''}`)
      break
    case 'members':
      if (created) out.push(`Neues Mitglied: ${n.name} (${n.roles || '–'})`)
      else if (!deleted && p.responsibilities !== n.responsibilities && n.responsibilities) out.push(`${n.name} ist jetzt zuständig für: ${n.responsibilities}`)
      break
    case 'merch':
      if (created) out.push(`Neuer Merch-Artikel: ${n.name}`)
      break
    case 'transactions':
      if (created && Math.abs(Number(n.amount)) >= 100) out.push(`Bandkasse: ${n.amount > 0 ? 'Einnahme' : 'Ausgabe'} ${Math.abs(n.amount)} € (${n.category}${n.description ? ', ' + n.description : ''})`)
      break
    case 'content':
      if (!deleted && p.status !== 'gepostet' && n.status === 'gepostet') out.push(`Content gepostet: ${n.title} (${n.platform})`)
      break
  }
  return out
}

export interface CoachState {
  busy: boolean
  error: string
  queue: string[]
}

class Coach {
  state: CoachState = { busy: false, error: '', queue: [] }
  private listeners = new Set<() => void>()
  private timer: ReturnType<typeof setTimeout> | null = null
  private scope = ''

  constructor() {
    this.loadQueue()
    store.onLocalChange = (collection, prev, next) => {
      if (collection === 'coach' || collection === 'settings') return
      const events = describeChange(collection, prev, next)
      if (!events.length) return
      if (this.scope !== store.scope) this.loadQueue()
      const time = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      this.setQueue([...this.state.queue, ...events.map((e) => `${time} · ${e}`)].slice(-MAX_QUEUE))
      this.schedule()
    }
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  getState = () => this.state
  private set(patch: Partial<CoachState>) {
    this.state = { ...this.state, ...patch }
    for (const l of this.listeners) l()
  }

  private loadQueue() {
    this.scope = store.scope
    try {
      this.state = { ...this.state, queue: JSON.parse(localStorage.getItem('br:coachq:' + this.scope) ?? '[]') }
    } catch {
      this.state = { ...this.state, queue: [] }
    }
  }
  private setQueue(queue: string[]) {
    localStorage.setItem('br:coachq:' + this.scope, JSON.stringify(queue))
    this.set({ queue })
  }

  /** Coach ist nutzbar, wenn eine Band per Supabase verbunden ist */
  available() {
    return !!sync.client && !!sync.state.activeBand && !!sync.state.session
  }

  mode() {
    return store.list('settings')[0]?.coachMode ?? 'auto'
  }

  private schedule() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.maybeAuto(), DEBOUNCE_MS)
  }

  private async maybeAuto() {
    if (this.mode() !== 'auto' || !this.available() || !this.state.queue.length || this.state.busy) return
    const last = Number(localStorage.getItem('br:coachAuto:' + store.scope) ?? 0)
    const wait = last + AUTO_COOLDOWN_MS - Date.now()
    if (wait > 0) {
      this.timer = setTimeout(() => void this.maybeAuto(), wait + 1000)
      return
    }
    localStorage.setItem('br:coachAuto:' + store.scope, String(Date.now()))
    await this.send('events')
  }

  private flushEvents() {
    if (this.scope !== store.scope) this.loadQueue()
    if (!this.state.queue.length) return
    store.put('coach', { role: 'event', text: this.state.queue.join('\n'), author: store.author || 'App', at: Date.now() })
    this.setQueue([])
  }

  /** Nachricht an den Coach (optional), offene Ereignisse werden mitgeschickt */
  async send(trigger: 'events' | 'message' | 'checkin', text?: string) {
    if (!this.available()) {
      this.set({ error: 'Der Coach braucht den Cloud-Sync (Supabase) und die eingerichtete Coach-Funktion – siehe "Sync & Einstellungen".' })
      return
    }
    this.flushEvents()
    if (text?.trim()) store.put('coach', { role: 'user', text: text.trim(), author: store.author || 'Band', at: Date.now() })
    this.set({ busy: true, error: '' })
    try {
      // Sicherstellen, dass die neuen Nachrichten auf dem Server sind, bevor der Coach liest
      await sync.push()
      const { error } = await sync.client!.functions.invoke('coach', { body: { bandId: sync.state.activeBand!.id, trigger } })
      if (error) {
        let msg = error.message
        const ctx = (error as { context?: Response }).context
        if (ctx && typeof ctx.json === 'function') {
          try {
            const body = await ctx.json()
            if (body?.error) msg = body.error
          } catch {
            /* ignore */
          }
        }
        throw new Error(msg)
      }
      await sync.resync()
    } catch (e) {
      this.set({ error: 'Coach nicht erreichbar: ' + (e as Error).message })
    } finally {
      this.set({ busy: false })
    }
  }

  answer(msg: CoachMessage, questionId: string, answer: string) {
    const question = msg.questions?.find((x) => x.id === questionId)
    store.put('coach', { id: msg.id, answered: [...(msg.answered ?? []), questionId] })
    return this.send('message', question ? `Antwort auf „${question.text}“: ${answer}` : answer)
  }

  /** Vorschlag übernehmen: als Ziel oder als Schritt in ein bestehendes Ziel */
  applySuggestion(msg: CoachMessage, s: CoachSuggestion) {
    // ohne Ereignis-Tracking, damit der Coach nicht auf seine eigenen Vorschläge reagiert
    store.mute(() => this.applyInner(msg, s))
  }

  private applyInner(msg: CoachMessage, s: CoachSuggestion) {
    const goal = s.goalId ? store.get('goals', s.goalId) : undefined
    if (s.kind === 'task' && goal) {
      store.put('goals', { id: goal.id, tasks: [...goal.tasks, { id: uid(), text: s.title, done: false }], lastTouched: Date.now() })
    } else {
      const phases = [...store.list('phases')].sort((a, b) => a.order - b.order)
      const phaseId = phases.some((p) => p.id === s.phaseId) ? s.phaseId : (phases[0]?.id ?? '')
      store.put('goals', {
        title: s.title,
        description: s.detail,
        why: s.why,
        phaseId,
        area: s.area in AREAS ? s.area : 'fundament',
        status: 'offen',
        ownerIds: [],
        due: '',
        focus: false,
        tasks: [],
        lastTouched: Date.now(),
      })
    }
    store.put('coach', { id: msg.id, suggestions: (msg.suggestions ?? []).map((x) => (x.id === s.id ? { ...x, appliedAt: Date.now() } : x)) })
  }

  markSeen() {
    localStorage.setItem('br:coachSeen:' + store.scope, String(Date.now()))
  }
  lastSeen() {
    return Number(localStorage.getItem('br:coachSeen:' + store.scope) ?? 0)
  }
}

export const coach = new Coach()

export function useCoach(): CoachState {
  return useSyncExternalStore(coach.subscribe, coach.getState)
}

// Local-first Datenspeicher. Alle Daten liegen als Dokumente im Browser (localStorage)
// und werden – wenn Supabase eingerichtet ist – mit der Band synchronisiert (siehe sync.ts).
import { useSyncExternalStore } from 'react'
import type { CollectionMap, CollectionName } from '../types'

export interface Rec {
  id: string
  collection: string
  data: Record<string, unknown>
  updatedAt: number
  updatedBy?: string
  deleted: boolean
}

type Listener = () => void
const PREFIX = 'br:data:'
const PENDING_PREFIX = 'br:pending:'

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

class Store {
  scope = 'local'
  recs = new Map<string, Rec>()
  pending = new Set<string>()
  private listeners = new Set<Listener>()
  private version = 0
  private cache = new Map<string, { version: number; list: unknown[] }>()
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  /** wird von sync.ts gesetzt, um lokale Änderungen hochzuladen */
  onLocalWrite: ((recs: Rec[]) => void) | null = null
  author = ''

  constructor() {
    this.load('local')
  }

  load(scope: string) {
    this.flush()
    this.scope = scope
    this.recs.clear()
    this.pending.clear()
    try {
      const raw = localStorage.getItem(PREFIX + scope)
      if (raw) for (const r of JSON.parse(raw) as Rec[]) this.recs.set(r.id, r)
      const p = localStorage.getItem(PENDING_PREFIX + scope)
      if (p) for (const id of JSON.parse(p) as string[]) this.pending.add(id)
    } catch (e) {
      console.error('Konnte lokale Daten nicht laden', e)
    }
    this.emit(false)
  }

  hasData(scope = this.scope): boolean {
    if (scope === this.scope) return [...this.recs.values()].some((r) => !r.deleted)
    const raw = localStorage.getItem(PREFIX + scope)
    return !!raw && raw.length > 4
  }

  /** Kopiert alle Datensätze eines Scopes (z.B. 'local') in den aktuellen Scope und markiert sie zum Hochladen */
  importScope(from: string) {
    const raw = localStorage.getItem(PREFIX + from)
    if (!raw) return
    const now = Date.now()
    for (const r of JSON.parse(raw) as Rec[]) {
      if (r.deleted) continue
      const rec = { ...r, updatedAt: now, updatedBy: this.author }
      this.recs.set(r.id, rec)
      this.pending.add(r.id)
    }
    this.emit()
    this.onLocalWrite?.([...this.pending].map((id) => this.recs.get(id)!).filter(Boolean))
  }

  subscribe = (fn: Listener) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getVersion = () => this.version

  private emit(persist = true) {
    this.version++
    this.cache.clear()
    for (const l of this.listeners) l()
    if (persist) this.scheduleSave()
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.flush(), 250)
  }

  flush() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    try {
      localStorage.setItem(PREFIX + this.scope, JSON.stringify([...this.recs.values()]))
      localStorage.setItem(PENDING_PREFIX + this.scope, JSON.stringify([...this.pending]))
    } catch (e) {
      console.error('Speichern fehlgeschlagen', e)
    }
  }

  list<K extends CollectionName>(collection: K): CollectionMap[K][] {
    const hit = this.cache.get(collection)
    if (hit && hit.version === this.version) return hit.list as CollectionMap[K][]
    const list: CollectionMap[K][] = []
    for (const r of this.recs.values()) {
      if (r.collection === collection && !r.deleted) list.push({ ...(r.data as object), id: r.id } as CollectionMap[K])
    }
    list.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
    this.cache.set(collection, { version: this.version, list })
    return list
  }

  get<K extends CollectionName>(collection: K, id: string): CollectionMap[K] | undefined {
    const r = this.recs.get(id)
    if (!r || r.deleted || r.collection !== collection) return undefined
    return { ...(r.data as object), id } as CollectionMap[K]
  }

  meta(id: string): Rec | undefined {
    return this.recs.get(id)
  }

  /** Legt an oder aktualisiert (Teil-Update möglich) */
  put<K extends CollectionName>(collection: K, item: Partial<CollectionMap[K]> & { id?: string }): string {
    return this.putMany(collection, [item])[0]
  }

  putMany<K extends CollectionName>(collection: K, items: (Partial<CollectionMap[K]> & { id?: string })[]): string[] {
    const now = Date.now()
    const changed: Rec[] = []
    const ids: string[] = []
    for (const item of items) {
      const id = item.id ?? uid()
      const prev = this.recs.get(id)
      const base = prev && !prev.deleted ? prev.data : { createdAt: now }
      const { id: _omit, ...rest } = item as Record<string, unknown>
      void _omit
      const rec: Rec = {
        id,
        collection,
        data: { ...base, ...rest },
        updatedAt: Math.max(now, (prev?.updatedAt ?? 0) + 1),
        updatedBy: this.author,
        deleted: false,
      }
      this.recs.set(id, rec)
      this.pending.add(id)
      changed.push(rec)
      ids.push(id)
    }
    this.emit()
    this.onLocalWrite?.(changed)
    return ids
  }

  remove(id: string) {
    const prev = this.recs.get(id)
    if (!prev) return
    const rec: Rec = { ...prev, deleted: true, updatedAt: Math.max(Date.now(), prev.updatedAt + 1), updatedBy: this.author }
    this.recs.set(id, rec)
    this.pending.add(id)
    this.emit()
    this.onLocalWrite?.([rec])
  }

  /** Remote-Datensätze einspielen (last write wins). Gibt zurück, ob sich etwas geändert hat. */
  applyRemote(remote: Rec[]): boolean {
    let changed = false
    for (const r of remote) {
      const local = this.recs.get(r.id)
      if (local && local.updatedAt > r.updatedAt) continue // lokal neuer -> bleibt pending
      if (local && local.updatedAt === r.updatedAt && local.deleted === r.deleted) {
        this.pending.delete(r.id)
        continue
      }
      this.recs.set(r.id, r)
      this.pending.delete(r.id)
      changed = true
    }
    if (changed) this.emit()
    else this.scheduleSave()
    return changed
  }

  markSynced(recs: Rec[]) {
    for (const r of recs) {
      const cur = this.recs.get(r.id)
      if (cur && cur.updatedAt === r.updatedAt) this.pending.delete(r.id)
    }
    this.scheduleSave()
    for (const l of this.listeners) l()
  }

  pendingRecs(): Rec[] {
    return [...this.pending].map((id) => this.recs.get(id)!).filter(Boolean)
  }

  exportJSON(): string {
    return JSON.stringify({ app: 'band-roadmap', version: 1, exportedAt: new Date().toISOString(), records: [...this.recs.values()].filter((r) => !r.deleted) }, null, 2)
  }

  importJSON(json: string, mode: 'merge' | 'replace') {
    const parsed = JSON.parse(json) as { records?: Rec[] }
    if (!parsed.records) throw new Error('Keine gültige Export-Datei')
    const now = Date.now()
    if (mode === 'replace') {
      for (const r of this.recs.values()) {
        if (!r.deleted) {
          this.recs.set(r.id, { ...r, deleted: true, updatedAt: now })
          this.pending.add(r.id)
        }
      }
    }
    for (const r of parsed.records) {
      this.recs.set(r.id, { ...r, updatedAt: now + 1, updatedBy: this.author, deleted: false })
      this.pending.add(r.id)
    }
    this.emit()
    this.onLocalWrite?.(this.pendingRecs())
  }
}

export const store = new Store()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => store.flush())
  // Änderungen aus anderen Tabs übernehmen
  window.addEventListener('storage', (e) => {
    if (e.key === PREFIX + store.scope && e.newValue) {
      try {
        store.applyRemote(JSON.parse(e.newValue) as Rec[])
      } catch {
        /* ignore */
      }
    }
  })
}

export function useCollection<K extends CollectionName>(collection: K): CollectionMap[K][] {
  useSyncExternalStore(store.subscribe, store.getVersion)
  return store.list(collection)
}

export function useStoreVersion(): number {
  return useSyncExternalStore(store.subscribe, store.getVersion)
}

export function useSettings() {
  useSyncExternalStore(store.subscribe, store.getVersion)
  const s = store.list('settings')[0]
  return s
}

export function updateSettings(patch: Partial<CollectionMap['settings']>) {
  const s = store.list('settings')[0]
  store.put('settings', { ...patch, id: s?.id ?? 'settings' })
}

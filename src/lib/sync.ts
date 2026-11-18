// Synchronisation mit Supabase: Login, Bands, Pull/Push und Realtime-Updates.
import { createClient, type RealtimeChannel, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { seedInitialData } from './roadmap'
import { store, type Rec } from './store'

const CFG_KEY = 'br:supabase'
const BAND_KEY = 'br:activeBand'
const NAME_KEY = 'br:displayName'

export interface SupabaseConfig {
  url: string
  anonKey: string
}

export interface Band {
  id: string
  name: string
  invite_code: string
}

export interface BandMember {
  user_id: string
  display_name: string
}

export type SyncStatus = 'local' | 'signedout' | 'noband' | 'connecting' | 'online' | 'offline' | 'error'

export interface SyncState {
  configured: boolean
  status: SyncStatus
  session: Session | null
  bands: Band[]
  activeBand: Band | null
  members: BandMember[]
  displayName: string
  error: string
  pending: number
  lastSync: number
}

interface RemoteRow {
  id: string
  collection: string
  data: Record<string, unknown>
  updated_at: number
  updated_by: string | null
  deleted: boolean
}

function readConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (raw) {
      const c = JSON.parse(raw) as SupabaseConfig
      if (c.url && c.anonKey) return c
    }
  } catch {
    /* ignore */
  }
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (url && anonKey) return { url, anonKey }
  return null
}

const toRec = (r: RemoteRow): Rec => ({
  id: r.id,
  collection: r.collection,
  data: r.data,
  updatedAt: Number(r.updated_at),
  updatedBy: r.updated_by ?? undefined,
  deleted: r.deleted,
})

class Sync {
  client: SupabaseClient | null = null
  private channel: RealtimeChannel | null = null
  private listeners = new Set<() => void>()
  private retryTimer: ReturnType<typeof setInterval> | null = null
  private pushing = false
  state: SyncState = {
    configured: false,
    status: 'local',
    session: null,
    bands: [],
    activeBand: null,
    members: [],
    displayName: localStorage.getItem(NAME_KEY) ?? '',
    error: '',
    pending: 0,
    lastSync: 0,
  }

  constructor() {
    store.author = this.state.displayName
    store.onLocalWrite = (recs) => {
      this.set({ pending: store.pending.size })
      void this.push(recs)
    }
    const cfg = readConfig()
    const savedBand = localStorage.getItem(BAND_KEY)
    // Zuletzt genutzte Band sofort aus dem Cache anzeigen (kein Aufblitzen lokaler Daten)
    if (cfg && savedBand) store.load('band:' + savedBand)
    if (cfg) this.init(cfg)
    window.addEventListener('online', () => void this.resync())
    window.addEventListener('offline', () => this.state.activeBand && this.set({ status: 'offline' }))
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  getState = () => this.state

  private set(patch: Partial<SyncState>) {
    this.state = { ...this.state, ...patch }
    for (const l of this.listeners) l()
  }

  getConfig() {
    return readConfig()
  }

  configure(cfg: SupabaseConfig | null) {
    if (cfg) localStorage.setItem(CFG_KEY, JSON.stringify(cfg))
    else localStorage.removeItem(CFG_KEY)
    window.location.reload()
  }

  private init(cfg: SupabaseConfig) {
    try {
      this.client = createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
    } catch (e) {
      this.set({ configured: false, status: 'error', error: 'Supabase-Konfiguration ungültig: ' + String(e) })
      return
    }
    this.set({ configured: true, status: 'connecting' })
    this.client.auth.onAuthStateChange((_event, session) => {
      const was = this.state.session?.user.id
      this.set({ session })
      // Supabase empfiehlt, im Callback keine weiteren Supabase-Aufrufe direkt zu machen -> entkoppeln
      if (session && session.user.id !== was) setTimeout(() => void this.loadBands(), 0)
      if (!session) setTimeout(() => this.leaveBandScope('signedout'), 0)
    })
  }

  setDisplayName(name: string) {
    localStorage.setItem(NAME_KEY, name)
    store.author = name
    this.set({ displayName: name })
    const b = this.state.activeBand
    if (this.client && b && this.state.session) {
      void this.client.from('band_members').update({ display_name: name }).eq('band_id', b.id).eq('user_id', this.state.session.user.id)
    }
  }

  async signUp(email: string, password: string) {
    if (!this.client) throw new Error('Supabase nicht eingerichtet')
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.href.split('#')[0] },
    })
    if (error) throw error
    return !data.session // true = Bestätigungs-Mail nötig
  }

  async signIn(email: string, password: string) {
    if (!this.client) throw new Error('Supabase nicht eingerichtet')
    const { error } = await this.client.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async resetPassword(email: string) {
    if (!this.client) throw new Error('Supabase nicht eingerichtet')
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo: window.location.href.split('#')[0] })
    if (error) throw error
  }

  async signOut() {
    await this.client?.auth.signOut()
    localStorage.removeItem(BAND_KEY)
    this.leaveBandScope('signedout')
  }

  private leaveBandScope(status: SyncStatus) {
    this.channel?.unsubscribe()
    this.channel = null
    if (store.scope !== 'local') store.load('local')
    if (!store.hasData()) store.mute(() => seedInitialData())
    this.set({ status, activeBand: null, bands: status === 'signedout' ? [] : this.state.bands, members: [], pending: store.pending.size })
  }

  async loadBands() {
    if (!this.client || !this.state.session) return
    const { data, error } = await this.client.from('bands').select('id,name,invite_code').order('created_at')
    if (error) {
      this.set({ status: 'error', error: 'Bands konnten nicht geladen werden: ' + error.message + ' – wurde schema.sql ausgeführt?' })
      return
    }
    const bands = (data ?? []) as Band[]
    this.set({ bands })
    const saved = localStorage.getItem(BAND_KEY)
    const pick = bands.find((b) => b.id === saved) ?? bands[0]
    if (pick) await this.activate(pick)
    else this.set({ status: 'noband' })
  }

  async createBand(name: string, takeLocalData: boolean) {
    if (!this.client) throw new Error('Supabase nicht eingerichtet')
    const { data, error } = await this.client.rpc('create_band', { p_name: name, p_display_name: this.state.displayName })
    if (error) throw error
    const band = data as Band
    this.set({ bands: [...this.state.bands, band] })
    await this.activate(band, takeLocalData ? 'local' : undefined)
    return band
  }

  async joinBand(code: string) {
    if (!this.client) throw new Error('Supabase nicht eingerichtet')
    const { data, error } = await this.client.rpc('join_band', { p_code: code, p_display_name: this.state.displayName })
    if (error) throw error
    const band = data as Band
    if (!this.state.bands.some((b) => b.id === band.id)) this.set({ bands: [...this.state.bands, band] })
    await this.activate(band)
    return band
  }

  async activate(band: Band, importFrom?: string) {
    if (!this.client) return
    this.channel?.unsubscribe()
    localStorage.setItem(BAND_KEY, band.id)
    store.load('band:' + band.id)
    this.set({ activeBand: band, status: 'connecting', error: '' })
    if (importFrom) store.importScope(importFrom)
    await this.resync()
    void this.loadMembers()
    this.channel = this.client
      .channel('records:' + band.id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'records', filter: `band_id=eq.${band.id}` },
        (payload) => {
          const row = payload.new as RemoteRow | undefined
          if (row && row.id) {
            store.applyRemote([toRec(row)])
            this.set({ lastSync: Date.now() })
          }
        },
      )
      .subscribe()
    if (!this.retryTimer) this.retryTimer = setInterval(() => void this.push(), 30000)
  }

  async loadMembers() {
    const b = this.state.activeBand
    if (!this.client || !b) return
    const { data } = await this.client.from('band_members').select('user_id,display_name').eq('band_id', b.id)
    this.set({ members: (data ?? []) as BandMember[] })
  }

  /** Alles vom Server holen und ausstehende Änderungen hochladen */
  async resync() {
    const b = this.state.activeBand
    if (!this.client || !b) return
    if (!navigator.onLine) {
      this.set({ status: 'offline' })
      return
    }
    const rows: RemoteRow[] = []
    const pageSize = 1000
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await this.client
        .from('records')
        .select('id,collection,data,updated_at,updated_by,deleted')
        .eq('band_id', b.id)
        .range(from, from + pageSize - 1)
      if (error) {
        this.set({ status: 'error', error: 'Sync fehlgeschlagen: ' + error.message })
        return
      }
      rows.push(...((data ?? []) as RemoteRow[]))
      if (!data || data.length < pageSize) break
    }
    store.applyRemote(rows.map(toRec))
    await this.push()
    this.set({ status: 'online', lastSync: Date.now(), pending: store.pending.size })
  }

  async push(recs?: Rec[]) {
    const b = this.state.activeBand
    if (!this.client || !b || store.scope !== 'band:' + b.id) return
    if (this.pushing) return
    const batch = recs ?? store.pendingRecs()
    if (!batch.length) return
    this.pushing = true
    try {
      const rows = batch.map((r) => ({
        band_id: b.id,
        id: r.id,
        collection: r.collection,
        data: r.data,
        updated_at: r.updatedAt,
        updated_by: r.updatedBy ?? null,
        deleted: r.deleted,
      }))
      const { error } = await this.client.from('records').upsert(rows, { onConflict: 'band_id,id' })
      if (error) throw error
      store.markSynced(batch)
      this.set({ status: 'online', pending: store.pending.size, lastSync: Date.now() })
    } catch (e) {
      this.set({ status: navigator.onLine ? 'error' : 'offline', error: 'Hochladen fehlgeschlagen: ' + (e as Error).message, pending: store.pending.size })
    } finally {
      this.pushing = false
    }
    // falls während des Pushs weitere Änderungen kamen
    if (!recs && store.pending.size && this.state.status === 'online') setTimeout(() => void this.push(), 500)
    else if (recs && store.pending.size > 0) setTimeout(() => void this.push(), 1000)
  }
}

export const sync = new Sync()

export function useSync(): SyncState {
  return useSyncExternalStore(sync.subscribe, sync.getState)
}

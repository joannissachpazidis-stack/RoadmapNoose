import { ChevronLeft, ChevronRight, Columns3, List, Music, Plus, Star, Timer, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, Checkbox, Empty, Field, Input, Modal, NumberInput, PageHeader, Progress, Select, Tabs, Textarea, confirmDelete, cx } from '../components/ui'
import { READINESS, SONG_PARTS, SONG_STAGES, STAGE_INDEX, TUNINGS, hasVocals, partsProgress, stageAtLeast } from '../lib/constants'
import { fmtDuration, parseDuration, timeAgo } from '../lib/format'
import { store, useCollection } from '../lib/store'
import type { PartState, Song, SongStage } from '../types'

export function newSong(stage: SongStage = 'idee'): Partial<Song> {
  return {
    title: '',
    stage,
    tuning: '',
    bpm: null,
    songKey: '',
    durationSec: null,
    parts: {},
    readiness: {},
    composers: '',
    lyricists: '',
    lyricsTheme: '',
    lyrics: '',
    notes: '',
    links: '',
    rating: 0,
    gemaRegistered: false,
    isrc: '',
    click: false,
    stageChangedAt: Date.now(),
  }
}

const stageMeta = (k: SongStage) => SONG_STAGES[STAGE_INDEX[k]]

export function moveStage(song: Song, dir: 1 | -1) {
  const i = STAGE_INDEX[song.stage] + dir
  if (i < 0 || i >= SONG_STAGES.length) return
  store.put('songs', { id: song.id, stage: SONG_STAGES[i].key, stageChangedAt: Date.now() })
}

function readinessScore(song: Song, memberIds: string[]) {
  if (!memberIds.length || !Object.keys(song.readiness ?? {}).length) return null
  const sum = memberIds.reduce((a, id) => a + (song.readiness?.[id] ?? 0), 0)
  return sum / (memberIds.length * 2)
}

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n === value ? 0 : n)} className={cx('p-0.5', n <= value ? 'text-yellow-400' : 'text-zinc-700')}>
          <Star size={onChange ? 18 : 11} fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}

function SongCard({ song, memberIds, onOpen, draggable }: { song: Song; memberIds: string[]; onOpen: () => void; draggable?: boolean }) {
  const pp = partsProgress(song.parts)
  const r = readinessScore(song, memberIds)
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => e.dataTransfer.setData('text/song', song.id)}
      onClick={onOpen}
      className="group cursor-pointer rounded-md border border-line bg-panel2 p-2.5 hover:border-zinc-500"
    >
      <div className="flex items-start gap-1">
        <div className="flex-1 text-sm font-medium leading-tight">{song.title || 'Ohne Titel'}</div>
        {song.rating > 0 && <Stars value={song.rating} />}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted">
        {song.tuning && <span>{song.tuning}</span>}
        {song.bpm && <span>{song.bpm} BPM</span>}
        {song.durationSec && <span>{fmtDuration(song.durationSec)}</span>}
        {song.click && <span className="text-green-500">Click ✓</span>}
        {hasVocals(song.parts) && <span className="text-yellow-500">Vocals ✓</span>}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Progress value={pp.done} max={pp.total} className="h-1" color="#a16207" />
        <span className="text-[10px] text-zinc-500">
          {pp.done}/{pp.total}
        </span>
      </div>
      {r !== null && stageAtLeast(song.stage, 'arrangement') && (
        <div className="mt-1 flex items-center gap-2">
          <Progress value={r * 100} className="h-1" color="#16a34a" />
          <span className="text-[10px] text-zinc-500">{Math.round(r * 100)}%</span>
        </div>
      )}
      <div className="mt-2 flex justify-between opacity-60 group-hover:opacity-100">
        <button
          className="rounded p-0.5 hover:bg-panel"
          onClick={(e) => {
            e.stopPropagation()
            moveStage(song, -1)
          }}
          aria-label="Eine Stufe zurück"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          className="rounded p-0.5 hover:bg-panel"
          onClick={(e) => {
            e.stopPropagation()
            moveStage(song, 1)
          }}
          aria-label="Eine Stufe weiter"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

export function SongModal({ song, onClose }: { song: Partial<Song>; onClose: () => void }) {
  const members = useCollection('members')
  const [s, setS] = useState<Partial<Song>>(song)
  const [dur, setDur] = useState(song.durationSec ? fmtDuration(song.durationSec) : '')
  const [tab, setTab] = useState<'basis' | 'band' | 'text' | 'business'>('basis')
  const set = (p: Partial<Song>) => setS((x) => ({ ...x, ...p }))
  const isNew = !song.id
  const save = () => {
    const patch = { ...s, durationSec: parseDuration(dur) }
    if (song.stage !== s.stage) patch.stageChangedAt = Date.now()
    store.put('songs', patch)
    onClose()
  }
  const meta = stageMeta(s.stage ?? 'idee')
  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={isNew ? 'Neuer Song / neue Idee' : s.title || 'Song'}
      footer={
        <>
          {!isNew && (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => {
                if (confirmDelete(s.title ?? '')) {
                  store.remove(song.id!)
                  onClose()
                }
              }}
            >
              <Trash2 size={16} /> Löschen
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={save} disabled={!s.title?.trim()}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-[2fr_1fr]">
        <Field label="Titel / Arbeitstitel">
          <Input autoFocus={isNew} value={s.title ?? ''} onChange={(e) => set({ title: e.target.value })} placeholder="z.B. Riff #7 oder finaler Titel" />
        </Field>
        <Field label="Stadium" hint={meta.hint}>
          <Select value={s.stage} onChange={(e) => set({ stage: e.target.value as SongStage })} options={SONG_STAGES.map((x) => ({ value: x.key, label: x.label }))} />
        </Field>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'basis', label: 'Musik' },
          { value: 'band', label: 'Wer kann ihn?' },
          { value: 'text', label: 'Lyrics & Notizen' },
          { value: 'business', label: 'Credits & Release' },
        ]}
      />
      {tab === 'basis' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Tuning">
              <Input list="tunings" value={s.tuning ?? ''} onChange={(e) => set({ tuning: e.target.value })} placeholder="Drop C" />
              <datalist id="tunings">
                {TUNINGS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </Field>
            <Field label="Tempo (BPM)">
              <NumberInput value={s.bpm} onChange={(v) => set({ bpm: v })} placeholder="180" />
            </Field>
            <Field label="Tonart">
              <Input value={s.songKey ?? ''} onChange={(e) => set({ songKey: e.target.value })} placeholder="C# moll" />
            </Field>
            <Field label="Länge (m:ss)">
              <Input value={dur} onChange={(e) => setDur(e.target.value)} placeholder="4:30" />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Field label="Eigene Einschätzung">
              <Stars value={s.rating ?? 0} onChange={(v) => set({ rating: v })} />
            </Field>
            <Checkbox checked={!!s.click} onChange={(v) => set({ click: v })} label="Sitzt zum Click / Metronom" />
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">Bausteine</span>
              <span className="text-[11px] text-zinc-500">Tippen: offen → fertig ✓ → nicht nötig – (z.B. kein Rap-Part)</span>
            </div>
            {(['Instrumental', 'Vocals', 'Finish'] as const).map((grp) => (
              <div key={grp} className="mb-2">
                <div className="mb-1 text-[11px] uppercase tracking-wider text-zinc-500">{grp}</div>
                <div className="flex flex-wrap gap-1.5">
                  {SONG_PARTS.filter((p) => p.group === grp).map((p) => {
                    const v = s.parts?.[p.key]
                    const next: PartState = v === true ? 'na' : v === 'na' ? false : true
                    return (
                      <button
                        type="button"
                        key={p.key}
                        onClick={() => set({ parts: { ...s.parts, [p.key]: next } })}
                        className={cx(
                          'rounded-full border px-2.5 py-1 text-xs',
                          v === true && 'border-green-700 bg-green-900/40 text-green-300',
                          v === 'na' && 'border-line text-zinc-600 line-through',
                          !v && 'border-line text-zinc-300',
                        )}
                      >
                        {v === true ? '✓ ' : v === 'na' ? '– ' : ''}
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <Field label="Links (Demos, Tabs, Guitar Pro, Dropbox …)" hint="Eine URL pro Zeile">
            <Textarea value={s.links ?? ''} onChange={(e) => set({ links: e.target.value })} placeholder="https://…" />
          </Field>
          {s.links && (
            <div className="flex flex-wrap gap-2">
              {s.links
                .split('\n')
                .filter((l) => l.trim().startsWith('http'))
                .map((l) => (
                  <a key={l} href={l.trim()} target="_blank" rel="noreferrer" className="max-w-full truncate text-xs text-accent2 underline">
                    {l.trim()}
                  </a>
                ))}
            </div>
          )}
        </div>
      )}
      {tab === 'band' && (
        <div>
          <p className="mb-3 text-sm text-muted">Jede:r trägt ehrlich ein, wie sicher der eigene Part sitzt. So seht ihr, woran in der nächsten Probe gearbeitet werden muss.</p>
          {!members.length && <div className="text-sm text-zinc-500">Lege zuerst Mitglieder unter "Band & Orga" an.</div>}
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-panel2 p-2">
                <span className="h-3 w-3 rounded-full" style={{ background: m.color }} />
                <span className="min-w-28 flex-1 text-sm">
                  {m.name} <span className="text-xs text-muted">{m.roles}</span>
                </span>
                {READINESS.map((r) => (
                  <button
                    key={r.v}
                    onClick={() => set({ readiness: { ...s.readiness, [m.id]: r.v } })}
                    className={cx('rounded px-2 py-1 text-xs', (s.readiness?.[m.id] ?? 0) === r.v ? 'text-white' : 'text-zinc-500')}
                    style={(s.readiness?.[m.id] ?? 0) === r.v ? { background: r.color } : undefined}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'text' && (
        <div className="space-y-3">
          <Field label="Thema / Konzept">
            <Input value={s.lyricsTheme ?? ''} onChange={(e) => set({ lyricsTheme: e.target.value })} placeholder="Worum geht es?" />
          </Field>
          <Field label="Lyrics">
            <Textarea rows={10} value={s.lyrics ?? ''} onChange={(e) => set({ lyrics: e.target.value })} className="font-mono" />
          </Field>
          <Field label="Notizen (Arrangement-Ideen, Feedback aus Proben/Gigs)">
            <Textarea rows={5} value={s.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
        </div>
      )}
      {tab === 'business' && (
        <div className="space-y-3">
          <p className="text-sm text-muted">Haltet Credits fest, solange alle sich noch erinnern – wichtig für GEMA, Distributor und euren Bandvertrag. Urheber:innen sind immer Personen, nicht die Band.</p>
          <Field label="Musik (Komposition) – wer, welche Anteile?">
            <Input value={s.composers ?? ''} onChange={(e) => set({ composers: e.target.value })} placeholder="z.B. Alex 50%, Sam 50%" />
          </Field>
          <Field label="Text – wer, welche Anteile?">
            <Input value={s.lyricists ?? ''} onChange={(e) => set({ lyricists: e.target.value })} placeholder="z.B. Kim 100%" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="ISRC">
              <Input value={s.isrc ?? ''} onChange={(e) => set({ isrc: e.target.value })} placeholder="DE-XXX-26-00001" />
            </Field>
            <div className="flex items-end pb-2">
              <Checkbox checked={!!s.gemaRegistered} onChange={(v) => set({ gemaRegistered: v })} label="Bei GEMA angemeldet" />
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function Songs({ param }: { param?: string }) {
  const songs = useCollection('songs')
  const members = useCollection('members')
  const memberIds = members.map((m) => m.id)
  const [view, setView] = useState<'pipeline' | 'liste'>(() => (window.innerWidth < 640 ? 'liste' : 'pipeline'))
  const [edit, setEdit] = useState<Partial<Song> | null>(() => (param ? (store.get('songs', param) ?? null) : null))
  const [showArchive, setShowArchive] = useState(false)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const visibleStages = SONG_STAGES.filter((s) => showArchive || s.key !== 'archiv')
  const active = songs.filter((s) => s.stage !== 'archiv')
  const ready = active.filter((s) => stageAtLeast(s.stage, 'probereif'))
  const withVocals = active.filter((s) => stageAtLeast(s.stage, 'demo') || hasVocals(s.parts)).length
  const setMinutes = Math.round(ready.reduce((a, s) => a + (s.durationSec ?? 240), 0) / 60)
  const estimated = ready.some((s) => !s.durationSec)

  // Engpass: Stufe vor "probereif" mit den meisten Songs
  const early = SONG_STAGES.slice(0, 4).map((st) => ({ st, n: active.filter((s) => s.stage === st.key).length }))
  const bottleneck = early.reduce((a, b) => (b.n > a.n ? b : a), early[0])
  const stale = active.filter((s) => !stageAtLeast(s.stage, 'veroeffentlicht') && Date.now() - (s.stageChangedAt ?? s.createdAt ?? 0) > 60 * 86400000)

  return (
    <div>
      <PageHeader
        title="Songwriting"
        subtitle="Jeder Song durchläuft die Pipeline von der Idee bis zur Veröffentlichung. Haltet fest, in welchem Stadium er ist, was noch fehlt und wer seinen Part schon sicher kann."
        actions={
          <>
            <div className="flex rounded-md border border-line">
              <button onClick={() => setView('pipeline')} className={cx('flex items-center gap-1 px-2.5 py-1.5 text-sm', view === 'pipeline' ? 'bg-panel2 text-white' : 'text-muted')}>
                <Columns3 size={16} /> Pipeline
              </button>
              <button onClick={() => setView('liste')} className={cx('flex items-center gap-1 px-2.5 py-1.5 text-sm', view === 'liste' ? 'bg-panel2 text-white' : 'text-muted')}>
                <List size={16} /> Liste
              </button>
            </div>
            <Button variant="primary" onClick={() => setEdit(newSong())}>
              <Plus size={16} /> Song / Idee
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">Songs & Ideen</div>
          <div className="text-2xl font-bold">{active.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">Mit Vocals · Ziel 10</div>
          <div className="text-2xl font-bold text-yellow-500">
            {withVocals}
            <span className="text-sm font-normal text-muted"> · {ready.length} live-ready</span>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted">
            <Timer size={12} /> Spielbare Set-Länge
          </div>
          <div className="text-2xl font-bold">
            {estimated ? '~' : ''}
            {setMinutes} min
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">Engpass</div>
          <div className="truncate text-sm font-semibold">{bottleneck?.n ? `${bottleneck.n}× ${bottleneck.st.label}` : '–'}</div>
          {stale.length > 0 && <div className="text-[11px] text-yellow-500">{stale.length} Song(s) seit 60+ Tagen ohne Fortschritt</div>}
        </Card>
      </div>

      {/* Verteilung */}
      {active.length > 0 && (
        <div className="mb-5 flex h-3 overflow-hidden rounded-full">
          {SONG_STAGES.filter((s) => s.key !== 'archiv').map((st) => {
            const n = active.filter((s) => s.stage === st.key).length
            return n ? <div key={st.key} title={`${st.label}: ${n}`} style={{ flex: n, background: st.color }} /> : null
          })}
        </div>
      )}

      {!songs.length ? (
        <Empty icon={<Music size={32} />} title="Noch keine Songs">
          Erfasst alle Songs und Ideen – auch einzelne Riffs als Handy-Memo. Nichts geht mehr verloren.
          <div className="mt-3">
            <Button variant="primary" onClick={() => setEdit(newSong())}>
              <Plus size={16} /> Ersten Song anlegen
            </Button>
          </div>
        </Empty>
      ) : view === 'pipeline' ? (
        <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 pb-3 lg:mx-0 lg:px-0">
          <div className="flex gap-3" style={{ minWidth: visibleStages.length * 200 }}>
            {visibleStages.map((st) => {
              const list = songs.filter((s) => s.stage === st.key)
              return (
                <div
                  key={st.key}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(st.key)
                  }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData('text/song')
                    setDragOver(null)
                    if (id) store.put('songs', { id, stage: st.key, stageChangedAt: Date.now() })
                  }}
                  className={cx('w-52 shrink-0 rounded-lg border bg-panel p-2', dragOver === st.key ? 'border-accent' : 'border-line')}
                >
                  <div className="mb-2 flex items-center gap-2 px-1" title={st.hint}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: st.color }} />
                    <span className="text-xs font-semibold uppercase tracking-wide">{st.label}</span>
                    <span className="ml-auto text-xs text-muted">{list.length}</span>
                  </div>
                  <div className="space-y-2">
                    {list.map((s) => (
                      <SongCard key={s.id} song={s} memberIds={memberIds} onOpen={() => setEdit(s)} draggable />
                    ))}
                    <button onClick={() => setEdit(newSong(st.key))} className="w-full rounded-md border border-dashed border-line py-1.5 text-xs text-muted hover:text-zinc-200">
                      + hinzufügen
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {[...songs]
            .filter((s) => showArchive || s.stage !== 'archiv')
            .sort((a, b) => STAGE_INDEX[b.stage] - STAGE_INDEX[a.stage] || a.title.localeCompare(b.title))
            .map((s) => {
              const st = stageMeta(s.stage)
              const pp = partsProgress(s.parts)
              const r = readinessScore(s, memberIds)
              return (
                <Card key={s.id} onClick={() => setEdit(s)} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-40 flex-1">
                    <div className="font-medium">{s.title}</div>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted">
                      {s.tuning && <span>{s.tuning}</span>}
                      {s.bpm && <span>{s.bpm} BPM</span>}
                      {s.durationSec && <span>{fmtDuration(s.durationSec)}</span>}
                      {s.stageChangedAt && <span>Stadium seit {timeAgo(s.stageChangedAt).replace('vor ', '')}</span>}
                    </div>
                  </div>
                  <Badge color={st.color}>{st.label}</Badge>
                  <div className="w-24 text-[11px] text-muted">
                    Bausteine {pp.done}/{pp.total}
                    <Progress value={pp.done} max={pp.total} className="mt-0.5 h-1" color="#a16207" />
                  </div>
                  {r !== null && (
                    <div className="w-24 text-[11px] text-muted">
                      Sitzt {Math.round(r * 100)}%
                      <Progress value={r * 100} className="mt-0.5 h-1" color="#16a34a" />
                    </div>
                  )}
                  <div className="flex">
                    <button className="rounded p-1 hover:bg-panel2" onClick={(e) => (e.stopPropagation(), moveStage(s, -1))} aria-label="zurück">
                      <ChevronLeft size={16} />
                    </button>
                    <button className="rounded p-1 hover:bg-panel2" onClick={(e) => (e.stopPropagation(), moveStage(s, 1))} aria-label="weiter">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </Card>
              )
            })}
        </div>
      )}
      <div className="mt-3">
        <Checkbox checked={showArchive} onChange={setShowArchive} label={`Archiv anzeigen (${songs.filter((s) => s.stage === 'archiv').length})`} />
      </div>

      <Card className="mt-6">
        <div className="mb-2 text-sm font-semibold">Die Stadien im Überblick</div>
        <div className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
          {SONG_STAGES.map((s) => (
            <div key={s.key} className="flex gap-2">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
              <span>
                <span className="font-semibold text-zinc-200">{s.label}:</span> <span className="text-muted">{s.hint}</span>
              </span>
            </div>
          ))}
        </div>
      </Card>

      {edit && <SongModal key={edit.id ?? 'new'} song={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

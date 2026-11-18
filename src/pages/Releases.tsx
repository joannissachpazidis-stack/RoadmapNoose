import { ArrowLeft, Disc3, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, Checkbox, Empty, Field, Input, Modal, NumberInput, PageHeader, Progress, Select, Textarea, confirmDelete, cx } from '../components/ui'
import { RELEASE_STATUS, RELEASE_TYPES, SONG_STAGES, STAGE_INDEX, stageAtLeast } from '../lib/constants'
import { addDays, daysUntil, fmtDate, fmtDuration, fmtMoney, relDays } from '../lib/format'
import { releaseTimeline } from '../lib/roadmap'
import { go } from '../lib/router'
import { store, uid, useCollection } from '../lib/store'
import type { Release, ReleaseStatus, ReleaseType } from '../types'

function ReleaseModal({ release, onClose }: { release: Partial<Release>; onClose: () => void }) {
  const songs = useCollection('songs')
  const [r, setR] = useState(release)
  const set = (p: Partial<Release>) => setR((x) => ({ ...x, ...p }))
  const isNew = !release.id
  const save = () => {
    const patch = { ...r }
    if (isNew) patch.tasks = releaseTimeline(r.type ?? 'single').map((t) => ({ ...t, id: uid(), done: false }))
    const id = store.put('releases', patch)
    onClose()
    if (isNew) go('releases', id)
  }
  const candidates = [...songs].filter((s) => s.stage !== 'archiv').sort((a, b) => STAGE_INDEX[b.stage] - STAGE_INDEX[a.stage])
  const sel = r.songIds ?? []
  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Neues Release' : 'Release bearbeiten'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={save} disabled={!r.title?.trim()}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Titel">
          <Input autoFocus={isNew} value={r.title ?? ''} onChange={(e) => set({ title: e.target.value })} placeholder="z.B. Debüt-EP" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Format">
            <Select value={r.type} onChange={(e) => set({ type: e.target.value as ReleaseType })} options={Object.entries(RELEASE_TYPES).map(([v, label]) => ({ value: v, label }))} />
          </Field>
          <Field label="Status">
            <Select value={r.status} onChange={(e) => set({ status: e.target.value as ReleaseStatus })} options={Object.entries(RELEASE_STATUS).map(([v, label]) => ({ value: v, label }))} />
          </Field>
          <Field label="Release-Datum" hint="Meist Freitag (weltweiter Release-Tag)">
            <Input type="date" value={r.releaseDate ?? ''} onChange={(e) => set({ releaseDate: e.target.value })} />
          </Field>
          <Field label="Budget (€)">
            <NumberInput value={r.budget} onChange={(v) => set({ budget: v })} />
          </Field>
          <Field label="Studio / Produzent:in">
            <Input value={r.studio ?? ''} onChange={(e) => set({ studio: e.target.value })} />
          </Field>
          <Field label="Distributor">
            <Input value={r.distributor ?? ''} onChange={(e) => set({ distributor: e.target.value })} placeholder="z.B. DistroKid, iMusician …" />
          </Field>
        </div>
        <Field label="Songs" hint="Empfehlung: die Songs, die live am besten funktionieren">
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-line p-2">
            {candidates.map((s) => (
              <Checkbox
                key={s.id}
                checked={sel.includes(s.id)}
                onChange={(v) => set({ songIds: v ? [...sel, s.id] : sel.filter((x) => x !== s.id) })}
                label={
                  <span>
                    {s.title} <span className="text-xs text-muted">· {SONG_STAGES[STAGE_INDEX[s.stage]].label}</span>
                  </span>
                }
              />
            ))}
            {!candidates.length && <div className="text-xs text-muted">Noch keine Songs angelegt.</div>}
          </div>
        </Field>
        <Field label="Notizen">
          <Textarea value={r.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
        {isNew && <p className="text-xs text-muted">Beim Anlegen wird automatisch ein Release-Zeitplan mit allen wichtigen Schritten (Master, Artwork, Distributor-Upload, Spotify-Pitch, Presse, …) erzeugt, rückwärts gerechnet vom Release-Datum.</p>}
      </div>
    </Modal>
  )
}

function ReleaseDetail({ release }: { release: Release }) {
  const songs = useCollection('songs')
  const [edit, setEdit] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [newOffset, setNewOffset] = useState<number | null>(-14)
  const tasks = [...release.tasks].sort((a, b) => a.offsetDays - b.offsetDays)
  const done = tasks.filter((t) => t.done).length
  const relSongs = release.songIds.map((id) => songs.find((s) => s.id === id)).filter(Boolean) as typeof songs
  const total = relSongs.reduce((a, s) => a + (s.durationSec ?? 0), 0)
  const d = release.releaseDate ? daysUntil(release.releaseDate) : null
  const notReady = relSongs.filter((s) => !stageAtLeast(s.stage, 'aufnahme'))

  const update = (patch: Partial<Release>) => store.put('releases', { id: release.id, ...patch })
  const toggle = (id: string, v: boolean) => update({ tasks: release.tasks.map((t) => (t.id === id ? { ...t, done: v } : t)) })

  return (
    <div>
      <button onClick={() => go('releases')} className="mb-3 flex items-center gap-1 text-sm text-muted hover:text-white">
        <ArrowLeft size={16} /> Alle Releases
      </button>
      <PageHeader
        title={release.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge color="#dc2626">{RELEASE_TYPES[release.type]}</Badge>
            <Badge>{RELEASE_STATUS[release.status]}</Badge>
            {release.releaseDate ? (
              <span>
                Release am {fmtDate(release.releaseDate)} ({relDays(release.releaseDate)})
              </span>
            ) : (
              <span className="text-yellow-500">Noch kein Release-Datum – setzt eins, damit der Zeitplan Termine bekommt.</span>
            )}
          </span>
        }
        actions={
          <>
            <Button onClick={() => setEdit(true)}>
              <Pencil size={16} /> Bearbeiten
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete(release.title)) {
                  store.remove(release.id)
                  go('releases')
                }
              }}
            >
              <Trash2 size={16} />
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold">Release-Zeitplan</div>
              <span className="text-xs text-muted">
                {done}/{tasks.length} erledigt
              </span>
            </div>
            <Progress value={done} max={tasks.length} className="mb-4" />
            <div className="space-y-1">
              {tasks.map((t) => {
                const date = release.releaseDate ? addDays(release.releaseDate, t.offsetDays) : ''
                const dd = date ? daysUntil(date) : null
                const overdue = !t.done && dd !== null && dd < 0
                const soon = !t.done && dd !== null && dd >= 0 && dd <= 7
                return (
                  <div key={t.id} className={cx('group flex items-start gap-3 rounded-md px-2 py-1.5', t.offsetDays === 0 && 'bg-accent/10', overdue && 'bg-red-950/40')}>
                    <div className={cx('w-20 shrink-0 pt-0.5 text-right text-[11px] tabular-nums', overdue ? 'text-red-400' : soon ? 'text-yellow-400' : 'text-muted')}>
                      {date ? fmtDate(date, { day: '2-digit', month: '2-digit', year: '2-digit' }) : t.offsetDays === 0 ? 'Release' : `${t.offsetDays > 0 ? '+' : ''}${t.offsetDays} T.`}
                    </div>
                    <Checkbox strike className="flex-1" checked={t.done} onChange={(v) => toggle(t.id, v)} label={t.text} />
                    <span className="hidden text-[10px] uppercase text-zinc-600 sm:block">{t.area}</span>
                    <button className="text-zinc-600 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100" onClick={() => update({ tasks: release.tasks.filter((x) => x.id !== t.id) })} aria-label="entfernen">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
              <Input className="min-w-48 flex-1" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Eigener Schritt…" />
              <div className="flex items-center gap-1">
                <NumberInput className="w-20" value={newOffset} onChange={setNewOffset} />
                <span className="text-xs text-muted">Tage rel.</span>
              </div>
              <Button
                onClick={() => {
                  if (!newTask.trim()) return
                  update({ tasks: [...release.tasks, { id: uid(), text: newTask.trim(), done: false, offsetDays: newOffset ?? 0, area: 'Eigene' }] })
                  setNewTask('')
                }}
              >
                <Plus size={16} />
              </Button>
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          {d !== null && d >= 0 && (
            <Card className="text-center">
              <div className="font-display text-5xl text-accent">{d}</div>
              <div className="text-xs uppercase tracking-widest text-muted">Tage bis zum Release</div>
            </Card>
          )}
          <Card>
            <div className="mb-2 flex justify-between font-semibold">
              <span>Tracklist</span>
              <span className="text-xs font-normal text-muted">{fmtDuration(total)}</span>
            </div>
            {relSongs.length ? (
              <ol className="space-y-1 text-sm">
                {relSongs.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <span className="w-4 text-right text-xs text-muted">{i + 1}</span>
                    <a href={'#/songs/' + s.id} className="flex-1 hover:underline">
                      {s.title}
                    </a>
                    <span className="h-2 w-2 rounded-full" style={{ background: SONG_STAGES[STAGE_INDEX[s.stage]].color }} title={SONG_STAGES[STAGE_INDEX[s.stage]].label} />
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-sm text-muted">Noch keine Songs gewählt.</div>
            )}
            {notReady.length > 0 && release.status !== 'planung' && <p className="mt-2 text-xs text-yellow-500">{notReady.length} Song(s) noch vor der Aufnahme-Phase.</p>}
            {release.status === 'veroeffentlicht' && relSongs.some((s) => s.stage !== 'veroeffentlicht') && (
              <Button size="sm" className="mt-3" onClick={() => store.putMany('songs', relSongs.map((s) => ({ id: s.id, stage: 'veroeffentlicht' as const, stageChangedAt: Date.now() })))}>
                Songs als "Veröffentlicht" markieren
              </Button>
            )}
          </Card>
          <Card className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Budget</span>
              <span>{fmtMoney(release.budget)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Studio</span>
              <span>{release.studio || '–'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Distributor</span>
              <span>{release.distributor || '–'}</span>
            </div>
            {release.notes && <p className="whitespace-pre-wrap border-t border-line pt-2 text-muted">{release.notes}</p>}
          </Card>
        </div>
      </div>
      {edit && <ReleaseModal release={release} onClose={() => setEdit(false)} />}
    </div>
  )
}

export default function Releases({ param }: { param?: string }) {
  const releases = useCollection('releases')
  const [create, setCreate] = useState(false)
  const current = param ? releases.find((r) => r.id === param) : undefined
  if (current) return <ReleaseDetail release={current} />

  return (
    <div>
      <PageHeader
        title="Releases"
        subtitle="Plant Singles, EPs und Alben mit einem rückwärts gerechneten Zeitplan. Faustregel: Musik 6–8 Wochen vor dem Release fertig haben – nur so klappen Distributor-Upload, Spotify-Pitch und Presse rechtzeitig."
        actions={
          <Button variant="primary" onClick={() => setCreate(true)}>
            <Plus size={16} /> Neues Release
          </Button>
        }
      />
      {!releases.length ? (
        <Empty icon={<Disc3 size={32} />} title="Noch kein Release geplant">
          Für eine neue Band ist eine Single oder EP mit 2–5 live erprobten Songs der realistischste Einstieg.
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {[...releases]
            .sort((a, b) => (a.releaseDate || '9').localeCompare(b.releaseDate || '9'))
            .map((r) => {
              const done = r.tasks.filter((t) => t.done).length
              const next = [...r.tasks].sort((a, b) => a.offsetDays - b.offsetDays).find((t) => !t.done)
              return (
                <Card key={r.id} onClick={() => go('releases', r.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-display text-xl text-white">{r.title}</div>
                      <div className="mt-1 flex gap-1.5">
                        <Badge color="#dc2626">{RELEASE_TYPES[r.type]}</Badge>
                        <Badge>{RELEASE_STATUS[r.status]}</Badge>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {r.releaseDate ? fmtDate(r.releaseDate) : '–'}
                      <div className="text-xs text-muted">{r.releaseDate && relDays(r.releaseDate)}</div>
                    </div>
                  </div>
                  <Progress value={done} max={r.tasks.length} className="mt-3" />
                  <div className="mt-1 text-xs text-muted">
                    {done}/{r.tasks.length} Schritte · {r.songIds.length} Song(s)
                  </div>
                  {next && <div className="mt-2 text-xs text-zinc-300">Nächster Schritt: {next.text}</div>}
                </Card>
              )
            })}
        </div>
      )}
      {create && <ReleaseModal release={{ title: '', type: 'single', status: 'planung', releaseDate: '', songIds: [], distributor: '', studio: '', budget: null, tasks: [], notes: '' }} onClose={() => setCreate(false)} />}
    </div>
  )
}

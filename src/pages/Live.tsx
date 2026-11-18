import { ArrowDown, ArrowUp, MapPin, Mic2, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import ChecklistView from '../components/ChecklistView'
import { Badge, Button, Card, Empty, Field, Input, Modal, NumberInput, PageHeader, Select, Tabs, Textarea, confirmDelete, cx } from '../components/ui'
import { GIG_STATUS, SONG_STAGES, STAGE_INDEX, stageAtLeast } from '../lib/constants'
import { fmtDate, fmtDateShort, fmtDuration, fmtMoney, relDays, todayISO } from '../lib/format'
import { store, useCollection } from '../lib/store'
import type { Gig, GigStatus } from '../types'

export function newGig(): Partial<Gig> {
  return { date: '', time: '', venue: '', city: '', status: 'idee', fee: null, contactId: '', setlist: [], slotMinutes: 30, lineup: '', attendance: null, merchRevenue: null, notes: '', learnings: '' }
}

function SetlistEditor({ value, onChange, slot }: { value: string[]; onChange: (v: string[]) => void; slot: number | null }) {
  const songs = useCollection('songs')
  const byId = Object.fromEntries(songs.map((s) => [s.id, s]))
  const available = [...songs].filter((s) => !value.includes(s.id) && s.stage !== 'archiv').sort((a, b) => STAGE_INDEX[b.stage] - STAGE_INDEX[a.stage])
  const total = value.reduce((a, id) => a + (byId[id]?.durationSec ?? 240), 0)
  const unknown = value.some((id) => !byId[id]?.durationSec)
  const move = (i: number, d: number) => {
    const v = [...value]
    const [x] = v.splice(i, 1)
    v.splice(i + d, 0, x)
    onChange(v)
  }
  const over = slot ? total / 60 > slot : false
  return (
    <div>
      <div className="space-y-1">
        {value.map((id, i) => {
          const s = byId[id]
          const prev = i > 0 ? byId[value[i - 1]] : undefined
          const tuningChange = prev && s && prev.tuning && s.tuning && prev.tuning !== s.tuning
          return (
            <div key={id}>
              {tuningChange && <div className="py-0.5 pl-7 text-[10px] uppercase text-yellow-500">⚠ Tuning-Wechsel: {prev!.tuning} → {s!.tuning}</div>}
              <div className="flex items-center gap-2 rounded border border-line bg-panel2 px-2 py-1 text-sm">
                <span className="w-5 text-right text-xs text-muted">{i + 1}</span>
                <span className="flex-1">{s?.title ?? '(gelöscht)'}</span>
                {s && !stageAtLeast(s.stage, 'probereif') && <span className="text-[10px] text-yellow-500">noch nicht probe-reif</span>}
                <span className="text-xs text-muted">{fmtDuration(s?.durationSec)}</span>
                <button disabled={i === 0} onClick={() => move(i, -1)} className="text-muted disabled:opacity-20" aria-label="hoch">
                  <ArrowUp size={14} />
                </button>
                <button disabled={i === value.length - 1} onClick={() => move(i, 1)} className="text-muted disabled:opacity-20" aria-label="runter">
                  <ArrowDown size={14} />
                </button>
                <button onClick={() => onChange(value.filter((x) => x !== id))} className="text-muted hover:text-red-400" aria-label="entfernen">
                  <X size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <div className={cx('mt-2 text-xs', over ? 'text-red-400' : 'text-muted')}>
        Gesamt: {unknown ? '~' : ''}
        {fmtDuration(total)} {slot ? `von ${slot}:00 Slot` : ''} {unknown && '(Songs ohne Länge mit 4 Min. geschätzt)'} {over && '– zu lang! Plant auch Umbau & Ansagen ein.'}
      </div>
      {available.length > 0 && (
        <Select
          className="mt-2"
          value=""
          onChange={(e) => e.target.value && onChange([...value, e.target.value])}
          options={[{ value: '', label: '+ Song hinzufügen…' }, ...available.map((s) => ({ value: s.id, label: `${s.title} (${SONG_STAGES[STAGE_INDEX[s.stage]].label})` }))]}
        />
      )}
    </div>
  )
}

export function GigModal({ gig, onClose }: { gig: Partial<Gig>; onClose: () => void }) {
  const contacts = useCollection('contacts')
  const [g, setG] = useState(gig)
  const set = (p: Partial<Gig>) => setG((x) => ({ ...x, ...p }))
  const isNew = !gig.id
  const becamePlayed = g.status === 'gespielt' && gig.status !== 'gespielt'
  const [promoteSongs, setPromoteSongs] = useState(true)
  const [bookFee, setBookFee] = useState(true)

  const save = () => {
    const id = store.put('gigs', g)
    if (becamePlayed) {
      if (promoteSongs) {
        const songs = (g.setlist ?? []).map((sid) => store.get('songs', sid)).filter((s) => s && s.stage === 'probereif')
        store.putMany('songs', songs.map((s) => ({ id: s!.id, stage: 'liveerprobt' as const, stageChangedAt: Date.now() })))
      }
      const tx = []
      if (bookFee && g.fee) tx.push({ date: g.date || todayISO(), amount: g.fee, category: 'Gage', description: `Gage ${g.venue}`, memberId: '' })
      if (bookFee && g.merchRevenue) tx.push({ date: g.date || todayISO(), amount: g.merchRevenue, category: 'Merch-Verkauf', description: `Merch ${g.venue}`, memberId: '' })
      if (tx.length) store.putMany('transactions', tx)
    }
    void id
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={isNew ? 'Neuer Gig' : g.venue || 'Gig'}
      footer={
        <>
          {!isNew && (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => {
                if (confirmDelete(g.venue || 'Gig')) {
                  store.remove(gig.id!)
                  onClose()
                }
              }}
            >
              <Trash2 size={16} />
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={save} disabled={!g.venue?.trim()}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <Field label="Venue / Veranstaltung">
            <Input autoFocus={isNew} value={g.venue ?? ''} onChange={(e) => set({ venue: e.target.value })} placeholder="z.B. Jugendzentrum XY" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stadt">
              <Input value={g.city ?? ''} onChange={(e) => set({ city: e.target.value })} />
            </Field>
            <Field label="Status">
              <Select value={g.status} onChange={(e) => set({ status: e.target.value as GigStatus })} options={Object.entries(GIG_STATUS).map(([v, x]) => ({ value: v, label: x.label }))} />
            </Field>
            <Field label="Datum">
              <Input type="date" value={g.date ?? ''} onChange={(e) => set({ date: e.target.value })} />
            </Field>
            <Field label="Uhrzeit (Stage)">
              <Input type="time" value={g.time ?? ''} onChange={(e) => set({ time: e.target.value })} />
            </Field>
            <Field label="Gage (€)">
              <NumberInput value={g.fee} onChange={(v) => set({ fee: v })} />
            </Field>
            <Field label="Slot (Minuten)">
              <NumberInput value={g.slotMinutes} onChange={(v) => set({ slotMinutes: v })} />
            </Field>
          </div>
          <Field label="Kontakt">
            <Select value={g.contactId ?? ''} onChange={(e) => set({ contactId: e.target.value })} options={[{ value: '', label: '–' }, ...contacts.map((c) => ({ value: c.id, label: c.name }))]} />
          </Field>
          <Field label="Line-up / andere Bands">
            <Input value={g.lineup ?? ''} onChange={(e) => set({ lineup: e.target.value })} />
          </Field>
          <Field label="Notizen (Deal, Zeiten, Backline, Anfahrt)">
            <Textarea value={g.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
        </div>
        <div className="space-y-3">
          <Field label="Setlist">
            <SetlistEditor value={g.setlist ?? []} onChange={(v) => set({ setlist: v })} slot={g.slotMinutes ?? null} />
          </Field>
          {(g.status === 'gespielt' || (g.date && g.date < todayISO())) && (
            <div className="space-y-3 rounded-md border border-line bg-panel2 p-3">
              <div className="text-sm font-semibold">Nachbereitung</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Publikum (ca.)">
                  <NumberInput value={g.attendance} onChange={(v) => set({ attendance: v })} />
                </Field>
                <Field label="Merch-Umsatz (€)">
                  <NumberInput value={g.merchRevenue} onChange={(v) => set({ merchRevenue: v })} />
                </Field>
              </div>
              <Field label="Learnings – was lief gut, was nicht? Welche Songs zünden?">
                <Textarea value={g.learnings ?? ''} onChange={(e) => set({ learnings: e.target.value })} />
              </Field>
            </div>
          )}
          {becamePlayed && (
            <div className="space-y-2 rounded-md border border-green-900 bg-green-950/30 p-3 text-sm">
              <label className="flex gap-2">
                <input type="checkbox" className="accent-red-600" checked={promoteSongs} onChange={(e) => setPromoteSongs(e.target.checked)} />
                Probe-reife Songs der Setlist auf "Live erprobt" setzen
              </label>
              <label className="flex gap-2">
                <input type="checkbox" className="accent-red-600" checked={bookFee} onChange={(e) => setBookFee(e.target.checked)} />
                Gage & Merch-Umsatz in der Bandkasse buchen
              </label>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default function Live({ param }: { param?: string }) {
  const gigs = useCollection('gigs')
  const [tab, setTab] = useState<'gigs' | 'checkliste'>(param === 'checkliste' ? 'checkliste' : 'gigs')
  const [edit, setEdit] = useState<Partial<Gig> | null>(() => (param && param !== 'checkliste' ? (store.get('gigs', param) ?? null) : null))
  const today = todayISO()
  const upcoming = gigs.filter((g) => g.status !== 'gespielt' && g.status !== 'abgesagt' && (!g.date || g.date >= today)).sort((a, b) => (a.date || '9').localeCompare(b.date || '9'))
  const past = gigs.filter((g) => !upcoming.includes(g)).sort((a, b) => b.date.localeCompare(a.date))
  const played = gigs.filter((g) => g.status === 'gespielt')
  const totalFee = played.reduce((a, g) => a + (g.fee ?? 0), 0)
  const totalMerch = played.reduce((a, g) => a + (g.merchRevenue ?? 0), 0)

  const GigRow = ({ g }: { g: Gig }) => (
    <Card onClick={() => setEdit(g)} className="flex flex-wrap items-center gap-3 p-3">
      <div className="w-16 text-center">
        {g.date ? (
          <>
            <div className="font-display text-2xl leading-none text-white">{fmtDate(g.date, { day: '2-digit' })}</div>
            <div className="text-[11px] uppercase text-muted">{fmtDate(g.date, { month: 'short', year: '2-digit' })}</div>
          </>
        ) : (
          <div className="text-xs text-muted">ohne Datum</div>
        )}
      </div>
      <div className="min-w-40 flex-1">
        <div className="font-medium">{g.venue}</div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          {g.city && (
            <span className="flex items-center gap-0.5">
              <MapPin size={11} /> {g.city}
            </span>
          )}
          {g.date && g.status !== 'gespielt' && <span>{relDays(g.date)}</span>}
          {g.setlist.length > 0 && <span>{g.setlist.length} Songs</span>}
          {g.lineup && <span>mit {g.lineup}</span>}
        </div>
      </div>
      {g.fee ? <span className="text-sm text-muted">{fmtMoney(g.fee)}</span> : null}
      <Badge color={GIG_STATUS[g.status].color}>{GIG_STATUS[g.status].label}</Badge>
    </Card>
  )

  return (
    <div>
      <PageHeader
        title="Live & Gigs"
        subtitle="Anfragen, bestätigte Shows, Setlists und Nachbereitung. Nach jedem Gig: Learnings notieren – so wisst ihr, welche Songs aufs Debüt gehören."
        actions={
          <Button variant="primary" onClick={() => setEdit(newGig())}>
            <Plus size={16} /> Gig / Anfrage
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">Gespielt</div>
          <div className="text-2xl font-bold">{played.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">Geplant / angefragt</div>
          <div className="text-2xl font-bold">{upcoming.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">Städte</div>
          <div className="text-2xl font-bold">{new Set(played.map((g) => g.city.trim().toLowerCase()).filter(Boolean)).size}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">Gagen + Merch</div>
          <div className="text-2xl font-bold">{fmtMoney(totalFee + totalMerch)}</div>
        </Card>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'gigs', label: 'Gigs' },
          { value: 'checkliste', label: 'Live-Checkliste' },
        ]}
      />
      {tab === 'gigs' ? (
        <div className="space-y-6">
          <div>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Anstehend & Anfragen</h2>
            {upcoming.length ? (
              <div className="space-y-2">
                {upcoming.map((g) => (
                  <GigRow key={g.id} g={g} />
                ))}
              </div>
            ) : (
              <Empty icon={<Mic2 size={28} />} title="Keine Gigs geplant">
                Realistische erste Schritte: Support für lokale Bands, Jugendzentren, Metal-Kneipen, Open Stages. Auch Anfragen hier eintragen, damit ihr den Überblick behaltet, wer schon angeschrieben wurde.
              </Empty>
            )}
          </div>
          {past.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Vergangen</h2>
              <div className="space-y-2">
                {past.map((g) => (
                  <GigRow key={g.id} g={g} />
                ))}
              </div>
            </div>
          )}
          {past.some((g) => g.learnings) && (
            <Card>
              <div className="mb-2 font-semibold">Learnings aus vergangenen Gigs</div>
              <div className="space-y-2 text-sm">
                {past
                  .filter((g) => g.learnings)
                  .map((g) => (
                    <div key={g.id}>
                      <span className="text-xs text-muted">
                        {fmtDateShort(g.date)} · {g.venue}:
                      </span>{' '}
                      <span className="whitespace-pre-wrap">{g.learnings}</span>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <ChecklistView group="live" resettable />
      )}
      {edit && <GigModal key={edit.id ?? 'new'} gig={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

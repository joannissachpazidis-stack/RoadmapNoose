import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button, Card, Field, Input, Modal, PageHeader, Select, Textarea, confirmDelete, cx } from '../components/ui'
import { EVENT_TYPES, GIG_STATUS } from '../lib/constants'
import { addDays, fmtDate, toISO, todayISO } from '../lib/format'
import { go } from '../lib/router'
import { store, useCollection } from '../lib/store'
import type { CalEvent, EventType } from '../types'

export interface CalItem {
  date: string
  time?: string
  title: string
  kind: 'event' | 'gig' | 'goal' | 'release' | 'releasetask'
  color: string
  label: string
  onClick: () => void
}

export function useCalendarItems(onEvent: (e: CalEvent) => void): CalItem[] {
  const events = useCollection('events')
  const gigs = useCollection('gigs')
  const goals = useCollection('goals')
  const releases = useCollection('releases')
  return useMemo(() => {
    const items: CalItem[] = []
    for (const e of events) if (e.date) items.push({ date: e.date, time: e.time, title: e.title, kind: 'event', color: '#71717a', label: EVENT_TYPES[e.type], onClick: () => onEvent(e) })
    for (const g of gigs)
      if (g.date && g.status !== 'abgesagt' && g.status !== 'idee')
        items.push({ date: g.date, time: g.time, title: `${g.venue}${g.city ? ', ' + g.city : ''}`, kind: 'gig', color: '#f97316', label: 'Gig · ' + GIG_STATUS[g.status].label, onClick: () => go('live', g.id) })
    for (const g of goals) if (g.due && g.status !== 'erledigt') items.push({ date: g.due, title: g.title, kind: 'goal', color: '#eab308', label: 'Ziel fällig', onClick: () => go('roadmap', g.id) })
    for (const r of releases) {
      if (!r.releaseDate) continue
      items.push({ date: r.releaseDate, title: `RELEASE: ${r.title}`, kind: 'release', color: '#dc2626', label: 'Release', onClick: () => go('releases', r.id) })
      for (const t of r.tasks) if (!t.done && t.offsetDays !== 0) items.push({ date: addDays(r.releaseDate, t.offsetDays), title: t.text, kind: 'releasetask', color: '#be123c', label: r.title, onClick: () => go('releases', r.id) })
    }
    return items.sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, gigs, goals, releases])
}

export function EventModal({ event, onClose }: { event: Partial<CalEvent>; onClose: () => void }) {
  const [e, setE] = useState(event)
  const set = (p: Partial<CalEvent>) => setE((x) => ({ ...x, ...p }))
  return (
    <Modal
      open
      onClose={onClose}
      title={event.id ? 'Termin bearbeiten' : 'Neuer Termin'}
      footer={
        <>
          {event.id && (
            <Button variant="danger" className="mr-auto" onClick={() => confirmDelete(e.title ?? '') && (store.remove(event.id!), onClose())}>
              <Trash2 size={16} />
            </Button>
          )}
          <Button variant="primary" disabled={!e.title || !e.date} onClick={() => (store.put('events', e), onClose())}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Titel">
          <Input autoFocus value={e.title ?? ''} onChange={(x) => set({ title: x.target.value })} placeholder="z.B. Probe – Set durchspielen" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Art">
            <Select value={e.type} onChange={(x) => set({ type: x.target.value as EventType })} options={Object.entries(EVENT_TYPES).map(([v, label]) => ({ value: v, label }))} />
          </Field>
          <Field label="Datum">
            <Input type="date" value={e.date ?? ''} onChange={(x) => set({ date: x.target.value })} />
          </Field>
          <Field label="Uhrzeit">
            <Input type="time" value={e.time ?? ''} onChange={(x) => set({ time: x.target.value })} />
          </Field>
        </div>
        <Field label="Notizen / Agenda">
          <Textarea value={e.notes ?? ''} onChange={(x) => set({ notes: x.target.value })} />
        </Field>
      </div>
    </Modal>
  )
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export default function Calendar() {
  const [edit, setEdit] = useState<Partial<CalEvent> | null>(null)
  const items = useCalendarItems((e) => setEdit(e))
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selected, setSelected] = useState<string | null>(null)
  const today = todayISO()

  const start = new Date(month)
  start.setDate(1 - ((month.getDay() + 6) % 7))
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return toISO(d)
  })
  const monthKey = toISO(month).slice(0, 7)
  const byDate = items.reduce<Record<string, CalItem[]>>((a, it) => ((a[it.date] ??= []).push(it), a), {})
  const agenda = selected ? byDate[selected] ?? [] : items.filter((i) => i.date.startsWith(monthKey))
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))

  return (
    <div>
      <PageHeader
        title="Kalender"
        subtitle="Proben, Meetings, Studio, Gigs, Ziel-Deadlines und alle Schritte eurer Release-Zeitpläne an einem Ort."
        actions={
          <Button variant="primary" onClick={() => setEdit({ title: '', type: 'probe', date: selected ?? today, time: '', notes: '' })}>
            <Plus size={16} /> Termin
          </Button>
        }
      />
      <Card className="p-2 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <Button variant="ghost" onClick={() => shift(-1)} aria-label="Vorheriger Monat">
            <ChevronLeft size={18} />
          </Button>
          <button className="font-display text-xl text-white" onClick={() => (setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), setSelected(null))}>
            {month.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          </button>
          <Button variant="ghost" onClick={() => shift(1)} aria-label="Nächster Monat">
            <ChevronRight size={18} />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-line bg-line">
          {WEEKDAYS.map((w) => (
            <div key={w} className="bg-panel py-1 text-center text-[11px] font-semibold uppercase text-muted">
              {w}
            </div>
          ))}
          {days.map((d) => {
            const list = byDate[d] ?? []
            const inMonth = d.startsWith(monthKey)
            return (
              <button
                key={d}
                onClick={() => setSelected(selected === d ? null : d)}
                className={cx('min-h-14 bg-panel p-1 text-left align-top sm:min-h-24', !inMonth && 'opacity-40', selected === d && 'ring-2 ring-inset ring-accent')}
              >
                <div className={cx('mb-0.5 text-xs', d === today ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent font-bold text-white' : 'text-muted')}>{Number(d.slice(8))}</div>
                <div className="hidden space-y-0.5 sm:block">
                  {list.slice(0, 3).map((it, i) => (
                    <div key={i} className="truncate rounded px-1 text-[10px]" style={{ background: it.color + '33', color: '#e4e4e7' }}>
                      {it.title}
                    </div>
                  ))}
                  {list.length > 3 && <div className="text-[10px] text-muted">+{list.length - 3}</div>}
                </div>
                <div className="flex flex-wrap gap-0.5 sm:hidden">
                  {list.slice(0, 4).map((it, i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: it.color }} />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      <div className="mb-2 mt-6 text-xs font-bold uppercase tracking-widest text-muted">{selected ? fmtDate(selected, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Alle Termine im Monat'}</div>
      <div className="space-y-1.5">
        {agenda.map((it, i) => (
          <button key={i} onClick={it.onClick} className="flex w-full items-center gap-3 rounded-md border border-line bg-panel p-2.5 text-left hover:border-zinc-500">
            <span className="h-8 w-1 shrink-0 rounded" style={{ background: it.color }} />
            <div className="w-20 shrink-0 text-xs text-muted">
              {fmtDate(it.date, { weekday: 'short', day: '2-digit', month: '2-digit' })}
              {it.time && <div>{it.time}</div>}
            </div>
            <div className="min-w-0 flex-1">
              <div className={cx('truncate text-sm', it.date < today && 'text-zinc-500')}>{it.title}</div>
              <div className="text-[11px] text-muted">{it.label}</div>
            </div>
          </button>
        ))}
        {!agenda.length && <div className="text-sm text-muted">Keine Termine.</div>}
      </div>
      {edit && <EventModal key={edit.id ?? 'new'} event={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

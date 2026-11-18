import { AlertTriangle, CalendarClock, Check, ExternalLink, Loader2, Newspaper, RotateCcw, Search, Target, ThumbsDown } from 'lucide-react'
import { useState } from 'react'
import { coach, useCoach } from '../lib/coach'
import { AREAS } from '../lib/constants'
import { daysUntil, fmtDate, relDays, toISO, todayISO } from '../lib/format'
import { updateSettings, useCollection, useSettings } from '../lib/store'
import { useSync } from '../lib/sync'
import type { BriefingItem, CoachMessage, ManagerFrequency } from '../types'
import { Badge, Button, Card, Input, Select, cx } from './ui'

const TIMING: Record<BriefingItem['timing'], { label: string; color: string }> = {
  jetzt: { label: 'Jetzt angehen', color: '#16a34a' },
  vormerken: { label: 'Vormerken', color: '#a16207' },
  info: { label: 'Info', color: '#52525b' },
}

export function nextBriefingDate(briefings: CoachMessage[], freq: ManagerFrequency): string {
  if (freq === 'off') return ''
  const last = Math.max(0, ...briefings.filter((b) => !b.error).map((b) => b.at))
  const earliest = new Date(Math.max(Date.now(), last + (freq === 'weekly' ? 6 : 13) * 86400000))
  earliest.setDate(earliest.getDate() + ((3 - earliest.getDay() + 7) % 7))
  return toISO(earliest)
}

/** Alle offenen Chancen mit Frist (für Übersicht & Kalender) */
export function useOpenChances() {
  const msgs = useCollection('coach')
  return msgs
    .filter((m) => m.kind === 'briefing')
    .flatMap((m) => (m.items ?? []).map((item) => ({ item, msg: m })))
    .filter(({ item }) => item.category === 'chance' && (item.status === 'neu' || item.status === 'uebernommen'))
}

export function ItemCard({ item, msg }: { item: BriefingItem; msg: CoachMessage }) {
  const d = item.deadline ? daysUntil(item.deadline) : null
  const done = item.status === 'erledigt' || item.status === 'verworfen'
  return (
    <div className={cx('rounded-md border bg-panel2 p-3', done ? 'border-line opacity-55' : item.timing === 'jetzt' && item.category === 'chance' ? 'border-green-900' : 'border-line')}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge color={item.category === 'chance' ? '#7c3aed' : '#0369a1'}>
          {item.category === 'chance' ? <Target size={11} /> : <Newspaper size={11} />} {item.category === 'chance' ? 'Chance' : 'News'}
        </Badge>
        {item.type && <Badge>{item.type}</Badge>}
        <Badge color={TIMING[item.timing]?.color}>{TIMING[item.timing]?.label ?? item.timing}</Badge>
        {item.deadline && (
          <span className={cx('flex items-center gap-1 text-xs', d !== null && d < 0 ? 'text-zinc-500 line-through' : d !== null && d <= 14 ? 'font-semibold text-red-400' : 'text-muted')}>
            <CalendarClock size={12} /> Frist {fmtDate(item.deadline)} ({relDays(item.deadline)})
          </span>
        )}
        {item.status === 'uebernommen' && <span className="text-xs text-green-500">✓ als Ziel übernommen</span>}
        {item.status === 'erledigt' && <span className="text-xs text-green-500">✓ erledigt</span>}
        {item.status === 'verworfen' && <span className="text-xs text-zinc-500">nicht relevant</span>}
      </div>
      <div className="mt-1.5 font-medium">{item.title}</div>
      {item.summary && <p className="mt-1 text-sm text-zinc-400">{item.summary}</p>}
      {item.relevance && (
        <p className="mt-1 text-sm">
          <span className="font-semibold text-yellow-500">Warum für euch: </span>
          {item.relevance}
        </p>
      )}
      {item.action && (
        <p className="mt-1 text-sm">
          <span className="font-semibold text-zinc-300">Nächster Schritt: </span>
          {item.action}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {item.url ? (
          <a href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-accent2 hover:underline">
            <ExternalLink size={12} /> Quelle öffnen
          </a>
        ) : (
          <span className="flex items-center gap-1 text-xs text-yellow-600">
            <AlertTriangle size={12} /> Quelle nicht bestätigt – bitte selbst prüfen
          </span>
        )}
        <span className="flex-1" />
        {!done && item.category === 'chance' && item.status === 'neu' && (
          <Button size="sm" variant="primary" onClick={() => coach.itemToGoal(msg, item)}>
            <Target size={13} /> Als Ziel übernehmen
          </Button>
        )}
        {!done && (
          <Button size="sm" onClick={() => coach.updateItem(msg, item.id, { status: 'erledigt' })}>
            <Check size={13} /> Erledigt
          </Button>
        )}
        {!done && (
          <Button size="sm" variant="ghost" title="Der Manager merkt sich das für künftige Briefings" onClick={() => coach.updateItem(msg, item.id, { status: 'verworfen' })}>
            <ThumbsDown size={13} /> Nicht relevant
          </Button>
        )}
        {done && (
          <Button size="sm" variant="ghost" onClick={() => coach.updateItem(msg, item.id, { status: 'neu' })}>
            <RotateCcw size={13} /> Wiederherstellen
          </Button>
        )}
      </div>
    </div>
  )
}

export default function Manager() {
  const sync = useSync()
  const state = useCoach()
  const settings = useSettings()
  const briefings = [...useCollection('coach')].filter((m) => m.kind === 'briefing').sort((a, b) => b.at - a.at)
  const chances = useOpenChances().sort((a, b) => (a.item.deadline || '9999').localeCompare(b.item.deadline || '9999'))
  const [topic, setTopic] = useState('')
  const [showAll, setShowAll] = useState(false)
  const freq: ManagerFrequency = settings?.managerFrequency ?? 'biweekly'
  const next = nextBriefingDate(briefings, freq)
  const available = !!sync.activeBand && !!sync.session
  const pending = state.briefingSince > 0 && !briefings.some((b) => b.at > state.briefingSince)
  const today = todayISO()

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-xl">
            <div className="font-semibold">Manager-Briefing</div>
            <p className="mt-1 text-sm text-muted">
              Mittwochs recherchiert der Manager im Web nach Neuigkeiten und Chancen, die zu euch passen: Förderungen, Bandaufrufe, Contests, Konzertreihen, Workshops und Szene-News. Er prüft, ob sie zu eurem aktuellen Stand passen, und sagt euch, was jetzt sinnvoll ist und was ihr euch für später vormerken solltet.
            </p>
            {freq !== 'off' && next && <p className="mt-1 text-xs text-zinc-400">Nächstes automatisches Briefing: {fmtDate(next, { weekday: 'long', day: '2-digit', month: '2-digit' })} (wenn der Mittwochs-Zeitplan in Supabase eingerichtet ist)</p>}
          </div>
          <Select
            className="w-auto"
            value={freq}
            onChange={(e) => updateSettings({ managerFrequency: e.target.value as ManagerFrequency })}
            options={[
              { value: 'weekly', label: 'Jeden Mittwoch' },
              { value: 'biweekly', label: 'Alle 2 Wochen (Mittwoch)' },
              { value: 'off', label: 'Automatik aus' },
            ]}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="relative min-w-56 flex-1">
            <Search size={15} className="absolute left-3 top-2.5 text-zinc-500" />
            <Input className="pl-9" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Optional: Recherche-Auftrag, z.B. „Musikerbörsen für Drummer in Stuttgart“" disabled={!available} />
          </div>
          <Button variant="primary" disabled={!available || pending} onClick={() => (void coach.requestBriefing(topic.trim()), setTopic(''))}>
            {topic.trim() ? 'Recherche starten' : 'Briefing jetzt holen'}
          </Button>
        </div>
        {pending && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <Loader2 size={15} className="animate-spin" /> Der Manager recherchiert im Web – das dauert 1–3 Minuten. Ihr könnt die App solange weiter nutzen.
          </p>
        )}
        {state.error && <p className="mt-3 text-sm text-red-400">{state.error}</p>}
      </Card>

      {chances.length > 0 && briefings.length > 1 && (
        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Offene Chancen ({chances.length})</h2>
          <div className="space-y-2">
            {chances
              .filter(({ item }) => !item.deadline || item.deadline >= today)
              .map(({ item, msg }) => (
                <ItemCard key={item.id} item={item} msg={msg} />
              ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Briefings</h2>
        {!briefings.length && <Card className="text-sm text-muted">Noch kein Briefing. Holt euch das erste mit dem Button oben.</Card>}
        <div className="space-y-4">
          {briefings.slice(0, showAll ? undefined : 4).map((b) => (
            <Card key={b.id} className={b.error ? 'border-red-900' : ''}>
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <Newspaper size={13} /> {fmtDate(toISO(new Date(b.at)), { weekday: 'long', day: '2-digit', month: 'long' })}
                {b.topic && <Badge color="#0369a1">Recherche: {b.topic}</Badge>}
              </div>
              <p className="whitespace-pre-wrap text-sm">{b.text}</p>
              {(b.items ?? []).length > 0 && (
                <div className="mt-3 space-y-2">
                  {(b.items ?? []).map((i) => (
                    <ItemCard key={i.id} item={i} msg={b} />
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
        {briefings.length > 4 && (
          <button className="mt-2 text-xs text-muted underline" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Weniger anzeigen' : `Alle ${briefings.length} Briefings anzeigen`}
          </button>
        )}
      </div>
      <p className="text-[11px] text-zinc-600">
        „Nicht relevant“ merkt sich der Manager für künftige Briefings. Funde mit Frist erscheinen automatisch im Kalender. Bereiche: {Object.values(AREAS).map((a) => a.label).join(', ')}.
      </p>
    </div>
  )
}

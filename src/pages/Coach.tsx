import { Bot, Check, ClipboardList, Lightbulb, Loader2, Send, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Badge, Button, Card, PageHeader, Select, Textarea, cx } from '../components/ui'
import { coach, useCoach } from '../lib/coach'
import { AREAS } from '../lib/constants'
import { timeAgo } from '../lib/format'
import { store, updateSettings, useCollection, useSettings } from '../lib/store'
import { useSync } from '../lib/sync'
import type { CoachMessage, CoachMode } from '../types'

function CoachBubble({ m }: { m: CoachMessage }) {
  const goals = useCollection('goals')
  const [free, setFree] = useState<Record<string, string>>({})
  const state = useCoach()
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
        <Bot size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-[11px] text-muted">Coach · {timeAgo(m.at)}</div>
        <div className="whitespace-pre-wrap rounded-lg rounded-tl-none border border-line bg-panel p-3 text-sm leading-relaxed">{m.text}</div>
        {(m.questions ?? []).map((qu) => {
          const done = m.answered?.includes(qu.id)
          return (
            <div key={qu.id} className={cx('mt-2 rounded-md border p-2.5', done ? 'border-line opacity-60' : 'border-yellow-800/60 bg-yellow-950/20')}>
              <div className="text-sm font-medium">{qu.text}</div>
              {!done && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {qu.options.map((o) => (
                    <Button key={o} size="sm" disabled={state.busy} onClick={() => void coach.answer(m, qu.id, o)}>
                      {o}
                    </Button>
                  ))}
                  <div className="flex min-w-48 flex-1 gap-1">
                    <input
                      className="w-full rounded-md border border-line bg-bg px-2 py-1 text-xs"
                      placeholder="Eigene Antwort…"
                      value={free[qu.id] ?? ''}
                      onChange={(e) => setFree({ ...free, [qu.id]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && free[qu.id]?.trim() && void coach.answer(m, qu.id, free[qu.id])}
                    />
                    <Button size="sm" disabled={!free[qu.id]?.trim() || state.busy} onClick={() => void coach.answer(m, qu.id, free[qu.id])}>
                      <Send size={12} />
                    </Button>
                  </div>
                </div>
              )}
              {done && <div className="mt-1 text-[11px] text-green-500">✓ beantwortet</div>}
            </div>
          )
        })}
        {(m.suggestions ?? []).map((s) => {
          const goal = s.kind === 'task' ? goals.find((g) => g.id === s.goalId) : undefined
          return (
            <div key={s.id} className="mt-2 rounded-md border border-line bg-panel2 p-2.5">
              <div className="flex flex-wrap items-start gap-2">
                <Lightbulb size={15} className="mt-0.5 shrink-0 text-yellow-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{s.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                    <Badge color={AREAS[s.area]?.color}>{s.kind === 'task' ? 'Schritt' : 'Neues Ziel'}</Badge>
                    {goal && <span>für „{goal.title}“</span>}
                  </div>
                  {s.detail && <p className="mt-1 text-xs text-zinc-400">{s.detail}</p>}
                  {s.why && (
                    <p className="mt-1 text-xs text-zinc-300">
                      <span className="font-semibold text-yellow-500">Warum: </span>
                      {s.why}
                    </p>
                  )}
                </div>
                {s.appliedAt ? (
                  <span className="flex items-center gap-1 text-xs text-green-500">
                    <Check size={14} /> übernommen
                  </span>
                ) : (
                  <Button size="sm" variant="primary" onClick={() => coach.applySuggestion(m, s)}>
                    Übernehmen
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CoachSetupHint() {
  const sync = useSync()
  return (
    <Card className="border-accent/40">
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <Bot size={18} className="text-accent" /> Coach einrichten
      </div>
      <p className="text-sm text-muted">
        Der Coach ist Claude, angebunden über eine kleine Funktion in eurem Supabase-Projekt. So bleibt der API-Schlüssel geheim und alle sehen dieselben Antworten.
      </p>
      <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-zinc-300">
        <li className={sync.activeBand ? 'text-green-500 line-through' : ''}>
          Cloud-Sync einrichten und Band verbinden (
          <a className="text-accent2 underline" href="#/einstellungen">
            Sync & Einstellungen
          </a>
          )
        </li>
        <li>API-Key auf platform.claude.com erstellen (kostenpflichtig nach Verbrauch)</li>
        <li>Coach-Funktion in Supabase anlegen und Key als Secret hinterlegen – Anleitung in der README, Abschnitt „Band-Coach einrichten“</li>
      </ol>
    </Card>
  )
}

export default function Coach() {
  const sync = useSync()
  const state = useCoach()
  const settings = useSettings()
  const messages = [...useCollection('coach')].sort((a, b) => a.at - b.at)
  const [text, setText] = useState('')
  const bottom = useRef<HTMLDivElement>(null)
  const available = !!sync.activeBand && !!sync.session
  const mode: CoachMode = settings?.coachMode ?? 'auto'

  useEffect(() => {
    coach.markSeen()
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, state.busy])

  const send = () => {
    if (!text.trim()) return
    void coach.send('message', text)
    setText('')
  }

  return (
    <div>
      <PageHeader
        title="Band-Coach"
        subtitle="Claude begleitet eure Roadmap: Wenn ihr etwas eintragt oder abhakt, reagiert der Coach mit Einordnung, Rückfragen und durchdachten Vorschlägen – sichtbar für die ganze Band. Ihr könnt ihn auch jederzeit direkt fragen."
        actions={
          <div className="flex items-center gap-2">
            <Select
              className="w-auto"
              value={mode}
              onChange={(e) => updateSettings({ coachMode: e.target.value as CoachMode })}
              options={[
                { value: 'auto', label: 'Reagiert automatisch' },
                { value: 'manual', label: 'Nur auf Anfrage' },
                { value: 'off', label: 'Coach aus' },
              ]}
            />
          </div>
        }
      />

      {!available && (
        <div className="mb-5">
          <CoachSetupHint />
        </div>
      )}

      {mode !== 'off' && (
        <>
          <div className="space-y-5">
            {!messages.length && (
              <Card className="text-sm text-muted">
                Noch keine Unterhaltung. Tragt eure Songs ein, hakt Schritte ab – oder bittet den Coach unten um eine erste Einschätzung eurer Roadmap.
              </Card>
            )}
            {messages.map((m) =>
              m.role === 'coach' ? (
                <CoachBubble key={m.id} m={m} />
              ) : m.role === 'event' ? (
                <div key={m.id} className="ml-11 rounded-md border border-dashed border-line px-3 py-2 text-xs text-muted">
                  <div className="mb-1 flex items-center gap-1 font-semibold uppercase tracking-wider">
                    <ClipboardList size={12} /> Ereignisse von {m.author} · {timeAgo(m.at)}
                  </div>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
              ) : (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%]">
                    <div className="mb-1 text-right text-[11px] text-muted">
                      {m.author} · {timeAgo(m.at)}
                    </div>
                    <div className="whitespace-pre-wrap rounded-lg rounded-tr-none bg-accent/20 p-3 text-sm">{m.text}</div>
                  </div>
                </div>
              ),
            )}
            {state.busy && (
              <div className="flex items-center gap-2 pl-11 text-sm text-muted">
                <Loader2 size={16} className="animate-spin" /> Coach denkt nach…
              </div>
            )}
            <div ref={bottom} />
          </div>

          {state.error && <p className="mt-4 text-sm text-red-400">{state.error}</p>}

          {state.queue.length > 0 && (
            <Card className="mt-5 flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1 text-xs text-muted">
                <span className="font-semibold text-zinc-300">{state.queue.length} neue Ereignisse</span>
                {mode === 'auto' ? ' – der Coach reagiert in Kürze gebündelt darauf.' : ' – werden beim nächsten Mal mitgeschickt.'}
                <div className="mt-1 truncate">{state.queue.at(-1)}</div>
              </div>
              <Button size="sm" disabled={!available || state.busy} onClick={() => void coach.send('events')}>
                Jetzt reagieren lassen
              </Button>
            </Card>
          )}

          <div className="sticky bottom-20 mt-5 rounded-lg border border-line bg-panel p-3 lg:bottom-4">
            <Textarea
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
              }}
              placeholder={`Frag den Coach, z.B. „Wie gehen wir die Drummer-Suche am besten an?“`}
              disabled={!available}
            />
            <div className="mt-2 flex flex-wrap justify-between gap-2">
              <Button size="sm" variant="ghost" disabled={!available || state.busy} onClick={() => void coach.send('checkin')}>
                <Sparkles size={14} /> Gesamteinschätzung holen
              </Button>
              <Button size="sm" variant="primary" disabled={!available || state.busy || !text.trim()} onClick={send}>
                <Send size={14} /> Senden
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-zinc-600">
              Der Coach sieht den Stand eurer App (ohne Lyrics) und diesen Verlauf. Er ändert nichts selbst – Vorschläge übernehmt ihr per Klick. Du schreibst als „{store.author || 'Band'}“.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

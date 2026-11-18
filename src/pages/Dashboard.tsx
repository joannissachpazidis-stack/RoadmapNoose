import { AlertTriangle, ArrowRight, CalendarDays, ClipboardCheck, Lightbulb, Star } from 'lucide-react'
import { useState } from 'react'
import GoalModal from '../components/GoalModal'
import { Button, Card, PageHeader, Progress, SectionTitle, Stat } from '../components/ui'
import { SONG_STAGES, hasVocals, stageAtLeast } from '../lib/constants'
import { daysUntil, fmtDate, fmtMoney, relDays, todayISO } from '../lib/format'
import { go } from '../lib/router'
import { useCollection, useSettings } from '../lib/store'
import { useSync } from '../lib/sync'
import type { Goal } from '../types'
import { useCalendarItems } from './Calendar'
import { GoalCard, ReviewModal, SuggestionList } from './Roadmap'

export default function Dashboard() {
  const phases = [...useCollection('phases')].sort((a, b) => a.order - b.order)
  const goals = useCollection('goals')
  const songs = useCollection('songs')
  const gigs = useCollection('gigs')
  const txs = useCollection('transactions')
  const members = useCollection('members')
  const settings = useSettings()
  const sync = useSync()
  const [edit, setEdit] = useState<Goal | null>(null)
  const [review, setReview] = useState(false)
  const items = useCalendarItems(() => go('kalender'))
  const today = todayISO()

  const focus = goals.filter((g) => g.focus && g.status !== 'erledigt')
  const overdue = goals.filter((g) => g.due && g.status !== 'erledigt' && g.status !== 'pausiert' && (daysUntil(g.due) ?? 0) < 0)
  const seenSeries = new Set<string>()
  const upcoming = items
    .filter((i) => i.date >= today && (daysUntil(i.date) ?? 99) <= 30)
    .filter((i) => {
      // Serientermine (z.B. Mittwochs-Session) nur einmal zeigen
      if (!i.label.endsWith('Serie')) return true
      if (seenSeries.has(i.title)) return false
      seenSeries.add(i.title)
      return true
    })
    .slice(0, 7)
  const active = songs.filter((s) => s.stage !== 'archiv')
  const ready = active.filter((s) => stageAtLeast(s.stage, 'probereif')).length
  const withVocals = active.filter((s) => stageAtLeast(s.stage, 'demo') || hasVocals(s.parts)).length
  const balance = txs.reduce((a, t) => a + t.amount, 0)
  const played = gigs.filter((g) => g.status === 'gespielt').length
  const nextGig = gigs.filter((g) => g.status === 'bestaetigt' && g.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0]
  const placeholderNames = members.some((m) => ['Gitarre', 'Bass', 'Gesang'].includes(m.name))
  const reviewDue = Date.now() - (settings?.lastReview ?? 0) > 28 * 86400000

  // aktuelle Phase = erste Phase mit offenen Zielen
  const currentPhase = phases.find((p) => goals.some((g) => g.phaseId === p.id && g.status !== 'erledigt')) ?? phases.at(-1)

  return (
    <div>
      <PageHeader
        title={settings?.bandName || sync.activeBand?.name || 'Übersicht'}
        subtitle={currentPhase ? <>Ihr seid gerade in der Phase <span className="font-semibold text-white">„{currentPhase.title}“</span>. {currentPhase.description}</> : undefined}
      />

      {(!members.length || placeholderNames || !songs.length || (sync.status === 'local' && !sync.configured)) && (
        <Card className="mb-5 border-accent/50">
          <div className="font-semibold">Los geht's 🤘</div>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-zinc-300">
            {(!members.length || placeholderNames) && (
              <li>
                <a className="text-accent2 underline" href="#/orga">
                  Eure Namen bei den Mitgliedern eintragen
                </a>{' '}
                und Zuständigkeiten verteilen
              </li>
            )}
            {!songs.length && (
              <li>
                <a className="text-accent2 underline" href="#/songs">
                  Eure 5–7 Instrumentals und alle Ideen erfassen
                </a>{' '}
                – fertige Instrumentals ins Stadium „Instrumental steht“
              </li>
            )}
            <li>
              <a className="text-accent2 underline" href="#/kalender">
                Uhrzeit der Mittwochs-Session
              </a>{' '}
              im Kalender ergänzen
            </li>
            <li>
              <a className="text-accent2 underline" href="#/roadmap">
                Start-Roadmap
              </a>{' '}
              durchsehen: Ziele anpassen, Verantwortliche & Termine setzen
            </li>
            {!sync.configured && (
              <li>
                <a className="text-accent2 underline" href="#/einstellungen">
                  Cloud-Sync einrichten
                </a>
                , damit alle denselben Stand sehen
              </li>
            )}
          </ol>
        </Card>
      )}

      {reviewDue && (
        <Card className="mb-5 flex flex-wrap items-center gap-3 border-yellow-700/60">
          <ClipboardCheck className="text-yellow-400" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">Zeit für euren Roadmap-Check</div>
            <div className="text-muted">Einmal im Monat gemeinsam: Was ist geschafft, was hängt, was ist der Fokus für die nächsten 4 Wochen?</div>
          </div>
          <Button variant="primary" onClick={() => setReview(true)}>
            Check starten
          </Button>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Songs mit Vocals" value={`${withVocals}/10`} sub={`${active.length} Songs & Ideen · ${ready} live-ready`} onClick={() => go('songs')} />
        <Stat label="Gigs gespielt" value={played} sub={nextGig ? `Nächster: ${fmtDate(nextGig.date)}` : 'kein Gig bestätigt'} onClick={() => go('live')} />
        <Stat label="Bandkasse" value={fmtMoney(balance)} onClick={() => go('kasse')} />
        <Stat label="Ziele erledigt" value={`${goals.filter((g) => g.status === 'erledigt').length}/${goals.length}`} onClick={() => go('roadmap')} />
      </div>

      {/* Phasen-Leiste */}
      <div className="scrollbar-thin mb-6 flex gap-2 overflow-x-auto pb-1">
        {phases.map((p, i) => {
          const all = goals.filter((g) => g.phaseId === p.id)
          const d = all.filter((g) => g.status === 'erledigt').length
          const cur = p.id === currentPhase?.id
          return (
            <button key={p.id} onClick={() => go('roadmap')} className={`min-w-36 flex-1 rounded-md border p-2 text-left ${cur ? 'border-accent bg-accent/10' : 'border-line bg-panel'}`}>
              <div className="text-[10px] uppercase tracking-widest text-muted">Phase {i + 1}</div>
              <div className="truncate text-sm font-semibold">{p.title}</div>
              <Progress value={d} max={all.length || 1} className="mt-1.5 h-1" color={all.length && d === all.length ? '#16a34a' : undefined} />
            </button>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div>
          <SectionTitle
            right={
              <button className="flex items-center gap-1 text-xs text-muted hover:text-white" onClick={() => go('roadmap')}>
                Roadmap <ArrowRight size={12} />
              </button>
            }
          >
            <span className="flex items-center gap-1.5">
              <Star size={13} className="text-yellow-400" /> Fokus-Ziele
            </span>
          </SectionTitle>
          {focus.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {focus.map((g) => (
                <GoalCard key={g.id} goal={g} onClick={() => setEdit(g)} />
              ))}
            </div>
          ) : (
            <Card className="text-sm text-muted">Keine Fokus-Ziele gesetzt. Markiert 1–3 Ziele als Fokus – am besten im Roadmap-Check.</Card>
          )}

          {overdue.length > 0 && (
            <>
              <SectionTitle>
                <span className="flex items-center gap-1.5 text-red-400">
                  <AlertTriangle size={13} /> Überfällig
                </span>
              </SectionTitle>
              <div className="grid gap-2 sm:grid-cols-2">
                {overdue.map((g) => (
                  <GoalCard key={g.id} goal={g} onClick={() => setEdit(g)} />
                ))}
              </div>
            </>
          )}

          <SectionTitle>
            <span className="flex items-center gap-1.5">
              <Lightbulb size={13} className="text-yellow-400" /> Vorgeschlagene nächste Schritte
            </span>
          </SectionTitle>
          <SuggestionList limit={3} compact />
        </div>

        <div>
          <SectionTitle
            right={
              <button className="flex items-center gap-1 text-xs text-muted hover:text-white" onClick={() => go('kalender')}>
                Kalender <ArrowRight size={12} />
              </button>
            }
          >
            <span className="flex items-center gap-1.5">
              <CalendarDays size={13} /> Nächste 30 Tage
            </span>
          </SectionTitle>
          <Card className="space-y-2 p-3">
            {upcoming.length ? (
              upcoming.map((it, i) => (
                <button key={i} onClick={it.onClick} className="flex w-full items-center gap-3 text-left">
                  <span className="h-7 w-1 shrink-0 rounded" style={{ background: it.color }} />
                  <span className="w-16 shrink-0 text-xs text-muted">{relDays(it.date)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{it.title}</span>
                    <span className="text-[11px] text-muted">{it.label}</span>
                  </span>
                </button>
              ))
            ) : (
              <div className="text-sm text-muted">Keine Termine in den nächsten 30 Tagen.</div>
            )}
          </Card>

          <SectionTitle
            right={
              <button className="flex items-center gap-1 text-xs text-muted hover:text-white" onClick={() => go('songs')}>
                Songs <ArrowRight size={12} />
              </button>
            }
          >
            Song-Pipeline
          </SectionTitle>
          <Card className="space-y-1.5 p-3">
            {SONG_STAGES.filter((s) => s.key !== 'archiv').map((st) => {
              const n = active.filter((s) => s.stage === st.key).length
              return (
                <div key={st.key} className="flex items-center gap-2 text-xs">
                  <span className="w-28 shrink-0 text-muted">{st.label}</span>
                  <div className="h-2.5 flex-1 rounded bg-panel2">
                    <div className="h-2.5 rounded" style={{ width: active.length ? (n / active.length) * 100 + '%' : 0, background: st.color }} />
                  </div>
                  <span className="w-5 text-right">{n}</span>
                </div>
              )
            })}
          </Card>
        </div>
      </div>

      {edit && <GoalModal key={edit.id} goal={edit} onClose={() => setEdit(null)} />}
      {review && <ReviewModal onClose={() => setReview(false)} />}
    </div>
  )
}

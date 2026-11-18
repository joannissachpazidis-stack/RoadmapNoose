import { CalendarClock, ChevronDown, ChevronRight, ClipboardCheck, EyeOff, Lightbulb, Pencil, Plus, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import GoalModal, { GoalMetric, newGoal } from '../components/GoalModal'
import { Badge, Button, Card, Checkbox, Empty, Field, Input, Modal, NumberInput, PageHeader, Progress, Select, Textarea, cx } from '../components/ui'
import { AREAS, GOAL_STATUS } from '../lib/constants'
import { addDays, daysUntil, fmtDate, relDays, timeAgo, todayISO } from '../lib/format'
import { addTemplateGoal, getSuggestions, type Suggestion } from '../lib/roadmap'
import { store, updateSettings, useCollection, useSettings, useStoreVersion } from '../lib/store'
import type { Area, Goal, Phase } from '../types'
import { MemberDots } from '../components/ui'

export function GoalCard({ goal, onClick }: { goal: Goal; onClick: () => void }) {
  const doneTasks = goal.tasks.filter((t) => t.done).length
  const d = goal.due ? daysUntil(goal.due) : null
  const overdue = d !== null && d < 0 && goal.status !== 'erledigt'
  return (
    <div
      onClick={onClick}
      className={cx(
        'cursor-pointer rounded-md border bg-panel2 p-3 transition hover:border-zinc-500',
        goal.status === 'erledigt' ? 'border-line opacity-60' : goal.focus ? 'border-yellow-600/60' : 'border-line',
      )}
    >
      <div className="flex items-start gap-2">
        {goal.focus && <Star size={14} className="mt-0.5 shrink-0 text-yellow-400" fill="currentColor" />}
        <div className={cx('flex-1 text-sm font-medium', goal.status === 'erledigt' && 'line-through')}>{goal.title}</div>
        <MemberDots ids={goal.ownerIds} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge color={AREAS[goal.area]?.color}>{AREAS[goal.area]?.label}</Badge>
        <Badge color={GOAL_STATUS[goal.status].color}>{GOAL_STATUS[goal.status].label}</Badge>
        {goal.due && <span className={cx('text-[11px]', overdue ? 'font-semibold text-red-400' : 'text-muted')}>{overdue ? 'überfällig · ' : ''}{fmtDate(goal.due)}</span>}
      </div>
      {goal.tasks.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <Progress value={doneTasks} max={goal.tasks.length} className="h-1.5" color="#71717a" />
          <span className="text-[11px] text-muted">
            {doneTasks}/{goal.tasks.length}
          </span>
        </div>
      )}
      <GoalMetric goal={goal} compact />
    </div>
  )
}

export function SuggestionList({ limit, compact, expandable }: { limit?: number; compact?: boolean; expandable?: boolean }) {
  useStoreVersion()
  const settings = useSettings()
  const dismissed = settings?.dismissedSuggestions ?? []
  const all = getSuggestions(dismissed)
  const [showAll, setShowAll] = useState(false)
  const list = limit && !showAll ? all.slice(0, limit) : all
  const [open, setOpen] = useState<string | null>(null)
  if (!list.length)
    return <div className="text-sm text-muted">Gerade keine neuen Vorschläge – sobald ihr Fortschritte macht (z.B. mehr probe-reife Songs, erste Gigs), tauchen hier passende nächste Schritte auf.</div>
  return (
    <div className="space-y-2">
      {list.map(({ template: t, reason }: Suggestion) => (
        <div key={t.id} className="rounded-md border border-line bg-panel2 p-3">
          <div className="flex flex-wrap items-start gap-2">
            <Lightbulb size={16} className="mt-0.5 shrink-0 text-yellow-400" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{t.title}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <Badge color={AREAS[t.area].color}>{AREAS[t.area].label}</Badge>
                {reason && <span className="text-xs text-muted">{reason}</span>}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="primary" onClick={() => addTemplateGoal(t)}>
                <Plus size={14} /> Übernehmen
              </Button>
              <Button size="sm" variant="ghost" title="Ausblenden" onClick={() => updateSettings({ dismissedSuggestions: [...dismissed, t.id] })}>
                <EyeOff size={14} />
              </Button>
            </div>
          </div>
          {!compact || open === t.id ? (
            <div className="mt-2 pl-6 text-xs leading-relaxed text-zinc-400">
              <p>{t.description}</p>
              <p className="mt-1.5 text-zinc-300">
                <span className="font-semibold text-yellow-500">Warum: </span>
                {t.why}
              </p>
            </div>
          ) : (
            <button className="mt-1 pl-6 text-xs text-muted hover:text-zinc-200" onClick={() => setOpen(t.id)}>
              Warum? →
            </button>
          )}
        </div>
      ))}
      {expandable && limit && all.length > limit && (
        <button className="text-xs text-muted underline" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Weniger anzeigen' : `Alle ${all.length} Vorschläge anzeigen`}
        </button>
      )}
      {dismissed.length > 0 && (!limit || expandable) && (
        <button className="text-xs text-muted underline" onClick={() => updateSettings({ dismissedSuggestions: [] })}>
          {dismissed.length} ausgeblendete Vorschläge wieder anzeigen
        </button>
      )}
    </div>
  )
}

function PhaseModal({ phase, onClose }: { phase: Partial<Phase>; onClose: () => void }) {
  const [p, setP] = useState(phase)
  return (
    <Modal
      open
      onClose={onClose}
      title={phase.id ? 'Phase bearbeiten' : 'Neue Phase'}
      footer={
        <>
          {phase.id && (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => {
                const n = store.list('goals').filter((g) => g.phaseId === phase.id).length
                if (n) return alert(`Diese Phase enthält noch ${n} Ziele. Verschiebe oder lösche sie zuerst.`)
                store.remove(phase.id!)
                onClose()
              }}
            >
              Löschen
            </Button>
          )}
          <Button variant="primary" onClick={() => (store.put('phases', p), onClose())} disabled={!p.title}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Titel">
          <Input value={p.title ?? ''} onChange={(e) => setP({ ...p, title: e.target.value })} />
        </Field>
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <Field label="Zeithorizont">
            <Input value={p.horizon ?? ''} onChange={(e) => setP({ ...p, horizon: e.target.value })} placeholder="z.B. 6–12 Monate" />
          </Field>
          <Field label="Reihenfolge">
            <NumberInput value={p.order ?? null} onChange={(v) => setP({ ...p, order: v ?? 0 })} />
          </Field>
        </div>
        <Field label="Beschreibung">
          <Textarea value={p.description ?? ''} onChange={(e) => setP({ ...p, description: e.target.value })} />
        </Field>
      </div>
    </Modal>
  )
}

export function ReviewModal({ onClose }: { onClose: () => void }) {
  useStoreVersion()
  const goals = useCollection('goals')
  const settings = useSettings()
  const [planNext, setPlanNext] = useState(true)
  const open = goals.filter((g) => g.status !== 'erledigt')
  const overdue = open.filter((g) => g.due && (daysUntil(g.due) ?? 0) < 0 && g.status !== 'pausiert')
  const stale = open.filter((g) => g.status !== 'pausiert' && !overdue.includes(g) && Date.now() - (g.lastTouched ?? g.createdAt ?? 0) > 30 * 86400000)
  const since = settings?.lastReview ?? 0
  const doneSince = goals.filter((g) => g.status === 'erledigt' && (g.doneAt ?? 0) > since)
  const focusCount = goals.filter((g) => g.focus && g.status !== 'erledigt').length
  const touch = (g: Goal, patch: Partial<Goal>) => store.put('goals', { id: g.id, ...patch, lastTouched: Date.now(), ...(patch.status === 'erledigt' ? { doneAt: Date.now() } : {}) })

  const Row = ({ g, extra }: { g: Goal; extra?: React.ReactNode }) => (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-panel2 p-2">
      <div className="min-w-0 flex-1">
        <div className="text-sm">{g.title}</div>
        <div className="text-[11px] text-muted">
          {GOAL_STATUS[g.status].label}
          {g.due && ` · fällig ${fmtDate(g.due)} (${relDays(g.due)})`}
          {g.lastTouched && ` · zuletzt bearbeitet ${timeAgo(g.lastTouched)}`}
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {extra}
        <Button size="sm" onClick={() => touch(g, { status: 'erledigt' })}>
          Erledigt
        </Button>
        <Button size="sm" onClick={() => touch(g, { status: 'pausiert' })}>
          Pausieren
        </Button>
      </div>
    </div>
  )

  const finish = () => {
    updateSettings({ lastReview: Date.now() })
    if (planNext) store.put('events', { title: 'Band-Meeting: Roadmap-Check', type: 'meeting', date: addDays(todayISO(), 28), time: '', notes: 'Monatlicher Roadmap-Check in der App durchgehen.' })
    onClose()
  }

  return (
    <Modal open onClose={onClose} wide title={<span className="flex items-center gap-2"><ClipboardCheck size={20} className="text-accent" /> Roadmap-Check</span>} footer={<><Checkbox checked={planNext} onChange={setPlanNext} label="Nächsten Check in 4 Wochen im Kalender eintragen" className="mr-auto" /><Button variant="primary" onClick={finish}>Check abschließen</Button></>}>
      <div className="space-y-6">
        <p className="text-sm text-muted">
          Geht diesen Check am besten gemeinsam im Band-Meeting durch (ca. 15 Min.). {since ? `Letzter Check: ${timeAgo(since)}.` : ''}
        </p>

        <section>
          <h3 className="mb-2 font-semibold text-white">1. Was habt ihr geschafft? 🤘</h3>
          {doneSince.length ? (
            <ul className="list-inside list-disc text-sm text-green-400">
              {doneSince.map((g) => (
                <li key={g.id}>{g.title}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Seit dem letzten Check wurde noch kein Ziel abgeschlossen. Ist etwas fertig, das ihr nur nicht abgehakt habt?</p>
          )}
        </section>

        <section>
          <h3 className="mb-2 font-semibold text-white">2. Überfällige Ziele ({overdue.length})</h3>
          {overdue.length ? (
            <div className="space-y-2">
              {overdue.map((g) => (
                <Row
                  key={g.id}
                  g={g}
                  extra={
                    <>
                      <Button size="sm" onClick={() => touch(g, { due: addDays(todayISO(), 14) })}>
                        +2 Wochen
                      </Button>
                      <Button size="sm" onClick={() => touch(g, { due: addDays(todayISO(), 30) })}>
                        +1 Monat
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nichts überfällig. 👍</p>
          )}
        </section>

        <section>
          <h3 className="mb-2 font-semibold text-white">3. Seit über 30 Tagen nicht bewegt ({stale.length})</h3>
          <p className="mb-2 text-xs text-muted">Ist das Ziel noch relevant? Braucht es eine verantwortliche Person oder einen kleineren ersten Schritt?</p>
          {stale.length ? (
            <div className="space-y-2">
              {stale.map((g) => (
                <Row key={g.id} g={g} extra={<Button size="sm" onClick={() => touch(g, { status: 'aktiv' })}>Weiter verfolgen</Button>} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Alles in Bewegung.</p>
          )}
        </section>

        <section>
          <h3 className="mb-2 font-semibold text-white">4. Fokus für die nächsten 4 Wochen</h3>
          <p className="mb-2 text-xs text-muted">Wählt maximal 3 Fokus-Ziele – mehr verwässert die Energie. Aktuell: {focusCount}.</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {open
              .filter((g) => g.status !== 'pausiert')
              .map((g) => (
                <button
                  key={g.id}
                  onClick={() => touch(g, { focus: !g.focus, status: !g.focus && g.status === 'offen' ? 'aktiv' : g.status })}
                  className={cx('flex items-center gap-2 rounded-md border p-2 text-left text-sm', g.focus ? 'border-yellow-600 bg-yellow-950/30' : 'border-line bg-panel2')}
                >
                  <Star size={14} className={g.focus ? 'text-yellow-400' : 'text-zinc-600'} fill={g.focus ? 'currentColor' : 'none'} />
                  {g.title}
                </button>
              ))}
          </div>
          {focusCount > 3 && <p className="mt-2 text-xs text-yellow-500">Mehr als 3 Fokus-Ziele – überlegt, was wirklich zuerst kommt.</p>}
        </section>

        <section>
          <h3 className="mb-2 font-semibold text-white">5. Neue Vorschläge passend zu eurem Stand</h3>
          <SuggestionList limit={4} compact />
        </section>
      </div>
    </Modal>
  )
}

export default function Roadmap({ param }: { param?: string }) {
  const phases = [...useCollection('phases')].sort((a, b) => a.order - b.order)
  const goals = useCollection('goals')
  const settings = useSettings()
  const [edit, setEdit] = useState<Partial<Goal> | null>(() => (param ? (store.get('goals', param) ?? null) : null))
  const [editPhase, setEditPhase] = useState<Partial<Phase> | null>(null)
  const [review, setReview] = useState(param === 'check')
  const [hideDone, setHideDone] = useState(false)
  const [area, setArea] = useState<'' | Area>('')
  const [showSug, setShowSug] = useState(true)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const filtered = useMemo(() => goals.filter((g) => (!hideDone || g.status !== 'erledigt') && (!area || g.area === area)), [goals, hideDone, area])
  const total = goals.length
  const doneCount = goals.filter((g) => g.status === 'erledigt').length
  const reviewDue = Date.now() - (settings?.lastReview ?? 0) > 28 * 86400000

  return (
    <div>
      <PageHeader
        title="Roadmap"
        subtitle="Eure Ziele in Phasen – von den Grundlagen bis zum Wachstum. Phasen überlappen: Ihr arbeitet oft parallel an mehreren. Haltet die Roadmap mit dem monatlichen Roadmap-Check aktuell."
        actions={
          <>
            <Button onClick={() => setReview(true)} className={reviewDue ? 'border-yellow-600 text-yellow-400' : ''}>
              <ClipboardCheck size={16} /> Roadmap-Check{reviewDue ? ' fällig' : ''}
            </Button>
            <Button variant="primary" onClick={() => setEdit(newGoal(phases[0]?.id ?? ''))}>
              <Plus size={16} /> Neues Ziel
            </Button>
          </>
        }
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-48 flex-1">
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>Gesamtfortschritt</span>
              <span>
                {doneCount}/{total} Ziele erledigt
              </span>
            </div>
            <Progress value={doneCount} max={total} />
          </div>
          <Select className="w-auto" value={area} onChange={(e) => setArea(e.target.value as Area | '')} options={[{ value: '', label: 'Alle Bereiche' }, ...Object.entries(AREAS).map(([k, v]) => ({ value: k, label: v.label }))]} />
          <Checkbox checked={hideDone} onChange={setHideDone} label="Erledigte ausblenden" />
        </div>
      </Card>

      <Card className="mb-6 border-yellow-900/60">
        <button className="flex w-full items-center gap-2 text-left" onClick={() => setShowSug(!showSug)}>
          {showSug ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <Lightbulb size={18} className="text-yellow-400" />
          <span className="font-semibold">Vorschläge für eure nächsten Ziele</span>
          <span className="ml-auto hidden text-xs text-muted sm:block">basierend auf eurem aktuellen Stand</span>
        </button>
        {showSug && (
          <div className="mt-3">
            <SuggestionList limit={5} compact expandable />
          </div>
        )}
      </Card>

      <div className="space-y-5">
        {phases.map((p, i) => {
          const pg = filtered.filter((g) => g.phaseId === p.id)
          const all = goals.filter((g) => g.phaseId === p.id)
          const pd = all.filter((g) => g.status === 'erledigt').length
          const isCollapsed = collapsed[p.id]
          return (
            <section key={p.id} className="relative">
              <div className="flex items-start gap-3">
                <div className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 font-display text-lg', all.length && pd === all.length ? 'border-green-600 bg-green-950 text-green-400' : 'border-accent bg-bg text-accent')}>{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="flex items-center gap-1 text-left" onClick={() => setCollapsed({ ...collapsed, [p.id]: !isCollapsed })}>
                      <h2 className="font-display text-xl text-white">{p.title}</h2>
                      {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {p.horizon && (
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <CalendarClock size={12} /> {p.horizon}
                      </span>
                    )}
                    <button className="text-zinc-600 hover:text-zinc-300" onClick={() => setEditPhase(p)} aria-label="Phase bearbeiten">
                      <Pencil size={13} />
                    </button>
                    <span className="ml-auto text-xs text-muted">
                      {pd}/{all.length}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{p.description}</p>
                  <Progress value={pd} max={all.length || 1} className="mt-2 h-1" />
                  {!isCollapsed && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {pg
                        .sort((a, b) => Number(b.focus) - Number(a.focus) || Number(a.status === 'erledigt') - Number(b.status === 'erledigt') || (a.due || '9').localeCompare(b.due || '9'))
                        .map((g) => (
                          <GoalCard key={g.id} goal={g} onClick={() => setEdit(g)} />
                        ))}
                      <button onClick={() => setEdit(newGoal(p.id))} className="flex min-h-16 items-center justify-center gap-1 rounded-md border border-dashed border-line text-sm text-muted hover:border-zinc-500 hover:text-zinc-200">
                        <Plus size={16} /> Ziel hinzufügen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )
        })}
        {!phases.length && <Empty title="Noch keine Phasen">Lege eine erste Phase an.</Empty>}
        <Button variant="ghost" onClick={() => setEditPhase({ title: '', description: '', horizon: '', order: (phases.at(-1)?.order ?? 0) + 1 })}>
          <Plus size={16} /> Phase hinzufügen
        </Button>
      </div>

      {edit && <GoalModal key={edit.id ?? 'new'} goal={edit} onClose={() => setEdit(null)} />}
      {editPhase && <PhaseModal phase={editPhase} onClose={() => setEditPhase(null)} />}
      {review && <ReviewModal onClose={() => setReview(false)} />}
    </div>
  )
}

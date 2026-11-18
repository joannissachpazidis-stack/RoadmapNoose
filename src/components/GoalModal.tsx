import { Lightbulb, Plus, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AREAS, GOAL_STATUS } from '../lib/constants'
import { buildCtx, TEMPLATE_BY_ID } from '../lib/roadmap'
import { store, uid, useCollection, useStoreVersion } from '../lib/store'
import type { Area, Goal, GoalStatus } from '../types'
import { Button, Checkbox, confirmDelete, Field, Input, MemberPicker, Modal, Progress, Select, Textarea } from './ui'

export function newGoal(phaseId: string): Partial<Goal> {
  return { title: '', description: '', why: '', phaseId, area: 'fundament', status: 'offen', ownerIds: [], due: '', focus: false, tasks: [] }
}

export function GoalMetric({ goal, compact }: { goal: Goal; compact?: boolean }) {
  useStoreVersion()
  const t = goal.templateId ? TEMPLATE_BY_ID[goal.templateId] : undefined
  if (!t?.metric) return null
  const m = t.metric(buildCtx())
  return (
    <div className={compact ? 'mt-2' : ''}>
      <div className="mb-1 flex justify-between text-[11px] text-muted">
        <span>{m.label}</span>
        <span className={m.value >= m.target ? 'text-green-500' : ''}>
          {m.value}/{m.target}
        </span>
      </div>
      <Progress value={m.value} max={m.target} color={m.value >= m.target ? '#16a34a' : undefined} />
    </div>
  )
}

export default function GoalModal({ goal, onClose }: { goal: Partial<Goal> | null; onClose: () => void }) {
  const phases = useCollection('phases')
  const [g, setG] = useState<Partial<Goal>>(() => goal ?? {})
  const [newTask, setNewTask] = useState('')
  const [showWhy, setShowWhy] = useState(!goal?.id)
  if (!goal) return null
  const isNew = !goal.id
  const set = (patch: Partial<Goal>) => setG((p) => ({ ...p, ...patch }))
  const tasks = g.tasks ?? []

  const save = () => {
    if (!g.title?.trim()) return
    const patch: Partial<Goal> = { ...g, lastTouched: Date.now() }
    if (g.status === 'erledigt' && goal.status !== 'erledigt') patch.doneAt = Date.now()
    store.put('goals', patch)
    onClose()
  }

  const addTask = () => {
    if (!newTask.trim()) return
    set({ tasks: [...tasks, { id: uid(), text: newTask.trim(), done: false }] })
    setNewTask('')
  }

  const fullGoal = { ...g, id: g.id ?? '' } as Goal

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Neues Ziel' : 'Ziel bearbeiten'}
      footer={
        <>
          {!isNew && (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => {
                if (confirmDelete(g.title ?? '')) {
                  store.remove(goal.id!)
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
          <Button variant="primary" onClick={save} disabled={!g.title?.trim()}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Ziel">
          <Input autoFocus={isNew} value={g.title ?? ''} onChange={(e) => set({ title: e.target.value })} placeholder="z.B. Erste 3 Gigs spielen" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phase">
            <Select value={g.phaseId} onChange={(e) => set({ phaseId: e.target.value })} options={[...phases].sort((a, b) => a.order - b.order).map((p) => ({ value: p.id, label: p.title }))} />
          </Field>
          <Field label="Bereich">
            <Select value={g.area} onChange={(e) => set({ area: e.target.value as Area })} options={Object.entries(AREAS).map(([k, v]) => ({ value: k, label: v.label }))} />
          </Field>
          <Field label="Status">
            <Select value={g.status} onChange={(e) => set({ status: e.target.value as GoalStatus })} options={Object.entries(GOAL_STATUS).map(([k, v]) => ({ value: k, label: v.label }))} />
          </Field>
          <Field label="Zieldatum">
            <Input type="date" value={g.due ?? ''} onChange={(e) => set({ due: e.target.value })} />
          </Field>
        </div>
        <Field label="Verantwortlich">
          <MemberPicker value={g.ownerIds ?? []} onChange={(v) => set({ ownerIds: v })} />
        </Field>
        <button type="button" onClick={() => set({ focus: !g.focus })} className={`flex items-center gap-2 text-sm ${g.focus ? 'text-yellow-400' : 'text-muted'}`}>
          <Star size={16} fill={g.focus ? 'currentColor' : 'none'} /> {g.focus ? 'Fokus-Ziel (wird auf der Übersicht hervorgehoben)' : 'Als Fokus-Ziel markieren'}
        </button>
        <Field label="Beschreibung">
          <Textarea value={g.description ?? ''} onChange={(e) => set({ description: e.target.value })} />
        </Field>

        {g.templateId && <GoalMetric goal={fullGoal} />}

        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Schritte ({tasks.filter((t) => t.done).length}/{tasks.length})
          </div>
          <div className="space-y-1.5">
            {tasks.map((t) => (
              <div key={t.id} className="group flex items-start gap-2">
                <Checkbox strike className="flex-1" checked={t.done} onChange={(v) => set({ tasks: tasks.map((x) => (x.id === t.id ? { ...x, done: v } : x)) })} label={t.text} />
                <button className="text-zinc-600 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100" onClick={() => set({ tasks: tasks.filter((x) => x.id !== t.id) })} aria-label="Schritt entfernen">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())} placeholder="Neuer Schritt…" />
            <Button onClick={addTask}>
              <Plus size={16} />
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-line bg-panel2 p-3">
          <button type="button" className="flex w-full items-center gap-2 text-left text-sm font-medium text-yellow-400" onClick={() => setShowWhy(!showWhy)}>
            <Lightbulb size={16} /> Warum ist das wichtig?
          </button>
          {showWhy && <Textarea className="mt-2" rows={5} value={g.why ?? ''} onChange={(e) => set({ why: e.target.value })} placeholder="Begründung – hilft der ganzen Band, Prioritäten zu verstehen." />}
        </div>
      </div>
    </Modal>
  )
}

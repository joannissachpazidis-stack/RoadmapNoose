import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { CHECKLISTS, seedChecklist } from '../lib/roadmap'
import { store, useCollection } from '../lib/store'
import { Button, Card, Checkbox, Input, Progress } from './ui'

export default function ChecklistView({ group, resettable }: { group: string; resettable?: boolean }) {
  const items = useCollection('checklist').filter((i) => i.group === group)
  const def = CHECKLISTS[group]
  const [newTitle, setNewTitle] = useState('')
  const sections = [...new Set([...items].sort((a, b) => a.order - b.order).map((i) => i.section))]
  const done = items.filter((i) => i.done).length

  if (!items.length)
    return (
      <Card>
        <p className="text-sm text-muted">{def?.description}</p>
        <Button className="mt-3" onClick={() => seedChecklist(group)}>
          Checkliste anlegen
        </Button>
      </Card>
    )

  return (
    <div>
      {def && <p className="mb-3 text-sm text-muted">{def.description}</p>}
      <div className="mb-4 flex items-center gap-3">
        <Progress value={done} max={items.length} />
        <span className="whitespace-nowrap text-xs text-muted">
          {done}/{items.length}
        </span>
        {resettable && done > 0 && (
          <Button size="sm" variant="ghost" title="Alle Häkchen zurücksetzen (z.B. vor dem nächsten Gig)" onClick={() => window.confirm('Alle Häkchen zurücksetzen?') && store.putMany('checklist', items.map((i) => ({ id: i.id, done: false })))}>
            <RotateCcw size={14} /> Zurücksetzen
          </Button>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((sec) => (
          <Card key={sec}>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">{sec}</div>
            <div className="space-y-2">
              {items
                .filter((i) => i.section === sec)
                .sort((a, b) => a.order - b.order)
                .map((i) => (
                  <div key={i.id} className="group flex items-start gap-2">
                    <div className="flex-1">
                      <Checkbox strike checked={i.done} onChange={(v) => store.put('checklist', { id: i.id, done: v })} label={i.title} />
                      {i.hint && <div className="ml-6 text-xs text-zinc-500">{i.hint}</div>}
                    </div>
                    <button className="text-zinc-700 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100" onClick={() => store.remove(i.id)} aria-label="entfernen">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Eigenen Punkt hinzufügen…" />
        <Button
          onClick={() => {
            if (!newTitle.trim()) return
            store.put('checklist', { group, section: 'Eigene Punkte', title: newTitle.trim(), hint: '', done: false, notes: '', order: 999 })
            setNewTitle('')
          }}
        >
          <Plus size={16} />
        </Button>
      </div>
    </div>
  )
}

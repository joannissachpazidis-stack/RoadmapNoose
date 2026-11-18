import { Plus, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import ChecklistView from '../components/ChecklistView'
import { Button, Card, Field, Input, Modal, PageHeader, Tabs, confirmDelete, cx } from '../components/ui'
import { MEMBER_COLORS } from '../lib/constants'
import { store, updateSettings, useCollection, useSettings } from '../lib/store'
import type { Member } from '../types'

function MemberModal({ member, onClose }: { member: Partial<Member>; onClose: () => void }) {
  const [m, setM] = useState(member)
  return (
    <Modal
      open
      onClose={onClose}
      title={member.id ? 'Mitglied bearbeiten' : 'Neues Mitglied'}
      footer={
        <>
          {member.id && (
            <Button variant="danger" className="mr-auto" onClick={() => confirmDelete(m.name ?? '') && (store.remove(member.id!), onClose())}>
              <Trash2 size={16} />
            </Button>
          )}
          <Button variant="primary" disabled={!m.name} onClick={() => (store.put('members', m), onClose())}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Name">
          <Input autoFocus value={m.name ?? ''} onChange={(e) => setM({ ...m, name: e.target.value })} />
        </Field>
        <Field label="Instrument / Rolle in der Musik">
          <Input value={m.roles ?? ''} onChange={(e) => setM({ ...m, roles: e.target.value })} placeholder="z.B. Gitarre, Backing Vocals" />
        </Field>
        <Field label="Zuständig für" hint="Jede:r übernimmt mindestens einen Orga-Bereich">
          <Input value={m.responsibilities ?? ''} onChange={(e) => setM({ ...m, responsibilities: e.target.value })} placeholder="z.B. Booking, Social Media, Bandkasse" />
        </Field>
        <Field label="Farbe">
          <div className="flex gap-2">
            {MEMBER_COLORS.map((c) => (
              <button key={c} onClick={() => setM({ ...m, color: c })} className={cx('h-7 w-7 rounded-full border-2', m.color === c ? 'border-white' : 'border-transparent')} style={{ background: c }} aria-label={c} />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  )
}

const RESP = ['Booking', 'Social Media', 'Bandkasse', 'Merch', 'Technik / Backline', 'Termine & Proben', 'Presse / Mails', 'Grafik / Video']

export default function Orga() {
  const members = useCollection('members')
  const goals = useCollection('goals')
  const settings = useSettings()
  const [tab, setTab] = useState<'band' | 'business'>('band')
  const [edit, setEdit] = useState<Partial<Member> | null>(null)
  const unassigned = RESP.filter((r) => !members.some((m) => m.responsibilities.toLowerCase().includes(r.split(' ')[0].toLowerCase())))

  return (
    <div>
      <PageHeader title="Band & Orga" subtitle="Wer seid ihr, wer macht was – und die organisatorischen, rechtlichen Basics." />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'band', label: 'Band & Mitglieder' },
          { value: 'business', label: 'Business-Checkliste' },
        ]}
      />
      {tab === 'band' ? (
        <div className="space-y-5">
          <Card>
            <div className="mb-3 font-semibold">Bandprofil</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Bandname">
                <Input value={settings?.bandName ?? ''} onChange={(e) => updateSettings({ bandName: e.target.value })} />
              </Field>
              <Field label="Genre / Subgenre">
                <Input value={settings?.genre ?? ''} onChange={(e) => updateSettings({ genre: e.target.value })} placeholder="z.B. Melodic Death Metal" />
              </Field>
              <Field label="Heimatstadt">
                <Input value={settings?.hometown ?? ''} onChange={(e) => updateSettings({ hometown: e.target.value })} />
              </Field>
            </div>
          </Card>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Mitglieder</h2>
              <Button size="sm" onClick={() => setEdit({ name: '', roles: '', responsibilities: '', color: MEMBER_COLORS[members.length % MEMBER_COLORS.length] })}>
                <UserPlus size={14} /> Mitglied
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((m) => {
                const open = goals.filter((g) => g.ownerIds.includes(m.id) && g.status !== 'erledigt').length
                return (
                  <Card key={m.id} onClick={() => setEdit(m)} className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white" style={{ background: m.color }}>
                      {m.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted">{m.roles || '–'}</div>
                      {m.responsibilities && <div className="mt-1 text-xs text-zinc-300">Zuständig: {m.responsibilities}</div>}
                      <div className="mt-1 text-[11px] text-zinc-500">{open} offene Ziele</div>
                    </div>
                  </Card>
                )
              })}
              <button onClick={() => setEdit({ name: '', roles: '', responsibilities: '', color: MEMBER_COLORS[members.length % MEMBER_COLORS.length] })} className="flex min-h-20 items-center justify-center gap-1 rounded-lg border border-dashed border-line text-sm text-muted hover:text-zinc-200">
                <Plus size={16} /> Mitglied hinzufügen
              </button>
            </div>
            {members.length > 0 && unassigned.length > 0 && (
              <p className="mt-3 text-xs text-yellow-500">Noch niemand zuständig für: {unassigned.join(', ')}</p>
            )}
          </div>
        </div>
      ) : (
        <ChecklistView group="business" />
      )}
      {edit && <MemberModal key={edit.id ?? 'new'} member={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

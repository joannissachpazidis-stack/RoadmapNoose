import { Mail, Phone, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Select, Textarea, confirmDelete } from '../components/ui'
import { CONTACT_TYPES } from '../lib/constants'
import { daysUntil, fmtDate, todayISO } from '../lib/format'
import { store, useCollection } from '../lib/store'
import type { Contact, ContactType } from '../types'

function ContactModal({ contact, onClose }: { contact: Partial<Contact>; onClose: () => void }) {
  const [c, setC] = useState(contact)
  const set = (p: Partial<Contact>) => setC((x) => ({ ...x, ...p }))
  return (
    <Modal
      open
      onClose={onClose}
      title={contact.id ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
      footer={
        <>
          {contact.id && (
            <Button variant="danger" className="mr-auto" onClick={() => confirmDelete(c.name ?? '') && (store.remove(contact.id!), onClose())}>
              <Trash2 size={16} />
            </Button>
          )}
          <Button variant="primary" disabled={!c.name} onClick={() => (store.put('contacts', c), onClose())}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <Input autoFocus value={c.name ?? ''} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Typ">
            <Select value={c.type} onChange={(e) => set({ type: e.target.value as ContactType })} options={Object.entries(CONTACT_TYPES).map(([v, label]) => ({ value: v, label }))} />
          </Field>
          <Field label="E-Mail">
            <Input type="email" value={c.email ?? ''} onChange={(e) => set({ email: e.target.value })} />
          </Field>
          <Field label="Telefon">
            <Input value={c.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
          <Field label="Stadt">
            <Input value={c.city ?? ''} onChange={(e) => set({ city: e.target.value })} />
          </Field>
          <Field label="Web / Social">
            <Input value={c.web ?? ''} onChange={(e) => set({ web: e.target.value })} />
          </Field>
          <Field label="Letzter Kontakt">
            <Input type="date" value={c.lastContact ?? ''} onChange={(e) => set({ lastContact: e.target.value })} />
          </Field>
        </div>
        <Field label="Nächster Schritt">
          <Input value={c.nextStep ?? ''} onChange={(e) => set({ nextStep: e.target.value })} placeholder="z.B. Ende Januar wegen Frühjahrs-Termin nachfragen" />
        </Field>
        <Field label="Notizen">
          <Textarea value={c.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
        <Button size="sm" onClick={() => set({ lastContact: todayISO() })}>
          Heute kontaktiert
        </Button>
      </div>
    </Modal>
  )
}

export default function Contacts() {
  const contacts = useCollection('contacts')
  const [edit, setEdit] = useState<Partial<Contact> | null>(null)
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const list = contacts
    .filter((c) => (!type || c.type === type) && (!q || [c.name, c.city, c.notes, c.email].join(' ').toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      <PageHeader
        title="Kontakte"
        subtitle="Venues, Veranstalter, andere Bands, Studios, Presse. Euer Netzwerk ist euer wichtigstes Kapital – notiert immer, wann ihr zuletzt Kontakt hattet und was der nächste Schritt ist."
        actions={
          <Button variant="primary" onClick={() => setEdit({ name: '', type: 'venue', city: '', email: '', phone: '', web: '', notes: '', lastContact: '', nextStep: '' })}>
            <Plus size={16} /> Kontakt
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-zinc-500" />
          <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suchen…" />
        </div>
        <Select className="w-auto" value={type} onChange={(e) => setType(e.target.value)} options={[{ value: '', label: 'Alle Typen' }, ...Object.entries(CONTACT_TYPES).map(([v, label]) => ({ value: v, label: `${label} (${contacts.filter((c) => c.type === v).length})` }))]} />
      </div>
      {!list.length ? (
        <Empty title={contacts.length ? 'Keine Treffer' : 'Noch keine Kontakte'}>Startet mit 10 lokalen Venues/Veranstaltern und 5 Bands aus eurer Szene.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => {
            const since = c.lastContact ? -(daysUntil(c.lastContact) ?? 0) : null
            return (
              <Card key={c.id} onClick={() => setEdit(c)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium">{c.name}</div>
                  <Badge>{CONTACT_TYPES[c.type]}</Badge>
                </div>
                {c.city && <div className="text-xs text-muted">{c.city}</div>}
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  {c.email && (
                    <a href={'mailto:' + c.email} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-accent2 hover:underline">
                      <Mail size={12} /> Mail
                    </a>
                  )}
                  {c.phone && (
                    <a href={'tel:' + c.phone} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-accent2 hover:underline">
                      <Phone size={12} /> Anrufen
                    </a>
                  )}
                </div>
                {c.lastContact && <div className="mt-2 text-[11px] text-muted">Letzter Kontakt: {fmtDate(c.lastContact)}{since !== null && since > 90 ? ' · lange her' : ''}</div>}
                {c.nextStep && <div className="mt-1 text-xs text-yellow-500">→ {c.nextStep}</div>}
              </Card>
            )
          })}
        </div>
      )}
      {edit && <ContactModal key={edit.id ?? 'new'} contact={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

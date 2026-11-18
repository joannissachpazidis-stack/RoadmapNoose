import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, Empty, Field, Input, Modal, NumberInput, PageHeader, Select, confirmDelete, cx } from '../components/ui'
import { TX_CATEGORIES } from '../lib/constants'
import { fmtDate, fmtMoney, todayISO } from '../lib/format'
import { store, updateSettings, useCollection, useSettings } from '../lib/store'
import type { Transaction } from '../types'

function TxModal({ tx, onClose }: { tx: Partial<Transaction>; onClose: () => void }) {
  const members = useCollection('members')
  const [t, setT] = useState(tx)
  const [kind, setKind] = useState<'in' | 'out'>((tx.amount ?? -1) >= 0 && tx.id ? 'in' : tx.id ? 'out' : 'out')
  const [abs, setAbs] = useState<number | null>(tx.amount != null ? Math.abs(tx.amount) : null)
  const save = () => {
    store.put('transactions', { ...t, amount: kind === 'in' ? abs ?? 0 : -(abs ?? 0) })
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={tx.id ? 'Buchung bearbeiten' : 'Neue Buchung'}
      footer={
        <>
          {tx.id && (
            <Button variant="danger" className="mr-auto" onClick={() => confirmDelete(t.description || 'Buchung') && (store.remove(tx.id!), onClose())}>
              <Trash2 size={16} />
            </Button>
          )}
          <Button variant="primary" disabled={!abs} onClick={save}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex rounded-md border border-line p-0.5">
          {(['out', 'in'] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={cx('flex-1 rounded py-1.5 text-sm', kind === k ? (k === 'in' ? 'bg-green-700 text-white' : 'bg-red-800 text-white') : 'text-muted')}>
              {k === 'in' ? 'Einnahme' : 'Ausgabe'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Betrag (€)">
            <NumberInput autoFocus value={abs} onChange={setAbs} />
          </Field>
          <Field label="Datum">
            <Input type="date" value={t.date ?? ''} onChange={(e) => setT({ ...t, date: e.target.value })} />
          </Field>
          <Field label="Kategorie">
            <Select value={t.category} onChange={(e) => setT({ ...t, category: e.target.value })} options={TX_CATEGORIES.map((c) => ({ value: c, label: c }))} />
          </Field>
          <Field label="Mitglied (optional)">
            <Select value={t.memberId ?? ''} onChange={(e) => setT({ ...t, memberId: e.target.value })} options={[{ value: '', label: '–' }, ...members.map((m) => ({ value: m.id, label: m.name }))]} />
          </Field>
        </div>
        <Field label="Beschreibung">
          <Input value={t.description ?? ''} onChange={(e) => setT({ ...t, description: e.target.value })} />
        </Field>
      </div>
    </Modal>
  )
}

export default function Finance() {
  const txs = useCollection('transactions')
  const members = useCollection('members')
  const releases = useCollection('releases')
  const settings = useSettings()
  const [edit, setEdit] = useState<Partial<Transaction> | null>(null)
  const [year, setYear] = useState('alle')
  const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date))
  const filtered = year === 'alle' ? sorted : sorted.filter((t) => t.date.startsWith(year))
  const balance = txs.reduce((a, t) => a + t.amount, 0)
  const income = filtered.filter((t) => t.amount > 0).reduce((a, t) => a + t.amount, 0)
  const expense = filtered.filter((t) => t.amount < 0).reduce((a, t) => a + t.amount, 0)
  const years = [...new Set(txs.map((t) => t.date.slice(0, 4)))].sort().reverse()
  const byCat = Object.entries(
    filtered.reduce<Record<string, number>>((a, t) => {
      a[t.category] = (a[t.category] ?? 0) + t.amount
      return a
    }, {}),
  ).sort((a, b) => a[1] - b[1])
  const maxAbs = Math.max(1, ...byCat.map(([, v]) => Math.abs(v)))
  const plannedBudget = releases.filter((r) => r.status !== 'veroeffentlicht').reduce((a, r) => a + (r.budget ?? 0), 0)
  const fee = settings?.monthlyFee ?? null
  const monthlyIn = fee && members.length ? fee * members.length : 0
  const monthsToBudget = plannedBudget > balance && monthlyIn ? Math.ceil((plannedBudget - balance) / monthlyIn) : null

  const bookFees = () => {
    if (!fee || !members.length) return
    const month = new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    store.putMany('transactions', members.map((m) => ({ date: todayISO(), amount: fee, category: 'Mitgliedsbeitrag', description: `Beitrag ${month}`, memberId: m.id })))
  }

  return (
    <div>
      <PageHeader
        title="Bandkasse"
        subtitle="Alle Einnahmen und Ausgaben der Band. Belege aufheben – Gagen und Merch-Umsätze sind steuerlich relevant."
        actions={
          <Button variant="primary" onClick={() => setEdit({ date: todayISO(), amount: 0, category: 'Proberaum', description: '', memberId: '' })}>
            <Plus size={16} /> Buchung
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">Kassenstand</div>
          <div className={cx('text-2xl font-bold', balance < 0 ? 'text-red-400' : 'text-green-500')}>{fmtMoney(balance)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">Einnahmen {year !== 'alle' && year}</div>
          <div className="text-2xl font-bold">{fmtMoney(income)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">Ausgaben {year !== 'alle' && year}</div>
          <div className="text-2xl font-bold">{fmtMoney(-expense)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">Geplante Release-Budgets</div>
          <div className="text-2xl font-bold">{fmtMoney(plannedBudget)}</div>
          {plannedBudget > 0 && <div className={cx('text-[11px]', balance >= plannedBudget ? 'text-green-500' : 'text-yellow-500')}>{balance >= plannedBudget ? 'gedeckt ✓' : `fehlen ${fmtMoney(plannedBudget - balance)}${monthsToBudget ? ` (~${monthsToBudget} Monate Beiträge)` : ''}`}</div>}
        </Card>
      </div>

      <Card className="mb-5 flex flex-wrap items-end gap-3">
        <Field label="Monatsbeitrag pro Person (€)" className="w-48">
          <NumberInput value={fee} onChange={(v) => updateSettings({ monthlyFee: v })} />
        </Field>
        <div className="pb-2 text-sm text-muted">{fee && members.length ? `= ${fmtMoney(monthlyIn)} pro Monat bei ${members.length} Mitgliedern` : 'Mitglieder unter "Band & Orga" anlegen'}</div>
        <Button className="ml-auto" disabled={!fee || !members.length} onClick={bookFees}>
          Beiträge für diesen Monat buchen
        </Button>
      </Card>

      {byCat.length > 0 && (
        <Card className="mb-5">
          <div className="mb-3 font-semibold">Nach Kategorie</div>
          <div className="space-y-1.5">
            {byCat.map(([cat, v]) => (
              <div key={cat} className="flex items-center gap-2 text-sm">
                <span className="w-40 shrink-0 truncate text-muted">{cat}</span>
                <div className="h-3 flex-1 rounded bg-panel2">
                  <div className="h-3 rounded" style={{ width: (Math.abs(v) / maxAbs) * 100 + '%', background: v >= 0 ? '#16a34a' : '#b91c1c' }} />
                </div>
                <span className={cx('w-24 text-right tabular-nums', v >= 0 ? 'text-green-500' : 'text-red-400')}>{fmtMoney(v)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Buchungen</h2>
        {years.length > 0 && <Select className="w-auto" value={year} onChange={(e) => setYear(e.target.value)} options={[{ value: 'alle', label: 'Alle Jahre' }, ...years.map((y) => ({ value: y, label: y }))]} />}
      </div>
      {!filtered.length ? (
        <Empty title="Noch keine Buchungen">Tragt Proberaummiete, Beiträge, Gagen und Ausgaben ein, um immer zu wissen, was für das nächste Projekt zur Verfügung steht.</Empty>
      ) : (
        <Card className="divide-y divide-line p-0">
          {filtered.map((t) => (
            <button key={t.id} onClick={() => setEdit(t)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-panel2">
              <span className="w-20 shrink-0 text-xs text-muted">{fmtDate(t.date)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{t.description || t.category}</span>
                <span className="text-[11px] text-muted">
                  {t.category}
                  {t.memberId && ` · ${members.find((m) => m.id === t.memberId)?.name ?? ''}`}
                </span>
              </span>
              <span className={cx('tabular-nums', t.amount >= 0 ? 'text-green-500' : 'text-red-400')}>{fmtMoney(t.amount)}</span>
            </button>
          ))}
        </Card>
      )}
      {edit && <TxModal key={edit.id ?? 'new'} tx={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

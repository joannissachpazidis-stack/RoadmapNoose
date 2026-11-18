import { Minus, Plus, Shirt, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, Empty, Field, Input, Modal, NumberInput, PageHeader, Textarea, confirmDelete } from '../components/ui'
import { fmtMoney, todayISO } from '../lib/format'
import { store, useCollection } from '../lib/store'
import type { MerchItem } from '../types'

function stockTotal(stock: string) {
  // "S:5, M:10" oder "20"
  const nums = stock.match(/\d+/g)
  if (!nums) return 0
  if (stock.includes(':')) return stock.split(',').reduce((a, p) => a + (Number(p.split(':')[1]) || 0), 0)
  return nums.reduce((a, n) => a + Number(n), 0)
}

function MerchModal({ item, onClose }: { item: Partial<MerchItem>; onClose: () => void }) {
  const [m, setM] = useState(item)
  const set = (p: Partial<MerchItem>) => setM((x) => ({ ...x, ...p }))
  const margin = m.price != null && m.unitCost != null ? m.price - m.unitCost : null
  return (
    <Modal
      open
      onClose={onClose}
      title={item.id ? 'Artikel bearbeiten' : 'Neuer Merch-Artikel'}
      footer={
        <>
          {item.id && (
            <Button variant="danger" className="mr-auto" onClick={() => confirmDelete(m.name ?? '') && (store.remove(item.id!), onClose())}>
              <Trash2 size={16} />
            </Button>
          )}
          <Button variant="primary" disabled={!m.name} onClick={() => (store.put('merch', m), onClose())}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Artikel">
            <Input autoFocus value={m.name ?? ''} onChange={(e) => set({ name: e.target.value })} placeholder="Logo-Shirt schwarz" />
          </Field>
          <Field label="Typ">
            <Input list="merchtypes" value={m.type ?? ''} onChange={(e) => set({ type: e.target.value })} />
            <datalist id="merchtypes">
              {['T-Shirt', 'Longsleeve', 'Hoodie', 'Patch', 'Sticker', 'Button', 'CD', 'Kassette', 'Vinyl', 'Beanie', 'Poster'].map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
          <Field label="Stückkosten (€)">
            <NumberInput value={m.unitCost} onChange={(v) => set({ unitCost: v })} />
          </Field>
          <Field label="Verkaufspreis (€)" hint={margin !== null ? `Marge: ${fmtMoney(margin)} pro Stück` : undefined}>
            <NumberInput value={m.price} onChange={(v) => set({ price: v })} />
          </Field>
        </div>
        <Field label="Bestand" hint='Pro Größe, z.B. "S:5, M:10, L:10, XL:5" – oder einfach eine Zahl'>
          <Input value={m.stock ?? ''} onChange={(e) => set({ stock: e.target.value })} />
        </Field>
        <Field label="Lieferant / Druckerei">
          <Input value={m.supplier ?? ''} onChange={(e) => set({ supplier: e.target.value })} />
        </Field>
        <Field label="Notizen">
          <Textarea value={m.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
      </div>
    </Modal>
  )
}

export default function Merch() {
  const items = useCollection('merch')
  const [edit, setEdit] = useState<Partial<MerchItem> | null>(null)
  const stockValue = items.reduce((a, i) => a + stockTotal(i.stock) * (i.unitCost ?? 0), 0)
  const revenue = items.reduce((a, i) => a + i.sold * (i.price ?? 0), 0)

  const sell = (i: MerchItem, n: number) => {
    store.put('merch', { id: i.id, sold: Math.max(0, i.sold + n) })
    if (n > 0 && i.price) store.put('transactions', { date: todayISO(), amount: i.price, category: 'Merch-Verkauf', description: i.name, memberId: '' })
  }

  return (
    <div>
      <PageHeader
        title="Merch"
        subtitle="Klein starten: ein Logo-Shirt in Schwarz, Sticker und Patches. Vorbestellungen finanzieren die Auflage, Kartenzahlung am Stand erhöht den Umsatz."
        actions={
          <Button variant="primary" onClick={() => setEdit({ name: '', type: 'T-Shirt', unitCost: null, price: null, stock: '', sold: 0, supplier: '', notes: '' })}>
            <Plus size={16} /> Artikel
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">Artikel</div>
          <div className="text-2xl font-bold">{items.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">Lagerwert (EK)</div>
          <div className="text-2xl font-bold">{fmtMoney(stockValue)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted">Umsatz (gezählt)</div>
          <div className="text-2xl font-bold">{fmtMoney(revenue)}</div>
        </Card>
      </div>
      {!items.length ? (
        <Empty icon={<Shirt size={32} />} title="Noch kein Merch">
          Sinnvoll ab den ersten Gigs. Tipp: Logo-Motiv einfarbig auf Schwarz ist am günstigsten zu drucken und verkauft sich in der Metal-Szene am zuverlässigsten.
        </Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <Card key={i.id}>
              <div className="cursor-pointer" onClick={() => setEdit(i)}>
                <div className="font-medium">{i.name}</div>
                <div className="text-xs text-muted">
                  {i.type} · EK {fmtMoney(i.unitCost)} · VK {fmtMoney(i.price)}
                  {i.price != null && i.unitCost != null && ` · Marge ${fmtMoney(i.price - i.unitCost)}`}
                </div>
                <div className="mt-2 text-sm">
                  Bestand: <span className="font-semibold">{i.stock || '–'}</span> <span className="text-xs text-muted">({stockTotal(i.stock)} Stk.)</span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                <span className="flex-1 text-sm">Verkauft: {i.sold}</span>
                <Button size="sm" onClick={() => sell(i, -1)} aria-label="Verkauf korrigieren">
                  <Minus size={14} />
                </Button>
                <Button size="sm" variant="primary" onClick={() => sell(i, 1)} title="Verkauf zählen & in Bandkasse buchen">
                  <Plus size={14} /> Verkauf
                </Button>
              </div>
              <div className="mt-1 text-[11px] text-zinc-600">"+ Verkauf" bucht den Preis direkt in die Bandkasse. Bestand bitte manuell anpassen.</div>
            </Card>
          ))}
        </div>
      )}
      {edit && <MerchModal key={edit.id ?? 'new'} item={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

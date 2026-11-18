import { X } from 'lucide-react'
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { useCollection } from '../lib/store'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

type BtnVariant = 'primary' | 'ghost' | 'outline' | 'danger'
export function Button({ variant = 'outline', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' }) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer',
        size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm',
        variant === 'primary' && 'bg-accent text-white hover:bg-accent2',
        variant === 'outline' && 'border border-line bg-panel2 hover:border-zinc-500',
        variant === 'ghost' && 'hover:bg-panel2 text-zinc-300',
        variant === 'danger' && 'border border-red-900 text-red-400 hover:bg-red-950',
        className,
      )}
    />
  )
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cx('rounded-lg border border-line bg-panel p-4', onClick && 'cursor-pointer hover:border-zinc-500 transition', className)}>
      {children}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl text-white">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between gap-2 first:mt-0">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted">{children}</h2>
      {right}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', fn)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', fn)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('flex max-h-[92vh] w-full flex-col rounded-t-xl border border-line bg-panel sm:rounded-xl', wide ? 'sm:max-w-4xl' : 'sm:max-w-xl')}>
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div className="text-lg font-semibold text-white">{title}</div>
          <button className="rounded p-1 text-muted hover:bg-panel2 hover:text-white" onClick={onClose} aria-label="Schließen">
            <X size={20} />
          </button>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-4 py-3 pb-safe">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  )
}

const inputBase = 'rounded-md border border-line bg-bg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent focus:outline-none'
/** w-full nur, wenn keine eigene Breite übergeben wurde */
const inputCls = (extra?: string) => cx(inputBase, !/(^|\s)w-/.test(extra ?? '') && 'w-full', extra)

export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={inputCls(p.className)} />
}

export function NumberInput({ value, onChange, ...p }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: number | null | undefined; onChange: (v: number | null) => void }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      {...p}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className={inputCls(p.className)}
    />
  )
}

export function Textarea(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...p} className={inputCls(cx('resize-y', p.className))} />
}

export function Select({ options, ...p }: SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <select {...p} className={inputCls(p.className)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Badge({ children, color = '#52525b', className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold', className)} style={{ background: color + '33', color: lighten(color), border: `1px solid ${color}66` }}>
      {children}
    </span>
  )
}

function lighten(hex: string) {
  // einfache Aufhellung für Text auf dunklem Hintergrund
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, ((n >> 16) & 255) + 70)
  const g = Math.min(255, ((n >> 8) & 255) + 70)
  const b = Math.min(255, (n & 255) + 70)
  return `rgb(${r},${g},${b})`
}

export function Progress({ value, max = 100, color = 'var(--color-accent)', className }: { value: number; max?: number; color?: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-panel2', className)}>
      <div className="h-full rounded-full transition-all" style={{ width: pct + '%', background: color }} />
    </div>
  )
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line p-8 text-center">
      {icon && <div className="mb-2 flex justify-center text-zinc-600">{icon}</div>}
      <div className="font-medium text-zinc-300">{title}</div>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  )
}

export function Checkbox({ checked, onChange, label, className, strike }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; className?: string; strike?: boolean }) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-2', className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-red-600" />
      {label && <span className={cx('text-sm', strike && checked && 'text-zinc-500 line-through')}>{label}</span>}
    </label>
  )
}

export function MemberPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const members = useCollection('members')
  if (!members.length) return <div className="text-xs text-zinc-500">Lege zuerst Mitglieder unter "Band & Orga" an.</div>
  return (
    <div className="flex flex-wrap gap-1.5">
      {members.map((m) => {
        const on = value.includes(m.id)
        return (
          <button
            type="button"
            key={m.id}
            onClick={() => onChange(on ? value.filter((x) => x !== m.id) : [...value, m.id])}
            className={cx('rounded-full border px-2.5 py-1 text-xs', on ? 'text-white' : 'border-line text-muted')}
            style={on ? { background: m.color + '55', borderColor: m.color } : undefined}
          >
            {m.name}
          </button>
        )
      })}
    </div>
  )
}

export function MemberDots({ ids }: { ids: string[] }) {
  const members = useCollection('members')
  const list = members.filter((m) => ids.includes(m.id))
  if (!list.length) return null
  return (
    <div className="flex -space-x-1">
      {list.map((m) => (
        <span key={m.id} title={m.name} className="flex h-5 w-5 items-center justify-center rounded-full border border-bg text-[10px] font-bold text-white" style={{ background: m.color }}>
          {m.name.slice(0, 1).toUpperCase()}
        </span>
      ))}
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: ReactNode }[] }) {
  return (
    <div className="scrollbar-thin mb-4 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cx('-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium', value === t.value ? 'border-accent text-white' : 'border-transparent text-muted hover:text-zinc-200')}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Stat({ label, value, sub, onClick }: { label: string; value: ReactNode; sub?: ReactNode; onClick?: () => void }) {
  return (
    <Card onClick={onClick} className="p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>}
    </Card>
  )
}

export function confirmDelete(what: string) {
  return window.confirm(`"${what}" wirklich löschen?`)
}

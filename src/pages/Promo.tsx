import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import ChecklistView from '../components/ChecklistView'
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Select, Tabs, Textarea, confirmDelete } from '../components/ui'
import { CONTENT_STATUS } from '../lib/constants'
import { fmtDateShort, todayISO } from '../lib/format'
import { store, useCollection } from '../lib/store'
import type { ContentPost, ContentStatus } from '../types'

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'YouTube Shorts', 'Facebook', 'Bandcamp', 'Newsletter', 'Website', 'Sonstiges']
const FORMATS = ['Reel / Short', 'Foto-Post', 'Story', 'Playthrough', 'Proberaum-Clip', 'Live-Clip', 'Ankündigung', 'Behind the Scenes', 'Lyrics-Snippet', 'Gear', 'Sonstiges']

const IDEAS = [
  { t: 'Riff-Teaser aus dem Proberaum (15 Sek.)', why: 'Zeigt Fortschritt, kostet nichts, funktioniert als Reel/Short.' },
  { t: 'Gitarren- oder Drum-Playthrough', why: 'In der Metal-Community extrem beliebt – Musiker:innen teilen sowas.' },
  { t: 'Band-Vorstellung: jedes Mitglied einzeln', why: 'Persönlichkeit schafft Bindung, gut für den Start.' },
  { t: 'Gear/Pedalboard-Rundgang', why: 'Nischig, aber hohe Interaktion bei Gear-Nerds.' },
  { t: 'Lyrics-Zitat mit Artwork-Ästhetik', why: 'Baut die visuelle Identität auf.' },
  { t: 'Gig-Ankündigung + Recap mit Fotos', why: 'Social Proof für Veranstalter und Fans.' },
  { t: 'Studio-Tagebuch während der Aufnahmen', why: 'Behind-the-Scenes baut Spannung bis zum Release auf.' },
  { t: '"Errate den Song-Titel"-Story', why: 'Interaktion steigert die Reichweite.' },
]

function ContentModal({ post, onClose }: { post: Partial<ContentPost>; onClose: () => void }) {
  const [p, setP] = useState(post)
  const set = (x: Partial<ContentPost>) => setP((o) => ({ ...o, ...x }))
  return (
    <Modal
      open
      onClose={onClose}
      title={post.id ? 'Content bearbeiten' : 'Neuer Content'}
      footer={
        <>
          {post.id && (
            <Button variant="danger" className="mr-auto" onClick={() => confirmDelete(p.title ?? '') && (store.remove(post.id!), onClose())}>
              <Trash2 size={16} />
            </Button>
          )}
          <Button variant="primary" disabled={!p.title} onClick={() => (store.put('content', p), onClose())}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Titel / Idee">
          <Input autoFocus value={p.title ?? ''} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Plattform">
            <Select value={p.platform} onChange={(e) => set({ platform: e.target.value })} options={PLATFORMS.map((x) => ({ value: x, label: x }))} />
          </Field>
          <Field label="Format">
            <Select value={p.format} onChange={(e) => set({ format: e.target.value })} options={FORMATS.map((x) => ({ value: x, label: x }))} />
          </Field>
          <Field label="Datum">
            <Input type="date" value={p.date ?? ''} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field label="Status">
            <Select value={p.status} onChange={(e) => set({ status: e.target.value as ContentStatus })} options={Object.entries(CONTENT_STATUS).map(([v, label]) => ({ value: v, label }))} />
          </Field>
        </div>
        <Field label="Notizen (Caption, Hashtags, wer filmt?)">
          <Textarea value={p.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
      </div>
    </Modal>
  )
}

export default function Promo() {
  const content = useCollection('content')
  const [tab, setTab] = useState<'content' | 'epk'>('content')
  const [edit, setEdit] = useState<Partial<ContentPost> | null>(null)
  const blank = (title = ''): Partial<ContentPost> => ({ title, platform: 'Instagram', format: 'Reel / Short', date: '', status: 'idee', notes: '' })
  const today = todayISO()
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const postedWeek = content.filter((c) => c.status === 'gepostet' && c.date >= weekAgo && c.date <= today).length
  const cols: ContentStatus[] = ['idee', 'geplant', 'produziert', 'gepostet']

  return (
    <div>
      <PageHeader
        title="Promo & EPK"
        subtitle="Content-Planung für Social Media und euer Electronic Press Kit. Ziel für den Start: 2–3 Posts pro Woche – Kontinuität schlägt Perfektion."
        actions={
          tab === 'content' && (
            <Button variant="primary" onClick={() => setEdit(blank())}>
              <Plus size={16} /> Content
            </Button>
          )
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'content', label: 'Content-Plan' },
          { value: 'epk', label: 'EPK-Checkliste' },
        ]}
      />
      {tab === 'content' ? (
        <div>
          <Card className="mb-4 flex flex-wrap items-center gap-4 p-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted">Diese Woche gepostet</div>
              <div className={postedWeek >= 2 ? 'text-2xl font-bold text-green-500' : 'text-2xl font-bold'}>{postedWeek} / 2–3</div>
            </div>
            <div className="text-xs text-muted">Tipp: Bei jeder Probe 2–3 kurze Clips filmen – das ist Material für die ganze Woche.</div>
          </Card>
          <div className="grid gap-3 md:grid-cols-4">
            {cols.map((st) => {
              const list = content.filter((c) => c.status === st).sort((a, b) => (st === 'gepostet' ? b.date.localeCompare(a.date) : (a.date || '9').localeCompare(b.date || '9')))
              return (
                <div key={st} className="rounded-lg border border-line bg-panel p-2">
                  <div className="mb-2 flex justify-between px-1 text-xs font-semibold uppercase tracking-wide">
                    {CONTENT_STATUS[st]} <span className="text-muted">{list.length}</span>
                  </div>
                  <div className="space-y-2">
                    {list.slice(0, st === 'gepostet' ? 8 : 50).map((c) => (
                      <div key={c.id} onClick={() => setEdit(c)} className="cursor-pointer rounded-md border border-line bg-panel2 p-2 hover:border-zinc-500">
                        <div className="text-sm">{c.title}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge>{c.platform}</Badge>
                          {c.date && <span className="text-[11px] text-muted">{fmtDateShort(c.date)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          {!content.length && (
            <div className="mt-4">
              <Empty title="Noch kein Content geplant">Startet mit einer der Ideen unten.</Empty>
            </div>
          )}
          <Card className="mt-6">
            <div className="mb-2 font-semibold">Content-Ideen für Bands ohne Release</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {IDEAS.map((i) => (
                <div key={i.t} className="flex items-start gap-2 rounded-md bg-panel2 p-2">
                  <div className="flex-1">
                    <div className="text-sm">{i.t}</div>
                    <div className="text-xs text-muted">{i.why}</div>
                  </div>
                  <Button size="sm" onClick={() => store.put('content', blank(i.t))}>
                    <Plus size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <ChecklistView group="epk" />
      )}
      {edit && <ContentModal key={edit.id ?? 'new'} post={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

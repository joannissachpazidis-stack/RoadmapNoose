import { Copy, Download, LogOut, RefreshCw, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button, Card, Checkbox, Field, Input, PageHeader, Select } from '../components/ui'
import { timeAgo } from '../lib/format'
import { seedInitialData } from '../lib/roadmap'
import { store } from '../lib/store'
import { sync, usesBuiltinConfig, useSync } from '../lib/sync'

function Msg({ text, error }: { text: string; error?: boolean }) {
  if (!text) return null
  return <p className={error ? 'mt-2 text-sm text-red-400' : 'mt-2 text-sm text-green-400'}>{text}</p>
}

function SupabaseSetup() {
  const cfg = sync.getConfig()
  const [url, setUrl] = useState(cfg?.url ?? '')
  const [key, setKey] = useState(cfg?.anonKey ?? '')
  const [custom, setCustom] = useState(false)
  if (usesBuiltinConfig() && !custom)
    return (
      <Card>
        <div className="mb-1 font-semibold">1. Datenbank</div>
        <p className="text-sm text-muted">
          ✓ Die App ist fest mit eurer Band-Datenbank verbunden. Einfach unten registrieren bzw. einloggen.{' '}
          <button className="underline" onClick={() => setCustom(true)}>
            Andere Datenbank verwenden
          </button>
        </p>
      </Card>
    )
  return (
    <Card>
      <div className="mb-1 font-semibold">1. Supabase verbinden</div>
      <p className="mb-3 text-sm text-muted">
        Damit alle Bandmitglieder denselben Stand sehen, nutzt die App ein kostenloses Supabase-Projekt. Einmalig von einer Person einzurichten – die Anleitung steht in der README (Abschnitt "Cloud-Sync einrichten"). Danach geben alle hier dieselben zwei Werte ein.
      </p>
      <div className="space-y-3">
        <Field label="Project URL" hint="Supabase → Project Settings → API → Project URL">
          <Input value={url} onChange={(e) => setUrl(e.target.value.trim())} placeholder="https://abcdefgh.supabase.co" />
        </Field>
        <Field label="anon public key" hint="Supabase → Project Settings → API → Project API keys → anon / publishable (der öffentliche Schlüssel, nicht service_role!)">
          <Input value={key} onChange={(e) => setKey(e.target.value.trim())} placeholder="eyJhbGciOi… oder sb_publishable_…" />
        </Field>
        <div className="flex gap-2">
          <Button variant="primary" disabled={!url.startsWith('https://') || key.length < 20} onClick={() => sync.configure({ url, anonKey: key })}>
            Speichern & verbinden
          </Button>
          {cfg && (
            <Button variant="ghost" onClick={() => window.confirm('Verbindung zu Supabase trennen? Lokale Daten bleiben erhalten.') && sync.configure(null)}>
              Verbindung trennen
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

function Auth() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [msg, setMsg] = useState({ text: '', error: false })
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true)
    setMsg({ text: '', error: false })
    try {
      await fn()
      if (ok) setMsg({ text: ok, error: false })
    } catch (e) {
      setMsg({ text: (e as Error).message, error: true })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card>
      <div className="mb-3 font-semibold">2. {mode === 'login' ? 'Einloggen' : 'Account erstellen'}</div>
      <div className="space-y-3">
        <Field label="E-Mail">
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Passwort" hint={mode === 'signup' ? 'Mindestens 6 Zeichen' : undefined}>
          <Input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={pw} onChange={(e) => setPw(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          {mode === 'login' ? (
            <Button variant="primary" disabled={busy || !email || !pw} onClick={() => run(() => sync.signIn(email, pw))}>
              Einloggen
            </Button>
          ) : (
            <Button
              variant="primary"
              disabled={busy || !email || pw.length < 6}
              onClick={() =>
                run(async () => {
                  const needsConfirm = await sync.signUp(email, pw)
                  if (needsConfirm) setMsg({ text: 'Fast geschafft: Bitte bestätige deine E-Mail-Adresse über den Link in der Mail und logge dich dann hier ein.', error: false })
                })
              }
            >
              Registrieren
            </Button>
          )}
          <Button variant="ghost" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Noch kein Account? Registrieren' : 'Schon registriert? Einloggen'}
          </Button>
          {mode === 'login' && (
            <Button variant="ghost" disabled={!email} onClick={() => run(() => sync.resetPassword(email), 'Mail zum Zurücksetzen wurde verschickt.')}>
              Passwort vergessen
            </Button>
          )}
        </div>
        <Msg {...msg} />
      </div>
    </Card>
  )
}

function BandSetup() {
  const s = useSync()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [takeLocal, setTakeLocal] = useState(true)
  const [msg, setMsg] = useState({ text: '', error: false })
  const localHasData = store.hasData('local')
  const run = async (fn: () => Promise<unknown>) => {
    setMsg({ text: '', error: false })
    try {
      await fn()
    } catch (e) {
      setMsg({ text: (e as Error).message, error: true })
    }
  }
  return (
    <Card>
      <div className="mb-3 font-semibold">3. Band anlegen oder beitreten</div>
      {!s.displayName && <p className="mb-3 text-sm text-yellow-500">Trag oben zuerst deinen Namen ein – so sehen die anderen, wer was geändert hat.</p>}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="text-sm text-muted">Neue Band anlegen (macht eine Person):</div>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bandname" />
          {localHasData && <Checkbox checked={takeLocal} onChange={setTakeLocal} label="Meine bisherigen lokalen Daten übernehmen" />}
          <Button
            variant="primary"
            disabled={!name.trim() || !s.displayName}
            onClick={() =>
              run(async () => {
                await sync.createBand(name.trim(), takeLocal && localHasData)
                if (!(takeLocal && localHasData)) store.mute(() => seedInitialData(name.trim()))
                else store.put('settings', { id: 'settings', bandName: name.trim() })
              })
            }
          >
            Band anlegen
          </Button>
        </div>
        <div className="space-y-3">
          <div className="text-sm text-muted">Mit Einladungscode beitreten (alle anderen):</div>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="z.B. 3F9A2C1B" />
          <Button disabled={code.length < 6 || !s.displayName} onClick={() => run(() => sync.joinBand(code))}>
            Beitreten
          </Button>
        </div>
      </div>
      <Msg {...msg} />
    </Card>
  )
}

function BandInfo() {
  const s = useSync()
  const [copied, setCopied] = useState(false)
  const b = s.activeBand!
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted">Verbunden mit</div>
          <div className="font-display text-2xl text-white">{b.name}</div>
          <div className="mt-1 text-xs text-muted">
            Status: {s.status}
            {s.lastSync ? ` · zuletzt synchronisiert ${timeAgo(s.lastSync)}` : ''}
            {s.pending ? ` · ${s.pending} Änderungen ausstehend` : ''}
          </div>
          {s.error && s.status === 'error' && <div className="mt-1 text-xs text-red-400">{s.error}</div>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => sync.resync()}>
            <RefreshCw size={14} /> Jetzt synchronisieren
          </Button>
          <Button size="sm" variant="ghost" onClick={() => sync.signOut()}>
            <LogOut size={14} /> Abmelden
          </Button>
        </div>
      </div>
      <div className="mt-4 rounded-md border border-line bg-panel2 p-3">
        <div className="text-xs text-muted">Einladungscode für deine Bandmitglieder:</div>
        <div className="mt-1 flex items-center gap-3">
          <span className="font-mono text-2xl tracking-widest text-accent">{b.invite_code}</span>
          <Button
            size="sm"
            onClick={() => {
              void navigator.clipboard?.writeText(`Tritt unserer Band-Roadmap bei: ${window.location.href.split('#')[0]} – Code: ${b.invite_code}`)
              setCopied(true)
            }}
          >
            <Copy size={14} /> {copied ? 'Kopiert!' : 'Einladung kopieren'}
          </Button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">Jedes Mitglied: App öffnen → hier Supabase-Werte eintragen → registrieren → mit diesem Code beitreten.</p>
      </div>
      {s.members.length > 0 && (
        <div className="mt-3 text-sm">
          <span className="text-muted">Accounts in der Band: </span>
          {s.members.map((m) => m.display_name || '(ohne Namen)').join(', ')}
        </div>
      )}
      {s.bands.length > 1 && (
        <div className="mt-3 max-w-xs">
          <Field label="Band wechseln">
            <Select value={b.id} onChange={(e) => sync.activate(s.bands.find((x) => x.id === e.target.value)!)} options={s.bands.map((x) => ({ value: x.id, label: x.name }))} />
          </Field>
        </div>
      )}
    </Card>
  )
}

function DataTools() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [msg, setMsg] = useState({ text: '', error: false })
  const exportData = () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `band-roadmap-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  return (
    <Card>
      <div className="mb-1 font-semibold">Daten sichern & übertragen</div>
      <p className="mb-3 text-sm text-muted">Backup als Datei – auch ohne Cloud-Sync nützlich, z.B. um Daten auf ein anderes Gerät zu bringen.</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={exportData}>
          <Download size={16} /> Export (JSON)
        </Button>
        <Select className="w-auto" value={mode} onChange={(e) => setMode(e.target.value as 'merge' | 'replace')} options={[{ value: 'merge', label: 'Import: zusammenführen' }, { value: 'replace', label: 'Import: alles ersetzen' }]} />
        <Button onClick={() => fileRef.current?.click()}>
          <Upload size={16} /> Import
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            if (mode === 'replace' && !window.confirm('Wirklich ALLE aktuellen Daten durch die Datei ersetzen?')) return
            try {
              store.importJSON(await f.text(), mode)
              setMsg({ text: 'Import erfolgreich.', error: false })
            } catch (err) {
              setMsg({ text: (err as Error).message, error: true })
            }
          }}
        />
      </div>
      <Msg {...msg} />
    </Card>
  )
}

export default function Settings() {
  const s = useSync()
  const [name, setName] = useState(s.displayName)
  return (
    <div>
      <PageHeader title="Sync & Einstellungen" subtitle="Cloud-Sync für die ganze Band, dein Name und Datensicherung." />
      <div className="space-y-4">
        <Card>
          <div className="mb-3 font-semibold">Dein Name</div>
          <div className="flex gap-2">
            <Input list="member-names" value={name} onChange={(e) => setName(e.target.value)} placeholder="Wie sollen dich die anderen sehen?" />
            <datalist id="member-names">
              {store.list('members').map((m) => (
                <option key={m.id} value={m.name} />
              ))}
            </datalist>
            <Button variant="primary" disabled={!name.trim() || name === s.displayName} onClick={() => sync.setDisplayName(name.trim())}>
              Speichern
            </Button>
          </div>
        </Card>

        {s.activeBand ? (
          <BandInfo />
        ) : (
          <>
            <SupabaseSetup />
            {s.configured && !s.session && <Auth />}
            {s.configured && s.session && (
              <>
                <Card className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm">
                    Eingeloggt als <span className="font-semibold">{s.session.user.email}</span>
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => sync.signOut()}>
                    <LogOut size={14} /> Abmelden
                  </Button>
                </Card>
                {s.status === 'error' && <p className="text-sm text-red-400">{s.error}</p>}
                <BandSetup />
              </>
            )}
            {!s.configured && <p className="text-sm text-muted">Ohne Supabase funktioniert die App komplett lokal in diesem Browser. Die Daten bleiben auf diesem Gerät.</p>}
          </>
        )}

        <DataTools />
      </div>
    </div>
  )
}

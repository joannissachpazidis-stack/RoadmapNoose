// =====================================================================
// Band-Coach – Supabase Edge Function
// Liest den aktuellen Stand der Band (nur für eingeloggte Bandmitglieder, per RLS),
// fragt Claude nach einer kurzen Reaktion mit Fragen & Vorschlägen und speichert die
// Antwort als Coach-Nachricht – sie erscheint per Realtime sofort bei allen in der App.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY   (Pflicht)  API-Key von platform.claude.com
//   COACH_MODEL         (optional) Standard: claude-opus-5-5 – günstiger z.B. claude-haiku-5-5
//   COACH_EFFORT        (optional) low | medium | high – Standard: medium
//   COACH_MAX_PER_HOUR  (optional) Kostenbremse: max. Coach-Antworten pro Band und Stunde (Standard 20)
// =====================================================================
import Anthropic from 'npm:@anthropic-ai/sdk@^1.10.0'
import { betaJSONSchemaOutputFormat } from 'npm:@anthropic-ai/sdk@^1.10.0/helpers/beta/json-schema'
import { createClient } from 'npm:@supabase/supabase-js@^2.119.1'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

type Data = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
interface Row {
  id: string
  collection: string
  data: Data
  updated_at: number
  deleted: boolean
}

const AREAS = ['fundament', 'songwriting', 'live', 'release', 'promo', 'merch', 'business', 'finanzen'] as const

const STAGES: Record<string, string> = {
  idee: 'Idee/Riff',
  skizze: 'Skizze',
  arrangement: 'Instrumental steht',
  demo: 'Pre-Prod mit Vocals',
  probereif: 'Live-ready',
  liveerprobt: 'Live erprobt',
  aufnahme: 'Recording',
  mix: 'Mix/Master',
  veroeffentlicht: 'Veröffentlicht',
  archiv: 'Archiv',
}
const PARTS: Record<string, string> = {
  riffs: 'Riffs',
  structure: 'Struktur',
  drums: 'Drums',
  guitars: 'Gitarren',
  bass: 'Bass',
  leads: 'Leads',
  electronics: 'Electronics',
  breakdown: 'Breakdowns',
  lyrics: 'Lyrics',
  screams: 'Screams',
  cleans: 'Cleans/Hook',
  rap: 'Rap',
  transitions: 'Übergänge',
  demo: 'Pre-Prod-Demo',
}

const SYSTEM = `Du bist der Band-Coach in der Roadmap-App einer Band. Du bist ein erfahrener Mentor aus der Musikszene (Metal/Metalcore, DIY- und Newcomer-Bands in Deutschland) und hilfst der Band, voranzukommen und nichts aus den Augen zu verlieren. Du reagierst auf das, was die Band in der App einträgt und abhakt, und auf ihre Nachrichten.

So arbeitest du:
- Du bekommst den aktuellen Stand der App als Snapshot und den bisherigen Verlauf. Nachrichten mit "[App-Ereignisse]" zeigen, was sich seit deiner letzten Reaktion geändert hat und wer es eingetragen hat.
- Antworte auf Deutsch, per Du (an die Band oder namentlich an einzelne Mitglieder), locker aber professionell und kurz: meistens 2–6 Sätze. Keine Floskeln, kein Marketing-Sprech, nicht übertrieben euphorisch.
- Erkenne Fortschritte konkret an (ein Satz reicht). Dann das Wichtigste: Was folgt daraus, worauf sollten sie achten, was ist der nächste sinnvolle Schritt?
- Stelle höchstens 2 Fragen, und nur wenn die Antwort wirklich weiterhilft (z.B. fehlende Infos für eine Entscheidung oder um die Roadmap zu schärfen). Gib zu jeder Frage 2–4 kurze Antwortoptionen, wenn es sich anbietet; sonst eine leere Liste.
- Mach höchstens 3 Vorschläge, und nur wenn sie durchdacht, realistisch und für den aktuellen Stand sinnvoll sind und noch nicht in der Roadmap stehen. Lieber keine als schwache Vorschläge. "task" = Schritt zu einem bestehenden Ziel (goalId aus dem Snapshot angeben, phaseId leer); "goal" = neues Ziel (passende phaseId aus dem Snapshot, goalId leer). Gib jedem Vorschlag einen passenden Bereich (area).
- Wiederhole dich nicht. Lies den Verlauf, frag nichts, was schon beantwortet wurde, und greif Antworten der Band auf.
- Bei unbedeutenden Ereignissen (Kleinigkeiten, Korrekturen) antworte sehr kurz – ohne Fragen und Vorschläge.
- Achte auf Muster: Engpässe in der Song-Pipeline (z.B. fehlende Vocals), überfällige oder liegengebliebene Ziele, zu viele Fokus-Ziele (mehr als 3), anstehende Termine und Fristen, Abhängigkeiten zwischen Zielen, ungleich verteilte Aufgaben.
- Erfinde keine Fakten wie Fristen, Preise, Kontaktdaten oder Namen von Veranstaltern. Wenn etwas zu prüfen ist, sag das. Rechtliche und steuerliche Hinweise nur als Orientierung.
- Du kannst die App nicht selbst ändern: Die Band übernimmt Vorschläge per Klick und beantwortet Fragen per Knopfdruck oder Text. Verweise bei Bedarf auf die Bereiche der App: Übersicht, Roadmap, Songwriting, Releases, Live & Gigs, Kalender, Promo & EPK, Merch, Bandkasse, Band & Orga, Kontakte.

App-Wissen:
- Song-Stadien: Idee/Riff → Skizze → Instrumental steht → Pre-Prod mit Vocals → Live-ready → Live erprobt → Recording → Mix/Master → Veröffentlicht (Archiv = auf Eis gelegt). Pro Song gibt es Bausteine (Riffs, Struktur, Drums, Gitarren, Bass, Leads, Electronics, Breakdowns, Lyrics, Screams, Cleans/Hook, Rap, Übergänge, Pre-Prod-Demo), einzelne können "nicht nötig" sein.
- Die Roadmap hat Phasen mit Zielen (Status: Offen, In Arbeit, Erledigt, Pausiert), Schritte pro Ziel, Fokus-Ziele und einen monatlichen Roadmap-Check.
- Releases haben einen rückwärts vom Release-Tag gerechneten Zeitplan. Gigs haben Setlists und Learnings. Der Kalender kennt wiederkehrende Termine.

Das Feld "message" ist einfacher Text: kurze Absätze, Aufzählungen mit "- " sind ok, keine Überschriften, kein Markdown-Fett.`

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['message', 'questions', 'suggestions'],
  properties: {
    message: { type: 'string', description: 'Die Antwort des Coaches an die Band' },
    questions: {
      type: 'array',
      description: 'Höchstens 2 Rückfragen',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'options'],
        properties: {
          text: { type: 'string' },
          options: { type: 'array', items: { type: 'string' }, description: '0–4 kurze Antwortoptionen' },
        },
      },
    },
    suggestions: {
      type: 'array',
      description: 'Höchstens 3 durchdachte Vorschläge',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'title', 'detail', 'why', 'area', 'phaseId', 'goalId'],
        properties: {
          kind: { type: 'string', enum: ['goal', 'task'] },
          title: { type: 'string' },
          detail: { type: 'string' },
          why: { type: 'string' },
          area: { type: 'string', enum: [...AREAS] },
          phaseId: { type: 'string' },
          goalId: { type: 'string' },
        },
      },
    },
  },
} as const

const cut = (s: unknown, n: number) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

/** Kompakter Text-Snapshot der Band-Daten (ohne Lyrics, um Tokens und Privates zu sparen) */
function buildSnapshot(rows: Row[], today: string): string {
  const by: Record<string, Row[]> = {}
  for (const r of rows) if (!r.deleted) (by[r.collection] ??= []).push(r)
  const list = (c: string): Data[] => (by[c] ?? []).map((r) => ({ ...r.data, id: r.id }))
  const settings = list('settings')[0] ?? {}
  const members = list('members')
  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? '?'
  const L: string[] = []
  L.push(`Heute: ${today}`)
  L.push(`Band: ${settings.bandName || '(Name noch nicht eingetragen)'} · Genre: ${settings.genre || '–'} · Region: ${settings.hometown || '–'}`)
  L.push('', '## Mitglieder')
  for (const m of members) L.push(`- ${m.name}: ${m.roles || '–'}${m.responsibilities ? ` · zuständig für ${m.responsibilities}` : ''}`)

  const goals = list('goals')
  L.push('', '## Roadmap')
  for (const p of list('phases').sort((a, b) => a.order - b.order)) {
    const pg = goals.filter((g) => g.phaseId === p.id)
    L.push(`### Phase ${p.order}: ${p.title} (phaseId: ${p.id}, ${p.horizon || ''}) – ${pg.filter((g) => g.status === 'erledigt').length}/${pg.length} erledigt`)
    for (const g of pg) {
      const tasks = g.tasks ?? []
      const open = tasks.filter((t: Data) => !t.done).slice(0, 4).map((t: Data) => cut(t.text, 80))
      L.push(
        `- [${g.status}]${g.focus ? ' ★FOKUS' : ''} ${cut(g.title, 100)} (goalId: ${g.id}, Bereich: ${g.area}${g.due ? `, fällig ${g.due}` : ''}${g.ownerIds?.length ? `, verantwortlich: ${g.ownerIds.map(memberName).join(', ')}` : ''}) – Schritte ${tasks.filter((t: Data) => t.done).length}/${tasks.length}${open.length ? `; offen: ${open.join(' | ')}` : ''}`,
      )
    }
  }

  const songs = list('songs')
  L.push('', `## Songs (${songs.filter((s) => s.stage !== 'archiv').length} aktiv)`)
  for (const s of songs) {
    const parts = s.parts ?? {}
    const done = Object.keys(PARTS).filter((k) => parts[k] === true).map((k) => PARTS[k])
    const na = Object.keys(PARTS).filter((k) => parts[k] === 'na').map((k) => PARTS[k])
    const openParts = Object.keys(PARTS).filter((k) => parts[k] !== true && parts[k] !== 'na').map((k) => PARTS[k])
    const meta = [s.tuning, s.bpm ? `${s.bpm} BPM` : '', s.durationSec ? `${Math.floor(s.durationSec / 60)}:${String(s.durationSec % 60).padStart(2, '0')}` : '', s.click ? 'Click ✓' : ''].filter(Boolean).join(', ')
    L.push(
      `- ${cut(s.title, 60)} – ${STAGES[s.stage] ?? s.stage}${meta ? ` (${meta})` : ''}; fertig: ${done.join(', ') || '–'}; offen: ${openParts.join(', ') || '–'}${na.length ? `; nicht nötig: ${na.join(', ')}` : ''}${s.lyricsTheme ? `; Thema: ${cut(s.lyricsTheme, 80)}` : ''}${s.lyrics ? '; Lyrics vorhanden' : ''}${s.notes ? `; Notizen: ${cut(s.notes, 160)}` : ''}`,
    )
  }

  const releases = list('releases')
  if (releases.length) {
    L.push('', '## Releases')
    for (const r of releases) {
      const tasks = r.tasks ?? []
      const next = tasks
        .filter((t: Data) => !t.done)
        .sort((a: Data, b: Data) => a.offsetDays - b.offsetDays)
        .slice(0, 3)
        .map((t: Data) => `${cut(t.text, 70)} (${t.offsetDays >= 0 ? '+' : ''}${t.offsetDays} T.)`)
      L.push(`- ${r.title} (${r.type}, ${r.status}${r.releaseDate ? `, Release ${r.releaseDate}` : ', ohne Datum'}, ${r.songIds?.length ?? 0} Songs) – Zeitplan ${tasks.filter((t: Data) => t.done).length}/${tasks.length}; nächste: ${next.join(' | ') || '–'}`)
    }
  }

  const gigs = list('gigs').sort((a, b) => String(a.date).localeCompare(String(b.date)))
  if (gigs.length) {
    L.push('', '## Gigs')
    for (const g of gigs.slice(-8)) L.push(`- ${g.date || 'ohne Datum'} ${g.venue}${g.city ? ', ' + g.city : ''} [${g.status}]${g.setlist?.length ? `, ${g.setlist.length} Songs` : ''}${g.learnings ? `; Learnings: ${cut(g.learnings, 160)}` : ''}`)
  }

  const events = list('events')
  if (events.length) {
    L.push('', '## Termine')
    for (const e of events.filter((e) => (e.repeat && e.repeat !== 'none') || e.date >= today).slice(0, 12))
      L.push(`- ${e.date}${e.time ? ' ' + e.time : ''} ${e.title} (${e.type}${e.repeat && e.repeat !== 'none' ? `, wiederkehrend: ${e.repeat}` : ''})`)
  }

  const contacts = list('contacts')
  if (contacts.length) {
    L.push('', '## Kontakte')
    const types: Record<string, string[]> = {}
    for (const c of contacts) (types[c.type] ??= []).push(c.name + (c.nextStep ? ` (nächster Schritt: ${cut(c.nextStep, 60)})` : ''))
    for (const [t, names] of Object.entries(types)) L.push(`- ${t}: ${names.slice(0, 10).join('; ')}`)
  }

  const checklist = list('checklist')
  if (checklist.length) {
    L.push('', '## Checklisten')
    for (const group of [...new Set(checklist.map((c) => c.group))]) {
      const items = checklist.filter((c) => c.group === group)
      const open = items.filter((c) => !c.done).slice(0, 5).map((c) => cut(c.title, 60))
      L.push(`- ${group}: ${items.filter((c) => c.done).length}/${items.length} erledigt${open.length ? `; offen u.a.: ${open.join(' | ')}` : ''}`)
    }
  }

  const tx = list('transactions')
  const balance = tx.reduce((a, t) => a + Number(t.amount || 0), 0)
  L.push('', `## Bandkasse: ${balance.toFixed(2)} €${settings.monthlyFee ? ` · Beitrag ${settings.monthlyFee} €/Person/Monat` : ' · kein Monatsbeitrag festgelegt'}`)
  const content = list('content')
  if (content.length) L.push(`## Content: ${content.filter((c) => c.status === 'gepostet').length} gepostet, ${content.filter((c) => c.status !== 'gepostet').length} geplant/Ideen`)
  const merch = list('merch')
  if (merch.length) L.push(`## Merch: ${merch.map((m) => m.name).join(', ')}`)
  return L.join('\n')
}

const TRIGGER_TEXT: Record<string, string> = {
  events: 'Reagiere auf die neuen App-Ereignisse.',
  message: 'Antworte auf die letzte Nachricht der Band.',
  checkin: 'Die Band bittet um eine kurze Gesamteinschätzung: Wo steht ihr gerade, was läuft gut, was hängt, und was ist in den nächsten 2–4 Wochen am wichtigsten?',
}

// Modelle, die serverseitige Fallbacks bei Ablehnungen unterstützen
const FALLBACK_MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-opus-5', 'claude-fable-5-2', 'claude-fable-5-1']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Nur POST' }, 405)
  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY ist in Supabase noch nicht als Secret hinterlegt.' }, 500)
    const { bandId, trigger = 'events' } = (await req.json()) as { bandId?: string; trigger?: string }
    if (!bandId) return json({ error: 'bandId fehlt' }, 400)

    // Supabase-Client mit dem Login der aufrufenden Person -> RLS: nur eigene Band lesbar
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: band } = await supabase.from('bands').select('id,name').eq('id', bandId).maybeSingle()
    if (!band) return json({ error: 'Keine Berechtigung für diese Band' }, 403)

    const rows: Row[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('records').select('id,collection,data,updated_at,deleted').eq('band_id', bandId).eq('deleted', false).range(from, from + 999)
      if (error) throw new Error('Daten konnten nicht gelesen werden: ' + error.message)
      rows.push(...((data ?? []) as Row[]))
      if (!data || data.length < 1000) break
    }

    const thread = rows
      .filter((r) => r.collection === 'coach')
      .map((r) => r.data)
      .sort((a, b) => Number(a.at) - Number(b.at))

    // Kostenbremse
    const maxPerHour = Number(Deno.env.get('COACH_MAX_PER_HOUR') ?? 20)
    const lastHour = thread.filter((m) => m.role === 'coach' && Number(m.at) > Date.now() - 3600_000).length
    if (lastHour >= maxPerHour) return json({ error: `Limit erreicht: maximal ${maxPerHour} Coach-Antworten pro Stunde.` }, 429)

    // Verlauf -> Messages (nur Text, ohne Thinking-Blöcke)
    const messages: Anthropic.Beta.BetaMessageParam[] = []
    for (const m of thread.slice(-40)) {
      if (m.role === 'coach') {
        let text = cut(m.text, 3000)
        if (m.questions?.length) text += '\n\nMeine Fragen: ' + m.questions.map((x: Data) => x.text).join(' / ')
        if (m.suggestions?.length) text += '\n\nMeine Vorschläge: ' + m.suggestions.map((x: Data) => `${x.title}${x.appliedAt ? ' (übernommen)' : ''}`).join(' / ')
        messages.push({ role: 'assistant', content: text })
      } else if (m.role === 'event') {
        messages.push({ role: 'user', content: `[App-Ereignisse, eingetragen von ${m.author}]\n${cut(m.text, 4000)}` })
      } else {
        messages.push({ role: 'user', content: `${m.author}: ${cut(m.text, 3000)}` })
      }
    }
    while (messages.length && messages[0].role === 'assistant') messages.shift()
    const today = new Date().toISOString().slice(0, 10)
    messages.push({
      role: 'user',
      content: `[Aktueller Stand der App]\n${buildSnapshot(rows.filter((r) => r.collection !== 'coach'), today)}\n\n[Aufgabe]\n${TRIGGER_TEXT[trigger] ?? TRIGGER_TEXT.events}`,
    })

    const model = Deno.env.get('COACH_MODEL') || 'claude-opus-5-5'
    const effort = (Deno.env.get('COACH_EFFORT') || 'medium') as 'low' | 'medium' | 'high'
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.beta.messages.parse({
      model,
      max_tokens: 16000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages,
      output_config: { effort, format: betaJSONSchemaOutputFormat(OUTPUT_SCHEMA) },
      ...(FALLBACK_MODELS.includes(model) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    })

    let message = ''
    let questions: Data[] = []
    let suggestions: Data[] = []
    if (response.stop_reason === 'refusal') {
      message = 'Dazu kann ich gerade nichts sagen. Formuliert es gern anders oder fragt mich etwas anderes zu eurer Roadmap.'
    } else if (response.parsed_output) {
      message = response.parsed_output.message
      questions = response.parsed_output.questions.slice(0, 2).map((x) => ({ id: crypto.randomUUID(), text: x.text, options: x.options.slice(0, 4) }))
      suggestions = response.parsed_output.suggestions.slice(0, 3).map((x) => ({ id: crypto.randomUUID(), ...x }))
    } else {
      message = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim() || 'Ich konnte gerade keine Antwort formulieren – versucht es gleich nochmal.'
    }

    const now = Date.now()
    const { error: insertError } = await supabase.from('records').insert({
      band_id: bandId,
      id: crypto.randomUUID(),
      collection: 'coach',
      data: { role: 'coach', text: message, questions, suggestions, author: 'Coach', at: now, createdAt: now, model: response.model },
      updated_at: now,
      updated_by: 'Coach',
      deleted: false,
    })
    if (insertError) throw new Error('Antwort konnte nicht gespeichert werden: ' + insertError.message)
    return json({ ok: true })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ error: 'Der Anthropic-API-Key ist ungültig.' }, 502)
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'Claude ist gerade ausgelastet (Rate-Limit) – bitte später nochmal.' }, 503)
    if (e instanceof Anthropic.APIError) return json({ error: `Claude-API-Fehler ${e.status}: ${e.message}` }, 502)
    return json({ error: (e as Error).message }, 500)
  }
})

// Roadmap-Wissen: Phasen, Ziel-Vorlagen mit Begründung und Bedingungen,
// sowie die Start-Daten – zugeschnitten auf euer Band-Profil:
// Trio (Gitarre, Bass, Gesang) ohne festen Drummer, Modern Metalcore mit Electronic- und Trap/Rap-Einflüssen,
// Region Stuttgart, eigenes Studio, wöchentliche Songwriting-Session am Mittwoch,
// 5–7 weitgehend fertige Instrumentals, Ziel: 9–10 Songs vor Probenphase & Live.
import type { Area, ChecklistItem, CollectionMap, Contact, Goal, Phase, ReleaseTask, ReleaseType } from '../types'
import { hasVocals, stageAtLeast } from './constants'
import { store, uid } from './store'

export const PHASES: (Omit<Phase, 'id'> & { id: string })[] = [
  {
    id: 'phase-fundament',
    order: 1,
    title: 'Fundament',
    horizon: 'jetzt – 3 Monate',
    description: 'Regeln, Rollen, Name, Identität – und die Besetzungsfrage (Drums). Läuft parallel zum Songwriting, damit später nichts an Organisation oder Streit scheitert.',
  },
  {
    id: 'phase-songs',
    order: 2,
    title: 'Songwriting & Pre-Production',
    horizon: 'jetzt – ca. 6 Monate',
    description: 'Von 5–7 Instrumentals zu 9–10 kompletten Songs mit Vocals als Pre-Production-Demo. Die Mittwochs-Sessions im Studio sind euer Motor.',
  },
  {
    id: 'phase-release',
    order: 3,
    title: 'Debüt-Singles',
    horizon: 'ca. 3–9 Monate (parallel)',
    description: 'Empfehlung: Die stärksten Songs schon während des Songwritings als Singles veröffentlichen. So habt ihr vor den ersten Gigs Musik draußen, ein erstes Publikum – und etwas, das Veranstalter und potenzielle Drummer:innen anhören können.',
  },
  {
    id: 'phase-buehne',
    order: 4,
    title: 'Live-Set & Bühne',
    horizon: 'ca. 6–12 Monate',
    description: 'Probenphase mit Live-Setup (Drums, Backing-Tracks, Click), ein 35–45-Minuten-Set und die ersten Shows in der Region Stuttgart.',
  },
  {
    id: 'phase-wachstum',
    order: 5,
    title: 'Reichweite & Wachstum',
    horizon: '12+ Monate',
    description: 'Shows außerhalb der Region, Merch, Festivals, Förderung – und das nächste, größere Release (EP/Album).',
  },
]

const OLD_PHASE_TITLES: Record<string, string> = {
  'phase-fundament': 'Fundament',
  'phase-songs': 'Songs & Live-Set',
  'phase-buehne': 'Bühne & Netzwerk',
  'phase-release': 'Debüt-Release',
  'phase-wachstum': 'Reichweite & Wachstum',
}

export interface Ctx {
  songsTotal: number
  songsAtLeast: (stage: Parameters<typeof stageAtLeast>[1]) => number
  songsWithClick: number
  songsWithMeta: number
  songsWithVocals: number
  gigsPlayed: number
  gigsUpcoming: number
  citiesPlayed: number
  releasesPlanned: number
  releasesWithDate: number
  releasesReleased: number
  contactsOfType: (t: string) => number
  merchItems: number
  members: number
  goalStatus: (templateId: string) => Goal['status'] | null
}

export function buildCtx(): Ctx {
  const songs = store.list('songs')
  const gigs = store.list('gigs')
  const releases = store.list('releases')
  const contacts = store.list('contacts')
  const goals = store.list('goals')
  const today = new Date().toISOString().slice(0, 10)
  const played = gigs.filter((g) => g.status === 'gespielt')
  const active = songs.filter((s) => s.stage !== 'archiv')
  return {
    songsTotal: active.length,
    songsAtLeast: (stage) => active.filter((s) => stageAtLeast(s.stage, stage)).length,
    songsWithClick: active.filter((s) => s.click && stageAtLeast(s.stage, 'arrangement')).length,
    songsWithMeta: active.filter((s) => s.bpm && s.tuning && s.durationSec).length,
    songsWithVocals: active.filter((s) => stageAtLeast(s.stage, 'demo') || hasVocals(s.parts)).length,
    gigsPlayed: played.length,
    gigsUpcoming: gigs.filter((g) => (g.status === 'bestaetigt' || g.status === 'angefragt') && g.date >= today).length,
    citiesPlayed: new Set(played.map((g) => g.city.trim().toLowerCase()).filter(Boolean)).size,
    releasesPlanned: releases.filter((r) => r.status !== 'veroeffentlicht').length,
    releasesWithDate: releases.filter((r) => r.status !== 'veroeffentlicht' && r.releaseDate).length,
    releasesReleased: releases.filter((r) => r.status === 'veroeffentlicht').length,
    contactsOfType: (t) => contacts.filter((c) => c.type === t).length,
    merchItems: store.list('merch').length,
    members: store.list('members').length,
    goalStatus: (tid) => goals.find((g) => g.templateId === tid)?.status ?? null,
  }
}

export interface GoalTemplate {
  id: string
  phaseId: string
  area: Area
  title: string
  description: string
  why: string
  tasks: string[]
  /** Wann ist das Ziel sinnvoll? */
  when: (c: Ctx) => boolean
  /** Warum gerade jetzt? (kontextbezogener Hinweis) */
  trigger?: (c: Ctx) => string
  /** messbarer Fortschritt */
  metric?: (c: Ctx) => { value: number; target: number; label: string }
  priority: number // kleiner = wichtiger
  seed?: boolean
  focus?: boolean
}

const done = (c: Ctx, id: string) => c.goalStatus(id) === 'erledigt'
const started = (c: Ctx, id: string) => {
  const s = c.goalStatus(id)
  return s === 'aktiv' || s === 'erledigt'
}

export const TEMPLATES: GoalTemplate[] = [
  // ---------------- Fundament ----------------
  {
    id: 'besetzung-drums',
    phaseId: 'phase-fundament',
    area: 'fundament',
    title: 'Feste:n Drummer:in finden',
    description: 'Eine Person, die musikalisch und menschlich passt – und Lust auf euren Weg (Singles, Live, Region Stuttgart und darüber hinaus) hat.',
    why: 'Ihr habt euch für eine feste Besetzung entschieden – gut so: Live wirkt eine komplette Band deutlich stärker, und Veranstalter, Contests und Publikum erwarten sie. Die Suche dauert erfahrungsgemäß Monate, deshalb parallel zum Songwriting starten. Je konkreter euer Angebot (Demos, Genre, Ziele, Proben im eigenen Studio), desto passender die Bewerbungen. Bei Modern Metalcore mit Electronics ist Click-Sicherheit Pflicht – das sollte das Probespiel zeigen. Und: Erst eine Probezeit vereinbaren, dann in den Bandvertrag aufnehmen.',
    tasks: [
      'Profil festlegen: Stil (Modern Metalcore, Blasts/Grooves/Breakdowns), Click/In-Ear-Erfahrung, Verfügbarkeit (Mittwochs + Proben), Ziele',
      'Probespiel-Paket: 2–3 Songs als Demo, Versionen ohne Drums, Click-Tracks, Drum-MIDI/Noten',
      'Suchaufruf als Kurzvideo/Post mit Demo-Snippet (Instagram, TikTok, Facebook-Musikergruppen)',
      'Musikerbörsen, Aushänge in Proberäumen/Musikgeschäften, Musikschulen in der Region',
      'In der Stuttgarter Core-Szene herumfragen (Shows im Club Zentral, JuHa West, andere Bands)',
      'Kandidat:innen im Bereich "Kontakte" als "Drummer-Kandidat:in" erfassen',
      'Probespiele im Studio (inkl. gemeinsames Gespräch über Ziele & Zeitaufwand)',
      'Probezeit vereinbaren, danach in den Bandvertrag aufnehmen',
    ],
    when: () => true,
    metric: (c) => ({ value: c.contactsOfType('kandidat'), target: 5, label: 'Kandidat:innen kontaktiert' }),
    priority: 1,
    seed: true,
    focus: true,
  },
  {
    id: 'bandvertrag',
    phaseId: 'phase-fundament',
    area: 'business',
    title: 'Band-Vereinbarung (GbR) schriftlich festhalten',
    description: 'Die wichtigsten Regeln eurer Zusammenarbeit auf 1–2 Seiten festhalten und von allen unterschreiben lassen.',
    why: 'Sobald ihr gemeinsam z.B. Equipment anschafft, eine Bandkasse führt oder Gigs spielt, seid ihr rechtlich in der Regel eine GbR. Ohne Vertrag gelten die gesetzlichen Regeln (u.a. gleiche Anteile, gemeinsame Haftung). Bei euch besonders wichtig: Das Studio gehört einem Mitglied – haltet fest, was es die Band kostet bzw. wie die Nutzung geregelt ist, und wie ein später dazukommendes Mitglied (z.B. Drums) beteiligt wird. Für komplexere Fälle lohnt ein kurzer Check durch eine Fachanwältin/einen Fachanwalt.',
    tasks: [
      'Verteilung von Einnahmen und Kosten festlegen',
      'Studio-Nutzung regeln (Kosten, Equipment, Zeiten)',
      'Wem gehört welches Equipment? (privat vs. Band)',
      'Regel für Songwriting-Credits / GEMA-Anteile festlegen',
      'Wie werden neue Mitglieder beteiligt? (z.B. Drummer:in)',
      'Rechte an Bandname & Logo bei Ausstieg klären',
      'Wie werden Entscheidungen getroffen?',
      'Von allen unterschreiben lassen',
    ],
    when: () => true,
    priority: 3,
    seed: true,
  },
  {
    id: 'bandkasse',
    phaseId: 'phase-fundament',
    area: 'finanzen',
    title: 'Bandkasse & monatlichen Beitrag einführen',
    description: 'Ein gemeinsames Budget für Mix/Master, Artwork, Videos, Promo und später Merch.',
    why: 'Auch mit eigenem Studio kosten Release-Qualität (externer Mix/Master, Artwork, Fotos, Musikvideo, Werbung) schnell vierstellig. Ein fester Beitrag baut das Budget für die Debüt-Singles auf, ohne dass jemand privat in Vorleistung gehen muss.',
    tasks: ['Monatlichen Beitrag festlegen', 'Konto oder Unterkonto für die Band einrichten', 'Kassenwart:in bestimmen', 'Alle Einnahmen & Ausgaben im Bereich "Bandkasse" erfassen'],
    when: () => true,
    priority: 3,
    seed: true,
  },
  {
    id: 'rollen',
    phaseId: 'phase-fundament',
    area: 'fundament',
    title: 'Aufgaben & Verantwortlichkeiten verteilen',
    description: 'Bei drei Leuten übernimmt jede:r zwei bis drei Bereiche: z.B. Produktion/Studio, Social Media/Content, Booking/Netzwerk, Kasse, Grafik.',
    why: 'In Bands bleibt die Organisation sonst an ein bis zwei Personen hängen – das bremst und frustriert. Feste Zuständigkeiten plus 15 Minuten Orga am Ende der Mittwochs-Session sorgen dafür, dass die Roadmap tatsächlich vorankommt.',
    tasks: ['Bereiche definieren', 'Zuständigkeiten bei den Mitgliedern eintragen', 'Einmal im Monat den Roadmap-Check in der Mittwochs-Session machen'],
    when: () => true,
    priority: 3,
    seed: true,
  },
  {
    id: 'name-check',
    phaseId: 'phase-fundament',
    area: 'business',
    title: 'Bandnamen prüfen & Accounts sichern',
    description: 'Sicherstellen, dass euer Name nicht schon vergeben ist, und überall denselben Handle reservieren.',
    why: 'Gleichnamige Bands führen zu Verwechslungen auf Spotify (falsches Künstlerprofil!), in Suchmaschinen und im schlimmsten Fall zu rechtlichen Problemen. Je früher geprüft, desto billiger ist eine Umbenennung – spätestens vor der ersten Single.',
    tasks: [
      'Encyclopaedia Metallum, Spotify, Bandcamp, YouTube, Instagram, TikTok durchsuchen',
      'Markenregister prüfen (DPMAregister / EUIPO)',
      'Einheitlichen Handle auf Instagram, TikTok, YouTube sichern',
      'Domain und Band-E-Mail-Adresse anlegen',
    ],
    when: () => true,
    priority: 2,
    seed: true,
  },
  {
    id: 'identitaet',
    phaseId: 'phase-fundament',
    area: 'promo',
    title: 'Sound & Identität definieren',
    description: 'In wenigen Sätzen beschreiben können, wer ihr seid, wie ihr klingt und wofür ihr steht.',
    why: 'Modern Metalcore ist ein dichtes Feld – eure Mischung aus Metalcore, Electronic und Trap/Rap ist genau das, was euch unterscheiden kann. Wer das klar benennt (und visuell umsetzt), wird schneller eingeordnet: von Veranstaltern, Playlists, Presse und Fans. Die Identität steuert Logo, Artwork, Fotos, Videos und Bio.',
    tasks: [
      'Euren Genre-Mix in einem Satz beschreiben ("Modern Metalcore trifft …")',
      '3–5 Referenzbands festlegen ("für Fans von …")',
      'Lyrische Themen & Haltung sammeln',
      'Visuelle Ästhetik / Moodboard (Farben, Bildsprache, Typo)',
      'Kurz-Bio (3 Sätze) schreiben',
    ],
    when: () => true,
    priority: 3,
    seed: true,
  },
  {
    id: 'logo',
    phaseId: 'phase-fundament',
    area: 'promo',
    title: 'Logo & visuelle Basis erstellen',
    description: 'Ein Signature-Logo plus eine gut lesbare Variante – in allen nötigen Formaten.',
    why: 'Das Logo ist euer Erkennungszeichen auf Covern, Social Media und später fast immer das erste Merch-Motiv. Im modernen Metalcore sind klare, grafische Logos üblich – wichtig ist, dass es auch klein (Profilbild, Spotify) und auf Plakaten funktioniert.',
    tasks: ['Briefing für Designer:in (Referenzen, Moodboard)', 'Logo + lesbare Variante', 'Vektorformate (SVG/PDF) + PNG transparent', 'Einfarbige Versionen für Merch', 'Profilbild-Version (quadratisch, klein lesbar)'],
    when: (c) => started(c, 'identitaet'),
    trigger: () => 'Eure Identität ist in Arbeit – jetzt kann das Logo darauf aufbauen.',
    priority: 4,
  },
  {
    id: 'equipment',
    phaseId: 'phase-fundament',
    area: 'business',
    title: 'Studio- & Equipment-Inventar und Versicherung prüfen',
    description: 'Liste aller Instrumente und Geräte mit Seriennummer und Wert; Versicherungsschutz klären.',
    why: 'Mit einem eigenen Studio steckt viel Wert an einem Ort. Viele Hausratversicherungen decken gewerblich genutztes oder mitgenommenes Equipment (Gigs!) nicht ab. Eine Liste mit Seriennummern und Fotos hilft bei Diebstahl oder Schaden.',
    tasks: ['Inventarliste mit Seriennummern & Neuwert', 'Fotos von allem', 'Versicherungsschutz prüfen (Hausrat / Instrumentenversicherung, auch unterwegs)'],
    when: () => true,
    priority: 8,
  },
  // ---------------- Songwriting & Pre-Production ----------------
  {
    id: 'songs-10',
    phaseId: 'phase-songs',
    area: 'songwriting',
    title: '9–10 Songs komplett mit Vocals (Pre-Prod-Demo)',
    description: 'Jeder Song als Pre-Production-Demo mit Lyrics und Vocals – Grundlage für Song-Auswahl, Proben und Set.',
    why: 'Mit 9–10 kompletten Songs habt ihr genug für ein 35–45-Minuten-Set und könnt die stärksten für die Singles auswählen. Eure Instrumentals sind schon weit – der Engpass liegt jetzt erfahrungsgemäß bei Lyrics und Vocals. Deshalb zählt hier erst ein Song mit Vocals als "fertig". Den finalen Feinschliff macht ihr wie geplant im Recording und in den Proben.',
    tasks: [],
    when: () => true,
    metric: (c) => ({ value: c.songsWithVocals, target: 10, label: 'Songs mit Vocals' }),
    priority: 1,
    seed: true,
    focus: true,
  },
  {
    id: 'vocal-pipeline',
    phaseId: 'phase-songs',
    area: 'songwriting',
    title: 'Vocal-Pipeline: Lyrics & Vocals für alle Instrumentals',
    description: 'Feste Vocal-Zeit pro Woche, pro Song Screams, Cleans und Rap-Parts planen.',
    why: 'Bei einer Person am Mikro und mehreren fertigen Instrumentals entsteht schnell ein Stau. Plant Vocals deshalb aktiv ein, statt sie "am Ende" zu machen: z.B. jede Mittwochs-Session mit 45–60 Minuten Vocal-Arbeit, oder abwechselnd Instrumental- und Vocal-Sessions. Eure Mischung aus Screams, Cleans und Rap braucht pro Song eine klare Rollenverteilung der Parts. Bei vielen Scream- und Rap-Sessions ist Stimmgesundheit (Technik, Einsingen, Pausen) ein echter Faktor.',
    tasks: [
      'Für jedes Instrumental Thema/Konzept festlegen',
      'Pro Song Vocal-Fahrplan: wo Screams, Cleans/Hook, Rap-Parts?',
      'Feste Vocal-Zeit in der Mittwochs-Session (oder eigene Vocal-Sessions)',
      'Scratch-Vocals aufnehmen und gemeinsam anhören',
      'Stimm-Routine: Einsingen, Technik (ggf. Vocal-Coaching), Pausen',
    ],
    when: () => true,
    metric: (c) => ({ value: c.songsWithVocals, target: Math.max(c.songsAtLeast('arrangement'), 1), label: 'Instrumentals mit Vocals' }),
    priority: 1,
    seed: true,
  },
  {
    id: 'mittwochs-session',
    phaseId: 'phase-songs',
    area: 'songwriting',
    title: 'Mittwochs-Session mit fester Agenda',
    description: 'Eure wöchentliche Studio-Session mit klarer Struktur – und jede Session endet mit einem Bounce.',
    why: 'Regelmäßigkeit habt ihr schon – mit einer festen Agenda wird jede Session messbar produktiv. Bewährt: 1 Song Feinschliff Instrumental, 1 Song Vocals, 15 Minuten Orga/Roadmap. Ein Bounce nach jeder Session (in der Song-Karte verlinkt) macht Fortschritt sichtbar und ist gleichzeitig Content-Material.',
    tasks: ['Mittwoch als Serie im Kalender (ist angelegt – Uhrzeit ergänzen)', 'Agenda-Vorlage festlegen und vorab in der Band-Gruppe teilen', 'Nach jeder Session: Bounce in Song-Karte verlinken, Stadium aktualisieren', '1–2 kurze Clips pro Session für Social Media filmen'],
    when: () => true,
    priority: 2,
    seed: true,
  },
  {
    id: 'songwriting-pipeline',
    phaseId: 'phase-songs',
    area: 'songwriting',
    title: 'Song-Pipeline auf 12+ Ideen auffüllen',
    description: 'Mehr Ideen als nötig – damit ihr am Ende die besten 9–10 auswählen könnt.',
    why: 'Wer genau 10 Songs schreibt, muss alle 10 nehmen. Ein paar zusätzliche Riffs/Ideen in der Pipeline geben euch die Freiheit, schwächere Songs zu streichen. Ideen (Riffs, Memos, Beats) sofort in der App erfassen.',
    tasks: ['Alle vorhandenen Riffs/Memos/Beats als Ideen erfassen', 'Ideen regelmäßig sichten und 1–2 zum Ausarbeiten auswählen'],
    when: (c) => c.songsTotal < 12,
    metric: (c) => ({ value: c.songsTotal, target: 12, label: 'Songs & Ideen' }),
    trigger: (c) => `Aktuell ${c.songsTotal} Songs/Ideen in der Pipeline.`,
    priority: 5,
  },
  {
    id: 'click',
    phaseId: 'phase-songs',
    area: 'songwriting',
    title: 'Tempo-Maps & Click für jeden Song festlegen',
    description: 'BPM/Tempowechsel, Taktarten und Click pro Song fix – Basis für Recording, Backing-Tracks und Drummer-Proben.',
    why: 'Mit programmierten Drums und Electronics hängt bei euch alles am Grid: Recording, Backing-Tracks live und das Einarbeiten einer neuen Drummerin/eines neuen Drummers. Saubere Tempo-Maps (inkl. Tempowechsel) sparen später viel Arbeit beim Export von Stems und Click-Tracks.',
    tasks: ['BPM und Tempowechsel je Song in der Song-Karte eintragen', 'Tempo-Map im DAW-Projekt sauber anlegen', 'In der Song-Karte "Sitzt zum Click" abhaken'],
    when: (c) => c.songsAtLeast('arrangement') >= 3,
    metric: (c) => ({ value: c.songsWithClick, target: Math.max(c.songsAtLeast('arrangement'), 1), label: 'Songs mit Click' }),
    priority: 4,
  },
  {
    id: 'songdaten',
    phaseId: 'phase-songs',
    area: 'songwriting',
    title: 'Tempo, Tuning & Länge jedes Songs dokumentieren',
    description: 'Für jeden Song BPM, Tuning und Dauer in der App eintragen.',
    why: 'Setlist-Planung (Tuning-Wechsel = Gitarrenwechsel!), Slot-Längen, Click-Tracks und Release-Metadaten brauchen diese Daten – und die App kann damit Set-Länge und Tuning-Wechsel automatisch berechnen.',
    tasks: [],
    when: (c) => c.songsAtLeast('arrangement') >= 2,
    metric: (c) => ({ value: c.songsWithMeta, target: Math.max(c.songsAtLeast('arrangement'), 1), label: 'Songs mit BPM/Tuning/Länge' }),
    priority: 6,
  },
  // ---------------- Debüt-Singles ----------------
  {
    id: 'popstipendium',
    phaseId: 'phase-release',
    area: 'finanzen',
    title: 'Pop-Stipendium des Pop-Büros Region Stuttgart prüfen',
    description: 'Produktionsstipendium für noch nicht etablierte Bands aus der Region – passt genau zu eurem Debüt.',
    why: 'Das Pop-Büro Region Stuttgart vergibt Produktionsstipendien (2026: je 5.000 €, dazu lobende Erwähnungen mit 2.000 €). Voraussetzung u.a.: Mindestens zwei Drittel der Bandmitglieder haben ihren Hauptwohnsitz in der Region (Stadt Stuttgart sowie Landkreise Böblingen, Esslingen, Göppingen, Ludwigsburg, Rems-Murr). In den Vorjahren startete die Bewerbungsphase Mitte November – also jetzt die aktuelle Ausschreibung und Frist auf popbuero.de prüfen. 5.000 € decken z.B. externen Mix/Master, Artwork und ein Video für mehrere Singles.',
    tasks: [
      'Aktuelle Ausschreibung & Frist auf popbuero.de prüfen und in den Kalender eintragen',
      'Wohnsitz-Voraussetzung prüfen (2/3 der Mitglieder in der Region)',
      'Beste 2–3 Demos für die Bewerbung auswählen',
      'Projektbeschreibung & Kostenplan (Mix/Master, Artwork, Video, Promo) schreiben',
      'Bewerbung über das Antragsportal einreichen',
    ],
    when: () => true,
    priority: 1,
    seed: true,
    focus: true,
  },
  {
    id: 'produktion',
    phaseId: 'phase-release',
    area: 'release',
    title: 'Produktions-Setup klären: Was selbst, was extern?',
    description: 'Entscheiden, welche Schritte ihr im eigenen Studio macht und wofür ihr Profis holt.',
    why: 'Euer eigenes Studio ist ein großer Vorteil: Pre-Production, Gitarren/Bass (DI + Reamp), Vocals und Electronics könnt ihr ohne Zeitdruck selbst aufnehmen. Modern Metalcore ist aber sehr produktionsgetrieben – Hörer:innen vergleichen direkt mit Top-Produktionen. Ein externer Mix und/oder Master ist deshalb für die Singles oft das Geld wert. Programmierte Drums sollten professionell klingen (gute Library, Velocity/Humanizing) – oder ihr lasst sie von einem Studio-Drummer einspielen.',
    tasks: [
      '3–5 Referenz-Tracks für euren Sound festlegen',
      'Entscheidung: Mix/Master intern oder extern',
      'Bei Mix-Engineers anfragen, Probemix eines Songs vergleichen',
      'Drum-Sound klären (Library/Programmierung vs. Studio-Drummer)',
      'Kosten in der Bandkasse einplanen',
    ],
    when: (c) => c.songsAtLeast('arrangement') >= 3,
    trigger: (c) => `${c.songsAtLeast('arrangement')} Songs haben mindestens ein fertiges Instrumental.`,
    priority: 2,
  },
  {
    id: 'debut-plan',
    phaseId: 'phase-release',
    area: 'release',
    title: 'Single-Strategie planen: 2–3 Singles vor den ersten Gigs',
    description: 'Die stärksten Songs auswählen, Release-Rhythmus festlegen, erste Single im Bereich "Releases" anlegen.',
    why: 'Für modernen Metalcore mit Electronic-/Trap-Einflüssen funktioniert eine Single-Strategie besonders gut: alle 6–8 Wochen ein Song mit Video/Visualizer und Kurzvideo-Content hält euch dauerhaft sichtbar, statt alles auf einmal mit einer EP zu verbrauchen. 2–3 Singles vor den ersten Gigs geben Veranstaltern (z.B. für lokale Reihen) etwas zum Anhören, euren ersten Shows ein Publikum – und machen die Drummer-Suche leichter. Die Songs könnt ihr später auf einer EP/einem Album wiederverwenden.',
    tasks: ['Die 2–3 stärksten Songs wählen (Hook, Wiedererkennung, euer Genre-Mix)', 'Release-Rhythmus festlegen (z.B. alle 6–8 Wochen)', 'Erste Single im Bereich "Releases" anlegen – der Zeitplan entsteht automatisch', 'Video-Idee pro Single (Musikvideo, Visualizer, Playthrough)'],
    when: (c) => c.songsWithVocals >= 2 || c.songsAtLeast('arrangement') >= 5,
    trigger: (c) => `${c.songsWithVocals} Songs mit Vocals, ${c.songsAtLeast('arrangement')} fertige Instrumentals.`,
    priority: 2,
  },
  {
    id: 'artwork-fotos',
    phaseId: 'phase-release',
    area: 'promo',
    title: 'Artwork, Pressefotos & Video',
    description: 'Cover pro Single (mind. 3000×3000 px), ein Set Bandfotos und ein Video-Konzept.',
    why: 'Bei Singles zählt jedes Cover – eine wiedererkennbare Serie wirkt professioneller. Pressefotos (quer und hoch, hohe Auflösung, mit Fotocredit) brauchen Veranstalter und Medien. Im Genre ist Video zentral: Musikvideo, Visualizer oder Playthrough plus vertikale Kurzclips.',
    tasks: ['Cover-Serie konzipieren & beauftragen', 'Foto-Shooting planen (Kalender)', 'Fotos quer & hoch, mit Fotocredit', 'Video-Konzept + Kurzclips (9:16) einplanen'],
    when: (c) => c.releasesPlanned > 0 || started(c, 'debut-plan'),
    priority: 3,
  },
  {
    id: 'plattformen',
    phaseId: 'phase-release',
    area: 'release',
    title: 'Vertrieb & Plattformen einrichten',
    description: 'Digitalvertrieb wählen, Bandcamp aufsetzen, Künstlerprofile beanspruchen.',
    why: 'Ein Digitalvertrieb bringt euch auf Spotify, Apple Music & Co. (Gebührenmodelle vergleichen: Jahresabo vs. pro Release vs. Umsatzbeteiligung – bei mehreren Singles lohnt sich oft ein Abo). Nach dem ersten Upload Spotify for Artists beanspruchen, um künftige Singles fürs Editorial pitchen zu können. Bandcamp für Direktverkauf und Fan-Bindung.',
    tasks: ['Distributoren vergleichen und auswählen', 'Spotify for Artists & Apple Music for Artists beanspruchen', 'Bandcamp-Seite einrichten', 'ISRC-Codes in den Song-Karten notieren'],
    when: (c) => c.releasesPlanned > 0,
    priority: 3,
  },
  {
    id: 'gema',
    phaseId: 'phase-release',
    area: 'business',
    title: 'GEMA & GVL: Entscheidung treffen',
    description: 'Credits klären und abwägen, ob und wann eine Mitgliedschaft sinnvoll ist.',
    why: 'Die GEMA vertritt Urheber:innen (Komposition & Text) – Ausschüttungen gibt es z.B. für Radio, Streams und Live-Auftritte (Setlisten einreichen!). Eine Mitgliedschaft hat aber Konsequenzen (u.a. Beiträge, alle Werke laufen über die GEMA). Wichtig: Autoren sind immer Personen, nicht "die Band" – klärt daher vorher die Anteile pro Song, auch für Beats/Electronics. Die GVL ist für ausübende Künstler:innen und wird ab Veröffentlichungen relevant.',
    tasks: ['Credits/Anteile je Song in den Song-Karten festhalten', 'Vor- und Nachteile einer GEMA-Mitgliedschaft abwägen', 'Ggf. Mitgliedschaft beantragen & Werke anmelden', 'GVL-Anmeldung nach dem ersten Release prüfen'],
    when: (c) => c.releasesPlanned > 0 || c.gigsPlayed >= 3,
    priority: 5,
  },
  {
    id: 'social-routine',
    phaseId: 'phase-release',
    area: 'promo',
    title: 'Content-Routine: 3 Kurzvideos pro Woche',
    description: 'Reels/Shorts/TikTok aus Studio und Proben – lange vor der ersten Single.',
    why: 'In eurem Genre kommt neue Reichweite vor allem über Kurzvideos. Ihr sitzt jeden Mittwoch im Studio – das ist laufend Material: Riff- und Breakdown-Snippets, Vocal-Takes, Beat-Building, Playthroughs, Before/After vom Mix. Wer vor der ersten Single schon postet, hat am Release-Tag Leute, die zuhören.',
    tasks: ['Plattformen festlegen (Instagram Reels, TikTok, YouTube Shorts)', '3–4 Content-Säulen definieren', 'Pro Mittwochs-Session 2–3 Clips filmen', 'Content-Plan im Bereich "Promo" pflegen'],
    when: (c) => started(c, 'name-check') || c.songsAtLeast('arrangement') >= 3,
    priority: 3,
  },
  {
    id: 'presse',
    phaseId: 'phase-release',
    area: 'promo',
    title: 'Playlists, Webzines & Podcasts anschreiben',
    description: 'Eine Liste von 15–30 passenden Medien und Playlist-Kuratoren aufbauen.',
    why: 'Metalcore-Webzines, YouTube-Kanäle, Podcasts und unabhängige Playlist-Kuratoren sind für Newcomer gut erreichbar. Kurze persönliche Mails mit privatem Stream-Link 3–4 Wochen vor Release wirken besser als Massenmails.',
    tasks: ['Passende Medien/Kuratoren in den Kontakten sammeln', 'Pressetext & Mail-Vorlage', 'Persönlich anschreiben (3–4 Wochen vor Release)', 'Nachfassen nach ca. 1 Woche'],
    when: (c) => c.releasesWithDate > 0,
    metric: (c) => ({ value: c.contactsOfType('presse'), target: 15, label: 'Presse-/Playlist-Kontakte' }),
    priority: 3,
  },
  {
    id: 'epk',
    phaseId: 'phase-release',
    area: 'promo',
    title: 'EPK (Electronic Press Kit) erstellen',
    description: 'Eine Seite/ein Ordner mit allem, was Presse und Veranstalter brauchen.',
    why: 'Veranstalter und Presse entscheiden in Sekunden. Test: Findet jemand Fremdes in 30 Sekunden euren aktuellen Song, ein Pressefoto und eure Kontaktdaten? Spätestens vor den ersten Booking-Anfragen nötig. Die EPK-Checkliste im Bereich "Promo" führt durch alle Bestandteile.',
    tasks: ['EPK-Checkliste im Bereich "Promo" abarbeiten', 'Als Webseite oder geteilter Ordner veröffentlichen', '30-Sekunden-Test mit Außenstehenden'],
    when: (c) => c.releasesPlanned > 0 || c.releasesReleased > 0,
    priority: 4,
  },
  // ---------------- Live-Set & Bühne ----------------
  {
    id: 'live-rig',
    phaseId: 'phase-buehne',
    area: 'live',
    title: 'Live-Rig für Backing-Tracks & Click aufbauen',
    description: 'Ein zuverlässiges Playback-Setup für Electronics, Samples (und ggf. Drums) – geprobt ab Tag 1 der Probenphase.',
    why: 'Electronics, Synths, 808s und Samples kommen bei eurem Sound live vom Track – das ist im Genre üblich. Entscheidend ist Zuverlässigkeit: Ein Absturz mitten im Set ist schlimmer als jeder Verspieler. Plant In-Ears für Click und Cues, getrennte Stems (damit die Technik vor Ort mischen kann) und einen Notfallplan. Probt von Anfang an mit dem Rig, nicht erst kurz vor dem ersten Gig.',
    tasks: [
      'Stems pro Song exportieren: Click, Cues/Ansagen, Electronics, Samples (ggf. Drums)',
      'Playback-Lösung wählen (z.B. DAW auf Laptop oder dedizierter Player) + Audio-Interface',
      'In-Ear-Monitoring für Click & Cues',
      'Redundanz/Notfallplan (Backup-Gerät oder klare Routine bei Ausfall)',
      'Kanalliste für die Technik vor Ort (Stems getrennt)',
    ],
    when: (c) => c.songsAtLeast('arrangement') >= 5 || started(c, 'besetzung-drums'),
    trigger: () => 'Sinnvoll, bevor die Probenphase startet – das Setup braucht Vorlauf.',
    priority: 2,
  },
  {
    id: 'set-40',
    phaseId: 'phase-buehne',
    area: 'live',
    title: '35–45-Minuten-Set zusammenstellen & durchproben',
    description: 'Eine feste Setlist, die ihr mit Tracks am Stück sicher spielt.',
    why: 'Ein Set ist mehr als die Summe der Songs: Übergänge (bei euch ideal mit Electronics/Interludes vom Track), Ansagen, Tuning-Wechsel, Dramaturgie (starker Opener, stärkster Song zum Schluss) und Kondition – gerade für die Vocals. Wer das Set mehrfach am Stück geprobt hat, wirkt beim ersten Gig souverän. Für erste Support-Slots reichen oft 25–30 Minuten, also auch eine Kurzversion planen.',
    tasks: ['Setlist anlegen (Gig oder Probe-Set)', 'Übergänge/Interludes als Track-Elemente bauen', 'Ansagen planen', 'Set 3× am Stück mit Stoppuhr durchspielen', 'Kurzversion für 25–30-Minuten-Slots'],
    when: (c) => c.songsAtLeast('probereif') >= 5 || c.songsWithVocals >= 8,
    trigger: (c) => `${c.songsAtLeast('probereif')} live-ready Songs, ${c.songsWithVocals} Songs mit Vocals.`,
    priority: 2,
  },
  {
    id: 'erste-gigs',
    phaseId: 'phase-buehne',
    area: 'live',
    title: 'Die ersten 3 Gigs in der Region Stuttgart spielen',
    description: 'Realistische Einstiege: lokale Band-Reihen, Support-Slots, Jugendhaus-Bühnen.',
    why: 'In Stuttgart gibt es Formate für regionale Bands, z.B. die Reihe "Region\'s Finest" im Club Zentral oder Konzerte im Jugendhaus West mit regionalen Supports; auch Metalcore-Abende wie "Core im Kessel" laufen dort. Veranstalter wollen vorher Musik hören – mit 1–2 Singles und einem Live-Clip aus dem Studio stehen eure Chancen deutlich besser. Lokale Bands aus der Szene (Gig-Tausch) sind der zweite Weg. Vorsicht bei Pay-to-Play-Angeboten.',
    tasks: ['Kontakte im Bereich "Kontakte" vervollständigen (Booking-Mail auf den Websites)', 'Kurze Anfrage-Mail mit Singles/Demo-Links und Live-Clip vorbereiten', '3–5 regionale Bands aus eurem Genre ansprechen (Support / Gig-Tausch)', 'Freundeskreis als erstes Publikum mobilisieren'],
    when: (c) => c.songsAtLeast('probereif') >= 5 || started(c, 'set-40'),
    metric: (c) => ({ value: c.gigsPlayed, target: 3, label: 'Gigs gespielt' }),
    priority: 1,
  },
  {
    id: 'netzwerk-bands',
    phaseId: 'phase-buehne',
    area: 'live',
    title: 'Netzwerk mit 5 Bands aus der Stuttgarter Core-Szene',
    description: 'Bands aus eurer Szene kennenlernen, auf ihre Shows gehen, gemeinsame Abende planen.',
    why: 'Gig-Tausch und gemeinsame Abende sind der realistischste Weg für neue Bands auf die Bühne – und raus aus der Region. Netzwerken könnt ihr schon jetzt, lange vor dem ersten Gig: auf Shows gehen, Content teilen, Kontakt halten. Und: Über die Szene findet ihr am ehesten auch Drummer:innen.',
    tasks: ['Auf lokale Metalcore-Shows gehen (z.B. Club Zentral, JuHa West)', 'Bands in den Kontakten erfassen', 'Gegenseitig Content teilen', 'Einen gemeinsamen Abend planen'],
    when: () => true,
    metric: (c) => ({ value: c.contactsOfType('band'), target: 5, label: 'Band-Kontakte' }),
    priority: 5,
  },
  {
    id: 'stageplot',
    phaseId: 'phase-buehne',
    area: 'live',
    title: 'Stage Plot & Technik-Rider erstellen',
    description: 'Eine Seite mit Bühnenaufbau, Kanalliste (inkl. Track-Stems) und euren Anforderungen.',
    why: 'Mit Backing-Tracks und In-Ears ist euer Setup technisch anspruchsvoller als bei vielen Newcomer-Bands. Veranstalter und Tontechnik müssen vorab wissen, wie viele Kanäle die Tracks brauchen und was ihr selbst mitbringt. Saubere Vorbereitung = entspannte Soundchecks = Wiederbuchung.',
    tasks: ['Stage Plot zeichnen', 'Kanalliste (Instrumente, Vocals, Track-Stems)', 'Was bringt ihr mit, was braucht ihr vor Ort?', 'Als PDF im EPK ablegen'],
    when: (c) => c.gigsUpcoming > 0 || c.gigsPlayed > 0 || started(c, 'erste-gigs') || started(c, 'live-rig'),
    priority: 3,
  },
  {
    id: 'live-video',
    phaseId: 'phase-buehne',
    area: 'promo',
    title: 'Live-Session-Video im eigenen Studio drehen',
    description: 'Ein Song "live im Studio" mit gutem Ton und mehreren Kameras – Booking-Material vor dem ersten Gig.',
    why: 'Promoter wollen sehen, wie ihr live wirkt. Euer Vorteil: Im eigenen Studio könnt ihr eine Live-Session mit Studio-Ton aufnehmen, bevor es echte Gig-Aufnahmen gibt. Das hilft bei den ersten Anfragen und ist gleichzeitig starker Content.',
    tasks: ['Song auswählen', '2–3 Kameras/Handys + Licht', 'Ton im Studio mitschneiden und mischen', 'Video schneiden + Kurzclips daraus'],
    when: (c) => c.songsAtLeast('probereif') >= 2 || started(c, 'set-40'),
    priority: 3,
  },
  {
    id: 'mailingliste',
    phaseId: 'phase-buehne',
    area: 'promo',
    title: 'Fan-Mailingliste starten',
    description: 'Ein eigener Kanal zu euren Fans – unabhängig von Algorithmen.',
    why: 'Follower gehören der Plattform, E-Mail-Adressen gehören euch. Für Single-Releases, Vorbestellungen und Gig-Ankündigungen ist die Liste Gold wert. Sammelt Adressen per QR-Code am Merchstand und über die Link-Seite.',
    tasks: ['Newsletter-Tool wählen (Datenschutz/Double-Opt-in beachten)', 'Link auf der Link-Seite/Bio', 'QR-Code für Merchstand & Bühne'],
    when: (c) => c.gigsPlayed >= 1 || c.releasesReleased > 0,
    priority: 6,
  },
  // ---------------- Wachstum ----------------
  {
    id: 'regional',
    phaseId: 'phase-wachstum',
    area: 'live',
    title: 'In 3 Städten außerhalb Stuttgarts spielen',
    description: 'Raus aus der Region – über Gig-Tausch und Veranstalter in Nachbarstädten.',
    why: 'Neue Städte bringen neues Publikum und zeigen Veranstaltern, dass ihr mehr seid als eine lokale Band – ein wichtiger Nachweis für Festivals und Booking-Agenturen. Realistisch: Städte in 1–2 Stunden Entfernung über Partnerbands.',
    tasks: ['Partnerbands aus anderen Städten ansprechen', 'Veranstalter in 2–3 Städten anfragen', 'Fahrtkosten einplanen'],
    when: (c) => c.gigsPlayed >= 3,
    metric: (c) => ({ value: c.citiesPlayed, target: 4, label: 'Städte bespielt (inkl. Stuttgart)' }),
    priority: 3,
  },
  {
    id: 'merch-start',
    phaseId: 'phase-wachstum',
    area: 'merch',
    title: 'Kleine erste Merch-Auflage',
    description: 'Sticker und ein Shirt-Motiv – klein starten, Risiko begrenzen.',
    why: 'Merch ist für kleine Bands oft die wichtigste Einnahme pro Gig. Wer klein startet (z.B. ein Shirt-Motiv, Sticker), vermeidet Kisten voller unverkaufter Größen. Vorbestellungen finanzieren die Auflage vor. Kartenzahlung am Stand erhöht den Umsatz spürbar.',
    tasks: ['Motiv festlegen', 'Angebote von 2–3 Druckereien einholen', 'Vorbestellung im Umfeld', 'Sinnvollen Größenmix bestellen', 'Kartenleser + Preisliste für den Merchstand'],
    when: (c) => c.gigsPlayed >= 2 || c.gigsUpcoming >= 2,
    priority: 4,
  },
  {
    id: 'foerderung',
    phaseId: 'phase-wachstum',
    area: 'finanzen',
    title: 'Weitere Förderungen: Land BW & bundesweit',
    description: 'Größere Programme für Projekte, Touren und Produktionen prüfen, wenn ihr Releases und Live-Erfahrung habt.',
    why: 'Neben dem Pop-Stipendium der Region gibt es auf Landesebene "Perspektive Pop 2.0" (POPLÄND, Baden-Württemberg; laut Richtlinie 2026 je Antrag 10.000–20.000 €, mind. die Hälfte der Band mit Hauptwohnsitz in BW) sowie die Programme der Popakademie Baden-Württemberg (z.B. Bandpool) und bundesweit die Initiative Musik. Diese Programme erwarten meist schon Veröffentlichungen, Live-Referenzen und einen durchdachten Kostenplan – daher eher für die Phase nach den ersten Singles.',
    tasks: ['Aktuelle Ausschreibungen & Fristen notieren (Kalender)', 'Kostenplan aus Release-/Tourplanung ableiten', 'Beim Pop-Büro Region Stuttgart beraten lassen'],
    when: (c) => c.releasesReleased >= 1 || done(c, 'popstipendium'),
    priority: 4,
  },
  {
    id: 'festivals',
    phaseId: 'phase-wachstum',
    area: 'live',
    title: 'Bei regionalen Festivals & Core-Events bewerben',
    description: 'Eine Liste passender Festivals und Core-Events mit Bewerbungszeiträumen pflegen.',
    why: 'Kleinere Festivals und Core-Events in Baden-Württemberg buchen gern regionale Newcomer – die Bewerbungsphase liegt oft im Herbst/Winter für die nächste Saison. Voraussetzungen: veröffentlichte Musik, Live-Video, EPK und einige Referenz-Gigs.',
    tasks: ['10 passende Festivals/Events in BW & Umgebung recherchieren', 'Bewerbungszeiträume im Kalender eintragen', 'EPK aktualisieren', 'Bewerbungen verschicken & nachhalten'],
    when: (c) => c.releasesReleased >= 1 && c.gigsPlayed >= 4,
    priority: 3,
  },
  {
    id: 'metal-battle',
    phaseId: 'phase-wachstum',
    area: 'live',
    title: 'Für Band-Contests bewerben (z.B. Wacken Metal Battle)',
    description: 'Nationale Vorentscheide oder vergleichbare Newcomer-Contests.',
    why: 'Der Metal Battle richtet sich an unsignierte Bands; Gewinner:innen der nationalen Vorentscheide spielen in Wacken, Reisekosten trägt in der Regel die Band. Ohne gute Aufnahmen und Live-Video sind die Chancen gering – daher erst nach den ersten Releases sinnvoll. Klärt bei Contests vorher, ob Backing-Tracks erlaubt sind, und achtet auf Teilnahmegebühren/Pay-to-Play.',
    tasks: ['Aktuelle Ausschreibungen & Fristen recherchieren', 'Regeln zu Backing-Tracks prüfen', 'EPK & Live-Video aktualisieren', 'Bewerbung einreichen'],
    when: (c) => c.releasesReleased >= 1 && c.gigsPlayed >= 5,
    priority: 5,
  },
  {
    id: 'naechstes-release',
    phaseId: 'phase-wachstum',
    area: 'release',
    title: 'Erste EP / erstes Album planen',
    description: 'Die Singles plus neue Songs zu einem größeren Release bündeln.',
    why: 'Nach mehreren Singles mit Publikum, Live-Erfahrung und Kontakten lohnt sich ein größeres Release – die Singles tragen es mit. Mit 9–10 Songs habt ihr das Material dafür bereits in der Pipeline.',
    tasks: ['Learnings aus den Singles auswerten (Zahlen, Feedback)', 'Songauswahl & Reihenfolge', 'Budget & Förderung prüfen', 'Physische Formate kalkulieren (CD, Vinyl)'],
    when: (c) => c.releasesReleased >= 2,
    priority: 4,
  },
]

export const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]))

export interface Suggestion {
  template: GoalTemplate
  reason: string
}

/** Vorschläge: sinnvolle Ziele, die zum aktuellen Stand passen und noch nicht angelegt/ausgeblendet sind. */
export function getSuggestions(dismissed: string[]): Suggestion[] {
  const c = buildCtx()
  const existing = new Set(store.list('goals').map((g) => g.templateId).filter(Boolean))
  const phaseOrder: Record<string, number> = Object.fromEntries(PHASES.map((p) => [p.id, p.order]))
  for (const p of store.list('phases')) phaseOrder[p.id] = p.order
  return TEMPLATES.filter((t) => !existing.has(t.id) && !dismissed.includes(t.id) && t.when(c))
    .map((t) => {
      const m = t.metric?.(c)
      const reason = t.trigger?.(c) || (m ? `Aktuell: ${m.value}/${m.target} ${m.label}.` : '')
      return { template: t, reason }
    })
    .sort((a, b) => (phaseOrder[a.template.phaseId] ?? 9) * 2 + a.template.priority - ((phaseOrder[b.template.phaseId] ?? 9) * 2 + b.template.priority))
}

export function goalFromTemplate(t: GoalTemplate, focus = false): Partial<Goal> {
  return {
    title: t.title,
    description: t.description,
    why: t.why,
    phaseId: t.phaseId,
    area: t.area,
    status: 'offen',
    ownerIds: [],
    due: '',
    focus,
    tasks: t.tasks.map((text) => ({ id: uid(), text, done: false })),
    templateId: t.id,
    lastTouched: Date.now(),
  }
}

export function addTemplateGoal(t: GoalTemplate) {
  return store.put('goals', goalFromTemplate(t))
}

// ---------------- Checklisten ----------------

type CL = Omit<ChecklistItem, 'id' | 'done' | 'notes' | 'order'>

export const CHECKLISTS: Record<string, { title: string; description: string; items: CL[] }> = {
  business: {
    title: 'Business & Organisation',
    description: 'Die rechtlichen und organisatorischen Basics einer Band in Deutschland. Keine Rechtsberatung – im Zweifel Fachleute fragen.',
    items: [
      { group: 'business', section: 'Organisation', title: 'Band-Vereinbarung (GbR) unterschrieben', hint: 'Einnahmen, Kosten, Equipment, Namensrechte, Ein-/Ausstieg, Entscheidungen.' },
      { group: 'business', section: 'Organisation', title: 'Bandkasse / Bandkonto eingerichtet', hint: 'Getrennt von privaten Konten – erleichtert Abrechnung und Steuer.' },
      { group: 'business', section: 'Organisation', title: 'Studio-/Proberaum-Nutzung geregelt', hint: 'Das Studio gehört einem Mitglied: Kostenbeteiligung, Zeiten, Equipment-Nutzung festhalten.' },
      { group: 'business', section: 'Organisation', title: 'Zuständigkeiten verteilt', hint: 'Booking, Social Media, Kasse, Merch, Technik, Termine.' },
      { group: 'business', section: 'Organisation', title: 'Equipment-Inventar & Versicherung', hint: 'Seriennummern, Fotos, Versicherungsschutz außerhalb der Wohnung.' },
      { group: 'business', section: 'Rechte & Verwertung', title: 'Bandname geprüft (Metallum, Plattformen, Markenregister)', hint: 'Spart späteren Ärger und Verwechslungen auf Spotify.' },
      { group: 'business', section: 'Rechte & Verwertung', title: 'Songwriting-Credits pro Song festgehalten', hint: 'Wer hat Musik/Text geschrieben, mit welchen Anteilen? Autoren sind immer Personen.' },
      { group: 'business', section: 'Rechte & Verwertung', title: 'Entscheidung GEMA-Mitgliedschaft getroffen', hint: 'Vor- und Nachteile abwägen; Setlisten nach Gigs melden, falls Mitglied.' },
      { group: 'business', section: 'Rechte & Verwertung', title: 'GVL-Anmeldung geprüft (nach erstem Release)', hint: 'Für ausübende Künstler:innen – Vergütung z.B. aus Radio-/Sendenutzung.' },
      { group: 'business', section: 'Rechte & Verwertung', title: 'Nutzungsrechte für Artwork, Logo & Fotos schriftlich', hint: 'Mit Designer:innen/Fotograf:innen klären, wofür ihr die Werke nutzen dürft (auch Merch!).' },
      { group: 'business', section: 'Geld & Steuern', title: 'Alle Einnahmen & Ausgaben dokumentiert', hint: 'Belege sammeln – Gagen und Merch-Umsätze sind steuerlich relevant.' },
      { group: 'business', section: 'Geld & Steuern', title: 'Steuerliche Situation der GbR geklärt', hint: 'Bei regelmäßigen Einnahmen kurz bei Steuerberatung/Finanzamt nachfragen (z.B. Gewinnfeststellung, Kleinunternehmerregelung).' },
      { group: 'business', section: 'Online-Präsenz', title: 'Band-E-Mail & Domain', hint: 'Seriöser als private Adressen – auch für Booking-Anfragen.' },
      { group: 'business', section: 'Online-Präsenz', title: 'Instagram, YouTube, TikTok mit einheitlichem Handle', hint: '' },
      { group: 'business', section: 'Online-Präsenz', title: 'Bandcamp-Seite', hint: 'Zentrale Plattform für Direktverkauf in der Metal-Szene.' },
      { group: 'business', section: 'Online-Präsenz', title: 'Spotify for Artists / Apple Music for Artists beansprucht', hint: 'Möglich nach dem ersten Upload über den Distributor.' },
      { group: 'business', section: 'Online-Präsenz', title: 'Eintrag bei Encyclopaedia Metallum', hint: 'Möglich, sobald ihr ein Release habt – wird in der Szene viel genutzt.' },
      { group: 'business', section: 'Online-Präsenz', title: 'Link-Seite / Website mit allen Links', hint: 'Ein Link für Bio, Musik, Shows, Merch, Kontakt.' },
    ],
  },
  epk: {
    title: 'EPK – Electronic Press Kit',
    description: 'Alles, was Presse, Veranstalter und Festivals brauchen. Test: Fremde finden in 30 Sekunden Song, Foto und Kontakt.',
    items: [
      { group: 'epk', section: 'Text', title: 'Kurz-Bio (ca. 50 Wörter)', hint: 'Wer, woher, welcher Sound, aktuelles Release.' },
      { group: 'epk', section: 'Text', title: 'Lange Bio (200–300 Wörter)', hint: 'Ehrlich bleiben – keine übertriebenen Behauptungen.' },
      { group: 'epk', section: 'Text', title: '"Für Fans von …" mit 3–5 Referenzbands', hint: '' },
      { group: 'epk', section: 'Text', title: 'Pressetext zum aktuellen Release', hint: '' },
      { group: 'epk', section: 'Bild', title: 'Pressefotos quer & hoch (hohe Auflösung, mit Fotocredit)', hint: '' },
      { group: 'epk', section: 'Bild', title: 'Logo als PNG (transparent) und SVG', hint: 'Inkl. lesbarer Variante für Plakate.' },
      { group: 'epk', section: 'Bild', title: 'Cover-Artwork in hoher Auflösung', hint: '' },
      { group: 'epk', section: 'Musik & Video', title: 'Links zu Bandcamp / Spotify', hint: 'Klare Beschriftung, z.B. "BANDNAME auf Bandcamp".' },
      { group: 'epk', section: 'Musik & Video', title: 'Privater Stream-Link für unveröffentlichte Songs', hint: 'Für Presse vor dem Release.' },
      { group: 'epk', section: 'Musik & Video', title: 'Live-Video', hint: 'Für Booking oft das wichtigste Element.' },
      { group: 'epk', section: 'Musik & Video', title: 'Musik-/Lyric-/Playthrough-Video (optional)', hint: '' },
      { group: 'epk', section: 'Nachweise', title: 'Pressestimmen mit Links', hint: '' },
      { group: 'epk', section: 'Nachweise', title: 'Bisherige Shows / Highlights', hint: '' },
      { group: 'epk', section: 'Kontakt & Technik', title: 'Kontakt für Booking & Presse', hint: '' },
      { group: 'epk', section: 'Kontakt & Technik', title: 'Stage Plot & Technik-Rider als PDF', hint: '' },
      { group: 'epk', section: 'Kontakt & Technik', title: 'Social-Media-Links', hint: '' },
      { group: 'epk', section: 'Kontakt & Technik', title: '30-Sekunden-Test mit Außenstehenden bestanden', hint: '' },
    ],
  },
  live: {
    title: 'Live-Checkliste',
    description: 'Was vor jedem Gig geklärt und eingepackt sein sollte.',
    items: [
      { group: 'live', section: 'Vorbereitung', title: 'Stage Plot erstellt', hint: 'Positionen, Amps, Monitore, Strom.' },
      { group: 'live', section: 'Vorbereitung', title: 'Kanalliste (Input List)', hint: '' },
      { group: 'live', section: 'Vorbereitung', title: 'Backline-Absprache mit anderen Bands', hint: 'Drumset/Cabinets teilen spart Umbauzeit.' },
      { group: 'live', section: 'Vorbereitung', title: 'Deal schriftlich bestätigt (Gage, Slot, Zeiten, Catering)', hint: 'Eine E-Mail reicht – Hauptsache schriftlich.' },
      { group: 'live', section: 'Vorbereitung', title: 'Setlist in großer Schrift ausgedruckt', hint: '' },
      { group: 'live', section: 'Packliste', title: 'Ersatzsaiten, Sticks, Felle, Plektren', hint: '' },
      { group: 'live', section: 'Packliste', title: 'Kabel, Netzteile, Batterien, Gaffa-Tape', hint: '' },
      { group: 'live', section: 'Packliste', title: 'Stimmgeräte, In-Ears, Kopfhörer-Verstärker', hint: '' },
      { group: 'live', section: 'Backing-Tracks', title: 'Playback-Rechner/-Player geladen, Updates & Benachrichtigungen aus', hint: 'Flugmodus, Energiesparen aus, Set-Projekt geöffnet.' },
      { group: 'live', section: 'Backing-Tracks', title: 'Backup bereit (zweites Gerät oder USB-Stick mit Set)', hint: '' },
      { group: 'live', section: 'Backing-Tracks', title: 'Stems & Kanalliste mit der Technik abgestimmt', hint: 'Welche Stems auf welche Kanäle, wer mischt die Tracks?' },
      { group: 'live', section: 'Backing-Tracks', title: 'Line-Check der Tracks beim Soundcheck', hint: '' },
      { group: 'live', section: 'Merchstand', title: 'Kartenleser + Wechselgeld', hint: '' },
      { group: 'live', section: 'Merchstand', title: 'Preisliste & Größenübersicht', hint: '' },
      { group: 'live', section: 'Merchstand', title: 'QR-Code für Mailingliste/Socials', hint: '' },
      { group: 'live', section: 'Danach', title: 'Fotos/Videos sammeln & posten', hint: '' },
      { group: 'live', section: 'Danach', title: 'Bei Veranstalter bedanken', hint: 'Gute Beziehungen = Wiederbuchung.' },
      { group: 'live', section: 'Danach', title: 'Setlist melden (falls GEMA-Mitglied)', hint: '' },
    ],
  },
}

export function seedChecklist(group: string) {
  const def = CHECKLISTS[group]
  store.putMany(
    'checklist',
    def.items.map((it, i) => ({ ...it, done: false, notes: '', order: i })),
  )
}

// ---------------- Release-Zeitplan ----------------

export function releaseTimeline(type: ReleaseType): Omit<ReleaseTask, 'id' | 'done'>[] {
  const long = type !== 'single'
  return [
    { offsetDays: long ? -120 : -90, area: 'Planung', text: 'Release-Datum festlegen & Ziele definieren (Streams, Presse, Gigs)' },
    { offsetDays: long ? -100 : -75, area: 'Produktion', text: 'Aufnahmen abgeschlossen' },
    { offsetDays: -70, area: 'Produktion', text: 'Mix & Master final abgenommen (alle Songs zusammen mastern)' },
    { offsetDays: -63, area: 'Artwork', text: 'Cover final (mind. 3000×3000 px)' },
    { offsetDays: -56, area: 'Promo', text: 'Pressefotos & Pressetext fertig' },
    { offsetDays: -49, area: 'Metadaten', text: 'Credits & Metadaten: Titel, Komponisten, Texter, ISRC, Explicit, Genre' },
    { offsetDays: -42, area: 'Vertrieb', text: 'Upload beim Distributor (mind. 4–6 Wochen vorher)' },
    { offsetDays: -35, area: 'Vertrieb', text: 'Bandcamp-Seite vorbereiten (ggf. Pre-Order)' },
    { offsetDays: -28, area: 'Vertrieb', text: 'Spotify-for-Artists-Pitch einreichen (spätestens 7 Tage vorher, besser ~4 Wochen)' },
    { offsetDays: -28, area: 'Promo', text: 'Pre-Save-Link erstellen & teilen' },
    { offsetDays: -28, area: 'Presse', text: 'Presse, Webzines & Podcasts persönlich anschreiben' },
    { offsetDays: -21, area: 'Promo', text: 'Release offiziell ankündigen + Teaser' },
    { offsetDays: -21, area: 'Content', text: 'Playthrough-, Lyric- oder Musikvideo fertig' },
    { offsetDays: -14, area: 'Live', text: 'Release-Show / Gig rund um den Release planen' },
    { offsetDays: -14, area: 'Presse', text: 'Bei Presse nachfassen' },
    { offsetDays: -7, area: 'Content', text: 'Countdown-Content (Snippets, Behind the Scenes)' },
    { offsetDays: -2, area: 'Promo', text: 'Mailingliste & Freundeskreis informieren' },
    { offsetDays: 0, area: 'Release', text: 'RELEASE! Links überall aktualisieren (Bio, Linkseite, EPK)' },
    { offsetDays: 0, area: 'Content', text: 'Release-Post, Stories, Fans zum Teilen aufrufen' },
    { offsetDays: 3, area: 'Content', text: 'Danke-Post, Reaktionen & Reviews teilen' },
    { offsetDays: 7, area: 'Business', text: 'Werke bei GEMA anmelden (falls Mitglied) / GVL prüfen' },
    { offsetDays: 14, area: 'Auswertung', text: 'Zahlen auswerten (Streams, Saves, Follower, Verkäufe) & Learnings notieren' },
    { offsetDays: 30, area: 'Content', text: 'Zweite Welle: Live-Video, Playthrough oder Remix' },
  ]
}

// ---------------- Start-Daten & Band-Profil ----------------

export const PROFILE_VERSION = 3

const STUTTGART_CONTACTS: Partial<Contact>[] = [
  {
    name: 'Pop-Büro Region Stuttgart',
    type: 'sonstiges',
    city: 'Stuttgart',
    web: 'https://www.popbuero.de',
    notes: 'Öffentliche Anlaufstelle für Bands aus der Region (Wirtschaftsförderung Region Stuttgart + Stuttgarter Jugendhaus). Pop-Stipendien/Produktionsstipendien (2026: 5.000 €), Beratung, Künstlerverzeichnis, ABOUT-POP-Festival. Aktuelle Kontaktdaten auf der Website prüfen.',
    nextStep: 'Ausschreibung Pop-Stipendium prüfen, Band im Künstlerverzeichnis eintragen',
  },
  {
    name: 'Club Zentral',
    type: 'venue',
    city: 'Stuttgart',
    notes: 'Reihe "Region\'s Finest" mit regionalen Bands (laut Ankündigungen präsentiert mit Listen Loud Group und stjg) sowie Metalcore-Abende wie "Core im Kessel". Booking-Kontakt auf der Website prüfen.',
    nextStep: 'Auf Shows gehen; nach ersten Singles für Region\'s Finest anfragen',
  },
  {
    name: 'JuHa West (Jugendhaus West)',
    type: 'venue',
    city: 'Stuttgart',
    notes: 'Konzerte aus Hardcore, Punk und Metal, oft mit regionalen Support-Bands. Booking-Kontakt auf der Website prüfen.',
    nextStep: 'Auf Shows gehen, Konzertteam kennenlernen',
  },
  {
    name: 'Listen Loud Group',
    type: 'veranstalter',
    city: 'Stuttgart',
    notes: 'Laut Veranstaltungsankündigungen Mitveranstalter der Reihe "Region\'s Finest". Kontakt recherchieren.',
    nextStep: '',
  },
  {
    name: 'clubCANN',
    type: 'venue',
    city: 'Stuttgart-Bad Cannstatt',
    notes: 'Internationale Metalcore-Touren – langfristiges Ziel für Support-Slots, wenn ihr regional etabliert seid.',
    nextStep: '',
  },
]

function nextWednesday(): string {
  const d = new Date()
  d.setDate(d.getDate() + ((3 - d.getDay() + 7) % 7))
  const y = d.getFullYear()
  return `${y}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Passt bestehende oder neue Daten an euer Band-Profil an (idempotent, überschreibt nichts,
 * was ihr selbst geändert habt).
 */
export function applyBandProfile() {
  const settings = store.list('settings')[0]
  if (settings && (settings.profileVersion ?? 0) >= PROFILE_VERSION) return

  // Phasen: neue Struktur, nur unveränderte Standard-Phasen werden angepasst
  const phases = store.list('phases')
  store.putMany(
    'phases',
    PHASES.filter((p) => {
      const cur = phases.find((x) => x.id === p.id)
      return !cur || cur.title === OLD_PHASE_TITLES[p.id]
    }).map((p) => ({ ...p })),
  )

  // Alte Standard-Ziele auf die neuen Vorlagen umstellen
  const goals = store.list('goals')
  const replace: Record<string, string> = { 'songs-6': 'songs-10', proberoutine: 'mittwochs-session', 'set-30': 'set-40' }
  for (const g of goals) {
    const to = g.templateId && replace[g.templateId]
    if (to && !goals.some((x) => x.templateId === to)) {
      const t = TEMPLATE_BY_ID[to]
      store.put('goals', { ...goalFromTemplate(t, g.focus || !!t.focus), id: g.id, status: g.status, ownerIds: g.ownerIds, due: g.due })
    }
  }
  // Neue Start-Ziele ergänzen
  const after = store.list('goals')
  const missing = TEMPLATES.filter((t) => t.seed && !after.some((g) => g.templateId === t.id))
  store.putMany('goals', missing.map((t) => goalFromTemplate(t, !!t.focus)))
  // Fokus auf max. 3 begrenzen: unberührte Bandvertrag-Fokus-Markierung zurücknehmen
  const bv = store.list('goals').find((g) => g.templateId === 'bandvertrag' && g.focus && g.status === 'offen')
  if (bv && store.list('goals').filter((g) => g.focus && g.status !== 'erledigt').length > 3) store.put('goals', { id: bv.id, focus: false })

  // Mitglieder (nur wenn noch keine angelegt sind)
  if (!store.list('members').length) {
    store.putMany('members', [
      { name: 'Janni', roles: 'Gesang (Screams, Cleans, Rap)', responsibilities: '', color: '#eab308' },
      { name: 'Chris', roles: 'Bass', responsibilities: '', color: '#3b82f6' },
      { name: 'Kevin', roles: 'Gitarre', responsibilities: '', color: '#dc2626' },
    ])
  }

  // Wöchentliche Songwriting-Session am Mittwoch
  if (!store.list('events').some((e) => e.key === 'mittwoch')) {
    store.put('events', {
      key: 'mittwoch',
      title: 'Songwriting-Session im Studio',
      type: 'probe',
      date: nextWednesday(),
      time: '',
      repeat: 'weekly',
      repeatUntil: '',
      skipDates: [],
      notes: 'Agenda-Vorschlag: 1 Song Feinschliff Instrumental · 1 Song Vocals · 15 Min. Orga/Roadmap · Bounce in Song-Karte verlinken · 2–3 Clips für Social Media.',
    })
  }

  // Kontakte aus der Region
  const contacts = store.list('contacts')
  store.putMany(
    'contacts',
    STUTTGART_CONTACTS.filter((c) => !contacts.some((x) => x.name === c.name)).map((c) => ({ email: '', phone: '', web: '', lastContact: '', ...c })),
  )

  // v3: Namen der Mitglieder, Drummer-Suche, Pop-Stipendium im Fokus
  const names: Record<string, { name: string; roles: string }> = {
    Gesang: { name: 'Janni', roles: 'Gesang (Screams, Cleans, Rap)' },
    Bass: { name: 'Chris', roles: 'Bass' },
    Gitarre: { name: 'Kevin', roles: 'Gitarre' },
  }
  store.putMany(
    'members',
    store
      .list('members')
      .filter((m) => names[m.name])
      .map((m) => ({ id: m.id, ...names[m.name] })),
  )
  const drums = store.list('goals').find((g) => g.templateId === 'besetzung-drums')
  if (drums && drums.status !== 'erledigt' && !drums.tasks.some((t) => t.done)) {
    const t = TEMPLATE_BY_ID['besetzung-drums']
    store.put('goals', { ...goalFromTemplate(t, true), id: drums.id, status: drums.status === 'offen' ? 'aktiv' : drums.status, ownerIds: drums.ownerIds, due: drums.due })
  }
  const stip = store.list('goals').find((g) => g.templateId === 'popstipendium')
  if (stip && !stip.focus && stip.status !== 'erledigt') store.put('goals', { id: stip.id, focus: true })
  const vp = store.list('goals').find((g) => g.templateId === 'vocal-pipeline')
  if (vp && vp.focus && vp.status === 'offen') store.put('goals', { id: vp.id, focus: false })

  store.put('settings', {
    id: 'settings',
    coachMode: settings?.coachMode ?? 'auto',
    genre: settings?.genre || 'Modern Metalcore × Electronic × Trap/Rap',
    hometown: settings?.hometown || 'Region Stuttgart',
    profileVersion: PROFILE_VERSION,
  })
}

export function seedInitialData(bandName = '') {
  store.putMany('phases', PHASES.map((p) => ({ ...p })))
  store.putMany('goals', TEMPLATES.filter((t) => t.seed).map((t) => goalFromTemplate(t, !!t.focus)))
  for (const g of Object.keys(CHECKLISTS)) seedChecklist(g)
  const s: Partial<CollectionMap['settings']> = {
    id: 'settings',
    bandName,
    genre: '',
    hometown: '',
    dismissedSuggestions: [],
    lastReview: Date.now(),
    seeded: true,
    monthlyFee: null,
    profileVersion: 0,
  }
  store.put('settings', s)
  applyBandProfile()
}

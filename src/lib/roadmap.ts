// Roadmap-Wissen: Phasen, Ziel-Vorlagen mit Begründung und Bedingungen,
// sowie die Start-Daten für eine Band, die noch nichts veröffentlicht hat.
import type { Area, ChecklistItem, CollectionMap, Goal, Phase, ReleaseTask, ReleaseType } from '../types'
import { stageAtLeast } from './constants'
import { store, uid } from './store'

export const PHASES: (Omit<Phase, 'id'> & { id: string })[] = [
  {
    id: 'phase-fundament',
    order: 1,
    title: 'Fundament',
    horizon: '0–3 Monate',
    description: 'Wer seid ihr, wie arbeitet ihr zusammen? Regeln, Rollen, Name, Identität – damit später nichts an Organisation oder Streit scheitert.',
  },
  {
    id: 'phase-songs',
    order: 2,
    title: 'Songs & Live-Set',
    horizon: '0–6 Monate',
    description: 'Songs zur Bühnenreife bringen und ein sicheres 30-Minuten-Set aufbauen. Qualität vor Masse.',
  },
  {
    id: 'phase-buehne',
    order: 3,
    title: 'Bühne & Netzwerk',
    horizon: '3–9 Monate',
    description: 'Erste Gigs, Songs live testen, Kontakte zu Venues, Veranstaltern und anderen Bands aufbauen.',
  },
  {
    id: 'phase-release',
    order: 4,
    title: 'Debüt-Release',
    horizon: '6–12 Monate',
    description: 'Die stärksten (live erprobten) Songs aufnehmen und mit einer geplanten Kampagne veröffentlichen.',
  },
  {
    id: 'phase-wachstum',
    order: 5,
    title: 'Reichweite & Wachstum',
    horizon: '12+ Monate',
    description: 'Regionale Shows, Merch, Festivals, Contests, Förderung – und das nächste, größere Release.',
  },
]

export interface Ctx {
  songsTotal: number
  songsAtLeast: (stage: Parameters<typeof stageAtLeast>[1]) => number
  songsWithClick: number
  songsWithMeta: number
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
    songsWithClick: active.filter((s) => s.click && stageAtLeast(s.stage, 'probereif')).length,
    songsWithMeta: active.filter((s) => s.bpm && s.tuning && s.durationSec).length,
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
    id: 'bandvertrag',
    phaseId: 'phase-fundament',
    area: 'business',
    title: 'Band-Vereinbarung (GbR) schriftlich festhalten',
    description: 'Die wichtigsten Regeln eurer Zusammenarbeit auf 1–2 Seiten festhalten und von allen unterschreiben lassen.',
    why: 'Sobald ihr gemeinsam z.B. einen Proberaum mietet, eine Bandkasse führt oder Gigs spielt, seid ihr rechtlich in der Regel eine GbR. Ohne Vertrag gelten die gesetzlichen Regeln (u.a. gleiche Anteile, gemeinsame Haftung). Klare Absprachen jetzt verhindern Streit, wenn später Geld, Namensrechte oder ein Ausstieg Thema werden. Für komplexere Fälle lohnt sich ein kurzer Check durch eine Fachanwältin/einen Fachanwalt.',
    tasks: [
      'Verteilung von Einnahmen und Kosten festlegen',
      'Bandkasse & Mitgliedsbeiträge regeln',
      'Wem gehört welches Equipment? (privat vs. Band)',
      'Regel für Songwriting-Credits / GEMA-Anteile festlegen',
      'Rechte an Bandname & Logo bei Ausstieg klären',
      'Ein- und Ausstieg von Mitgliedern regeln',
      'Wie werden Entscheidungen getroffen? (Mehrheit / einstimmig)',
      'Von allen unterschreiben lassen',
    ],
    when: () => true,
    priority: 2,
    seed: true,
    focus: true,
  },
  {
    id: 'bandkasse',
    phaseId: 'phase-fundament',
    area: 'finanzen',
    title: 'Bandkasse & monatlichen Beitrag einführen',
    description: 'Ein gemeinsames Budget für Proberaum, Aufnahmen, Merch und Promo – planbar statt spontan.',
    why: 'Recording, Artwork, Fotos und die erste Merch-Auflage kosten schnell vierstellig. Ein fester Beitrag (z.B. Proberaummiete + Rücklage) baut das Budget für das Debüt-Release auf, ohne dass vorher jemand privat in Vorleistung gehen muss.',
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
    description: 'Jede:r übernimmt einen Bereich: z.B. Booking, Social Media, Kasse, Merch, Technik, Termine.',
    why: 'In Bands bleibt die Organisation sonst an ein bis zwei Personen hängen – das bremst und frustriert. Feste Zuständigkeiten plus ein kurzes, regelmäßiges Band-Meeting sorgen dafür, dass die Roadmap tatsächlich vorankommt.',
    tasks: ['Bereiche definieren', 'Zuständigkeiten bei den Mitgliedern eintragen', 'Monatliches Band-Meeting (30–45 Min.) mit Roadmap-Check festlegen'],
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
    why: 'Gleichnamige Bands führen zu Verwechslungen auf Spotify (falsches Künstlerprofil!), in Suchmaschinen und im schlimmsten Fall zu rechtlichen Problemen. Je früher geprüft, desto billiger ist eine Umbenennung.',
    tasks: [
      'Encyclopaedia Metallum (metal-archives.com) durchsuchen',
      'Spotify, Bandcamp, YouTube, Instagram durchsuchen',
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
    why: 'Veranstalter, Presse und Fans brauchen eine schnelle Einordnung: Subgenre, Referenzbands ("für Fans von …"), Themen, Ästhetik. Diese Basis steuert Logo, Fotos, Bio, Booking-Ziele und welche Bands ihr als Partner ansprecht.',
    tasks: ['Subgenre in einem Satz beschreiben', '3–5 Referenzbands festlegen ("für Fans von …")', 'Lyrische Themen sammeln', 'Visuelle Ästhetik / Moodboard (Farben, Bildsprache)', 'Kurz-Bio (3 Sätze) schreiben'],
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
    why: 'Metal-Logos sind Erkennungszeichen und fast immer das erste Merch-Motiv. Auf Plakaten und Line-ups muss euer Name aber lesbar sein – deshalb lohnt sich zusätzlich eine klare Schrift-Variante. Vektorformate sparen später Ärger mit Druckereien.',
    tasks: ['Briefing für Designer:in (Referenzen, Moodboard)', 'Signature-Logo', 'Lesbare Schrift-Variante', 'Vektorformate (SVG/PDF) + PNG transparent', 'Einfarbige Versionen (Schwarz/Weiß) für Merch'],
    when: (c) => started(c, 'identitaet'),
    trigger: () => 'Eure Identität ist in Arbeit – jetzt kann das Logo darauf aufbauen.',
    priority: 4,
  },
  {
    id: 'equipment',
    phaseId: 'phase-fundament',
    area: 'business',
    title: 'Equipment-Inventar & Versicherung prüfen',
    description: 'Liste aller Instrumente und Geräte mit Seriennummer und Wert; Versicherungsschutz klären.',
    why: 'Proberaum-Einbrüche und Diebstähle bei Gigs kommen leider vor. Viele Hausratversicherungen decken Instrumente außerhalb der Wohnung nicht ab. Eine Liste mit Seriennummern und Fotos hilft bei Polizei und Versicherung.',
    tasks: ['Inventarliste mit Seriennummern & Neuwert', 'Fotos von allem', 'Versicherungsschutz prüfen (Hausrat / Instrumentenversicherung)'],
    when: () => true,
    priority: 8,
  },
  // ---------------- Songs ----------------
  {
    id: 'songs-6',
    phaseId: 'phase-songs',
    area: 'songwriting',
    title: '6–8 Songs auf Probe-Reife bringen',
    description: 'Genug sichere Songs für ein erstes 30-Minuten-Set.',
    why: 'Typische Opener- und Support-Slots dauern 25–40 Minuten. Mit 6–8 Songs, die jede:r sicher spielt, könnt ihr erste Gig-Angebote annehmen. Lieber wenige Songs wirklich fertig als viele halbfertig – nutzt die Song-Pipeline, um Engpässe zu erkennen.',
    tasks: [],
    when: () => true,
    metric: (c) => ({ value: c.songsAtLeast('probereif'), target: 6, label: 'Songs probe-reif' }),
    priority: 1,
    seed: true,
    focus: true,
  },
  {
    id: 'proberoutine',
    phaseId: 'phase-songs',
    area: 'songwriting',
    title: 'Feste Proberoutine mit Ziel pro Probe',
    description: 'Regelmäßiger Probetermin mit kurzer Agenda – und jede Probe wird mitgeschnitten.',
    why: 'Strukturierte Proben bringen Songs deutlich schneller zur Reife als "einfach mal jammen". Bewährt: ein Song wird neu erarbeitet, ein Song wird feingeschliffen, am Ende das Set am Stück. Handy-Mitschnitte zeigen, was wirklich funktioniert.',
    tasks: ['Festen Probetag festlegen', 'Proben im Kalender eintragen', 'Agenda pro Probe (vorher in der Band-Gruppe teilen)', 'Jede Probe per Handy/Recorder mitschneiden'],
    when: () => true,
    priority: 2,
    seed: true,
  },
  {
    id: 'songwriting-pipeline',
    phaseId: 'phase-songs',
    area: 'songwriting',
    title: 'Song-Pipeline füllen (10+ Songs/Ideen)',
    description: 'Regelmäßige Songwriting-Sessions, damit immer neues Material nachkommt.',
    why: 'Für Set und Debüt braucht ihr mehr Material, als ihr am Ende veröffentlicht – die stärksten Songs setzen sich durch. Ideen (Riffs, Memos) sofort in der App erfassen, damit nichts verloren geht.',
    tasks: ['Alle vorhandenen Riffs/Memos als Songs/Ideen erfassen', 'Feste Songwriting-Session (z.B. alle 2 Wochen)', 'Ideen regelmäßig sichten und 1–2 zum Ausarbeiten auswählen'],
    when: (c) => c.songsTotal < 10,
    metric: (c) => ({ value: c.songsTotal, target: 10, label: 'Songs & Ideen' }),
    trigger: (c) => `Aktuell ${c.songsTotal} Songs/Ideen in der Pipeline.`,
    priority: 4,
  },
  {
    id: 'demos',
    phaseId: 'phase-songs',
    area: 'songwriting',
    title: 'Proberaum-Demos aller Songs aufnehmen',
    description: 'Von jedem Song eine brauchbare Aufnahme, auf die alle zugreifen können.',
    why: 'Mitschnitte zeigen Schwächen in Arrangement und Timing, die man beim Spielen nicht hört. Sie sind die Basis für Lyrics- und Vocal-Arbeit, für Feedback von außen und für erste Booking-Anfragen.',
    tasks: ['Recorder (z.B. Zoom) oder Interface organisieren', 'Demo-Link in jeder Song-Karte hinterlegen', 'Gemeinsame Hör-Session mit Notizen pro Song'],
    when: (c) => c.songsAtLeast('skizze') >= 3,
    trigger: (c) => `${c.songsAtLeast('skizze')} Songs sind mindestens skizziert.`,
    priority: 3,
  },
  {
    id: 'click',
    phaseId: 'phase-songs',
    area: 'songwriting',
    title: 'Songs zum Click / Metronom proben',
    description: 'Alle probe-reifen Songs mindestens einmal komplett zum Click spielen können.',
    why: 'Im Studio wird im Metal fast immer zum Click aufgenommen – Bands, die das vorher nicht geübt haben, verlieren dort teure Studiozeit. Live braucht ihr den Click, sobald Intros, Samples oder Backing-Tracks dazukommen. Nebeneffekt: Tempi werden stabil.',
    tasks: ['BPM für jeden Song festlegen', 'Click-Lösung für den Proberaum (Drummer-Kopfhörer)', 'Song für Song zum Click festigen (in Song-Karte abhaken)'],
    when: (c) => c.songsAtLeast('probereif') >= 3,
    metric: (c) => ({ value: c.songsWithClick, target: Math.max(c.songsAtLeast('probereif'), 1), label: 'probe-reife Songs mit Click' }),
    priority: 4,
  },
  {
    id: 'songdaten',
    phaseId: 'phase-songs',
    area: 'songwriting',
    title: 'Tempo, Tuning & Länge jedes Songs dokumentieren',
    description: 'Für jeden Song BPM, Tuning und Dauer in der App eintragen.',
    why: 'Setlist-Planung (Tuning-Wechsel = Gitarrenwechsel!), Slot-Längen, Click-Tracks und Studioplanung brauchen diese Daten. Spätestens beim Distributor (Länge) und bei der GEMA (Credits) müsst ihr sie ohnehin parat haben.',
    tasks: [],
    when: (c) => c.songsAtLeast('arrangement') >= 2,
    metric: (c) => ({ value: c.songsWithMeta, target: Math.max(c.songsAtLeast('arrangement'), 1), label: 'Songs mit BPM/Tuning/Länge' }),
    priority: 6,
  },
  // ---------------- Bühne ----------------
  {
    id: 'set-30',
    phaseId: 'phase-buehne',
    area: 'live',
    title: '30-Minuten-Set zusammenstellen & durchproben',
    description: 'Eine feste Setlist, die ihr am Stück und ohne Pausen sicher spielt.',
    why: 'Ein Set ist mehr als die Summe der Songs: Übergänge, Ansagen, Tuning-Wechsel, Dramaturgie (starker Opener, stärkster Song am Ende) und Kondition. Wer das Set mehrfach am Stück geprobt hat, wirkt beim ersten Gig souverän.',
    tasks: ['Setlist in einem Gig oder als Probe-Set anlegen', 'Dramaturgie: starker Opener, stärkster Song zum Schluss', 'Übergänge und Ansagen planen', 'Set 3× am Stück mit Stoppuhr durchspielen'],
    when: (c) => c.songsAtLeast('probereif') >= 5,
    trigger: (c) => `Ihr habt ${c.songsAtLeast('probereif')} probe-reife Songs – genug für ein erstes Set.`,
    priority: 2,
  },
  {
    id: 'erste-gigs',
    phaseId: 'phase-buehne',
    area: 'live',
    title: 'Die ersten 3 Gigs spielen',
    description: 'Realistische Einstiege: Support für lokale Bands, Jugendzentren, Metal-Kneipen, Open-Stage- und Bandnächte.',
    why: 'Live-Erfahrung ist durch nichts zu ersetzen – und ihr lernt, welche Songs beim Publikum zünden. Genau das ist die beste Grundlage für die Auswahl eurer Debüt-Songs. Vorsicht bei "Pay-to-Play"-Angeboten (Ticketvorverkauf auf eigenes Risiko o.ä.) – die lohnen sich für neue Bands fast nie.',
    tasks: ['10 lokale Venues/Veranstalter in den Kontakten sammeln', 'Kurze Anfrage-Mail mit Proberaum-Demo vorbereiten', 'Lokale Bands wegen Support/Gig-Tausch ansprechen', 'Freunde & Familie als erstes Publikum mobilisieren'],
    when: (c) => c.songsAtLeast('probereif') >= 5 || started(c, 'set-30'),
    metric: (c) => ({ value: c.gigsPlayed, target: 3, label: 'Gigs gespielt' }),
    priority: 1,
  },
  {
    id: 'netzwerk-bands',
    phaseId: 'phase-buehne',
    area: 'live',
    title: 'Netzwerk mit 5 lokalen/regionalen Bands aufbauen',
    description: 'Bands aus eurer Szene kennenlernen, auf ihre Shows gehen, gemeinsame Abende planen.',
    why: 'Gig-Tausch ist der realistischste Weg für unbekannte Bands, auch außerhalb der Heimatstadt zu spielen: Ihr holt sie in eure Stadt, sie holen euch in ihre. Außerdem teilt man Backline, Kontakte und Publikum.',
    tasks: ['Auf lokale Metal-Shows gehen und Kontakte knüpfen', 'Bands in den Kontakten erfassen', 'Einen gemeinsamen Abend organisieren'],
    when: () => true,
    metric: (c) => ({ value: c.contactsOfType('band'), target: 5, label: 'Band-Kontakte' }),
    priority: 5,
  },
  {
    id: 'stageplot',
    phaseId: 'phase-buehne',
    area: 'live',
    title: 'Stage Plot & Technik-Rider erstellen',
    description: 'Eine Seite mit Bühnenaufbau, Kanalliste und euren Anforderungen.',
    why: 'Veranstalter und Tontechnik müssen vorab wissen, was ihr braucht (Kanäle, Monitore, was ihr an Backline teilen könnt). Bands, die das sauber liefern, sorgen für entspannte Soundchecks – und werden eher wieder gebucht. Die Live-Checkliste im Bereich "Live" hilft dabei.',
    tasks: ['Stage Plot zeichnen (Positionen, Amps, Monitore)', 'Kanalliste (Input List)', 'Backline: was bringt ihr, was kann geteilt werden?', 'Als PDF im EPK ablegen'],
    when: (c) => c.gigsUpcoming > 0 || c.gigsPlayed > 0 || started(c, 'erste-gigs'),
    trigger: (c) => (c.gigsUpcoming ? `${c.gigsUpcoming} Gig(s) stehen an.` : ''),
    priority: 3,
  },
  {
    id: 'live-video',
    phaseId: 'phase-buehne',
    area: 'promo',
    title: 'Ein gutes Live-Video aufnehmen',
    description: 'Mindestens ein Song live mit ordentlichem Ton und mehreren Kamerawinkeln.',
    why: 'Promoter und Festivals wollen sehen, wie ihr live wirkt – ein guter Live-Clip ist fürs Booking oft wichtiger als ein Studio-Song. Entscheidend ist der Ton: Pult-Mitschnitt oder separater Recorder statt Handy-Mikro.',
    tasks: ['2–3 Kameras/Handys + Leute organisieren', 'Separate Tonaufnahme (Pult oder Recorder)', 'Einen Song schneiden und veröffentlichen'],
    when: (c) => c.gigsPlayed >= 1 || c.gigsUpcoming >= 1,
    priority: 3,
  },
  {
    id: 'regional',
    phaseId: 'phase-wachstum',
    area: 'live',
    title: 'In 3 verschiedenen Städten spielen',
    description: 'Raus aus der Heimatstadt – über Gig-Tausch und regionale Veranstalter.',
    why: 'Neue Städte bringen neues Publikum, neue Kontakte und zeigen Veranstaltern, dass ihr mehr seid als eine lokale Band. Das ist ein wichtiger Nachweis für Festivals und Booking-Agenturen.',
    tasks: ['Partner-Bands aus anderen Städten ansprechen', 'Veranstalter in 2–3 Nachbarstädten anfragen', 'Fahrtkosten in der Kalkulation einplanen'],
    when: (c) => c.gigsPlayed >= 3,
    metric: (c) => ({ value: c.citiesPlayed, target: 3, label: 'Städte bespielt' }),
    priority: 3,
  },
  // ---------------- Release ----------------
  {
    id: 'debut-plan',
    phaseId: 'phase-release',
    area: 'release',
    title: 'Debüt-Release planen (Single oder EP)',
    description: 'Format, Songs, Budget und Studio festlegen und das Release im Bereich "Releases" anlegen.',
    why: 'Ohne Aufnahmen keine Playlists, keine Presse und kaum Booking außerhalb eurer Stadt. Für eine neue Band sind 1–2 Singles oder eine EP mit 3–5 Songs realistischer als ein Album: geringeres Budget, schneller fertig, mehrere Release-Momente. Nehmt die Songs, die live am besten funktionieren.',
    tasks: ['Format entscheiden (Singles vs. EP)', 'Songs auswählen – welche zünden live?', 'Budget festlegen (Bandkasse!)', '2–3 Angebote von Studios/Produzent:innen einholen', 'Release im Bereich "Releases" anlegen'],
    when: (c) => c.songsAtLeast('liveerprobt') >= 2 || c.songsAtLeast('probereif') >= 6,
    trigger: (c) => `${c.songsAtLeast('liveerprobt')} live erprobte, ${c.songsAtLeast('probereif')} probe-reife Songs – genug Material für ein erstes Release.`,
    priority: 2,
  },
  {
    id: 'preproduction',
    phaseId: 'phase-release',
    area: 'release',
    title: 'Pre-Production vor dem Studio',
    description: 'Arrangements, Tempi, Tunings und Vocals final festzurren, bevor das Studio-Geld fließt.',
    why: 'Im Studio kostet jede Stunde. Wer mit finalen Demos zum Click, festen Referenz-Tracks für den Sound und vorbereitetem Gear ankommt, nimmt schneller und besser auf. Referenz-Tracks geben Produzent, Mix und Master ein gemeinsames Ziel.',
    tasks: ['Finale Demos zum Click', 'Referenz-Tracks für den Sound festlegen', 'Lyrics final & ausgedruckt', 'Gear-Check: Saiten, Felle, Setup/Intonation', 'Zeitplan mit dem Studio abstimmen'],
    when: (c) => c.releasesPlanned > 0,
    priority: 2,
  },
  {
    id: 'artwork-fotos',
    phaseId: 'phase-release',
    area: 'promo',
    title: 'Artwork & Pressefotos',
    description: 'Cover (mind. 3000×3000 px) und ein Set professioneller Bandfotos.',
    why: 'Das Cover ist auf Bandcamp, Spotify und Merch euer Aushängeschild. Pressefotos (quer und hoch, hohe Auflösung, mit Fotocredit) brauchen Presse und Veranstalter für Ankündigungen – ohne sie wird oft gar nicht berichtet.',
    tasks: ['Cover-Briefing & Artist beauftragen', 'Foto-Shooting planen (Kalender)', 'Fotos quer & hoch, mit Fotocredit', 'Dateien im EPK-Ordner ablegen'],
    when: (c) => c.releasesPlanned > 0 || started(c, 'debut-plan'),
    priority: 3,
  },
  {
    id: 'plattformen',
    phaseId: 'phase-release',
    area: 'release',
    title: 'Vertrieb & Plattformen einrichten',
    description: 'Digitalvertrieb wählen, Bandcamp aufsetzen, Künstlerprofile beanspruchen.',
    why: 'Ein Digitalvertrieb bringt euch auf Spotify, Apple Music & Co. (Gebührenmodelle vergleichen: Jahresabo vs. pro Release vs. Umsatzbeteiligung). Bandcamp betreibt ihr selbst – in der Metal-Szene ist es besonders wichtig für Direktverkäufe, Vinyl/Tapes und Merch. Nach dem ersten Upload Spotify for Artists beanspruchen, um pitchen zu können.',
    tasks: ['Distributoren vergleichen und auswählen', 'Bandcamp-Seite einrichten', 'Spotify for Artists & Apple Music for Artists beanspruchen', 'ISRC-Codes in den Song-Karten notieren'],
    when: (c) => c.releasesPlanned > 0,
    priority: 3,
  },
  {
    id: 'gema',
    phaseId: 'phase-release',
    area: 'business',
    title: 'GEMA & GVL: Entscheidung treffen',
    description: 'Credits klären und abwägen, ob und wann eine Mitgliedschaft sinnvoll ist.',
    why: 'Die GEMA vertritt Urheber:innen (Komposition & Text) – Ausschüttungen gibt es z.B. für Radio, Streams und Live-Auftritte (Setlisten einreichen!). Eine Mitgliedschaft hat aber Konsequenzen (u.a. Beiträge, alle Werke laufen über die GEMA). Wichtig: Autoren sind immer Personen, nicht "die Band" – klärt daher vorher die Anteile pro Song. Die GVL ist für ausübende Künstler:innen und wird ab Veröffentlichungen relevant.',
    tasks: ['Credits/Anteile je Song in den Song-Karten festhalten', 'Vor- und Nachteile einer GEMA-Mitgliedschaft abwägen', 'Ggf. Mitgliedschaft beantragen & Werke anmelden', 'Nach Gigs Setlisten melden', 'GVL-Anmeldung nach dem ersten Release prüfen'],
    when: (c) => c.releasesPlanned > 0 || c.gigsPlayed >= 3,
    priority: 5,
  },
  // ---------------- Promo ----------------
  {
    id: 'social-routine',
    phaseId: 'phase-buehne',
    area: 'promo',
    title: 'Social-Media-Routine (2–3 Posts pro Woche)',
    description: 'Wenige Plattformen, feste Content-Säulen, klare Zuständigkeit.',
    why: 'Kontinuität schlägt Perfektion. Behind-the-Scenes aus Proberaum und Studio, Riff-Snippets, Gear und Playthrough-Clips kosten wenig und bauen schon vor dem ersten Release ein Publikum auf – das dann am Release-Tag zuhört. Kurzvideos (Reels/Shorts/TikTok) bringen aktuell die meiste neue Reichweite.',
    tasks: ['Plattformen festlegen (z.B. Instagram + YouTube Shorts/TikTok)', '3–4 Content-Säulen definieren', 'Content-Plan im Bereich "Promo" pflegen', 'Wöchentlich zuständige Person festlegen'],
    when: (c) => started(c, 'name-check'),
    trigger: () => 'Eure Handles sind (bald) gesichert – Zeit, sie zu füllen.',
    priority: 4,
  },
  {
    id: 'mailingliste',
    phaseId: 'phase-buehne',
    area: 'promo',
    title: 'Fan-Mailingliste starten',
    description: 'Ein eigener Kanal zu euren Fans – unabhängig von Algorithmen.',
    why: 'Follower gehören der Plattform, E-Mail-Adressen gehören euch. Gerade zum Release, für Vorbestellungen und Gig-Ankündigungen ist die Liste Gold wert. Sammelt Adressen am Merchstand per QR-Code und über Bandcamp.',
    tasks: ['Newsletter-Tool wählen (Datenschutz/Double-Opt-in beachten)', 'QR-Code für Merchstand & Bühne', 'Bandcamp-Follower einbeziehen'],
    when: (c) => c.gigsPlayed >= 1 || c.releasesPlanned > 0,
    priority: 6,
  },
  {
    id: 'epk',
    phaseId: 'phase-release',
    area: 'promo',
    title: 'EPK (Electronic Press Kit) erstellen',
    description: 'Eine Seite/ein Ordner mit allem, was Presse und Veranstalter brauchen.',
    why: 'Veranstalter und Presse entscheiden in Sekunden. Test: Findet jemand Fremdes in 30 Sekunden euren aktuellen Song, ein Pressefoto und eure Kontaktdaten? Die EPK-Checkliste im Bereich "Promo" führt euch durch alle Bestandteile.',
    tasks: ['EPK-Checkliste im Bereich "Promo" abarbeiten', 'Als Webseite oder geteilter Ordner veröffentlichen', '30-Sekunden-Test mit Außenstehenden'],
    when: (c) => c.releasesPlanned > 0 || c.gigsPlayed >= 2,
    priority: 3,
  },
  {
    id: 'presse',
    phaseId: 'phase-release',
    area: 'promo',
    title: 'Presse, Webzines & Podcasts anschreiben',
    description: 'Eine Liste von 15–30 passenden Medien aufbauen und rechtzeitig vor dem Release kontaktieren.',
    why: 'Metal-Webzines, Blogs, Podcasts, Uni-Radios und Lokalpresse sind für Newcomer gut erreichbar. Kurze persönliche Mails mit privatem Stream-Link 4–6 Wochen vor Release wirken besser als Massenmails.',
    tasks: ['Passende Medien in den Kontakten sammeln', 'Pressetext & Mail-Vorlage', 'Persönlich anschreiben (4–6 Wochen vor Release)', 'Nachfassen nach ca. 1 Woche'],
    when: (c) => c.releasesWithDate > 0,
    metric: (c) => ({ value: c.contactsOfType('presse'), target: 15, label: 'Presse-Kontakte' }),
    priority: 3,
  },
  // ---------------- Merch & Wachstum ----------------
  {
    id: 'merch-start',
    phaseId: 'phase-wachstum',
    area: 'merch',
    title: 'Kleine erste Merch-Auflage',
    description: 'Sticker, Patches und ein Shirt-Motiv – klein starten, Risiko begrenzen.',
    why: 'Merch ist für kleine Bands oft die wichtigste Einnahme pro Gig. Wer klein startet (z.B. Logo-Shirt in Schwarz, Sticker, Patches), vermeidet Kisten voller unverkaufter Größen. Vorbestellungen im Freundes- und Fankreis finanzieren die Auflage vor. Kartenzahlung am Stand erhöht den Umsatz spürbar.',
    tasks: ['Motiv festlegen (meist Logo-Shirt)', 'Angebote von 2–3 Druckereien einholen', 'Vorbestellung im Umfeld', 'Sinnvollen Größenmix bestellen', 'Kartenleser + Preisliste für den Merchstand'],
    when: (c) => c.gigsPlayed >= 2 || c.gigsUpcoming >= 2,
    priority: 4,
  },
  {
    id: 'foerderung',
    phaseId: 'phase-wachstum',
    area: 'finanzen',
    title: 'Förderprogramme recherchieren',
    description: 'Lokale und bundesweite Förderungen für Produktion, Live und Proberaum prüfen.',
    why: 'Viele Städte und Länder haben Popbüros, Kulturämter oder Programme für Nachwuchsbands (Produktion, Auftritte, Proberäume). Die Initiative Musik fördert bundesweit Nachwuchskünstler:innen – Anträge brauchen einen Kostenplan und Vorlauf. Lokale Programme sind für den Start meist realistischer; Fristen unbedingt im Kalender eintragen.',
    tasks: ['Lokales Popbüro / Kulturamt kontaktieren', 'Aktuelle Ausschreibungen & Fristen notieren', 'Kostenplan aus dem Release-Budget ableiten'],
    when: (c) => c.releasesPlanned > 0 || done(c, 'debut-plan'),
    priority: 5,
  },
  {
    id: 'festivals',
    phaseId: 'phase-wachstum',
    area: 'live',
    title: 'Bei kleinen/regionalen Metal-Festivals bewerben',
    description: 'Eine Liste passender Festivals mit Bewerbungszeiträumen pflegen.',
    why: 'Kleinere Festivals buchen gern regionale Newcomer – die Bewerbungsphase liegt oft im Herbst/Winter für die nächste Saison. Voraussetzungen: veröffentlichte Musik, Live-Video, EPK und eine Handvoll Referenz-Gigs.',
    tasks: ['10 passende regionale Festivals recherchieren', 'Bewerbungszeiträume im Kalender eintragen', 'EPK aktualisieren', 'Bewerbungen verschicken & nachhalten'],
    when: (c) => c.releasesReleased >= 1 && c.gigsPlayed >= 5,
    priority: 3,
  },
  {
    id: 'metal-battle',
    phaseId: 'phase-wachstum',
    area: 'live',
    title: 'Für Wacken Metal Battle & Band-Contests bewerben',
    description: 'Nationale Vorentscheide des Metal Battle oder vergleichbare Newcomer-Contests.',
    why: 'Der Metal Battle richtet sich an unsignierte Bands; Gewinner:innen der nationalen Vorentscheide spielen in Wacken. Reisekosten trägt in der Regel die Band selbst. Ohne gute Aufnahmen und Live-Video sind die Chancen gering – daher erst nach dem Debüt sinnvoll. Bei anderen Contests auf Teilnahmegebühren und Pay-to-Play achten.',
    tasks: ['Aktuelle Ausschreibung & Frist recherchieren', 'EPK & Live-Video aktualisieren', 'Bewerbung einreichen'],
    when: (c) => c.releasesReleased >= 1 && c.gigsPlayed >= 5,
    priority: 5,
  },
  {
    id: 'naechstes-release',
    phaseId: 'phase-wachstum',
    area: 'release',
    title: 'Nächstes Release planen (EP/Album)',
    description: 'Aus den Erfahrungen des Debüts das nächste, größere Release planen.',
    why: 'Regelmäßige Veröffentlichungen halten euch im Gespräch. Mit Live-Erfahrung, Kontakten und einer ersten Fanbase lohnt sich ein größeres Projekt – inklusive physischer Formate (CD, Tape, Vinyl), die in der Metal-Szene gefragt sind.',
    tasks: ['Learnings vom Debüt auswerten', 'Songauswahl aus der Pipeline', 'Budget & Förderung prüfen', 'Physische Formate kalkulieren'],
    when: (c) => c.releasesReleased >= 1 && c.songsAtLeast('arrangement') >= 4,
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
  return TEMPLATES.filter((t) => !existing.has(t.id) && !dismissed.includes(t.id) && t.when(c))
    .map((t) => {
      const m = t.metric?.(c)
      const reason = t.trigger?.(c) || (m ? `Aktuell: ${m.value}/${m.target} ${m.label}.` : '')
      return { template: t, reason }
    })
    .sort((a, b) => phaseOrder[a.template.phaseId] * 2 + a.template.priority - (phaseOrder[b.template.phaseId] * 2 + b.template.priority))
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
      { group: 'business', section: 'Organisation', title: 'Proberaum vertraglich geregelt', hint: 'Wer ist Mieter:in? Kündigungsfristen? Zugang & Schlüssel?' },
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
      { group: 'live', section: 'Packliste', title: 'Stimmgeräte, In-Ears/Click falls genutzt', hint: '' },
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

// ---------------- Start-Daten ----------------

export function seedInitialData(bandName = '') {
  store.putMany('phases', PHASES.map((p) => ({ ...p })))
  const goals = TEMPLATES.filter((t) => t.seed).map((t) => ({ ...goalFromTemplate(t, !!t.focus) }))
  store.putMany('goals', goals)
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
  }
  store.put('settings', s)
}

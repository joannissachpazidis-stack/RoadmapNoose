# Band Roadmap 🤘

Eine interaktive Roadmap-App für Metal-Bands: Ziele, Songwriting-Pipeline, Releases, Gigs, Promo, Merch, Bandkasse und Organisation an einem Ort, synchron für alle Bandmitglieder. Sie läuft im Browser auf PC und Handy und lässt sich auf dem Homescreen installieren (PWA).

## Bereiche

| Bereich | Wofür |
|---|---|
| **Übersicht** | Aktuelle Phase, Fokus-Ziele, Überfälliges, die nächsten 30 Tage, Song-Pipeline und Vorschläge |
| **Roadmap** | 5 Phasen (Fundament → Songs & Live-Set → Bühne & Netzwerk → Debüt-Release → Reichweite & Wachstum) mit Zielen, Schritten, Verantwortlichen und Terminen |
| **Vorschläge** | Ziel-Vorlagen mit Begründung („Warum?“). Sie erscheinen erst, wenn sie zu eurem Stand passen, z.B. „30-Minuten-Set“ ab 5 probe-reifen Songs oder „Metal Battle“ erst nach dem ersten Release und 5 Gigs |
| **Roadmap-Check** | Monatlicher, geführter Check im Band-Meeting: Was ist geschafft? Was ist überfällig? Was liegt seit 30 Tagen still? Fokus für die nächsten 4 Wochen |
| **Songwriting** | Pipeline von *Idee/Riff* über *Arrangement*, *Demo*, *Probe-reif* und *Live erprobt* bis *Veröffentlicht*. Pro Song: Tuning, BPM, Länge, Bausteine, „Wer kann ihn schon?“ pro Mitglied, Lyrics, Credits/GEMA-Anteile, ISRC |
| **Releases** | Single/EP/Album mit Tracklist, Budget und einem automatisch erzeugten Zeitplan, rückwärts gerechnet vom Release-Tag (Master, Artwork, Distributor-Upload, Spotify-Pitch, Presse, …) |
| **Live & Gigs** | Anfragen und Shows, Setlist-Planer (mit Slot-Länge und Hinweis bei Tuning-Wechseln), Nachbereitung mit Learnings, Live-Checkliste. Nach einem Gig werden Songs automatisch „live erprobt“ und Gagen in der Kasse gebucht |
| **Kalender** | Proben, Meetings, Gigs, Ziel-Deadlines und alle Release-Schritte zusammen |
| **Promo & EPK** | Content-Plan (Ziel: 2–3 Posts pro Woche), Content-Ideen, EPK-Checkliste |
| **Merch** | Artikel, Einkaufs- und Verkaufspreis, Marge, Bestand. Verkäufe werden mit einem Klick in der Kasse gebucht |
| **Bandkasse** | Einnahmen und Ausgaben, Monatsbeiträge, Auswertung nach Kategorie, Abgleich mit geplanten Release-Budgets |
| **Band & Orga** | Mitglieder, Instrumente, Zuständigkeiten, Business-Checkliste (Band-GbR, GEMA/GVL, Versicherung, Steuern, Online-Präsenz) |
| **Kontakte** | Venues, Veranstalter, Bands, Studios, Presse, jeweils mit „letzter Kontakt“ und „nächster Schritt“ |

> Hinweis: Rechtliche und steuerliche Hinweise in der App sind Orientierung, keine Rechtsberatung.

## Lokal starten

```bash
npm install
npm run dev
```

Ohne Cloud-Sync speichert die App alles im Browser. Unter *Sync & Einstellungen* kannst du die Daten als Datei exportieren und wieder importieren.

## Cloud-Sync einrichten (einmalig, ca. 10 Minuten)

Damit alle denselben Stand sehen, nutzt die App ein kostenloses [Supabase](https://supabase.com)-Projekt. Das richtet **eine Person** ein:

1. Auf supabase.com registrieren → **New project**. Als Region empfiehlt sich *Frankfurt (eu-central-1)*. Das Datenbank-Passwort sicher aufbewahren.
2. Links **SQL Editor** → *New query* → den kompletten Inhalt von [`supabase/schema.sql`](supabase/schema.sql) einfügen → **Run**.
3. **Authentication → URL Configuration**: Bei *Site URL* die Adresse eintragen, unter der die App läuft (z.B. die GitHub-Pages-URL). Dorthin führen die Bestätigungs-Mails.
   *Optional:* Unter **Authentication → Sign In / Providers → Email** „Confirm email“ ausschalten, dann entfällt die Bestätigungs-Mail beim Registrieren.
4. **Project Settings → API**: *Project URL* und den **anon / publishable key** kopieren. Dieser Schlüssel ist öffentlich und darf in die App. Den `service_role`-Key **niemals** verwenden.
5. Die zwei Werte in der App unter **Sync & Einstellungen** eintragen, registrieren und **Band anlegen**. Die bisherigen lokalen Daten werden dabei übernommen.
6. Den angezeigten **Einladungscode** an die Band schicken. Alle anderen tragen dieselben zwei Werte ein, registrieren sich und treten mit dem Code bei.

Tipp: Wenn die Werte als GitHub-Variablen hinterlegt sind (siehe unten), entfällt Schritt 5/6 „Werte eintragen“ für alle.

Gut zu wissen: Kostenlose Supabase-Projekte werden bei längerer Inaktivität pausiert und lassen sich im Supabase-Dashboard mit einem Klick wieder aufwecken. Die App funktioniert offline weiter und synchronisiert, sobald wieder Verbindung besteht. Bei gleichzeitigen Änderungen am selben Eintrag gewinnt die zuletzt gespeicherte.

## Veröffentlichen (GitHub Pages)

Der Workflow `.github/workflows/deploy.yml` baut die App bei jedem Push auf `main` und veröffentlicht sie.

1. Im Repository **Settings → Pages → Source: GitHub Actions** wählen.
2. *Optional:* **Settings → Secrets and variables → Actions → Variables** anlegen:
   `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`.
3. Auf `main` pushen bzw. mergen. Die URL steht danach unter *Settings → Pages*.

GitHub Pages ist bei **privaten** Repositories nur mit einem kostenpflichtigen GitHub-Plan verfügbar. Kostenlose Alternativen sind Netlify, Vercel oder Cloudflare Pages: Repo verbinden, Build-Befehl `npm run build`, Ausgabeordner `dist`, Umgebungsvariablen wie oben.

**Auf dem Handy installieren:** App im Browser öffnen → *Teilen → Zum Home-Bildschirm* (iOS) bzw. *Menü → App installieren* (Android).

## Technik

React 19, TypeScript, Vite, Tailwind CSS 4 und Supabase (Postgres, Auth, Realtime). Die App arbeitet local-first: Alle Daten liegen als Dokumente im Browser-Speicher, Änderungen gehen an Supabase und kommen per Realtime bei den anderen an. Die Zugriffsrechte sichert Row Level Security in der Datenbank: Nur Mitglieder einer Band sehen deren Daten.

- `src/lib/roadmap.ts`: Phasen, Ziel-Vorlagen mit Bedingungen und Begründungen, Checklisten, Release-Zeitplan
- `src/lib/store.ts`: lokaler Datenspeicher
- `src/lib/sync.ts`: Supabase-Sync, Login und Bands
- `src/pages/*`: die einzelnen Bereiche

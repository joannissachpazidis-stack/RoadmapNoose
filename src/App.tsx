import {
  CalendarDays,
  Cloud,
  CloudOff,
  Contact,
  Disc3,
  Euro,
  Flag,
  LayoutDashboard,
  Megaphone,
  Menu,
  Mic2,
  Music,
  Settings as SettingsIcon,
  Shirt,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { cx } from './components/ui'
import { seedInitialData } from './lib/roadmap'
import { go, useRoute, type Route } from './lib/router'
import { store, useSettings } from './lib/store'
import { useSync } from './lib/sync'
import Calendar from './pages/Calendar'
import Contacts from './pages/Contacts'
import Dashboard from './pages/Dashboard'
import Finance from './pages/Finance'
import Live from './pages/Live'
import Merch from './pages/Merch'
import Orga from './pages/Orga'
import Promo from './pages/Promo'
import Releases from './pages/Releases'
import Roadmap from './pages/Roadmap'
import Settings from './pages/Settings'
import Songs from './pages/Songs'

const NAV: { route: Route; label: string; icon: ReactNode; mobile?: boolean }[] = [
  { route: 'dashboard', label: 'Übersicht', icon: <LayoutDashboard size={18} />, mobile: true },
  { route: 'roadmap', label: 'Roadmap', icon: <Flag size={18} />, mobile: true },
  { route: 'songs', label: 'Songwriting', icon: <Music size={18} />, mobile: true },
  { route: 'releases', label: 'Releases', icon: <Disc3 size={18} /> },
  { route: 'live', label: 'Live & Gigs', icon: <Mic2 size={18} />, mobile: true },
  { route: 'kalender', label: 'Kalender', icon: <CalendarDays size={18} /> },
  { route: 'promo', label: 'Promo & EPK', icon: <Megaphone size={18} /> },
  { route: 'merch', label: 'Merch', icon: <Shirt size={18} /> },
  { route: 'kasse', label: 'Bandkasse', icon: <Euro size={18} /> },
  { route: 'orga', label: 'Band & Orga', icon: <Users size={18} /> },
  { route: 'kontakte', label: 'Kontakte', icon: <Contact size={18} /> },
  { route: 'einstellungen', label: 'Sync & Einstellungen', icon: <SettingsIcon size={18} /> },
]

function SyncBadge() {
  const s = useSync()
  const map: Record<string, { label: string; color: string }> = {
    local: { label: 'Nur lokal', color: 'text-zinc-500' },
    signedout: { label: 'Nicht eingeloggt', color: 'text-yellow-500' },
    noband: { label: 'Keine Band gewählt', color: 'text-yellow-500' },
    connecting: { label: 'Verbinde…', color: 'text-zinc-400' },
    online: { label: s.pending ? `Synchronisiere (${s.pending})` : 'Synchron', color: 'text-green-500' },
    offline: { label: `Offline${s.pending ? ` · ${s.pending} ausstehend` : ''}`, color: 'text-yellow-500' },
    error: { label: 'Sync-Fehler', color: 'text-red-500' },
  }
  const m = map[s.status]
  return (
    <button onClick={() => go('einstellungen')} className={cx('flex items-center gap-1.5 text-xs', m.color)} title={s.error || m.label}>
      {s.status === 'online' ? <Cloud size={14} /> : <CloudOff size={14} />}
      {m.label}
    </button>
  )
}

export default function App() {
  const { route, param } = useRoute()
  const settings = useSettings()
  const sync = useSync()
  const [menu, setMenu] = useState(false)

  // Erststart im lokalen Modus: Start-Roadmap anlegen
  useEffect(() => {
    if (store.scope === 'local' && !store.hasData()) seedInitialData()
  }, [])

  useEffect(() => setMenu(false), [route])

  const bandName = settings?.bandName || sync.activeBand?.name || 'Deine Band'

  let page: ReactNode
  switch (route) {
    case 'roadmap':
      page = <Roadmap param={param} />
      break
    case 'songs':
      page = <Songs param={param} />
      break
    case 'releases':
      page = <Releases param={param} />
      break
    case 'live':
      page = <Live param={param} />
      break
    case 'kalender':
      page = <Calendar />
      break
    case 'promo':
      page = <Promo />
      break
    case 'merch':
      page = <Merch />
      break
    case 'kasse':
      page = <Finance />
      break
    case 'orga':
      page = <Orga />
      break
    case 'kontakte':
      page = <Contacts />
      break
    case 'einstellungen':
      page = <Settings />
      break
    default:
      page = <Dashboard />
  }

  const navList = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((n) => (
        <a
          key={n.route}
          href={'#/' + n.route}
          className={cx('flex items-center gap-3 rounded-md px-3 py-2 text-sm', route === n.route ? 'bg-accent/15 text-white' : 'text-zinc-400 hover:bg-panel2 hover:text-zinc-100')}
        >
          <span className={route === n.route ? 'text-accent' : ''}>{n.icon}</span>
          {n.label}
        </a>
      ))}
    </nav>
  )

  return (
    <div className="min-h-full lg:flex">
      {/* Sidebar Desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-panel px-3 py-4 lg:flex">
        <a href="#/dashboard" className="mb-1 px-3">
          <div className="font-display truncate text-xl text-white">{bandName}</div>
          <div className="text-[11px] uppercase tracking-widest text-accent">Roadmap</div>
        </a>
        <div className="mb-4 px-3">
          <SyncBadge />
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto">{navList}</div>
      </aside>

      {/* Topbar Mobil */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-panel/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="min-w-0">
          <div className="font-display truncate text-lg leading-none text-white">{bandName}</div>
          <SyncBadge />
        </div>
        <button onClick={() => setMenu(true)} className="rounded p-1.5 text-zinc-300 hover:bg-panel2" aria-label="Menü">
          <Menu size={22} />
        </button>
      </header>

      {menu && (
        <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setMenu(false)}>
          <div className="absolute right-0 top-0 h-full w-72 overflow-y-auto border-l border-line bg-panel p-3" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex justify-end">
              <button onClick={() => setMenu(false)} className="rounded p-1.5 text-zinc-300 hover:bg-panel2" aria-label="Schließen">
                <X size={22} />
              </button>
            </div>
            {navList}
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 lg:px-8 lg:pb-10 lg:pt-8">{page}</main>

      {/* Bottom-Nav Mobil */}
      <nav className="pb-safe fixed bottom-0 left-0 right-0 z-30 flex border-t border-line bg-panel/95 backdrop-blur lg:hidden">
        {NAV.filter((n) => n.mobile).map((n) => (
          <a key={n.route} href={'#/' + n.route} className={cx('flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]', route === n.route ? 'text-accent' : 'text-zinc-500')}>
            {n.icon}
            {n.label}
          </a>
        ))}
        <button onClick={() => setMenu(true)} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-zinc-500">
          <Menu size={18} />
          Mehr
        </button>
      </nav>
    </div>
  )
}

import { useEffect, useState } from 'react'

export type Route =
  | 'dashboard'
  | 'roadmap'
  | 'songs'
  | 'releases'
  | 'live'
  | 'kalender'
  | 'promo'
  | 'merch'
  | 'kasse'
  | 'orga'
  | 'kontakte'
  | 'einstellungen'

function parse(): { route: Route; param: string } {
  const h = window.location.hash.replace(/^#\/?/, '')
  const [route, param = ''] = h.split('/')
  return { route: (route || 'dashboard') as Route, param: decodeURIComponent(param) }
}

export function useRoute() {
  const [r, setR] = useState(parse)
  useEffect(() => {
    const fn = () => {
      setR(parse())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', fn)
    return () => window.removeEventListener('hashchange', fn)
  }, [])
  return r
}

export function go(route: Route, param?: string) {
  window.location.hash = '/' + route + (param ? '/' + encodeURIComponent(param) : '')
}

import { useEffect, useState } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'search'; q: string; tab: string }
  | { name: 'liked' }
  | { name: 'playlist'; id: string }
  | { name: 'album'; id: string }
  | { name: 'artist'; id: string }
  | { name: 'archive'; id?: string }
  | { name: 'optrack'; id: string }
  | { name: 'radio' }
  | { name: 'open' }
  | { name: 'spotify' }
  | { name: 'settings' }
  | { name: 'unknown'; raw: string }

function parse(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/'
  const [pathPart, queryPart] = raw.split('?')
  const parts = pathPart.split('/').filter(Boolean)
  const query = new URLSearchParams(queryPart || '')

  if (parts.length === 0) return { name: 'home' }
  switch (parts[0]) {
    case 'search':
      return { name: 'search', q: query.get('q') || '', tab: query.get('tab') || 'all' }
    case 'liked':
      return { name: 'liked' }
    case 'playlist':
      return parts[1] ? { name: 'playlist', id: parts[1] } : { name: 'home' }
    case 'album':
      return parts[1] ? { name: 'album', id: parts[1] } : { name: 'home' }
    case 'artist':
      return parts[1] ? { name: 'artist', id: parts[1] } : { name: 'home' }
    case 'archive':
      return { name: 'archive', id: parts[1] }
    case 'optrack':
      return parts[1] ? { name: 'optrack', id: parts[1] } : { name: 'open' }
    case 'radio':
      return { name: 'radio' }
    case 'open':
      return parts[1] ? { name: 'archive', id: parts[1] } : { name: 'open' }
    case 'spotify':
      return { name: 'spotify' }
    case 'settings':
      return { name: 'settings' }
    default:
      return { name: 'unknown', raw: pathPart }
  }
}

export function navigate(to: string): void {
  const next = to.startsWith('#') ? to : `#${to.startsWith('/') ? '' : '/'}${to}`
  if (window.location.hash === next) {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = next
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function hrefFor(route: string): string {
  return `#${route.startsWith('/') ? '' : '/'}${route}`
}

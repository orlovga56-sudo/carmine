import type { AlbumRef, Track } from '../types'
import { cacheGet, cacheSet } from './storage'

/*
 * The Internet Archive hosts huge amounts of freely licensed music
 * (netlabels, live recordings, public domain). Everything here is legal
 * to stream and comes without keys or rate limits.
 */

const SEARCH = 'https://archive.org/advancedsearch.php'
const META = 'https://archive.org/metadata'
const cover = (identifier: string) => `https://archive.org/services/img/${encodeURIComponent(identifier)}`

export interface OpenAlbum extends AlbumRef {
  identifier: string
  description?: string
}

async function json<T>(url: string, ttl = 15 * 60 * 1000): Promise<T> {
  const cached = cacheGet<T>(url)
  if (cached) return cached
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`archive.org ${res.status}`)
  const data = (await res.json()) as T
  cacheSet(url, data, ttl)
  return data
}

export async function searchOpenMusic(query = '', rows = 30): Promise<OpenAlbum[]> {
  const q = [
    'collection:(netlabels)',
    'mediatype:(audio)',
    query.trim() ? `(${query.trim()})` : '',
  ]
    .filter(Boolean)
    .join(' AND ')

  const params = new URLSearchParams()
  params.set('q', q)
  ;['identifier', 'title', 'creator', 'year', 'downloads'].forEach((f) => params.append('fl[]', f))
  params.append('sort[]', 'downloads desc')
  params.set('rows', String(rows))
  params.set('page', '1')
  params.set('output', 'json')

  const data = await json<{ response: { docs: any[] } }>(`${SEARCH}?${params.toString()}`)
  return (data.response?.docs || []).map((doc) => {
    const creator = Array.isArray(doc.creator) ? doc.creator[0] : doc.creator
    const title = Array.isArray(doc.title) ? doc.title[0] : doc.title
    return {
      id: doc.identifier,
      identifier: doc.identifier,
      title: title || doc.identifier,
      artist: creator || 'Internet Archive',
      artwork: cover(doc.identifier),
      year: doc.year ? String(doc.year) : undefined,
      source: 'archive' as const,
    }
  })
}

function parseLength(value: unknown): number {
  if (typeof value === 'number') return Math.round(value)
  if (typeof value !== 'string') return 0
  if (value.includes(':')) {
    const parts = value.split(':').map(Number)
    return parts.reduce((acc, n) => acc * 60 + (Number.isFinite(n) ? n : 0), 0)
  }
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? Math.round(n) : 0
}

function streamUrl(identifier: string, name: string): string {
  const path = name.split('/').map(encodeURIComponent).join('/')
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${path}`
}

export interface OpenItem {
  album: OpenAlbum
  tracks: Track[]
}

export async function getOpenItem(identifier: string): Promise<OpenItem | null> {
  const data = await json<any>(`${META}/${encodeURIComponent(identifier)}`)
  if (!data?.files?.length) return null

  const meta = data.metadata || {}
  const creator = Array.isArray(meta.creator) ? meta.creator.join(', ') : meta.creator
  const title = Array.isArray(meta.title) ? meta.title[0] : meta.title

  const audioFiles = (data.files as any[])
    .filter((f) => /mp3/i.test(f.format || '') || /\.mp3$/i.test(f.name || ''))
    .sort((a, b) => {
      const ta = Number(a.track ?? 0) || 0
      const tb = Number(b.track ?? 0) || 0
      return ta - tb
    })

  const seen = new Set<string>()
  const tracks: Track[] = []
  for (const file of audioFiles) {
    if (!file.name || seen.has(file.name)) continue
    seen.add(file.name)
    const filename = String(file.name)
    const pretty = (file.title || filename.replace(/^.*\//, '').replace(/\.[a-z0-9]+$/i, '')).replace(/_/g, ' ')
    tracks.push({
      id: `archive-${identifier}-${filename}`,
      title: pretty,
      artist: creator || 'Internet Archive',
      album: title || identifier,
      albumId: identifier,
      artwork: cover(identifier),
      duration: parseLength(file.length),
      streamUrl: streamUrl(identifier, filename),
      source: 'archive',
      genre: meta.genre?.[0] || undefined,
    })
  }

  if (!tracks.length) return null

  return {
    album: {
      id: identifier,
      identifier,
      title: title || identifier,
      artist: creator || 'Internet Archive',
      artwork: cover(identifier),
      year: meta.date ? String(meta.date).slice(0, 4) : undefined,
      trackCount: tracks.length,
      description: typeof meta.description === 'string' ? meta.description.replace(/<[^>]+>/g, '').slice(0, 500) : undefined,
      source: 'archive',
    },
    tracks,
  }
}

export const OPEN_GENRES = ['ambient', 'jazz', 'electronic', 'hip-hop', 'rock', 'classical', 'folk', 'experimental']

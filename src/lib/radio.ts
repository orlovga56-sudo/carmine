import type { Track } from '../types'
import { cacheGet, cacheSet } from './storage'

/*
 * radio-browser.info — a free, community-run directory of internet radio
 * stations. Full-length, endless audio without keys. We only keep HTTPS
 * streams so the app works on GitHub Pages.
 */

const API = 'https://de1.api.radio-browser.info/json'

export interface Station {
  id: string
  name: string
  url: string
  favicon: string
  tags: string
  country: string
  codec: string
  bitrate: number
  votes: number
}

async function json<T>(url: string): Promise<T> {
  const cached = cacheGet<T>(url)
  if (cached) return cached
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`radio-browser ${res.status}`)
  const data = (await res.json()) as T
  cacheSet(url, data, 30 * 60 * 1000)
  return data
}

function mapStation(raw: any): Station {
  return {
    id: String(raw.stationuuid),
    name: String(raw.name || 'Радио').trim(),
    url: raw.url_resolved || raw.url,
    favicon: raw.favicon || '',
    tags: raw.tags || '',
    country: raw.country || '',
    codec: raw.codec || '',
    bitrate: raw.bitrate || 0,
    votes: raw.votes || 0,
  }
}

export async function searchStations(opts: {
  tag?: string
  name?: string
  country?: string
  limit?: number
} = {}): Promise<Station[]> {
  const params = new URLSearchParams()
  params.set('limit', String(opts.limit ?? 40))
  params.set('hidebroken', 'true')
  params.set('order', 'votes')
  params.set('reverse', 'true')
  if (opts.tag) params.set('tag', opts.tag)
  if (opts.name) params.set('name', opts.name)
  if (opts.country) params.set('countrycode', opts.country)
  const data = await json<any[]>(`${API}/stations/search?${params.toString()}`)
  return data
    .map(mapStation)
    .filter((s) => s.url.startsWith('https://'))
    .filter((s, i, arr) => arr.findIndex((x) => x.url === s.url) === i)
}

export function stationToTrack(station: Station): Track {
  const tag = station.tags.split(',').filter(Boolean).slice(0, 2).join(' · ')
  return {
    id: `radio-${station.id}`,
    title: station.name,
    artist: tag || station.country || 'Прямой эфир',
    album: 'Радио Carmine',
    artwork: station.favicon,
    duration: 0,
    streamUrl: station.url,
    source: 'radio',
    genre: station.tags,
  }
}

export const RADIO_TAGS = [
  { tag: 'pop', label: 'Поп' },
  { tag: 'rock', label: 'Рок' },
  { tag: 'electronic', label: 'Электроника' },
  { tag: 'hip hop', label: 'Хип-хоп' },
  { tag: 'jazz', label: 'Джаз' },
  { tag: 'classical', label: 'Классика' },
  { tag: 'chillout', label: 'Chill' },
  { tag: 'russian', label: 'Русское' },
]

import type { AlbumRef, ArtistRef, Track } from '../types'
import { bigArt } from './format'
import { cacheGet, cacheSet } from './storage'

const API = 'https://itunes.apple.com'

/* Be polite to the public iTunes API: one request at a time, small gap. */
let chain: Promise<unknown> = Promise.resolve()
function polite<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task)
  chain = run.then(
    () => new Promise((resolve) => setTimeout(resolve, 220)),
    () => new Promise((resolve) => setTimeout(resolve, 220)),
  )
  return run
}

async function getJson<T>(url: string): Promise<T> {
  const cached = cacheGet<T>(url)
  if (cached) return cached
  const data = await polite(async () => {
    // iTunes occasionally answers 403/429/5xx on bursts — give it two more chances.
    let lastError: unknown = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (res.ok) return (await res.json()) as T
      lastError = new Error(`iTunes ${res.status}`)
      if (res.status !== 403 && res.status !== 429 && res.status < 500) break
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)))
    }
    throw lastError
  })
  cacheSet(url, data, 10 * 60 * 1000)
  return data
}

function mapSong(r: any): Track {
  return {
    id: `itunes-${r.trackId}`,
    title: r.trackName || 'Без названия',
    artist: r.artistName || 'Неизвестный исполнитель',
    artistId: r.artistId ? String(r.artistId) : undefined,
    album: r.collectionName || '',
    albumId: r.collectionId ? String(r.collectionId) : undefined,
    artwork: bigArt(r.artworkUrl100, 600),
    duration: Math.round((r.trackTimeMillis || 0) / 1000),
    previewUrl: r.previewUrl,
    source: 'itunes',
    genre: r.primaryGenreName,
    explicit: r.trackExplicitness === 'explicit',
  }
}

function mapAlbum(r: any): AlbumRef {
  return {
    id: String(r.collectionId ?? r.id),
    title: r.collectionName || r.name || 'Альбом',
    artist: r.artistName || '',
    artwork: bigArt(r.artworkUrl100, 600),
    year: (r.releaseDate || '').slice(0, 4) || undefined,
    trackCount: r.trackCount,
    source: 'itunes',
  }
}

export interface SearchResults {
  tracks: Track[]
  albums: AlbumRef[]
  artists: ArtistRef[]
}

const country = (code: string) => (code || 'RU').toUpperCase()

export async function searchTracks(term: string, store = 'RU', limit = 30): Promise<Track[]> {
  const q = term.trim()
  if (!q) return []
  const run = async (c: string) => {
    const url = `${API}/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=${limit}&country=${c}`
    const data = await getJson<{ results: any[] }>(url)
    return (data.results || []).filter((r) => r.wrapperType === 'track').map(mapSong)
  }
  let tracks: Track[] = []
  try {
    tracks = await run(country(store))
  } catch {
    tracks = []
  }
  // Some storefronts (RU among them) answer empty or rate-limit; the US catalog is the widest.
  if (!tracks.length && country(store) !== 'US') {
    tracks = await run('US').catch(() => [])
  }
  return tracks
}

export async function searchAlbums(term: string, store = 'RU', limit = 24): Promise<AlbumRef[]> {
  const q = term.trim()
  if (!q) return []
  const run = async (c: string) => {
    const url = `${API}/search?term=${encodeURIComponent(q)}&media=music&entity=album&limit=${limit}&country=${c}`
    const data = await getJson<{ results: any[] }>(url)
    return (data.results || []).filter((r) => r.collectionType === 'Album' || r.collectionId).map(mapAlbum)
  }
  let albums: AlbumRef[] = []
  try {
    albums = await run(country(store))
  } catch {
    albums = []
  }
  if (!albums.length && country(store) !== 'US') albums = await run('US').catch(() => [])
  return albums
}

export async function searchArtists(term: string, store = 'RU', limit = 18): Promise<ArtistRef[]> {
  const q = term.trim()
  if (!q) return []
  const run = async (c: string) => {
    const url = `${API}/search?term=${encodeURIComponent(q)}&media=music&entity=musicArtist&limit=${limit}&country=${c}`
    const data = await getJson<{ results: any[] }>(url)
    return (data.results || [])
      .filter((r) => r.artistId)
      .map((r) => ({
        id: String(r.artistId),
        name: r.artistName || 'Артист',
        artwork: '',
        genre: r.primaryGenreName,
        source: 'itunes' as const,
      }))
  }
  let artists: ArtistRef[] = []
  try {
    artists = await run(country(store))
  } catch {
    artists = []
  }
  if (!artists.length && country(store) !== 'US') artists = await run('US').catch(() => [])
  return artists
}

export async function searchEverything(term: string, store = 'RU'): Promise<SearchResults> {
  const [tracks, albums, artists] = await Promise.allSettled([
    searchTracks(term, store, 20),
    searchAlbums(term, store, 12),
    searchArtists(term, store, 12),
  ])
  const pick = <T,>(result: PromiseSettledResult<T[]>, fallback: T[]): T[] =>
    result.status === 'fulfilled' ? result.value : fallback
  const allFailed = [tracks, albums, artists].every((result) => result.status === 'rejected')
  if (allFailed) throw new Error('iTunes недоступен')
  return {
    tracks: pick(tracks, []),
    albums: pick(albums, []),
    artists: pick(artists, []),
  }
}

export async function lookupSongs(ids: Array<string | number>, store = 'RU'): Promise<Track[]> {
  if (!ids.length) return []
  const url = `${API}/lookup?id=${ids.slice(0, 100).join(',')}&entity=song&limit=200&country=${country(store)}`
  const data = await getJson<{ results: any[] }>(url)
  return (data.results || []).filter((r) => r.wrapperType === 'track').map(mapSong)
}

export interface AlbumDetails {
  album: AlbumRef
  tracks: Track[]
}

export async function getAlbum(id: string, store = 'RU'): Promise<AlbumDetails | null> {
  const url = `${API}/lookup?id=${encodeURIComponent(id)}&entity=song&limit=100&country=${country(store)}`
  const data = await getJson<{ results: any[] }>(url)
  const rows = data.results || []
  const collection = rows.find((r) => r.wrapperType === 'collection')
  const songs = rows.filter((r) => r.wrapperType === 'track').map(mapSong)
  if (!collection && !songs.length) return null
  return {
    album: collection
      ? mapAlbum(collection)
      : {
          id,
          title: songs[0]?.album || 'Альбом',
          artist: songs[0]?.artist || '',
          artwork: songs[0]?.artwork || '',
          source: 'itunes',
        },
    tracks: songs,
  }
}

export interface ArtistDetails {
  artist: ArtistRef
  tracks: Track[]
  albums: AlbumRef[]
}

export async function getArtist(id: string, store = 'RU'): Promise<ArtistDetails | null> {
  const [songsData, albumData] = await Promise.all([
    getJson<{ results: any[] }>(`${API}/lookup?id=${encodeURIComponent(id)}&entity=song&limit=30&country=${country(store)}`),
    getJson<{ results: any[] }>(`${API}/lookup?id=${encodeURIComponent(id)}&entity=album&limit=24&country=${country(store)}`),
  ])
  const artistRow = (songsData.results || []).find((r) => r.wrapperType === 'artist')
  const tracks = (songsData.results || []).filter((r) => r.wrapperType === 'track').map(mapSong)
  const albums = (albumData.results || []).filter((r) => r.wrapperType === 'collection').map(mapAlbum)
  if (!artistRow && !tracks.length) return null
  return {
    artist: {
      id,
      name: artistRow?.artistName || tracks[0]?.artist || 'Артист',
      artwork: albums[0]?.artwork || '',
      genre: artistRow?.primaryGenreName,
      source: 'itunes',
    },
    tracks,
    albums,
  }
}

interface LegacyEntry {
  'im:name': { label: string }
  'im:image': Array<{ label: string }>
  'im:artist'?: { label: string }
  'im:collection'?: { 'im:name': { label: string } }
  'im:duration'?: { label: string }
  id: { attributes: { 'im:id': string } }
  category?: { attributes: { label: string } }
  link?: Array<{ attributes?: { rel?: string; href?: string; type?: string } }>
}

/**
 * The classic iTunes RSS feed is still alive, ships previews, artwork and ids,
 * and sends `Access-Control-Allow-Origin: *` — unlike the newer marketing feed.
 */
async function getLegacyRss(store: string, kind: 'topsongs' | 'topalbums', limit: number): Promise<LegacyEntry[]> {
  const url = `${API}/${country(store).toLowerCase()}/rss/${kind}/limit=${limit}/json`
  try {
    const data = await getJson<{ feed?: { entry?: LegacyEntry[] } }>(url)
    const entries = data.feed?.entry
    if (!entries) return []
    return Array.isArray(entries) ? entries : [entries]
  } catch {
    return []
  }
}

function legacyArtwork(entry: LegacyEntry): string {
  const images = entry['im:image'] || []
  const best = images[images.length - 1]?.label || ''
  return best.replace(/\/\d+x\d+bb\.(png|jpg)$/i, '/600x600bb.jpg')
}

function legacyTrack(entry: LegacyEntry): Track {
  const preview = entry.link?.find((link) => link.attributes?.rel === 'enclosure')?.attributes?.href
  return {
    id: `itunes-${entry.id.attributes['im:id']}`,
    title: entry['im:name'].label,
    artist: entry['im:artist']?.label || '',
    album: entry['im:collection']?.['im:name']?.label || '',
    artwork: legacyArtwork(entry),
    duration: Math.round(Number(entry['im:duration']?.label || 0) / 1000),
    previewUrl: preview,
    source: 'itunes',
    genre: entry.category?.attributes?.label,
  }
}

export async function getChartTracks(store = 'RU', limit = 25): Promise<Track[]> {
  const entries = await getLegacyRss(store, 'topsongs', limit)
  if (entries.length) return entries.map(legacyTrack)
  return searchTracks('top hits', store, limit).catch(() => [])
}

export async function getChartAlbums(store = 'RU', limit = 20): Promise<AlbumRef[]> {
  const entries = await getLegacyRss(store, 'topalbums', limit)
  return entries.map((entry) => ({
    id: String(entry.id.attributes['im:id']),
    title: entry['im:name'].label,
    artist: entry['im:artist']?.label || '',
    artwork: legacyArtwork(entry),
    year: undefined,
    source: 'itunes',
  }))
}


/* ---------------------------------------------------------------- mixes */

export interface Mix {
  id: string
  title: string
  subtitle: string
  artwork: string
  tracks: Track[]
}

const FALLBACK_SEEDS = [
  { id: '', name: 'Ночной драйв', term: 'synthwave' },
  { id: '', name: 'Русский инди', term: 'русский инди' },
  { id: '', name: 'Хип-хоп', term: 'hip hop hits' },
  { id: '', name: 'Электроника', term: 'electronic dance' },
  { id: '', name: 'Спокойное', term: 'acoustic chill' },
  { id: '', name: 'Рок', term: 'rock classics' },
]

export async function buildMixes(
  seeds: Array<{ id?: string; name: string }>,
  store = 'RU',
): Promise<Mix[]> {
  const picks = seeds.filter((s) => s.name).slice(0, 3)
  const jobs: Array<Promise<Mix | null>> = []

  picks.forEach((seed, index) => {
    jobs.push(
      (async () => {
        try {
          const tracks = seed.id
            ? (await getArtist(seed.id, store))?.tracks?.slice(0, 12) || []
            : await searchTracks(seed.name, store, 12)
          if (!tracks.length) return null
          return {
            id: `mix-artist-${seed.id || index}`,
            title: `Микс: ${seed.name}`,
            subtitle: 'По мотивам твоих лайков',
            artwork: tracks[0].artwork,
            tracks,
          }
        } catch {
          return null
        }
      })(),
    )
  })

  const filler = FALLBACK_SEEDS.slice(0, Math.max(3, 5 - picks.length))
  filler.forEach((seed, index) => {
    jobs.push(
      (async () => {
        try {
          const tracks = await searchTracks(seed.term, store, 12)
          if (!tracks.length) return null
          return {
            id: `mix-genre-${index}`,
            title: seed.name,
            subtitle: 'Собрано для тебя',
            artwork: tracks[0].artwork,
            tracks,
          }
        } catch {
          return null
        }
      })(),
    )
  })

  const results = await Promise.all(jobs)
  return results.filter((m): m is Mix => Boolean(m)).slice(0, 5)
}

export const GENRES = [
  { name: 'Поп', term: 'pop hits', color: '#c81e3c' },
  { name: 'Хип-хоп', term: 'hip hop', color: '#8a1230' },
  { name: 'Рок', term: 'rock', color: '#a3172f' },
  { name: 'Электроника', term: 'electronic', color: '#d92a4a' },
  { name: 'Инди', term: 'indie', color: '#7d1026' },
  { name: 'R&B', term: 'rnb soul', color: '#b01638' },
  { name: 'Джаз', term: 'jazz', color: '#6d0f1f' },
  { name: 'Классика', term: 'classical', color: '#93122b' },
  { name: 'Лоу-фай', term: 'lofi beats', color: '#5f0d1b' },
  { name: 'Русская', term: 'русская музыка', color: '#e02348' },
  { name: 'Метал', term: 'metal', color: '#4f0a16' },
  { name: 'Танцевальная', term: 'dance', color: '#ff2d52' },
]

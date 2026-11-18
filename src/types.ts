export type Source = 'itunes' | 'archive' | 'local' | 'spotify' | 'radio'

export interface Track {
  id: string
  title: string
  artist: string
  artistId?: string
  album: string
  albumId?: string
  artwork: string
  duration: number
  /** 30-second legal preview (Apple / Spotify) */
  previewUrl?: string
  /** Full length, freely licensed stream */
  streamUrl?: string
  source: Source
  genre?: string
  explicit?: boolean
  /** Spotify track uri, used by the Web Playback SDK */
  uri?: string
}

export interface Playlist {
  id: string
  name: string
  description?: string
  cover?: string
  trackIds: string[]
  createdAt: number
}

export interface AlbumRef {
  id: string
  title: string
  artist: string
  artwork: string
  year?: string
  trackCount?: number
  source: Source
}

export interface ArtistRef {
  id: string
  name: string
  artwork: string
  genre?: string
  source: Source
}

export interface Settings {
  country: string
  accent: 'crimson' | 'ember' | 'ruby'
  volume: number
  autoplayNext: boolean
  crossfade: boolean
  quality: 'auto' | 'high'
  spotifyClientId: string
  reduceMotion: boolean
}

export interface SpotifyTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface SpotifyProfile {
  id: string
  name: string
  image?: string
  product?: string
  country?: string
}

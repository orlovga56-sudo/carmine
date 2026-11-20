import { useEffect, useRef, useState } from 'react'
import { Clock, Play, Search as SearchIcon, Sparkles } from 'lucide-react'
import { useStore } from '../store'
import { usePlayer } from '../player'
import { navigate } from '../lib/router'
import { GENRES, searchEverything, searchTracks, type SearchResults } from '../lib/itunes'
import { searchFullTracks } from '../lib/archive'
import { CardSkeletons, GenreCard, MediaCard } from '../components/Cards'
import { TrackRow } from '../components/TrackRow'
import { cn } from '../lib/format'
import type { Track } from '../types'

const EMPTY: SearchResults = { tracks: [], albums: [], artists: [] }
const TABS = [
  { id: 'all', label: 'Всё' },
  { id: 'tracks', label: 'Треки' },
  { id: 'full', label: 'Полные треки' },
  { id: 'albums', label: 'Альбомы' },
  { id: 'artists', label: 'Артисты' },
]

export function Search({ query, tab }: { query: string; tab: string }) {
  const { settings, rememberTracks, addRecentSearch, recentSearches, toast } = useStore()
  const player = usePlayer()
  const [results, setResults] = useState<SearchResults>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const activeTab = TABS.some((t) => t.id === tab) ? tab : 'all'
  const lastQuery = useRef('')
  const [full, setFull] = useState<Track[]>([])
  const [fullLoading, setFullLoading] = useState(false)

  useEffect(() => {
    const term = query.trim()
    if (activeTab !== 'full' || !term) return
    let alive = true
    setFullLoading(true)
    searchFullTracks(term, 18)
      .then((tracks) => {
        if (!alive) return
        setFull(tracks)
        rememberTracks(tracks)
      })
      .catch(() => alive && setFull([]))
      .finally(() => alive && setFullLoading(false))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, query])

  useEffect(() => {
    const term = query.trim()
    if (!term) {
      setResults(EMPTY)
      setLoading(false)
      return
    }
    if (term === lastQuery.current && results.tracks.length) return
    let alive = true
    setLoading(true)
    setError('')
    const timer = window.setTimeout(() => {
      searchEverything(term, settings.country)
        .then((data) => {
          if (!alive) return
          lastQuery.current = term
          setResults(data)
          rememberTracks(data.tracks)
          addRecentSearch(term)
        })
        .catch(() => alive && setError('Не удалось получить результаты. Проверь соединение.'))
        .finally(() => alive && setLoading(false))
    }, 250)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, settings.country])

  const showTracks = activeTab === 'all' || activeTab === 'tracks'
  const showAlbums = activeTab === 'all' || activeTab === 'albums'
  const showArtists = activeTab === 'all' || activeTab === 'artists'
  const nothing = !loading && query.trim() && !results.tracks.length && !results.albums.length && !results.artists.length

  if (!query.trim()) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Поиск</h1>
            <div className="sub">Миллионы треков, альбомов и артистов</div>
          </div>
        </div>

        {recentSearches.length > 0 && (
          <section className="section" style={{ marginTop: 8 }}>
            <div className="section-head">
              <h2><Clock size={17} /> Недавние запросы</h2>
            </div>
            <div className="search-tabs">
              {recentSearches.map((term) => (
                <button key={term} className="pill" onClick={() => navigate(`/search?q=${encodeURIComponent(term)}&tab=all`)}>
                  {term}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <div className="section-head">
            <h2><Sparkles size={17} /> Обзор жанров</h2>
          </div>
          <div className="grid-cards">
            {GENRES.map((genre) => (
              <GenreCard
                key={genre.name}
                name={genre.name}
                color={genre.color}
                onClick={async () => {
                  const tracks = await searchTracks(genre.term, settings.country, 40)
                  if (tracks.length) {
                    rememberTracks(tracks)
                    player.playTracks(tracks, 0, `Жанр · ${genre.name}`)
                  } else {
                    toast('Не удалось загрузить жанр', 'error')
                  }
                }}
              />
            ))}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Результаты</h1>
          <div className="sub">«{query}»</div>
        </div>
        {results.tracks.length > 0 && (
          <div className="page-head-actions">
            <button className="btn btn-primary btn-sm" onClick={() => player.playTracks(results.tracks, 0, `Поиск: ${query}`)}>
              <Play size={14} fill="currentColor" /> Слушать всё
            </button>
          </div>
        )}
      </div>

      <div className="search-tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={cn('pill', activeTab === item.id && 'active')}
            onClick={() => navigate(`/search?q=${encodeURIComponent(query)}&tab=${item.id}`)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && activeTab !== 'full' && (
        <div className="grid-cards"><CardSkeletons count={6} /></div>
      )}

      {error && activeTab !== 'full' && <div className="empty"><h3>Ошибка</h3><p>{error}</p></div>}

      {nothing && activeTab !== 'full' && (
        <div className="empty">
          <div className="icon-big"><SearchIcon size={26} /></div>
          <h3>Ничего не нашлось</h3>
          <p>Проверь написание или попробуй другой запрос. Каталог зависит от выбранного региона в настройках.</p>
        </div>
      )}

      {activeTab === 'full' && (
        <section className="result-block">
          <h3>Полные треки</h3>
          <p className="hint" style={{ marginTop: -6, maxWidth: 760 }}>
            Целые записи из Internet Archive со свободными лицензиями. Это легальный способ слушать музыку целиком —
            но это не студийные версии коммерческих исполнителей: таких полных треков вне Spotify/Premium не существует.
          </p>
          {fullLoading ? (
            <div className="grid-cards"><CardSkeletons count={5} /></div>
          ) : full.length ? (
            <div className="track-list">
              {full.map((track, index) => (
                <TrackRow key={track.id} track={track} index={index} list={full} showAlbum />
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="icon-big"><SearchIcon size={26} /></div>
              <h3>Полных версий не нашлось</h3>
              <p>В открытых библиотеках нет релиза по этому запросу. Попробуй другое название или открой «Открытую сцену».</p>
            </div>
          )}
        </section>
      )}

      {showArtists && results.artists.length > 0 && (
        <section className="result-block">
          <h3>Артисты</h3>
          <div className="artist-grid">
            {results.artists.map((artist) => (
              <MediaCard
                key={artist.id}
                title={artist.name}
                subtitle={artist.genre || 'Артист'}
                round
                onOpen={() => navigate(`/artist/${artist.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {showTracks && results.tracks.length > 0 && (
        <section className="result-block">
          <h3>Треки</h3>
          <div className="track-list">
            {results.tracks.map((track, index) => (
              <TrackRow key={track.id} track={track} index={index} list={results.tracks} />
            ))}
          </div>
        </section>
      )}

      {showAlbums && results.albums.length > 0 && (
        <section className="result-block">
          <h3>Альбомы</h3>
          <div className="grid-cards">
            {results.albums.map((album) => (
              <MediaCard
                key={album.id}
                title={album.title}
                subtitle={album.artist}
                artwork={album.artwork}
                onOpen={() => navigate(`/album/${album.id}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

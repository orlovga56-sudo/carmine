import { useEffect, useMemo, useState } from 'react'
import { Compass, Heart, Play, Plus, Radio, Shuffle } from 'lucide-react'
import { useStore } from '../store'
import { usePlayer } from '../player'
import { navigate } from '../lib/router'
import { getAlbum, getArtist, searchTracks, GENRES, type Mix } from '../lib/itunes'
import type { AlbumRef, Track } from '../types'
import { CardSkeletons, GenreCard, MediaCard } from '../components/Cards'
import { trackCount } from '../lib/format'
import { useHomeFeed } from '../lib/useHomeFeed'

interface RailArtist {
  id: string
  name: string
  artwork?: string
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return 'Доброй ночи'
  if (hour < 12) return 'Доброе утро'
  if (hour < 18) return 'Добрый день'
  return 'Добрый вечер'
}

export function Home() {
  const { settings, likes, history, rememberTracks, playlists } = useStore()
  const player = usePlayer()
  const { charts, albums, mixes, loading } = useHomeFeed()
  const [genreLoading, setGenreLoading] = useState<string | null>(null)

  useEffect(() => {
    if (charts.length) rememberTracks(charts)
  }, [charts, rememberTracks])

  const likedList = useMemo(() => Object.values(likes), [likes])

  const artists = useMemo(() => {
    const map = new Map<string, RailArtist>()
    const pools: Track[][] = [likedList, history, charts, ...mixes.map((mix) => mix.tracks)]
    pools.forEach((pool) => {
      pool.forEach((track) => {
        if (!track.artistId || !track.artist) return
        const current = map.get(track.artistId)
        if (!current) map.set(track.artistId, { id: track.artistId, name: track.artist, artwork: track.artwork })
        else if (!current.artwork && track.artwork) current.artwork = track.artwork
      })
    })
    return [...map.values()].slice(0, 7)
  }, [likedList, history, charts, mixes])

  const pins = useMemo(() => {
    const items: Array<{ key: string; title: string; artwork?: string; icon?: React.ReactNode; onClick: () => void }> = [
      {
        key: 'liked',
        title: 'Любимые треки',
        artwork: likedList[0]?.artwork,
        icon: <Heart size={20} fill="currentColor" />,
        onClick: () => navigate('/liked'),
      },
      { key: 'radio', title: 'Радио Carmine', icon: <Radio size={20} />, onClick: () => navigate('/radio') },
      { key: 'open', title: 'Открытая сцена', icon: <Compass size={20} />, onClick: () => navigate('/open') },
    ]
    mixes.slice(0, 3).forEach((mix) => {
      items.push({
        key: mix.id,
        title: mix.title,
        artwork: mix.artwork,
        onClick: () => player.playTracks(mix.tracks, 0, mix.title),
      })
    })
    playlists.slice(0, 4).forEach((playlist) => {
      items.push({
        key: playlist.id,
        title: playlist.name,
        artwork: playlist.cover,
        onClick: () => navigate(`/playlist/${playlist.id}`),
      })
    })
    return items.slice(0, 8)
  }, [likedList, mixes, playlists, player])

  const today = useMemo(() => {
    const picks: Mix[] = [...mixes]
    if (charts.length) {
      picks.push({
        id: 'today-charts',
        title: 'Чарты недели',
        subtitle: 'Самое громкое прямо сейчас',
        artwork: charts[0]?.artwork || '',
        tracks: charts.slice(0, 20),
      })
    }
    if (likedList.length) {
      picks.push({
        id: 'today-liked',
        title: 'Твои любимые',
        subtitle: trackCount(likedList.length),
        artwork: likedList[0]?.artwork || '',
        tracks: likedList.slice(0, 30),
      })
    }
    return picks.slice(0, 8)
  }, [mixes, charts, likedList])

  const openGenre = async (genre: { name: string; term: string }) => {
    setGenreLoading(genre.name)
    try {
      const tracks = await searchTracks(genre.term, settings.country, 40)
      if (tracks.length) {
        player.playTracks(tracks, 0, `Жанр · ${genre.name}`)
        rememberTracks(tracks)
      }
    } finally {
      setGenreLoading(null)
    }
  }

  const playArtist = async (artist: RailArtist) => {
    const details = await getArtist(artist.id, settings.country)
    if (details?.tracks.length) {
      rememberTracks(details.tracks)
      player.playTracks(details.tracks, 0, details.artist.name)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{greeting()}</h1>
          <div className="sub">Твоя музыка, подборки и чарты — всё в одном месте</div>
        </div>
        {today.length > 0 && (
          <div className="page-head-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => player.playTracks([...today[0].tracks].sort(() => Math.random() - 0.5), 0, 'Перемешать')}>
              <Shuffle size={15} /> Перемешать
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => player.playTracks(today[0].tracks, 0, today[0].title)}>
              <Play size={15} fill="currentColor" /> Слушать
            </button>
          </div>
        )}
      </div>

      <section className="pins">
        {pins.map((pin) => (
          <button key={pin.key} className="pin" onClick={pin.onClick} title={pin.title}>
            {pin.artwork ? <img loading="lazy" src={pin.artwork} alt="" /> : <span className="pin-icon">{pin.icon}</span>}
            <span className="pin-name">{pin.title}</span>
          </button>
        ))}
        {pins.length < 8 && (
          <button
            className="pin pin-add"
            onClick={() => {
              navigate('/search')
            }}
          >
            <span className="pin-icon">
              <Plus size={20} />
            </span>
            <span className="pin-name">Найти ещё</span>
          </button>
        )}
      </section>

      {artists.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Любимые исполнители</h2>
            <button className="link-btn" onClick={() => navigate('/search')}>Показать все</button>
          </div>
          <div className="grid-cards">
            {artists.map((artist) => (
              <MediaCard
                key={artist.id}
                title={artist.name}
                subtitle="Исполнитель"
                artwork={artist.artwork}
                round
                onOpen={() => navigate(`/artist/${artist.id}`)}
                onPlay={() => void playArtist(artist)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2>Послушай сегодня</h2>
          <span className="link-btn">{likedList.length ? 'Собрано по твоим лайкам' : 'Собрано для тебя'}</span>
        </div>
        {loading && !today.length ? (
          <div className="grid-cards"><CardSkeletons count={6} /></div>
        ) : (
          <div className="grid-cards">
            {today.map((mix) => (
              <MediaCard
                key={mix.id}
                title={mix.title}
                subtitle={mix.subtitle}
                artwork={mix.artwork}
                onPlay={() => player.playTracks(mix.tracks, 0, mix.title)}
                onOpen={() => player.playTracks(mix.tracks, 0, mix.title)}
              />
            ))}
          </div>
        )}
      </section>

      {(history.length > 0 || playlists.length > 0) && (
        <section className="section">
          <div className="section-head">
            <h2>Недавние</h2>
            <button className="link-btn" onClick={() => navigate('/liked')}>Показать все</button>
          </div>
          <div className="grid-cards">
            {playlists.slice(0, 3).map((playlist) => (
              <MediaCard
                key={playlist.id}
                title={playlist.name}
                subtitle={trackCount(playlist.trackIds.length)}
                artwork={playlist.cover}
                badge="ПЛЕЙЛИСТ"
                onOpen={() => navigate(`/playlist/${playlist.id}`)}
              />
            ))}
            {history.slice(0, Math.max(0, 6 - playlists.length)).map((track, index) => (
              <MediaCard
                key={track.id}
                title={track.title}
                subtitle={track.artist}
                artwork={track.artwork}
                badge="ТРЕК"
                onPlay={() => player.playTracks(history.slice(0, 30), index, 'Недавнее')}
              />
            ))}
            <button className="card add-card" onClick={() => navigate('/search')}>
              <span className="card-art add-card-art"><Plus size={26} /></span>
              <span className="card-title">Добавить музыку</span>
              <span className="card-sub">Поиск и плейлисты</span>
            </button>
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2>Новые альбомы</h2>
          <span className="link-btn">{settings.country}</span>
        </div>
        {loading && !albums.length ? (
          <div className="grid-cards"><CardSkeletons count={6} /></div>
        ) : (
          <div className="grid-cards">
            {albums.slice(0, 12).map((album: AlbumRef) => (
              <MediaCard
                key={album.id}
                title={album.title}
                subtitle={album.artist}
                artwork={album.artwork}
                onOpen={() => navigate(`/album/${album.id}`)}
                onPlay={async () => {
                  const details = await getAlbum(album.id, settings.country)
                  if (details) {
                    rememberTracks(details.tracks)
                    player.playTracks(details.tracks, 0, details.album.title)
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Жанры</h2>
          <span className="link-btn">{genreLoading ? `Загружаем ${genreLoading}…` : 'Нажми и слушай'}</span>
        </div>
        <div className="grid-cards">
          {GENRES.map((genre) => (
            <GenreCard key={genre.name} name={genre.name} color={genre.color} onClick={() => void openGenre(genre)} />
          ))}
        </div>
      </section>

      <section className="section" style={{ opacity: 0.85 }}>
        <div className="panel" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h3>Это честный бесплатный плеер</h3>
            <p className="hint" style={{ margin: '4px 0 0' }}>
              Каталог и 30-секундные превью — официальный Apple iTunes API. Полные треки — из открытых
              библиотек Internet Archive и живого радио. Spotify — через официальный аккаунт.
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/settings')}>Подробнее</button>
        </div>
      </section>
    </div>
  )
}

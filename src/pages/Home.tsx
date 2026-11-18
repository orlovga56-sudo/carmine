import { useEffect, useMemo, useState } from 'react'
import { Compass, Heart, Play, Radio, Shuffle, Sparkles } from 'lucide-react'
import { useStore } from '../store'
import { usePlayer } from '../player'
import { navigate } from '../lib/router'
import { buildMixes, getAlbum, getChartAlbums, getChartTracks, searchTracks, GENRES, type Mix } from '../lib/itunes'
import type { AlbumRef, Track } from '../types'
import { CardSkeletons, GenreCard, MediaCard, Tile } from '../components/Cards'
import { trackCount } from '../lib/format'
import { useHomeFeed } from '../lib/useHomeFeed'

export function Home() {
  const { settings, likes, history, rememberTracks, playlists } = useStore()
  const player = usePlayer()
  const { charts, albums, mixes, loading } = useHomeFeed()
  const [genreLoading, setGenreLoading] = useState<string | null>(null)

  useEffect(() => {
    if (charts.length) rememberTracks(charts)
  }, [charts, rememberTracks])

  const hero = useMemo(() => {
    if (mixes.length) return mixes[0]
    if (charts.length) {
      return {
        id: 'hero-chart',
        title: 'Топ недели',
        subtitle: 'Самое громкое прямо сейчас',
        artwork: charts[0].artwork,
        tracks: charts.slice(0, 15),
      } as Mix
    }
    return null
  }, [mixes, charts])

  const likedList = Object.values(likes)

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

  return (
    <div className="page">
      {hero ? (
        <section className="hero">
          <img className="hero-cover" src={hero.artwork} alt="" />
          <div className="hero-body">
            <span className="hero-kicker">
              <Sparkles size={12} /> Собрано для тебя
            </span>
            <h2>{hero.title}</h2>
            <p>{hero.subtitle}. Без рекламы, без лимитов, без подписки — просто нажми play.</p>
            <div className="hero-actions">
              <button
                className="btn btn-primary"
                onClick={() => player.playTracks(hero.tracks, 0, hero.title)}
                disabled={!hero.tracks.length}
              >
                <Play size={16} fill="currentColor" /> Слушать
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  const shuffled = [...hero.tracks].sort(() => Math.random() - 0.5)
                  player.playTracks(shuffled, 0, hero.title)
                }}
                disabled={!hero.tracks.length}
              >
                <Shuffle size={16} /> Перемешать
              </button>
            </div>
          </div>
        </section>
      ) : (
        <div className="hero" style={{ minHeight: 200 }}>
          <div className="hero-body">
            <span className="hero-kicker"><Sparkles size={12} /> Carmine</span>
            <h2>Музыка. Без границ.</h2>
            <p>Ищем для тебя треки — секунду.</p>
          </div>
        </div>
      )}

      <section className="section">
        <div className="tiles">
          <Tile
            title="Любимые треки"
            subtitle={likedList.length ? trackCount(likedList.length) : 'Добавь первый лайк'}
            artwork={likedList[0]?.artwork}
            icon={<Heart size={24} fill="currentColor" />}
            onClick={() => navigate('/liked')}
          />
          <Tile
            title="Радио Carmine"
            subtitle="Бесконечный эфир"
            icon={<Radio size={24} />}
            onClick={() => navigate('/radio')}
          />
          <Tile
            title="Открытая сцена"
            subtitle="Полные альбомы бесплатно"
            icon={<Compass size={24} />}
            onClick={() => navigate('/open')}
          />
          <Tile
            title={playlists[0]?.name || 'Мои плейлисты'}
            subtitle={playlists.length ? trackCount(playlists.length) : 'Создай свой первый'}
            artwork={playlists[0]?.cover}
            icon={<Sparkles size={22} />}
            onClick={() => navigate(playlists[0] ? `/playlist/${playlists[0].id}` : '/liked')}
          />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2><span className="dot" /> Для тебя</h2>
          <span className="link-btn">{likedList.length ? 'На основе лайков' : 'Начни с этого'}</span>
        </div>
        {loading && !mixes.length ? (
          <div className="grid-cards"><CardSkeletons count={5} /></div>
        ) : (
          <div className="grid-cards">
            {mixes.map((mix) => (
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

      {history.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2><span className="dot" /> Недавно слушал</h2>
          </div>
          <div className="grid-cards">
            {history.slice(0, 6).map((track, index) => (
              <MediaCard
                key={track.id}
                title={track.title}
                subtitle={track.artist}
                artwork={track.artwork}
                onPlay={() => player.playTracks(history.slice(0, 30), index, 'Недавнее')}
              />
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2><span className="dot" /> Топ-чарты</h2>
          <button className="link-btn" onClick={() => navigate('/search?q=хиты&tab=tracks')}>Все</button>
        </div>
        {loading && !charts.length ? (
          <div className="grid-cards"><CardSkeletons count={6} /></div>
        ) : (
          <div className="grid-cards">
            {charts.slice(0, 12).map((track, index) => (
              <MediaCard
                key={track.id}
                title={track.title}
                subtitle={track.artist}
                artwork={track.artwork}
                badge={`#${index + 1}`}
                onPlay={() => player.playTracks(charts.slice(0, 15), index, 'Топ-чарты')}
                onOpen={() => track.albumId && navigate(`/album/${track.albumId}`)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2><span className="dot" /> Новые альбомы</h2>
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
          <h2><span className="dot" /> Жанры</h2>
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

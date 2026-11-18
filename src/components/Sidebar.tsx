import { Compass, Disc3, Heart, Home, ListMusic, Music4, Plus, Radio, Search, Settings, Sparkles, Waves } from 'lucide-react'
import { useStore } from '../store'
import { navigate, useRoute } from '../lib/router'
import { cn, trackCount } from '../lib/format'
import { usePlayer } from '../player'

const logo = `${import.meta.env.BASE_URL}logo.svg`

export function Sidebar() {
  const route = useRoute()
  const { playlists, createPlaylist, likes, spotifyProfile, toast } = useStore()
  const player = usePlayer()
  const likedCount = Object.keys(likes).length

  const isActive = (name: string) => route.name === name

  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => navigate('/')} aria-label="Carmine — на главную">
        <img src={logo} alt="" />
        <span className="brand-text">
          <span className="brand-name">CARMINE</span>
          <span className="brand-sub">NO LIMITS</span>
        </span>
      </button>

      <nav className="nav" aria-label="Основная навигация">
        <button className={cn('nav-item', isActive('home') && 'active')} onClick={() => navigate('/')}>
          <Home size={19} /> Главная
        </button>
        <button className={cn('nav-item', isActive('search') && 'active')} onClick={() => navigate('/search')}>
          <Search size={19} /> Поиск
        </button>
        <button className={cn('nav-item', isActive('radio') && 'active')} onClick={() => navigate('/radio')}>
          <Radio size={19} /> Радио
        </button>
        <button className={cn('nav-item', isActive('open') && 'active')} onClick={() => navigate('/open')}>
          <Compass size={19} /> Открытая сцена
        </button>
      </nav>

      <div className="nav-divider" />

      <div className="sidebar-label">
        <span>Моя музыка</span>
        <button
          aria-label="Создать плейлист"
          title="Создать плейлист"
          onClick={() => {
            const id = createPlaylist('Новый плейлист')
            toast('Плейлист создан', 'success')
            navigate(`/playlist/${id}`)
          }}
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="sidebar-scroll">
        <button className={cn('playlist-link', isActive('liked') && 'active')} onClick={() => navigate('/liked')}>
          <span
            className="ph"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-deep))', color: '#fff', border: 0 }}
          >
            <Heart size={17} fill="currentColor" />
          </span>
          <span className="meta">
            <span className="name">Любимые треки</span>
            <span className="sub">{likedCount ? trackCount(likedCount) : 'Пока пусто'}</span>
          </span>
        </button>

        {spotifyProfile && (
          <button className={cn('playlist-link', isActive('spotify') && 'active')} onClick={() => navigate('/spotify')}>
            <img src={spotifyProfile.image || logo} alt="" style={{ borderRadius: '50%' }} />
            <span className="meta">
              <span className="name">Spotify</span>
              <span className="sub">{spotifyProfile.product === 'premium' ? 'Premium · подключён' : 'Подключён'}</span>
            </span>
          </button>
        )}

        {player.queue.length > 0 && (
          <button className="playlist-link" onClick={() => navigate('/')}>
            <span className="ph" style={{ background: 'rgba(255,33,69,.14)', color: 'var(--accent)' }}>
              <Waves size={17} />
            </span>
            <span className="meta">
              <span className="name">Очередь</span>
              <span className="sub">{player.current ? player.current.title : trackCount(player.queue.length)}</span>
            </span>
          </button>
        )}

        <div style={{ marginTop: 6 }}>
          {playlists.map((playlist) => (
            <button
              key={playlist.id}
              className={cn('playlist-link', route.name === 'playlist' && route.id === playlist.id && 'active')}
              onClick={() => navigate(`/playlist/${playlist.id}`)}
            >
              {playlist.cover ? (
                <img src={playlist.cover} alt="" />
              ) : (
                <span className="ph">
                  <ListMusic size={16} />
                </span>
              )}
              <span className="meta">
                <span className="name">{playlist.name}</span>
                <span className="sub">{trackCount(playlist.trackIds.length)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-foot">
        <b><Sparkles size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Подключи Spotify</b>
        <p>Перенеси свои плейлисты и лайки в Carmine за пару кликов.</p>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/spotify')}>
            <Disc3 size={14} /> Подключить
          </button>
          <button className="btn btn-ghost btn-sm" aria-label="Настройки" onClick={() => navigate('/settings')}>
            <Settings size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}

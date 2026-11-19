import { Compass, Heart, Home, Plus, Radio, Search, Settings, Sparkles } from 'lucide-react'
import { useStore } from '../store'
import { navigate, useRoute } from '../lib/router'
import { cn, trackCount } from '../lib/format'

const logo = `${import.meta.env.BASE_URL}logo.svg`

function coverTint(seed: string): string {
  let hue = 0
  for (let i = 0; i < seed.length; i++) hue = (hue * 31 + seed.charCodeAt(i)) % 360
  return `linear-gradient(135deg, hsl(${hue} 52% 34%), hsl(${(hue + 42) % 360} 58% 15%))`
}

export function Sidebar() {
  const route = useRoute()
  const { playlists, createPlaylist, likes, spotifyProfile, toast } = useStore()
  const likedCount = Object.keys(likes).length
  const likedArtwork = Object.values(likes)[0]?.artwork

  const isActive = (name: string) => route.name === name

  return (
    <aside className="sidebar-rail">
      <button className="rail-logo" onClick={() => navigate('/')} aria-label="Carmine — на главную">
        <img src={logo} alt="" />
      </button>

      <nav className="rail-nav" aria-label="Основная навигация">
        <button className={cn('rail-btn', isActive('home') && 'active')} title="Главная" onClick={() => navigate('/')}>
          <Home size={21} />
          <span>Главная</span>
        </button>
        <button className={cn('rail-btn', isActive('search') && 'active')} title="Поиск" onClick={() => navigate('/search')}>
          <Search size={21} />
          <span>Поиск</span>
        </button>
        <button className={cn('rail-btn', isActive('liked') && 'active')} title="Любимые треки" onClick={() => navigate('/liked')}>
          <Heart size={21} />
          <span>Любимое</span>
        </button>
        <button className={cn('rail-btn', isActive('radio') && 'active')} title="Радио" onClick={() => navigate('/radio')}>
          <Radio size={21} />
          <span>Радио</span>
        </button>
        <button className={cn('rail-btn', isActive('open') && 'active')} title="Открытая сцена" onClick={() => navigate('/open')}>
          <Compass size={21} />
          <span>Сцена</span>
        </button>
        <button
          className="rail-btn rail-add"
          title="Создать плейлист"
          onClick={() => {
            const id = createPlaylist('Новый плейлист')
            toast('Плейлист создан', 'success')
            navigate(`/playlist/${id}`)
          }}
        >
          <Plus size={21} />
          <span>Создать</span>
        </button>
      </nav>

      <div className="rail-divider" />

      <div className="rail-covers" aria-label="Моя музыка">
        <button
          className={cn('rail-cover', route.name === 'liked' && 'active')}
          title={`Любимые треки${likedCount ? ` · ${trackCount(likedCount)}` : ''}`}
          onClick={() => navigate('/liked')}
        >
          {likedArtwork ? (
            <img src={likedArtwork} alt="" />
          ) : (
            <span className="rail-cover-ph liked">
              <Heart size={18} fill="currentColor" />
            </span>
          )}
        </button>

        {playlists.slice(0, 9).map((playlist) => (
          <button
            key={playlist.id}
            className={cn('rail-cover', route.name === 'playlist' && route.id === playlist.id && 'active')}
            title={playlist.name}
            onClick={() => navigate(`/playlist/${playlist.id}`)}
          >
            {playlist.cover ? (
              <img src={playlist.cover} alt="" />
            ) : (
              <span className="rail-cover-ph" style={{ background: coverTint(playlist.name) }}>
                {playlist.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="rail-bottom">
        <button className="rail-btn" title="Spotify" onClick={() => navigate('/spotify')}>
          {spotifyProfile?.image ? (
            <img className="rail-avatar" src={spotifyProfile.image} alt="" />
          ) : (
            <Sparkles size={20} />
          )}
          <span>Spotify</span>
        </button>
        <button className={cn('rail-btn', isActive('settings') && 'active')} title="Настройки" onClick={() => navigate('/settings')}>
          <Settings size={20} />
          <span>Ещё</span>
        </button>
      </div>
    </aside>
  )
}

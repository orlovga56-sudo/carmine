import { useEffect, useRef, useState } from 'react'
import { Compass, Heart, Home, Radio, Search, Settings } from 'lucide-react'
import { StoreProvider, useStore } from './store'
import { PlayerProvider, usePlayer } from './player'
import { useRoute, navigate, type Route } from './lib/router'
import { cn } from './lib/format'
import { isDesktop } from './lib/desktop'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { PlayerBar } from './components/PlayerBar'
import { NowPlaying } from './components/NowPlaying'
import { Toasts } from './components/Toasts'
import { Home as HomePage } from './pages/Home'
import { Search as SearchPage } from './pages/Search'
import { LikedPage } from './pages/Liked'
import { PlaylistPage } from './pages/PlaylistPage'
import { AlbumPage } from './pages/AlbumPage'
import { ArtistPage } from './pages/ArtistPage'
import { RadioPage } from './pages/Radio'
import { OpenPage, OpenItemPage } from './pages/Open'
import { SpotifyPage } from './pages/Spotify'
import { SettingsPage } from './pages/Settings'

function renderRoute(route: Route) {
  switch (route.name) {
    case 'home':
      return <HomePage />
    case 'search':
      return <SearchPage query={route.q} tab={route.tab} />
    case 'liked':
      return <LikedPage />
    case 'playlist':
      return <PlaylistPage id={route.id} />
    case 'album':
      return <AlbumPage id={route.id} />
    case 'artist':
      return <ArtistPage id={route.id} />
    case 'radio':
      return <RadioPage />
    case 'open':
      return <OpenPage />
    case 'archive':
      return <OpenItemPage id={route.id!} />
    case 'spotify':
      return <SpotifyPage />
    case 'settings':
      return <SettingsPage />
    default:
      return (
        <div className="page">
          <div className="empty" style={{ marginTop: 60 }}>
            <h3>Страница не найдена</h3>
            <p>Похоже, ссылка устарела. Вернёмся к музыке?</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>На главную</button>
          </div>
        </div>
      )
  }
}

function MobileNav() {
  const route = useRoute()
  const items = [
    { name: 'home', label: 'Главная', icon: Home, to: '/' },
    { name: 'search', label: 'Поиск', icon: Search, to: '/search' },
    { name: 'radio', label: 'Радио', icon: Radio, to: '/radio' },
    { name: 'open', label: 'Открытая', icon: Compass, to: '/open' },
    { name: 'liked', label: 'Любимое', icon: Heart, to: '/liked' },
    { name: 'settings', label: 'Ещё', icon: Settings, to: '/settings' },
  ]
  return (
    <nav className="mobile-nav" aria-label="Мобильная навигация">
      <div className="mobile-nav-inner">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.name}
              className={cn(route.name === item.name && 'active')}
              onClick={() => navigate(item.to)}
            >
              <Icon size={18} />
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function DesktopTitleBar() {
  if (!isDesktop) return null
  return (
    <div className="desktop-titlebar" aria-hidden>
      <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" />
      <span>Carmine</span>
      <em>No limits</em>
    </div>
  )
}

function Shell() {
  const route = useRoute()
  const player = usePlayer()
  const { toggleLike, isLiked, toast } = useStore()
  const [scrolled, setScrolled] = useState(false)
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [route.name, (route as any).id, (route as any).q])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return
      if (event.code === 'Space') {
        event.preventDefault()
        player.toggle()
      } else if (event.key === 'ArrowRight' && !event.ctrlKey) {
        event.preventDefault()
        player.seek(Math.min(player.duration, player.time + 5))
      } else if (event.key === 'ArrowLeft' && !event.ctrlKey) {
        event.preventDefault()
        player.seek(Math.max(0, player.time - 5))
      } else if (event.ctrlKey && event.key === 'ArrowRight') {
        event.preventDefault()
        player.next()
      } else if (event.ctrlKey && event.key === 'ArrowLeft') {
        event.preventDefault()
        player.prev()
      } else if (event.key.toLowerCase() === 'm') {
        player.toggleMute()
      } else if (event.key.toLowerCase() === 'l' && player.current) {
        toggleLike(player.current)
        toast(isLiked(player.current.id) ? 'Убрано из любимых' : 'Добавлено в любимые')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [player, toggleLike, isLiked, toast])

  return (
    <div className="app">
      <DesktopTitleBar />
      <Sidebar />

      <div className="main-wrap">
        <TopBar scrolled={scrolled} />
        <div
          className="content"
          ref={contentRef}
          onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 12)}
        >
          {renderRoute(route)}
        </div>
      </div>

      <PlayerBar onExpand={() => setNowPlayingOpen(true)} />
      <MobileNav />
      <Toasts />
      <NowPlaying open={nowPlayingOpen} onClose={() => setNowPlayingOpen(false)} />
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <PlayerProvider>
        <Shell />
      </PlayerProvider>
    </StoreProvider>
  )
}

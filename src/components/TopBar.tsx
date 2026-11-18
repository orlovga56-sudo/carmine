import { ArrowLeft, ArrowRight, Search, Settings as SettingsIcon, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { navigate, useRoute } from '../lib/router'
import { useStore } from '../store'
import { cn } from '../lib/format'

export function TopBar({ scrolled }: { scrolled: boolean }) {
  const route = useRoute()
  const { spotifyProfile, settings } = useStore()
  const [term, setTerm] = useState(route.name === 'search' ? route.q : '')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const submitting = useRef(false)

  useEffect(() => {
    if (route.name === 'search') {
      if (route.q) setTerm(route.q)
    } else if (!submitting.current) {
      setTerm('')
    }
  }, [route.name, route.name === 'search' ? route.q : ''])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submit = (value: string) => {
    submitting.current = true
    navigate(`/search?q=${encodeURIComponent(value)}&tab=all`)
    window.setTimeout(() => (submitting.current = false), 400)
  }

  return (
    <header className={cn('topbar', scrolled && 'scrolled')}>
      <div className="history-btns">
        <button className="round-btn" aria-label="Назад" onClick={() => window.history.back()}>
          <ArrowLeft size={17} />
        </button>
        <button className="round-btn" aria-label="Вперёд" onClick={() => window.history.forward()}>
          <ArrowRight size={17} />
        </button>
      </div>

      <form
        className="search-box"
        onSubmit={(event) => {
          event.preventDefault()
          if (term.trim()) submit(term.trim())
        }}
      >
        <Search size={17} />
        <input
          ref={inputRef}
          value={term}
          placeholder="Треки, артисты, альбомы…"
          aria-label="Поиск"
          onChange={(event) => setTerm(event.target.value)}
          onFocus={() => {
            if (route.name !== 'search') navigate('/search')
          }}
        />
        <kbd>Ctrl K</kbd>
      </form>

      <div className="topbar-right">
        <button
          className={cn('chip-btn', spotifyProfile && 'spotify-on')}
          onClick={() => navigate('/spotify')}
          title="Spotify"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1 .25c-2.8-1.7-6.3-2.1-10.5-1.2a.75.75 0 1 1-.33-1.46c4.6-1 8.5-.6 11.6 1.3.35.2.45.66.23 1.11Zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.2-1.97-8.1-2.54-11.9-1.39a.94.94 0 1 1-.54-1.79c4.34-1.31 9.73-.68 13.42 1.58.44.27.58.85.31 1.29Zm.13-3.4C15.3 8.35 8.9 8.13 5.2 9.25a1.12 1.12 0 1 1-.65-2.15c4.25-1.29 11.32-1.04 15.78 1.6a1.12 1.12 0 1 1-1.13 1.94Z" />
          </svg>
          <span>{spotifyProfile ? spotifyProfile.name : 'Spotify'}</span>
        </button>

        {route.name !== 'settings' && (
          <button className="round-btn" aria-label="Настройки" onClick={() => navigate('/settings')} title="Настройки">
            <SettingsIcon size={17} />
          </button>
        )}

        <button className="profile" onClick={() => navigate('/settings')}>
          {spotifyProfile?.image ? (
            <img src={spotifyProfile.image} alt="" style={{ width: 26, height: 26, borderRadius: '50%' }} />
          ) : (
            <span className="avatar">
              <UserRound size={13} />
            </span>
          )}
          <span className="profile-name">{spotifyProfile?.name || 'Гость'}</span>
        </button>
      </div>
    </header>
  )
}

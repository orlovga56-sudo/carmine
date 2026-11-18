import { useEffect, useState } from 'react'
import { Play, Radio as RadioIcon, RefreshCw } from 'lucide-react'
import { usePlayer } from '../player'
import { useStore } from '../store'
import { RADIO_TAGS, searchStations, stationToTrack, type Station } from '../lib/radio'
import { cn } from '../lib/format'
import { CardSkeletons } from '../components/Cards'

export function RadioPage() {
  const player = usePlayer()
  const { toast } = useStore()
  const [tag, setTag] = useState('pop')
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    searchStations({ tag, limit: 40 })
      .then((list) => alive && setStations(list))
      .catch(() => {
        if (!alive) return
        setStations([])
        toast('Не удалось загрузить радиостанции', 'error')
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [tag, reloadKey, toast])

  const tracks = stations.map(stationToTrack)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Радио</h1>
          <div className="sub">Бесконечный прямой эфир — бесплатно и без регистрации</div>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setReloadKey((k) => k + 1)} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Обновить
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => player.playTracks(tracks, 0, 'Радио Carmine')} disabled={!tracks.length}>
            <Play size={14} fill="currentColor" /> Включить эфир
          </button>
        </div>
      </div>

      <div className="search-tabs">
        {RADIO_TAGS.map((item) => (
          <button key={item.tag} className={cn('pill', tag === item.tag && 'active')} onClick={() => setTag(item.tag)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid-cards">
        {loading ? (
          <CardSkeletons count={8} />
        ) : (
          stations.map((station, index) => (
            <button
              key={station.id}
              className="card"
              onClick={() => player.playTracks(tracks, index, 'Радио Carmine')}
              style={{ textAlign: 'left' }}
            >
              <div className="card-art" style={{ display: 'grid', placeItems: 'center', background: station.favicon ? '#121216' : 'linear-gradient(135deg, #3a0d18, #12080c)' }}>
                {station.favicon ? (
                  <img src={station.favicon} alt="" loading="lazy" onError={(event) => ((event.target as HTMLImageElement).style.display = 'none')} />
                ) : (
                  <RadioIcon size={34} color="var(--accent)" />
                )}
                <span className="play-fab" aria-hidden>
                  <Play size={18} fill="currentColor" />
                </span>
                <span
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: 'rgba(0,0,0,.7)',
                    border: '1px solid rgba(255,33,69,.5)',
                    color: 'var(--accent-soft)',
                    borderRadius: 6,
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '.1em',
                    padding: '3px 6px',
                  }}
                >
                  LIVE
                </span>
              </div>
              <div className="card-title">{station.name}</div>
              <div className="card-sub">
                {[station.country, station.codec, station.bitrate ? `${station.bitrate} kbps` : ''].filter(Boolean).join(' · ')}
              </div>
            </button>
          ))
        )}
      </div>

      {!loading && !stations.length && (
        <div className="empty" style={{ marginTop: 20 }}>
          <div className="icon-big"><RadioIcon size={26} /></div>
          <h3>Станции не отвечают</h3>
          <p>Каталог радиостанций — общественный проект radio-browser.info. Попробуй обновить или выбрать другой жанр.</p>
        </div>
      )}
    </div>
  )
}

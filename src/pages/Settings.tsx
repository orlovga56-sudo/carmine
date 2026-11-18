import { useRef } from 'react'
import { Download, Github, ShieldCheck, Trash2, Upload } from 'lucide-react'
import { useStore } from '../store'
import { usePlayer } from '../player'
import { clearAll } from '../lib/storage'
import { cn } from '../lib/format'

const COUNTRIES = [
  ['RU', 'Россия'],
  ['US', 'США'],
  ['GB', 'Великобритания'],
  ['DE', 'Германия'],
  ['FR', 'Франция'],
  ['KZ', 'Казахстан'],
  ['UA', 'Украина'],
  ['BY', 'Беларусь'],
  ['AM', 'Армения'],
  ['GE', 'Грузия'],
  ['TR', 'Турция'],
  ['JP', 'Япония'],
]

const ACCENTS = [
  ['crimson', '#ff2145'],
  ['ember', '#ff5a1f'],
  ['ruby', '#e11d6b'],
] as const

export function SettingsPage() {
  const { settings, updateSettings, resetAll, history, likes, playlists, toast } = useStore()
  const player = usePlayer()
  const fileRef = useRef<HTMLInputElement | null>(null)

  const exportData = () => {
    const dump: Record<string, string> = {}
    Object.keys(localStorage)
      .filter((key) => key.startsWith('carmine.v1.'))
      .forEach((key) => (dump[key] = localStorage.getItem(key) || ''))
    const blob = new Blob([JSON.stringify({ app: 'carmine', version: 1, exportedAt: new Date().toISOString(), data: dump }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `carmine-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast('Резервная копия скачана', 'success')
  }

  const importData = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text())
      const data = parsed.data as Record<string, string>
      if (!data) throw new Error('bad file')
      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith('carmine.v1.')) localStorage.setItem(key, value)
      })
      toast('Импорт завершён, перезагружаю…', 'success')
      window.setTimeout(() => window.location.reload(), 700)
    } catch {
      toast('Это не файл резервной копии Carmine', 'error')
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Настройки</h1>
          <div className="sub">Всё хранится локально в твоём браузере</div>
        </div>
      </div>

      <div className="two-col">
        <div>
          <div className="panel">
            <h3>Внешний вид</h3>
            <p className="hint">Акцентный цвет интерфейса.</p>
            <div className="accent-dots">
              {ACCENTS.map(([id, color]) => (
                <button
                  key={id}
                  className={cn('accent-dot', settings.accent === id && 'active')}
                  style={{ background: color }}
                  aria-label={id}
                  onClick={() => updateSettings({ accent: id })}
                />
              ))}
            </div>
          </div>

          <div className="panel">
            <h3>Каталог</h3>
            <p className="hint">Регион магазина влияет на доступность треков и чарты.</p>
            <div className="field">
              <label>Регион</label>
              <select className="select" value={settings.country} onChange={(event) => updateSettings({ country: event.target.value })}>
                {COUNTRIES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="panel">
            <h3>Воспроизведение</h3>
            <div className="switch-row">
              <div>
                <div className="label">Автопереход</div>
                <div className="hint">Включать следующий трек, когда заканчивается текущий</div>
              </div>
              <button
                className={cn('switch', settings.autoplayNext && 'on')}
                aria-label="Автопереход"
                onClick={() => updateSettings({ autoplayNext: !settings.autoplayNext })}
              />
            </div>
            <div className="switch-row">
              <div>
                <div className="label">Меньше анимаций</div>
                <div className="hint">Спокойный интерфейс без лишнего движения</div>
              </div>
              <button
                className={cn('switch', settings.reduceMotion && 'on')}
                aria-label="Меньше анимаций"
                onClick={() => updateSettings({ reduceMotion: !settings.reduceMotion })}
              />
            </div>
            <div className="switch-row">
              <div>
                <div className="label">Громкость по умолчанию</div>
                <div className="hint">{Math.round(player.volume * 100)}%</div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(player.volume * 100)}
                onChange={(event) => player.setVolume(Number(event.target.value) / 100)}
                style={{ width: 130, accentColor: 'var(--accent)' }}
              />
            </div>
          </div>

          <div className="panel">
            <h3>Spotify</h3>
            <p className="hint">Client ID из твоего приложения в Spotify Developer Dashboard.</p>
            <div className="field">
              <label>Client ID</label>
              <input
                className="input"
                defaultValue={settings.spotifyClientId}
                placeholder="Вставь Client ID"
                spellCheck={false}
                onBlur={(event) => updateSettings({ spotifyClientId: event.target.value.trim() })}
              />
            </div>
            <p className="hint" style={{ marginBottom: 0 }}>Полная инструкция — на странице Spotify.</p>
          </div>
        </div>

        <div>
          <div className="panel">
            <h3>Твои данные</h3>
            <p className="hint">
              {Object.keys(likes).length} лайков · {playlists.length} плейлистов · {history.length} в истории. Всё лежит только у тебя.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={exportData}>
                <Download size={14} /> Экспорт
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                <Upload size={14} /> Импорт
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void importData(file)
                  event.target.value = ''
                }}
              />
            </div>
          </div>

          <div className="panel">
            <h3>Очистка</h3>
            <p className="hint">Удалит лайки, плейлисты, историю и настройки на этом устройстве. Аккаунт Spotify не пострадает.</p>
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: '#ff7a7a' }}
              onClick={() => {
                if (!window.confirm('Удалить все данные Carmine на этом устройстве?')) return
                player.stop()
                clearAll()
                resetAll()
                toast('Данные очищены')
                window.setTimeout(() => window.location.reload(), 400)
              }}
            >
              <Trash2 size={14} /> Сбросить всё
            </button>
          </div>

          <div className="panel">
            <h3><ShieldCheck size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Честно о музыке</h3>
            <p className="hint">
              Carmine не обходит DRM и не раздаёт чужую музыку. Каталог и превью — официальный Apple iTunes API,
              полные треки — свободные лицензии Internet Archive, радио — открытый каталог radio-browser.info,
              Spotify — через твой собственный аккаунт.
            </p>
            <a className="btn btn-ghost btn-sm" href="https://github.com/orlovga56-sudo/carmine" target="_blank" rel="noreferrer">
              <Github size={14} /> Исходники на GitHub
            </a>
          </div>

          <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={48} height={48} style={{ borderRadius: 12 }} />
            <div>
              <b>Carmine 1.0</b>
              <div className="hint" style={{ margin: 0 }}>Музыка без границ. Сделано с любовью к музыке.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

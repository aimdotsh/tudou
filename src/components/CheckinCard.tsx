import { useState } from 'react'
import {
  Dumbbell, Flame, Timer, Activity, Sparkles, Check, Settings, X, ChevronUp, ChevronDown,
} from 'lucide-react'
import type { Checkin, CheckinItem, CheckinDefaults } from '../types/checkin'
import { useLocale } from '../hooks/useLocale'
import { useGitHubAuthContext } from '../hooks/useGitHubAuthContext'

const DEFAULTS_KEY = 'checkin_defaults'

function loadDefaults(): CheckinDefaults {
  try {
    const s = localStorage.getItem(DEFAULTS_KEY)
    if (s) {
      const parsed = JSON.parse(s) as Partial<CheckinDefaults>
      return {
        pushupsCount: parsed.pushupsCount ?? 30, pushupsSets: parsed.pushupsSets ?? 3,
        squatsCount: parsed.squatsCount ?? 30, squatsSets: parsed.squatsSets ?? 3,
        pullupsCount: parsed.pullupsCount ?? 10, pullupsSets: parsed.pullupsSets ?? 3,
        plankDuration: parsed.plankDuration ?? 60, plankSets: parsed.plankSets ?? 3,
        kneeDrivesCount: parsed.kneeDrivesCount ?? 30, kneeDrivesSets: parsed.kneeDrivesSets ?? 3,
        underlegClapsCount: parsed.underlegClapsCount ?? 30, underlegClapsSets: parsed.underlegClapsSets ?? 3,
      }
    }
  } catch { /* ignore */ }
  return {
    pushupsCount: 30, pushupsSets: 3,
    squatsCount: 30, squatsSets: 3,
    pullupsCount: 10, pullupsSets: 3,
    plankDuration: 60, plankSets: 3,
    kneeDrivesCount: 30, kneeDrivesSets: 3,
    underlegClapsCount: 30, underlegClapsSets: 3,
  }
}

function saveDefaults(d: CheckinDefaults) {
  localStorage.setItem(DEFAULTS_KEY, JSON.stringify(d))
}

// ── Item config ───────────────────────────────────────────────────────────────

interface ItemConfig {
  key: CheckinItem
  zh: string
  en: string
  color: string
  activeBg: string
  activeBorder: string
  unitZh: string
  unitEn: string
}

const ITEMS: ItemConfig[] = [
  {
    key: 'pushups',
    zh: '俯卧撑', en: 'Pushups',
    color: 'orange',
    activeBg: 'bg-orange-500', activeBorder: 'border-orange-500',
    unitZh: '个', unitEn: 'reps',
  },
  {
    key: 'squats',
    zh: '深蹲', en: 'Squats',
    color: 'blue',
    activeBg: 'bg-blue-500', activeBorder: 'border-blue-500',
    unitZh: '个', unitEn: 'reps',
  },
  {
    key: 'pullups',
    zh: '引体向上', en: 'Pull-ups',
    color: 'purple',
    activeBg: 'bg-purple-500', activeBorder: 'border-purple-500',
    unitZh: '个', unitEn: 'reps',
  },
  {
    key: 'plank',
    zh: '平板支撑', en: 'Plank',
    color: 'emerald',
    activeBg: 'bg-emerald-500', activeBorder: 'border-emerald-500',
    unitZh: '秒', unitEn: 's',
  },
  {
    key: 'kneeDrives',
    zh: '提膝下压', en: 'Knee Drives',
    color: 'rose',
    activeBg: 'bg-rose-500', activeBorder: 'border-rose-500',
    unitZh: '个', unitEn: 'reps',
  },
  {
    key: 'underlegClaps',
    zh: '胯下击掌', en: 'Underleg Claps',
    color: 'amber',
    activeBg: 'bg-amber-500', activeBorder: 'border-amber-500',
    unitZh: '个', unitEn: 'reps',
  },
]

function ItemIcon({ itemKey, className }: { itemKey: CheckinItem; className?: string }) {
  if (itemKey === 'pushups') return <Dumbbell className={className} />
  if (itemKey === 'squats') return <Dumbbell className={className} style={{ transform: 'rotate(90deg)' }} />
  if (itemKey === 'pullups') return <Flame className={className} />
  if (itemKey === 'plank') return <Timer className={className} />
  if (itemKey === 'kneeDrives') return <Activity className={className} />
  return <Sparkles className={className} />
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

// ── Settings drawer ───────────────────────────────────────────────────────────

function SettingsDrawer({
  defaults,
  onChange,
  onClose,
}: {
  defaults: CheckinDefaults
  onChange: (d: CheckinDefaults) => void
  onClose: () => void
}) {
  const { locale } = useLocale()
  const [vals, setVals] = useState(defaults)

  const update = (key: keyof CheckinDefaults, delta: number) => {
    setVals((prev) => {
      const next = { ...prev, [key]: Math.max(1, (prev[key] ?? 1) + delta) }
      onChange(next)
      return next
    })
  }

  const handleInput = (key: keyof CheckinDefaults, value: string) => {
    const n = parseInt(value)
    if (!isNaN(n) && n > 0) {
      const next = { ...vals, [key]: n }
      setVals(next)
      onChange(next)
    }
  }

  const groups: {
    titleZh: string; titleEn: string;
    countKey: keyof CheckinDefaults; setsKey: keyof CheckinDefaults;
    step: number; unitZh: string; unitEn: string
  }[] = [
    { titleZh: '俯卧撑', titleEn: 'Pushups', countKey: 'pushupsCount', setsKey: 'pushupsSets', step: 5, unitZh: '个', unitEn: 'reps' },
    { titleZh: '深蹲', titleEn: 'Squats', countKey: 'squatsCount', setsKey: 'squatsSets', step: 5, unitZh: '个', unitEn: 'reps' },
    { titleZh: '引体向上', titleEn: 'Pull-ups', countKey: 'pullupsCount', setsKey: 'pullupsSets', step: 2, unitZh: '个', unitEn: 'reps' },
    { titleZh: '平板支撑', titleEn: 'Plank', countKey: 'plankDuration', setsKey: 'plankSets', step: 10, unitZh: '秒', unitEn: 's' },
    { titleZh: '提膝下压', titleEn: 'Knee Drives', countKey: 'kneeDrivesCount', setsKey: 'kneeDrivesSets', step: 5, unitZh: '个', unitEn: 'reps' },
    { titleZh: '胯下击掌', titleEn: 'Underleg Claps', countKey: 'underlegClapsCount', setsKey: 'underlegClapsSets', step: 5, unitZh: '个', unitEn: 'reps' },
  ]

  return (
    <div className="mb-5 p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-3 sticky top-0 bg-[var(--color-bg)] pb-2 border-b border-[var(--color-border)] z-10">
        <span className="text-sm font-semibold text-[var(--color-text)]">
          {locale === 'zh' ? '打卡目标设置 (单组数量 × 组数)' : 'Check-in Settings (Reps × Sets)'}
        </span>
        <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-4 pt-1">
        {groups.map((g) => (
          <div key={g.countKey} className="p-2.5 rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-card)]/50 space-y-2">
            <div className="text-xs font-bold text-[var(--color-accent)]">
              {locale === 'zh' ? g.titleZh : g.titleEn}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Count setting */}
              <div className="flex items-center justify-between gap-1">
                <span className="text-[var(--color-muted)]">{locale === 'zh' ? `单组${g.unitZh}` : `Per set`}</span>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => update(g.countKey, -g.step)} className="w-6 h-6 flex items-center justify-center rounded border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-border)]">
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    value={vals[g.countKey]}
                    onChange={(e) => handleInput(g.countKey, e.target.value)}
                    className="w-10 text-center py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-bg)] font-mono text-xs outline-none"
                  />
                  <button onClick={() => update(g.countKey, g.step)} className="w-6 h-6 flex items-center justify-center rounded border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-border)]">
                    <ChevronUp className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {/* Sets setting */}
              <div className="flex items-center justify-between gap-1">
                <span className="text-[var(--color-muted)]">{locale === 'zh' ? '组数' : 'Sets'}</span>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => update(g.setsKey, -1)} className="w-6 h-6 flex items-center justify-center rounded border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-border)]">
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    value={vals[g.setsKey]}
                    onChange={(e) => handleInput(g.setsKey, e.target.value)}
                    className="w-10 text-center py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-bg)] font-mono text-xs outline-none"
                  />
                  <button onClick={() => update(g.setsKey, 1)} className="w-6 h-6 flex items-center justify-center rounded border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-border)]">
                    <ChevronUp className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--color-muted)] mt-3">
        {locale === 'zh' ? '点击打卡按钮时将自动应用以上“数量 × 组数”目标，保存在本地。' : 'Auto-applied as Reps × Sets when checking in. Saved locally.'}
      </p>
    </div>
  )
}

// ── PAT input ─────────────────────────────────────────────────────────────────

function PATInput({ onCancel }: { onCancel: () => void }) {
  const { locale } = useLocale()
  const { loading, submitPAT } = useGitHubAuthContext()
  const [val, setVal] = useState('')

  const handleSubmit = async () => {
    await submitPAT(val)
    setVal('')
  }

  return (
    <div className="mb-5 p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-3">
      <div>
        <p className="text-sm font-medium text-[var(--color-text)] mb-1">
          {locale === 'zh' ? '输入 GitHub Personal Access Token' : 'Enter GitHub Personal Access Token'}
        </p>
        <p className="text-xs text-[var(--color-muted)]">
          {locale === 'zh'
            ? '前往 Fine-grained tokens，创建对本 repo 有 Contents 读写权限的 token。'
            : 'Go to Fine-grained tokens, create a token with Contents read/write on this repo.'}
        </p>
        <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener noreferrer"
          className="text-xs text-[var(--color-accent)] underline mt-1 inline-block">
          github.com/settings/tokens?type=beta ↗
        </a>
      </div>
      <input
        autoFocus
        type="password"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
        placeholder="github_pat_..."
        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] outline-none focus:border-[var(--color-accent)] transition-colors font-mono"
      />
      <div className="flex gap-2">
        <button onClick={() => void handleSubmit()} disabled={!val.trim() || loading}
          className="flex-1 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
          {loading ? (locale === 'zh' ? '验证中...' : 'Verifying...') : (locale === 'zh' ? '确认' : 'Confirm')}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
          {locale === 'zh' ? '取消' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}

// ── Main card ─────────────────────────────────────────────────────────────────

interface CheckinCardProps {
  todayCheckin: Checkin | null
  saving: boolean
  onSave: (patch: Partial<Checkin>) => void
}

export function CheckinCard({ todayCheckin, saving, onSave }: CheckinCardProps) {
  const { locale } = useLocale()
  const { token, showPATInput, setShowPATInput } = useGitHubAuthContext()
  const [showSettings, setShowSettings] = useState(false)
  const [defaults, setDefaults] = useState<CheckinDefaults>(loadDefaults)

  const handleDefaultsChange = (d: CheckinDefaults) => {
    setDefaults(d)
    saveDefaults(d)
  }

  const today = new Date().toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  const handleClick = (item: ItemConfig) => {
    if (!token) return
    const done = todayCheckin?.[item.key] ?? false
    if (done) {
      // toggle off — clear all fields for this item
      const patch: Partial<Checkin> = { [item.key]: false }
      if (item.key === 'pushups') { patch.pushupsCount = undefined; patch.pushupsSets = undefined; patch.pushupsAt = undefined }
      if (item.key === 'squats')  { patch.squatsCount  = undefined; patch.squatsSets  = undefined; patch.squatsAt  = undefined }
      if (item.key === 'pullups') { patch.pullupsCount = undefined; patch.pullupsSets = undefined; patch.pullupsAt = undefined }
      if (item.key === 'plank')   { patch.plankDuration = undefined; patch.plankSets = undefined; patch.plankAt  = undefined }
      if (item.key === 'kneeDrives') { patch.kneeDrivesCount = undefined; patch.kneeDrivesSets = undefined; patch.kneeDrivesAt = undefined }
      if (item.key === 'underlegClaps') { patch.underlegClapsCount = undefined; patch.underlegClapsSets = undefined; patch.underlegClapsAt = undefined }
      onSave(patch)
    } else {
      // check in with defaults + current timestamp
      const now = new Date().toISOString().slice(0, 19)
      const patch: Partial<Checkin> = { [item.key]: true }
      if (item.key === 'pushups')       { patch.pushupsCount = defaults.pushupsCount; patch.pushupsSets = defaults.pushupsSets; patch.pushupsAt = now }
      if (item.key === 'squats')        { patch.squatsCount  = defaults.squatsCount;  patch.squatsSets  = defaults.squatsSets;  patch.squatsAt  = now }
      if (item.key === 'pullups')       { patch.pullupsCount = defaults.pullupsCount; patch.pullupsSets = defaults.pullupsSets; patch.pullupsAt = now }
      if (item.key === 'plank')         { patch.plankDuration = defaults.plankDuration; patch.plankSets = defaults.plankSets; patch.plankAt = now }
      if (item.key === 'kneeDrives')    { patch.kneeDrivesCount = defaults.kneeDrivesCount; patch.kneeDrivesSets = defaults.kneeDrivesSets; patch.kneeDrivesAt = now }
      if (item.key === 'underlegClaps') { patch.underlegClapsCount = defaults.underlegClapsCount; patch.underlegClapsSets = defaults.underlegClapsSets; patch.underlegClapsAt = now }
      onSave(patch)
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text)]">
            {locale === 'zh' ? '今日打卡' : "Today's Check-in"}
          </h2>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          {token && (
            <button
              onClick={() => setShowSettings((s) => !s)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-border)] transition-colors ${showSettings ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}
              title={locale === 'zh' ? '默认设置' : 'Settings'}
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          {!token && (
            <button
              onClick={() => setShowPATInput(true)}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
            >
              <GitHubIcon className="w-4 h-4" />
              {locale === 'zh' ? 'GitHub 登录' : 'Login with GitHub'}
            </button>
          )}
        </div>
      </div>

      {showPATInput && (
        <PATInput onCancel={() => setShowPATInput(false)} />
      )}

      {showSettings && token && (
        <SettingsDrawer
          defaults={defaults}
          onChange={handleDefaultsChange}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Checkin buttons grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ITEMS.map((item) => {
          const done = todayCheckin?.[item.key] ?? false
          const val = item.key === 'pushups'
            ? todayCheckin?.pushupsCount
            : item.key === 'squats'
            ? todayCheckin?.squatsCount
            : item.key === 'pullups'
            ? todayCheckin?.pullupsCount
            : item.key === 'plank'
            ? todayCheckin?.plankDuration
            : item.key === 'kneeDrives'
            ? todayCheckin?.kneeDrivesCount
            : todayCheckin?.underlegClapsCount

          const setsVal = item.key === 'pushups'
            ? (done ? todayCheckin?.pushupsSets : defaults.pushupsSets)
            : item.key === 'squats'
            ? (done ? todayCheckin?.squatsSets : defaults.squatsSets)
            : item.key === 'pullups'
            ? (done ? todayCheckin?.pullupsSets : defaults.pullupsSets)
            : item.key === 'plank'
            ? (done ? todayCheckin?.plankSets : defaults.plankSets)
            : item.key === 'kneeDrives'
            ? (done ? todayCheckin?.kneeDrivesSets : defaults.kneeDrivesSets)
            : (done ? todayCheckin?.underlegClapsSets : defaults.underlegClapsSets)

          const defaultVal = item.key === 'pushups'
            ? defaults.pushupsCount
            : item.key === 'squats'
            ? defaults.squatsCount
            : item.key === 'pullups'
            ? defaults.pullupsCount
            : item.key === 'plank'
            ? defaults.plankDuration
            : item.key === 'kneeDrives'
            ? defaults.kneeDrivesCount
            : defaults.underlegClapsCount

          const atVal = item.key === 'pushups'
            ? todayCheckin?.pushupsAt
            : item.key === 'squats'
            ? todayCheckin?.squatsAt
            : item.key === 'pullups'
            ? todayCheckin?.pullupsAt
            : item.key === 'plank'
            ? todayCheckin?.plankAt
            : item.key === 'kneeDrives'
            ? todayCheckin?.kneeDrivesAt
            : todayCheckin?.underlegClapsAt

          const timeStr = atVal ? atVal.slice(11, 16) : null // "HH:mm"
          const unit = locale === 'zh' ? item.unitZh : item.unitEn
          const setsUnit = locale === 'zh' ? '组' : 'sets'

          const activeCount = done && val != null ? val : defaultVal
          const activeSets = setsVal ?? 3
          const repSetsLabel = `${activeCount}${unit} × ${activeSets}${setsUnit}`

          return (
            <button
              key={item.key}
              onClick={() => handleClick(item)}
              disabled={!token || saving}
              className={`
                relative flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-xl border-2 font-medium transition-all select-none
                ${done
                  ? `${item.activeBg} ${item.activeBorder} text-white shadow-lg`
                  : `bg-transparent border-${item.color}-200 dark:border-${item.color}-900 text-${item.color}-500 hover:border-${item.color}-400 hover:bg-${item.color}-50 dark:hover:bg-${item.color}-950/30`}
                ${!token ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                ${saving ? 'opacity-60' : ''}
              `}
            >
              {done && (
                <span className="absolute top-2 right-2 opacity-80">
                  <Check className="w-3.5 h-3.5" />
                </span>
              )}
              <ItemIcon itemKey={item.key} className="w-5 h-5" />
              <span className="text-sm font-semibold leading-none">
                {locale === 'zh' ? item.zh : item.en}
              </span>
              {/* count x sets line */}
              <span className={`text-[11px] font-mono leading-none ${done ? 'text-white/90 font-bold' : `text-${item.color}-400`}`}>
                {repSetsLabel}
              </span>
              {/* time line */}
              {done && timeStr && (
                <span className="text-[10px] leading-none text-white/60 font-mono">{timeStr}</span>
              )}
            </button>
          )
        })}
      </div>

      {!token && !showPATInput && (
        <p className="text-center text-xs text-[var(--color-muted)] mt-4">
          {locale === 'zh' ? '登录后才能打卡' : 'Login to start checking in'}
        </p>
      )}
      {saving && (
        <p className="text-center text-xs text-[var(--color-muted)] mt-3 animate-pulse">
          {locale === 'zh' ? '保存中...' : 'Saving...'}
        </p>
      )}
    </div>
  )
}

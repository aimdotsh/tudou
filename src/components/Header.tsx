import { useState, useRef, useEffect } from 'react'
import { LogOut } from 'lucide-react'
import type { SportFilter, Activity } from '../types'
import { WORKOUT_TYPES } from '../types'
import { useLocale } from '../hooks/useLocale'
import { useGitHubAuthContext } from '../hooks/useGitHubAuthContext'

import siteMetadata from '../static/site-metadata'

import { Palette } from 'lucide-react'
import type { ThemePreset } from '../hooks/useTheme'

type Page = 'home' | 'tracks'

interface HeaderProps {
  filter: SportFilter
  setFilter: (f: SportFilter) => void
  dark: boolean
  toggleTheme: () => void
  preset: ThemePreset
  setPreset: (p: ThemePreset) => void
  activities: Activity[]
  page: Page
  onNavigate: (p: Page) => void
}

function ThemePresetPicker({ preset, setPreset }: { preset: ThemePreset; setPreset: (p: ThemePreset) => void }) {
  const { locale } = useLocale()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const options: { value: ThemePreset; label: string; color: string }[] = [
    { value: 'classic', label: locale === 'zh' ? '经典暖金' : 'Classic Amber', color: '#f59e0b' },
    { value: 'nike', label: locale === 'zh' ? '耐克荧光' : 'Nike Neon', color: '#a3e635' },
    { value: 'strava', label: locale === 'zh' ? 'Strava 珊瑚' : 'Strava Coral', color: '#fc4c02' },
    { value: 'garmin', label: locale === 'zh' ? '佳明科技蓝' : 'Garmin Ocean', color: '#38bdf8' },
  ]

  const activeOpt = options.find((o) => o.value === preset) ?? options[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-card)] transition-colors text-[var(--color-text)] relative group"
        title={locale === 'zh' ? '切换运动主题' : 'Switch Theme Preset'}
      >
        <Palette className="w-4 h-4 transition-transform group-hover:scale-110" style={{ color: activeOpt.color }} />
        <span
          className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full ring-1 ring-white/20"
          style={{ backgroundColor: activeOpt.color }}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl py-1 z-50 animate-in fade-in duration-150">
          <div className="px-3 py-1.5 border-b border-[var(--color-border)] text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-wider">
            {locale === 'zh' ? '运动主题系统' : 'Theme Presets'}
          </div>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setPreset(opt.value)
                setOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
                preset === opt.value
                  ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-bold'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shadow-xs shrink-0" style={{ backgroundColor: opt.color }} />
                <span>{opt.label}</span>
              </div>
              {preset === opt.value && <span className="text-[10px]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function GitHubAuthDropdown() {
  const { locale } = useLocale()
  const { user, loading, showPATInput, setShowPATInput, submitPAT, logout } = useGitHubAuthContext()
  const [open, setOpen] = useState(false)
  const [patValue, setPatValue] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSubmit = async () => {
    await submitPAT(patValue)
    setPatValue('')
  }

  if (user) {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-[var(--color-accent)]/40 transition-all"
        >
          <img src={user.avatar_url} alt={user.login} className="w-7 h-7 rounded-full" />
        </button>
        {open && (
          <div className="absolute right-0 top-10 w-48 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg py-1 z-50">
            <div className="px-3 py-2 border-b border-[var(--color-border)]">
              <p className="text-xs font-semibold text-[var(--color-text)]">{user.name ?? user.login}</p>
              <p className="text-xs text-[var(--color-muted)]">@{user.login}</p>
            </div>
            <button
              onClick={() => { logout(); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              {locale === 'zh' ? '退出登录' : 'Logout'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen((o) => !o); setShowPATInput(true) }}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
        title={locale === 'zh' ? '登录 GitHub' : 'Login with GitHub'}
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
        {loading ? '...' : (locale === 'zh' ? '登录' : 'Login')}
      </button>

      {(open || showPATInput) && !user && (
        <div className="absolute right-0 top-10 w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg p-4 z-50 space-y-3">
          <p className="text-xs font-semibold text-[var(--color-text)]">
            {locale === 'zh' ? 'GitHub Personal Access Token' : 'GitHub Personal Access Token'}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            {locale === 'zh'
              ? '需要对本 repo 有 Contents 读写权限'
              : 'Needs Contents read/write access on this repo'}
          </p>
          <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener noreferrer"
            className="text-xs text-[var(--color-accent)] underline inline-block">
            github.com/settings/tokens?type=beta ↗
          </a>
          <input
            autoFocus
            type="password"
            value={patValue}
            onChange={(e) => setPatValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
            placeholder="github_pat_..."
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] outline-none focus:border-[var(--color-accent)] transition-colors font-mono"
          />
          <div className="flex gap-2">
            <button onClick={() => void handleSubmit()} disabled={!patValue.trim() || loading}
              className="flex-1 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
              {loading ? (locale === 'zh' ? '验证中...' : 'Verifying...') : (locale === 'zh' ? '确认' : 'Confirm')}
            </button>
            <button onClick={() => { setOpen(false); setShowPATInput(false) }}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
              {locale === 'zh' ? '取消' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Header({ filter, setFilter, dark, toggleTheme, preset, setPreset, activities, page, onNavigate }: HeaderProps) {
  const { locale, setLocale, t } = useLocale()

  const existingTypes = new Set(activities.map((a) => a.type))
  const hasGym = WORKOUT_TYPES.some((t) => existingTypes.has(t))

  const allTabs: { label: string; value: SportFilter }[] = [
    { label: t('all'), value: 'all' },
    { label: t('run'), value: 'Run' },
    { label: t('ride'), value: 'Ride' },
    { label: t('hike'), value: 'Hike' },
    { label: t('gym'), value: 'Gym' },
  ]
  const tabs = allTabs.filter((tab) => {
    if (tab.value === 'all') return true
    if (tab.value === 'Gym') return hasGym
    return existingTypes.has(tab.value)
  })

  const navItems: { label: string; page: Page }[] = [
    { label: t('tracks'), page: 'tracks' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/70 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-2.5 md:py-4 flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-4">
        {/* Top row in Mobile, left section in Desktop */}
        <div className="flex items-center justify-between w-full md:w-auto">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => onNavigate('home')}>
            <span className="text-lg md:text-xl font-bold text-[var(--color-text)] tracking-tight group-hover:text-[var(--color-accent)] transition-colors">
              {siteMetadata.siteTitle || '蓝皮书的 Workouts Page'}
            </span>
          </div>

          {/* Right quick tools for Mobile (Theme, Preset, Locale, GitHub Auth) */}
          <div className="flex md:hidden items-center gap-2">
            <ThemePresetPicker preset={preset} setPreset={setPreset} />
            <button
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-card)] transition-colors text-[var(--color-text)]"
            >
              {dark ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-card)] transition-colors text-[var(--color-muted)] hover:text-[var(--color-text)] text-xs font-bold"
            >
              {locale === 'zh' ? 'EN' : '中'}
            </button>

            <GitHubAuthDropdown />
          </div>
        </div>

        {/* Middle & Navigation Area - Touch scrollable on Mobile */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar w-full md:w-auto pb-0.5 md:pb-0">
          {/* Sport filter tabs */}
          <div className="flex items-center gap-1 shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setFilter(tab.value); if (page !== 'home') onNavigate('home') }}
                className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                  filter === tab.value && page === 'home'
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Page nav */}
          <div className="flex items-center gap-3 shrink-0 border-l border-[var(--color-border)] pl-3 md:border-none md:pl-0">
            {navItems.map((item) => (
              <span
                key={item.label}
                onClick={() => onNavigate(item.page)}
                className={`text-xs md:text-sm cursor-pointer transition-colors whitespace-nowrap ${
                  item.page === page
                    ? 'text-[var(--color-accent)] font-medium'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* Right nav (Desktop Only) */}
        <div className="hidden md:flex items-center gap-4">
          <ThemePresetPicker preset={preset} setPreset={setPreset} />
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-card)] transition-colors"
          >
            {dark ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-card)] transition-colors text-[var(--color-muted)] hover:text-[var(--color-text)] text-xs font-bold"
          >
            {locale === 'zh' ? 'EN' : '中'}
          </button>

          <GitHubAuthDropdown />
        </div>
      </div>
    </header>
  )
}

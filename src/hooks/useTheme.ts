import { useEffect, useState } from 'react'
import { DEFAULT_THEME } from '../config'
import siteMetadata from '../static/site-metadata'
import type { ThemeLayoutPreset } from '../themes/types'

export type ThemePreset = 'classic' | 'nike' | 'strava' | 'garmin'

export function useTheme() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    if (DEFAULT_THEME === 'dark') return true
    if (DEFAULT_THEME === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // 1. 色彩主题 Preset (Classic Amber | Nike Neon | Strava Coral | Garmin Ocean)
  const [preset, setPreset] = useState<ThemePreset>(() => {
    if (typeof window === 'undefined') return 'classic'
    return (localStorage.getItem('workout-theme-preset') as ThemePreset) || 'classic'
  })

  // 2. 布局主题 Preset (Running Page 3.0 规范: dashboard | classic | map_focused | gym_pro)
  const [layoutPreset, setLayoutPreset] = useState<ThemeLayoutPreset>(() => {
    if (typeof window === 'undefined') return (siteMetadata as any).theme_preset || 'dashboard'
    return (localStorage.getItem('workout-layout-preset') as ThemeLayoutPreset) || (siteMetadata as any).theme_preset || 'dashboard'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', preset)
    localStorage.setItem('workout-theme-preset', preset)
  }, [preset])

  useEffect(() => {
    document.documentElement.setAttribute('data-layout', layoutPreset)
    localStorage.setItem('workout-layout-preset', layoutPreset)
  }, [layoutPreset])

  return {
    dark,
    toggle: () => setDark((d) => !d),
    preset,
    setPreset,
    layoutPreset,
    setLayoutPreset,
  }
}

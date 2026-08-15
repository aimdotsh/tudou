import { useEffect, useState } from 'react'
import { DEFAULT_THEME } from '../config'

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

  const [preset, setPreset] = useState<ThemePreset>(() => {
    if (typeof window === 'undefined') return 'classic'
    return (localStorage.getItem('workout-theme-preset') as ThemePreset) || 'classic'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', preset)
    localStorage.setItem('workout-theme-preset', preset)
  }, [preset])

  return {
    dark,
    toggle: () => setDark((d) => !d),
    preset,
    setPreset,
  }
}

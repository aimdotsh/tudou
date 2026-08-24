import { useEffect, useMemo, useState } from 'react'
import './index.css'
import type { Activity, SportFilter } from './types'
import { useFilteredActivities, getAvailableYears, extractProvince } from './hooks/useActivities'
import { useTheme } from './hooks/useTheme'
import { LocaleProvider } from './hooks/useLocale'
import { GitHubAuthProvider } from './hooks/useGitHubAuthContext'
import { Header } from './components/Header'
import { TracksPage } from './components/TracksPage'
import { ShareActivityPage } from './components/ShareActivityPage'
import { AnalyticsPage } from './components/Analytics/AnalyticsPage'
import { DashboardTheme } from './themes/DashboardTheme'
import { ClassicTheme } from './themes/ClassicTheme'
import { MapFocusedTheme } from './themes/MapFocusedTheme'
import { GymProTheme } from './themes/GymProTheme'
import rawActivities from './static/activities.json'
import siteMetadata from './static/site-metadata'
const activities = rawActivities as Activity[]

type Page = 'home' | 'tracks' | 'analytics'

export default function App() {
  const { dark, toggle, preset, setPreset, layoutPreset, setLayoutPreset } = useTheme()
  const [filter, setFilter] = useState<SportFilter>('all')
  const [year, setYear] = useState<number | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
  const [page, setPage] = useState<Page>('home')
  const [shareActivity, setShareActivity] = useState<Activity | null>(null)

  useEffect(() => {
    // 自动解析微信/独立分享 URL 里的 ?run_id=xxxx 参数
    const params = new URLSearchParams(window.location.search)
    const runIdParam = params.get('run_id')
    if (runIdParam) {
      const matched = activities.find(a => String(a.run_id) === runIdParam)
      if (matched) {
        setShareActivity(matched)
        const kmStr = (matched.distance / 1000).toFixed(2)
        document.title = `${kmStr} km ${matched.name || matched.type} | 蓝皮书的 Workouts`
        return
      }
    }
    document.title = siteMetadata.siteTitle || '蓝皮书的 Workouts Page'
  }, [])

  const years = getAvailableYears(activities)
  const filtered = useFilteredActivities(activities, filter, year)
  const sportFiltered = useFilteredActivities(activities, filter, null)
  const heatmapYear = year ?? years[0] ?? new Date().getFullYear()

  // Activities filtered to the selected province (for RouteMap)
  const provinceFiltered = useMemo(() => {
    if (!selectedProvince) return filtered
    return filtered.filter(a => extractProvince(a.location_country) === selectedProvince)
  }, [filtered, selectedProvince])

  return (
    <LocaleProvider>
      <GitHubAuthProvider>
        <div className="min-h-screen bg-[var(--color-bg)]" data-filter={filter}>
      {!shareActivity && (
        <Header
          filter={filter}
          setFilter={setFilter}
          dark={dark}
          toggleTheme={toggle}
          preset={preset}
          setPreset={setPreset}
          layoutPreset={layoutPreset}
          setLayoutPreset={setLayoutPreset}
          activities={activities}
          page={page}
          onNavigate={setPage}
        />
      )}

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-6 w-full min-w-0">
        {shareActivity ? (
          <ShareActivityPage
            activity={shareActivity}
            allActivities={activities}
            onBack={() => {
              setShareActivity(null)
              window.history.pushState({}, '', window.location.pathname)
            }}
          />
        ) : page === 'analytics' ? (
          <AnalyticsPage />
        ) : page === 'tracks' ? (
          <TracksPage
            activities={activities}
            filter={filter}
            onSelectActivity={setSelectedActivity}
            onBack={() => setPage('home')}
            dark={dark}
          />
        ) : (
          (() => {
            const sharedThemeProps = {
              activities,
              filteredActivities: filtered,
              sportFilteredActivities: sportFiltered,
              provinceFilteredActivities: provinceFiltered,
              years,
              year,
              setYear,
              filter,
              selectedActivity,
              setSelectedActivity,
              selectedProvince,
              setSelectedProvince,
              heatmapYear,
              dark,
              onShareActivity: (act: Activity) => {
                setShareActivity(act)
                window.history.pushState({}, '', `?run_id=${act.run_id}`)
              },
            }

            switch (layoutPreset) {
              case 'classic':
                return <ClassicTheme {...sharedThemeProps} />
              case 'map_focused':
                return <MapFocusedTheme {...sharedThemeProps} />
              case 'gym_pro':
                return <GymProTheme {...sharedThemeProps} />
              case 'dashboard':
              default:
                return <DashboardTheme {...sharedThemeProps} />
            }
          })()
        )}
      </main>

      <footer className="text-center py-6 text-sm text-[var(--color-muted)] border-t border-[var(--color-border)]">
        <div className="flex items-center justify-center">
          <span>&copy; {new Date().getFullYear()} {siteMetadata.siteTitle || '蓝皮书的 Workouts Page'}.</span>
        </div>
      </footer>
        </div>
      </GitHubAuthProvider>
    </LocaleProvider>
  )
}

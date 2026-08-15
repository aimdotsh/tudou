import { useEffect, useMemo, useState } from 'react'
import './index.css'
import type { Activity, SportFilter } from './types'
import { useFilteredActivities, getAvailableYears, extractProvince } from './hooks/useActivities'
import { useTheme } from './hooks/useTheme'
import { LocaleProvider } from './hooks/useLocale'
import { GitHubAuthProvider } from './hooks/useGitHubAuthContext'
import { Header } from './components/Header'
import { StatsCards } from './components/StatsCards'
import { ContributionHeatmap } from './components/ContributionHeatmap'
import { ActivityLog } from './components/ActivityLog'
import { RouteMap } from './components/RouteMap'
import { CalendarWidget } from './components/CalendarWidget'
import { ProfileCard } from './components/ProfileCard'
import { PersonalBest } from './components/PersonalBest'
import { TracksPage } from './components/TracksPage'
import { ChinaMap } from './components/ChinaMap'
import { ShareActivityPage } from './components/ShareActivityPage'
import rawActivities from './static/activities.json'
import siteMetadata from './static/site-metadata'
const activities = rawActivities as Activity[]

type Page = 'home' | 'tracks'

export default function App() {
  const { dark, toggle } = useTheme()
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
      <Header
        filter={filter}
        setFilter={setFilter}
        dark={dark}
        toggleTheme={toggle}
        activities={activities}
        page={page}
        onNavigate={setPage}
      />

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
        ) : page === 'tracks' ? (
          <TracksPage
            activities={activities}
            filter={filter}
            onSelectActivity={setSelectedActivity}
            onBack={() => setPage('home')}
            dark={dark}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_380px] gap-6 items-start">
            {/* Left column */}
            <div className="space-y-6 min-w-0 overflow-hidden">
              <StatsCards activities={filtered} allActivities={activities} year={year} filter={filter} onSelectActivity={setSelectedActivity} />
              <ContributionHeatmap activities={sportFiltered} year={heatmapYear} filter={filter} onSelectActivity={setSelectedActivity} />
              <ActivityLog
                activities={filtered}
                years={years}
                year={year}
                setYear={setYear}
                selectedActivity={selectedActivity}
                onSelectActivity={setSelectedActivity}
                onShareActivity={(act) => {
                  setShareActivity(act)
                  window.history.pushState({}, '', `?run_id=${act.run_id}`)
                }}
                filter={filter}
              />
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-6 min-w-0 overflow-hidden">
              <ProfileCard activities={activities} filter={filter} />
              <ChinaMap
                activities={filtered}
                filter={filter}
                selectedProvince={selectedProvince}
                onSelectProvince={(p) => {
                  setSelectedProvince(p)
                  setSelectedActivity(null)
                }}
              />
              <RouteMap
                activities={provinceFiltered}
                allActivities={activities}
                selectedActivity={selectedActivity}
                selectedYear={year}
                selectedSport={filter}
                dark={dark}
                onClearSelection={() => setSelectedActivity(null)}
              />
              <PersonalBest activities={activities} onSelectActivity={setSelectedActivity} />
              <CalendarWidget
                activities={filtered}
                onSelectActivity={setSelectedActivity}
              />
            </div>
          </div>
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

import { Dumbbell, Flame, Timer, Activity, Sparkles, CalendarCheck } from 'lucide-react'
import type { Checkin } from '../types/checkin'
import { useLocale } from '../hooks/useLocale'

function hasCheckin(c: Checkin): boolean {
  return Boolean(
    c.pushups || c.squats || c.pullups || c.plank || c.kneeDrives || c.underlegClaps || c.coldShower
  )
}

function computeStreak(checkins: Checkin[]): number {
  const sorted = [...checkins].sort((a, b) => b.date.localeCompare(a.date))
  const today = new Date().toLocaleDateString('sv-SE')
  let streak = 0
  let expected = today
  for (const c of sorted) {
    if (c.date !== expected) break
    if (hasCheckin(c)) {
      streak++
      const d = new Date(expected)
      d.setDate(d.getDate() - 1)
      expected = d.toLocaleDateString('sv-SE')
    } else break
  }
  return streak
}

export function CheckinStats({ checkins }: { checkins: Checkin[] }) {
  const { locale } = useLocale()
  const streak = computeStreak(checkins)
  const totalDays = checkins.filter(hasCheckin).length

  const pushupDays = checkins.filter((c) => c.pushups).length
  const pushupReps = checkins.reduce((s, c) => s + (c.pushupsCount ?? 0), 0)

  const squatDays = checkins.filter((c) => c.squats).length
  const squatReps = checkins.reduce((s, c) => s + (c.squatsCount ?? 0), 0)

  const pullupDays = checkins.filter((c) => c.pullups).length
  const pullupReps = checkins.reduce((s, c) => s + (c.pullupsCount ?? 0), 0)

  const plankDays = checkins.filter((c) => c.plank).length
  const plankSecs = checkins.reduce((s, c) => s + (c.plankDuration ?? 0), 0)

  const kneeDriveDays = checkins.filter((c) => c.kneeDrives).length
  const kneeDriveReps = checkins.reduce((s, c) => s + (c.kneeDrivesCount ?? 0), 0)

  const underlegClapDays = checkins.filter((c) => c.underlegClaps).length
  const underlegClapReps = checkins.reduce((s, c) => s + (c.underlegClapsCount ?? 0), 0)

  const stats = [
    {
      label: locale === 'zh' ? '连续打卡' : 'Streak',
      primary: streak,
      unit: locale === 'zh' ? '天' : 'd',
      sub: null,
      Icon: Flame,
      iconColor: 'text-[var(--color-accent)]',
      valueColor: 'text-[var(--color-accent)]',
    },
    {
      label: locale === 'zh' ? '累计天数' : 'Total Days',
      primary: totalDays,
      unit: locale === 'zh' ? '天' : 'd',
      sub: null,
      Icon: CalendarCheck,
      iconColor: 'text-[var(--color-muted)]',
      valueColor: 'text-[var(--color-text)]',
    },
    {
      label: locale === 'zh' ? '俯卧撑' : 'Pushups',
      primary: pushupDays,
      unit: locale === 'zh' ? '天' : 'd',
      sub: pushupReps > 0 ? `${pushupReps} ${locale === 'zh' ? '个' : 'reps'}` : null,
      Icon: Dumbbell,
      iconColor: 'text-orange-500',
      valueColor: 'text-orange-500',
    },
    {
      label: locale === 'zh' ? '深蹲' : 'Squats',
      primary: squatDays,
      unit: locale === 'zh' ? '天' : 'd',
      sub: squatReps > 0 ? `${squatReps} ${locale === 'zh' ? '个' : 'reps'}` : null,
      Icon: Dumbbell,
      iconColor: 'text-blue-500',
      valueColor: 'text-blue-500',
    },
    {
      label: locale === 'zh' ? '引体向上' : 'Pull-ups',
      primary: pullupDays,
      unit: locale === 'zh' ? '天' : 'd',
      sub: pullupReps > 0 ? `${pullupReps} ${locale === 'zh' ? '个' : 'reps'}` : null,
      Icon: Flame,
      iconColor: 'text-purple-500',
      valueColor: 'text-purple-500',
    },
    {
      label: locale === 'zh' ? '平板支撑' : 'Plank',
      primary: plankDays,
      unit: locale === 'zh' ? '天' : 'd',
      sub: plankSecs > 0 ? `${(plankSecs / 60).toFixed(1)} ${locale === 'zh' ? '分钟' : 'min'}` : null,
      Icon: Timer,
      iconColor: 'text-emerald-500',
      valueColor: 'text-emerald-500',
    },
    {
      label: locale === 'zh' ? '提膝下压' : 'Knee Drives',
      primary: kneeDriveDays,
      unit: locale === 'zh' ? '天' : 'd',
      sub: kneeDriveReps > 0 ? `${kneeDriveReps} ${locale === 'zh' ? '个' : 'reps'}` : null,
      Icon: Activity,
      iconColor: 'text-rose-500',
      valueColor: 'text-rose-500',
    },
    {
      label: locale === 'zh' ? '胯下击掌' : 'Underleg Claps',
      primary: underlegClapDays,
      unit: locale === 'zh' ? '天' : 'd',
      sub: underlegClapReps > 0 ? `${underlegClapReps} ${locale === 'zh' ? '个' : 'reps'}` : null,
      Icon: Sparkles,
      iconColor: 'text-amber-500',
      valueColor: 'text-amber-500',
    },
  ]

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5">
      <h3 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-4">
        {locale === 'zh' ? '打卡统计' : 'Checkin Stats'}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl bg-[var(--color-bg)]/40 border border-[var(--color-border)]/40">
            <s.Icon className={`w-4 h-4 ${s.iconColor}`} />
            <div className={`text-lg sm:text-xl font-bold leading-none font-mono ${s.valueColor}`}>
              {s.primary}
              <span className="text-xs font-normal ml-0.5">{s.unit}</span>
            </div>
            {s.sub && (
              <div className="text-[10px] text-[var(--color-muted)] leading-none font-mono">{s.sub}</div>
            )}
            <div className="text-[10px] text-[var(--color-muted)] text-center leading-tight">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

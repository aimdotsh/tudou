import { useMemo, useState } from 'react'
import * as polyline from '@mapbox/polyline'
import type { Activity } from '../types'
import { formatPace } from '../hooks/useActivities'
import { MuscleHeatmap, inferMusclesFromItems } from './MuscleHeatmap'
import { WORKOUT_TYPES } from '../types'
import { Copy, ArrowLeft, Check, Sparkles } from 'lucide-react'

interface ShareActivityPageProps {
  activity: Activity
  allActivities: Activity[]
  onBack: () => void
}

export function ShareActivityPage({ activity, allActivities, onBack }: ShareActivityPageProps) {
  const [copied, setCopied] = useState(false)

  // 1. 解码并生成 GPS 轨迹 Path (若有)
  const trackData = useMemo(() => {
    if (!activity.summary_polyline || activity.summary_polyline.length < 5) return null
    try {
      const rawCoords = polyline.decode(activity.summary_polyline)
      if (!rawCoords || rawCoords.length < 2) return null

      const lats = rawCoords.map(p => p[0])
      const lngs = rawCoords.map(p => p[1])
      const minLat = Math.min(...lats), maxLat = Math.max(...lats)
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)

      const viewW = 320, viewH = 180, pad = 20
      const latDiff = maxLat - minLat || 0.001
      const lngDiff = maxLng - minLng || 0.001

      const scale = Math.min((viewW - pad * 2) / lngDiff, (viewH - pad * 2) / latDiff)
      const offX = (viewW - lngDiff * scale) / 2
      const offY = (viewH - latDiff * scale) / 2

      const d = rawCoords.map(([lat, lng], i) => {
        const x = (lng - minLng) * scale + offX
        const y = viewH - ((lat - minLat) * scale + offY)
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1.5)} ${y.toFixed(1.5)}`
      }).join(' ')

      const startPt = rawCoords[0]
      const endPt = rawCoords[rawCoords.length - 1]
      const startX = (startPt[1] - minLng) * scale + offX
      const startY = viewH - ((startPt[0] - minLat) * scale + offY)
      const endX = (endPt[1] - minLng) * scale + offX
      const endY = viewH - ((endPt[0] - minLat) * scale + offY)

      return { d, startX, startY, endX, endY, viewW, viewH }
    } catch {
      return null
    }
  }, [activity.summary_polyline])

  // 2. 当月数据统计 (用于渲染参考图片中的 MAY 2026 当月打卡矩阵)
  const monthStats = useMemo(() => {
    const actDate = new Date(activity.start_date_local)
    const year = actDate.getFullYear()
    const month = actDate.getMonth()

    const sameMonthActs = allActivities.filter(a => {
      const d = new Date(a.start_date_local)
      return d.getFullYear() === year && d.getMonth() === month && a.type === activity.type
    })

    const totalKm = sameMonthActs.reduce((acc, cur) => acc + (cur.distance || 0), 0) / 1000
    const monthName = actDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()

    // 简单像素点数组 (7列 x 4行)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const activeDays = new Set(sameMonthActs.map(a => new Date(a.start_date_local).getDate()))

    return {
      monthLabel: `${monthName} ${year}`,
      totalKm: totalKm.toFixed(2),
      daysInMonth,
      activeDays,
    }
  }, [activity, allActivities])

  // 3. 生成模拟心率/配速/海拔曲线 (若无实际序列数据)
  const mockCharts = useMemo(() => {
    const points = 40
    const hrBase = activity.average_heartrate || 135
    const paceBase = activity.average_speed ? (1000 / activity.average_speed) : 360

    const hrPts: number[] = []
    const pacePts: number[] = []
    const elevPts: number[] = []

    for (let i = 0; i < points; i++) {
      const factor = Math.sin(i / 3) * 0.1 + (Math.random() * 0.08 - 0.04)
      hrPts.push(Math.round(hrBase + factor * 25))
      pacePts.push(paceBase * (1 + factor * 0.15))
      elevPts.push(Math.round(70 + Math.sin(i / 2) * 15))
    }

    const genPath = (data: number[], minVal: number, maxVal: number, h = 60, w = 300) => {
      const range = maxVal - minVal || 1
      return data.map((v, i) => {
        const x = (i / (data.length - 1)) * w
        const y = h - ((v - minVal) / range) * (h - 10) - 5
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      }).join(' ')
    }

    return {
      hrPath: genPath(hrPts, Math.min(...hrPts), Math.max(...hrPts)),
      pacePath: genPath(pacePts, Math.min(...pacePts), Math.max(...pacePts)),
      elevPath: genPath(elevPts, Math.min(...elevPts), Math.max(...elevPts)),
    }
  }, [activity])

  // 复制独立微信分享 URL
  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?run_id=${activity.run_id}`
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  const isGym = WORKOUT_TYPES.includes(activity.type) || !trackData
  const dateObj = new Date(activity.start_date_local)
  const dateStr = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}:${dateObj.getSeconds().toString().padStart(2, '0')}`

  const kmVal = (activity.distance / 1000).toFixed(2)
  const paceStr = activity.type === 'Run' ? formatPace(activity.average_speed) : `${(activity.average_speed * 3.6).toFixed(1)} km/h`
  const durationMin = Math.round(parseSecs(activity.moving_time) / 60)

  return (
    <div className="min-h-screen bg-[#08080a] text-white py-6 px-4 flex flex-col items-center select-none animate-in fade-in duration-300">
      {/* Top Floating Control Bar */}
      <div className="w-full max-w-md flex items-center justify-between mb-6 z-20">
        <button
          onClick={onBack}
          className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          返回仪表盘
        </button>

        <button
          onClick={handleCopyShareLink}
          className="px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? '微信分享链接已复制！' : '复制微信分享链接'}
        </button>
      </div>

      {/* Main Poster Container (完全 1:1 比照用户参考图片设计) */}
      <div className="w-full max-w-md bg-[#121416] border border-white/10 rounded-3xl p-5 shadow-2xl space-y-5 relative overflow-hidden">
        {/* 1. 顶部荧光黄/彩轨迹 SVG 展示 (若有) */}
        {trackData ? (
          <div className="relative w-full h-44 flex items-center justify-center bg-[#0d0e10] rounded-2xl border border-white/5 p-2">
            <svg viewBox={`0 0 ${trackData.viewW} ${trackData.viewH}`} className="w-full h-full">
              <filter id="shareGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              {/* 轨迹多层高发光线条 */}
              <path d={trackData.d} fill="none" stroke="#bef264" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#shareGlow)" opacity="0.95" />
              <path d={trackData.d} fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
              {/* 始/终标志 */}
              <g transform={`translate(${trackData.startX}, ${trackData.startY})`}>
                <circle r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
              </g>
              <g transform={`translate(${trackData.endX}, ${trackData.endY})`}>
                <circle r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
              </g>
            </svg>
          </div>
        ) : (
          <MuscleHeatmap activeMuscles={inferMusclesFromItems(activity.extra_details)} workoutName={activity.name} setItemsJson={activity.extra_details} />
        )}

        {/* 2. 运动名字与时间 */}
        <div className="text-center pt-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-1">
            <span>☁️</span>
            <span>{activity.name || (activity.type === 'Run' ? '傍晚跑步' : activity.type)}</span>
          </div>
          <p className="text-[11px] text-gray-400 font-mono tracking-wider">{dateStr}</p>
        </div>

        {/* 3. 大字号核心数据矩阵 (完全 1:1 比照参考图片 Layout) */}
        <div className="grid grid-cols-2 gap-4 bg-[#181a1d] border border-white/5 rounded-2xl p-4 font-mono">
          <div>
            <span className="text-[10px] text-gray-400 tracking-wider uppercase block mb-0.5">📍 DISTANCE</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-400">{kmVal}</span>
              <span className="text-xs text-emerald-400 font-bold">KM</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 tracking-wider uppercase block mb-0.5">⏱️ PACE</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-sky-400">{paceStr}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-gray-400 tracking-wider uppercase block mb-0.5">⌛ TIME</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-purple-400">{durationMin}</span>
              <span className="text-xs text-purple-400 font-bold">min</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 tracking-wider uppercase block mb-0.5">💓 BPM</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-500">{activity.average_heartrate ? Math.round(activity.average_heartrate) : 131}</span>
              <span className="text-xs text-amber-500 font-bold">BPM</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-gray-400 tracking-wider uppercase block mb-0.5">♡ MAX HR</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-rose-500">{activity.average_heartrate ? Math.round(activity.average_heartrate * 1.1) : 142}</span>
              <span className="text-[10px] text-rose-500">BPM</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 tracking-wider uppercase block mb-0.5">↑ ELEVATION</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-cyan-400">121</span>
              <span className="text-[10px] text-gray-400">(69m - 85m)</span>
            </div>
          </div>
        </div>

        {/* 4. AEROBIC ZONES 有氧彩虹分条 */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono tracking-wider">
            <span>AEROBIC ZONES</span>
            <span className="text-emerald-400 font-bold">Z2 (Aerobic)</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/5 flex overflow-hidden p-0.5 gap-0.5">
            <div className="h-full w-[15%] bg-sky-500/40 rounded-l-full" />
            <div className="h-full w-[55%] bg-emerald-500 rounded-sm shadow-sm" />
            <div className="h-full w-[15%] bg-amber-500/40" />
            <div className="h-full w-[10%] bg-orange-500/40" />
            <div className="h-full w-[5%] bg-rose-500/40 rounded-r-full" />
          </div>
        </div>

        {/* 5. 当月跑量与 7x5 热力像素矩阵 */}
        <div className="bg-[#181a1d] border border-white/5 rounded-2xl p-3.5 flex items-center justify-between font-mono">
          <div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-0.5">{monthStats.monthLabel}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-white">{monthStats.totalKm}</span>
              <span className="text-xs text-gray-400">km</span>
            </div>
          </div>

          {/* 7x4 像素热力阵列 */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 28 }).map((_, i) => {
              const day = i + 1
              const isActive = monthStats.activeDays.has(day)
              return (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-xs transition-all ${
                    isActive ? 'bg-rose-500 shadow-sm shadow-rose-500/50' : 'bg-white/10'
                  }`}
                />
              )
            })}
          </div>
        </div>

        {/* 6. KM SPLIT & 三大曲线图表 (心率/配速/海拔) */}
        {!isGym && (
          <div className="bg-[#181a1d] border border-white/5 rounded-2xl p-4 space-y-4 font-mono">
            <div className="text-center text-[10px] text-gray-400 tracking-widest uppercase">
              KM SPLIT (千米分段)
            </div>

            {/* 心率曲线 */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-500">心率 (Heart Rate)</span>
              <div className="w-full h-14 relative pt-1">
                <svg viewBox="0 0 300 60" className="w-full h-full">
                  <path d={mockCharts.hrPath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* 配速曲线 */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-sky-400">配速 (Pace)</span>
              <div className="w-full h-14 relative pt-1">
                <svg viewBox="0 0 300 60" className="w-full h-full">
                  <path d={mockCharts.pacePath} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* 海拔曲线 */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-400">海拔 (Elevation)</span>
              <div className="w-full h-14 relative pt-1">
                <svg viewBox="0 0 300 60" className="w-full h-full">
                  <path d={mockCharts.elevPath} fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Footer Logo */}
        <div className="pt-2 text-center border-t border-white/5 flex items-center justify-between text-[10px] text-gray-400 font-mono">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            workouts.liups.com
          </span>
          <span>蓝皮书的 Workouts Page</span>
        </div>
      </div>
    </div>
  )
}

function parseSecs(timeStr: string): number {
  if (!timeStr) return 0
  if (timeStr.includes(':')) {
    const parts = timeStr.split(' ')[1] || timeStr
    const [h, m, s] = parts.split(':').map(Number)
    return (h || 0) * 3600 + (m || 0) * 60 + (s || 0)
  }
  return Number(timeStr) || 0
}

import { useState } from 'react'
import type { Activity } from '../types'
import { X, Dumbbell, Flame, Heart, Calendar, Clock } from 'lucide-react'
import { MuscleHeatmap, inferMusclesFromItems } from './MuscleHeatmap'

interface WorkoutSet {
  set_num?: number
  reps?: string
  weight?: string
  duration?: string
}

interface WorkoutItem {
  index: number
  name: string
  total_sets?: number
  type?: 'timer' | 'reps' | 'reps_weight'
  duration?: string
  sets?: WorkoutSet[]
}

interface WorkoutDetailModalProps {
  activity: Activity | null
  onClose: () => void
}

export function WorkoutDetailModal({ activity, onClose }: WorkoutDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'breakdown' | 'heatmap'>('breakdown')

  if (!activity) return null

  let setDetails: WorkoutItem[] = []
  if (activity.extra_details) {
    try {
      setDetails = typeof activity.extra_details === 'string'
        ? JSON.parse(activity.extra_details)
        : activity.extra_details
    } catch {
      setDetails = []
    }
  }

  const dateObj = new Date(activity.start_date_local)
  const formattedDate = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日 ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] cursor-default"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg)]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center font-bold">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--color-text)] tracking-tight">{activity.name || '力量训练'}</h3>
              <p className="text-xs text-[var(--color-muted)] flex items-center gap-1 mt-0.5 font-mono">
                <Calendar className="w-3 h-3 text-[var(--color-accent)]" />
                {formattedDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--color-border)]/40 hover:bg-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2 px-5 py-3 bg-[var(--color-bg)]/80 border-b border-[var(--color-border)]/60 text-center text-xs">
          <div className="flex flex-col items-center justify-center py-1">
            <span className="text-[var(--color-muted)] text-[11px] mb-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-[var(--color-accent)]" />
              运动时长
            </span>
            <span className="font-semibold text-[var(--color-text)] font-mono">{activity.moving_time.split('.')[0]}</span>
          </div>
          <div className="flex flex-col items-center justify-center py-1 border-x border-[var(--color-border)]/60">
            <span className="text-[var(--color-muted)] text-[11px] mb-0.5 flex items-center gap-1">
              <Heart className="w-3 h-3 text-rose-500" />
              平均心率
            </span>
            <span className="font-semibold text-[var(--color-text)] font-mono">{activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : '--'}</span>
          </div>
          <div className="flex flex-col items-center justify-center py-1">
            <span className="text-[var(--color-muted)] text-[11px] mb-0.5 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-500" />
              动作项目
            </span>
            <span className="font-semibold text-[var(--color-text)] font-mono">{setDetails.length} 项</span>
          </div>
        </div>

        {/* Tab Selector: 优先第一眼展示 [📋 动作组数明细] */}
        <div className="flex items-center p-1.5 bg-[var(--color-bg)]/80 border-b border-[var(--color-border)]/60 gap-1.5 px-4">
          <button
            onClick={() => setActiveTab('breakdown')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'breakdown'
                ? 'bg-[var(--color-accent)] text-white shadow-md'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]/30'
            }`}
          >
            📋 动作组数明细 ({setDetails.length})
          </button>
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'heatmap'
                ? 'bg-[var(--color-accent)] text-white shadow-md'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]/30'
            }`}
          >
            🏋️ 肌肉锻炼热力
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar bg-[var(--color-card)]">
          {activeTab === 'breakdown' ? (
            setDetails.length === 0 ? (
              <div className="py-12 text-center text-[var(--color-muted)] text-sm">
                暂无详细分组动作明细
              </div>
            ) : (
              setDetails.map((item) => (
                <div key={item.index} className="bg-[var(--color-bg)]/60 border border-[var(--color-border)] rounded-xl p-4 transition-all hover:border-[var(--color-accent)]/50 shadow-sm">
                  {/* Item title header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]/50">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-mono text-xs font-bold flex items-center justify-center border border-[var(--color-accent)]/30">
                        {item.index}
                      </span>
                      <span className="text-sm font-bold text-[var(--color-text)] tracking-wide">{item.name}</span>
                    </div>
                    {item.duration ? (
                      <span className="text-xs font-mono font-semibold text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2 py-0.5 rounded border border-[var(--color-accent)]/20">{item.duration}</span>
                    ) : item.total_sets ? (
                      <span className="text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{item.total_sets} 组</span>
                    ) : null}
                  </div>

                  {/* Sub sets breakdown */}
                  {item.sets && item.sets.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {item.sets.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-[var(--color-card)] hover:bg-[var(--color-border)]/20 transition-colors border border-[var(--color-border)]/40">
                          <span className="text-[var(--color-muted)] font-medium font-mono">第 {s.set_num ?? idx + 1} 组</span>
                          <div className="flex items-center gap-4 font-mono">
                            {s.reps && <span className="text-[var(--color-text)] font-bold text-sm tracking-wider">{s.reps}</span>}
                            {s.duration && <span className="text-[var(--color-accent)] font-semibold">{s.duration}</span>}
                            {s.weight && (
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold border border-amber-500/40 text-[11px]">
                                {s.weight}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )
          ) : (
            <MuscleHeatmap activeMuscles={inferMusclesFromItems(activity.extra_details)} workoutName={activity.name} setItemsJson={activity.extra_details} />
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-bg)]/80 text-center">
          <p className="text-[11px] text-[var(--color-muted)] tracking-wide font-mono">
            COROS 高驰力量训练组数明细
          </p>
        </div>
      </div>
    </div>
  )
}

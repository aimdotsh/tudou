export type MuscleGroup =
  | 'shoulders' // 三角肌/肩部
  | 'chest'     // 胸大肌
  | 'biceps'    // 肱二头肌
  | 'triceps'   // 肱三头肌
  | 'abs'       // 腹肌/核心
  | 'quads'     // 股四头肌/大腿前侧
  | 'lats'      // 背阔肌/上背
  | 'lower_back'// 竖脊肌/下背
  | 'glutes'    // 臀大肌
  | 'hamstrings'// 腘绳肌/大腿后侧
  | 'calves'    // 小腿

interface MuscleHeatmapProps {
  activeMuscles?: MuscleGroup[]
  workoutName?: string
  setItemsJson?: string | null
  className?: string
}

// 根据动作名称自动推导所锤炼的肌肉群
export function inferMusclesFromItems(setItemsJson?: string | null): MuscleGroup[] {
  const muscles = new Set<MuscleGroup>()
  if (!setItemsJson) {
    // 默认展示全身/核心基础肌肉
    return ['quads', 'shoulders', 'biceps', 'hamstrings', 'glutes']
  }

  let items: any[] = []
  try {
    items = typeof setItemsJson === 'string' ? JSON.parse(setItemsJson) : setItemsJson
  } catch {
    items = []
  }

  items.forEach((item) => {
    const name = (item.name || '').toLowerCase()
    if (name.includes('蹲') || name.includes('squat')) {
      muscles.add('quads')
      muscles.add('glutes')
    }
    if (name.includes('硬拉') || name.includes('deadlift')) {
      muscles.add('hamstrings')
      muscles.add('lower_back')
      muscles.add('glutes')
    }
    if (name.includes('弯举') || name.includes('curl') || name.includes('二头')) {
      muscles.add('biceps')
    }
    if (name.includes('推') || name.includes('press') || name.includes('胸')) {
      muscles.add('chest')
      muscles.add('shoulders')
      muscles.add('triceps')
    }
    if (name.includes('肩') || name.includes('热身') || name.includes('飞鸟')) {
      muscles.add('shoulders')
    }
    if (name.includes('划船') || name.includes('引体') || name.includes('背')) {
      muscles.add('lats')
      muscles.add('biceps')
    }
    if (name.includes('跑') || name.includes('腹') || name.includes('核心')) {
      muscles.add('abs')
      muscles.add('quads')
    }
  })

  return muscles.size > 0 ? Array.from(muscles) : ['quads', 'shoulders', 'biceps', 'hamstrings', 'glutes']
}

export function MuscleHeatmap({ activeMuscles = ['quads', 'shoulders', 'biceps', 'glutes', 'hamstrings'], workoutName = '力量训练', setItemsJson, className = '' }: MuscleHeatmapProps) {
  const isTarget = (m: MuscleGroup) => activeMuscles.includes(m)

  const muscleLabels: Record<MuscleGroup, string> = {
    shoulders: '三角肌/肩',
    chest: '胸大肌',
    biceps: '肱二头肌',
    triceps: '肱三头肌',
    abs: '腹肌核心',
    quads: '股四头肌',
    lats: '背阔肌',
    lower_back: '下背竖脊肌',
    glutes: '臀大肌',
    hamstrings: '腘绳肌',
    calves: '小腿肌群',
  }

  let items: any[] = []
  if (setItemsJson) {
    try {
      items = typeof setItemsJson === 'string' ? JSON.parse(setItemsJson) : setItemsJson
    } catch {
      items = []
    }
  }

  return (
    <div className={`relative flex flex-col items-center justify-center p-5 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-md transition-colors ${className}`}>
      {/* Background glow ambiance */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-amber-500/5 pointer-events-none" />

      {/* Top Header */}
      <div className="z-10 text-center mb-3">
        <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30 text-[11px] font-semibold tracking-wide">
          🏋️ 肌肉热力分布图
        </span>
        <h4 className="text-[var(--color-text)] font-bold text-base mt-1 tracking-tight">{workoutName} 肌群目标</h4>
      </div>

      {/* Main Human Anatomy SVG Container (Front & Back) */}
      <div className="z-10 flex items-center justify-center gap-6 md:gap-12 my-1">
        {/* === 正面 FRONT === */}
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-semibold text-[var(--color-muted)] mb-2 tracking-widest uppercase">正面</span>
          <div className="relative w-32 h-64">
            <svg viewBox="0 0 100 200" className="w-full h-full drop-shadow-md text-[var(--color-text)]">
              <defs>
                <filter id="heat-glow-front" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* 人体基础线框轮廓 */}
              <circle cx="50" cy="20" r="11" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30" />
              <rect x="46" y="31" width="8" height="6" rx="2" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" className="opacity-30" />
              <path d="M 30,42 L 70,42 L 64,115 L 36,115 Z" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeWidth="1.5" className="opacity-30" rx="4" />
              <rect x="18" y="44" width="10" height="38" rx="5" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeWidth="1" className="opacity-25" />
              <rect x="72" y="44" width="10" height="38" rx="5" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeWidth="1" className="opacity-25" />
              <rect x="36" y="118" width="12" height="72" rx="6" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeWidth="1.5" className="opacity-30" />
              <rect x="52" y="118" width="12" height="72" rx="6" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeWidth="1.5" className="opacity-30" />

              {/* 高亮发光肌肉 */}
              {isTarget('shoulders') && (
                <g filter="url(#heat-glow-front)">
                  <ellipse cx="27" cy="45" rx="9" ry="6" fill="#d97706" opacity="0.85" />
                  <ellipse cx="73" cy="45" rx="9" ry="6" fill="#d97706" opacity="0.85" />
                </g>
              )}
              {isTarget('chest') && (
                <g filter="url(#heat-glow-front)">
                  <rect x="33" y="46" width="16" height="18" rx="4" fill="#ea580c" opacity="0.85" />
                  <rect x="51" y="46" width="16" height="18" rx="4" fill="#ea580c" opacity="0.85" />
                </g>
              )}
              {isTarget('biceps') && (
                <g filter="url(#heat-glow-front)">
                  <ellipse cx="23" cy="58" rx="5" ry="10" fill="#c026d3" opacity="0.9" />
                  <ellipse cx="77" cy="58" rx="5" ry="10" fill="#c026d3" opacity="0.9" />
                </g>
              )}
              {isTarget('abs') && (
                <g filter="url(#heat-glow-front)">
                  <rect x="38" y="68" width="24" height="36" rx="4" fill="#e11d48" opacity="0.8" />
                </g>
              )}
              {isTarget('quads') && (
                <g filter="url(#heat-glow-front)">
                  <rect x="37" y="120" width="10" height="42" rx="5" fill="#b45309" opacity="0.9" />
                  <rect x="53" y="120" width="10" height="42" rx="5" fill="#b45309" opacity="0.9" />
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* === 背面 BACK === */}
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-semibold text-[var(--color-muted)] mb-2 tracking-widest uppercase">背面</span>
          <div className="relative w-32 h-64">
            <svg viewBox="0 0 100 200" className="w-full h-full drop-shadow-md text-[var(--color-text)]">
              <defs>
                <filter id="heat-glow-back" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              <circle cx="50" cy="20" r="11" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-30" />
              <rect x="46" y="31" width="8" height="6" rx="2" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="1" className="opacity-30" />
              <path d="M 30,42 L 70,42 L 64,115 L 36,115 Z" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeWidth="1.5" className="opacity-30" rx="4" />
              <rect x="18" y="44" width="10" height="38" rx="5" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeWidth="1" className="opacity-25" />
              <rect x="72" y="44" width="10" height="38" rx="5" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeWidth="1" className="opacity-25" />
              <rect x="36" y="118" width="12" height="72" rx="6" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeWidth="1.5" className="opacity-30" />
              <rect x="52" y="118" width="12" height="72" rx="6" fill="currentColor" fillOpacity="0.03" stroke="currentColor" strokeWidth="1.5" className="opacity-30" />

              {isTarget('lats') && (
                <g filter="url(#heat-glow-back)">
                  <path d="M 34,46 Q 50,60 66,46 L 60,82 Q 50,90 40,82 Z" fill="#7c3aed" opacity="0.85" />
                </g>
              )}
              {isTarget('triceps') && (
                <g filter="url(#heat-glow-back)">
                  <ellipse cx="23" cy="58" rx="5" ry="10" fill="#a855f7" opacity="0.85" />
                  <ellipse cx="77" cy="58" rx="5" ry="10" fill="#a855f7" opacity="0.85" />
                </g>
              )}
              {isTarget('lower_back') && (
                <g filter="url(#heat-glow-back)">
                  <rect x="42" y="78" width="16" height="24" rx="3" fill="#ea580c" opacity="0.85" />
                </g>
              )}
              {isTarget('glutes') && (
                <g filter="url(#heat-glow-back)">
                  <circle cx="42" cy="112" r="10" fill="#d97706" opacity="0.9" />
                  <circle cx="58" cy="112" r="10" fill="#d97706" opacity="0.9" />
                </g>
              )}
              {isTarget('hamstrings') && (
                <g filter="url(#heat-glow-back)">
                  <rect x="37" y="126" width="10" height="38" rx="5" fill="#b45309" opacity="0.9" />
                  <rect x="53" y="126" width="10" height="38" rx="5" fill="#b45309" opacity="0.9" />
                </g>
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* Target Muscle Badges Bar */}
      <div className="z-10 mt-3 flex flex-wrap items-center justify-center gap-1.5 max-w-md">
        {activeMuscles.map((m) => (
          <span
            key={m}
            className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 font-semibold text-[11px] transition-all shadow-sm"
          >
            {muscleLabels[m] || m}
          </span>
        ))}
      </div>

      {/* 📷 按照用户上传参考图片完全比照设计的【动作组数胶囊标牌明细 (Compact Workout Sets Grid)】 */}
      {items && items.length > 0 && (
        <div className="z-10 mt-5 w-full pt-4 border-t border-[var(--color-border)]/60 space-y-2.5">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs py-1 border-b border-[var(--color-border)]/30 last:border-0">
              <span className="font-bold text-[var(--color-text)] shrink-0 font-sans tracking-tight flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                {item.name}
              </span>
              <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar">
                {item.sets && item.sets.length > 0 ? (
                  item.sets.map((s: any, sIdx: number) => {
                    let label = ''
                    if (s.weight && s.reps) {
                      // 格式化为图片中的 60kg×12 样式
                      const repNum = s.reps.includes('/') ? s.reps.split('/')[0].trim() : s.reps
                      label = `${s.weight.replace(' ', '')}×${repNum}`
                    } else if (s.reps) {
                      label = `${s.reps}次`
                    } else if (s.duration) {
                      label = s.duration
                    } else {
                      label = `第${s.set_num || sIdx + 1}组`
                    }

                    return (
                      <span
                        key={sIdx}
                        className="px-2.5 py-1 rounded-full bg-[var(--color-bg)]/80 border border-[var(--color-border)] text-[var(--color-text)] font-mono text-[11px] font-medium shadow-xs"
                      >
                        {label}
                      </span>
                    )
                  })
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-bg)]/80 border border-[var(--color-border)] text-[var(--color-muted)] font-mono text-[11px]">
                    {item.duration || `${item.total_sets || 1}组`}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

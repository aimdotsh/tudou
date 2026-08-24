import React from 'react';
import { TrendingUp, Flame, PieChart, Heart, Wind } from 'lucide-react';

interface LongTermTrendsProps {
  data: any;
}

export const LongTermTrends: React.FC<LongTermTrendsProps> = ({ data }) => {
  const analytics = data?.analytics || {};
  const intensityList = analytics.intensity4w || [];
  const paceDist = analytics.paceDistribution || [];

  return (
    <div className="space-y-6">
      {/* 1. 12周体能储备与训练负荷评估趋势图 (CTL / ATL / TSB) */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-5 backdrop-blur shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--color-text)] text-base">12周 训练量与体能评估 (EvoLab 负荷模型)</h3>
              <p className="text-xs text-[var(--color-muted)]">长期负荷 (CTL 体能) · 短期负荷 (ATL 疲劳) · 负荷比 (TSB 竞技状态)</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-[var(--color-text)] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              长期负荷 (CTL)
            </span>
            <span className="flex items-center gap-1 text-[var(--color-text)] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
              短期负荷 (ATL)
            </span>
            <span className="flex items-center gap-1 text-[var(--color-text)] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              负荷比 (TSB)
            </span>
          </div>
        </div>

        {/* 交互式 SVG 趋势图 */}
        <div className="w-full h-56 relative pt-2">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 600 180" preserveAspectRatio="none">
            {/* 网格线 */}
            <line x1="0" y1="30" x2="600" y2="30" stroke="var(--color-border)" strokeDasharray="3 3" />
            <line x1="0" y1="75" x2="600" y2="75" stroke="var(--color-border)" strokeDasharray="3 3" />
            <line x1="0" y1="120" x2="600" y2="120" stroke="var(--color-border)" strokeDasharray="3 3" />
            <line x1="0" y1="160" x2="600" y2="160" stroke="var(--color-border)" />

            {/* 长期负荷 CTL 曲线 (绿色) */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="0,80 50,75 100,70 150,60 200,55 250,50 300,58 350,68 400,75 450,72 500,68 550,62 600,65"
            />

            {/* 短期负荷 ATL 曲线 (蓝色) */}
            <polyline
              fill="none"
              stroke="#0284c7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="0,95 50,110 100,85 150,60 200,40 250,30 300,70 350,90 400,105 450,85 500,70 550,55 600,60"
            />

            {/* 负荷比 TSB 曲线 (黄色) */}
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="0,110 50,120 100,105 150,90 200,80 250,75 300,95 350,115 400,125 450,110 500,100 550,90 600,95"
            />
          </svg>
          <div className="flex justify-between text-[10px] text-[var(--color-muted)] font-mono mt-2">
            <span>06/02</span>
            <span>06/20</span>
            <span>07/08</span>
            <span>07/26</span>
            <span>08/13</span>
            <span>今天</span>
          </div>
        </div>
      </div>

      {/* 2. 左右双列：最大摄氧量 (VO2 Max) & 每日静息心率 (RHR) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 最大摄氧量 */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-5 backdrop-blur shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
                <Wind className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--color-text)] text-base">最大摄氧量 (VO2 Max)</h3>
                <span className="text-xs text-[var(--color-muted)]">12周有氧耐力极限评估</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-purple-500 font-mono">39</span>
              <span className="text-[10px] text-[var(--color-muted)] block">最大值: 39 · 平均: 39</span>
            </div>
          </div>

          <div className="h-36 relative pt-2">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="#a855f7"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="0,60 50,60 100,50 150,50 200,50 250,50 300,55 350,55 400,55"
              />
            </svg>
            <div className="flex justify-between text-[10px] text-[var(--color-muted)] font-mono mt-1">
              <span>06/02</span>
              <span>07/01</span>
              <span>08/01</span>
              <span>今天</span>
            </div>
          </div>
        </div>

        {/* 每日静息心率 */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-5 backdrop-blur shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--color-text)] text-base">静息心率 (RHR 晨脉)</h3>
                <span className="text-xs text-[var(--color-muted)]">12周基础心血管健康走势</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-rose-500 font-mono">60</span>
              <span className="text-[10px] text-[var(--color-muted)] block">最低: 60 · 平均: 63 bpm</span>
            </div>
          </div>

          <div className="h-36 relative pt-2">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="0,70 30,65 60,60 90,50 120,60 150,45 180,55 210,65 240,55 270,68 300,50 330,62 360,55 400,70"
              />
            </svg>
            <div className="flex justify-between text-[10px] text-[var(--color-muted)] font-mono mt-1">
              <span>06/02</span>
              <span>07/01</span>
              <span>08/01</span>
              <span>今天</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 24周 训练强度分布 & 4周 配速区间分布 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 强度分布 */}
        <div className="md:col-span-2 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-5 backdrop-blur shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-500 border border-teal-500/20">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--color-text)] text-base">24周 负荷-强度分布</h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1 text-[var(--color-muted)]"><span className="w-2 h-2 rounded bg-sky-500" /> 低强度</span>
              <span className="flex items-center gap-1 text-[var(--color-muted)]"><span className="w-2 h-2 rounded bg-teal-500" /> 中强度</span>
              <span className="flex items-center gap-1 text-[var(--color-muted)]"><span className="w-2 h-2 rounded bg-rose-500" /> 高强度</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {intensityList.map((item: any, idx: number) => {
              const total = item.high + item.medium + item.low;
              const lowPct = total ? (item.low / 2500) * 100 : 0;
              const medPct = total ? (item.medium / 2500) * 100 : 0;
              const highPct = total ? (item.high / 2500) * 100 : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono text-[var(--color-muted)]">
                    <span>{item.period}</span>
                    <span>{total} TL</span>
                  </div>
                  <div className="w-full h-3 bg-[var(--color-bg)] rounded-full overflow-hidden flex border border-[var(--color-border)]">
                    <div className="bg-sky-500 h-full" style={{ width: `${lowPct}%` }} />
                    <div className="bg-teal-500 h-full" style={{ width: `${medPct}%` }} />
                    <div className="bg-rose-500 h-full" style={{ width: `${highPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4周配速区间分布 */}
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-5 backdrop-blur shadow-sm flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <PieChart className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--color-text)] text-base">4周 配速区间分布</h3>
            </div>

            <div className="space-y-2.5">
              {paceDist.map((item: any, idx: number) => (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex justify-between font-mono text-[var(--color-text)]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.zone}
                    </span>
                    <span className="text-[var(--color-muted)]">{item.percent}% ({item.load} TL)</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--color-bg)] rounded-full overflow-hidden border border-[var(--color-border)]">
                    <div className="h-full rounded-full" style={{ width: `${item.percent}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { 
  BatteryCharging, Heart, Activity, Trophy, Timer
} from 'lucide-react';

interface DashboardProps {
  data: any;
}

export const DashboardOverview: React.FC<DashboardProps> = ({ data }) => {
  const dash = data?.dashboard || {};
  const account = data?.account || {};

  const rc = dash.runningCapacity || { score: 70.6, aerobicEndurance: 70.5, lactateCapacity: 68.5, speedEndurance: 68.5, sprintCapacity: 67.9 };
  const evalData = dash.trainingLoadEvaluation || { statusText: '恢复训练', shortTermLoad: 23, longTermLoad: 35, loadRatio: 65 };
  const rec = dash.staminaRecovery || { percent: 99, statusText: '体力充沛', fullRecoveryDesc: '1 小时后恢复100%' };
  const hrv = dash.hrv || { lastNight: 38, statusText: '正常', normalRange: '38 - 50 ms' };
  const predictions = dash.predictions || [];
  const pbs = dash.personalBests || [];
  const hrZones = account.hrZones || [];
  const paceZones = account.paceZones || [];

  return (
    <div className="space-y-6">
      {/* 顶部三张核心卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. 跑步能力仪表盘 */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 backdrop-blur shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-100 text-base">跑步能力 (EvoLab)</h3>
            </div>
            <span className="text-xs text-orange-400/90 bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-full font-medium">
              极佳水平
            </span>
          </div>

          <div className="flex items-center justify-center my-4 relative">
            <svg className="w-44 h-24" viewBox="0 0 100 50">
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="#334155"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="url(#orangeGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="125.6"
                strokeDashoffset="36"
              />
              <defs>
                <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute bottom-0 flex flex-col items-center">
              <span className="text-3xl font-black text-slate-100 tracking-tight font-mono">
                {rc.score}
              </span>
              <span className="text-[11px] text-slate-400 uppercase tracking-widest">Score</span>
            </div>
          </div>

          {/* 4 项子能力进度条 */}
          <div className="space-y-2 text-xs pt-3 border-t border-slate-800/80">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">有氧耐力 ({rc.aerobicPace || "06'38\"-07'54\""})</span>
              <span className="font-mono font-bold text-orange-400">{rc.aerobicEndurance}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(rc.aerobicEndurance / 100) * 100}%` }} />
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">乳酸阈能力 ({rc.lactatePace || "05'22\"-05'58\""})</span>
              <span className="font-mono font-bold text-emerald-400">{rc.lactateCapacity}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(rc.lactateCapacity / 100) * 100}%` }} />
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400">速度耐力 ({rc.speedPace || "04'54\"-05'21\""})</span>
              <span className="font-mono font-bold text-sky-400">{rc.speedEndurance}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full" style={{ width: `${(rc.speedEndurance / 100) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* 2. 训练量评估与体力恢复 */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 backdrop-blur shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <BatteryCharging className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-100 text-base">体力恢复 & 状态</h3>
              </div>
              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-medium">
                {rec.statusText}
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-2">
              <span className="text-4xl font-black text-slate-100 font-mono">{rec.percent}%</span>
              <span className="text-xs text-slate-400 font-medium">{rec.fullRecoveryDesc}</span>
            </div>

            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50 my-3">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${rec.percent}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">训练量评估</span>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {evalData.statusText}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {evalData.statusDescription}
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
              <div>
                <span className="text-[10px] text-slate-500 block">短期负荷 (ATL)</span>
                <span className="text-sm font-bold text-slate-200 font-mono">{evalData.shortTermLoad}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">长期负荷 (CTL)</span>
                <span className="text-sm font-bold text-slate-200 font-mono">{evalData.longTermLoad}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">负荷比 (TSB)</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">{evalData.loadRatio}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. 夜间 HRV 评估 */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 backdrop-blur shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Heart className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-100 text-base">HRV 心率变异性</h3>
              </div>
              <span className="text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full font-medium">
                评价：{hrv.statusText}
              </span>
            </div>

            <div className="flex items-baseline gap-4 my-2">
              <div>
                <span className="text-[11px] text-slate-400 block">昨晚平均</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-cyan-400 font-mono">{hrv.lastNight}</span>
                  <span className="text-xs text-slate-400">ms</span>
                </div>
              </div>
              <div className="border-l border-slate-800 pl-4">
                <span className="text-[11px] text-slate-400 block">正常基准范围</span>
                <span className="text-sm font-bold text-slate-200 font-mono">{hrv.normalRange}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed my-2">
              {hrv.desc}
            </p>
          </div>

          {/* 7 天 HRV 走势 */}
          <div className="pt-3 border-t border-slate-800/80">
            <span className="text-[10px] text-slate-500 block mb-1.5">7 天夜间 HRV 走势</span>
            <div className="flex items-end justify-between gap-1.5 h-12 pt-1">
              {hrv.trend?.map((item: any, idx: number) => {
                const heightPct = Math.min(100, Math.max(20, ((item.value - 20) / 40) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full max-w-[12px] bg-cyan-500/60 hover:bg-cyan-400 rounded-t transition-all"
                      style={{ height: `${heightPct}%` }}
                      title={`${item.date}: ${item.value}ms`}
                    />
                    <span className="text-[9px] text-slate-500 font-mono">{item.date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 中间层：马拉松成绩预测 & 个人最佳记录 (PB) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 成绩预测 */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 backdrop-blur shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Timer className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-100 text-base">马拉松与赛事成绩预测 (Race Predictor)</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {predictions.map((p: any, idx: number) => (
              <div key={idx} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center flex flex-col justify-between">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">
                  {p.distance}
                </span>
                <span className="text-base font-black text-slate-100 font-mono my-0.5">
                  {p.time}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {p.pace}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 个人最佳记录 (PB) */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 backdrop-blur shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-100 text-base">个人最佳记录 (Personal Bests)</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {pbs.map((pb: any, idx: number) => (
              <div key={idx} className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
                <span className="text-[11px] text-slate-400 font-medium truncate">{pb.event}</span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-black text-amber-400 font-mono">{pb.record}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{pb.pace}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部：心率区间 & 配速区间参考表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 心率区间 */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 backdrop-blur shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
              <span>❤️ 乳酸阈心率区间</span>
              <span className="text-xs font-normal text-slate-400">
                (乳酸阈 {account.lthr || 167} bpm · 最大 {account.maxHr || 188} bpm)
              </span>
            </h3>
          </div>

          <div className="space-y-2">
            {hrZones.map((z: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800/80 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: z.color }} />
                  <span className="text-slate-200 font-medium">{z.name}</span>
                </div>
                <span className="text-slate-400 font-mono font-semibold">{z.range}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 配速区间 */}
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 backdrop-blur shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
              <span>⏱️ 乳酸阈配速区间</span>
              <span className="text-xs font-normal text-slate-400">
                (乳酸阈配速 05&apos;29&quot;/km)
              </span>
            </h3>
          </div>

          <div className="space-y-2">
            {paceZones.map((z: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800/80 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: z.color }} />
                  <span className="text-slate-200 font-medium">{z.name}</span>
                </div>
                <span className="text-slate-400 font-mono font-semibold">{z.range}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

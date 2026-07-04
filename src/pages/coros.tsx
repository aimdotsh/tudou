import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar
} from 'recharts';

// 主色调与高驰科技暗黑风主题
const styles = {
  container: "coros-theme min-h-screen bg-[#080B11] text-[#E2E8F0] font-sans pb-12 select-none",
  header: "bg-[#0E131F]/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-800 px-6 py-4 flex items-center justify-between",
  tabBtn: (active: boolean) => `px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${active ? 'bg-[#20B2AA] text-white shadow-lg shadow-[#20B2AA]/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`,
  card: "bg-[#111625] border border-slate-800/80 rounded-xl p-5 shadow-xl hover:border-slate-700/60 transition-all",
  cardTitle: "text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center justify-between",
  indicatorValue: "text-3xl font-extrabold text-white tracking-tight",
  grid3: "grid grid-cols-1 lg:grid-cols-3 gap-6 px-6 mt-6",
  grid2: "grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 mt-6",
};

const CorosDashboardPage = () => {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis'>('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 加载 Mock 高驰 EvoLab 数据源
    const mockUrl = `${import.meta.env.BASE_URL}data/coros_evolab_mock.json`.replace(/\/+/g, '/');
    fetch(mockUrl)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("加载高驰数据失败", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen bg-[#080B11] items-center justify-center space-x-3">
        <div className="w-8 h-8 border-4 border-[#20B2AA] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-400 font-medium">正在同步高驰运动生理数据...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen bg-[#080B11] items-center justify-center flex-col space-y-4">
        <span className="text-slate-400">未发现高驰 EvoLab 本地数据源</span>
        <Link to="/" className="text-[#20B2AA] hover:underline">返回首页</Link>
      </div>
    );
  }

  // 跑步能力雷达环数据拟合
  const runningAbilityData = [
    { name: 'Max', value: 100, fill: 'transparent' },
    { name: '跑步能力', value: data.running_ability.score, fill: '#20B2AA' }
  ];

  return (
    <div className={styles.container}>
      <Helmet>
        <title>COROS Training Hub Pro | 仪表板</title>
      </Helmet>

      {/* 头部导航栏 */}
      <header className={styles.header}>
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center space-x-2 text-[#20B2AA] hover:opacity-80 transition-opacity">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-bold text-sm">返回大厅</span>
          </Link>
          <div className="h-4 w-px bg-slate-800"></div>
          <span className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#20B2AA] bg-clip-text text-transparent">
            COROS Training Hub
          </span>
        </div>

        {/* Tab 切换 */}
        <div className="flex bg-[#161C2C] p-1 rounded-lg border border-slate-800">
          <button
            className={styles.tabBtn(activeTab === 'dashboard')}
            onClick={() => setActiveTab('dashboard')}
          >
            仪表板
          </button>
          <button
            className={styles.tabBtn(activeTab === 'analysis')}
            onClick={() => setActiveTab('analysis')}
          >
            数据分析
          </button>
        </div>
      </header>

      {activeTab === 'dashboard' ? (
        <>
          {/* 第一排：跑步能力、训练量评估、7天表现 */}
          <div className={styles.grid3}>
            {/* 跑步能力仪表盘 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>跑步能力</span>
                <span className="text-[#20B2AA] text-[10px] bg-[#20B2AA]/10 px-1.5 py-0.5 rounded">EvoLab</span>
              </div>
              <div className="flex items-center justify-around h-[180px]">
                <div className="relative w-36 h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="80%"
                      outerRadius="100%"
                      barSize={10}
                      data={runningAbilityData}
                      startAngle={225}
                      endAngle={-45}
                    >
                      <RadialBar background={{ fill: '#1E293D' }} dataKey="value" cornerRadius={5} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-white">{data.running_ability.score}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">RUN ABILITY</span>
                  </div>
                </div>

                {/* 细分指标 */}
                <div className="flex-1 ml-4 space-y-2.5 text-xs">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>有氧耐力</span>
                      <span className="font-semibold text-white">{data.running_ability.sub_scores.aerobic_endurance.score}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1F293D] rounded-full overflow-hidden">
                      <div className="bg-[#20B2AA] h-full rounded-full" style={{ width: `${data.running_ability.sub_scores.aerobic_endurance.score}%` }}></div>
                    </div>
                    <span className="text-[9px] text-slate-500 block mt-0.5">{data.running_ability.sub_scores.aerobic_endurance.pace_range}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>乳酸阈能力</span>
                      <span className="font-semibold text-white">{data.running_ability.sub_scores.lactate_threshold.score}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1F293D] rounded-full overflow-hidden">
                      <div className="bg-[#10b981] h-full rounded-full" style={{ width: `${data.running_ability.sub_scores.lactate_threshold.score}%` }}></div>
                    </div>
                    <span className="text-[9px] text-slate-500 block mt-0.5">{data.running_ability.sub_scores.lactate_threshold.pace_range}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>速度耐力</span>
                      <span className="font-semibold text-white">{data.running_ability.sub_scores.speed_endurance.score}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1F293D] rounded-full overflow-hidden">
                      <div className="bg-[#eab308] h-full rounded-full" style={{ width: `${data.running_ability.sub_scores.speed_endurance.score}%` }}></div>
                    </div>
                    <span className="text-[9px] text-slate-500 block mt-0.5">{data.running_ability.sub_scores.speed_endurance.pace_range}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 训练量评估 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>训练量评估</span>
                <span className="text-[#f59e0b] text-[10px] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded">高效</span>
              </div>
              <div className="flex flex-col justify-between h-[180px]">
                <div>
                  <h3 className="text-xl font-bold text-[#f59e0b]">{data.training_status.state}</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {data.training_status.description}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800 text-center">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block mb-1">短期负荷</span>
                    <span className="text-lg font-extrabold text-white">{data.training_status.short_term_load}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block mb-1">长期负荷</span>
                    <span className="text-lg font-extrabold text-white">{data.training_status.long_term_load}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block mb-1">负荷比</span>
                    <span className="text-lg font-extrabold text-[#f59e0b]">{data.training_status.load_ratio}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 7天运动表现 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>7天运动表现</span>
                <span className="text-[#10b981] text-[10px] bg-[#10b981]/10 px-1.5 py-0.5 rounded">正常</span>
              </div>
              <div className="flex flex-col justify-between h-[180px]">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xs text-slate-400">今天</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className={styles.indicatorValue}>{data.seven_day_performance.score}%</span>
                    <span className="text-xs text-[#10b981] font-semibold">{data.seven_day_performance.status}</span>
                  </div>
                </div>
                <div className="w-full h-[110px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.seven_day_performance.daily_data}>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                      <YAxis domain={[50, 100]} hide />
                      <Bar dataKey="value" fill="#10b981" radius={[3, 3, 0, 0]} barSize={12} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* 第二排：最近运动、体力恢复、本周记录 */}
          <div className={styles.grid3}>
            {/* 最近运动列表 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>最近运动</span>
              </div>
              <div className="h-[200px] overflow-y-auto pr-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800 pb-2">
                      <th className="pb-2 font-medium">日期</th>
                      <th className="pb-2 font-medium text-right">运动量</th>
                      <th className="pb-2 font-medium text-right">运动强度</th>
                      <th className="pb-2 font-medium text-right">训练负荷</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {data.recent_workouts.map((w: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/20 text-slate-300">
                        <td className="py-2.5 font-medium">{w.date}</td>
                        <td className="py-2.5 text-right font-semibold text-[#20B2AA]">{w.distance}</td>
                        <td className="py-2.5 text-right text-slate-400">{w.intensity}</td>
                        <td className="py-2.5 text-right font-extrabold text-amber-500">{w.load}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 体力恢复 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>体力恢复</span>
              </div>
              <div className="flex items-center justify-around h-[200px]">
                <div className="flex flex-col justify-center">
                  <span className="text-5xl font-black text-[#10b981]">{data.recovery.percentage}%</span>
                  <span className="text-xs text-slate-400 mt-2 block">{data.recovery.remaining_hours} 小时后恢复100%</span>
                  <span className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wide">{data.recovery.advice}</span>
                </div>
                {/* 恢复小人 SVG 渲染 */}
                <div className="w-24 h-24 text-[#10b981] opacity-90 flex items-center justify-center relative">
                  <svg className="w-20 h-20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z" />
                  </svg>
                  <div className="absolute bottom-0 w-full h-1.5 bg-[#1F293D] rounded-full overflow-hidden">
                    <div className="bg-[#10b981] h-full rounded-full" style={{ width: `${data.recovery.percentage}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 本周运动记录 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>本周运动记录</span>
                <span className="text-xs text-slate-400 font-semibold">总距离 <strong className="text-[#20B2AA] font-black">{data.weekly_workouts.total_distance} km</strong></span>
              </div>
              <div className="h-[200px] flex flex-col justify-end">
                <div className="w-full h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.weekly_workouts.chart_data}>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111625', border: '1px solid #1e293b', borderRadius: '8px' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '10px' }}
                        itemStyle={{ color: '#20B2AA', fontSize: '12px' }}
                      />
                      <Bar dataKey="distance" fill="#38bdf8" radius={[3, 3, 0, 0]} barSize={16} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* 第三排：乳酸阈区间对比 */}
          <div className={styles.grid2}>
            {/* 乳酸阈心率区间 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>乳酸阈心率区间</span>
                <span className="text-xs text-slate-400 font-semibold">阈值心率 <strong className="text-rose-500 font-black">{data.heart_rate_zones.threshold_hr} bpm</strong></span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col justify-center border-r border-slate-800/80 pr-4">
                  <div className="text-[10px] text-slate-500 uppercase">最大心率 / 静息心率</div>
                  <div className="text-2xl font-black text-white mt-1">
                    {data.heart_rate_zones.max_hr} <span className="text-xs text-slate-500 font-normal">/ {data.heart_rate_zones.resting_hr} bpm</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {data.heart_rate_zones.zones.map((z: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: z.color }}></span>
                        <span className="text-slate-400">{z.name}</span>
                      </div>
                      <span className="font-bold text-white text-right">{z.range} bpm</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 乳酸阈配速区间 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>乳酸阈配速区间</span>
                <span className="text-xs text-slate-400 font-semibold">阈值配速 <strong className="text-[#20B2AA] font-black">{data.pace_zones.threshold_pace}</strong></span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col justify-center border-r border-slate-800/80 pr-4">
                  <div className="text-[10px] text-slate-500 uppercase">乳酸阈配速</div>
                  <div className="text-2xl font-black text-[#20B2AA] mt-1">
                    {data.pace_zones.threshold_pace} <span className="text-xs text-slate-500 font-normal">/km</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {data.pace_zones.zones.map((z: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: z.color }}></span>
                        <span className="text-slate-400">{z.name}</span>
                      </div>
                      <span className="font-bold text-white text-right">{z.range}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 第四排：个人纪录与成绩预测 */}
          <div className={styles.grid2}>
            {/* 个人跑步记录 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>个人跑步记录 (4周内)</span>
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800 pb-2">
                    <th className="pb-2 font-medium">项目</th>
                    <th className="pb-2 font-medium text-right">记录</th>
                    <th className="pb-2 font-medium text-right">平均配速</th>
                    <th className="pb-2 font-medium text-right">日期</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {data.personal_records.map((r: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-800/20 text-slate-300">
                      <td className="py-2.5 font-medium">{r.project}</td>
                      <td className="py-2.5 text-right font-bold text-white">{r.record}</td>
                      <td className="py-2.5 text-right text-slate-400">{r.pace}</td>
                      <td className="py-2.5 text-right text-slate-500">{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 成绩预测 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>EvoLab 成绩预测</span>
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800 pb-2">
                    <th className="pb-2 font-medium">项目</th>
                    <th className="pb-2 font-medium text-right">预计完赛时间</th>
                    <th className="pb-2 font-medium text-right">预计平均配速</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {data.race_predictions.map((p: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-800/20 text-slate-300">
                      <td className="py-3 font-semibold text-slate-200">{p.project}</td>
                      <td className="py-3 text-right font-black text-[#20B2AA]">{p.time}</td>
                      <td className="py-3 text-right text-slate-400">{p.pace}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 第五排：HRV评估 */}
          <div className="px-6 mt-6 pb-8">
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>HRV 评估 (最近7天)</span>
                <span className="text-xs text-slate-400 font-semibold">昨晚平均 <strong className="text-white font-black">{data.hrv_eval.resting_average}</strong> (正常范围 {data.hrv_eval.normal_range})</span>
              </div>
              <div className="h-[180px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.hrv_eval.chart_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                    <YAxis domain={[30, 60]} hide />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111625', border: '1px solid #1e293b', borderRadius: '8px' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '10px' }}
                    />
                    <Area type="monotone" dataKey="value" fill="url(#hrvGradient)" stroke="#20B2AA" strokeWidth={2} dot={{ r: 4, fill: '#20B2AA', strokeWidth: 0 }} />
                    <defs>
                      <linearGradient id="hrvGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#20B2AA" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#20B2AA" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* 数据分析页面（12周高级图表历史） */
        <div className="px-6 mt-6 pb-12 space-y-6">
          {/* 训练量负荷评估折线图 */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <span>训练量负荷历史与预测 (EvoLab 12周)</span>
              <span className="text-xs text-slate-500 font-semibold">本周长期负荷: <strong className="text-white">{data.training_status.long_term_load}</strong> | 短期负荷: <strong className="text-white">{data.training_status.short_term_load}</strong></span>
            </div>
            <div className="h-[280px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.training_load_history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 200]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111625', border: '1px solid #1e293b', borderRadius: '8px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '10px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line yAxisId="left" type="monotone" name="长期负荷" dataKey="long_term" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line yAxisId="left" type="monotone" name="短期负荷" dataKey="short_term" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" name="负荷比 (%)" dataKey="ratio" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 跑步能力与运动表现折线图 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>跑步能力表现波动</span>
              </div>
              <div className="h-[220px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.training_load_history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                    <YAxis domain={[65, 75]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#111625', border: '1px solid #1e293b' }} />
                    <Line type="monotone" name="跑步能力值" dataKey="long_term" stroke="#20B2AA" strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 静息心率与最大摄氧量趋势 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>静息心率与最大摄氧量 (VO2max) 历史</span>
              </div>
              <div className="h-[220px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.training_load_history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                    <YAxis yAxisId="left" domain={[50, 60]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" domain={[35, 45]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#111625', border: '1px solid #1e293b' }} />
                    <Line yAxisId="left" type="monotone" name="静息心率" dataKey="long_term" stroke="#ef4444" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" name="最大摄氧量" dataKey="short_term" stroke="#a855f7" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorosDashboardPage;

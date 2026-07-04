import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import activitiesData from '@/static/activities_export';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  BarChart,
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

// 辅助函数：将秒数格式化为 hh:mm:ss
const formatSeconds = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [
    h.toString().padStart(2, '0'),
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0')
  ].join(':');
};

const CorosDashboardPage = () => {
  const [evolabData, setEvolabData] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis' | 'activities' | 'schedule'>('dashboard');
  const [loading, setLoading] = useState(true);

  // 数据分析 Tab 内部状态
  const [summaryType, setSummaryType] = useState<'all' | 'running' | 'cycling' | 'walking' | 'swimming'>('all');
  const [recordMetric, setRecordMetric] = useState<'load' | 'distance' | 'time_minutes' | 'count'>('load');

  // 活动列表 Tab 内部状态
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  // 日程 Tab 内部状态（默认展示当前年、月）
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  useEffect(() => {
    // 异步加载 EvoLab Mock 数据
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
    const evolabUrl = `${basePath}/data/coros_evolab_mock.json`.replace(/\/+/g, '/');

    fetch(evolabUrl)
      .then(res => res.json())
      .then(evolabJson => {
        setEvolabData(evolabJson);
        // 按时间从新到旧排序静态导入的数据
        const sorted = [...activitiesData].sort((a: any, b: any) => {
          return new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime();
        });
        setActivities(sorted);
        setLoading(false);
      })
      .catch(err => {
        console.error("加载数据失败", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen bg-[#080B11] items-center justify-center space-x-3">
        <div className="w-8 h-8 border-4 border-[#20B2AA] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-400 font-medium">正在加载高驰运动科学大盘...</span>
      </div>
    );
  }

  if (!evolabData) {
    return (
      <div className="flex h-screen bg-[#080B11] items-center justify-center flex-col space-y-4">
        <span className="text-slate-400">未发现高驰 EvoLab 本地数据源</span>
        <Link to="/" className="text-[#20B2AA] hover:underline">返回首页</Link>
      </div>
    );
  }

  // 跑步能力极坐标环数据拟合
  const runningAbilityData = [
    { name: 'Max', value: 100, fill: 'transparent' },
    { name: '跑步能力', value: evolabData.running_ability.score, fill: '#20B2AA' }
  ];

  // 12周运动记录数据解析与切换
  const recordChartData = evolabData.workout_records_12weeks[recordMetric] || [];
  const metricLabelMap = {
    load: "训练负荷",
    distance: "总距离",
    time_minutes: "总时间",
    count: "总次数"
  };
  const metricUnitMap = {
    load: "TL",
    distance: "km",
    time_minutes: "分钟",
    count: "次"
  };
  const recordTotal = recordChartData.reduce((acc: number, cur: any) => acc + cur.value, 0);

  // 运动记录过滤 logic
  const filteredActivities = activities.filter((act: any) => {
    if (activityTypeFilter === 'all') return true;
    if (activityTypeFilter === 'Run') return act.type === 'Run' || act.type === 'Trail Run';
    if (activityTypeFilter === 'Ride') return act.type === 'Ride' || act.type === 'Indoor Ride';
    if (activityTypeFilter === 'Swim') return act.type === 'Swim';
    if (activityTypeFilter === 'Hike') return act.type === 'Hike' || act.type === 'Walk';
    return true;
  });

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage) || 1;
  const paginatedActivities = filteredActivities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 日历生成逻辑
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDay = firstDayOfMonth.getDay(); // 0 = 周日，1 = 周一...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 月历网格填充（42个格子，以周一开始）
  const calendarCells = [];
  const startOffset = startingDay === 0 ? 6 : startingDay - 1; // 转换为以周一作为首列

  // 填充上月尾部
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    calendarCells.push({
      dateStr: `${month === 0 ? year - 1 : year}-${(month === 0 ? 12 : month).toString().padStart(2, '0')}-${(prevMonthDays - i).toString().padStart(2, '0')}`,
      dayNum: prevMonthDays - i,
      isCurrentMonth: false
    });
  }

  // 填充本月
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({
      dateStr: `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`,
      dayNum: i,
      isCurrentMonth: true
    });
  }

  // 填充下月头部
  const remaining = 42 - calendarCells.length;
  for (let i = 1; i <= remaining; i++) {
    calendarCells.push({
      dateStr: `${month === 11 ? year + 1 : year}-${(month === 11 ? 1 : month + 2).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`,
      dayNum: i,
      isCurrentMonth: false
    });
  }

  // 归并同一天的运动数据
  const dailyWorkoutsMap: { [dateStr: string]: any[] } = {};
  activities.forEach(act => {
    // 假设 start_date_local 格式为 "2026-07-04 10:20:30"
    if (act.start_date_local) {
      const datePart = act.start_date_local.split(' ')[0];
      if (!dailyWorkoutsMap[datePart]) {
        dailyWorkoutsMap[datePart] = [];
      }
      dailyWorkoutsMap[datePart].push(act);
    }
  });

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

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

        {/* Tab 切换（扩展至4个Tab） */}
        <div className="flex bg-[#161C2C] p-1 rounded-lg border border-slate-800 space-x-1">
          {(['dashboard', 'analysis', 'activities', 'schedule'] as const).map(tab => {
            const labelMap = {
              dashboard: '仪表板',
              analysis: '数据分析',
              activities: '活动列表',
              schedule: '日程'
            };
            return (
              <button
                key={tab}
                className={styles.tabBtn(activeTab === tab)}
                onClick={() => setActiveTab(tab)}
              >
                {labelMap[tab]}
              </button>
            );
          })}
        </div>
      </header>

      {/* ==================== 1. 仪表板 Tab ==================== */}
      {activeTab === 'dashboard' && (
        <>
          <div className={styles.grid3}>
            {/* 跑步能力 */}
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
                    <span className="text-3xl font-black text-white">{evolabData.running_ability.score}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">RUN ABILITY</span>
                  </div>
                </div>

                <div className="flex-1 ml-4 space-y-2.5 text-xs">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>有氧耐力</span>
                      <span className="font-semibold text-white">{evolabData.running_ability.sub_scores.aerobic_endurance.score}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1F293D] rounded-full overflow-hidden">
                      <div className="bg-[#20B2AA] h-full rounded-full" style={{ width: `${evolabData.running_ability.sub_scores.aerobic_endurance.score}%` }}></div>
                    </div>
                    <span className="text-[9px] text-slate-500 block mt-0.5">{evolabData.running_ability.sub_scores.aerobic_endurance.pace_range}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>乳酸阈能力</span>
                      <span className="font-semibold text-white">{evolabData.running_ability.sub_scores.lactate_threshold.score}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1F293D] rounded-full overflow-hidden">
                      <div className="bg-[#10b981] h-full rounded-full" style={{ width: `${evolabData.running_ability.sub_scores.lactate_threshold.score}%` }}></div>
                    </div>
                    <span className="text-[9px] text-slate-500 block mt-0.5">{evolabData.running_ability.sub_scores.lactate_threshold.pace_range}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>速度耐力</span>
                      <span className="font-semibold text-white">{evolabData.running_ability.sub_scores.speed_endurance.score}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1F293D] rounded-full overflow-hidden">
                      <div className="bg-[#eab308] h-full rounded-full" style={{ width: `${evolabData.running_ability.sub_scores.speed_endurance.score}%` }}></div>
                    </div>
                    <span className="text-[9px] text-slate-500 block mt-0.5">{evolabData.running_ability.sub_scores.speed_endurance.pace_range}</span>
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
                  <h3 className="text-xl font-bold text-[#f59e0b]">{evolabData.training_status.state}</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {evolabData.training_status.description}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800 text-center">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block mb-1">短期负荷</span>
                    <span className="text-lg font-extrabold text-white">{evolabData.training_status.short_term_load}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block mb-1">长期负荷</span>
                    <span className="text-lg font-extrabold text-white">{evolabData.training_status.long_term_load}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase block mb-1">负荷比</span>
                    <span className="text-lg font-extrabold text-[#f59e0b]">{evolabData.training_status.load_ratio}%</span>
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
                    <span className={styles.indicatorValue}>{evolabData.seven_day_performance.score}%</span>
                    <span className="text-xs text-[#10b981] font-semibold">{evolabData.seven_day_performance.status}</span>
                  </div>
                </div>
                <div className="w-full h-[110px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={evolabData.seven_day_performance.daily_data}>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                      <YAxis domain={[50, 100]} hide />
                      <Bar dataKey="value" fill="#10b981" radius={[3, 3, 0, 0]} barSize={12} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

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
                    {evolabData.recent_workouts.map((w: any, idx: number) => (
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
                  <span className="text-5xl font-black text-[#10b981]">{evolabData.recovery.percentage}%</span>
                  <span className="text-xs text-slate-400 mt-2 block">{evolabData.recovery.remaining_hours} 小时后恢复100%</span>
                  <span className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wide">{evolabData.recovery.advice}</span>
                </div>
                <div className="w-24 h-24 text-[#10b981] opacity-90 flex items-center justify-center relative">
                  <svg className="w-20 h-20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z" />
                  </svg>
                  <div className="absolute bottom-0 w-full h-1.5 bg-[#1F293D] rounded-full overflow-hidden">
                    <div className="bg-[#10b981] h-full rounded-full" style={{ width: `${evolabData.recovery.percentage}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 本周运动记录 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>本周运动记录</span>
                <span className="text-xs text-slate-400 font-semibold">总距离 <strong className="text-[#20B2AA] font-black">{evolabData.weekly_workouts.total_distance} km</strong></span>
              </div>
              <div className="h-[200px] flex flex-col justify-end">
                <div className="w-full h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={evolabData.weekly_workouts.chart_data}>
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

          <div className={styles.grid2}>
            {/* 乳酸阈心率区间 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>乳酸阈心率区间</span>
                <span className="text-xs text-slate-400 font-semibold">阈值心率 <strong className="text-rose-500 font-black">{evolabData.heart_rate_zones.threshold_hr} bpm</strong></span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col justify-center border-r border-slate-800/80 pr-4">
                  <div className="text-[10px] text-slate-500 uppercase">最大心率 / 静息心率</div>
                  <div className="text-2xl font-black text-white mt-1">
                    {evolabData.heart_rate_zones.max_hr} <span className="text-xs text-slate-500 font-normal">/ {evolabData.heart_rate_zones.resting_hr} bpm</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {evolabData.heart_rate_zones.zones.map((z: any, idx: number) => (
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
                <span className="text-xs text-slate-400 font-semibold">阈值配速 <strong className="text-[#20B2AA] font-black">{evolabData.pace_zones.threshold_pace}</strong></span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col justify-center border-r border-slate-800/80 pr-4">
                  <div className="text-[10px] text-slate-500 uppercase">乳酸阈配速</div>
                  <div className="text-2xl font-black text-[#20B2AA] mt-1">
                    {evolabData.pace_zones.threshold_pace} <span className="text-xs text-slate-500 font-normal">/km</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {evolabData.pace_zones.zones.map((z: any, idx: number) => (
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
                  {evolabData.personal_records.map((r: any, idx: number) => (
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
                  {evolabData.race_predictions.map((p: any, idx: number) => (
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

          <div className="px-6 mt-6 pb-8">
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>HRV 评估 (最近7天)</span>
                <span className="text-xs text-slate-400 font-semibold">昨晚平均 <strong className="text-white font-black">{evolabData.hrv_eval.resting_average}</strong> (正常范围 {evolabData.hrv_eval.normal_range})</span>
              </div>
              <div className="h-[180px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={evolabData.hrv_eval.chart_data}>
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
      )}

      {/* ==================== 2. 数据分析 Tab (像素级还原排版) ==================== */}
      {activeTab === 'analysis' && (
        <div className="px-6 mt-6 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左侧分栏：训练量评估 (12周) 和 运动记录 (12周) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 训练量评估 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-sm text-slate-100">训练量评估 <span className="text-slate-500 font-normal text-xs">(12周)</span></span>
                  <svg className="w-3.5 h-3.5 text-slate-500 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <svg className="w-4 h-4 text-slate-500 hover:text-white cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={evolabData.training_load_history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 180]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#111625', border: '1px solid #1e293b' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line yAxisId="left" type="monotone" name="长期负荷" dataKey="long_term" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line yAxisId="left" type="monotone" name="短期负荷" dataKey="short_term" stroke="#38bdf8" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" name="负荷比 (%)" dataKey="ratio" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 运动记录 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-sm text-slate-100">运动记录 <span className="text-slate-500 font-normal text-xs">(12周)</span></span>
                  <svg className="w-3.5 h-3.5 text-slate-500 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-slate-400">总{metricLabelMap[recordMetric]} <strong className="text-white text-sm font-black ml-1">{recordTotal} {metricUnitMap[recordMetric]}</strong></span>
                  <select
                    value={recordMetric}
                    onChange={(e) => setRecordMetric(e.target.value as any)}
                    className="bg-[#1C2436] text-xs font-semibold text-slate-200 border border-slate-800 rounded px-2.5 py-1 focus:outline-none focus:border-[#20B2AA]"
                  >
                    <option value="load">训练负荷</option>
                    <option value="distance">总距离</option>
                    <option value="time_minutes">总时间</option>
                    <option value="count">总次数</option>
                  </select>
                </div>
              </div>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recordChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#111625', border: '1px solid #1e293b' }} />
                    <Bar dataKey="value" fill="#2563eb" barSize={16} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 右侧分栏：训练概要 (4周) 和 跑步能力与运动表现 */}
          <div className="lg:col-span-5 space-y-6">
            {/* 训练概要 (4周) */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span className="font-extrabold text-sm text-slate-100">训练概要 <span className="text-slate-500 font-normal text-xs">(4周)</span></span>
                <select
                  value={summaryType}
                  onChange={(e) => setSummaryType(e.target.value as any)}
                  className="bg-[#1C2436] text-xs font-semibold text-slate-200 border border-slate-800 rounded px-2.5 py-1 focus:outline-none focus:border-[#20B2AA]"
                >
                  <option value="all">全部</option>
                  <option value="running">跑步</option>
                  <option value="cycling">骑行</option>
                  <option value="walking">步行</option>
                  <option value="swimming">游泳</option>
                </select>
              </div>
              {/* 四格大卡片布局还原 */}
              <div className="grid grid-cols-2 gap-4 mt-2">
                {/* 总距离 */}
                <div className="bg-[#161C2C] border border-slate-800/60 rounded-lg p-4 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">总距离</span>
                  <div>
                    <span className="text-2xl font-black text-[#38bdf8]">{evolabData.training_summary_4weeks[summaryType].distance}</span>
                    <span className="text-xs text-slate-400 font-bold ml-1">km</span>
                  </div>
                </div>
                {/* 总时间 */}
                <div className="bg-[#161C2C] border border-slate-800/60 rounded-lg p-4 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">总时间</span>
                  <div>
                    <span className="text-2xl font-black text-white">{evolabData.training_summary_4weeks[summaryType].time}</span>
                  </div>
                </div>
                {/* 总负荷 */}
                <div className="bg-[#161C2C] border border-slate-800/60 rounded-lg p-4 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">总负荷</span>
                  <div>
                    <span className="text-2xl font-black text-amber-500">{evolabData.training_summary_4weeks[summaryType].load}</span>
                    <span className="text-xs text-slate-500 font-semibold ml-1">TL</span>
                  </div>
                </div>
                {/* 总次数 */}
                <div className="bg-[#161C2C] border border-slate-800/60 rounded-lg p-4 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">总次数</span>
                  <div>
                    <span className="text-2xl font-black text-emerald-500">{evolabData.training_summary_4weeks[summaryType].count}</span>
                    <span className="text-xs text-slate-500 font-semibold ml-1">次</span>
                  </div>
                </div>
              </div>
              {/* 心率概要横线 */}
              <div className="mt-4 pt-3 border-t border-slate-850 flex justify-between items-center text-xs text-slate-400 px-1">
                <span>平均心率</span>
                <span className="font-extrabold text-white">{evolabData.training_summary_4weeks[summaryType].avg_hr} <span className="text-[10px] text-slate-500 font-normal">bpm</span></span>
              </div>
            </div>

            {/* 跑步能力与运动表现 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-sm text-slate-100">跑步能力与运动表现 <span className="text-slate-500 font-normal text-xs">(12周)</span></span>
                </div>
              </div>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={evolabData.training_load_history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                    <YAxis domain={[65, 75]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#111625', border: '1px solid #1e293b' }} />
                    <Line type="monotone" name="能力值" dataKey="long_term" stroke="#20B2AA" strokeWidth={2} dot={{ r: 3, fill: '#20B2AA' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 3. 活动列表 Tab ==================== */}
      {activeTab === 'activities' && (
        <div className="px-6 mt-6 pb-12 space-y-6">
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <span className="font-extrabold text-sm text-slate-100">所有活动列表</span>
              <div className="flex items-center space-x-3">
                {/* 过滤器 */}
                <select
                  value={activityTypeFilter}
                  onChange={(e) => {
                    setActivityTypeFilter(e.target.value);
                    setCurrentPage(1); // 过滤器重置页码
                  }}
                  className="bg-[#1C2436] text-xs font-semibold text-slate-200 border border-slate-800 rounded px-2.5 py-1 focus:outline-none focus:border-[#20B2AA]"
                >
                  <option value="all">类型: 全部</option>
                  <option value="Run">类型: 跑步</option>
                  <option value="Ride">类型: 骑行</option>
                  <option value="Swim">类型: 游泳</option>
                  <option value="Hike">类型: 徒步/步行</option>
                </select>
              </div>
            </div>

            {/* 活动明细表格 */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-850 pb-2">
                    <th className="pb-3 font-semibold pl-2">运动日期</th>
                    <th className="pb-3 font-semibold">名称/描述</th>
                    <th className="pb-3 font-semibold">类型</th>
                    <th className="pb-3 font-semibold text-right">距离</th>
                    <th className="pb-3 font-semibold text-right">总用时</th>
                    <th className="pb-3 font-semibold text-right">平均配速</th>
                    <th className="pb-3 font-semibold text-right">平均心率</th>
                    <th className="pb-3 font-semibold text-right pr-2">爬升</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60">
                  {paginatedActivities.map((act: any, idx: number) => {
                    const typeColorMap: { [key: string]: string } = {
                      'Run': 'text-[#20B2AA]',
                      'Trail Run': 'text-emerald-400',
                      'Ride': 'text-amber-400',
                      'Swim': 'text-sky-400',
                      'Hike': 'text-purple-400',
                      'Walk': 'text-purple-400'
                    };
                    return (
                      <tr key={idx} className="hover:bg-slate-850/40 text-slate-300 transition-colors">
                        <td className="py-3 pl-2 font-medium text-slate-400">{act.start_date_local || '--'}</td>
                        <td className="py-3 font-extrabold text-white max-w-xs truncate">{act.name || '跑步'}</td>
                        <td className={`py-3 font-semibold ${typeColorMap[act.type] || 'text-slate-300'}`}>{act.type}</td>
                        <td className="py-3 text-right font-black text-[#20B2AA]">{(act.distance / 1000).toFixed(2)} km</td>
                        <td className="py-3 text-right font-semibold">{act.moving_time}</td>
                        <td className="py-3 text-right text-slate-400">{act.pace || '--'}</td>
                        <td className="py-3 text-right font-semibold text-rose-500">{act.average_heartrate ? `${Math.round(act.average_heartrate)} bpm` : '--'}</td>
                        <td className="py-3 text-right font-semibold text-slate-400 pr-2">{act.total_elevation_gain ? `${Math.round(act.total_elevation_gain)} m` : '--'}</td>
                      </tr>
                    );
                  })}
                  {paginatedActivities.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 font-semibold">
                        当前类型下暂无相关活动记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 分页控制器 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-5 border-t border-slate-850 mt-4 text-xs">
                <span className="text-slate-500 font-semibold">显示第 {(currentPage - 1) * itemsPerPage + 1} 到 {Math.min(currentPage * itemsPerPage, filteredActivities.length)} 条记录，共 {filteredActivities.length} 条</span>
                <div className="flex space-x-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                    className="px-3 py-1.5 bg-[#1C2436] rounded border border-slate-800 hover:bg-slate-800/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    上一页
                  </button>
                  <span className="px-3 py-1.5 bg-[#161C2C] text-[#20B2AA] border border-slate-800 font-bold rounded">{currentPage} / {totalPages}</span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                    className="px-3 py-1.5 bg-[#1C2436] rounded border border-slate-800 hover:bg-slate-800/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== 4. 日程 Tab (万年历) ==================== */}
      {activeTab === 'schedule' && (
        <div className="px-6 mt-6 pb-12 space-y-6">
          <div className={styles.card}>
            {/* 日历头部 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <span className="font-extrabold text-base text-slate-100">运动日程</span>
                <div className="h-4 w-px bg-slate-800"></div>
                <span className="text-sm font-bold text-[#20B2AA]">
                  {year} 年 {month + 1} 月
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => changeMonth(-1)}
                  className="p-1.5 bg-[#1C2436] hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1 bg-[#1C2436] hover:bg-slate-800 text-xs font-semibold text-slate-350 rounded border border-slate-800 transition-colors"
                >
                  今天
                </button>
                <button
                  onClick={() => changeMonth(1)}
                  className="p-1.5 bg-[#1C2436] hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 星期标题头 */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-850 pb-2">
              <div>周一</div>
              <div>周二</div>
              <div>周三</div>
              <div>周四</div>
              <div>周五</div>
              <div>周六</div>
              <div>周日</div>
            </div>

            {/* 日历格子排版 */}
            <div className="grid grid-cols-7 gap-2">
              {calendarCells.map((cell, idx) => {
                const dayWorkouts = dailyWorkoutsMap[cell.dateStr] || [];
                const totalDist = dayWorkouts.reduce((sum, item) => sum + item.distance, 0) / 1000;
                
                // 为了演示和拟合，如果当天没有跑，但 Mock 数据存在，我们就按比例绘制（这里我们只画真实的）
                return (
                  <div
                    key={idx}
                    className={`min-h-[90px] border border-slate-850/80 rounded-lg p-2 flex flex-col justify-between transition-colors relative group ${cell.isCurrentMonth ? 'bg-[#141A29]' : 'bg-[#0E1320] opacity-30'} ${dayWorkouts.length > 0 ? 'hover:border-[#20B2AA]/50' : ''}`}
                  >
                    <span className={`text-xs font-bold ${cell.isCurrentMonth ? 'text-slate-400' : 'text-slate-600'}`}>
                      {cell.dayNum}
                    </span>

                    {/* 当天有运动时的气泡和标记 */}
                    {dayWorkouts.length > 0 && (
                      <div className="flex flex-col space-y-1 mt-2">
                        {/* 距离气泡 */}
                        <div className="bg-[#20B2AA]/15 border border-[#20B2AA]/30 text-[#20B2AA] text-[9px] font-black px-1.5 py-0.5 rounded text-center">
                          {totalDist.toFixed(1)} km
                        </div>
                        {/* 运动描述悬浮 */}
                        <div className="absolute z-10 hidden group-hover:block bottom-12 left-1/2 -translate-x-1/2 w-48 bg-[#1B2234] border border-slate-700 p-2.5 rounded-lg shadow-2xl text-left text-[10px] text-slate-350">
                          <div className="font-extrabold text-white border-b border-slate-800 pb-1 mb-1">{cell.dateStr}</div>
                          {dayWorkouts.map((w, wIdx) => (
                            <div key={wIdx} className="mb-1 last:mb-0">
                              <span className="font-black text-[#20B2AA]">{(w.distance / 1000).toFixed(2)}km</span> | {w.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorosDashboardPage;

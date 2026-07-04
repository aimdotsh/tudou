import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface ICorosDashboardProps {
  runId: number | null;
  runName?: string;
  onClose: () => void;
}

const CorosDashboard = ({ runId, runName, onClose }: ICorosDashboardProps) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [chartMode, setChartMode] = useState<'time' | 'distance'>('distance'); // 图表横轴：时间或距离
  const [activeTab, setActiveTab] = useState<'chart' | 'laps'>('chart'); // 图表/分圈数据 tab

  useEffect(() => {
    if (!runId) {
      setData(null);
      return;
    }
    setLoading(true);
    
    // 先请求映射关系表，用以兼容旧的 Strava 活动 ID
    const mappingUrl = `${import.meta.env.BASE_URL}data/coros_id_mapping.json`.replace(/\/+/g, '/');
    fetch(mappingUrl)
      .then((res) => {
        if (!res.ok) return {};
        return res.json();
      })
      .then((mapping) => {
        const targetId = mapping[String(runId)] || runId;
        const detailUrl = `${import.meta.env.BASE_URL}data/coros_detail/${targetId}.json`.replace(/\/+/g, '/');
        return fetch(detailUrl);
      })
      .then((res) => {
        if (!res.ok) throw new Error("No detail data");
        return res.json();
      })
      .then((jsonData) => {
        setData(jsonData);
        setLoading(false);
      })
      .catch(() => {
        setData(null);
        setLoading(false);
      });
  }, [runId]);

  if (loading) {
    return (
      <div className="absolute inset-0 bg-white/30 backdrop-blur-[1.5px] z-20 flex items-center justify-center space-x-2 text-slate-700 rounded-lg select-none">
        <div className="w-5 h-5 border-2 border-[#20B2AA] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold">正在解析高驰手表数据...</span>
      </div>
    );
  }

  if (!data) return null;

  // 格式化时间函数
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 格式化配速函数
  const formatPace = (paceSeconds: number | null) => {
    if (!paceSeconds || paceSeconds === Infinity || isNaN(paceSeconds)) return '--';
    const mins = Math.floor(paceSeconds / 60);
    const secs = Math.round(paceSeconds % 60);
    return `${mins}'${secs.toString().padStart(2, '0')}"`;
  };

  // 数据预处理
  const chartData = data.records.map((r: any) => {
    // 速度 (m/s) 转换为配速秒数 (seconds/km)
    const paceSeconds = r.speed && r.speed > 0.1 ? 1000 / r.speed : null;
    return {
      ...r,
      // 过滤异常的超慢速点，防止拉高坐标轴
      pace: paceSeconds && paceSeconds < 1200 ? paceSeconds : null,
      distanceKm: Number((r.distance / 1000).toFixed(2)),
      timeFormatted: formatTime(r.time_offset),
    };
  });

  // 分圈平均配速格式化
  const getLapPace = (lapSpeed: number) => {
    if (!lapSpeed || lapSpeed <= 0.1) return '--';
    return formatPace(1000 / lapSpeed);
  };

  // 格式化 X 轴刻度
  const formatXAxis = (tick: any) => {
    if (chartMode === 'distance') {
      return `${tick} km`;
    }
    return formatTime(tick);
  };

  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const activePoint = payload[0].payload;
      return (
        <div className="bg-white/95 border border-slate-200/80 p-2.5 rounded shadow-xl text-[10px] space-y-1 text-slate-800 backdrop-blur-sm z-30">
          <div className="font-bold border-b border-slate-100 pb-1 mb-1 text-slate-500">
            {chartMode === 'distance' ? `距离: ${activePoint.distanceKm} km` : `时间: ${activePoint.timeFormatted}`}
          </div>
          {payload.map((p: any) => {
            if (p.name === '配速') {
              return (
                <div key={p.name} className="flex justify-between space-x-6">
                  <span style={{ color: p.color }}>配速:</span>
                  <span className="font-semibold">{formatPace(p.value)} /km</span>
                </div>
              );
            }
            return (
              <div key={p.name} className="flex justify-between space-x-6">
                <span style={{ color: p.color }}>{p.name}:</span>
                <span className="font-semibold">{p.value} {p.name === '心率' ? 'bpm' : p.name === '海拔' ? 'm' : p.name === '功率' ? 'W' : 'spm'}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // 有没有检测到功率数据
  const hasPower = data.records.some((r: any) => r.power && r.power > 0);

  // 标题优先使用从外部传进来的数据库自定义标题
  const displayName = runName || data.summary.name || "高驰运动详情";

  return (
    <div 
      className="absolute inset-0 bg-transparent z-20 flex flex-col md:block p-3 select-none text-slate-800 rounded-lg overflow-hidden"
      onClick={(e) => {
        // 点击空白处直接关闭数据蒙版
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* 左上角控制与数据概览卡片已按用户指示全部去掉，以防遮挡轨迹 */}

      {/* 右下角折线图与分圈明细卡片 - 超紧凑版 */}
      <div 
        className="absolute bottom-2 left-2 w-[calc(100%-16px)] h-[150px] md:bottom-2 md:right-2 md:left-auto md:w-[350px] md:h-[185px] bg-white/50 backdrop-blur-[6px] rounded-lg p-2 border border-white/40 shadow-lg flex flex-col justify-between overflow-hidden z-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tab 选项栏 */}
        <div className="flex border-b border-slate-100 pb-1 mb-1.5 text-[10px] items-center justify-between">
          <div className="flex space-x-2">
            <button
              className={`pb-0.5 pr-1 font-semibold transition-colors ${activeTab === 'chart' ? 'text-[#20B2AA] border-b border-[#20B2AA]' : 'text-slate-400 hover:text-slate-600'}`}
              onClick={() => setActiveTab('chart')}
            >
              📊 曲线
            </button>
            <button
              className={`pb-0.5 pr-1 font-semibold transition-colors ${activeTab === 'laps' ? 'text-[#20B2AA] border-b border-[#20B2AA]' : 'text-slate-400 hover:text-slate-600'}`}
              onClick={() => setActiveTab('laps')}
            >
              ⏱️ 圈速
            </button>
          </div>

          <div className="flex items-center space-x-1.5 ml-auto">
            {/* 颜色曲线含义图例 */}
            {activeTab === 'chart' && (
              <div className="flex space-x-1 text-[8px] text-slate-500 scale-90 origin-right items-center mr-1">
                <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-0.5 inline-block"></span>心率</span>
                <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-[#20B2AA] mr-0.5 inline-block"></span>配速</span>
                {hasPower && (
                  <span className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-0.5 inline-block"></span>功率</span>
                )}
              </div>
            )}

            {/* 距离/时间 横轴模式切换 */}
            {activeTab === 'chart' && (
              <div className="flex bg-slate-50 rounded p-0.5 border border-slate-200/80 text-[8px] scale-90 origin-right">
                <button
                  className={`px-1 py-0.2 rounded transition-all ${chartMode === 'distance' ? 'bg-[#20B2AA] font-bold text-white' : 'text-slate-500'}`}
                  onClick={() => setChartMode('distance')}
                >
                  距离
                </button>
                <button
                  className={`px-1 py-0.2 rounded transition-all ${chartMode === 'time' ? 'bg-[#20B2AA] font-bold text-white' : 'text-slate-500'}`}
                  onClick={() => setChartMode('time')}
                >
                  时间
                </button>
              </div>
            )}

            {/* 关闭详情 X 按钮 */}
            <button 
              onClick={onClose} 
              className="p-0.5 rounded-full hover:bg-slate-100/50 text-slate-400 hover:text-slate-600 transition-colors"
              title="关闭详情"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden relative -mb-1">
          {activeTab === 'chart' ? (
            <div className="w-full h-full text-slate-800">
              <ResponsiveContainer width="100%" height={135}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 5, right: -12, left: -25, bottom: -10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey={chartMode === 'distance' ? 'distanceKm' : 'time_offset'}
                    tickFormatter={formatXAxis}
                    stroke="#64748b"
                    fontSize={8}
                    tickLine={false}
                    axisLine={false}
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    height={12}
                  />
                  {/* 左Y轴：心率与功率 */}
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    stroke="#e11d48"
                    fontSize={8}
                    tickLine={false}
                    axisLine={false}
                    domain={['dataMin - 10', 'dataMax + 10']}
                    width={20}
                  />
                  {/* 右Y轴：配速 */}
                  <YAxis
                    yAxisId="right-pace"
                    orientation="right"
                    reversed
                    stroke="#20B2AA"
                    fontSize={8}
                    tickFormatter={formatPace}
                    tickLine={false}
                    axisLine={false}
                    domain={['dataMin - 30', 'dataMax + 30']}
                    width={24}
                  />
                  {/* 海拔Y轴 */}
                  <YAxis
                    yAxisId="right-altitude"
                    hide
                    domain={['dataMin - 5', 'dataMax + 5']}
                  />
                  
                  <Tooltip content={<CustomTooltip />} />

                  {/* 渐变海拔 */}
                  <Area
                    yAxisId="right-altitude"
                    type="monotone"
                    name="海拔"
                    dataKey="altitude"
                    stroke="#3b82f6"
                    strokeWidth={0.5}
                    fill="rgba(59, 130, 246, 0.06)"
                    dot={false}
                  />
                  
                  {/* 配速 */}
                  <Line
                    yAxisId="right-pace"
                    type="monotone"
                    name="配速"
                    dataKey="pace"
                    stroke="#20B2AA"
                    strokeWidth={1.2}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />

                  {/* 心率 */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    name="心率"
                    dataKey="heart_rate"
                    stroke="#e11d48"
                    strokeWidth={1.2}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />

                  {/* 功率 */}
                  {hasPower && (
                    <Line
                      yAxisId="left"
                      type="monotone"
                      name="功率"
                      dataKey="power"
                      stroke="#f59e0b"
                      strokeWidth={1}
                      dot={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="w-full h-full overflow-y-auto pr-1 text-[10px]">
              <table className="w-full text-left border-collapse text-slate-700">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100 sticky top-0 z-10">
                    <th className="p-1.5">圈数</th>
                    <th className="p-1.5">距离</th>
                    <th className="p-1.5">用时</th>
                    <th className="p-1.5">配速</th>
                    <th className="p-1.5">平均心率</th>
                    {hasPower && <th className="p-1.5">功率</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.laps.map((lap: any) => (
                    <tr key={lap.lap_num} className="hover:bg-slate-50/50 text-slate-600 transition-colors">
                      <td className="p-1.5 font-bold text-slate-400">{lap.lap_num}</td>
                      <td className="p-1.5">{(lap.distance / 1000).toFixed(2)} km</td>
                      <td className="p-1.5">{formatTime(lap.duration)}</td>
                      <td className="p-1.5 font-extrabold text-[#20B2AA]">{getLapPace(lap.avg_speed)}</td>
                      <td className="p-1.5 text-rose-600">{lap.avg_heart_rate || '--'} bpm</td>
                      {hasPower && <td className="p-1.5 text-amber-600">{lap.avg_power || '--'} W</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CorosDashboard;

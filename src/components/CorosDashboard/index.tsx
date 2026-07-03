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
}

const CorosDashboard = ({ runId }: ICorosDashboardProps) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [chartMode, setChartMode] = useState<'time' | 'distance'>('distance'); // 图表横轴：时间或距离

  useEffect(() => {
    if (!runId) {
      setData(null);
      return;
    }
    setLoading(true);
    fetch(`/data/coros_detail/${runId}.json`)
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
      <div className="w-full bg-white text-slate-500 rounded-xl p-8 border border-slate-100 shadow-md flex items-center justify-center space-x-2 my-4">
        <div className="w-5 h-5 border-2 border-[#20B2AA] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm">正在加载高驰专业数据分析...</span>
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
        <div className="bg-white/95 border border-slate-200 p-3 rounded-lg shadow-xl text-xs space-y-1.5 text-slate-800">
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

  return (
    <div className="w-full bg-white text-slate-800 rounded-xl p-4 sm:p-6 border border-slate-100 shadow-xl my-4 select-none">
      {/* 顶部标题与选项 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 mb-6 space-y-3 sm:space-y-0">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#20B2AA] animate-pulse"></span>
            <h2 className="text-lg font-bold tracking-wide text-slate-800">高驰专业运动数据分析</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">数据源自高驰智能运动手表 FIT 轨道解析</p>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200/60 text-xs">
          <button
            className={`px-3 py-1.5 rounded-md transition-all ${chartMode === 'distance' ? 'bg-[#20B2AA] font-bold text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            onClick={() => setChartMode('distance')}
          >
            按距离
          </button>
          <button
            className={`px-3 py-1.5 rounded-md transition-all ${chartMode === 'time' ? 'bg-[#20B2AA] font-bold text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            onClick={() => setChartMode('time')}
          >
            按时间
          </button>
        </div>
      </div>

      {/* 概要数据网格 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100">
          <div className="text-xs text-slate-400">平均 / 最大心率</div>
          <div className="text-xl font-black mt-1 flex items-baseline">
            <span className="text-rose-600">{data.summary.avg_heart_rate || '--'}</span>
            <span className="text-slate-300 text-xs mx-1">/</span>
            <span className="text-rose-500 text-sm">{data.summary.max_heart_rate || '--'}</span>
            <span className="text-xs text-slate-400 ml-1">bpm</span>
          </div>
        </div>
        <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100">
          <div className="text-xs text-slate-400">累计爬升 / 下降</div>
          <div className="text-xl font-black mt-1 flex items-baseline">
            <span className="text-blue-600">{data.summary.total_ascent || 0}</span>
            <span className="text-slate-300 text-xs mx-1">/</span>
            <span className="text-blue-500 text-sm">{data.summary.total_descent || 0}</span>
            <span className="text-xs text-slate-400 ml-1">m</span>
          </div>
        </div>
        <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100">
          <div className="text-xs text-slate-400">平均功率</div>
          <div className="text-xl font-black mt-1 text-amber-600 flex items-baseline">
            <span>{data.summary.avg_power || '--'}</span>
            <span className="text-xs text-slate-400 ml-1">W</span>
          </div>
        </div>
        <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100">
          <div className="text-xs text-slate-400">卡路里消耗</div>
          <div className="text-xl font-black mt-1 text-[#20B2AA] flex items-baseline">
            <span>{data.summary.total_calories || '--'}</span>
            <span className="text-xs text-slate-400 ml-1">kcal</span>
          </div>
        </div>
      </div>

      {/* Recharts 图表区域 */}
      <div className="w-full h-[280px] sm:h-[350px] mb-8 bg-slate-50/30 p-2 sm:p-4 rounded-lg border border-slate-100">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 5, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey={chartMode === 'distance' ? 'distanceKm' : 'time_offset'}
              tickFormatter={formatXAxis}
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              type="number"
              domain={['dataMin', 'dataMax']}
            />
            {/* 左Y轴：心率与功率 */}
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke="#e11d48"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={['dataMin - 10', 'dataMax + 10']}
            />
            {/* 右Y轴：配速（反转，值小在上） */}
            <YAxis
              yAxisId="right-pace"
              orientation="right"
              reversed
              stroke="#20B2AA"
              fontSize={10}
              tickFormatter={formatPace}
              tickLine={false}
              axisLine={false}
              domain={['dataMin - 30', 'dataMax + 30']}
            />
            {/* 隐藏的Y轴用来归一化海拔图 */}
            <YAxis
              yAxisId="right-altitude"
              hide
              domain={['dataMin - 5', 'dataMax + 5']}
            />
            
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: '#64748b' }}
            />

            {/* 海报背景图：海拔面积填充 */}
            <Area
              yAxisId="right-altitude"
              type="monotone"
              name="海拔"
              dataKey="altitude"
              stroke="#3b82f6"
              strokeWidth={1}
              fill="rgba(59, 130, 246, 0.05)"
              dot={false}
            />
            
            {/* 配速折线图 */}
            <Line
              yAxisId="right-pace"
              type="monotone"
              name="配速"
              dataKey="pace"
              stroke="#20B2AA"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4 }}
            />

            {/* 心率折线图 */}
            <Line
              yAxisId="left"
              type="monotone"
              name="心率"
              dataKey="heart_rate"
              stroke="#e11d48"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4 }}
            />

            {/* 功率折线图 */}
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

      {/* 分圈数据表格 */}
      {data.laps && data.laps.length > 0 && (
        <div className="w-full">
          <h3 className="text-sm font-bold tracking-wide text-slate-700 mb-3 pl-1 border-l-2 border-[#20B2AA]">
            分圈数据记录
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#20B2AA]/10 text-slate-600 font-bold border-b border-slate-100">
                  <th className="p-3">圈数</th>
                  <th className="p-3">距离</th>
                  <th className="p-3">时间</th>
                  <th className="p-3">平均配速</th>
                  <th className="p-3">平均心率</th>
                  <th className="p-3">平均步频</th>
                  {hasPower && <th className="p-3">平均功率</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.laps.map((lap: any) => (
                  <tr key={lap.lap_num} className="hover:bg-[#20B2AA]/5 transition-colors">
                    <td className="p-3 font-semibold text-slate-500">{lap.lap_num}</td>
                    <td className="p-3">{(lap.distance / 1000).toFixed(2)} km</td>
                    <td className="p-3">{formatTime(lap.duration)}</td>
                    <td className="p-3 font-bold text-[#20B2AA]">{getLapPace(lap.avg_speed)}</td>
                    <td className="p-3 text-rose-600">{lap.avg_heart_rate || '--'} bpm</td>
                    <td className="p-3 text-slate-600">{lap.avg_cadence || '--'} spm</td>
                    {hasPower && <td className="p-3 text-amber-600">{lap.avg_power || '--'} W</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorosDashboard;

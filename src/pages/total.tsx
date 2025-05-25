import React, { useState, useEffect, lazy, Suspense, Component, ReactNode } from 'react';

// 自定义错误边界组件
class ErrorBoundary extends Component<{ 
  fallback: ReactNode,
  children: ReactNode 
}, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import activities from '@/static/activities.json';
import { ACTIVITY_TOTAL, TYPES_MAPPING } from "@/utils/const";
import { formatPace } from '@/utils/utils';
import styles from './total.module.css';
import { totalStat ,todayStat } from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';

// Lazy load both github.svg and grid.svg

// 获取当前日期的字符串，格式为 YYYY-MM-DD
const today = new Date().toISOString().split('T')[0]; // 格式：YYYY-MM-DD
const TodaySvg = lazy(() => loadSvgComponent(todayStat, `./${today}.svg`));

const GithubSvg = lazy(() => loadSvgComponent(totalStat, './github.svg'));

const GridSvg = lazy(() => loadSvgComponent(totalStat, './grid.svg'));

// const MonthofLifeSvg = lazy(() => loadSvgComponent(totalStat, './mol.svg'));






// 辅助函数：将时间字符串转换为秒数
const convertMovingTime2Sec = (movingTime: string | number): number => {
  if (typeof movingTime === 'number') {
    return movingTime;
  }
  
  if (movingTime.includes(':')) {
    const parts = movingTime.split(':').map(Number);
    if (parts.length === 3) {
      // HH:MM:SS 格式
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    } else if (parts.length === 2) {
      // MM:SS 格式
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    }
  }
  
  // 尝试直接解析为数字
  return parseInt(movingTime, 10) || 0;
};

interface Activity {
  start_date_local: string;
  distance: number;
  moving_time: string;
  type: string;
  location_country?: string;
}

const Total: React.FC = () => {
 
  const [activityType, setActivityType] = useState<string>('run');
  const playTypes = new Set((activities as Activity[]).map(activity => activity.type.toLowerCase()));
  const showTypes = [...playTypes].filter(type => type in TYPES_MAPPING);

  // 按年份分组数据
  const yearlyData = React.useMemo(() => {
    const data = (activities as Activity[])
      .filter(activity => activity.type.toLowerCase() === activityType)
      .reduce((acc, activity) => {
        const year = new Date(activity.start_date_local).getFullYear();
        if (!acc[year]) {
          acc[year] = {
            year,
            distance: 0,
            count: 0,
            months: Array(12).fill(0)
          };
        }
        const month = new Date(activity.start_date_local).getMonth();
        const distance = activity.distance / 1000; // Convert to kilometers
        acc[year].distance += distance;
        acc[year].count += 1;
        acc[year].months[month] += distance;
        return acc;
      }, {} as Record<number, { year: number; distance: number; count: number; months: number[] }>);
    return Object.values(data).sort((a, b) => a.year - b.year);
  }, [activityType]);

  // 计算统计数据
  const stats = React.useMemo(() => {
    const filteredActivities = (activities as Activity[])
      .filter(activity => activity.type.toLowerCase() === activityType);

    const totalDistance = filteredActivities.reduce((sum, activity) => sum + activity.distance / 1000, 0);
    const totalTime = filteredActivities.reduce((sum, activity) => {
      return sum + convertMovingTime2Sec(activity.moving_time);
    }, 0);

    // 计算平均配速（秒/公里）
    const avgPace = totalDistance > 0 ? totalTime / totalDistance : 0;
    const maxDistance = Math.max(...filteredActivities.map(activity => activity.distance / 1000));

    return {
      totalActivities: filteredActivities.length,
      totalDistance: totalDistance.toFixed(2),
      totalTime: formatPace(totalTime),
      avgPace: avgPace > 0 ? formatPace(avgPace) : '--:--',
      maxDistance: maxDistance.toFixed(2)
    };
  }, [activityType]);

  // 计算月度数据 - 保持完整月份数据但优化显示
  const monthlyData = React.useMemo(() => {
    const allMonths: { month: string; year: string; fullDate: string; distance: number }[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    yearlyData.forEach(({ year, months }) => {
      months.forEach((distance, month) => {
        if (distance > 0) {  // 只添加有数据的月份
          allMonths.push({
            month: monthNames[month],
            year: year.toString(), 
            fullDate: `${year}-${(month+1).toString().padStart(2, '0')}`,
            distance
          });
        }
      });
    });
    return allMonths;
  }, [yearlyData]);

  // 获取唯一的年份列表用于X轴标签
  const uniqueYears = Array.from(new Set(
    yearlyData.map(item => item.year.toString())
  )).sort();
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <a href="https://liups.com/" className={styles.tohome}>自留地</a>
        <h1 className={styles.title}>运动统计</h1>
        <select 
          onChange={(e) => setActivityType(e.target.value)} 
          value={activityType}
          className={styles.select}
        >
          {showTypes.map((type) => (
            <option key={type} value={type}>{TYPES_MAPPING[type]}</option>
          ))}
        </select>
      </div>
      



      {/* 统计卡片 */}
      <div className={styles.statsCards}>
        <div className={styles.statCard}>
          <h4>八年走过</h4>
          <p>1 国 9 省 16 城</p>
        </div>
        <div className={styles.statCard}>
          <h4>{ACTIVITY_TOTAL.ACTIVITY_COUNT_TITLE}</h4>
          <p>{stats.totalActivities}</p>
        </div>
        <div className={styles.statCard}>
          <h4>{ACTIVITY_TOTAL.TOTAL_DISTANCE_TITLE}</h4>
          <p>{stats.totalDistance} km</p>
        </div>
        <div className={styles.statCard}>
          <h4>{ACTIVITY_TOTAL.TOTAL_TIME_TITLE}</h4>
          <p>{stats.totalTime}</p>
        </div>
        <div className={styles.statCard}>
          <h4>{ACTIVITY_TOTAL.AVERAGE_SPEED_TITLE}</h4>
          <p>{stats.avgPace} /km</p>
        </div>
        <div className={styles.statCard}>
          <h4>{ACTIVITY_TOTAL.MAX_DISTANCE_TITLE}</h4>
          <p>{stats.maxDistance} km</p>
        </div>
      </div>

      <div className={styles.charts}>
        {/* 年度活动次数统计图 - 40%宽度 */}
        <div className={styles.chartContainer}>
          <h3>{ACTIVITY_TOTAL.YEARLY_TITLE} {ACTIVITY_TOTAL.ACTIVITY_COUNT_TITLE}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearlyData} margin={{ top: 0, right: 0, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="year" tick={{ fill: '#ccc' }} />
              <YAxis tick={{ fill: '#ccc' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#242424', border: '1px solid #444' }}
                labelStyle={{ color: '#0ed45e' }}
              />
              <Legend />
              <Bar dataKey="count" name="Activities" fill="#ff6b6b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 年度总距离统计图 - 60%宽度 */}
        <div className={styles.chartContainer}>
          <h3>{ACTIVITY_TOTAL.YEARLY_TITLE} {ACTIVITY_TOTAL.TOTAL_DISTANCE_TITLE}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearlyData} margin={{ top: 0, right: 0, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="year" tick={{ fill: '#ccc' }} />
              <YAxis tick={{ fill: '#ccc' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#242424', border: '1px solid #444' }}
                labelStyle={{ color: '#0ed45e' }}
                formatter={(value: number) => [`${value.toFixed(2)} km`, 'Distance']}
              />
              <Legend />
              <Bar dataKey="distance" name="Distance (km)" fill="#0ed45e" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 月度总距离统计图 - 整行宽度 */}
        <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
          <h3>{ACTIVITY_TOTAL.MONTHLY_TITLE} {ACTIVITY_TOTAL.TOTAL_DISTANCE_TITLE}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis 
                dataKey="fullDate"
                tick={{ fill: '#ccc', fontSize: 14 }}
                ticks={uniqueYears.map(year => `${year}-01`)} // 每年1月作为标记点
                tickFormatter={(value) => value.split('-')[0]} // 只显示年份
                interval={0}
                angle={0}
                textAnchor="middle"
                height={40}
                padding={{ left: 2, right: 2 }}
              />
              <YAxis tick={{ fill: '#ccc' }} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: '#242424',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  padding: '8px 12px'
                }}
                labelFormatter={(value) => '月度跑量'}
                formatter={(value: number, name: string, props: any) => {
                  const month = props.payload.month;
                  const year = props.payload.year;
                  const monthNum = props.payload.fullDate.split('-')[1];
                  return [
                    `${value.toFixed(2)} km`,
                    `${year}-${monthNum}`
                  ];
                }}
              />
              <Legend />
              <Bar dataKey="distance" name="Distance (km)" fill="#0ed45e" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 活动热力图 - 整行宽度 */}
        <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
          <h3>Activity Heatmap</h3>
          <div className={styles.heatmapContainer}>
            {yearlyData.length > 0 && (
              <div className={styles.heatmap}>
                <div className={styles.heatmapHeader}>
                  <div className={styles.heatmapYear}>Year</div>
                  <div className={styles.heatmapMonths}>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => (
                      <div key={month} className={styles.heatmapMonth}>{month}</div>
                    ))}
                  </div>
                </div>
                <div className={styles.heatmapBody}>
                  {[...yearlyData].reverse().map(({ year, months }) => (
                    <div key={year} className={styles.heatmapRow}>
                      <div className={styles.heatmapYear}>{year}</div>
                      <div className={styles.heatmapCells}>
                        {months.map((distance, i) => (
                          <div 
                            key={i} 
                            className={styles.heatmapCell}
                            style={{ 
                              backgroundColor: distance > 0 
                                ? `rgba(14, 212, 94, ${Math.min(0.1 + distance / 100, 1)})` 
                                : 'transparent',
                              border: distance > 0 ? '1px solid #0ed45e33' : '1px solid #444'
                            }}
                            title={`${year}-${i+1}: ${distance.toFixed(2)} km`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* 活动热力图下方添加SVG图表 */}
        
        {/* 添加当前日期SVG图表 */}
        <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
          <h3>当天运动</h3>
            <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
            <ErrorBoundary fallback={<div className="text-center" style={{ color: '#0ed45e', fontWeight: 600 }}>今天没有运动，要加油噢</div>}>
            <Suspense fallback={<div className="text-center">Loading...</div>}>
            <TodaySvg className="mt-4 h-auto w-full" />
            </Suspense>
            </ErrorBoundary>
            </div>
        </div>
        <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <GithubSvg className="mt-4 h-auto w-full" />
          </Suspense>
        </div>
        <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <GridSvg className="mt-4 h-auto w-full" />
          </Suspense>
        </div>


    </div>
</div>
  );
};

export default Total;

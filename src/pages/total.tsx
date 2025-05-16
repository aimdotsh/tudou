import React, { useState } from 'react';
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
    const allMonths: { 
      month: string;  // 月份缩写如"Jan"
      monthNum: string; // 月份数字如"01" 
      year: string;   // 年份如"2023"
      distance: number 
    }[] = [];
    
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun',
                      'Jul','Aug','Sep','Oct','Nov','Dec'];

    yearlyData.forEach(({ year, months }) => {
      months.forEach((distance, monthIdx) => {
        if (distance > 0) {
          allMonths.push({
            month: monthNames[monthIdx],
            monthNum: String(monthIdx+1).padStart(2, '0'),
            year: String(year),
            distance
          });
        }
      });
    });
    return allMonths;
  }, [yearlyData]);

  // 获取唯一的年份列表用于X轴标签
  const uniqueYears = Array.from(new Set(yearlyData.map(item => item.year)));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Activity Statistics</h1>
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
            <BarChart data={yearlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
            <BarChart data={yearlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
            <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis 
                dataKey="year"
                tick={{ fill: '#ccc', fontSize: 12 }}
                ticks={uniqueYears}  // 使用唯一年份列表
                interval={0}
                angle={0}
                textAnchor="middle"
                height={40}
                padding={{ left: 30, right: 30 }}
              />
              <YAxis tick={{ fill: '#ccc' }} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: '#242424',
                  border: '1px solid #444',
                  borderRadius: '4px'
                }}
                formatter={(value: number, name: string, props: any) => {
                  const month = props.payload.month; // 获取月份
                  const year = props.payload.year;  // 获取年份
                  return [
                    `${value.toFixed(2)} km`,       // 距离值
                    `${year}-${month}`             // 年月格式
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
                  {yearlyData.map(({ year, months }) => (
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
      </div>
    </div>
  );
};

export default Total;
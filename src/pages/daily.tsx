import React, { useState, useEffect, lazy, Suspense, Component, ReactNode } from 'react';
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
import { totalStat ,recentStat ,halfmarathonStat ,newyearStat ,yueyeStat} from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';

// 自定义错误边界组件
class ErrorBoundary extends Component<{ 
  fallback: ReactNode,
  children: ReactNode 
}, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    console.error('Error caught by ErrorBoundary:', error);
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}



// 获取当前日期的字符串，格式为 YYYY-MM-DD
// 原代码
// const today = new Date().toISOString().split('T')[0]; // 格式：YYYY-MM-DD

// 获取北京时间的通用函数（支持日期偏移）
const getBeijingDate = (offset = 0) => {
  const now = new Date();
  // 获取当前时间的 UTC 时间戳
  const utcTimestamp = now.getTime() + (now.getTimezoneOffset() * 60000);
  
  // 计算北京时间，北京时间为 UTC+8（加上偏移天数）
  const beijingDate = new Date(utcTimestamp + (3600000 * 8) + (offset * 86400000));
  
  const year = beijingDate.getFullYear();
  const month = String(beijingDate.getMonth() + 1).padStart(2, '0');
  const day = String(beijingDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 生成最近60天的日期数组
const recentDates = Array.from({ length: 60 }, (_, i) => getBeijingDate(-i));

// 创建动态SVG组件数组
const RecentSvgs = recentDates.map(date => {
  const SvgComponent = lazy(() => loadSvgComponent(recentStat, `./yyyymmdd/${date}.svg`));
  return {
    date,
    Component: SvgComponent
  };
});


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
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;
  const totalPages = Math.ceil(RecentSvgs.length / itemsPerPage);
  const currentItems = RecentSvgs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


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

  // 计算连续运动天数(包含所有运动类型和所有年份)
  const calculateMaxStreak = (activities: Activity[]) => {
    // 按日期排序所有活动
    const sortedActivities = activities
      .sort((a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime());

    if (sortedActivities.length === 0) return { streak: 0, startDate: null, endDate: null };

    // 获取所有不重复的运动日期(包含所有运动类型)
    const uniqueDates = Array.from(new Set(
      sortedActivities.map(activity => {
        const date = new Date(activity.start_date_local);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      })
    )).sort((a, b) => a - b);

    let maxStreak = 1;
    let currentStreak = 1;
    let maxStartDate = uniqueDates[0];
    let maxEndDate = uniqueDates[0];

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = uniqueDates[i - 1];
      const currDate = uniqueDates[i];
      const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) {
        currentStreak += diffDays;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
          maxStartDate = uniqueDates[i - currentStreak + 1];
          maxEndDate = currDate;
        }
      } else {
        currentStreak = 1;
      }
    }

    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    return {
      streak: maxStreak,
      startDate: maxStreak > 1 ? formatDate(maxStartDate) : null,
      endDate: maxStreak > 1 ? formatDate(maxEndDate) : null
    };
  };

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
    const { streak, startDate, endDate } = calculateMaxStreak(filteredActivities, 2025);

    return {
      totalActivities: filteredActivities.length,
      totalDistance: totalDistance.toFixed(2),
      totalTime: formatPace(totalTime),
      avgPace: avgPace > 0 ? formatPace(avgPace) : '--:--',
      maxDistance: maxDistance.toFixed(2),
      maxStreak2025: streak,
      streakStartDate: startDate,
      streakEndDate: endDate
    };
  }, [activityType]);



  return (
    <div className={styles.container}>
    
      <div className={styles.header}>
        <a href="./" className={styles.tohome}>首页</a>
        <h1 className={styles.title}>蓝皮书的 Recent Workouts</h1>
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
        <div className={styles.statCard}>
          <h4>最长连续运动</h4>
          <p>
            {stats.maxStreak2025} 天
            {stats.streakStartDate && stats.streakEndDate && (
              <span className={styles.streakDates} style={{ fontSize: '0.5em' }}> ({stats.streakStartDate.split('-').slice(1).join('-')} 至 {stats.streakEndDate.split('-').slice(1).join('-')})</span>
            )}
          </p>
        </div>
      </div>

      <div className={styles.charts}>
        {/* 添加recent SVG图表 */}
        <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
          <h3>Recent Workouts 最长连续运动 {stats.maxStreak2025} 天
            {stats.streakStartDate && stats.streakEndDate && (
              <span className={styles.streakDates} style={{ fontSize: '1em' }}> ({stats.streakStartDate.split('-').slice(1).join('-')} 至 {stats.streakEndDate.split('-').slice(1).join('-')})</span>
            )}</h3>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-4">
            {currentItems.map(({ date, Component }) => (
              <ErrorBoundary
                key={date}
                fallback={
                  <div className={styles.dateCard}>
                    <div className={styles.dateText}>{date}</div>
                    <div className={styles.poemText}>"今天没有运动"</div>
                    <div className={styles.sourceText}>--蓝皮书</div>
                  </div>
                }
              >
                <Suspense fallback={
                  <div className={styles.loadingCard}>
                    <div>Loading {date}...</div>
                  </div>
                }>
                  <div className={styles.svgCard}>
                    <Component className="h-auto w-full" />
                  </div>
                </Suspense>
              </ErrorBoundary>
            ))}
          </div>
          <div className="flex justify-center items-center mt-8 gap-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-[#0ed45e] text-white rounded disabled:opacity-50 transition-all duration-300 hover:bg-[#0bc04d] hover:scale-105"
            >
              上一页
            </button>
            <span className="text-gray-700 transition-opacity duration-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-[#0ed45e] text-white rounded disabled:opacity-50 transition-all duration-300 hover:bg-[#0bc04d] hover:scale-105"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Total;
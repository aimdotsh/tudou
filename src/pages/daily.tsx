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

// 获取不同日期的日期字符串
const today = getBeijingDate(0);        // 今天
const yesterday = getBeijingDate(-1);   // 昨天
const dayBeforeYesterday = getBeijingDate(-2);  // 前天
const threeDaysAgo = getBeijingDate(-3);        // 大前天

// 创建对应的懒加载 SVG 组件
const TodaySvg = lazy(() => loadSvgComponent(recentStat, `./yyyymmdd/${today}.svg`));
const YesterdaySvg = lazy(() => loadSvgComponent(recentStat, `./yyyymmdd/${yesterday}.svg`));
const DayBeforeYesterdaySvg = lazy(() => loadSvgComponent(recentStat, `./yyyymmdd/${dayBeforeYesterday}.svg`));
const ThreeDaysAgoSvg = lazy(() => loadSvgComponent(recentStat, `./yyyymmdd/${threeDaysAgo}.svg`));


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
        {/* 添加recent SVG图表 */}
        <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
          <h3>Recent Workouts</h3>

          <div className={styles.gridContainer}>
            {/* 今天 */}
            <ErrorBoundary
              fallback={
                <div className={styles.dateCard}>
                  <div className={styles.dateText}>{today}</div>
                  <div className={styles.poemText}>"今日事繁且搁置，明朝振衣再登山"</div>
                  <div className={styles.sourceText}>《明日歌》新解</div>
                </div>
              }
            >
              <Suspense fallback={
                <div className={styles.loadingCard}>
                  <div>Loading...</div>
                </div>
              }>
                <div className={styles.svgCard}>
                  <TodaySvg className="h-auto w-full" />
                </div>
              </Suspense>
            </ErrorBoundary>

            {/* 昨天 */}
            <ErrorBoundary
              fallback={
                <div className={styles.dateCard}>
                  <div className={styles.dateText}>{yesterday}</div>
                  <div className={styles.poemText}>"昨日不可追，来日犹可期"</div>
                  <div className={styles.sourceText}>化用陶渊明《归去来兮辞》</div>
                </div>
              }
            >
              <Suspense fallback={
                <div className={styles.loadingCard}>
                  <div>Loading...</div>
                </div>
              }>
                <div className={styles.svgCard}>
                  <YesterdaySvg className="h-auto w-full" />
                </div>
              </Suspense>
            </ErrorBoundary>

            {/* 前天 */}
            <ErrorBoundary
              fallback={
                <div className={styles.dateCard}>
                  <div className={styles.dateText}>{dayBeforeYesterday}</div>
                  <div className={styles.poemText}>"世事如舟暂搁浅，重整征帆再启程"</div>
                  <div className={styles.sourceText}>化用李白《行路难》</div>
                </div>
              }
            >
              <Suspense fallback={
                <div className={styles.loadingCard}>
                  <div>Loading...</div>
                </div>
              }>
                <div className={styles.svgCard}>
                  <DayBeforeYesterdaySvg className="h-auto w-full" />
                </div>
              </Suspense>
            </ErrorBoundary>

            {/* 大前天 */}
            <ErrorBoundary
              fallback={
                <div className={styles.dateCard}>
                  <div className={styles.dateText}>{threeDaysAgo}</div>
                  <div className={styles.poemText}>"三日未行何足虑，长风破浪会有时"</div>
                  <div className={styles.sourceText}>化用李白《行路难》</div>
                </div>
              }
            >
              <Suspense fallback={
                <div className={styles.loadingCard}>
                  <div>Loading...</div>
                </div>
              }>
                <div className={styles.svgCard}>
                  <ThreeDaysAgoSvg className="h-auto w-full" />
                </div>
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>

 




      </div>
    </div>
  );
};

export default Total;
import React, { useState, useEffect, lazy, Suspense, Component, ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
import activities from '@/static/activities_export';
import { ACTIVITY_TOTAL, TYPES_MAPPING } from "@/utils/const";
import { formatPace } from '@/utils/utils';
import styles from './total.module.css';
import Nav from '@/components/Nav';
import { totalStat, recentStat, halfmarathonStat, newyearStat, yueyeStat, luckStat } from '@assets/index';
import RecentWorkouts from '@/components/RecentWorkouts';
import { loadSvgComponent } from '@/utils/svgUtils';
import locationStats from '@/static/location_stats.json';
import useWindowSize from '@/hooks/useWindowSize';

// 每日一言显示组件
const DailyQuoteCard: React.FC<{
  date: string,
  dailyQuotes: { [key: string]: { text: string, author: string } },
  styles: any
}> = ({ date, dailyQuotes, styles }) => {
  // 添加调试信息
  console.log('DailyQuoteCard - date:', date);
  console.log('DailyQuoteCard - dailyQuotes:', dailyQuotes);
  console.log('DailyQuoteCard - quote for date:', dailyQuotes[date]);

  return (
    <div className={styles.dateCard}>
      <div className={styles.dateText}>{date}</div>
      <div className={styles.descriptionText}>今日没有运动，跟你分享每日一言养养眼：</div>
      <div className={styles.poemText}>
        {dailyQuotes[date] ? (
          <>
            "{dailyQuotes[date].text}"
            {dailyQuotes[date].author && (
              <div className={styles.sourceText}>—— {dailyQuotes[date].author}</div>
            )}
          </>
        ) : (
          '加载中...'
        )}
      </div>
    </div>
  );
};

// 自定义错误边界组件
class ErrorBoundary extends Component<{
  date: string,
  dailyQuotes: { [key: string]: { text: string, author: string } },
  styles: any,
  children: ReactNode
}, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
    console.error('Error caught by ErrorBoundary:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <DailyQuoteCard date={this.props.date} dailyQuotes={this.props.dailyQuotes} styles={this.props.styles} />;
    }
    return this.props.children;
  }
}



// 获取当前日期的字符串，格式为 YYYY-MM-DD
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

// 统一的文件获取 Hook
const useFileList = (jsonPath: string) => {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch(jsonPath);
        if (response.ok) {
          const fileList = await response.json();
          setFiles(fileList);
        } else {
          throw new Error(`Failed to fetch files from ${jsonPath}`);
        }
      } catch (error) {
        console.error(`Failed to fetch files from ${jsonPath}:`, error);
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [jsonPath]);

  return { files, loading };
};

// 特定halfmarathon类型的文件获取 Hook
const useHalfmarathonFiles = () => useFileList('/wonderful.json');

// 特定halfmarathon类型的 SVG 创建函数
const createHalfmarathonSvgs = (files: string[]) =>
  createSvgComponents(files, recentStat, './yyyymmdd', './yyyymmdd');

// Lazy svg yueye 和 newyear
//const Yueye01Stat = lazy(() => loadSvgComponent(yueyeStat, `./yueye/2024-07-07.svg`));
const Newyear01Stat = lazy(() => loadSvgComponent(newyearStat, `./newyear/2025-01-01.svg`));
const Newyear02Stat = lazy(() => loadSvgComponent(newyearStat, `./newyear/2024-02-04.svg`));

// Lazy load both github.svg and grid.svg
const GithubSvg = lazy(() => loadSvgComponent(totalStat, './github.svg'));
const GridSvg = lazy(() => loadSvgComponent(totalStat, './grid.svg'));


// 特定luck类型的文件获取 Hook
const useLuckFiles = () => useFileList('/luck.json');

// SVG 加载失败时的备用组件
const FailedLoadSvg = ({ filename }: { filename: string }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#999',
    fontSize: '14px'
  }}>
    加载失败: {filename}
  </div>
);

// 统一的 SVG 创建函数
const createSvgComponents = (
  files: string[],
  statModule: any,
  svgBasePath: string,
  imageBasePath: string,
  imageExtension: string = '.jpg'
) => {
  return files.map((filename) => {
    const baseName = filename.replace('.svg', '');
    const svgPath = `${svgBasePath}/${filename}`;
    const imagePath = `${imageBasePath}/${baseName}${imageExtension}`;

    const LazySvgComponent = lazy(() => loadSvgComponent(statModule, svgPath)
      .catch((error) => {
        console.error('Failed to load SVG:', svgPath, error);
        return {
          default: () => <FailedLoadSvg filename={filename} />
        };
      }));

    return { LazySvgComponent, baseName, imagePath };
  });
};

// 特定luck类型的 SVG 创建函数
const createLuckSvgs = (files: string[]) =>
  createSvgComponents(files, luckStat, './luck', '/luck');



// 计算当年最长连续运动天数
const calculateMaxStreak = (activities: Activity[]) => {
  const currentYear = new Date().getFullYear();
  // 过滤出当前年份的活动
  const currentYearActivities = activities.filter(activity =>
    new Date(activity.start_date_local).getFullYear() === currentYear
  );

  // 按日期排序所有活动
  const sortedActivities = currentYearActivities
    .sort((a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime());

  if (sortedActivities.length === 0) return { streak: 0, startDate: null, endDate: null };

  // 获取所有不重复的运动日期
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
    // 只返回月份和日期
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  return {
    streak: maxStreak,
    startDate: maxStreak > 1 ? formatDate(maxStartDate) : null,
    endDate: maxStreak > 1 ? formatDate(maxEndDate) : null
  };
};




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
  const [activityType, setActivityType] = useState<string>('all');
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [dailyQuotes, setDailyQuotes] = useState<{ [key: string]: { text: string, author: string } }>({});
  const { width } = useWindowSize();
  const isMobile = width <= 480;
  const isTablet = width <= 768;

  // 获取指定日期的每日一言
  const fetchDailyQuoteForDate = async (dateStr: string) => {
    console.log('fetchDailyQuoteForDate called for:', dateStr);
    const cacheKey = `dailyQuote_${dateStr}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const quote = JSON.parse(cached);
        console.log('Found cached quote for', dateStr, ':', quote);
        setDailyQuotes(prev => ({ ...prev, [dateStr]: quote }));
        return;
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }

    try {
      console.log('Fetching new quote for', dateStr);
      await new Promise(resolve => setTimeout(resolve, 100));
      const response = await fetch('https://v1.hitokoto.cn/?c=d&c=i&c=k');
      const data = await response.json();
      console.log('API response for', dateStr, ':', data);
      const quote = { text: data.hitokoto || "今天没有运动", author: data.from || "佚名" };

      localStorage.setItem(cacheKey, JSON.stringify(quote));
      console.log('Setting quote for', dateStr, ':', quote);
      setDailyQuotes(prev => {
        const newState = { ...prev, [dateStr]: quote };
        console.log('New dailyQuotes state:', newState);
        return newState;
      });

      // 清理7天前的缓存
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoffKey = `dailyQuote_${sevenDaysAgo.toISOString().split('T')[0]}`;

      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('dailyQuote_') && key < cutoffKey) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('获取每日一言失败:', error);
      setDailyQuotes(prev => ({
        ...prev,
        [dateStr]: { text: '今天没有运动', author: '' }
      }));
    }
  };

  // 使用自定义hook获取halfmarathon文件列表
  const { files: halfmarathonFiles, loading: halfmarathonLoading } = useHalfmarathonFiles();
  const { files: luckFiles, loading: luckLoading } = useLuckFiles();
  const [halfmarathonSvgs, setHalfmarathonSvgs] = useState<any[]>([]);
  const [luckSvgs, setLuckSvgs] = useState<any[]>([]);

  useEffect(() => {
    if (halfmarathonFiles.length > 0) {
      const svgs = createHalfmarathonSvgs(halfmarathonFiles);
      setHalfmarathonSvgs(svgs);
    }
  }, [halfmarathonFiles]);

  useEffect(() => {
    if (luckFiles.length > 0) {
      const svgs = createLuckSvgs(luckFiles);
      setLuckSvgs(svgs);
    }
  }, [luckFiles]);

  // 在组件加载时获取最近几天的每日一言
  useEffect(() => {
    console.log('useEffect triggered for daily quotes');
    const dates = [today, yesterday, dayBeforeYesterday, threeDaysAgo];
    console.log('Dates to fetch quotes for:', dates);
    dates.forEach(date => {
      fetchDailyQuoteForDate(date);
    });
  }, []);

  const toggleFlip = (id: string) => {
    setFlippedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  const playTypes = new Set((activities as Activity[]).map(activity => activity.type.toLowerCase()));
  const showTypes = ['all', ...playTypes].filter(type => type in TYPES_MAPPING || type === 'all');

  // 按年份分组数据
  const yearlyData = React.useMemo(() => {
    const data = (activities as Activity[])
      .filter(activity => activityType === 'all' || activity.type.toLowerCase() === activityType)
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
    return Object.values(data).sort((a, b) => b.year - a.year);
  }, [activityType]);

  // 计算统计数据
  const stats = React.useMemo(() => {
    const filteredActivities = (activities as Activity[])
      .filter(activity => activityType === 'all' || activity.type.toLowerCase() === activityType);

    const totalDistance = filteredActivities.reduce((sum, activity) => sum + activity.distance / 1000, 0);
    const totalTime = filteredActivities.reduce((sum, activity) => {
      return sum + convertMovingTime2Sec(activity.moving_time);
    }, 0);

    // 计算平均配速（秒/公里）
    const avgPace = totalDistance > 0 ? totalTime / totalDistance : 0;
    const maxDistance = Math.max(...filteredActivities.map(activity => activity.distance / 1000));
    const { streak, startDate, endDate } = calculateMaxStreak(activities as Activity[]);

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
            fullDate: `${year}-${(month + 1).toString().padStart(2, '0')}`,
            distance
          });
        }
      });
    });
    // 按时间倒序排列：先按年份倒序，再按月份倒序
    return allMonths.sort((a, b) => {
      if (a.year !== b.year) {
        return parseInt(b.year) - parseInt(a.year);
      }
      return parseInt(b.fullDate.split('-')[1]) - parseInt(a.fullDate.split('-')[1]);
    });
  }, [yearlyData]);

  // 获取唯一的年份列表用于X轴标签
  const uniqueYears = Array.from(new Set(
    yearlyData.map(item => item.year.toString())
  )).sort((a, b) => parseInt(b) - parseInt(a));
  // 关闭照片查看器
  const closePhotoViewer = () => {
    setCurrentPhoto(null);
  };

  return (
    <>
      <div className={styles.stickyHeader}>
        <Nav />
        <div className={styles.selectContainer}>
          <select
            onChange={(e) => setActivityType(e.target.value)}
            value={activityType}
            className={styles.select}
          >
            {['all', ...showTypes.filter(type => type !== 'all')].map((type) => (
              <option key={type} value={type}>
                {type === 'all' ? '所有' : TYPES_MAPPING[type as keyof typeof TYPES_MAPPING]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.container}>
        {/* 照片查看模态框 */}
        {currentPhoto && (
          <div className={styles.photoModal} onClick={closePhotoViewer}>
            <div className={styles.photoContainer}>
              <img
                src={currentPhoto}
                alt="Activity Photo"
                className={styles.photoImage}
                onClick={(e) => e.stopPropagation()}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = './placeholder.png';
                }}
              />
              <button
                className={styles.closeButton}
                onClick={closePhotoViewer}
              >
                ×

              </button>
            </div>
          </div>
        )}





        {/* 统计卡片 */}
        <div className={styles.statsCards}>
          <div className={styles.statCard}>
            <h4>{locationStats.years}年里走过</h4>
            <p>{locationStats.countries} 国 {locationStats.provinces} 省 {locationStats.cities} 城</p>
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
            <ResponsiveContainer width="100%" height={450} className={styles.responsiveChart}>
              <BarChart
                data={yearlyData}
                margin={{ top: 30, right: 0, left: 0, bottom: isMobile ? 40 : 30 }}
                className={styles.barChart}>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e1f5fe" />

                <XAxis
                  dataKey="year"
                  type="category"
                  scale="band"
                  padding={{ left: 10, right: 10 }}
                  tick={{
                    fill: '#5a6c7d',
                    fontSize: 12
                  }}
                  interval={0} // Ensure all ticks are shown since they are categories now
                />

                <YAxis
                  width={isMobile ? 30 : 40}
                  tick={{
                    fill: '#5a6c7d',
                    fontSize: isMobile ? 10 : 12
                  }}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '2px solid #20B2AA',
                    borderRadius: '10px',
                    boxShadow: '0 4px 15px rgba(32, 178, 170, 0.1)'
                  }}
                  labelStyle={{
                    color: '#20B2AA',
                    fontWeight: 600
                  }}
                />

                <Legend
                  verticalAlign="top"
                  align="right"
                  height={30}
                />

                <Bar
                  dataKey="count"
                  name="Workouts"
                  fill="#20B2AA"        // 柔和的蓝绿色(CadetBlue)
                  radius={[4, 4, 0, 0]} // 顶部圆角
                  maxBarSize={50}
                />
              </BarChart>

            </ResponsiveContainer>
          </div>

          {/* 年度总距离统计图 - 60%宽度 */}
          <div className={styles.chartContainer}>
            <h3>{ACTIVITY_TOTAL.YEARLY_TITLE} {ACTIVITY_TOTAL.TOTAL_DISTANCE_TITLE}</h3>
            <ResponsiveContainer width="100%" height={450} className={styles.responsiveChart}>
              <BarChart
                data={yearlyData}
                margin={{ top: 30, right: 0, left: 0, bottom: isMobile ? 40 : 30 }}>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e1f5fe" />

                <XAxis
                  dataKey="year"
                  type="category"
                  scale="band"
                  padding={{ left: 10, right: 10 }}
                  tick={{
                    fill: '#5a6c7d',
                    fontSize: 12
                  }}
                  interval={0}
                />

                <YAxis
                  width={isMobile ? 30 : 40}
                  tick={{
                    fill: '#5a6c7d',
                    fontSize: isMobile ? 10 : 12
                  }}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '2px solid #20B2AA',
                    borderRadius: '10px',
                    boxShadow: '0 4px 15px rgba(32, 178, 170, 0.1)'
                  }}
                  labelStyle={{
                    color: '#20B2AA',
                    fontWeight: 600
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)} km`, 'Distance']}
                />

                <Legend
                  verticalAlign="top"
                  align="right"
                  height={30}
                />

                <Bar
                  dataKey="distance"
                  name="Distance (km)"
                  fill="#f99206"        // 橙色(Deep Orange)
                  radius={[4, 4, 0, 0]}  // 顶部圆角
                  maxBarSize={50}
                />
              </BarChart>


            </ResponsiveContainer>
          </div>

          {/* 月度总距离统计图 - 整行宽度 */}
          <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
            <h3>{ACTIVITY_TOTAL.MONTHLY_TITLE} {ACTIVITY_TOTAL.TOTAL_DISTANCE_TITLE}</h3>
            <ResponsiveContainer width="100%" height={450} className={styles.responsiveChart}>
              <BarChart
                data={monthlyData}
                margin={{ top: 30, right: 0, left: 0, bottom: isMobile ? 40 : 30 }}>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e1f5fe" />

                <XAxis
                  dataKey="fullDate"
                  tick={{
                    fill: '#5A5A5A',  // 深灰色文字
                    fontSize: 14      // 保持字体大小
                  }}
                  ticks={uniqueYears.map(year => `${year}-01`)} // 每年1月作为标记点
                  tickFormatter={(value) => value.split('-')[0]} // 只显示年份
                  interval={0}
                  angle={0}
                  textAnchor="middle"
                  height={40}
                  padding={{ left: 2, right: 2 }}
                />

                <YAxis
                  width={isMobile ? 30 : 40}
                  tick={{
                    fill: '#5A5A5A',  // 深灰色文字
                    fontSize: isMobile ? 10 : 12       // 统一字体大小
                  }}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '2px solid #20B2AA',
                    borderRadius: '6px',         // 圆角
                    padding: '8px 12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)' // 柔和阴影
                  }}
                  labelStyle={{
                    color: '#89CFF0',  // 柔和蓝色标签
                    fontWeight: 500    // 中等字重
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

                <Legend
                  verticalAlign="top"
                  align="right"
                  height={30}
                />

                <Bar
                  dataKey="distance"
                  name="Distance (km)"
                  fill="#20B2AA"        // 柔和的蓝绿色(LightSeaGreen)
                  radius={[4, 4, 0, 0]}  // 顶部圆角
                  maxBarSize={50}
                />
              </BarChart>

            </ResponsiveContainer>
          </div>

          {/* 活动热力图 - 整行宽度 */}
          <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
            <h3>Workouts Heatmap</h3>
            <div className={styles.heatmapContainer}>
              {yearlyData.length > 0 && (
                <div className={styles.heatmap}>
                  <div className={styles.heatmapHeader}>
                    <div className={styles.heatmapYear}>Year</div>
                    <div className={styles.heatmapMonths}>
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => (
                        <div
                          key={month}
                          className={styles.heatmapMonth}
                          style={{ color: 'var(--text-primary)' }}  // 深灰色月份文字
                        >
                          {month}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.heatmapBody}>
                    {yearlyData.map(({ year, months }) => (
                      <div key={year} className={styles.heatmapRow}>
                        <div
                          className={styles.heatmapYear}
                        >
                          {year}
                        </div>
                        <div className={styles.heatmapCells}>
                          {months.map((distance, i) => (
                            <div
                              key={i}
                              className={styles.heatmapCell}
                              style={{
                                backgroundColor: distance > 0
                                  ? `rgba(32, 178, 170, ${Math.min(0.2 + distance / 20, 1)})`  // Primary Teal with opacity base
                                  : 'transparent',
                                border: distance > 0
                                  ? '1px solid rgba(32, 178, 170, 0.3)'
                                  : '1px solid #E0E0E0'
                              }}
                              title={`${year}-${i + 1}: ${distance.toFixed(2)} km`}
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




          {/* 添加recent SVG图表 */}
          <RecentWorkouts />



          {/* 吉象同行 */}
          <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
            <h3><Link to="./luck" className="hover:underline">吉象同行</Link> <span className={styles.clickHint}>(点击卡片会翻转噢)</span> </h3>

            {!luckLoading && luckSvgs.length > 0 ? (
              <div className={styles.gridContainer}>
                {luckSvgs.map(({ LazySvgComponent, baseName, imagePath }, index) => {
                  const cardId = `luck-${index}`;
                  return (
                    <Suspense key={cardId} fallback={<div className={styles.loadingCard}>Loading...</div>}>
                      <div
                        className={`${styles.flipCard} ${flippedCards[cardId] ? styles.flipped : ''}`}
                        onClick={() => toggleFlip(cardId)}
                      >
                        <div className={styles.flipCardInner}>
                          <div className={styles.flipCardFront}>
                            <LazySvgComponent style={{ width: '100%', height: '100%' }} />
                          </div>
                          <div className={styles.flipCardBack}>
                            <img
                              src={imagePath}
                              alt={`Luck ${baseName}`}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = './placeholder.png';
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </Suspense>
                  );
                })}
              </div>
            ) : !luckLoading && luckSvgs.length === 0 ? (
              <div className={styles.emptyContainer}>
                <div>暂无吉象同行数据</div>
              </div>
            ) : (
              <div className={styles.loadingContainer}>
                <div>加载中...</div>
              </div>
            )}
          </div>



          {/* halfmarathon */}
          <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
            <h3>Wonderful Workouts <span className={styles.clickHint}>(点击卡片会翻转噢)</span></h3>

            {!halfmarathonLoading && halfmarathonSvgs.length > 0 ? (
              <div className={styles.gridContainer}>
                {halfmarathonSvgs.map(({ LazySvgComponent, baseName, imagePath }, index) => {
                  const cardId = `halfmarathon-${index}`;

                  return (
                    <Suspense key={cardId} fallback={<div className={styles.loadingCard}>Loading...</div>}>
                      <div
                        className={`${styles.flipCard} ${flippedCards[cardId] ? styles.flipped : ''}`}
                        onClick={() => toggleFlip(cardId)}
                      >
                        <div className={styles.flipCardInner}>
                          <div className={styles.flipCardFront}>
                            <LazySvgComponent style={{ width: '100%', height: '100%' }} />
                          </div>
                          <div className={styles.flipCardBack}>
                            <img
                              src={imagePath}
                              alt={`yyyymmdd ${baseName}`}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = './placeholder.png';
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </Suspense>
                  );
                })}
              </div>
            ) : !halfmarathonLoading && halfmarathonSvgs.length === 0 ? (
              <div className={styles.emptyContainer}>
                <div>暂无Wonderful Workouts数据</div>
              </div>
            ) : (
              <div className={styles.loadingContainer}>
                <div>加载中...</div>
              </div>
            )}
          </div>

          <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
            <Suspense fallback={<div className="text-center">Loading...</div>}>
              <GithubSvg className="mt-2 h-auto w-full" />
            </Suspense>
          </div>
          <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
            <Suspense fallback={<div className="text-center">Loading...</div>}>
              <GridSvg className="mt-2 h-auto w-full" />
            </Suspense>
          </div>

        </div>

        <div className={styles.footer}>
          ©2016 - 2025 Liups.com thanks{' '}
          <a
            href="https://github.com/yihong0618/running_page/blob/master/README-CN.md"
            target="_blank"
            rel="noopener noreferrer">
            running_page
          </a>
        </div>

      </div>
    </>
  );
};

export default Total;
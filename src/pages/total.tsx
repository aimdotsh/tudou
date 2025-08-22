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
import activities from '@/static/activities.json';
import { ACTIVITY_TOTAL, TYPES_MAPPING } from "@/utils/const";
import { formatPace } from '@/utils/utils';
import styles from './total.module.css';
import { totalStat ,recentStat ,halfmarathonStat ,newyearStat ,yueyeStat,luckStat} from '@assets/index';
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
// 动态获取 halfmarathon 文件列表的函数
const useHalfmarathonFiles = () => {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        // 从配置文件读取 halfmarathon 文件列表
        const response = await fetch('/wonderful-files.json');
        if (response.ok) {
          const fileList = await response.json();
          setFiles(fileList);
        } else {
          throw new Error('Failed to fetch halfmarathon files list');
        }
      } catch (error) {
        console.error('Failed to fetch halfmarathon files:', error);
        // 出错时返回空数组
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  return { files, loading };
};

// 动态创建 halfmarathon SVG 组件
const createHalfmarathonSvgs = (files: string[]) => {
  return files.map((filename) => {
    const baseName = filename.replace('.svg', '');
    const pngName = baseName ;
    
    const LazySvgComponent = lazy(() => loadSvgComponent(recentStat, `./yyyymmdd/${filename}`)
      .catch(() => ({ 
        default: () => <FailedLoadSvg filename={filename} />
      })));
    
    return { LazySvgComponent, baseName, pngName };
  });
};

//const Yueye01Stat = lazy(() => loadSvgComponent(yueyeStat, `./yueye/2024-07-07.svg`));

const Newyear01Stat = lazy(() => loadSvgComponent(newyearStat, `./newyear/2025-01-01.svg`));
const Newyear02Stat = lazy(() => loadSvgComponent(newyearStat, `./newyear/2024-02-04.svg`));  

// Lazy load both github.svg and grid.svg
const GithubSvg = lazy(() => loadSvgComponent(totalStat, './github.svg'));
const GridSvg = lazy(() => loadSvgComponent(totalStat, './grid.svg'));

// const MonthofLifeSvg = lazy(() => loadSvgComponent(totalStat, './mol.svg'));

// 吉象同行
const Luck01Svg = lazy(() => loadSvgComponent(luckStat, './luck/2025-07-27.svg'));
const Luck02Svg = lazy(() => loadSvgComponent(luckStat, './luck/2025-07-14.svg'));
const Luck03Svg = lazy(() => loadSvgComponent(luckStat, './luck/2025-06-23.svg'));
const Luck04Svg = lazy(() => loadSvgComponent(luckStat, './luck/2024-12-08.svg'));
const Luck05Svg = lazy(() => loadSvgComponent(luckStat, './luck/2024-07-14.svg'));
const Luck06Svg = lazy(() => loadSvgComponent(luckStat, './luck/2024-02-25.svg'));
const Luck07Svg = lazy(() => loadSvgComponent(luckStat, './luck/2022-04-29.svg'));
const Luck08Svg = lazy(() => loadSvgComponent(luckStat, './luck/2022-06-18.svg'));
//const Luck07Svg = lazy(() => loadSvgComponent(luckStat, './luck/2022-10-23.svg'));
//gconst Luck08Svg = lazy(() => loadSvgComponent(luckStat, './luck/2022-05-21.svg'));



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
  
  // 使用自定义hook获取halfmarathon文件列表
  const { files: halfmarathonFiles, loading: halfmarathonLoading } = useHalfmarathonFiles();
  const [halfmarathonSvgs, setHalfmarathonSvgs] = useState<any[]>([]);

  useEffect(() => {
    if (halfmarathonFiles.length > 0) {
      const svgs = createHalfmarathonSvgs(halfmarathonFiles);
      setHalfmarathonSvgs(svgs);
    }
  }, [halfmarathonFiles]);

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
    return Object.values(data).sort((a, b) => a.year - b.year);
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
  // 关闭照片查看器
  const closePhotoViewer = () => {
    setCurrentPhoto(null);
  };


  return (
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
                target.src = './placeholder.jpg';
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
      <div className={styles.header}>
        <a href="https://liups.com/" className={styles.tohome}>自留地</a>
        <h1 className={styles.title}>蓝皮书的 Workouts Page</h1>
        <select 
          onChange={(e) => setActivityType(e.target.value)} 
          value={activityType}
          className={styles.select}
        >
          {['all', ...showTypes.filter(type => type !== 'all')].map((type) => (
            <option key={type} value={type}>
              {type === 'all' ? 'All' : TYPES_MAPPING[type]}
            </option>
          ))}
        </select>
      </div>
      



      {/* 统计卡片 */}
      <div className={styles.statsCards}>
        <div className={styles.statCard}>
          <h4>八年里走过</h4>
          <p>1 国 9 省 17 城</p>
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
              <Bar dataKey="count" name="Workouts" fill="#ff6b6b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 年度总距离统计图 - 60%宽度 */}
        <div className={styles.chartContainer}>
          <h3>{ACTIVITY_TOTAL.YEARLY_TITLE} {ACTIVITY_TOTAL.TOTAL_DISTANCE_TITLE}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearlyData} margin={{ top: 0, right: 20, left: -15, bottom: 5 }}>
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
            <BarChart data={monthlyData} margin={{ top: 0, right: 20, left: -15, bottom: 5 }}>
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
          <h3>Workouts Heatmap</h3>
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

        {/* 添加recent SVG图表 */}
        <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
          <h3><Link to="./recent" className="hover:underline">Recent Workouts </Link> 
          <p> <span className={styles.streakDates} style={{ fontSize: '0.8em', color: '#999' }}>  当年最长连续运动 {stats.maxStreak2025} 天</span>
                      {stats.streakStartDate && stats.streakEndDate && (
              <span className={styles.streakDates} style={{ fontSize: '0.7em', color: '#999' }}> ({stats.streakStartDate} 至 {stats.streakEndDate})</span>
            )}
          </p>
          </h3>



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



        {/* 吉象同行 */}
        <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
          <h3><Link to="./luck" className="hover:underline">吉象同行</Link></h3>

          <div className={styles.gridContainer}>
              <Suspense fallback={
                <div className={styles.loadingCard}>
                  <div>Loading...</div>
                </div>
              }>
                <div className={styles.svgCard}>
                  <Luck01Svg className="h-auto w-full" />
                </div>
              </Suspense>
              <Suspense fallback={
                <div className={styles.loadingCard}>
                  <div>Loading...</div>
                </div>
              }>
                <div className={styles.svgCard}>
                  <Luck02Svg className="h-auto w-full" />
                </div>
              </Suspense>
              <Suspense fallback={
                <div className={styles.loadingCard}>
                  <div>Loading...</div>
                </div>
              }>
                <div className={styles.svgCard}>
                  <Luck03Svg className="h-auto w-full" />
                </div>
              </Suspense>
              <Suspense fallback={
                <div className={styles.loadingCard}>
                  <div>Loading...</div>
                </div>
              }>
                <div className={styles.svgCard}>
                  <Luck04Svg className="h-auto w-full" />
                </div>
              </Suspense>
              <Suspense fallback={
                <div className={styles.loadingCard}>
                  <div>Loading...</div>
                </div>
              }>
                <div className={styles.svgCard}>
                  <Luck05Svg className="h-auto w-full" />
                </div>
              </Suspense>
              <Suspense fallback={
                <div className={styles.loadingCard}>
                  <div>Loading...</div>
                </div>
              }>
                <div className={styles.svgCard}>
                  <Luck06Svg className="h-auto w-full" />
                </div>
              </Suspense>
              <Suspense fallback={
                <div className={styles.loadingCard}>
                  <div>Loading...</div>
                </div>
              }>
                <div className={styles.svgCard}>
                  <Luck07Svg className="h-auto w-full" />
                </div>
              </Suspense>
              <Suspense fallback={
                <div className={styles.loadingCard}>
                  <div>Loading...</div>
                </div>
              }>
                <div className={styles.svgCard}>
                  <Luck08Svg className="h-auto w-full" />
                </div>
              </Suspense>
          </div>
          
        </div>



        {/* 添加 Finished SVG图表 */}
        <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
          <h3>Wonderful Workouts (点击卡片会翻转噢)</h3>

          <div className={styles.gridContainer}>
            {/* 动态生成 halfmarathon 卡片 */}
            {!halfmarathonLoading && halfmarathonSvgs.map(({ LazySvgComponent, baseName, pngName }, index) => {
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
                          src={`./yyyymmdd/${pngName}.jpg`}
                          alt={`yyyymmdd ${baseName}`}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = './placeholder.jpg';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </Suspense>
              );
            })}
          </div>
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
    </div>
  );
};

export default Total;
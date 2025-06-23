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
import { totalStat ,luckStat} from '@assets/index';
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



// 从./luck/目录加载随机日期的SVG文件
const luckDates = [
'2025-06-23',
'2025-06-08',
'2025-05-24',
'2024-12-15',
'2024-12-08',
'2024-12-01',
'2024-11-03',
'2024-07-28',
'2024-07-14',
'2024-03-03',
'2024-03-02',
'2024-02-25',
'2024-01-27',
'2024-01-26',
'2023-12-15',
'2023-09-20',
'2023-08-22',
'2023-08-13',
'2023-08-04',
'2023-07-03',
'2023-06-23',
'2023-06-18',
'2023-05-28',
'2023-05-14',
'2023-03-08',
'2023-02-17',
'2023-01-28',
'2023-01-20',
'2022-12-08',
'2022-11-07',
'2022-11-02',
'2022-10-23',
'2022-10-19',
'2022-10-18',
'2022-10-16',
'2022-10-04',
'2022-09-06',
'2022-08-31',
'2022-08-09',
'2022-08-08',
'2022-08-03',
'2022-07-27',
'2022-07-21',
'2022-07-08',
'2022-07-05',
'2022-07-04',
'2022-07-02',
'2022-07-01',
'2022-06-28',
'2022-06-23',
'2022-06-18',
'2022-06-17',
'2022-06-15',
'2022-06-14',
'2022-06-13',
'2022-06-11',
'2022-06-09',
'2022-06-08',
'2022-06-06',
'2022-06-02',
'2022-06-01',
'2022-05-28',
'2022-05-21',
'2022-05-03',
'2022-05-01',
'2022-04-30',
'2022-04-29',
'2022-04-28',
'2022-04-27',
'2022-04-26',
'2022-04-24',
'2022-04-20',
'2022-04-17',
'2022-04-15',
'2022-04-14',
'2022-04-09',
'2022-04-06',
'2022-04-02',
'2022-03-20',
'2022-02-26',
];

// 创建动态SVG组件数组
const RecentSvgs = luckDates.map(date => {
  const SvgComponent = lazy(() => loadSvgComponent(luckStat, `./luck/${date}.svg`));
  return {
    date,
    Component: SvgComponent
  };
});


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

  return (
    <div className={styles.container}>
    
      <div className={styles.header}>
        <a href="./" className={styles.tohome}>首页</a>
<h1 className={styles.title}>
  蓝皮书的大象周边跑
  <span className={styles.luckDateRange}>（2022-02-26至2025-06-23）</span>
</h1>      </div>
      

      <div className={styles.charts}>
        {/* 添加recent SVG图表 */}
        <div className={`${styles.chartContainer} ${styles.fullWidth}`}>


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
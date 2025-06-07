import React, { useState, lazy, Suspense, Component, ReactNode } from 'react';
import styles from './fanzhuan.module.css';
import { recentStat, halfmarathonStat, newyearStat, yueyeStat } from '@assets/index';
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

// 创建对应的懒加载 SVG 组件
const Halfmarathon01Stat = lazy(() => loadSvgComponent(halfmarathonStat, `./halfmarathon/2025-04-20.svg`));
const Halfmarathon02Stat = lazy(() => loadSvgComponent(halfmarathonStat, `./halfmarathon/2024-10-20.svg`));
const Halfmarathon03Stat = lazy(() => loadSvgComponent(halfmarathonStat, `./halfmarathon/2024-09-08.svg`));
const Halfmarathon04Stat = lazy(() => loadSvgComponent(halfmarathonStat, `./halfmarathon/2024-04-21.svg`));
const Halfmarathon05Stat = lazy(() => loadSvgComponent(halfmarathonStat, `./halfmarathon/2024-04-14.svg`));
const Yueye01Stat = lazy(() => loadSvgComponent(yueyeStat, `./yueye/2024-07-07.svg`));
const Newyear01Stat = lazy(() => loadSvgComponent(newyearStat, `./newyear/2025-01-01.svg`));
const Newyear02Stat = lazy(() => loadSvgComponent(newyearStat, `./newyear/2024-02-04.svg`));

const Fanzhuan: React.FC = () => {
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  const toggleFlip = (id: string) => {
    setFlippedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
        <h3>Wonderful Workouts</h3>

        <div className={styles.gridContainer}>
          {/* Halfmarathon01Stat */}
          <Suspense fallback={<div className={styles.loadingCard}>Loading...</div>}>
            <div 
              className={`${styles.flipCard} ${flippedCards['halfmarathon01'] ? styles.flipped : ''}`}
              onClick={() => toggleFlip('halfmarathon01')}
            >
              <div className={styles.flipCardInner}>
                <div className={styles.flipCardFront}>
                  <Halfmarathon01Stat style={{ width: '100%', height: '100%' }} />
                </div>
                <div className={styles.flipCardBack}>
                  <img 
                    src="./halfmarathon/2025-04-20.jpg" 
                    alt="Halfmarathon 2025-04-20"
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

          {/* 其他卡片采用相同结构 */}
          <Suspense fallback={<div className={styles.loadingCard}>Loading...</div>}>
            <div 
              className={`${styles.flipCard} ${flippedCards['halfmarathon02'] ? styles.flipped : ''}`}
              onClick={() => toggleFlip('halfmarathon02')}
            >
              <div className={styles.flipCardInner}>
                <div className={styles.flipCardFront}>
                  <Halfmarathon02Stat style={{ width: '100%', height: '100%' }} />
                </div>
                <div className={styles.flipCardBack}>
                  <img 
                    src="./halfmarathon/2024-10-20.jpg" 
                    alt="Halfmarathon 2024-10-20"
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

          {/* 其他卡片... */}
        </div>
      </div>
    </div>
  );
};

export default Fanzhuan;
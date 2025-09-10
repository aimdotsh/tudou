import useActivities from '@/hooks/useActivities';
import { useEffect, useRef } from 'react';
import styles from './style.module.css';

const RunMapButtons = ({ changeYear, thisYear }: { changeYear: (_year: string) => void, thisYear: string }) => {
  const { years } = useActivities();
  const yearsButtons = years.slice();
  yearsButtons.push('Total');
  
  const buttonsRef = useRef<HTMLUListElement>(null);
  
  useEffect(() => {
    // 获取导航栏高度并设置按钮位置
    const updateButtonPosition = () => {
      if (!buttonsRef.current) return;
      
      const navElement = document.querySelector('nav');
      if (navElement) {
        const navRect = navElement.getBoundingClientRect();
        const navHeight = navRect.height;
        
        // 获取地图容器的左侧位置
        const mapContainer = document.querySelector('.mapboxgl-map');
        const mapLeft = mapContainer ? mapContainer.getBoundingClientRect().left : 10;
        
        // 设置按钮位置在导航栏下方，与地图左侧对齐
        buttonsRef.current.style.position = 'fixed';
        buttonsRef.current.style.top = `${navHeight}px`;
        buttonsRef.current.style.left = `${mapLeft}px`;
        buttonsRef.current.style.zIndex = '99';
        buttonsRef.current.style.backgroundColor = 'rgba(250, 249, 245, 0.8)';
        buttonsRef.current.style.borderRadius = '4px';
        buttonsRef.current.style.padding = '4px 8px';
        buttonsRef.current.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.1)';
      }
    };
    
    // 初始化时设置位置
    updateButtonPosition();
    
    // 监听窗口大小变化，更新按钮位置
    window.addEventListener('resize', updateButtonPosition);
    return () => {
      window.removeEventListener('resize', updateButtonPosition);
    };
  }, []);

  return (
    <ul 
      ref={buttonsRef}
      className={styles.buttons}
    >
      {yearsButtons.map((year) => (
        <li
          key={`${year}button`}
          className={styles.button + ` ${year === thisYear ? styles.selected : ''}`}
          onClick={() => {
            changeYear(year);
          }}
        >
          {year}
        </li>
      ))}
    </ul>
  );
};

export default RunMapButtons;

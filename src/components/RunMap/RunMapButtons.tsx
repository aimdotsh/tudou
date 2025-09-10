import useActivities from '@/hooks/useActivities';
import { useEffect, useRef, useState } from 'react';
import styles from './style.module.css';

const RunMapButtons = ({ changeYear, thisYear }: { changeYear: (_year: string) => void, thisYear: string }) => {
  const { years } = useActivities();
  const yearsButtons = years.slice();
  yearsButtons.push('Total');
  
  const buttonsRef = useRef<HTMLUListElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // 检查是否为移动设备
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // 初始检查
    checkMobile();
    
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
        
        // 检查是否为移动设备
        checkMobile();
        
        // 设置按钮位置在导航栏下方，与地图左侧对齐
        buttonsRef.current.style.position = 'fixed';
        buttonsRef.current.style.top = `${navHeight}px`;
        buttonsRef.current.style.left = `${mapLeft}px`;
        buttonsRef.current.style.zIndex = '99';
        buttonsRef.current.style.backgroundColor = 'rgba(250, 249, 245, 0.8)';
        buttonsRef.current.style.borderRadius = '4px';
        buttonsRef.current.style.padding = '4px 8px';
        buttonsRef.current.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.1)';
        
        // 移动设备上的特殊样式
        if (isMobile) {
          buttonsRef.current.style.maxWidth = 'calc(100vw - 20px)';
          buttonsRef.current.style.overflowX = 'auto';
          buttonsRef.current.style.whiteSpace = 'nowrap';
          buttonsRef.current.style.display = 'flex';
          buttonsRef.current.style.flexWrap = 'nowrap';
          // 使用setAttribute来设置非标准CSS属性
          buttonsRef.current.setAttribute('style', buttonsRef.current.getAttribute('style') + '; -ms-overflow-style: none; scrollbar-width: none;');
        } else {
          buttonsRef.current.style.maxWidth = '';
          buttonsRef.current.style.overflowX = '';
          buttonsRef.current.style.whiteSpace = '';
          buttonsRef.current.style.display = '';
          buttonsRef.current.style.flexWrap = '';
        }
      }
    };
    
    // 初始化时设置位置
    updateButtonPosition();
    
    // 监听窗口大小变化，更新按钮位置
    window.addEventListener('resize', updateButtonPosition);
    return () => {
      window.removeEventListener('resize', updateButtonPosition);
    };
  }, [isMobile]);

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

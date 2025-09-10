import useActivities from '@/hooks/useActivities';
import { useEffect, useState, useRef } from 'react';
import styles from './style.module.css';

const RunMapButtons = ({ changeYear, thisYear }: { changeYear: (_year: string) => void, thisYear: string }) => {
  const { years } = useActivities();
  const yearsButtons = years.slice();
  yearsButtons.push('Total');
  
  const [isSticky, setIsSticky] = useState(false);
  const buttonsRef = useRef<HTMLUListElement>(null);
  const initialPositionRef = useRef<{ top: number, left: number } | null>(null);
  
  useEffect(() => {
    // 获取导航栏高度
    const navHeight = document.querySelector('nav')?.getBoundingClientRect().height || 0;
    
    const handleScroll = () => {
      if (!buttonsRef.current || !initialPositionRef.current) return;
      
      // 如果还没有记录初始位置，记录下来
      if (!initialPositionRef.current) {
        const rect = buttonsRef.current.getBoundingClientRect();
        initialPositionRef.current = {
          top: rect.top,
          left: rect.left
        };
      }
      
      // 当按钮的顶部接触到导航栏底部时，切换为固定定位
      const buttonRect = buttonsRef.current.getBoundingClientRect();
      if (buttonRect.top <= navHeight && !isSticky) {
        setIsSticky(true);
      } else if (buttonRect.top > navHeight && isSticky) {
        setIsSticky(false);
      }
    };
    
    // 初始化时记录按钮的初始位置
    if (buttonsRef.current && !initialPositionRef.current) {
      const rect = buttonsRef.current.getBoundingClientRect();
      initialPositionRef.current = {
        top: rect.top,
        left: rect.left
      };
    }
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isSticky]);
  
  // 动态样式
  const buttonStyle = isSticky ? {
    position: 'fixed',
    top: `${document.querySelector('nav')?.getBoundingClientRect().height || 0}px`,
    left: `${initialPositionRef.current?.left || 10}px`,
    zIndex: 99,
    backgroundColor: 'rgba(250, 249, 245, 0.8)',
    borderRadius: '4px',
    padding: '4px 8px',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)'
  } : {};

  return (
    <ul 
      ref={buttonsRef}
      className={styles.buttons}
      style={buttonStyle as React.CSSProperties}
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

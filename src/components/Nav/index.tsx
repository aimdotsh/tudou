import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import { usePrivacyModeContext } from '@/context/PrivacyModeContext';
import SearchBox from '@/components/SearchBox';
import styles from './style.module.css';

interface NavProps {
  onSearch?: (searchTerm: string) => void;
  showSearch?: boolean;
}

const Nav: React.FC<NavProps> = ({ onSearch, showSearch = false }) => {
  const location = useLocation();
  const { navLinks, logo, siteUrl } = useSiteMetadata();
  const { isPrivacyMode, setIsPrivacyMode } = usePrivacyModeContext();

  return (
    <nav className={styles.mainNav}>
      <div className={styles.logoSection}>
        <a href={siteUrl} className={styles.logoLink}>
          <img className={styles.logo} alt="logo" src={logo} />
        </a>
      </div>
      <div className={styles.navLinks}>
        {navLinks.map((link) => {
          const isInternal = link.url.startsWith('/');
          const isActive = isInternal && location.pathname === link.url;

          return isInternal ? (
            // 对于Home链接，使用原生a标签触发页面重新加载
            link.name === 'Home' || link.url === '/' ? (
              <a
                key={link.name}
                href={link.url}
                className={`${styles.navLink} ${isActive ? styles.active : ''}`}
              >
                {link.name}
              </a>
            ) : (
              <Link
                key={link.name}
                to={link.url}
                className={`${styles.navLink} ${isActive ? styles.active : ''}`}
              >
                {link.name}
              </Link>
            )
          ) : (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.navLink}
            >
              {link.name}
            </a>
          );
        })}
      </div>
      
      {/* 搜索框 - 只在首页显示 */}
      {showSearch && onSearch && (
        <SearchBox 
          onSearch={onSearch}
          placeholder="搜索运动记录..."
          className={styles.searchBoxContainer}
        />
      )}
    </nav>
  );
};

export default Nav;
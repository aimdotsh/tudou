import React, { useState, useEffect, useRef } from 'react';
import styles from './style.module.css';

interface SearchBoxProps {
  onSearch: (searchTerm: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchBox: React.FC<SearchBoxProps> = ({ 
  onSearch, 
  placeholder = "搜索运动记录...", 
  className = "" 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch(value);
  };

  const handleSearchClick = () => {
    setIsExpanded(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleBlur = () => {
    if (!searchTerm) {
      setIsExpanded(false);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    onSearch('');
    setIsExpanded(false);
  };

  return (
    <div className={`${styles.searchContainer} ${className}`}>
      <div className={`${styles.searchBox} ${isExpanded ? styles.expanded : ''}`}>
        {!isExpanded && (
          <button 
            className={styles.searchIcon}
            onClick={handleSearchClick}
            aria-label="搜索"
          >
            🔍
          </button>
        )}
        
        {isExpanded && (
          <>
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder={placeholder}
              className={styles.searchInput}
            />
            {searchTerm && (
              <button 
                className={styles.clearButton}
                onClick={handleClear}
                aria-label="清除搜索"
              >
                ✕
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchBox;
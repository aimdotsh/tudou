import React, { useState, useEffect } from 'react';
import './style.css';

interface IPreGeneratedGifProps {
  date: string;
  className?: string;
  isVisible?: boolean;
}

const PreGeneratedGif: React.FC<IPreGeneratedGifProps> = ({ 
  date, 
  className = '', 
  isVisible = false 
}) => {
  const [gifExists, setGifExists] = useState<boolean | null>(null);
  const [gifUrl, setGifUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isVisible) return;

    const checkGifExists = async () => {
      setLoading(true);
      
      try {
        // 构建GIF文件路径
        const gifPath = `/assets/gif/track_${date}.gif`;
        
        // 检查文件是否存在
        const response = await fetch(gifPath, { method: 'HEAD' });
        
        if (response.ok) {
          setGifExists(true);
          setGifUrl(gifPath);
        } else {
          setGifExists(false);
        }
      } catch (error) {
        console.log(`GIF not found for ${date}:`, error);
        setGifExists(false);
      } finally {
        setLoading(false);
      }
    };

    // 延迟检查，等待翻转动画完成
    const timeoutId = setTimeout(checkGifExists, 600);
    
    return () => clearTimeout(timeoutId);
  }, [date, isVisible]);

  // 如果正在加载
  if (loading) {
    return (
      <div className={`pre-generated-gif-container ${className}`}>
        <div className="gif-loading">
          <div className="gif-loading-text">加载轨迹动画...</div>
        </div>
        <div className="gif-date-label">
          {date}
        </div>
      </div>
    );
  }

  // 如果GIF不存在
  if (gifExists === false) {
    return (
      <div className={`pre-generated-gif-container ${className}`}>
        <div className="no-gif-message">
          <div className="no-gif-icon">🏃‍♂️</div>
          <div className="no-gif-text">该日期暂无轨迹动画</div>
          <div className="no-gif-hint">请先生成GIF文件</div>
        </div>
        <div className="gif-date-label">
          {date}
        </div>
      </div>
    );
  }

  // 显示GIF
  return (
    <div className={`pre-generated-gif-container ${className}`}>
      <img 
        src={gifUrl} 
        alt={`Track animation for ${date}`}
        className="track-gif-image"
        loading="lazy"
        onError={() => setGifExists(false)}
      />
      <div className="gif-date-label">
        {date}
      </div>
    </div>
  );
};

export default PreGeneratedGif;
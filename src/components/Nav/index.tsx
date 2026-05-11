import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import { usePrivacyModeContext } from '@/context/PrivacyModeContext';
import SearchBox from '@/components/SearchBox';

interface NavProps {
  onSearch?: (searchTerm: string) => void;
  showSearch?: boolean;
}

const Nav: React.FC<NavProps> = ({ onSearch, showSearch = false }) => {
  const location = useLocation();
  const { navLinks, logo, siteUrl } = useSiteMetadata();
  const { isPrivacyMode, setIsPrivacyMode } = usePrivacyModeContext();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-header px-6 lg:px-16 h-20 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <div className="flex-shrink-0">
          <a href={siteUrl} className="block transition-transform hover:scale-105 active:scale-95">
            <img className="h-10 w-10 rounded-xl object-cover shadow-lg shadow-black/20" alt="logo" src={logo} />
          </a>
        </div>
        
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isInternal = link.url.startsWith('/');
            const isActive = isInternal && location.pathname === link.url;

            const baseClass = "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200";
            const activeClass = "bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]";
            const inactiveClass = "text-slate-400 hover:text-white hover:bg-white/5";

            const className = `${baseClass} ${isActive ? activeClass : inactiveClass}`;

            return isInternal ? (
              link.name === 'Home' || link.url === '/' ? (
                <a key={link.name} href={link.url} className={className}>
                  {link.name}
                </a>
              ) : (
                <Link key={link.name} to={link.url} className={className}>
                  {link.name}
                </Link>
              )
            ) : (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
                {link.name}
              </a>
            );
          })}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {showSearch && onSearch && (
          <div className="w-48 lg:w-64">
            <SearchBox 
              onSearch={onSearch}
              placeholder="Search activities..."
            />
          </div>
        )}
        
        {/* 隐私模式开关 - 可选添加 */}
        <button 
          onClick={() => setIsPrivacyMode(!isPrivacyMode)}
          className="p-2 rounded-full hover:bg-white/5 transition-colors text-slate-400 hover:text-white"
          title={isPrivacyMode ? "Disable Privacy" : "Enable Privacy"}
        >
          {isPrivacyMode ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.956 9.956 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          )}
        </button>
      </div>
    </nav>
  );
};

export default Nav;

export default Nav;
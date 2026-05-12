import PropTypes from 'prop-types';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import Nav from '@/components/Nav';
import useSiteMetadata from '@/hooks/useSiteMetadata';

interface LayoutProps extends React.PropsWithChildren {
  onSearch?: (searchTerm: string) => void;
  showSearch?: boolean;
}

const Layout = ({ children, onSearch, showSearch = false }: LayoutProps) => {
  const { siteTitle, description, keywords } = useSiteMetadata();

  return (
    <>
      <Helmet>
        <html lang="zh-CN" />
        <title>{siteTitle}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
      </Helmet>
      <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-orange-500/30">
        <Nav onSearch={onSearch} showSearch={showSearch} />
        <AnimatePresence mode="wait">
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="lg:flex lg:px-16 pt-24 pb-12"
          >
            {children}
          </motion.main>
        </AnimatePresence>
        <footer className="w-full py-12 px-6 mt-12 border-t border-white/5 bg-black/20 backdrop-blur-md">
          <div className="max-w-7xl mx-auto text-center space-y-4">
            <p className="text-slate-400 text-sm font-light">
              © 2016 - 2025 Liups.com • Built with passion for running
            </p>
            <div className="flex items-center justify-center gap-2 text-xs">
              <span className="text-slate-500">Based on</span>
              <a
                href="https://github.com/yihong0618/running_page/blob/master/README-CN.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-500 hover:text-orange-400 transition-colors underline decoration-orange-500/30 underline-offset-4"
              >
                running_page
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;
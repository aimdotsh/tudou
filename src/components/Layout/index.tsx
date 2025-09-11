import PropTypes from 'prop-types';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import Nav from '@/components/Nav';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import styles from './style.module.css';

const Layout = ({ children }: React.PropsWithChildren) => {
  const { siteTitle, description, keywords } = useSiteMetadata();

  return (
    <>
      <Helmet bodyAttributes={{ class: styles.body }}>
        <html lang="en" />
        <title>{siteTitle}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
      </Helmet>
      <Nav />
      <div className="mb-8 md:mb-16 p-2 md:p-4 lg:flex lg:p-16">
        {children}
      </div>
      <div className="footer" style={{
        textAlign: 'center',
        padding: '20px 0',
        marginTop: '40px',
        borderTop: '1px solid #eaeaea',
        color: '#666'
      }}>
        ©2016 - 2025 Liups.com thanks{' '}
        <a 
          href="https://github.com/yihong0618/running_page/blob/master/README-CN.md" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: '#20B2AA', textDecoration: 'none' }}
        >
          running_page
        </a>
      </div>
    </>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;
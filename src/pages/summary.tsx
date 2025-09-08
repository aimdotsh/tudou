import React from 'react';
import Nav from '@/components/Nav';
import ActivityList from '@/components/ActivityList';
import { Helmet } from 'react-helmet-async';
import useSiteMetadata from '@/hooks/useSiteMetadata';

const SummaryPage = () => {
  const { siteTitle, description, keywords } = useSiteMetadata();

  return (
    <>
      <Helmet>
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
      <div className="w-full">
        <ActivityList />
      </div>
    </>
  );
};

export default SummaryPage;
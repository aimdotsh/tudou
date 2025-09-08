import React, { useState } from 'react';
import Nav from '@/components/Nav';
import ActivityList from '@/components/ActivityList';
import { Helmet } from 'react-helmet-async';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import { ACTIVITY_TOTAL, TYPES_MAPPING } from '@/utils/const';
import styles from './summary.module.css';

type IntervalType = 'year' | 'month' | 'week' | 'day' | 'life';

const SummaryPage = () => {
  const { siteTitle, description, keywords } = useSiteMetadata();
  const [activityType, setActivityType] = useState<string>('all');
  const [interval, setInterval] = useState<IntervalType>('year');

  const showTypes = ['all', 'run', 'ride', 'swim', 'hike', 'walk'];

  const toggleInterval = (newInterval: IntervalType) => {
    setInterval(newInterval);
  };

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
      <div className={styles.stickyHeader}>
        <Nav />
        <div className={styles.selectContainer}>
          <select onChange={(e) => setActivityType(e.target.value)} value={activityType}>
            {showTypes.map((type) => (
              <option key={type} value={type}>
                {type === 'all' ? '所有' : (TYPES_MAPPING as any)[type]}
              </option>
            ))}
          </select>
          <select
            onChange={(e) => toggleInterval(e.target.value as IntervalType)}
            value={interval}
          >
            <option value="year">{ACTIVITY_TOTAL.YEARLY_TITLE}</option>
            <option value="month">{ACTIVITY_TOTAL.MONTHLY_TITLE}</option>
            <option value="week">{ACTIVITY_TOTAL.WEEKLY_TITLE}</option>
            <option value="day">{ACTIVITY_TOTAL.DAILY_TITLE}</option>
            <option value="life">Life</option>
          </select>
        </div>
      </div>
      <div className="w-full">
        <ActivityList 
          activityType={activityType} 
          interval={interval}
          hideFilters={true}
        />
      </div>
    </>
  );
};

export default SummaryPage;
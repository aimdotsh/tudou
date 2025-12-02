import { useMemo } from 'react';
import { locationForRun, typeForRun } from '@/utils/utils';
import activities from '@/static/activities_encrypted.json';
import CryptoJS from 'crypto-js';

// standardize country names for consistency between mapbox and activities data
const standardizeCountryName = (country: string): string => {
  if (country.includes('美利坚合众国')) {
    return '美国';
  }
  if (country.includes('英国')) {
    return '英国';
  }
  if (country.includes('印度尼西亚')) {
    return '印度尼西亚';
  }
  if (country.includes('韩国')) {
    return '韩国';
  }
  if (country.includes('斯里兰卡')) {
    return '斯里兰卡';
  }
  if (country.includes('所罗门群岛')) {
    return '所罗门群岛';
  }
  if (country.includes('拉脱维亚')) {
    return '拉脱维亚';
  }
  if (country.includes('爱沙尼亚')) {
    return '爱沙尼亚';
  }
  if (country.includes('奧地利')) {
    return '奥地利';
  }
  if (country.includes('阿拉伯联合酋长国')) {
    return '阿联酋';
  } else {
    return country;
  }
};

const useActivities = () => {
  const processedData = useMemo(() => {
    const cities: Record<string, number> = {};
    const runPeriod: Record<string, number> = {};
    const provinces: Set<string> = new Set();
    const countries: Set<string> = new Set();
    const years: Set<string> = new Set();

    // Decrypt data
    const secretKey =
      import.meta.env.VITE_ENCRYPT_KEY || 'tudou_default_secret_key';
    const decryptedActivities = activities.map((activity) => {
      const newActivity = { ...activity };
      try {
        if (newActivity.summary_polyline) {
          const bytes = CryptoJS.AES.decrypt(
            newActivity.summary_polyline,
            secretKey
          );
          newActivity.summary_polyline = bytes.toString(CryptoJS.enc.Utf8);
        }
        if (newActivity.location_country) {
          const bytes = CryptoJS.AES.decrypt(
            newActivity.location_country,
            secretKey
          );
          newActivity.location_country = bytes.toString(CryptoJS.enc.Utf8);
        }
      } catch (e) {
        console.error('Failed to decrypt activity data', e);
      }
      return newActivity;
    });

    decryptedActivities.forEach((run) => {
      const location = locationForRun(run);

      const periodName = typeForRun(run);
      if (periodName) {
        runPeriod[periodName] = runPeriod[periodName]
          ? runPeriod[periodName] + 1
          : 1;
      }

      const { city, province, country } = location;
      // drop only one char city
      if (city.length > 1) {
        cities[city] = cities[city]
          ? cities[city] + run.distance
          : run.distance;
      }
      if (province) provinces.add(province);
      if (country) countries.add(standardizeCountryName(country));
      const year = run.start_date_local.slice(0, 4);
      years.add(year);
    });

    const yearsArray = [...years].sort().reverse();
    const thisYear = yearsArray[0] || '';

    return {
      activities: decryptedActivities,
      years: yearsArray,
      countries: [...countries],
      provinces: [...provinces],
      cities,
      runPeriod,
      thisYear,
    };
  }, []); // Empty dependency array since activities is static

  return processedData;
};

export default useActivities;

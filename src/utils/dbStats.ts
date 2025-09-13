import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface LocationStats {
  years: number;
  countries: number;
  provinces: number;
  cities: number;
}

export const getLocationStatsFromDB = async (): Promise<LocationStats> => {
  try {
    // 获取年份统计
    const yearsQuery = `sqlite3 run_page/data.db "SELECT COUNT(DISTINCT substr(start_date_local, 1, 4)) FROM activities;"`;
    const { stdout: yearsResult } = await execAsync(yearsQuery);
    const years = parseInt(yearsResult.trim()) || 0;

    // 获取国家统计（从location_country字段提取国家信息）
    const countriesQuery = `sqlite3 run_page/data.db "SELECT COUNT(DISTINCT CASE WHEN location_country LIKE '%中国%' THEN '中国' WHEN location_country IS NOT NULL AND location_country != '' THEN 'Other' END) FROM activities WHERE location_country IS NOT NULL AND location_country != '';"`;
    const { stdout: countriesResult } = await execAsync(countriesQuery);
    const countries = parseInt(countriesResult.trim()) || 0;

    // 获取省份统计（提取包含'省'或'自治区'的部分）
    const provincesQuery = `sqlite3 run_page/data.db "SELECT COUNT(DISTINCT CASE WHEN location_country LIKE '%省%' THEN substr(location_country, instr(location_country, ' ') + 1, instr(substr(location_country, instr(location_country, ' ') + 1), '省') + 1) WHEN location_country LIKE '%自治区%' THEN substr(location_country, instr(location_country, ' ') + 1, instr(substr(location_country, instr(location_country, ' ') + 1), '自治区') + 2) END) FROM activities WHERE location_country LIKE '%省%' OR location_country LIKE '%自治区%';"`;
    const { stdout: provincesResult } = await execAsync(provincesQuery);
    const provinces = parseInt(provincesResult.trim()) || 0;

    // 获取城市统计（提取包含'市'的部分）
    const citiesQuery = `sqlite3 run_page/data.db "SELECT COUNT(DISTINCT CASE WHEN location_country LIKE '%市%' THEN substr(location_country, instr(location_country, ' ') + 1, instr(substr(location_country, instr(location_country, ' ') + 1), '市') + 1) END) FROM activities WHERE location_country LIKE '%市%';"`;
    const { stdout: citiesResult } = await execAsync(citiesQuery);
    const cities = parseInt(citiesResult.trim()) || 0;

    return {
      years,
      countries,
      provinces,
      cities
    };
  } catch (error) {
    console.error('Error fetching location stats from database:', error);
    return {
      years: 0,
      countries: 0,
      provinces: 0,
      cities: 0
    };
  }
};
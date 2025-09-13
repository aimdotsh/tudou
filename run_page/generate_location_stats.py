#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sqlite3
import json
import re
import sys

# 确保使用UTF-8编码
if sys.version_info[0] >= 3:
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def extract_location_info(location_str):
    """从location_country字段提取城市、省份、国家信息"""
    if not location_str or location_str.strip() == '':
        return None, None, None
    
    # 确保是字符串类型
    if isinstance(location_str, bytes):
        try:
            location_str = location_str.decode('utf-8')
        except:
            return None, None, None
    
    # 提取国家
    country = None
    if '中国' in location_str:
        country = '中国'
    elif location_str and location_str.strip():
        country = 'Other'
    
    # 提取省份（包含'省'或'自治区'的部分）
    province = None
    try:
        province_match = re.search(r'[\u4e00-\u9fa5]{2,}(省|自治区)', location_str)
        if province_match:
            province = province_match.group(0)
    except:
        pass
    
    # 提取城市（包含'市'的部分）
    city = None
    try:
        city_match = re.search(r'[\u4e00-\u9fa5]{2,}市', location_str)
        if city_match:
            city = city_match.group(0)
    except:
        pass
    
    return city, province, country

def generate_location_stats():
    """从数据库生成位置统计信息，包括每年新增地点"""
    conn = None
    try:
        # 连接数据库
        conn = sqlite3.connect('data.db')
        # 设置文本工厂来处理编码
        conn.text_factory = lambda x: str(x, 'utf-8', 'ignore') if isinstance(x, bytes) else x
        cursor = conn.cursor()
        
        # 获取所有活动的年份和位置信息，按时间排序
        cursor.execute("""
            SELECT start_date_local, location_country 
            FROM activities 
            WHERE start_date_local IS NOT NULL AND location_country IS NOT NULL
            ORDER BY start_date_local
        """)
        
        results = cursor.fetchall()
        
        years = set()
        countries = set()
        provinces = set()
        cities = set()
        
        # 记录每年新增的地点
        yearly_new_locations = {}
        all_time_countries = set()
        all_time_provinces = set()
        all_time_cities = set()
        
        # 记录城市和省份的关联关系
        city_province_map = {}
        
        for start_date, location_country in results:
            # 提取年份
            try:
                year = str(start_date)[:4]  # 取前4位作为年份
                years.add(year)
            except:
                continue
            
            # 初始化年份记录
            if year not in yearly_new_locations:
                yearly_new_locations[year] = {
                    'countries': [],
                    'provinces': [],
                    'cities': []
                }
            
            if location_country:
                city, province, country = extract_location_info(location_country)
                
                # 建立城市和省份的关联关系
                if city and province:
                    city_province_map[city] = province
                
                # 检查是否为新增地点
                if country and country not in all_time_countries:
                    all_time_countries.add(country)
                    yearly_new_locations[year]['countries'].append(country)
                
                if province and province not in all_time_provinces:
                    all_time_provinces.add(province)
                    yearly_new_locations[year]['provinces'].append(province)
                
                if city and city not in all_time_cities:
                    all_time_cities.add(city)
                    yearly_new_locations[year]['cities'].append(city)
                
                # 总体统计
                if city:
                    cities.add(city)
                if province:
                    provinces.add(province)
                if country:
                    countries.add(country)
        
        stats = {
            'years': len(years),
            'countries': len(countries),
            'provinces': len(provinces),
            'cities': len(cities),
            'yearsList': sorted(list(years)),
            'countriesList': sorted(list(countries)),
            'provincesList': sorted(list(provinces)),
            'citiesList': sorted(list(cities)),
            'yearlyNewLocations': yearly_new_locations,
            'cityProvinceMap': city_province_map
        }
        
        # 保存统计结果到JSON文件
        with open('../src/static/location_stats.json', 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        
        print("Location stats generated:")
        print("- {} years: {}".format(stats['years'], ', '.join(stats['yearsList'])))
        print("- {} countries: {}".format(stats['countries'], ', '.join(stats['countriesList'])))
        print("- {} provinces: {}".format(stats['provinces'], ', '.join(stats['provincesList'])))
        print("- {} cities: {}".format(stats['cities'], ', '.join(stats['citiesList'])))
        
        # 打印每年新增地点
        for year in sorted(yearly_new_locations.keys()):
            new_locs = yearly_new_locations[year]
            new_items = []
            if new_locs['countries']:
                new_items.extend(new_locs['countries'])
            if new_locs['provinces']:
                new_items.extend(new_locs['provinces'])
            if new_locs['cities']:
                new_items.extend(new_locs['cities'])
            
            if new_items:
                print("- {}年新增: {}".format(year, ', '.join(new_items)))
        
        return stats
        
    except Exception as e:
        print("Error generating location stats: {}".format(str(e)))
        import traceback
        traceback.print_exc()
        return None
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    generate_location_stats()
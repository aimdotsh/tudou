import * as mapboxPolyline from '@mapbox/polyline';
import CryptoJS from 'crypto-js';
import gcoord from 'gcoord';
import { WebMercatorViewport } from 'viewport-mercator-project';
import { chinaGeojson, RPGeometry } from '@/static/run_countries';
import worldGeoJson from '@surbowl/world-geo-json-zh/world.zh.json';
import { chinaCities } from '@/static/city';
import siteMetadata from '@/static/site-metadata';
import {
  MAIN_COLOR,
  MUNICIPALITY_CITIES_ARR,
  NEED_FIX_MAP,
  RUN_TITLES,
  RIDE_COLOR,
  VIRTUAL_RIDE_COLOR,
  HIKE_COLOR,
  SWIM_COLOR,
  ROWING_COLOR,
  ROAD_TRIP_COLOR,
  FLIGHT_COLOR,
  RUN_COLOR,
  KAYAKING_COLOR,
  SNOWBOARD_COLOR,
  TRAIL_RUN_COLOR,
  RICH_TITLE,
  MAP_TILE_STYLES,
} from './const';
import { FeatureCollection, LineString } from 'geojson';

export type Coordinate = [number, number];

export type RunIds = Array<number> | [];

export interface Activity {
  run_id: number;
  name: string;
  distance: number;
  moving_time: string;
  type: string;
  start_date: string;
  start_date_local: string;
  location_country?: string | null;
  summary_polyline?: string | null;
  average_heartrate?: number | null;
  elevation_gain: number | null;
  average_speed: number;
  streak: number;
  description?: string;
}
const R2D = 180 / Math.PI;
const D2R = Math.PI / 180;

// Mercator projection helpers
const mercatorY = (lat: number): number => {
  if (lat > 89.9) lat = 89.9;
  if (lat < -89.9) lat = -89.9;
  return Math.log(Math.tan(Math.PI / 4 + (lat * D2R) / 2));
};

const inverseMercatorY = (y: number): number => {
  return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * R2D;
};

const mercatorX = (lon: number): number => {
  return lon * D2R;
};

const inverseMercatorX = (x: number): number => {
  return x * R2D;
};

const getMercatorOffset = (
  centerLat: number
): { dx: number; dy: number } => {
  const { distance, bearing } = siteMetadata.mapOffset;

  // Calculate target point based on distance and bearing from centerLat (approximation for shift)
  // We want to find the shift in Mercator space that corresponds to moving 'distance' km at 'bearing'
  // at the given latitude.

  // 1. Calculate target lat/lon using geodesic formula (simplified for short distances)
  // Earth radius
  const R = 6371;
  const d = distance; // km
  const brng = bearing * D2R;
  const lat1 = centerLat * D2R;
  const lon1 = 0; // relative longitude

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d / R) +
    Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1),
      Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2)
    );

  const lat2Deg = lat2 * R2D;
  const lon2Deg = lon2 * R2D;

  // 2. Calculate Mercator shift
  const mx1 = mercatorX(0);
  const my1 = mercatorY(centerLat);
  const mx2 = mercatorX(lon2Deg);
  const my2 = mercatorY(lat2Deg);

  return {
    dx: mx2 - mx1,
    dy: my2 - my1,
  };
};
const titleForShow = (run: Activity): string => {
  const date = run.start_date_local.slice(0, 11);
  const distance = (run.distance / 1000.0).toFixed(2);
  let name = 'Run';
  if (run.name) {
    name = run.name;
  }
  const sportType = typeForRun(run); // 获取运动类型
  return `${sportType}: ${name} ${date} ${distance} KM ${!run.summary_polyline ? '(No map data for this workout)' : ''
    }`;
};

const formatPace = (seconds: number, distance?: number): string => {
  if (Number.isNaN(seconds) || seconds <= 0) return '--:--';

  // 如果提供了距离，计算配速（分钟/公里）
  if (distance) {
    const distanceKm = distance / 1000; // 转换为公里
    const paceSeconds = seconds / distanceKm; // 每公里秒数

    const paceMinutes = Math.floor(paceSeconds / 60);
    const paceRemainingSeconds = Math.floor(paceSeconds % 60);

    return `${paceMinutes}'${paceRemainingSeconds.toString().padStart(2, '0')}"`;
  }

  // 如果没有提供距离，直接格式化时间
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}'${secs.toString().padStart(2, '0')}"`;
};

const convertMovingTime2Sec = (moving_time: string): number => {
  if (!moving_time) {
    return 0;
  }
  // moving_time : '2 days, 12:34:56' or '12:34:56';
  const splits = moving_time.split(', ');
  const days = splits.length == 2 ? parseInt(splits[0]) : 0;
  const time = splits.splice(-1)[0];
  const [hours, minutes, seconds] = time.split(':').map(Number);
  const totalSeconds = ((days * 24 + hours) * 60 + minutes) * 60 + seconds;
  return totalSeconds;
};

const formatRunTime = (moving_time: string): string => {
  const totalSeconds = convertMovingTime2Sec(moving_time);
  const seconds = totalSeconds % 60;
  const minutes = (totalSeconds - seconds) / 60;
  if (minutes === 0) {
    return seconds + 's';
  }
  return minutes + 'min';
};

// for scroll to the map
const scrollToMap = () => {
  const el = document.querySelector('.fl.w-100.w-70-l');
  const rect = el?.getBoundingClientRect();
  if (rect) {
    window.scroll(rect.left + window.scrollX, rect.top + window.scrollY);
  }
};

const extractCities = (str: string): string[] => {
  const locations = [];
  let match;
  const pattern = /([\u4e00-\u9fa5]{2,}(市|自治州|特别行政区|盟|地区))/g;
  while ((match = pattern.exec(str)) !== null) {
    locations.push(match[0]);
  }

  return locations;
};

const extractDistricts = (str: string): string[] => {
  const locations = [];
  let match;
  const pattern = /([\u4e00-\u9fa5]{2,}(区|县))/g;
  while ((match = pattern.exec(str)) !== null) {
    locations.push(match[0]);
  }

  return locations;
}

const extractCoordinate = (str: string): [number, number] | null => {
  const pattern = /'latitude': ([-]?\d+\.\d+).*?'longitude': ([-]?\d+\.\d+)/;
  const match = str.match(pattern);

  if (match) {
    const latitude = parseFloat(match[1]);
    const longitude = parseFloat(match[2]);
    return [longitude, latitude];
  }

  return null;
};

const cities = chinaCities.map((c) => c.name);
const locationCache = new Map<number, ReturnType<typeof locationForRun>>();
// what about oversea?
const locationForRun = (
  run: Activity
): {
  country: string;
  province: string;
  city: string;
  coordinate: [number, number] | null;
} => {
  if (locationCache.has(run.run_id)) {
    return locationCache.get(run.run_id)!;
  }
  let location = run.location_country;
  let [city, province, country] = ['', '', ''];
  let coordinate = null;
  if (location) {
    // Only for Chinese now
    // should filter 臺灣
    const cityMatch = extractCities(location);
    const provinceMatch = location.match(/[\u4e00-\u9fa5]{2,}(省|自治区)/);

    if (cityMatch) {
      city = cities.find((value) => cityMatch.includes(value)) as string;

      if (!city) {
        city = '';
      }
    }
    if (provinceMatch) {
      [province] = provinceMatch;
      // try to extract city coord from location_country info
      coordinate = extractCoordinate(location);
    }
    const l = location.split(',');
    // or to handle keep location format
    let countryMatch = l[l.length - 1].match(
      /[\u4e00-\u9fa5].*[\u4e00-\u9fa5]/
    );
    if (!countryMatch && l.length >= 3) {
      countryMatch = l[2].match(/[\u4e00-\u9fa5].*[\u4e00-\u9fa5]/);
    }
    if (countryMatch) {
      [country] = countryMatch;
    }
  }
  if (MUNICIPALITY_CITIES_ARR.includes(city)) {
    province = city;
    if (location) {
      const districtMatch = extractDistricts(location);
      if (districtMatch.length > 0) {
        city = districtMatch[districtMatch.length - 1];
      }
    }
  }

  const r = { country, province, city, coordinate };
  locationCache.set(run.run_id, r);
  return r;
};

const intComma = (x = '') => {
  if (x.toString().length <= 5) {
    return x;
  }
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};



// 应用偏移到坐标点
// Apply offset to points in Mercator space to preserve shape
const applyOffset = (points: Coordinate[]): Coordinate[] => {
  if (points.length === 0) return [];

  // Use a fixed reference latitude for calculating the shift to ensure
  // that all trajectories are shifted by the exact same vector.
  // Using the centerLat of each run would cause slight variations in the
  // shift vector because the Mercator scale factor depends on latitude.
  const FIXED_OFFSET_LAT = 35.0;
  const { dx, dy } = getMercatorOffset(FIXED_OFFSET_LAT);

  return points.map((coord) => {
    const mx = mercatorX(coord[0]);
    const my = mercatorY(coord[1]);
    return [inverseMercatorX(mx + dx), inverseMercatorY(my + dy)];
  });
};

const PRIVACY_KEY = 'tudou_run_map_privacy_key';

// Move key to top scope just in case, though module scope was fine.
// const PRIVACY_KEY is already defined above? No, I will ensure it is unique.

const pathForRun = (run: Activity, applyOffsetToPath: boolean = false): Coordinate[] => {
  try {
    if (!run.summary_polyline) {
      const { coordinate } = locationForRun(run);
      if (coordinate && coordinate[0] && coordinate[1]) {
        return [coordinate, coordinate];
      }
      return [];
    }

    // Tracer for first run only to avoid spam
    if (run.run_id && run.run_id.toString().endsWith('321')) { // Arbitrary filter for specific run or just log first one
      console.log(`[Tracer ${run.run_id}] Input polyline len:`, run.summary_polyline.length);
    }

    // DEBUG: Check libraries (kept from previous step)
    if (!CryptoJS || !CryptoJS.AES) {
      console.error('CryptoJS or AES is missing:', { CryptoJS });
    }
    // ...

    // Attempt to decrypt
    let decodedPolyline = run.summary_polyline;
    try {
      const bytes = CryptoJS.AES.decrypt(run.summary_polyline, PRIVACY_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);

      if (decrypted) {
        decodedPolyline = decrypted;
      }
    } catch (e) {
      // Decryption failed, use original polyline
    }

    // Continue with decoding
    let c: Coordinate[] = [];
    try {
      c = mapboxPolyline.decode(decodedPolyline);
    } catch (err) {
      // Fallback to empty array to prevent map crash
      return [];
    }

    // reverse lat long for mapbox
    let result = c.map((point) => [point[1], point[0]] as Coordinate);

    // Apply gcoord transformation if NEED_FIX_MAP is true
    if (NEED_FIX_MAP) {
      result = result.map((point) => gcoord.transform([point[1], point[0]], gcoord.GCJ02, gcoord.WGS84) as Coordinate);
    }

    // Validate if the result is just [0,0] (Null Island) which indicates bad decoding
    if (result.length > 0 && Math.abs(result[0][0]) < 0.0001 && Math.abs(result[0][1]) < 0.0001) {
      return []; // Return empty to trigger city fallback
    }

    // try to use location city coordinate instead , if runpath is incomplete
    if (result.length === 2 && String(result[0]) === String(result[1])) {
      const { coordinate } = locationForRun(run);
      if (coordinate?.[0] && coordinate?.[1]) {
        return applyOffsetToPath ? applyOffset([coordinate, coordinate]) : [coordinate, coordinate];
      }
    }
    return applyOffsetToPath ? applyOffset(c) : c;
  } catch (err) {
    console.error('pathForRun failed:', err);
    return [];
  }
};

const geoJsonForRuns = (runs: Activity[]): FeatureCollection<LineString> => {
  return {
    type: 'FeatureCollection',
    features: runs.map((run) => {
      // 获取路径并应用偏移
      const points = pathForRun(run, true);

      return {
        type: 'Feature',
        properties: {
          'color': colorFromType(run.type),
        },
        geometry: {
          type: 'LineString',
          coordinates: points,
          workoutType: run.type,
        },
        name: run.name,
      };
    }),
  };
};

const geoJsonForMap = (): FeatureCollection<RPGeometry> => ({
  type: 'FeatureCollection',
  features: worldGeoJson.features.concat(chinaGeojson.features) as any,
})

const titleForType = (type: string): string => {
  switch (type) {
    case 'Run':
      return RUN_TITLES.RUN_TITLE;
    case 'Full Marathon':
      return RUN_TITLES.FULL_MARATHON_RUN_TITLE;
    case 'Half Marathon':
      return RUN_TITLES.HALF_MARATHON_RUN_TITLE;
    case 'Trail Run':
      return RUN_TITLES.TRAIL_RUN_TITLE;
    case 'Ride':
      return RUN_TITLES.RIDE_TITLE;
    case 'Indoor Ride':
      return RUN_TITLES.INDOOR_RIDE_TITLE;
    case 'VirtualRide':
      return RUN_TITLES.VIRTUAL_RIDE_TITLE;
    case 'Hike':
      return RUN_TITLES.HIKE_TITLE;
    case 'Rowing':
      return RUN_TITLES.ROWING_TITLE;
    case 'Swim':
      return RUN_TITLES.SWIM_TITLE;
    case 'RoadTrip':
      return RUN_TITLES.ROAD_TRIP_TITLE;
    case 'Flight':
      return RUN_TITLES.FLIGHT_TITLE;
    case 'Kayaking':
      return RUN_TITLES.KAYAKING_TITLE;
    case 'Snowboard':
      return RUN_TITLES.SNOWBOARD_TITLE;
    case 'Ski':
      return RUN_TITLES.SKI_TITLE;
    default:
      return RUN_TITLES.RUN_TITLE;
  }
}

const typeForRun = (run: Activity): string => {
  const type = run.type
  var distance = run.distance / 1000;
  switch (type) {
    case 'Run':
      if (distance >= 40) {
        return 'Full Marathon';
      }
      else if (distance > 20) {
        return 'Half Marathon';
      }
      return 'Run';
    case 'Trail Run':
      if (distance >= 40) {
        return 'Full Marathon';
      }
      else if (distance > 20) {
        return 'Half Marathon';
      }
      return 'Trail Run';
    default:
      return type;
  }
}

const titleForRun = (run: Activity): string => {
  const type = run.type;
  if (RICH_TITLE) {
    // 1. try to use user defined name
    if (run.name != '') {
      return run.name;
    }
    // 2. try to use location+type if the location is available, eg. 'Shanghai Run'
    const { city, province } = locationForRun(run);
    const activity_sport = titleForType(typeForRun(run));
    if (city && city.length > 0 && activity_sport.length > 0) {
      return `${city} ${activity_sport}`;
    }
  }
  // 3. use time+length if location or type is not available
  if (type == 'Run' || type == 'Trail Run') {
    const runDistance = run.distance / 1000;
    if (runDistance >= 40) {
      return RUN_TITLES.FULL_MARATHON_RUN_TITLE;
    }
    else if (runDistance > 20) {
      return RUN_TITLES.HALF_MARATHON_RUN_TITLE;
    }
  }
  return titleForType(type);
};

const colorFromType = (workoutType: string): string => {
  switch (workoutType) {
    case 'Run':
      return RUN_COLOR;
    case 'Trail Run':
      return TRAIL_RUN_COLOR;
    case 'Ride':
    case 'Indoor Ride':
      return RIDE_COLOR;
    case 'VirtualRide':
      return VIRTUAL_RIDE_COLOR;
    case 'Hike':
      return HIKE_COLOR;
    case 'Rowing':
      return ROWING_COLOR;
    case 'Swim':
      return SWIM_COLOR;
    case 'RoadTrip':
      return ROAD_TRIP_COLOR;
    case 'Flight':
      return FLIGHT_COLOR;
    case 'Kayaking':
      return KAYAKING_COLOR;
    case 'Snowboard':
    case 'Ski':
      return SNOWBOARD_COLOR;
    default:
      return MAIN_COLOR;
  }
};

export interface IViewState {
  longitude?: number;
  latitude?: number;
  zoom?: number;
}

const getBoundsForGeoData = (
  geoData: FeatureCollection<LineString>
): IViewState => {
  const { features } = geoData;
  let points: Coordinate[] = [];
  // find first have data
  for (const f of features) {
    if (f.geometry.coordinates.length) {
      points = f.geometry.coordinates as Coordinate[];
      break;
    }
  }
  if (points.length === 0) {
    return { longitude: 116.4, latitude: 39.9, zoom: 9 };
  }
  if (points.length === 2 && String(points[0]) === String(points[1])) {
    return { longitude: points[0][0], latitude: points[0][1], zoom: 9 };
  }
  // Calculate corner values of bounds
  const pointsLong = points.map((point) => point[0]) as number[];
  const pointsLat = points.map((point) => point[1]) as number[];
  const cornersLongLat: [Coordinate, Coordinate] = [
    [Math.min(...pointsLong), Math.min(...pointsLat)],
    [Math.max(...pointsLong), Math.max(...pointsLat)],
  ];
  const viewState = new WebMercatorViewport({
    width: 800,
    height: 600,
  }).fitBounds(cornersLongLat, { padding: 200 });
  let { longitude, latitude, zoom } = viewState;
  if (features.length > 1) {
    zoom = 11.5;
  }
  return { longitude, latitude, zoom };
};

const filterYearRuns = (run: Activity, year: string) => {
  if (run && run.start_date_local) {
    return run.start_date_local.slice(0, 4) === year;
  }
  return false;
};

const filterCityRuns = (run: Activity, city: string) => {
  if (run && run.location_country) {
    return run.location_country.includes(city);
  }
  return false;
};
const filterTitleRuns = (run: Activity, title: string) =>
  titleForRun(run) === title;

const filterTypeRuns = (run: Activity, type: string) => {
  switch (type) {
    case 'Full Marathon':
      return (run.type === 'Run' || run.type === 'Trail Run') && run.distance > 40000
    case 'Half Marathon':
      return (run.type === 'Run' || run.type === 'Trail Run') && run.distance < 40000 && run.distance > 20000
    default:
      return run.type === type
  }
}

const filterAndSortRuns = (
  activities: Activity[],
  item: string,
  filterFunc: (_run: Activity, _bvalue: string) => boolean,
  sortFunc: (_a: Activity, _b: Activity) => number,
  item2: string | null,
  filterFunc2: ((_run: Activity, _bvalue: string) => boolean) | null,
) => {
  let s = activities;
  if (item !== 'Total') {
    s = activities.filter((run) => filterFunc(run, item));
  }
  if (filterFunc2 != null && item2 != null) {
    s = s.filter((run) => filterFunc2(run, item2));
  }
  return s.sort(sortFunc);
};

const sortDateFunc = (a: Activity, b: Activity) => {
  return (
    new Date(b.start_date_local.replace(' ', 'T')).getTime() -
    new Date(a.start_date_local.replace(' ', 'T')).getTime()
  );
};
const sortDateFuncReverse = (a: Activity, b: Activity) => sortDateFunc(b, a);

// 计算两点之间的距离（单位：公里）
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // 地球半径，单位为公里
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

// 计算两点之间的角度（方位角，单位：度）
const calculateBearing = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const lonDiff = (lon2 - lon1) * Math.PI / 180;

  const y = Math.sin(lonDiff) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(lonDiff);

  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360; // 转换为0-360度

  return bearing;
};

export {
  titleForShow,
  formatPace,
  scrollToMap,
  locationForRun,
  intComma,
  pathForRun,
  geoJsonForRuns,
  geoJsonForMap,
  titleForRun,
  typeForRun,
  titleForType,
  filterYearRuns,
  filterCityRuns,
  filterTitleRuns,
  filterAndSortRuns,
  sortDateFunc,
  sortDateFuncReverse,
  getBoundsForGeoData,
  filterTypeRuns,
  colorFromType,
  formatRunTime,
  convertMovingTime2Sec,

  calculateDistance,
  calculateBearing,
  getMapStyle,
};

const getMapStyle = (
  vendor: string,
  style: string,
  accessToken: string
): string => {
  if (vendor === 'maptiler') {
    // @ts-ignore
    const styleUrl = MAP_TILE_STYLES.maptiler[style];
    if (styleUrl) {
      return `${styleUrl}${accessToken}&language=zh`;
    }
    // fallback or default
    return `https://api.maptiler.com/maps/019b026a-0d90-7381-b30b-b9d14155889c/style.json?key=${accessToken}`;
  }
  // mapbox
  // @ts-ignore
  const mapboxStyle = MAP_TILE_STYLES.mapbox[style] || 'mapbox://styles/mapbox/dark-v10';
  return mapboxStyle;
};

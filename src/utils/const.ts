// const
const MAPBOX_TOKEN =
  // For security reasons, please avoid using the default public token provided by Mapbox as much as possible.
  // Instead, manually add a new token and apply URL restrictions.
  // (please refer to https://github.com/yihong0618/running_page/issues/643#issuecomment-2042668580)
  'pk.eyJ1IjoiYmVuLTI5IiwiYSI6ImNrZ3Q4Ym9mMDBqMGYyeXFvODV2dWl6YzQifQ.gSKoWF-fMjhzU67TuDezJQ';
const MUNICIPALITY_CITIES_ARR = [
  '北京市',
  '上海市',
  '天津市',
  '重庆市',
  '香港特别行政区',
  '澳门特别行政区',
];
const MAP_LAYER_LIST = [
  'road-label',
  'waterway-label',
  'natural-line-label',
  'natural-point-label',
  'water-line-label',
  'water-point-label',
  'poi-label',
  'airport-label',
  'settlement-subdivision-label',
  'settlement-label',
  'state-label',
  'country-label',
];

const USE_GOOGLE_ANALYTICS = false;
const GOOGLE_ANALYTICS_TRACKING_ID = '';

// styling: set to `true` if you want dash-line route
const USE_DASH_LINE = false;
// styling: route line opacity: [0, 1]
const LINE_OPACITY = 0.6;
// styling: map height
const MAP_HEIGHT = 456; // 桌面版高度
const MOBILE_MAP_HEIGHT = 350; // 移动设备高度
//set to `false` if you want to hide the road label characters
const ROAD_LABEL_DISPLAY = true;
// update for now 2024/11/17 the privacy mode is true
//set to `true` if you want to display only the routes without showing the map.
const PRIVACY_MODE = false;
// update for now 2024/11/17 the lights on default is false
//set to `false` if you want to make light off as default, only effect when `PRIVACY_MODE` = false
const LIGHTS_ON =false;
//set to `true` if you want to show the 'Elevation' column
const SHOW_ELEVATION_GAIN = true;
// richer title for the activity types (like garmin style)
const RICH_TITLE = true;

// IF you outside China please make sure IS_CHINESE = false
const IS_CHINESE = true;
const USE_ANIMATION_FOR_GRID = false;
const CHINESE_INFO_MESSAGE = (yearLength: number, year: string): string =>
  `户外运动 ${yearLength} 年 ` + ( year === 'Total' ? '' : `，这里展示的是 ${year} 年的运动轨迹。`);

const ENGLISH_INFO_MESSAGE = (yearLength: number, year: string): string =>
  `Logged ${yearLength} Years of Outdoor Journey` +  ( year === 'Total' ? '' : `, the page show routes in ${year}`);

// not support English for now
const CHINESE_LOCATION_INFO_MESSAGE_FIRST =
  '我去过了一些地方，希望随着时间推移，地图点亮的地方越来越多';
const CHINESE_LOCATION_INFO_MESSAGE_SECOND = '不要停下来，不要停下探索的脚步';

const INFO_MESSAGE = IS_CHINESE ? CHINESE_INFO_MESSAGE : ENGLISH_INFO_MESSAGE;
const FULL_MARATHON_RUN_TITLE = IS_CHINESE ? '全程马拉松' : 'Full Marathon';
const HALF_MARATHON_RUN_TITLE = IS_CHINESE ? '半程马拉松' : 'Half Marathon';
const RUN_TITLE = IS_CHINESE ? '跑步' : 'Run';
const TRAIL_RUN_TITLE = IS_CHINESE ? '越野跑' : 'Trail Run';
const SWIM_TITLE = IS_CHINESE ? '游泳' : 'Swim';
const RIDE_TITLE = IS_CHINESE ? '骑行' : 'Ride';
const INDOOR_RIDE_TITLE = IS_CHINESE ? '室内骑行' : 'Indoor Ride';
const VIRTUAL_RIDE_TITLE = IS_CHINESE ? '虚拟骑行' : 'Virtual Ride';
const HIKE_TITLE = IS_CHINESE ? '徒步' : 'Hike';
const ROWING_TITLE = IS_CHINESE ? '划船' : 'Rowing';
const KAYAKING_TITLE = IS_CHINESE ? '皮划艇' : 'Kayaking';
const SNOWBOARD_TITLE = IS_CHINESE ? '单板滑雪' : 'Snowboard';
const SKI_TITLE = IS_CHINESE ? '双板滑雪' : 'Ski';
const ROAD_TRIP_TITLE = IS_CHINESE ? '自驾' : 'RoadTrip';
const FLIGHT_TITLE = IS_CHINESE ? '飞行' : 'Flight';
const RUN_TREADMILL_TITLE = IS_CHINESE ? '跑步机' : 'Treadmill Run';

const ACTIVITY_COUNT_TITLE = IS_CHINESE ? '活动次数' : 'Activity Count';
const MAX_DISTANCE_TITLE = IS_CHINESE ? '最远距离' : 'Max Distance';
const MAX_SPEED_TITLE = IS_CHINESE ? '最快速度' : 'Max Speed';
const TOTAL_TIME_TITLE = IS_CHINESE ? '总时间' : 'Total Time';
const AVERAGE_SPEED_TITLE = IS_CHINESE ? '平均速度' : 'Average Speed';
const TOTAL_DISTANCE_TITLE = IS_CHINESE ? '总距离' : 'Total Distance';
const YEARLY_TITLE = IS_CHINESE ? 'Year' : 'Yearly';
const MONTHLY_TITLE = IS_CHINESE ? 'Month' : 'Monthly';
const WEEKLY_TITLE = IS_CHINESE ? 'Week' : 'Weekly';
const DAILY_TITLE = IS_CHINESE ? 'Day' : 'Daily';
const LOCATION_TITLE = IS_CHINESE ? 'Location' : 'Location';

const RUN_TITLES = {
  FULL_MARATHON_RUN_TITLE,
  HALF_MARATHON_RUN_TITLE,
  RUN_TITLE,
  TRAIL_RUN_TITLE,

  SWIM_TITLE,
  RIDE_TITLE,
  INDOOR_RIDE_TITLE,
  VIRTUAL_RIDE_TITLE,
  HIKE_TITLE,
  ROWING_TITLE,
  KAYAKING_TITLE,
  SNOWBOARD_TITLE,
  SKI_TITLE,
  ROAD_TRIP_TITLE,
  FLIGHT_TITLE,
  RUN_TREADMILL_TITLE,
};

const TYPES_MAPPING = {
  'run': RUN_TITLES.RUN_TITLE,
  'trail run': RUN_TITLES.TRAIL_RUN_TITLE,
  'swim': RUN_TITLES.SWIM_TITLE,
  'ride': RUN_TITLES.RIDE_TITLE,
  'virtualride': RUN_TITLES.VIRTUAL_RIDE_TITLE,
  'hike': RUN_TITLES.HIKE_TITLE,
  'rowing': RUN_TITLES.ROWING_TITLE,
  'kayaking': RUN_TITLES.KAYAKING_TITLE,
  'snowboard': RUN_TITLES.SNOWBOARD_TITLE,
  'ski': RUN_TITLES.SKI_TITLE,
  'roadtrip': RUN_TITLES.ROAD_TRIP_TITLE,
}

const ACTIVITY_TOTAL = {
    ACTIVITY_COUNT_TITLE,
    MAX_DISTANCE_TITLE,
    MAX_SPEED_TITLE,
    TOTAL_TIME_TITLE,
    AVERAGE_SPEED_TITLE,
    TOTAL_DISTANCE_TITLE,
    YEARLY_TITLE,
    MONTHLY_TITLE,
    WEEKLY_TITLE,
    DAILY_TITLE,
    LOCATION_TITLE
};

export {
  USE_GOOGLE_ANALYTICS,
  GOOGLE_ANALYTICS_TRACKING_ID,
  CHINESE_LOCATION_INFO_MESSAGE_FIRST,
  CHINESE_LOCATION_INFO_MESSAGE_SECOND,
  MAPBOX_TOKEN,
  MUNICIPALITY_CITIES_ARR,
  MAP_LAYER_LIST,
  IS_CHINESE,
  ROAD_LABEL_DISPLAY,
  INFO_MESSAGE,
  RUN_TITLES,
  USE_ANIMATION_FOR_GRID,
  USE_DASH_LINE,
  LINE_OPACITY,
  MAP_HEIGHT,
  MOBILE_MAP_HEIGHT,
  PRIVACY_MODE,
  LIGHTS_ON,
  SHOW_ELEVATION_GAIN,
  RICH_TITLE,
  ACTIVITY_TOTAL,
  TYPES_MAPPING,
};

const nike = 'rgb(224,237,94)';
const yellow = 'rgb(224,237,94)';
const green = 'rgb(0,237,94)';
const pink = 'rgb(237,85,219)';
const cyan = 'rgb(112,243,255)';
const IKB = 'rgb(0,47,167)';
const dark_vanilla = 'rgb(228,212,220)';
const gold = 'rgb(242,190,69)';
const purple = 'rgb(154,118,252)';
const veryPeri = 'rgb(105,106,173)';//长春花蓝
const red = 'rgb(255,0,0)';//大红色


const primarycolor = 'rgb(32, 178, 170)';
const secondarycolor = 'rgb(249, 149, 6)';
const accentcolor = 'rgb(137, 207, 240)';

// If your map has an offset please change this line
// issues #92 and #198
export const NEED_FIX_MAP = false;
export const MAIN_COLOR = primarycolor;
//export const RUN_COLOR = 'rgb(0, 137, 200)'; //rgb(0, 137, 200)
export const RUN_COLOR = 'rgb(0, 166, 153)'; // 更亮的青绿色
export const RIDE_COLOR = 'rgb(255, 140, 0)'; // 更亮的橙色
export const VIRTUAL_RIDE_COLOR = 'rgb(111, 78, 255)'; // 更亮的紫色
export const HIKE_COLOR = 'rgb(255, 64, 129)'; // 更亮的粉色
export const SWIM_COLOR = 'rgb(255, 193, 7)'; // 更亮的金色
export const ROWING_COLOR = 'rgb(0, 229, 255)'; // 更亮的青色
export const ROAD_TRIP_COLOR = 'rgb(156, 39, 176)'; // 更亮的紫色
export const FLIGHT_COLOR = 'rgb(121, 85, 72)'; // 更深的棕色，在亮色背景上更明显
export const PROVINCE_FILL_COLOR = '#A5D7E8'; // 更浅的蓝色，适合亮色地图
export const COUNTRY_FILL_COLOR = '#D2E0FB'; // 更浅的紫色，适合亮色地图
export const KAYAKING_COLOR = 'rgb(244, 67, 54)'; // 更亮的红色
export const SNOWBOARD_COLOR = 'rgb(76, 175, 80)'; // 更亮的绿色，替换原来的dark_vanilla
export const TRAIL_RUN_COLOR = 'rgb(33, 150, 243)'; // 更亮的蓝色，替换原来的IKB

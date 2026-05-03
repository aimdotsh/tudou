import MapboxLanguage from '@mapbox/mapbox-gl-language';
import React, { useRef, useCallback, useState, useEffect } from 'react';
import Map, { Layer, Source, FullscreenControl, NavigationControl, MapRef, Popup } from 'react-map-gl';
import { MapInstance } from "react-map-gl/src/types/lib";
import useActivities from '@/hooks/useActivities';
import {
  MAP_LAYER_LIST,
  IS_CHINESE,
  ROAD_LABEL_DISPLAY,
  MAPBOX_TOKEN,
  PROVINCE_FILL_COLOR,
  COUNTRY_FILL_COLOR,
  VISITED_CITY_FILL_COLOR,
  USE_DASH_LINE,
  LINE_OPACITY,
  MAP_HEIGHT,
  PRIVACY_MODE,
  LIGHTS_ON,
  MAP_TILE_VENDOR,
  MAP_TILE_ACCESS_TOKEN,
  MAP_TILE_STYLE_LIGHT,
} from '@/utils/const';
import { Coordinate, IViewState, geoJsonForMap, getMapStyle, locationForRun } from '@/utils/utils';
import RunMarker from './RunMarker';
import RunMapButtons from './RunMapButtons';
import styles from './style.module.css';
import { FeatureCollection, LineString, Feature } from 'geojson';
import { RPGeometry, chinaGeojson } from '@/static/run_countries';
import locationStats from '@/static/location_stats.json';
import './mapbox.css';
import LightsControl from "@/components/RunMap/LightsControl";

interface IRunMapProps {
  title: string;
  viewState: IViewState;
  setViewState: (_viewState: IViewState) => void;
  changeYear: (_year: string) => void;
  geoData: FeatureCollection<RPGeometry>;
  thisYear: string;
  description?: string;
}

const RunMap = ({
  title,
  viewState,
  setViewState,
  changeYear,
  geoData: propGeoData,
  thisYear,
  description,
}: IRunMapProps) => {
  const { activities, countries, provinces } = useActivities();
  const mapRef = useRef<MapRef>();
  const [lights, setLights] = useState(PRIVACY_MODE ? false : LIGHTS_ON);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [popupInfo, setPopupInfo] = useState<{
    longitude: number;
    latitude: number;
    province: string;
  } | null>(null);

  // 从 GeoJSON 中提取标准省份名
  const standardProvinces = React.useMemo(() => {
    return (chinaGeojson.features as any[]).map(f => f.properties.name);
  }, []);

  // 直接从预计算的 locationStats 中获取省份汇总数据
  // 这样可以避免隐私模式下 activities 数据缺失地理信息的问题
  const provinceStats = React.useMemo(() => {
    return (locationStats as any).provinceSummary || {};
  }, []);

  const onMouseMove = useCallback((event: any) => {
    const interactiveLayers = ['visited-areas', 'province', 'visited-province-labels'];
    const features = event.features || [];
    const feature = features.find((f: any) => interactiveLayers.includes(f.layer.id));
    
    if (feature) {
      const provinceName = feature.properties.name;
      if (provinceName) {
        setSelectedProvince(provinceName);
        setPopupInfo({
          longitude: event.lngLat.lng,
          latitude: event.lngLat.lat,
          province: provinceName
        });
      }
    } else {
      setSelectedProvince(null);
      setPopupInfo(null);
    }
  }, []);

  // 动态轨迹相关
  const animationRef = useRef<number>();
  const [animatedGeo, setAnimatedGeo] = useState<FeatureCollection<LineString>>(); // 动态轨迹geojson
  const [animating, setAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);

  // --- 保证 geoData 只在必要时合并（避免闪烁） ---
  const [geoData, setGeoData] = useState<FeatureCollection<RPGeometry>>(propGeoData);
  const [mapStyle, setMapStyle] = useState<any>({
    version: 8,
    sources: {},
    layers: []
  });

  useEffect(() => {
    const styleUrl = getMapStyle(MAP_TILE_VENDOR, MAP_TILE_STYLE_LIGHT, MAP_TILE_ACCESS_TOKEN);
    fetch(styleUrl)
      .then(res => res.json())
      .then(styleJson => {
        // Sanitize style: remove invalid properties AND enforce label hiding
        if (styleJson.layers) {
          styleJson.layers = styleJson.layers.filter((layer: any) => {
            // 1. Clean up known Mapbox/MapTiler compatibility issues
            if (layer.layout) {
              if (layer.layout['text-overlap']) delete layer.layout['text-overlap'];
              if (layer.layout['icon-overlap']) delete layer.layout['icon-overlap'];
            }

            // 2. STRICTLY REMOVE labels if configured to do so
            // This prevents them from EVER loading, regardless of network speed or JS lag
            if (PRIVACY_MODE || !ROAD_LABEL_DISPLAY) {
              const isLabelLayer = layer.type === 'symbol' && layer.layout && layer.layout['text-field'];
              // Keep admin/country labels if needed, but for "Strict" mode usually we want to nuke detailed street labels
              // If it's a sensitive label layer, filter it out (return false)
              if (isLabelLayer) {
                return false; // Remove this layer entirely from the style
              }
            }
            return true; // Keep other layers
          });
        }
        setMapStyle(styleJson);
      })
      .catch(err => {
        console.error("Failed to load map style:", err);
        // Fallback to empty style to ensure map renders tracks
        setMapStyle({
          version: 8,
          sources: {},
          layers: []
        });
      });
  }, []);

  useEffect(() => {
    let tmpGeo = propGeoData;
    const isBigMap = (viewState.zoom ?? 0) <= 3 || thisYear === 'Total';

    if (isBigMap && IS_CHINESE) {
      const chinaGeoData = geoJsonForMap();
      if (chinaGeoData && chinaGeoData.features) {
        tmpGeo = {
          "type": "FeatureCollection",
          "features": propGeoData.features.concat(chinaGeoData.features)
        };
      }
    }
    setGeoData(tmpGeo);
  }, [IS_CHINESE, propGeoData, viewState.zoom, thisYear]);

  // ----------- 动态轨迹动画逻辑 -----------
  // 只对单条轨迹进行动画
  const isSingleRun =
    geoData.features.length === 1 &&
    geoData.features[0].geometry.type === 'LineString' &&
    geoData.features[0].geometry.coordinates.length > 1;

  useEffect(() => {
    if (!isSingleRun) {
      setAnimatedGeo(undefined);
      setAnimating(false);
      return;
    }

    setAnimating(true);

    const points = geoData.features[0].geometry.coordinates as Coordinate[];
    let current = 2; // 至少有起点和一个终点
    const step = Math.max(2, Math.floor(points.length / 120)); // 动画帧数，越小越慢

    function animate() {
      if (current >= points.length) {
        setAnimating(false);
        setAnimatedGeo(undefined);
        setAnimationProgress(100);
        return;
      }
      const progress = Math.round((current / points.length) * 100);
      setAnimationProgress(progress);

      const animFeature: Feature<LineString> = {
        ...geoData.features[0],
        geometry: {
          type: 'LineString',
          coordinates: points.slice(0, current)
        }
      };
      setAnimatedGeo({
        type: "FeatureCollection",
        features: [animFeature]
      });
      current += step;
      animationRef.current = requestAnimationFrame(animate);
    }
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line
  }, [geoData]);

  // --------- 其余逻辑基本保持不变 ---------
  // layers that should remain visible when lights are off
  const keepWhenLightsOff = ['runs2', 'animated-run'];
  const switchLayerVisibility = useCallback((map: MapInstance, lights: boolean) => {
    const styleJson = map.getStyle();
    const currentYear = new Date().getFullYear();
    const isRecentYear = !isNaN(Number(thisYear)) && Number(thisYear) >= currentYear - 1;

    styleJson.layers.forEach((it: { id: string; type: string; layout?: any }) => {
      if (!keepWhenLightsOff.includes(it.id)) {
        const isLabelLayer = it.type === 'symbol' && it.layout && it.layout['text-field'];

        // Special logic for labels based on year
        if (isLabelLayer) {
          // 1. If Privacy Mode is ON OR Road Label Display is OFF, always hide labels
          if ((PRIVACY_MODE || !ROAD_LABEL_DISPLAY) && !it.id.includes('visited-province')) {
            map.setLayoutProperty(it.id, 'visibility', 'none');
            return;
          }

          // 2. Total Year: Show ONLY Admin labels, Hide Streets
          if (thisYear === 'Total') {
            const adminKeywords = ['country', 'state', 'province', 'settlement', 'place', 'city', 'admin'];
            const isAdminLabel = adminKeywords.some(keyword => it.id.toLowerCase().includes(keyword));
            if (isAdminLabel && lights) {
              map.setLayoutProperty(it.id, 'visibility', 'visible');
            } else {
              map.setLayoutProperty(it.id, 'visibility', 'none');
            }
            return;
          }

          // 3. Recent Years (Current & Last Year): Hide ALL labels (Cleaner look)
          if (isRecentYear) {
            map.setLayoutProperty(it.id, 'visibility', 'none');
            return;
          }

          // 4. Older Years: Show ALL labels (Streets, etc.) - Overrides ROAD_LABEL_DISPLAY = false
          if (lights) {
            map.setLayoutProperty(it.id, 'visibility', 'visible');
          } else {
            map.setLayoutProperty(it.id, 'visibility', 'none');
          }
          return;
        }

        // Standard handling for non-label layers
        if (lights)
          map.setLayoutProperty(it.id, 'visibility', 'visible');
        else
          map.setLayoutProperty(it.id, 'visibility', 'none');
      }
    })
  }, [thisYear]);


  const mapRefCallback = useCallback(
    (ref: MapRef) => {
      if (ref !== null) {
        const map = ref.getMap();
        if (map && IS_CHINESE) {
          // map.addControl(new MapboxLanguage({ defaultLanguage: 'zh' }));
        }
        if (map) {
          map.touchZoom?.disable();
          map.doubleClickZoom?.disable();
          map.scrollZoom?.disable();
          map.boxZoom?.disable();
          map.dragRotate?.disable();
          map.keyboard?.disable();
          map.dragPan?.disable();
        }
        // all style resources have been downloaded
        // and the first visually complete rendering of the base style has occurred.
        // it's odd. when use style other than mapbox, the style.load event is not triggered.Add commentMore actions
        // so I use data event instead of style.load event and make sure we handle it only once.
        map.on('data', (event) => {
          if (event.dataType !== 'style' || mapRef.current) {
            return;
          }
          if (!ROAD_LABEL_DISPLAY || PRIVACY_MODE) {
            const layers = map.getStyle().layers;
            const labelLayerNames = layers
              .filter(
                (layer: any) =>
                  (layer.type === 'symbol' || layer.type === 'composite') &&
                  layer.layout &&
                  layer.layout['text-field'] &&
                  !layer.id.includes('visited-province')
              )
              .map((layer: any) => layer.id);

            labelLayerNames.forEach((layerId) => {
              // map.removeLayer(layerId);
              if (map.getLayer(layerId)) {
                map.setLayoutProperty(layerId, 'visibility', 'none');
              }
            });
          }
          mapRef.current = ref;
          switchLayerVisibility(map, lights);
        });
      }
      if (mapRef.current) {
        const map = mapRef.current.getMap();
        switchLayerVisibility(map, lights);
      }
    },
    [mapRef, lights, switchLayerVisibility, thisYear]
  );

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map) {
      switchLayerVisibility(map, lights);
    }
  }, [thisYear, lights, switchLayerVisibility]);

  const filterProvinces = provinces.slice();
  const filterCountries = countries.slice();
  filterProvinces.unshift('in', 'name');
  filterCountries.unshift('in', 'name');

  // 创建访问过的城市和省份过滤器（仅在 Total 年份时显示）
  const visitedCities = thisYear === 'Total' ? locationStats.citiesList : [];
  const visitedProvinces = thisYear === 'Total' ? locationStats.provincesList : [];

  // 合并直辖市和省份进行高亮
  const highlightAreas = [...visitedCities, ...visitedProvinces];
  const filterHighlightAreas = highlightAreas.slice();
  filterHighlightAreas.unshift('in', 'name');

  // Marker
  let startLon = 0, startLat = 0, endLon = 0, endLat = 0;
  if (isSingleRun) {
    const points = geoData.features[0].geometry.coordinates as Coordinate[];
    [startLon, startLat] = points[0];
    [endLon, endLat] = points[points.length - 1];
  }
  let dash = USE_DASH_LINE && !isSingleRun && ((viewState.zoom ?? 0) <= 3) === false ? [2, 2] : [2, 0];
  const onMove = React.useCallback(({ viewState }: { viewState: IViewState }) => {
    setViewState(viewState);
  }, []);
  const style: React.CSSProperties = {
    width: '100%',
    height: MAP_HEIGHT,
    touchAction: 'pan-x pan-y',
  };
  const fullscreenButton: React.CSSProperties = {
    position: 'absolute',
    marginTop: '21.2px',
    right: '0px',
    opacity: 0.3,
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (mapRef.current) {
        mapRef.current.getMap().resize();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // --------- 渲染部分 ---------
  return (
    <Map
      {...viewState}
      onMove={onMove}
      onMouseMove={onMouseMove}
      interactiveLayerIds={['visited-areas', 'province', 'countries', 'visited-province-labels']}
      style={style}
      mapStyle={mapStyle}
      ref={mapRefCallback}
      cursor={selectedProvince ? 'pointer' : 'grab'}
      mapboxAccessToken={MAPBOX_TOKEN}
      scrollZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      touchRotate={false}
      touchPitch={false}
      boxZoom={false}
      keyboard={false}
      dragRotate={false}
      dragPan={false}
    >
      <RunMapButtons changeYear={changeYear} thisYear={thisYear} />
      {/* 背景轨迹层 - 在动画时显示浅色完整轨迹 */}
      {animating && (
        <Source id="background-data" type="geojson" data={geoData}>
          <Layer
            id="background-runs"
            type="line"
            paint={{
              'line-color': '#FF8C00',
              'line-width': 2,
              'line-dasharray': dash,
              'line-opacity': 0.3,
              'line-blur': 1,
            }}
            layout={{
              'line-join': 'round',
              'line-cap': 'round',
            }}
          />
        </Source>
      )}

      {/* 主要数据层 - 动画时显示动态轨迹，非动画时显示完整轨迹 */}
      <Source id="data" type="geojson" data={animatedGeo || geoData}>
        <Layer
          id="province"
          type="fill"
          paint={{
            'fill-color': PROVINCE_FILL_COLOR,
            'fill-opacity': 0.2,
          }}
          filter={filterProvinces}
        />
        {/* 访问过的区域高亮层 - 仅在 Total 年份时显示（包括直辖市和省份） */}
        {thisYear === 'Total' && highlightAreas.length > 0 && (
          <Layer
            id="visited-areas"
            type="fill"
            paint={{
              'fill-color': [
                'case',
                ['==', ['get', 'name'], selectedProvince || ''],
                '#FF8C00', // 选中颜色：橙色
                VISITED_CITY_FILL_COLOR
              ],
              'fill-opacity': [
                'case',
                ['==', ['get', 'name'], selectedProvince || ''],
                0.8,
                0.4
              ],
            }}
            filter={filterHighlightAreas}
          />
        )}
        {/* 增加全国省份/直辖市名称展示 */}
        {thisYear === 'Total' && (
          <Layer
            id="visited-province-labels"
            type="symbol"
            paint={{
              'text-color': [
                'case',
                ['==', ['get', 'name'], selectedProvince || ''],
                '#FFFFFF', // 选中时文字反白
                ['in', ['get', 'name'], ['literal', highlightAreas]],
                '#21B2AA', // 已访问：青色
                '#999999'  // 未访问：灰色
              ],
              'text-halo-color': [
                'case',
                ['==', ['get', 'name'], selectedProvince || ''],
                '#FF8C00', // 选中时光晕颜色
                '#ffffff'
              ],
              'text-halo-width': 1.5,
            }}
            layout={{
              'text-field': ['get', 'name'],
              'text-size': [
                'case',
                ['==', ['get', 'name'], selectedProvince || ''],
                14, // 选中时字号变大
                11
              ],
              'text-anchor': 'center',
              'text-allow-overlap': false,
              'text-padding': 2,
            }}
            filter={['has', 'cp']}
          />
        )}
        <Layer
          id="countries"
          type="fill"
          paint={{
            'fill-color': COUNTRY_FILL_COLOR,
            'fill-opacity': ["case", ["==", ["get", "name"], '中国'], 0.1, 0.5],
          }}
          filter={filterCountries}
        />
        <Layer
          id="runs2"
          type="line"
          paint={{
            'line-color': animating ? '#FF8C00' : ['get', 'color'],
            'line-width': animating ? 3 : (((viewState.zoom ?? 0) <= 3) && lights ? 1 : 2),
            'line-dasharray': dash,
            'line-opacity': isSingleRun || ((viewState.zoom ?? 0) <= 3) || !lights ? 1 : LINE_OPACITY,
            'line-blur': animating ? 0.5 : 1,
          }}
          layout={{
            'line-join': 'round',
            'line-cap': 'round',
          }}
        />
      </Source>
      {isSingleRun && !animating && (
        <RunMarker
          startLat={startLat}
          startLon={startLon}
          endLat={endLat}
          endLon={endLon}
        />
      )}
      <span className={styles.runTitle}>
        {title}
        {animating && (
          <span className={styles.animationProgress}>
            {animationProgress}%
          </span>
        )}
      </span>
      {description && (
        <span className={styles.runDescription}>
          {description}
        </span>
      )}
      {popupInfo && (
        <Popup
          longitude={popupInfo.longitude}
          latitude={popupInfo.latitude}
          anchor="bottom"
          onClose={() => setPopupInfo(null)}
          closeButton={false}
          className="province-popup"
          style={{ pointerEvents: 'none' }}
        >
          <div className="p-2 min-w-[150px] bg-white/90 backdrop-blur-sm rounded shadow-lg text-gray-800" style={{ pointerEvents: 'none' }}>
            <h3 className="text-lg font-bold border-b border-gray-200 pb-1 mb-2 text-red-500">
              {popupInfo.province}
            </h3>
            {provinceStats[popupInfo.province] ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">累计里程:</span>
                  <span className="font-semibold">{(provinceStats[popupInfo.province].distance / 1000).toFixed(2)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">运动次数:</span>
                  <span className="font-semibold">{provinceStats[popupInfo.province].count} 次</span>
                </div>
                <div className="mt-2">
                  <span className="text-gray-500 block mb-1">访问城市:</span>
                  <div className="flex flex-wrap gap-1">
                    {provinceStats[popupInfo.province].cities.map(city => (
                      <span key={city} className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded-sm text-xs">
                        {city}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400 py-2 text-center">
                暂无运动记录
              </div>
            )}
          </div>
        </Popup>
      )}
      <FullscreenControl style={fullscreenButton} />

    </Map>
  );
};

export default RunMap;
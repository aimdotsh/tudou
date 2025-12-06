import MapboxLanguage from '@mapbox/mapbox-gl-language';
import React, { useRef, useCallback, useState, useEffect } from 'react';
import Map, { Layer, Source, FullscreenControl, NavigationControl, MapRef } from 'react-map-gl';
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
} from '@/utils/const';
import { Coordinate, IViewState, geoJsonForMap } from '@/utils/utils';
import RunMarker from './RunMarker';
import RunMapButtons from './RunMapButtons';
import styles from './style.module.css';
import { FeatureCollection, LineString, Feature } from 'geojson';
import { RPGeometry } from '@/static/run_countries';
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
}

const RunMap = ({
  title,
  viewState,
  setViewState,
  changeYear,
  geoData: propGeoData,
  thisYear,
}: IRunMapProps) => {
  const { countries, provinces } = useActivities();
  const mapRef = useRef<MapRef>();
  const [lights, setLights] = useState(PRIVACY_MODE ? false : LIGHTS_ON);

  // 动态轨迹相关
  const animationRef = useRef<number>();
  const [animatedGeo, setAnimatedGeo] = useState<FeatureCollection<LineString>>(); // 动态轨迹geojson
  const [animating, setAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);

  // --- 保证 geoData 只在必要时合并（避免闪烁） ---
  const [geoData, setGeoData] = useState<FeatureCollection<RPGeometry>>(propGeoData);

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
  function switchLayerVisibility(map: MapInstance, lights: boolean) {
    const styleJson = map.getStyle();
    styleJson.layers.forEach((it: { id: string; }) => {
      if (!keepWhenLightsOff.includes(it.id)) {
        if (lights)
          map.setLayoutProperty(it.id, 'visibility', 'visible');
        else
          map.setLayoutProperty(it.id, 'visibility', 'none');
      }
    })
  }


  const mapRefCallback = useCallback(
    (ref: MapRef) => {
      if (ref !== null) {
        const map = ref.getMap();
        if (map && IS_CHINESE) {
          map.addControl(new MapboxLanguage({ defaultLanguage: 'zh-Hans' }));
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
                  layer.layout && layer.layout.text_field !== null
              )
              .map((layer: any) => layer.id);
            labelLayerNames.forEach((layerId) => {
              map.removeLayer(layerId);
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
    [mapRef, lights]
  );

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
  };
  const fullscreenButton: React.CSSProperties = {
    position: 'absolute',
    marginTop: '29.2px',
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
      style={style}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      ref={mapRefCallback}
      mapboxAccessToken={MAPBOX_TOKEN}
      scrollZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      dragRotate={false}
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
              'fill-color': VISITED_CITY_FILL_COLOR,
              'fill-opacity': 0.4,
            }}
            filter={filterHighlightAreas}
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
      <FullscreenControl style={fullscreenButton} />
      {!PRIVACY_MODE && <LightsControl setLights={setLights} lights={lights} />}

    </Map>
  );
};

export default RunMap;
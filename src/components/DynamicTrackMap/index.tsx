import React, { useRef, useCallback, useState, useEffect } from 'react';
import Map, { Layer, Source, MapRef } from 'react-map-gl';
import { MapInstance } from "react-map-gl/src/types/lib";
import * as mapboxPolyline from '@mapbox/polyline';
import gcoord from 'gcoord';
import {
  MAPBOX_TOKEN,
  USE_DASH_LINE,
  LINE_OPACITY,
  NEED_FIX_MAP,
} from '@/utils/const';
import { Coordinate, IViewState } from '@/utils/utils';
import { FeatureCollection, LineString, Feature } from 'geojson';
import activities from '@/static/activities_export';
import './style.css';

interface Activity {
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
}

interface IDynamicTrackMapProps {
  date: string;
  className?: string;
  isVisible?: boolean; // 添加可见性属性
}

// 解码polyline的函数
const decodePolyline = (polyline: string): Coordinate[] => {
  if (!polyline) return [];

  try {
    const decoded = mapboxPolyline.decode(polyline);
    // reverse lat long for mapbox and convert to Coordinate type
    const coordinates: Coordinate[] = decoded.map((arr) => {
      const coord = !NEED_FIX_MAP
        ? [arr[1], arr[0]] as Coordinate
        : gcoord.transform([arr[1], arr[0]], gcoord.GCJ02, gcoord.WGS84) as Coordinate;
      return coord;
    });
    return coordinates;
  } catch (error) {
    console.error('Failed to decode polyline:', error);
    return [];
  }
};

// 根据日期获取活动数据并转换为GeoJSON
const getGeoDataForDate = (date: string): FeatureCollection<LineString> => {
  const dayActivities = (activities as Activity[]).filter(activity =>
    activity.start_date_local.startsWith(date)
  );

  const features: Feature<LineString>[] = dayActivities
    .filter(activity => activity.summary_polyline)
    .map((activity, index) => {
      const coordinates = decodePolyline(activity.summary_polyline!);

      if (coordinates.length === 0) return null;

      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates
        },
        properties: {
          color: '#FF8C00', // 橙黄色
          run_id: activity.run_id,
          name: activity.name,
          distance: activity.distance,
          type: activity.type
        }
      };
    })
    .filter(Boolean) as Feature<LineString>[];

  return {
    type: 'FeatureCollection',
    features
  };
};

// 计算轨迹的边界
const getBoundsForGeoData = (geoData: FeatureCollection<LineString>) => {
  const { features } = geoData;
  let points: Coordinate[] = [];

  features.forEach(feature => {
    if (feature.geometry.type === 'LineString') {
      const coords = feature.geometry.coordinates.map(coord => [coord[0], coord[1]] as Coordinate);
      points = points.concat(coords);
    }
  });

  if (points.length === 0) {
    return {
      longitude: 116.3974,
      latitude: 39.9093,
      zoom: 10
    };
  }

  const lngs = points.map(p => p[0]);
  const lats = points.map(p => p[1]);

  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;

  // Add padding (approximate)
  const padding = 0.02; // ~2km padding roughly
  const lngDiff = (maxLng - minLng) * (1 + padding);
  const latDiff = (maxLat - minLat) * (1 + padding);

  const maxDiff = Math.max(lngDiff, latDiff);

  // More granular zoom levels
  let zoom = 10;
  if (maxDiff > 5) zoom = 6;
  else if (maxDiff > 2) zoom = 7;
  else if (maxDiff > 1) zoom = 8;
  else if (maxDiff > 0.5) zoom = 9;
  else if (maxDiff > 0.1) zoom = 10;
  else if (maxDiff > 0.05) zoom = 11;
  else if (maxDiff > 0.02) zoom = 12;
  else if (maxDiff > 0.01) zoom = 13;
  else zoom = 14;

  return {
    longitude: centerLng,
    latitude: centerLat,
    zoom
  };
};

const DynamicTrackMap: React.FC<IDynamicTrackMapProps> = ({
  date,
  className = '',
  isVisible = false
}) => {
  const mapRef = useRef<MapRef>();
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  const [geoData, setGeoData] = useState<FeatureCollection<LineString>>();
  const [animatedGeo, setAnimatedGeo] = useState<FeatureCollection<LineString>>();
  const [animating, setAnimating] = useState(false);
  const [viewState, setViewState] = useState<IViewState>({
    longitude: 116.3974,
    latitude: 39.9093,
    zoom: 10
  });

  // 初始化地图数据
  useEffect(() => {
    const data = getGeoDataForDate(date);
    setGeoData(data);

    if (data.features.length > 0) {
      const bounds = getBoundsForGeoData(data);
      setViewState(bounds);
    }
  }, [date]);



  // 动画逻辑 - 只在卡片可见时启动动画
  useEffect(() => {
    // 清理之前的动画
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (!geoData || geoData.features.length === 0) {
      setAnimating(false);
      setAnimatedGeo(geoData);
      return;
    }

    // 只对单条轨迹进行动画
    const isSingleRun = geoData.features.length === 1 &&
      geoData.features[0].geometry.coordinates.length > 1;

    if (!isSingleRun) {
      setAnimating(false);
      setAnimatedGeo(geoData);
      return;
    }

    if (!isVisible) {
      // 当卡片不可见时，显示完整轨迹但不动画
      setAnimating(false);
      setAnimatedGeo(geoData);
      return;
    }

    // 延迟启动动画，确保卡片翻转完成
    const startAnimation = () => {
      console.log(`Starting animation for date: ${date}`);
      setAnimating(true);
      setAnimatedGeo(undefined); // 重置为undefined，确保从头开始

      const points = geoData.features[0].geometry.coordinates.map(coord => [coord[0], coord[1]] as Coordinate);
      let current = 2;
      const step = Math.max(2, Math.floor(points.length / 120));

      function animate() {
        if (current >= points.length) {
          console.log(`Animation completed for date: ${date}`);
          setAnimating(false);
          setAnimatedGeo(geoData);
          return;
        }

        const animFeature: Feature<LineString> = {
          ...geoData.features[0],
          geometry: {
            ...geoData.features[0].geometry,
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
    };

    // 延迟600ms启动动画，等待翻转动画完成
    const timeoutId = setTimeout(startAnimation, 600);

    return () => {
      clearTimeout(timeoutId);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [geoData, isVisible]);

  const mapRefCallback = useCallback((ref: MapRef) => {
    if (ref !== null) {
      mapRef.current = ref;
    }
  }, []);

  // remove road labels
  const onMapLoad = useCallback((event: any) => {
    const map = event.target;
    // check if style is loaded
    if (!map.getStyle()) return;

    const layers = map.getStyle().layers;
    if (!layers) return;

    const labelLayerNames = layers
      .filter(
        (layer: any) =>
          (layer.type === 'symbol' || layer.type === 'composite') &&
          layer.layout &&
          layer.layout['text-field']
      )
      .map((layer: any) => layer.id);
    labelLayerNames.forEach((layerId: string) => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    });
  }, []);

  const onMove = useCallback(({ viewState }: { viewState: IViewState }) => {
    setViewState(viewState);
  }, []);

  // 如果没有轨迹数据，显示提示
  if (!geoData || geoData.features.length === 0) {
    return (
      <div className={`dynamic-track-map-container ${className}`}>
        <div className="no-track-message">
          <div className="no-track-text">该日期没有轨迹数据</div>
          <div className="no-track-date">{date}</div>
        </div>
      </div>
    );
  }

  const isSingleRun = geoData.features.length === 1;
  const dash = USE_DASH_LINE && !isSingleRun ? [2, 2] : [2, 0];

  return (
    <div ref={containerRef} className={`dynamic-track-map-container ${className}`}>
      <Map
        {...viewState}
        onMove={onMove}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        ref={mapRefCallback}
        mapboxAccessToken={MAPBOX_TOKEN}
        interactive={false} // 禁用交互，因为是在卡片中
        onLoad={onMapLoad}
      >
        {/* 背景轨迹层 - 在动画时显示浅色完整轨迹 */}
        {animating && geoData && geoData.features.length > 0 && (
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
        {(animatedGeo || geoData) && (
          <Source id="data" type="geojson" data={animatedGeo || geoData}>
            <Layer
              id="runs"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 3,
                'line-dasharray': dash,
                'line-opacity': isSingleRun ? 1 : LINE_OPACITY,
                'line-blur': 0.5,
              }}
              layout={{
                'line-join': 'round',
                'line-cap': 'round',
              }}
            />
          </Source>
        )}
      </Map>

      {/* 日期和标题标签 - 右下角 */}
      <div className="track-info-label" style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
        zIndex: 10,
        pointerEvents: 'none'
      }}>
        {geoData.features[0]?.properties?.name || date}
      </div>
    </div>
  );
};

export default DynamicTrackMap;
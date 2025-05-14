import MapboxLanguage from '@mapbox/mapbox-gl-language';
import React, {useRef, useCallback, useState, useEffect} from 'react';
import Map, {Layer, Source, FullscreenControl, NavigationControl, MapRef} from 'react-map-gl';
import {MapInstance} from "react-map-gl/src/types/lib";
import useActivities from '@/hooks/useActivities';
import {
  MAP_LAYER_LIST,
  IS_CHINESE,
  ROAD_LABEL_DISPLAY,
  MAPBOX_TOKEN,
  PROVINCE_FILL_COLOR,
  COUNTRY_FILL_COLOR,
  USE_DASH_LINE,
  LINE_OPACITY,
  MAP_HEIGHT,
  LIGHTS_ON,
} from '@/utils/const';
import { usePrivacyModeContext } from '@/context/PrivacyModeContext';
import { Coordinate, IViewState, geoJsonForMap } from '@/utils/utils';
import RunMarker from './RunMarker';
import RunMapButtons from './RunMapButtons';
import styles from './style.module.css';
import { FeatureCollection } from 'geojson';
import { RPGeometry } from '@/static/run_countries';
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
  geoData,
  thisYear,
}: IRunMapProps) => {
  const { countries, provinces } = useActivities();
  const mapRef = useRef<MapRef>();
  const [lights, setLights] = useState(false);
  const keepWhenLightsOff = ['runs2']
  function switchLayerVisibility(map: MapInstance) {
    const styleJson = map.getStyle();
    const essentialLayers = ['runs2', 'province', 'countries', 'background', 'water'];
    
    styleJson.layers.forEach((it: { id: string; }) => {
      const visibility = essentialLayers.includes(it.id) ? 'visible' : 'none';
      try {
        map.setLayoutProperty(it.id, 'visibility', visibility);
      } catch (e) {
        // 忽略错误，有些图层可能没有visibility属性
      }
    });
  }
  const mapRefCallback = useCallback(
    (ref: MapRef) => {
      if (ref !== null) {
        const map = ref.getMap();
        if (map && IS_CHINESE) {
            map.addControl(new MapboxLanguage({defaultLanguage: 'zh-Hans'}));
        }
        // all style resources have been downloaded
        // and the first visually complete rendering of the base style has occurred.
        map.on('style.load', () => {
          // 在非隐私模式下且不显示道路标签时，移除道路图层
          if (!isPrivacyMode && !ROAD_LABEL_DISPLAY) {
            MAP_LAYER_LIST.forEach((layerId) => {
              if (map.getLayer(layerId)) {
                map.removeLayer(layerId);
              }
            });
          }

          // 确保地图引用被设置
          mapRef.current = ref;

          // 在隐私模式下，确保我们的自定义图层可见
          if (isPrivacyMode) {
            // 等待下一个事件循环，确保所有图层都已加载
            setTimeout(() => {
              ['runs2', 'province', 'countries'].forEach(layerId => {
                if (map.getLayer(layerId)) {
                  map.setLayoutProperty(layerId, 'visibility', 'visible');
                }
              });
            }, 100);
          }

          // 应用图层可见性
          switchLayerVisibility(map);
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
  // for geojson format
  filterProvinces.unshift('in', 'name');
  filterCountries.unshift('in', 'name');

  const initGeoDataLength = geoData.features.length;
  const isBigMap = (viewState.zoom ?? 0) <= 3;
  if (isBigMap && IS_CHINESE) {
    // Show boundary and line together, combine geoData(only when not combine yet)
    if(geoData.features.length === initGeoDataLength){
      geoData = {
          "type": "FeatureCollection",
          "features": geoData.features.concat(geoJsonForMap().features)
      };
    }
  }

  const isSingleRun =
    geoData.features.length === 1 &&
    geoData.features[0].geometry.coordinates.length;
  let startLon = 0;
  let startLat = 0;
  let endLon = 0;
  let endLat = 0;
  if (isSingleRun) {
    const points = geoData.features[0].geometry.coordinates as Coordinate[];
    [startLon, startLat] = points[0];
    [endLon, endLat] = points[points.length - 1];
  }
  let dash = USE_DASH_LINE && !isSingleRun && !isBigMap ? [2, 2] : [2, 0];
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

  return (
    <Map
      {...viewState}
      onMove={onMove}
      style={style}
      mapStyle={{
        version: 8,
        glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}",
        sources: {
          'composite': {
            type: 'vector',
            url: 'mapbox://mapbox.mapbox-streets-v8'
          }
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#111111'
            }
          },
          {
            id: 'water',
            type: 'fill',
            source: 'composite',
            'source-layer': 'water',
            paint: {
              'fill-color': '#000000'
            }
          }
        ]
      }}
      ref={mapRefCallback}
      mapboxAccessToken={MAPBOX_TOKEN}
    >
      <RunMapButtons changeYear={changeYear} thisYear={thisYear} />
      <Source id="data" type="geojson" data={geoData}>
        <Layer
          id="province"
          type="fill"
          paint={{
            'fill-color': PROVINCE_FILL_COLOR,
            'fill-opacity': 0.2,
          }}
          filter={filterProvinces}
        />
        <Layer
          id="countries"
          type="fill"
          paint={{
            'fill-color': COUNTRY_FILL_COLOR,
            // in China, fill a bit lighter while already filled provinces
            'fill-opacity': ["case", ["==", ["get", "name"], '中国'], 0.1, 0.5],
          }}
          filter={filterCountries}
        />
        <Layer
          id="runs2"
          type="line"
          paint={{
            'line-color': ['get', 'color'],
            'line-width': isBigMap && lights ? 1 : 2,
            'line-dasharray': dash,
            'line-opacity': isSingleRun || isBigMap || !lights ? 1 : LINE_OPACITY,
            'line-blur': 1,
          }}
          layout={{
            'line-join': 'round',
            'line-cap': 'round',
          }}
        />
      </Source>
      {isSingleRun && (
        <RunMarker
          startLat={startLat}
          startLon={startLon}
          endLat={endLat}
          endLon={endLon}
        />
      )}
      <span className={styles.runTitle}>{title}</span>
      <FullscreenControl style={fullscreenButton}/>
              {!isPrivacyMode && <LightsControl setLights={setLights} lights={lights}/>}
      <NavigationControl showCompass={false} position={'bottom-right'} style={{opacity: 0.3}}/>
    </Map>
  );
};

export default RunMap;
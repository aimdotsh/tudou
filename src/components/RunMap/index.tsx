import MapboxLanguage from '@mapbox/mapbox-gl-language';
import React, {useRef, useCallback, useState, useEffect} from 'react';
import Map, {Layer, Source, FullscreenControl, NavigationControl, MapRef} from 'react-map-gl';
import mapboxgl from 'mapbox-gl';
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
  MOBILE_MAP_HEIGHT,
  LIGHTS_ON,
  TYPES_MAPPING,
} from '@/utils/const';
import { usePrivacyModeContext } from '@/context/PrivacyModeContext';
import { Coordinate, IViewState, geoJsonForMap, getOffset } from '@/utils/utils';
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
  const { isPrivacyMode } = usePrivacyModeContext();
  // 在亮色地图上，默认开启lights
  const [lights, setLights] = useState(true);
  // 响应式地图高度
  const [isMobile, setIsMobile] = useState(false);

  // 监听隐私模式变化
  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      // 确保在隐私模式切换时正确更新图层可见性
      setTimeout(() => {
        switchLayerVisibility(map, lights);
      }, 100);
    }
  }, [isPrivacyMode, lights]);
  const keepWhenLightsOff = ['runs2']
  function switchLayerVisibility(map: MapInstance, lights: boolean) {
    const styleJson = map.getStyle();
    
    // 如果在隐私模式下，确保只显示必要的图层
    if (isPrivacyMode) {
      styleJson.layers.forEach((it: { id: string; }) => {
        // 显示我们自己的图层和基础图层
        const essentialLayers = ['runs2', 'province', 'countries', 'background', 'water'];
        const visibility = essentialLayers.includes(it.id) ? 'visible' : 'none';
        try {
          map.setLayoutProperty(it.id, 'visibility', visibility);
        } catch (e) {
          // 忽略错误，有些图层可能没有visibility属性
        }
      });
    } else {
      // 非隐私模式下的原有逻辑
      styleJson.layers.forEach((it: { id: string; }) => {
        if (!keepWhenLightsOff.includes(it.id)) {
          try {
            map.setLayoutProperty(it.id, 'visibility', lights ? 'visible' : 'none');
          } catch (e) {
            // 忽略错误，有些图层可能没有visibility属性
          }
        }
      });
    }
  }
  const mapRefCallback = useCallback(
    (ref: MapRef) => {
      if (ref !== null) {
        const map = ref.getMap();
        if (map && IS_CHINESE) {
            map.addControl(new MapboxLanguage({defaultLanguage: 'zh-Hans'}));
        }
        
        // 添加错误处理
        map.on('error', (e) => {
          console.error('Mapbox error:', e.error);
        });
        // all style resources have been downloaded
        // and the first visually complete rendering of the base style has occurred.
        // 确保样式已加载
          const checkStyleLoaded = () => {
            if (!map.isStyleLoaded()) {
              setTimeout(checkStyleLoaded, 100);
              return;
            }
            map.on('style.load', () => {
            });
          };
          checkStyleLoaded();
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
  let allPoints: Coordinate[] = [];
  if (isSingleRun) {
    allPoints = geoData.features[0].geometry.coordinates as Coordinate[];
    [startLon, startLat] = allPoints[0];
    [endLon, endLat] = allPoints[allPoints.length - 1];
  }

  // 为单个轨迹使用实线，便于动画效果
  let dash = USE_DASH_LINE && !isSingleRun && !isBigMap ? [2, 2] : [2, 0];
  // 动画相关状态
  const [animating, setAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const [animatedGeoData, setAnimatedGeoData] = useState<FeatureCollection<RPGeometry>>(geoData);

  // 处理地图移动
  const onMove = React.useCallback(({ viewState }: { viewState: IViewState }) => {
    setViewState(viewState);
  }, []);
  // 恢复直接设置高度，确保地图正确显示
  const style: React.CSSProperties = {
    width: '100%',
    height: isMobile ? MOBILE_MAP_HEIGHT : MAP_HEIGHT,
  };
  const fullscreenButton: React.CSSProperties = {
    position: 'absolute',
    marginTop: '7px',
    right: '0px',
    opacity: 0.3,
  };

  // 处理全屏变化和响应式布局
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (mapRef.current) {
        mapRef.current.getMap().resize();
      }
    };
    
    // 检测设备类型
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // 初始检测
    checkMobile();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkMobile);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 处理轨迹动画
  useEffect(() => {
    // 当选中单个轨迹时，准备动画数据
    if (isSingleRun && allPoints.length > 1) {
      try {
        // 重置动画状态
        setAnimating(true);
        setAnimationProgress(0);
        
        // 清除之前的动画
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        
        // 创建初始动画数据（包含完整轨迹作为轮廓和起点）
        const initialGeoData = {
          type: 'FeatureCollection',
          features: [
            // 先添加完整轨迹作为轮廓
            {
              ...geoData.features[0],
              properties: {
                ...geoData.features[0].properties,
                isOutline: true
              }
            },
            // 再添加动画轨迹（初始只有起点）
            {
              ...geoData.features[0],
              geometry: {
                ...geoData.features[0].geometry,
                coordinates: [allPoints[0]]
              },
              properties: {
                ...geoData.features[0].properties,
                isAnimating: true
              }
            }
          ]
        } as FeatureCollection<RPGeometry>;
        
        setAnimatedGeoData(initialGeoData);
        
        // 为移动设备优化动画
        const isLowPerfDevice = isMobile || window.navigator.userAgent.includes('Mobile');
        const animationDuration = isLowPerfDevice ? 3000 : 2000; // 移动设备上延长动画时间
        const frameInterval = isLowPerfDevice ? 50 : 16; // 移动设备上降低帧率
        
        // 使用setTimeout替代requestAnimationFrame在低性能设备上
        const runAnimation = () => {
          let progress = 0;
          let lastUpdate = Date.now();
          
          const updateFrame = () => {
            const now = Date.now();
            const elapsed = now - lastUpdate;
            
            // 只有经过足够的时间才更新帧
            if (elapsed >= frameInterval) {
              lastUpdate = now;
              progress += elapsed / animationDuration;
              progress = Math.min(progress, 1);
              
              setAnimationProgress(progress);
              
              // 计算当前应该显示的点数
              const pointsToShow = Math.max(2, Math.floor(progress * allPoints.length));
              
              try {
                // 更新动画数据
                const updatedGeoData = {
                  type: 'FeatureCollection',
                  features: [
                    // 保留轮廓
                    {
                      ...geoData.features[0],
                      properties: {
                        ...geoData.features[0].properties,
                        isOutline: true
                      }
                    },
                    // 更新动画轨迹
                    {
                      ...geoData.features[0],
                      geometry: {
                        ...geoData.features[0].geometry,
                        coordinates: allPoints.slice(0, pointsToShow)
                      },
                      properties: {
                        ...geoData.features[0].properties,
                        isAnimating: true
                      }
                    }
                  ]
                } as FeatureCollection<RPGeometry>;
                
                setAnimatedGeoData(updatedGeoData);
              } catch (error) {
                console.error('Error updating animation data:', error);
              }
              
              // 继续动画或结束
              if (progress < 1) {
                animationRef.current = requestAnimationFrame(updateFrame);
              } else {
                setAnimating(false);
                animationRef.current = null;
              }
            } else {
              // 如果时间间隔不够，继续等待
              animationRef.current = requestAnimationFrame(updateFrame);
            }
          };
          
          // 延迟一小段时间后开始动画，让用户先看到完整轨迹
          setTimeout(() => {
            animationRef.current = requestAnimationFrame(updateFrame);
          }, 500);
        };
        
        runAnimation();
      } catch (error) {
        console.error('Error in animation setup:', error);
        // 出错时回退到显示完整轨迹
        setAnimatedGeoData(geoData);
        setAnimating(false);
      }
      
      // 清理函数
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      };
    } else {
      // 非单个轨迹，使用原始数据
      setAnimatedGeoData(geoData);
      setAnimating(false);
    }
  }, [geoData, isSingleRun, allPoints, isMobile]);

  return (
    <Map
      {...viewState}
      onMove={onMove}
      style={style}
      mapStyle={isPrivacyMode ? 
        {
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
                'background-color': '#FAF9F5' // 改为亮色背景，与导航色彩一致
              }
            },
            {
              id: 'water',
              type: 'fill',
              source: 'composite',
              'source-layer': 'water',
              paint: {
                'fill-color': '#FAF9F5' // 水域改为导航色，原来为：E6F2F9浅蓝色
              }
            }
          ]
        } : 
        "mapbox://styles/mapbox/light-v10" // 改为亮色地图样式
      }
      ref={mapRefCallback}
      mapboxAccessToken={MAPBOX_TOKEN}
    >
      <RunMapButtons changeYear={changeYear} thisYear={thisYear} />
      <Source id="data" type="geojson" data={animating ? animatedGeoData : geoData}>
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
            // 根据属性决定线条样式
            'line-color': ['get', 'color'],
            'line-width': [
              'case',
              ['has', 'isOutline'], 1.5, // 轮廓线更细
              ['has', 'isAnimating'], isBigMap ? 1.5 : 3, // 动画线更粗
              isBigMap ? 1 : 2.5 // 默认线宽
            ],
            'line-dasharray': dash,
            'line-opacity': [
              'case',
              ['has', 'isOutline'], 0.3, // 轮廓线更透明
              0.8 // 默认不透明度
            ],
            'line-blur': [
              'case',
              ['has', 'isOutline'], 0.8, // 轮廓线更模糊
              0.5 // 默认模糊度
            ],
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
      <span className={styles.runTitle}>
        {title}
        {animating && (
          <span className={styles.animationProgress}> 
            {Math.round(animationProgress * 100)}%
          </span>
        )}
      </span>
      <FullscreenControl style={fullscreenButton}/>
              {!isPrivacyMode && <LightsControl setLights={setLights} lights={lights}/>}
      <NavigationControl showCompass={false} position={'bottom-right'} style={{opacity: 0.3}}/>
    </Map>
  );
};

export default RunMap;
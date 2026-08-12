import mapboxgl from 'mapbox-gl'

/**
 * 隐私地图样式过滤：隐藏所有街道、道路、城市标牌、POI 标注，
 * 仅保留水体/河流轮廓 (Water/Waterway)、陆地区域 (Land) 以及轨迹线条。
 */
export function applyPrivacyMapStyle(map: mapboxgl.Map) {
  if (!map) return
  const style = map.getStyle()
  if (!style || !style.layers) return

  // 精确无误杀隐化：隐藏所有的文本标注 (type === 'symbol')，消灭 Hupocun 等村名、路名与 POI 标牌
  style.layers.forEach((layer) => {
    const id = layer.id.toLowerCase()
    const type = layer.type

    // 1. 保护自定义轨迹图层
    if (id === 'routes' || id === 'selected' || id === 'all-routes') {
      return
    }

    // 2. 隐藏所有的文本/地名/标牌图层 (type === 'symbol')
    if (type === 'symbol') {
      try {
        map.setLayoutProperty(layer.id, 'visibility', 'none')
      } catch {
        /* ignore read-only layer error */
      }
    }
  })
}

/**
 * 稳健地缩放并定位地图 Bounds 视野，防止边界异常导致画面空白
 */
export function safeFitBounds(
  map: mapboxgl.Map,
  coords: [number, number][],
  padding = 40,
  maxZoom = 13
) {
  if (!map || !coords || coords.length === 0) return

  // 过滤无效或非数字坐标
  const validCoords = coords.filter(
    (c) => Array.isArray(c) && c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number' && !isNaN(c[0]) && !isNaN(c[1])
  )

  if (validCoords.length === 0) return

  if (validCoords.length === 1) {
    try { map.flyTo({ center: validCoords[0], zoom: Math.min(maxZoom, 13) }) } catch { /* ignore */ }
    return
  }

  const lngs = validCoords.map((c) => c[0]).sort((a, b) => a - b)
  const lats = validCoords.map((c) => c[1]).sort((a, b) => a - b)

  // 剔除两端 2% 的离群极值点
  const trimCount = Math.floor(validCoords.length * 0.02)
  const minLng = lngs[trimCount] ?? lngs[0]
  const maxLng = lngs[lngs.length - 1 - trimCount] ?? lngs[lngs.length - 1]
  const minLat = lats[trimCount] ?? lats[0]
  const maxLat = lats[lats.length - 1 - trimCount] ?? lats[lats.length - 1]

  // 防崩溃核心：如果极值点完全重合或差值趋近于0，绝对不能 fitBounds，防止视口坍缩导致空白！
  if (Math.abs(maxLng - minLng) < 0.0001 && Math.abs(maxLat - minLat) < 0.0001) {
    try {
      map.flyTo({ center: [minLng, minLat], zoom: Math.min(maxZoom, 13) })
    } catch { /* ignore */ }
    return
  }

  try {
    const bounds = new mapboxgl.LngLatBounds([minLng, minLat], [maxLng, maxLat])
    map.fitBounds(bounds, { padding, maxZoom, animate: false })
  } catch (e) {
    console.warn('fitBounds error:', e)
    try { map.flyTo({ center: [validCoords[0][0], validCoords[0][1]], zoom: 10 }) } catch { /* ignore */ }
  }
}

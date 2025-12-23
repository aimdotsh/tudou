import React, { useState } from 'react';
import polyline from '@mapbox/polyline';
import Layout from '@/components/Layout';

const GPXToPolyline = () => {
  const [polylineResult, setPolylineResult] = useState('');
  const [error, setError] = useState('');

  const parseGPX = (text: string) => {
    try {
      if (!text.trim()) {
        setPolylineResult('');
        setError('');
        return;
      }
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      
      // 检查解析错误
      const parserError = xmlDoc.getElementsByTagName('parsererror');
      if (parserError.length > 0) {
        throw new Error('无效的 XML 内容');
      }

      const trkpts = xmlDoc.getElementsByTagName('trkpt');
      
      if (trkpts.length === 0) {
        throw new Error('GPX 文件中未找到坐标点 (trkpt)');
      }

      const points: [number, number][] = [];
      for (let i = 0; i < trkpts.length; i++) {
        const lat = parseFloat(trkpts[i].getAttribute('lat') || '0');
        const lon = parseFloat(trkpts[i].getAttribute('lon') || '0');
        if (!isNaN(lat) && !isNaN(lon)) {
          points.push([lat, lon]);
        }
      }

      if (points.length === 0) {
        throw new Error('未提取到有效的坐标点');
      }

      const encoded = polyline.encode(points);
      setPolylineResult(encoded);
      setError('');
    } catch (err: any) {
      setError(`转换失败: ${err.message}`);
      setPolylineResult('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseGPX(content);
    };
    reader.readAsText(file);
  };

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    parseGPX(e.target.value);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(polylineResult);
    // 使用更温和的反馈方式
    const btn = document.getElementById('copy-btn');
    if (btn) {
      const originalText = btn.innerText;
      btn.innerText = '已复制!';
      setTimeout(() => {
        btn.innerText = originalText;
      }, 2000);
    }
  };

  return (
    <Layout>
      <div className="w-full py-12 px-4 sm:px-6 lg:w-3/4">
        <h1 className="text-5xl font-extrabold italic mb-12">GPX to Polyline</h1>
        
        <div className="max-w-3xl">
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#20B2AA' }}>上传文件</h2>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                  </svg>
                  <p className="mb-2 text-sm text-gray-500 text-center"><span className="font-semibold">点击上传</span> 或拖拽 GPX 文件至此</p>
                  <p className="text-xs text-gray-400">仅支持 .gpx 格式</p>
                </div>
                <input type="file" className="hidden" accept=".gpx" onChange={handleFileUpload} />
              </label>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#20B2AA' }}>粘贴内容</h2>
            <textarea
              className="w-full h-40 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm font-mono transition shadow-sm"
              placeholder="在这里粘贴 GPX XML 数据..."
              onChange={handlePaste}
            />
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 italic">
              {error}
            </div>
          )}

          {polylineResult && (
            <div className="mt-12 p-6 bg-white rounded-xl shadow-lg border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold" style={{ color: '#20B2AA' }}>转换结果</h2>
                <button
                  id="copy-btn"
                  onClick={copyToClipboard}
                  className="px-6 py-2 bg-red-600 text-white text-xs sm:text-sm font-bold rounded-full hover:bg-black transition-all transform hover:scale-105 whitespace-nowrap"
                >
                  复制代码
                </button>
              </div>
              <div className="relative group">
                <textarea
                  readOnly
                  className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono break-all resize-none shadow-inner"
                  value={polylineResult}
                />
              </div>
              <p className="mt-4 text-xs text-gray-400 italic">提示：Polyline 编码适用于 Google Maps, Mapbox 等地图服务。</p>
            </div>
          )}
        </div>

        <div className="mt-20 max-w-2xl text-sm text-gray-400 leading-relaxed italic">
          <p>
            关于此工具：GPX (GPS Exchange Format) 是一种常用的轨迹数据格式。
            此转换器可以快速从 GPX 中提取路径点并使用谷歌开发的 Polyline 算法进行压缩。
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default GPXToPolyline;

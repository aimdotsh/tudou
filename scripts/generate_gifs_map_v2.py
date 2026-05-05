#!/usr/bin/env python3
import json
import os
import sys
import argparse
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import polyline
import math
import base64
import io
import re
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

try:
    import imageio
except ImportError:
    print("❌ 需要安装 imageio 库: pip install imageio")
    sys.exit(1)

class MapGifGenerator:
    def __init__(self, project_root=None, width=300, height=390, track_color='#21B2AA', 
                 animation_frames=100, static_frames=30, force=False):
        if project_root is None:
            self.project_root = Path(__file__).parent.parent
        else:
            self.project_root = Path(project_root)
        
        self.activities_file = self.project_root / "src" / "static" / "activities.json"
        self.output_dir = self.project_root / "public" / "assets" / "gif"
        self.tile_cache = self.project_root / "scripts" / "tile_cache"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.tile_cache.mkdir(exist_ok=True)
        
        self.target_width, self.target_height = width, height
        self.draw_width, self.draw_height = width * 2, height * 2 # 2x 采样绘图
        self.track_color = track_color
        self.animation_frames = animation_frames
        self.static_frames = static_frames
        self.force = force
        
        self.offset_lat, self.offset_lng = self.get_offset_config()
        self.f_bold, self.f_reg = self.load_fonts()

    def get_offset_config(self):
        lat_offset = float(os.environ.get("VITE_LAT_OFFSET", 0.0))
        lng_offset = float(os.environ.get("VITE_LNG_OFFSET", 0.0))
        return lat_offset, lng_offset

    def load_fonts(self):
        font_paths = [
            "/System/Library/Fonts/PingFang.ttc",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
            "/System/Library/Fonts/STHeiti Light.ttc",
            "C:/Windows/Fonts/msyh.ttc"
        ]
        for p in font_paths:
            if os.path.exists(p):
                return p, p
        return None, None

    def download_tile(self, x, y, z):
        style = "voyager_nolabels"
        cache_path = self.tile_cache / f"{style}_{z}_{x}_{y}.png"
        if cache_path.exists():
            return Image.open(cache_path).convert("RGBA")
        url = f"https://basemaps.cartocdn.com/rastertiles/{style}/{z}/{x}/{y}.png"
        headers = {'User-Agent': 'Mozilla/5.0'}
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as res:
                data = res.read()
                cache_path.write_bytes(data)
                return Image.open(io.BytesIO(data)).convert("RGBA")
        except:
            return Image.new('RGBA', (256, 256), (241, 238, 232, 255))

    def latlng_to_pixel(self, lat, lon, zoom):
        x = ((lon + 180) / 360) * (2**zoom) * 256
        y = (1 - math.log(math.tan(math.radians(lat)) + 1/math.cos(math.radians(lat))) / math.pi) / 2 * (2**zoom) * 256
        return x, y

    def get_map_background(self, coordinates):
        lats, lons = [c[0] for c in coordinates], [c[1] for c in coordinates]
        min_lat, max_lat, min_lon, max_lon = min(lats), max(lats), min(lons), max(lons)
        
        for zoom in range(18, 5, -1):
            px1, py1 = self.latlng_to_pixel(max_lat, min_lon, zoom)
            px2, py2 = self.latlng_to_pixel(min_lat, max_lon, zoom)
            if abs(px2 - px1) > 1000 or abs(py2 - py1) > 1200: continue
            break
        
        c_lat, c_lon = (min_lat + max_lat) / 2, (min_lon + max_lon) / 2
        cx, cy = self.latlng_to_pixel(c_lat, c_lon, zoom)
        
        px_coords = [self.latlng_to_pixel(lat, lon, zoom) for lat, lon in coordinates]
        xs, ys = [p[0] for p in px_coords], [p[1] for p in px_coords]
        track_w, track_h = max(xs) - min(xs), max(ys) - min(ys)
        
        if track_w / track_h > (self.draw_width / self.draw_height):
            view_w = track_w / 0.85
            view_h = view_w * (self.draw_height / self.draw_width)
        else:
            view_h = track_h / 0.85
            view_w = view_h * (self.draw_width / self.draw_height)
        
        left, top = cx - view_w / 2, cy - view_h / 2
        tx_s, tx_e = int(left // 256), int((left + view_w) // 256)
        ty_s, ty_e = int(top // 256), int((top + view_h) // 256)
        
        full = Image.new('RGBA', ((tx_e-tx_s+1)*256, (ty_e-ty_s+1)*256))
        for tx in range(tx_s, tx_e + 1):
            for ty in range(ty_s, ty_e + 1):
                full.paste(self.download_tile(tx, ty, zoom), ((tx-tx_s)*256, (ty-ty_s)*256))
        
        l_img, t_img = int(left - tx_s*256), int(top - ty_s*256)
        bg = full.crop((l_img, t_img, l_img + int(view_w), t_img + int(view_h)))
        bg = bg.resize((self.draw_width, self.draw_height), Image.Resampling.LANCZOS)
        
        return bg, lambda lat, lon: (
            (self.latlng_to_pixel(lat, lon, zoom)[0] - left) * (self.draw_width / view_w),
            (self.latlng_to_pixel(lat, lon, zoom)[1] - top) * (self.draw_height / view_h)
        )

    def interpolate(self, coords, n):
        if len(coords) < 2: return coords
        c = np.array(coords)
        dists = np.concatenate(([0], np.cumsum(np.sqrt(((np.diff(c, axis=0))**2).sum(axis=1)))))
        new_dists = np.linspace(0, dists[-1], n)
        return list(zip(np.interp(new_dists, dists, c[:, 0]), np.interp(new_dists, dists, c[:, 1])))

    def draw_frame(self, bg, smooth, index, activity, fonts):
        frame = bg.copy()
        draw = ImageDraw.Draw(frame)
        main_color = (33, 178, 170) # #21B2AA
        
        # 1. 轨迹线
        if index > 0:
            draw.line(smooth[:index+1], fill=main_color, width=6)
        
        # 2. 小人圆点
        curr = smooth[index]
        draw.ellipse([curr[0]-8, curr[1]-8, curr[0]+8, curr[1]+8], fill=main_color, outline=(255,255,255), width=2)
        
        # 3. 文字装饰
        if fonts[0]:
            f_l = ImageFont.truetype(fonts[0], 52)
            f_s = ImageFont.truetype(fonts[1], 32)
            date_str = activity['start_date_local'][:10]
            dist_str = f"{activity['distance']/1000:.2f} km"
            
            # 文字阴影
            draw.text((23, 23), date_str, font=f_l, fill=(0,0,0,100))
            draw.text((20, 20), date_str, font=f_l, fill=main_color)
            draw.text((23, 83), dist_str, font=f_s, fill=(0,0,0,100))
            draw.text((20, 80), dist_str, font=f_s, fill=main_color)
            
        return frame.resize((self.target_width, self.target_height), Image.Resampling.LANCZOS)

    def generate(self, date, activity=None):
        out_path = self.output_dir / f"track_{date}.gif"
        if out_path.exists() and not self.force: return True
            
        if not activity:
            data = json.load(open(self.activities_file))
            activity = next((a for a in data if a['start_date_local'].startswith(date) and a.get('summary_polyline')), None)
            
        if not activity: return False
        
        # 反向偏移，找回真实位置
        raw = [[p[0] - self.offset_lat, p[1] - self.offset_lng] for p in polyline.decode(activity['summary_polyline'])]
        bg, map_fn = self.get_map_background(raw)
        pixel_coords = [map_fn(lat, lon) for lat, lon in raw]
        
        # 高密度插值，确保丝滑
        smooth = self.interpolate(pixel_coords, self.animation_frames)
        
        frames = []
        fonts = (self.f_bold, self.f_reg)
        for i in range(len(smooth)):
            frames.append(np.array(self.draw_frame(bg, smooth, i, activity, fonts)))
        
        # 加上尾部停留
        last_frame = frames[-1]
        for _ in range(self.static_frames):
            frames.append(last_frame)
            
        imageio.mimsave(str(out_path), frames, fps=28, loop=0)
        print(f"✅ Generated: {date}")
        return True

    def generate_all(self, min_distance=0):
        data = json.load(open(self.activities_file))
        tasks = [(a['start_date_local'][:10], a) for a in data if a.get('summary_polyline') and a.get('distance', 0) >= min_distance]
        tasks.sort(key=lambda x: x[0], reverse=True)
        with ThreadPoolExecutor(max_workers=4) as executor:
            list(executor.map(lambda x: self.generate(*x), tasks))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-day", type=str)
    parser.add_argument("-all", action="store_true")
    parser.add_argument("-force", action="store_true")
    parser.add_argument("-min-dist", type=float, default=21000)
    args = parser.parse_args()
    
    gen = MapGifGenerator(width=300, height=390, force=args.force)
    if args.day: gen.generate(args.day)
    elif args.all: gen.generate_all(min_distance=args.min_dist)

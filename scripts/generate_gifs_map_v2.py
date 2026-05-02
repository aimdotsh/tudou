#!/usr/bin/env python3
import json
import os
import sys
import argparse
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageColor
import polyline
import math
import base64
import io
import re
import urllib.request
from collections import defaultdict

try:
    import imageio
except ImportError:
    print("❌ 需要安装 imageio 库: pip install imageio")
    sys.exit(1)

class MapGifGenerator:
    def __init__(self, project_root=None, width=500, height=500, track_color='#FF5722', 
                 animation_frames=80, static_frames=20):
        if project_root is None:
            self.project_root = Path(__file__).parent.parent
        else:
            self.project_root = Path(project_root)
        
        self.activities_file = self.project_root / "src" / "static" / "activities.json"
        self.output_dir = self.project_root / "assets" / "gif"
        self.tile_cache = self.project_root / "scripts" / "tile_cache"
        self.tile_cache.mkdir(exist_ok=True)
        
        # 内部使用 2x 绘图，最后缩小实现抗锯齿
        self.target_width = width
        self.target_height = height
        self.draw_width = width * 2
        self.draw_height = height * 2
        
        self.track_color = track_color
        self.animation_frames = animation_frames
        self.static_frames = static_frames
        
        # 2x 比例下的参数
        self.line_width = 2  # 在 2x 下设为 2，缩小后相当于 1px
        
        self.offset_lat, self.offset_lng = self.get_offset_config()
        self.start_icon = self.load_svg_icon("start.svg")
        self.end_icon = self.load_svg_icon("end.svg")

    def get_offset_config(self):
        dist, bearing = 0.0, 114.45
        try:
            meta_path = self.project_root / "src" / "static" / "site-metadata.ts"
            content = meta_path.read_text()
            d_m = re.search(r'distance:\s*([0-9.]+)', content)
            b_m = re.search(r'bearing:\s*([0-9.]+)', content)
            if d_m: dist = float(d_m.group(1))
            if b_m: bearing = float(b_m.group(1))
        except: pass
        rad = math.radians(bearing)
        return (dist * math.cos(rad)) / 111.0, (dist * math.sin(rad)) / 89.0

    def load_svg_icon(self, filename):
        svg_path = self.project_root / "assets" / filename
        try:
            content = svg_path.read_text()
            match = re.search(r'data:image/png;base64,([^"]+)', content)
            if match:
                data = base64.b64decode(match.group(1))
                return Image.open(io.BytesIO(data)).convert("RGBA")
        except: pass
        return None

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
            x1, y1 = self.latlng_to_pixel(max_lat, min_lon, zoom)
            x2, y2 = self.latlng_to_pixel(min_lat, max_lon, zoom)
            if abs(x2 - x1) < self.draw_width * 0.7 and abs(y2 - y1) < self.draw_height * 0.7:
                break
        cx, cy = self.latlng_to_pixel((min_lat+max_lat)/2, (min_lon+max_lon)/2, zoom)
        tx_s, tx_e = int((cx - self.draw_width/2)//256), int((cx + self.draw_width/2)//256)
        ty_s, ty_e = int((cy - self.draw_height/2)//256), int((cy + self.draw_height/2)//256)
        full = Image.new('RGBA', ((tx_e-tx_s+1)*256, (ty_e-ty_s+1)*256))
        for tx in range(tx_s, tx_e + 1):
            for ty in range(ty_s, ty_e + 1):
                full.paste(self.download_tile(tx, ty, zoom), ((tx-tx_s)*256, (ty-ty_s)*256))
        l, t = int(cx - tx_s*256 - self.draw_width/2), int(cy - ty_s*256 - self.draw_height/2)
        bg = full.crop((l, t, l+self.draw_width, t+self.draw_height))
        return bg, lambda lat, lon: (self.latlng_to_pixel(lat, lon, zoom)[0] - (cx - self.draw_width/2), 
                                     self.latlng_to_pixel(lat, lon, zoom)[1] - (cy - self.draw_height/2))

    def interpolate(self, coords, n):
        if len(coords) < 2: return coords
        c = np.array(coords)
        dists = np.concatenate(([0], np.cumsum(np.sqrt(((np.diff(c, axis=0))**2).sum(axis=1)))))
        new_dists = np.linspace(0, dists[-1], n)
        return list(zip(np.interp(new_dists, dists, c[:, 0]), np.interp(new_dists, dists, c[:, 1])))

    def draw_beautiful_line(self, draw, points):
        if len(points) < 2: return
        pts = [(p[0], p[1]) for p in points]
        rgb = ImageColor.getrgb(self.track_color)
        # 1. 极淡发光 (在 2x 模式下)
        draw.line(pts, fill=(*rgb, 25), width=int(self.line_width * 3), joint='round')
        # 2. 中等发光
        draw.line(pts, fill=(*rgb, 60), width=int(self.line_width * 2), joint='round')
        # 3. 核心线
        draw.line(pts, fill=self.track_color, width=int(self.line_width), joint='round')

    def generate(self, date):
        print(f"🎬 正在生成 {date} 的超清抗锯齿 GIF...")
        data = json.load(open(self.activities_file))
        act = next((a for a in data if a['start_date_local'].startswith(date) and a.get('summary_polyline')), None)
        if not act: return
        
        raw = [[p[0] + self.offset_lat, p[1] + self.offset_lng] for p in polyline.decode(act['summary_polyline'])]
        bg, map_fn = self.get_map_background(raw)
        pixel_coords = [map_fn(lat, lon) for lat, lon in raw]
        smooth = self.interpolate(pixel_coords, self.animation_frames * 4)
        
        # 准备字体 (明确指定中文字体，增大字号以适应 2x 画布)
        try:
            f_bold = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 44)
            f_reg = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 36)
        except:
            try:
                f_bold = ImageFont.truetype("/Library/Fonts/Arial Unicode.ttf", 44)
                f_reg = ImageFont.truetype("/Library/Fonts/Arial Unicode.ttf", 36)
            except:
                f_bold = f_reg = ImageFont.load_default()

        frames = []
        for i in range(self.animation_frames):
            frame = bg.copy()
            draw = ImageDraw.Draw(frame, 'RGBA')
            pts = smooth[:int(len(smooth) * (i+1)/self.animation_frames)]
            self.draw_beautiful_line(draw, pts)
            
            # 文本渲染 (2x 位置)
            draw.text((50, 50), date, fill=(40, 40, 40, 220), font=f_bold)
            name = act.get('name') or "Run"
            draw.text((self.draw_width - 50, self.draw_height - 60), name, fill=(60, 60, 60, 200), font=f_reg, anchor="rb")

            if pts:
                cx, cy = pts[-1]
                draw.ellipse([cx-6, cy-6, cx+6, cy+6], fill='white', outline=self.track_color, width=2)
            
            # 缩小到 1x，应用高质量滤镜 (抗锯齿核心)
            frame_final = frame.resize((self.target_width, self.target_height), Image.Resampling.LANCZOS)
            frames.append(frame_final)
        
        # 结尾静止帧
        final = bg.copy()
        draw = ImageDraw.Draw(final, 'RGBA')
        self.draw_beautiful_line(draw, smooth)
        draw.text((50, 50), date, fill=(40, 40, 40, 220), font=f_bold)
        draw.text((self.draw_width - 50, self.draw_height - 60), act.get('name') or "Run", fill=(60, 60, 60, 200), font=f_reg, anchor="rb")

        if self.start_icon:
            final.paste(i2:=self.start_icon.resize((52,52)), (int(smooth[0][0]-26), int(smooth[0][1]-26)), i2)
        if self.end_icon:
            final.paste(i3:=self.end_icon.resize((52,52)), (int(smooth[-1][0]-26), int(smooth[-1][1]-26)), i3)
        
        final_1x = final.resize((self.target_width, self.target_height), Image.Resampling.LANCZOS)
        
        # 组合帧
        all_frames = frames + [final_1x] * self.static_frames
        
        out = self.output_dir / f"track_{date}.gif"
        imageio.mimsave(str(out), [np.array(f) for f in all_frames], fps=25, loop=0)
        print(f"✅ 完成: {out}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-day", type=str, required=True)
    args = parser.parse_args()
    MapGifGenerator(width=500, height=500).generate(args.day)

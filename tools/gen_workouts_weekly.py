#!/usr/bin/env python3
"""Workouts 周报生成器：拉取 tudou 数据 → 生成轨迹图（含详细数据面板，无位置信息）→ 写草稿。

用法: python3 gen_workouts_weekly.py [YYYY-MM-DD]  # 指定周一日期，默认上周一
输出: ~/workspace/liups-images/draft-workouts-weekly-YYYYwWW.md + 轨迹图 webp
"""
import json, os, sqlite3, sys, urllib.request
from datetime import date, timedelta
from PIL import Image, ImageDraw, ImageFont

HOME = os.path.expanduser("~")
OUT_DIR = f"{HOME}/workspace/liups-images"
FONT_B = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
FONT_R = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
DEJA_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

def decode_polyline(s):
    coords, lat, lng, i = [], 0, 0, 0
    while i < len(s):
        for k in ('lat', 'lng'):
            shift, result = 0, 0
            while True:
                b = ord(s[i]) - 63; i += 1
                result |= (b & 0x1f) << shift
                shift += 5
                if b < 0x20: break
            d = ~(result >> 1) if result & 1 else result >> 1
            if k == 'lat': lat += d
            else: lng += d
        coords.append((lat / 1e5, lng / 1e5))
    return coords

def fmt_pace(dist_km, secs):
    if not dist_km: return "-"
    p = secs / dist_km
    return f"{int(p//60)}'{int(p%60):02d}\"/km"

def parse_dur(s):
    t = s.split(' ')[1].split('.')[0]
    h, m, sec = map(int, t.split(':'))
    secs = h*3600 + m*60 + sec
    return secs, (f"{h}:{m:02d}:{sec:02d}" if h else f"{m}:{sec:02d}")

def render_route(pts, stats, c1, c2, out):
    # 浅色主题：米白底 #fbfdf9，深绿墨字 #1a2e05（匹配 liups favicon 果绿调）
    W, H, MAP_H = 1200, 900, 620
    img = Image.new('RGB', (W, H), '#fbfdf9')
    d = ImageDraw.Draw(img)
    fb = ImageFont.truetype(FONT_B, 40)
    fm = ImageFont.truetype(FONT_R, 28)
    fs = ImageFont.truetype(FONT_R, 24)
    fe = ImageFont.truetype(DEJA_B, 28)
    step = max(1, len(pts) // 800)
    pts = pts[::step]
    lats = [p[0] for p in pts]; lngs = [p[1] for p in pts]
    PAD = 60
    minlat, maxlat = min(lats), max(lats)
    minlng, maxlng = min(lngs), max(lngs)
    scale = min((W - 2*PAD) / ((maxlng - minlng) * 1.15 or 1e-6),
                (MAP_H - 2*PAD) / ((maxlat - minlat) or 1e-6))
    def xy(lat, lng):
        return (PAD + (lng - minlng) * scale, PAD + (maxlat - lat) * scale)
    n = len(pts)
    for i in range(n - 1):
        t = i / max(1, n - 2)
        col = tuple(int(c1[j] + (c2[j] - c1[j]) * t) for j in range(3))
        d.line([xy(lats[i], lngs[i]), xy(lats[i+1], lngs[i+1])], fill=col, width=5)
    sx, sy = xy(lats[0], lngs[0]); ex, ey = xy(lats[-1], lngs[-1])
    for cx, cy, col in [(sx, sy, '#22c55e'), (ex, ey, '#ef4444')]:
        d.ellipse([cx-11, cy-11, cx+11, cy+11], fill=col, outline='white', width=3)
    y0 = MAP_H + 20
    d.line([(40, y0), (W-40, y0)], fill='#d3e9b5', width=2)
    d.text((60, y0 + 18), stats['title'], fill='#1a2e05', font=fb)
    items = [("距离", f"{stats['dist']} km"), ("用时", stats['dur']), ("配速", stats['pace']),
             ("平均心率", f"{stats['hr']} bpm"), ("爬升", f"{stats['elev']} m")]
    x = 60
    for label, val in items:
        d.text((x, y0 + 82), label, fill='#4d7c0f', font=fs)
        d.text((x, y0 + 114), val, fill='#1a2e05', font=fe)
        x += 225
    img.save(out)
    return out

def render_heatmap(days, monday, out):
    """一周 7 天运动热力图：颜色按运动类型，颜色深浅按运动量。无位置信息。浅色果绿主题。"""
    TYPE_COLOR = {'Run': (101, 163, 13), 'WeightTraining': (251, 146, 60),
                  'Hike': (52, 168, 83), 'Ride': (139, 92, 246)}
    TYPE_CN = {'Run': '跑步', 'WeightTraining': '力量', 'Hike': '徒步', 'Ride': '骑行'}
    WEEK_CN = ['一', '二', '三', '四', '五', '六', '日']
    W, H = 1200, 430
    img = Image.new('RGB', (W, H), '#fbfdf9')
    d = ImageDraw.Draw(img)
    fb = ImageFont.truetype(FONT_B, 36)
    fm = ImageFont.truetype(FONT_R, 24)
    fs = ImageFont.truetype(FONT_R, 20)
    sunday = monday + timedelta(days=6)
    d.text((60, 24), f"本周运动热力图 {monday.month}.{monday.day} – {sunday.month}.{sunday.day}",
           fill='#1a2e05', font=fb)
    cell_w, cell_h, gap, x0, y0 = 140, 190, 16, 60, 100
    for i in range(7):
        x = x0 + i * (cell_w + gap)
        acts = days[i]
        day = monday + timedelta(days=i)
        total_min = sum(a['mins'] for a in acts)
        if acts:
            main = max(acts, key=lambda a: a['mins'])
            base = TYPE_COLOR.get(main['type'], (132, 169, 140))
            alpha = min(1.0, 0.35 + total_min / 90 * 0.65)
            col = tuple(int(c * alpha + 251 * (1 - alpha)) for c in base)
        else:
            col = (240, 244, 238)
        d.rounded_rectangle([x, y0, x + cell_w, y0 + cell_h], radius=16, fill=col)
        d.text((x + 16, y0 + 14), WEEK_CN[i], fill='#1a2e05', font=fm)
        d.text((x + 16, y0 + 50), f"{day.month}.{day.day}", fill='#4d7c0f', font=fs)
        y = y0 + 84
        if acts:
            for a in acts:
                label = TYPE_CN.get(a['type'], a['type'])
                txt = f"{label} {a['dist']:.1f}km" if a['type'] == 'Run' else f"{label} {a['mins']:.0f}′"
                d.text((x + 16, y), txt, fill='#1a2e05', font=fs)
                y += 30
        else:
            d.text((x + 16, y), "休息", fill='#a3b899', font=fs)
    lx = 60
    d.text((lx, y0 + cell_h + 24), "图例：", fill='#4d7c0f', font=fs)
    lx += 70
    for t, cn in TYPE_CN.items():
        d.ellipse([lx, y0 + cell_h + 30, lx + 18, y0 + cell_h + 48], fill=TYPE_COLOR[t])
        d.text((lx + 24, y0 + cell_h + 24), cn, fill='#1a2e05', font=fs)
        lx += 90
    img.save(out)
    return out

def main():
    if len(sys.argv) > 1:
        monday = date.fromisoformat(sys.argv[1])
    else:
        today = date.today()
        monday = today - timedelta(days=today.weekday() + 7)  # 上周一
    sunday = monday + timedelta(days=6)
    iso_year, iso_week, _ = monday.isocalendar()
    tag = f"{iso_year}w{iso_week:02d}"

    # 拉数据
    db_path = "/tmp/workouts-weekly.db"
    urllib.request.urlretrieve(
        "https://github.com/aimdotsh/tudou/raw/master/run_page/data.db", db_path)
    conn = sqlite3.connect(db_path)
    rows = list(conn.execute(
        "SELECT start_date_local, type, name, distance/1000.0, moving_time,"
        " average_heartrate, elevation_gain, summary_polyline FROM activities"
        " WHERE start_date_local >= ? AND start_date_local < ? ORDER BY start_date_local",
        (monday.isoformat(), (sunday + timedelta(days=1)).isoformat())))

    if not rows:
        print(f"{tag} 无锻炼记录，跳过")
        return

    # 轨迹图（只给有 polyline 的跑步）
    palette = [((101,163,13),(62,105,12)), ((52,168,83),(30,120,60)),
               ((139,92,246),(109,72,196)), ((251,146,60),(220,110,30))]
    route_imgs = []
    for idx, r in enumerate([x for x in rows if x[1] == 'Run' and x[7]]):
        secs, dur = parse_dur(r[4])
        stats = {'title': f"{r[0][5:7]}.{r[0][8:10]} {r[2]}",
                 'dist': f"{r[3]:.1f}", 'dur': dur,
                 'pace': fmt_pace(r[3], secs),
                 'hr': f"{r[5]:.0f}" if r[5] else "-", 'elev': f"{r[6]:.0f}" if r[6] else "0"}
        c1, c2 = palette[idx % len(palette)]
        png = f"/tmp/wroute_{tag}_{idx}.png"
        render_route(decode_polyline(r[7]), stats, c1, c2, png)
        webp = f"{OUT_DIR}/workouts-{tag}-route-{idx}.webp"
        Image.open(png).save(webp, 'WEBP', quality=85)
        route_imgs.append((r, os.path.basename(webp)))

    # 热力图
    days = {i: [] for i in range(7)}
    for r in rows:
        secs, _ = parse_dur(r[4])
        wd = (date.fromisoformat(r[0][:10]) - monday).days
        if 0 <= wd < 7:
            days[wd].append({'type': r[1], 'dist': r[3], 'mins': secs / 60})
    heat_png = f"/tmp/wheatmap_{tag}.png"
    render_heatmap(days, monday, heat_png)
    heat_webp = f"{OUT_DIR}/workouts-{tag}-heatmap.webp"
    Image.open(heat_png).save(heat_webp, 'WEBP', quality=85)

    # 草稿（数据部分；总结由助手补）
    runs = [r for r in rows if r[1] == 'Run']
    strengths = [r for r in rows if r[1] == 'WeightTraining']
    total_min = sum(parse_dur(r[4])[0] for r in rows) // 60
    run_km = sum(r[3] for r in runs)

    lines = [f"本周（{monday.month}.{monday.day}–{sunday.month}.{sunday.day}）一共练了 **{len(rows)} 次**：",
             "",
             f"**跑步 {len(runs)} 次，{run_km:.1f}km：**"]
    for r in runs:
        secs, dur = parse_dur(r[4])
        lines.append(f"- **{r[0][5:7]} 月 {r[0][8:10]} 日**：{r[3]:.1f}km，{dur}，"
                     f"配速 {fmt_pace(r[3], secs)}，平均心率 {r[5]:.0f}" if r[5] else "")
    if strengths:
        lines += ["", f"**力量训练 {len(strengths)} 次：**"]
        for r in strengths:
            secs, dur = parse_dur(r[4])
            lines.append(f"- **{r[0][5:7]} 月 {r[0][8:10]} 日**：{dur}，平均心率 {r[5]:.0f}" if r[5] else "")
    lines += ["", f"合计锻炼时长约 **{total_min//60} 小时 {total_min%60} 分钟**。", "",
              "## 本周运动热力图", "",
              f"![{monday.month}.{monday.day}–{sunday.month}.{sunday.day} 一周运动热力图](/images/workouts-{tag}-heatmap.webp)",
              "", "## 本周轨迹", ""]
    for (r, img) in route_imgs:
        lines.append(f"![{r[0][:10]} {r[3]:.1f}km 轨迹](/images/{img})")
        lines.append("")

    draft = f"""---
title: Workouts 周报 {tag}：{len(rows)} 练 {total_min//60} 小时
date: {date.today().isoformat()} 12:00:00
categories: [[锻炼]]
tags: [workouts周报]
---

""" + "\n".join(lines)
    dp = f"{OUT_DIR}/draft-workouts-weekly-{tag}.md"
    open(dp, "w").write(draft)
    print(f"草稿: {dp}")
    print(f"轨迹图: {len(route_imgs)} 张")

if __name__ == "__main__":
    main()

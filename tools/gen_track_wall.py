#!/usr/bin/env python3
"""轨迹墙生成器：从 tudou data.db 里按形状找出一类轨迹，排成网格墙。

用法示例：
  # 冰淇淋墙（以某条已知轨迹为形状参考）
  python3 gen_track_wall.py --ref-date 2025-08-10 --center 40.9,119.4 \
      --dist 3.5,7.0 --title "水上冰淇淋轨迹墙" --out wall.png

  # 大象墙（以名称关键词找参考）
  python3 gen_track_wall.py --ref-name "大象" --center 40.9,119.4 \
      --dist 10,20 --title "大象轨迹墙" --out elephant.png

  # 不指定形状：直接按名称关键词过滤
  python3 gen_track_wall.py --name-like "冰淇淋" --title "冰淇淋" --out wall.png
"""
import argparse, json, sqlite3, sys, urllib.request
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONT_B = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
FONT_R = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
# 浅色果绿主题（匹配 liups favicon）
PAGE_BG = (233, 238, 228)
INK, SUB, MUT = '#1a2e05', '#4d7c0f', '#6b8f5e'
ROUTE_GREEN = (101, 163, 13)


def decode_polyline(s):
    coords, lat, lng, i = [], 0, 0, 0
    while i < len(s):
        for k in ('lat', 'lng'):
            shift, result = 0, 0
            while True:
                b = ord(s[i]) - 63; i += 1
                result |= (b & 0x1f) << shift
                shift += 5
                if b < 0x20:
                    break
            d = ~(result >> 1) if result & 1 else result >> 1
            if k == 'lat':
                lat += d
            else:
                lng += d
        coords.append((lat / 1e5, lng / 1e5))
    return coords


def load_db(path_or_url):
    if path_or_url.startswith("http"):
        tmp = "/tmp/trackwall.db"
        urllib.request.urlretrieve(path_or_url, tmp)
        path_or_url = tmp
    return sqlite3.connect(path_or_url)


def norm_shape(pts, n=32):
    lats = np.array([p[0] for p in pts])
    lngs = np.array([p[1] for p in pts])
    d = np.sqrt(np.diff(lats) ** 2 + np.diff(lngs) ** 2)
    cum = np.concatenate([[0], np.cumsum(d)])
    total = cum[-1] or 1
    tgt = np.linspace(0, total, n)
    la = np.interp(tgt, cum, lats)
    ln = np.interp(tgt, cum, lngs)
    la = (la - la.min()) / ((la.max() - la.min()) or 1e-9)
    ln = (ln - ln.min()) / ((ln.max() - ln.min()) or 1e-9)
    return np.stack([la, ln], axis=1).flatten()


def bbox(pts):
    lats = [p[0] for p in pts]
    lngs = [p[1] for p in pts]
    return (min(lats), max(lats), min(lngs), max(lngs))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="https://github.com/aimdotsh/tudou/raw/master/run_page/data.db")
    ap.add_argument("--center", default="40.9,119.4", help="地点中心 lat,lng，±0.06度内算同地点")
    ap.add_argument("--ref-date", default=None, help="形状参考轨迹的日期 YYYY-MM-DD")
    ap.add_argument("--ref-name", default=None, help="形状参考轨迹的名称关键词")
    ap.add_argument("--name-like", default=None, help="直接按名称关键词过滤（不用形状匹配）")
    ap.add_argument("--dist", default="0,100", help="距离范围km，如 3.5,7.0")
    ap.add_argument("--tol", type=float, default=0.008, help="bbox匹配容差（度）")
    ap.add_argument("--cluster-tol", type=float, default=0.55, help="去重聚类阈值，越小合并越少")
    ap.add_argument("--title", default="轨迹墙")
    ap.add_argument("--subtitle", default=None)
    ap.add_argument("--cols", type=int, default=10)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    clat, clng = map(float, a.center.split(","))
    dmin, dmax = map(float, a.dist.split(","))
    conn = load_db(a.db)
    rows = list(conn.execute(
        "SELECT type, start_date_local, name, distance/1000.0, summary_polyline "
        "FROM activities WHERE type IN ('Run','Hike','Walk')"))

    cands = []
    for r in rows:
        try:
            p = decode_polyline(r[4])
        except Exception:
            continue
        if not p:
            continue
        c1 = sum(x[0] for x in p) / len(p)
        c2 = sum(x[1] for x in p) / len(p)
        if abs(c1 - clat) > 0.06 or abs(c2 - clng) > 0.06:
            continue
        cands.append({"type": r[0], "date": r[1][:10], "name": r[2] or "",
                      "dist": r[3], "pts": p})

    if a.name_like:
        matched = [c for c in cands if a.name_like in c["name"]]
    else:
        ref = None
        if a.ref_date:
            ref = next((c for c in cands if c["date"] == a.ref_date), None)
        elif a.ref_name:
            ref = next((c for c in cands if a.ref_name in c["name"]), None)
        if not ref:
            sys.exit("找不到形状参考轨迹（检查 --ref-date / --ref-name）")
        rb = bbox(ref["pts"])

        def similar(b):
            return all(abs(x - y) < a.tol for x, y in zip(b, rb))

        matched = [c for c in cands
                   if dmin <= c["dist"] <= dmax and similar(bbox(c["pts"]))]
    if not matched:
        sys.exit("没有匹配到轨迹")
    print(f"匹配到 {len(matched)} 条")

    # 去重聚类
    feats = [norm_shape(c["pts"]) for c in matched]
    clusters = []
    for i, f in enumerate(feats):
        for cl in clusters:
            if np.linalg.norm(f - feats[cl[0]]) < a.cluster_tol:
                cl[1].append(i)
                break
        else:
            clusters.append([i, [i]])
    clusters.sort(key=lambda c: -len(c[1]))
    print(f"去重后 {len(clusters)} 组")

    # 画网格
    COLS = a.cols
    cell, gap, TITLE_H = 200, 12, 180
    rows_n = (len(clusters) + COLS - 1) // COLS
    W = COLS * (cell + gap) + gap
    H = TITLE_H + rows_n * (cell + gap) + gap + 60
    img = Image.new('RGB', (W, H), PAGE_BG)
    d = ImageDraw.Draw(img)
    fb = ImageFont.truetype(FONT_B, 52)
    fm = ImageFont.truetype(FONT_R, 30)
    fs = ImageFont.truetype(FONT_R, 22)
    sub = a.subtitle or f"{len(matched)} 条轨迹 · {len(clusters)} 种走法"
    d.text((40, 36), a.title, fill=INK, font=fb)
    d.text((40, 108), sub, fill=SUB, font=fm)

    for idx, (rep, members) in enumerate(clusters):
        r_, c_ = divmod(idx, COLS)
        x0 = gap + c_ * (cell + gap)
        y0 = TITLE_H + gap + r_ * (cell + gap)
        pts = matched[rep]["pts"]
        lats = [p[0] for p in pts]
        lngs = [p[1] for p in pts]
        pad = 18
        sc = min((cell - 2 * pad) / ((max(lngs) - min(lngs)) or 1e-9),
                 (cell - 2 * pad - 24) / ((max(lats) - min(lats)) or 1e-9))
        ox = x0 + (cell - (max(lngs) - min(lngs)) * sc) / 2
        oy = y0 + (cell - 24 - (max(lats) - min(lats)) * sc) / 2
        coords = [(ox + (p[1] - min(lngs)) * sc, oy + (max(lats) - p[0]) * sc)
                  for p in pts]
        d.line(coords, fill=ROUTE_GREEN, width=3, joint='curve')
        if len(members) > 1:
            d.text((x0 + cell - 52, y0 + cell - 40), f"×{len(members)}",
                   fill=SUB, font=fs)

    img.save(a.out)
    print(f"saved {a.out} ({W}x{H})")


if __name__ == "__main__":
    main()

import json
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# 导入我们的生成引擎
sys.path.append(str(Path(__file__).parent))
from generate_gifs_map_v2 import MapGifGenerator

def main():
    gen = MapGifGenerator(force=True) # 强制覆盖
    
    # 1. 加载 luck 列表中的日期
    luck_dates = []
    luck_file = Path(__file__).parent / "luck_dates.txt"
    if luck_file.exists():
        luck_dates = [line.strip() for line in luck_file.read_text().splitlines() if line.strip()]
    
    # 2. 筛选 2026-03 以后的活动
    after_date = "2026-03-01"
    activities_file = Path(__file__).parent.parent / "src" / "static" / "activities.json"
    with open(activities_file) as f:
        data = json.load(f)
    
    new_dates = [a['start_date_local'][:10] for a in data if a['start_date_local'] >= after_date and a.get('summary_polyline')]
    
    # 合并并去重
    all_to_gen = sorted(list(set(luck_dates + new_dates)), reverse=True)
    print(f"🚀 开始为 {len(all_to_gen)} 个活动重新生成高清 GIF (多线程加速中)...")
    
    # 使用 8 线程并发处理
    with ThreadPoolExecutor(max_workers=8) as executor:
        list(executor.map(lambda d: gen.generate(d), all_to_gen))

    print("🎉 任务完成")

if __name__ == "__main__":
    main()

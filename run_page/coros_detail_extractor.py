import os
import json
import datetime
from garmin_fit_sdk import Decoder, Stream
from garmin_fit_sdk.util import FIT_EPOCH_S

def extract_all_fit_details(fit_dir, output_dir):
    """
    扫描 fit_dir 中的所有 .fit 文件，并将其中的详细数据导出为 JSON 文件存储于 output_dir 中。
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    if not os.path.exists(fit_dir):
        print(f"FIT 目录 {fit_dir} 不存在。")
        return
        
    print(f"开始提取高驰详细图表数据...")
    fit_files = [f for f in os.listdir(fit_dir) if f.endswith(".fit")]
    print(f"发现共 {len(fit_files)} 个 FIT 文件")
    
    extracted_count = 0
    
    for filename in fit_files:
        fit_path = os.path.join(fit_dir, filename)
        
        try:
            stream = Stream.from_file(fit_path)
            decoder = Decoder(stream)
            messages, errors = decoder.read(convert_datetimes_to_dates=False)
            
            if errors:
                print(f"读取 FIT {filename} 失败: {errors}")
                continue
                
            if "session_mesgs" not in messages or not messages["session_mesgs"]:
                continue
                
            session = messages["session_mesgs"][0]
            start_time_raw = session.get("start_time")
            if not start_time_raw:
                continue
                
            # 计算对应的毫秒级 run_id (与 track.py 保持完全一致)
            run_id = int((start_time_raw + FIT_EPOCH_S) * 1000)
            
            output_json_path = os.path.join(output_dir, f"{run_id}.json")
            
            # 如果对应的详细 JSON 已经存在，则跳过
            if os.path.exists(output_json_path):
                continue
                
            # 开始抽取所需数据
            detail_data = {}
            detail_data["run_id"] = run_id
            
            # 1. session 概要信息
            detail_data["summary"] = {
                "sport": session.get("sport", "running"),
                "total_distance": session.get("total_distance", 0.0),
                "total_timer_time": session.get("total_timer_time", 0.0),
                "total_calories": session.get("total_calories", 0),
                "avg_heart_rate": session.get("avg_heart_rate"),
                "max_heart_rate": session.get("max_heart_rate"),
                "avg_power": session.get("avg_power"),
                "avg_cadence": session.get("avg_cadence"),
                "total_ascent": session.get("total_ascent", 0),
                "total_descent": session.get("total_descent", 0),
            }
            
            # 2. lap 分圈数据
            laps = []
            if "lap_mesgs" in messages:
                for idx, lap in enumerate(messages["lap_mesgs"]):
                    laps.append({
                        "lap_num": idx + 1,
                        "distance": lap.get("total_distance", 0.0),
                        "duration": lap.get("total_timer_time", 0.0),
                        "avg_speed": lap.get("avg_speed", 0.0),
                        "avg_heart_rate": lap.get("avg_heart_rate"),
                        "avg_power": lap.get("avg_power"),
                        "avg_cadence": lap.get("avg_running_cadence") or lap.get("avg_cadence"),
                    })
            detail_data["laps"] = laps
            
            # 3. record 时间序列点（进行最大 500 点的均匀降采样以优化前端性能）
            records = []
            if "record_mesgs" in messages:
                raw_records = messages["record_mesgs"]
                total_records = len(raw_records)
                
                # 计算降采样间隔
                max_points = 500
                if total_records <= max_points:
                    sampled_records = raw_records
                else:
                    step = total_records / max_points
                    sampled_records = [raw_records[int(i * step)] for i in range(max_points)]
                    
                start_ts = raw_records[0].get("timestamp", start_time_raw)
                
                for r in sampled_records:
                    ts = r.get("timestamp", start_ts)
                    time_offset = int(ts - start_ts)
                    
                    records.append({
                        "time_offset": time_offset,
                        "distance": r.get("distance", 0.0),
                        "heart_rate": r.get("heart_rate"),
                        "speed": r.get("enhanced_speed") or r.get("speed"),
                        "altitude": r.get("enhanced_altitude") or r.get("altitude"),
                        "power": r.get("power"),
                        "cadence": r.get("cadence"),
                    })
            detail_data["records"] = records
            
            # 保存为 JSON 文件
            with open(output_json_path, "w", encoding="utf-8") as f:
                json.dump(detail_data, f, ensure_ascii=False, indent=2)
                
            extracted_count += 1
            
        except Exception as e:
            print(f"从 FIT 文件 {filename} 提取数据失败: {e}")
            
    print(f"数据提取完成，本次成功生成了 {extracted_count} 个详情 JSON。")

    # 4. 构建 coros_id_mapping.json 映射关系，用开始时间关联 db 中的任何 id 并且输出到 mapping.json 中
    print("开始构建高驰图表 ID 映射关系表...")
    try:
        import sqlite3
        current_dir = os.path.dirname(os.path.realpath(__file__))
        parent_dir = os.path.dirname(current_dir)
        db_path = os.path.join(parent_dir, "run_page", "data.db")
        
        mapping = {}
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT run_id, start_date_local FROM activities")
            db_runs = cursor.fetchall()
            conn.close()
            
            # 读取已有的详情 JSON 文件名
            detail_files = [f for f in os.listdir(output_dir) if f.endswith(".json")]
            
            # 解析 db 日期
            db_run_dt = []
            for db_id, dt_str in db_runs:
                try:
                    dt = datetime.datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
                    db_run_dt.append((db_id, dt))
                except:
                    pass
                    
            for filename in detail_files:
                coros_id_str = filename.split(".")[0]
                try:
                    coros_id = int(coros_id_str)
                    coros_dt = datetime.datetime.fromtimestamp(coros_id / 1000.0)
                    
                    for db_id, db_dt in db_run_dt:
                        # 允许 2 分钟范围内的误差
                        if abs((coros_dt - db_dt).total_seconds()) <= 120:
                            mapping[str(db_id)] = coros_id_str
                            break
                except Exception as ex:
                    print(f"解析 {filename} 时间失败: {ex}")
                    
            mapping_file = os.path.join(parent_dir, "public", "data", "coros_id_mapping.json")
            with open(mapping_file, "w", encoding="utf-8") as f:
                json.dump(mapping, f, ensure_ascii=False, indent=2)
            print(f"成功生成了高驰 ID 映射关系表，包含 {len(mapping)} 条映射记录。")
    except Exception as e:
        print(f"构建 ID 映射关系表失败: {e}")

if __name__ == "__main__":
    fit_dir = "/Users/liups/ai/github/tudou/FIT_OUT"
    output_dir = "/Users/liups/ai/github/tudou/public/data/coros_detail"
    extract_all_fit_details(fit_dir, output_dir)

import argparse
import asyncio
import hashlib
import os
import time

import aiofiles
import httpx

from config import JSON_FILE, SQL_FILE, FIT_FOLDER, FOLDER_DICT
from utils import make_activities_file
from generator.db import update_or_create_activity, init_db

COROS_URL_DICT = {
    "LOGIN_URL": "https://teamcnapi.coros.com/account/login",
    "DOWNLOAD_URL": "https://teamcnapi.coros.com/activity/detail/download",
    "ACTIVITY_LIST": "https://teamcnapi.coros.com/activity/query",
}

COROS_TYPE_DICT = {
    "gpx": 1,
    "fit": 4,
    "tcx": 3,
}

TIME_OUT = httpx.Timeout(240.0, connect=360.0)


class Coros:
    def __init__(self, account, password, is_only_running=False):
        self.account = account
        self.password = password
        self.headers = None
        self.req = None
        self.is_only_running = is_only_running

    async def login(self):
        url = COROS_URL_DICT.get("LOGIN_URL")
        headers = {
            "authority": "teamcnapi.coros.com",
            "accept": "application/json, text/plain, */*",
            "accept-language": "zh-CN,zh;q=0.9",
            "content-type": "application/json;charset=UTF-8",
            "dnt": "1",
            "origin": "https://t.coros.com",
            "referer": "https://t.coros.com/",
            "sec-ch-ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        }
        data = {"account": self.account, "accountType": 2, "pwd": self.password}
        async with httpx.AsyncClient(timeout=TIME_OUT) as client:
            response = await client.post(url, json=data, headers=headers)
            resp_json = response.json()
            access_token = resp_json.get("data", {}).get("accessToken")
            if not access_token:
                raise Exception(
                    "============Login failed! please check your account and password==========="
                )
            self.headers = {
                "accesstoken": access_token,
                "cookie": f"CPL-coros-region=2; CPL-coros-token={access_token}",
            }
            self.req = httpx.AsyncClient(timeout=TIME_OUT, headers=self.headers)
        await client.aclose()

    async def init(self):
        await self.login()

    async def fetch_activity_ids_types(self, only_run=False):
        page_number = 1
        all_activities_ids_types = []
        act_map = {}

        mode_list_str = "100,101,102,103" if only_run else ""
        while True:
            url = f"{COROS_URL_DICT.get('ACTIVITY_LIST')}?&modeList={mode_list_str}&pageNumber={page_number}&size=20"
            response = await self.req.get(url)
            data = response.json()
            activities = data.get("data", {}).get("dataList", None)
            if not activities:
                break
            for activity in activities:
                label_id = activity.get("labelId")
                sport_type = activity.get("sportType")
                if label_id is None:
                    continue
                str_label_id = str(label_id)
                all_activities_ids_types.append([str_label_id, sport_type])
                act_map[str_label_id] = activity

            page_number += 1

        return all_activities_ids_types, act_map

    async def download_activity(self, label_id, sport_type, file_type="fit"):
        if sport_type == 101 and file_type == "gpx":
            print(
                f"Sport type {sport_type} is not supported in {file_type} file. The activity will be ignored"
            )
            return None, None
        download_folder = FOLDER_DICT[file_type]
        download_url = (
            f"{COROS_URL_DICT.get('DOWNLOAD_URL')}?labelId={label_id}&sportType={sport_type}"
            f"&fileType={COROS_TYPE_DICT[file_type]}"
        )
        file_url = None
        fname = ""
        file_path = ""
        try:
            response = await self.req.post(download_url)
            resp_json = response.json()
            file_url = resp_json.get("data", {}).get("fileUrl")
            if not file_url:
                print(f"No file URL found for label_id {label_id} (sportType: {sport_type})")
                return None, None

            # 统一命名为 label_id.fit，确保与数据库 run_id 精确对应
            fname = f"{label_id}.{file_type}"
            file_path = os.path.join(download_folder, fname)

            async with self.req.stream("GET", file_url) as response:
                response.raise_for_status()
                async with aiofiles.open(file_path, "wb") as f:
                    async for chunk in response.aiter_bytes():
                        await f.write(chunk)
            print(f"Successfully downloaded FIT for {label_id} -> {fname}")
            return label_id, fname
        except httpx.HTTPStatusError as exc:
            print(
                f"Failed to download {file_url} with status code {response.status_code}: {exc}"
            )
        except Exception as exc:
            print(f"Error occurred while downloading {file_url}: {exc}")
        if file_path and os.path.exists(file_path):
            print(f"Delete the corrupted file: {fname}")
            try:
                os.remove(file_path)
            except Exception:
                pass

        return None, None


    async def fetch_strength_workout_details(self, label_id, sport_type=402):
        """
        全自动接入高驰官方结构化力量训练详情 API (如 sportType=402 自定义力量)
        精准解析官方返回的 lapList[0].lapItemList 转换为标准 extra_details JSON
        """
        str_label_id = str(label_id)
        url = f"https://teamcnapi.coros.com/activity/detail/query?screenW=666&screenH=982&labelId={str_label_id}&sportType={sport_type}"
        coros_headers = {
            "accesstoken": self.headers.get("accesstoken", ""),
            "cookie": f"CPL-coros-token={self.headers.get('accesstoken', '')}; CPL-coros-region=2",
            "referer": "https://t.coros.com/",
            "origin": "https://t.coros.com",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "accept": "application/json, text/plain, */*",
            "content-type": "application/json;charset=UTF-8",
        }

        # 动作名称多语言映射字典 (高驰多语言 Key + 标准动作分类)
        COROS_EXERCISE_NAMES = {
            "T1120": "热身",
            "T1061": "深蹲",
            "T1079": "登山跑",
            "T1080": "俯卧撑",
            "T1081": "硬拉",
            "T1082": "卧推",
            "T1083": "哑铃弯举",
            "T1084": "推肩",
            "T1085": "引体向上",
            "T1086": "平板支撑",
            "T1087": "波比跳",
            "T1088": "站立提踵",
            "T1089": "开合跳",
            "T1090": "提腿抱膝",
            "T1091": "俯身下划",
            "T1092": "站姿提膝",
            "T1093": "卷腹",
        }

        for method in ["POST", "GET"]:
            try:
                if method == "POST":
                    resp = await self.req.post(url, headers=coros_headers)
                else:
                    resp = await self.req.get(url, headers=coros_headers)

                resp_json = resp.json()
                data_obj = resp_json.get("data")
                if not data_obj or not isinstance(data_obj, dict):
                    continue

                lap_list = data_obj.get("lapList", [])
                if not lap_list:
                    continue

                lap_items = lap_list[0].get("lapItemList", [])
                if not lap_items:
                    continue

                exercises = {}
                for item in lap_items:
                    ex_idx = item.get("exerciseIndex", 0)
                    mode = item.get("mode", 0) # 14: 运动中 active, 15: 休息 rest, 16: 汇总 summary
                    lap_type = item.get("lapType", 0)

                    # 只提取 active 动作组（mode == 14 且 lapType == 0）
                    if mode == 14 and lap_type == 0:
                        key = item.get("exerciseNameKey", f"EX_{ex_idx}")
                        reps = item.get("reps", 0)
                        target_reps = item.get("targetValue", 0)
                        weight_raw = item.get("weight", 0)
                        weight = (weight_raw / 100.0) if weight_raw else 0.0
                        time_raw = item.get("time", 0)
                        target_type = item.get("targetType", 3)

                        # 高驰 time 单位纠正：若 > 1000 且 targetValue 约为秒数，换算真实秒数
                        if time_raw >= 1000:
                            # 判断是否为毫秒或厘秒
                            if target_reps and abs((time_raw / 100) - target_reps) < 5:
                                duration_sec = int(time_raw / 100)
                            else:
                                duration_sec = int(time_raw // 1000) if time_raw >= 10000 else int(time_raw / 100)
                        else:
                            duration_sec = int(time_raw)

                        if ex_idx not in exercises:
                            exercises[ex_idx] = {
                                "index": ex_idx,
                                "name_key": key,
                                "target_type": target_type,
                                "sets": []
                            }

                        set_num = len(exercises[ex_idx]["sets"]) + 1
                        if target_type == 2 or (reps == 0 and duration_sec > 0):
                            mins, secs = divmod(duration_sec, 60)
                            exercises[ex_idx]["sets"].append({
                                "set_num": set_num,
                                "duration": f"{mins}:{secs:02d}"
                            })
                        else:
                            set_data = {
                                "set_num": set_num,
                                "reps": f"{reps}/{target_reps}" if target_reps else f"{reps}"
                            }
                            if weight > 0:
                                set_data["weight"] = f"{weight:.1f} kg"
                            exercises[ex_idx]["sets"].append(set_data)

                if exercises:
                    parsed_details = []
                    for ex_idx in sorted(exercises.keys()):
                        ex = exercises[ex_idx]
                        name = COROS_EXERCISE_NAMES.get(ex["name_key"], f"动作 {ex_idx}")
                        has_weight = any("weight" in s for s in ex["sets"])
                        has_duration = any("duration" in s for s in ex["sets"])
                        ex_type = "reps_weight" if has_weight else ("timer" if has_duration else "reps")
                        parsed_details.append({
                            "index": ex_idx,
                            "name": name,
                            "total_sets": len(ex["sets"]),
                            "type": ex_type,
                            "sets": ex["sets"]
                        })

                    import json
                    return json.dumps(parsed_details, ensure_ascii=False)
            except Exception as e:
                print(f"Error parsing strength details from Coros {method}: {e}")

        return None


def get_downloaded_ids(folder):
    if not os.path.exists(folder):
        return []
    return [i.split(".")[0] for i in os.listdir(folder) if not i.startswith(".") and os.path.getsize(os.path.join(folder, i)) > 0]


def sync_coros_summary_to_db(act):
    import datetime

    label_id = str(act.get("labelId"))
    name = act.get("name", "运动")
    mode = act.get("mode", 8)
    sport_type = act.get("sportType", 100)
    start_time_ts = act.get("startTime", 0)

    if start_time_ts:
        dt = datetime.datetime.fromtimestamp(start_time_ts)
        start_date_local = dt.strftime("%Y-%m-%d %H:%M:%S")
    else:
        start_date_local = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    duration = int(act.get("duration") or act.get("totalTime") or 0)
    moving_time_td = datetime.timedelta(seconds=duration)

    distance = float(act.get("distance", 0.0) or 0.0)
    avg_hr = act.get("avgHr")

    # 运动类型精准分类
    if any(kw in name for kw in ["力量", "自定义力量", "深蹲", "硬拉", "卧推", "哑铃", "杠铃", "Gym", "Weight"]) or mode in [23, 24, 25]:
        act_type = "WeightTraining"
    elif any(kw in name for kw in ["徒步", "健走", "行走", "散步", "走", "山", "Hike", "Walk"]) or mode in [14, 31]:
        act_type = "Hike"
    elif any(kw in name for kw in ["跑", "Run", "Jog"]) or mode in [8, 9, 100]:
        act_type = "Run"
    elif any(kw in name for kw in ["骑", "Ride", "Cycle"]) or mode in [2]:
        act_type = "Ride"
    else:
        act_type = "Hike" if distance > 500 else "Workout"

    class MockActivity:
        pass

    mock_act = MockActivity()
    mock_act.id = int(label_id)
    mock_act.name = name
    mock_act.distance = distance
    mock_act.moving_time = moving_time_td
    mock_act.elapsed_time = moving_time_td
    mock_act.type = act_type
    mock_act.start_date = start_date_local
    mock_act.start_date_local = start_date_local
    mock_act.location_country = "中国"
    mock_act.start_latlng = None
    mock_act.map = None
    mock_act.average_heartrate = avg_hr
    mock_act.average_speed = (distance * 1000 / duration) if (duration and distance) else 0.0
    mock_act.elevation_gain = 0.0
    mock_act.source = "coros"

    session = init_db(SQL_FILE)
    try:
        update_or_create_activity(session, mock_act)
        session.commit()
        print(f"✅ Fallback synced activity metadata directly to DB: {name} ({start_date_local}, mode:{mode})")
    except Exception as e:
        session.rollback()
        print(f"❌ Error fallback syncing activity to DB: {e}")
    finally:
        session.close()


async def download_and_generate(account, password, only_run=False, file_type="fit"):
    folder = FOLDER_DICT[file_type]
    downloaded_ids = set(get_downloaded_ids(folder))
    coros = Coros(account, password)
    await coros.init()

    activity_infos, act_map = await coros.fetch_activity_ids_types(only_run=only_run)
    activity_ids = [i[0] for i in activity_infos]
    activity_types = [i[1] for i in activity_infos]
    activity_id_type_dict = dict(zip(activity_ids, activity_types))

    print("activity_ids: ", len(activity_ids))
    print("downloaded_ids: ", len(downloaded_ids))
    to_generate_coros_ids = [i for i in activity_ids if i not in downloaded_ids]
    print("to_generate_activity_ids: ", len(to_generate_coros_ids))

    start_time = time.time()
    results = await gather_with_concurrency(
        10,
        [
            coros.download_activity(
                label_id, activity_id_type_dict.get(label_id, 100), file_type
            )
            for label_id in to_generate_coros_ids
        ],
    )
    print(f"Download finished. Elapsed {time.time()-start_time} seconds")

    # 对没有生成实体 FIT 的活动（如 Mode 23 室内力量），进行 DB 元数据保底落库
    for label_id, res in zip(to_generate_coros_ids, results):
        if res is None or res[0] is None:
            act_obj = act_map.get(str(label_id))
            if act_obj:
                try:
                    sync_coros_summary_to_db(act_obj)
                except Exception as e:
                    print(f"Error in fallback syncing {label_id}: {e}")

    # 全自动抓取结构化力量训练 (sportType=402 或 mode in [23,24,25]) 的动作组数明细
    # 包含本次增量活动 + 近期（7天内）数据库中缺少 extra_details 的力量训练
    strength_target_ids = set(to_generate_coros_ids)
    try:
        session_chk = init_db(SQL_FILE)
        from generator.db import Activity
        import datetime
        recent_cutoff = (datetime.datetime.now() - datetime.timedelta(days=7)).strftime("%Y-%m-%d")
        recent_missing_acts = session_chk.query(Activity).filter(
            Activity.start_date_local >= recent_cutoff,
            Activity.type == "WeightTraining",
            Activity.extra_details == None
        ).all()
        for act in recent_missing_acts:
            strength_target_ids.add(str(act.run_id))
        session_chk.close()
    except Exception:
        pass

    strength_details_map = {}
    for str_label_id in strength_target_ids:
        act_item = act_map.get(str(str_label_id), {})
        mode_val = act_item.get("mode", 0)
        sport_val = act_item.get("sportType", 0)
        act_n = act_item.get("name", "")
        if mode_val in [23, 24, 25] or sport_val in [402, 23] or any(k in act_n for k in ["力量", "深蹲", "自定义力量"]):
            try:
                details_json = await coros.fetch_strength_workout_details(str_label_id, sport_type=sport_val or 402)
                if details_json:
                    strength_details_map[str(str_label_id)] = details_json
                    print(f"🏋️ Successfully fetched strength workout details for {act_n} ({str_label_id})")
            except Exception as e:
                print(f"Failed to fetch strength details for {str_label_id}: {e}")

    await coros.req.aclose()

    # 构建完整的 activity_title_dict (同时支持 labelId 与 毫秒时间戳 run_id)
    activity_title_dict = {}
    for str_label_id, act_item in act_map.items():
        name = act_item.get("name")
        if name in ["天津市 跑步", "天津 跑步"]:
            name = "Morning Run"
        st = act_item.get("startTime")
        if name:
            activity_title_dict[str(str_label_id)] = name
            if st:
                activity_title_dict[str(int(st) * 1000)] = name
                activity_title_dict[str(int(st))] = name

    make_activities_file(SQL_FILE, folder, JSON_FILE, file_type, activity_title_dict=activity_title_dict)

    # 针对本次增量新活动及需要补全明细的力量训练进行名称同步、明细落库与智能去重
    try:
        session = init_db(SQL_FILE)
        from generator.db import Activity, update_or_create_activity
        import datetime

        target_label_ids = set(to_generate_coros_ids).union(strength_target_ids)

        for str_label_id in target_label_ids:
            act_item = act_map.get(str(str_label_id))
            if not act_item:
                continue

            real_name = act_item.get("name", "运动")
            if real_name in ["天津市 跑步", "天津 跑步"]:
                real_name = "Morning Run"

            st = act_item.get("startTime")
            target_ids = [int(str_label_id)]
            if st:
                target_ids.extend([int(st) * 1000, int(st)])

            matching_acts = session.query(Activity).filter(Activity.run_id.in_(target_ids)).all()
            tz_cst = datetime.timezone(datetime.timedelta(hours=8))
            if not matching_acts and st:
                dt_str = datetime.datetime.fromtimestamp(int(st), tz=tz_cst).strftime("%Y-%m-%d %H:%M")
                matching_acts = session.query(Activity).filter(Activity.start_date_local.like(f"{dt_str}%")).all()

            extra_detail_val = strength_details_map.get(str(str_label_id))

            if matching_acts:
                # 优先保留有轨迹 summary_polyline 的记录
                track_act = next((a for a in matching_acts if a.summary_polyline and len(a.summary_polyline) > 0), matching_acts[0])
                track_act.name = real_name
                if st:
                    # 确保 start_date_local 严格修正为北京时间
                    track_act.start_date_local = datetime.datetime.fromtimestamp(int(st), tz=tz_cst).strftime("%Y-%m-%d %H:%M:%S")
                if act_item.get("avgHr"):
                    track_act.average_heartrate = float(act_item["avgHr"])
                if extra_detail_val:
                    track_act.extra_details = extra_detail_val

                # 删除同时间段其它多余的重复记录
                for duplicate in matching_acts:
                    if duplicate.run_id != track_act.run_id:
                        session.delete(duplicate)
                        print(f"Removed duplicate activity id {duplicate.run_id} for {real_name}")
            else:
                # 若本次新活动完全未生成 FIT（如无位移的力量训练），在当前 session 下安全落库
                label_id = str(act_item.get("labelId"))
                mode = act_item.get("mode", 8)
                start_time_ts = act_item.get("startTime", 0)

                if start_time_ts:
                    dt = datetime.datetime.fromtimestamp(start_time_ts, tz=tz_cst)
                    start_date_local = dt.strftime("%Y-%m-%d %H:%M:%S")
                else:
                    dt = datetime.datetime.now(tz=tz_cst)
                    start_date_local = dt.strftime("%Y-%m-%d %H:%M:%S")

                duration = int(act_item.get("duration") or act_item.get("totalTime") or 0)
                moving_time_td = datetime.timedelta(seconds=duration)
                distance = float(act_item.get("distance", 0.0) or 0.0)
                avg_hr = act_item.get("avgHr")

                if any(kw in real_name for kw in ["力量", "自定义力量", "深蹲", "硬拉", "卧推", "哑铃", "杠铃", "Gym", "Weight"]) or mode in [23, 24, 25]:
                    act_type = "WeightTraining"
                elif any(kw in real_name for kw in ["徒步", "健走", "行走", "散步", "走", "山", "Hike", "Walk"]) or mode in [14, 31]:
                    act_type = "Hike"
                elif any(kw in real_name for kw in ["跑", "Run", "Jog"]) or mode in [8, 9, 100]:
                    act_type = "Run"
                elif any(kw in real_name for kw in ["骑", "Ride", "Cycle"]) or mode in [2]:
                    act_type = "Ride"
                else:
                    act_type = "Hike" if distance > 500 else "Workout"

                class MockActivity:
                    pass

                mock_act = MockActivity()
                mock_act.id = int(label_id)
                mock_act.name = real_name
                mock_act.distance = distance
                mock_act.moving_time = moving_time_td
                mock_act.elapsed_time = moving_time_td
                mock_act.type = act_type
                mock_act.start_date = start_date_local
                mock_act.start_date_local = start_date_local
                mock_act.location_country = "中国"
                mock_act.start_latlng = None
                mock_act.map = None
                mock_act.average_heartrate = avg_hr
                mock_act.average_speed = (distance * 1000 / duration) if (duration and distance) else 0.0
                mock_act.elevation_gain = 0.0
                mock_act.source = "coros"
                mock_act.extra_details = extra_detail_val

                update_or_create_activity(session, mock_act)
                print(f"✅ Synced incremental activity to DB: {real_name} ({start_date_local})")

        # 智能合并同日（如 8月9日）因时间戳与 labelId 差异产生的重复记录
        for date_prefix in ["2026-08-09"]:
            dups = session.query(Activity).filter(Activity.start_date_local.like(f"{date_prefix}%")).all()
            if len(dups) > 1:
                # 优先保留带有 summary_polyline 的记录
                keep_act = next((a for a in dups if a.summary_polyline and len(a.summary_polyline) > 0), dups[0])
                keep_act.name = "Morning Run"
                for d in dups:
                    if d.run_id != keep_act.run_id:
                        session.delete(d)
                print(f"Merged & deleted duplicate activity for {date_prefix}")

        # 删除数据库中任何遗留的 Unnamed Workout
        session.query(Activity).filter(Activity.name.in_(["Unnamed Workout", "Unnamed Activity", ""])).delete(synchronize_session=False)

        session.commit()
        session.close()
    except Exception as e:
        print(f"Error updating real activity names from Coros: {e}")

    # 全量将 DB 导出为 activities.json
    try:
        from generator import Generator
        import json
        g = Generator(SQL_FILE)
        acts = g.load()
        with open(JSON_FILE, "w") as f:
            json.dump(acts, f, indent=2)
        print(f"✅ Exported {len(acts)} total activities from DB to {JSON_FILE}")
    except Exception as e:
        print(f"❌ Error exporting DB to {JSON_FILE}: {e}")


async def gather_with_concurrency(n, tasks):
    semaphore = asyncio.Semaphore(n)

    async def sem_task(task):
        async with semaphore:
            return await task

    return await asyncio.gather(*(sem_task(task) for task in tasks))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("account", nargs="?", help="input coros account")
    parser.add_argument("password", nargs="?", help="input coros password")
    parser.add_argument("--only-run", dest="only_run", action="store_true", help="if is only for running")
    parser.add_argument("--tcx", dest="download_file_type", action="store_const", const="tcx", default="fit", help="download tcx")
    parser.add_argument("--gpx", dest="download_file_type", action="store_const", const="gpx", default="fit", help="download gpx")
    options = parser.parse_args()

    account = options.account
    password = options.password
    is_only_running = options.only_run
    file_type = options.download_file_type
    file_type = file_type if file_type in ["gpx", "tcx", "fit"] else "fit"
    encrypted_pwd = hashlib.md5(password.encode()).hexdigest()

    asyncio.run(download_and_generate(account, encrypted_pwd, is_only_running, file_type))

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

    if mode in [23, 24, 25]:
        act_type = "WeightTraining"
    elif mode in [8, 9, 100]:
        act_type = "Run"
    elif mode in [14, 31]:
        act_type = "Hike"
    elif mode in [2]:
        act_type = "Ride"
    else:
        if "跑" in name:
            act_type = "Run"
        elif "走" in name or "山" in name:
            act_type = "Hike"
        elif "骑" in name:
            act_type = "Ride"
        else:
            act_type = "Workout"

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

    await coros.req.aclose()

    # 构建完整的 activity_title_dict (同时支持 labelId 与 毫秒时间戳 run_id)
    activity_title_dict = {}
    for str_label_id, act_item in act_map.items():
        name = act_item.get("name")
        st = act_item.get("startTime")
        if name:
            activity_title_dict[str(str_label_id)] = name
            if st:
                activity_title_dict[str(int(st) * 1000)] = name
                activity_title_dict[str(int(st))] = name

    make_activities_file(SQL_FILE, folder, JSON_FILE, file_type, activity_title_dict=activity_title_dict)

    # 自动把高驰服务器上的真实活动名称 (如 "北京站", "走日坛公园") 覆盖回数据库，并根据时间戳智能去重
    try:
        session = init_db(SQL_FILE)
        from generator.db import Activity
        import datetime

        for str_label_id, act_item in act_map.items():
            real_name = act_item.get("name")
            st = act_item.get("startTime")
            if not real_name:
                continue

            target_ids = [int(str_label_id)]
            if st:
                target_ids.extend([int(st) * 1000, int(st)])

            matching_acts = session.query(Activity).filter(Activity.run_id.in_(target_ids)).all()
            if not matching_acts and st:
                dt_str = datetime.datetime.fromtimestamp(int(st)).strftime("%Y-%m-%d %H:%M")
                matching_acts = session.query(Activity).filter(Activity.start_date_local.like(f"{dt_str}%")).all()

            if matching_acts:
                # 优先保留有轨迹 summary_polyline 的记录
                track_act = next((a for a in matching_acts if a.summary_polyline and len(a.summary_polyline) > 0), matching_acts[0])
                track_act.name = real_name
                if act_item.get("avgHr"):
                    track_act.average_heartrate = float(act_item["avgHr"])

                # 删除同时间段其它多余的重复记录
                for duplicate in matching_acts:
                    if duplicate.run_id != track_act.run_id:
                        session.delete(duplicate)
                        print(f"Removed duplicate activity id {duplicate.run_id} for {real_name}")

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

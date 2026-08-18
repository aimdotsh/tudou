import argparse
import asyncio
import hashlib
import os
import time

import aiofiles
import httpx

from config import JSON_FILE, SQL_FILE, FIT_FOLDER
from utils import make_activities_file

COROS_URL_DICT = {
    "LOGIN_URL": "https://teamcnapi.coros.com/account/login",
    "DOWNLOAD_URL": "https://teamcnapi.coros.com/activity/detail/download",
    "ACTIVITY_LIST": "https://teamcnapi.coros.com/activity/query?&modeList=",
}

TIME_OUT = httpx.Timeout(240.0, connect=360.0)


class Coros:
    def __init__(self, account, password):
        self.account = account
        self.password = password
        self.headers = None
        self.req = None

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

    async def fetch_activities_dict(self):
        page_number = 1
        all_activities = []
        act_map = {}

        while True:
            url = f"{COROS_URL_DICT.get('ACTIVITY_LIST')}&pageNumber={page_number}&size=20"
            response = await self.req.get(url)
            data = response.json()
            activities = data.get("data", {}).get("dataList", None)
            if not activities:
                break

            if page_number == 1:
                print("--- COROS Server Latest 5 Activities ---")
                for act in activities[:5]:
                    name = act.get("name", "Unnamed Workout")
                    label_id = act.get("labelId")
                    mode = act.get("mode")
                    start_time = act.get("startTime")
                    print(f"-> Date: {start_time}, Name: {name}, LabelID: {label_id}, Mode: {mode}")
                print("---------------------------------------")

            for activity in activities:
                label_id = activity.get("labelId")
                mode = activity.get("mode", 100)
                if label_id is None:
                    continue
                str_label_id = str(label_id)
                all_activities.append((str_label_id, mode))
                act_map[str_label_id] = activity

            page_number += 1

        return all_activities, act_map

    async def fetch_activities(self):
        all_activities, _ = await self.fetch_activities_dict()
        return all_activities

    async def download_activity(self, label_id, mode=100):
        download_folder = FIT_FOLDER
        str_label_id = str(label_id)
        int_mode = int(mode) if mode else 100

        # 高驰全量尝试的 Endpoint 集合
        endpoints = [
            "https://teamcnapi.coros.com/activity/detail/download",
            "https://teamcnapi.coros.com/activity/detail/export",
            "https://teamcnapi.coros.com/activity/file/download",
            "https://teamcnapi.coros.com/activity/detail/query",
        ]

        payloads = [
            {"labelId": str_label_id, "sportType": int_mode, "fileType": 1},
            {"labelId": str_label_id, "fileType": 1},
            {"labelId": str_label_id, "sportType": int_mode, "fileType": 4},
            {"labelId": str_label_id, "fileType": 4},
            {"labelId": str_label_id, "sportType": int_mode, "fileType": 2},
            {"labelId": str_label_id, "fileType": 2},
            {"labelId": str_label_id, "fileType": 0},
            {"labelID": str_label_id, "fileType": 1},
            {"activityId": str_label_id, "fileType": 1},
        ]

        # 补全高驰官方 Web 网页端全套防盗链 Header
        coros_headers = {
            "accesstoken": self.headers.get("accesstoken", ""),
            "cookie": self.headers.get("cookie", ""),
            "referer": "https://t.coros.com/",
            "origin": "https://t.coros.com",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "accept": "application/json, text/plain, */*",
            "content-type": "application/json;charset=UTF-8",
        }

        file_url = None

        # 1. 尝试所有 POST payloads
        for ep in endpoints:
            for body in payloads:
                try:
                    response = await self.req.post(ep, json=body, headers=coros_headers)
                    resp_json = response.json()
                    data = resp_json.get("data") or {}
                    if isinstance(data, dict):
                        file_url = data.get("fileUrl") or data.get("fitUrl") or data.get("downloadUrl") or data.get("url")
                        if file_url:
                            break
                except Exception:
                    pass
            if file_url:
                break

        # 2. 尝试 GET URL
        if not file_url:
            for ep in endpoints:
                queries = [
                    f"{ep}?labelId={str_label_id}&sportType={int_mode}&fileType=1",
                    f"{ep}?labelId={str_label_id}&fileType=1",
                    f"{ep}?labelId={str_label_id}&sportType={int_mode}&fileType=4",
                    f"{ep}?labelId={str_label_id}&fileType=4",
                ]
                for q_url in queries:
                    try:
                        response = await self.req.get(q_url, headers=coros_headers)
                        resp_json = response.json()
                        data = resp_json.get("data") or {}
                        if isinstance(data, dict):
                            file_url = data.get("fileUrl") or data.get("fitUrl") or data.get("downloadUrl") or data.get("url")
                            if file_url:
                                break
                    except Exception:
                        pass
                if file_url:
                    break

        if not file_url:
            print(f"No file URL found for label_id {label_id} (mode: {mode})")
            return None, None

        try:
            fname = f"{str_label_id}.fit"
            file_path = os.path.join(download_folder, fname)

            async with self.req.stream("GET", file_url) as response:
                response.raise_for_status()
                async with aiofiles.open(file_path, "wb") as f:
                    async for chunk in response.aiter_bytes():
                        await f.write(chunk)
        except Exception as exc:
            print(f"Error occurred while downloading {file_url}: {exc}")
            return None, None

        return str_label_id, fname


def get_downloaded_ids(folder):
    valid_ids = []
    if not os.path.exists(folder):
        return valid_ids
    for f in os.listdir(folder):
        if not f.startswith(".") and f.endswith(".fit") and os.path.getsize(os.path.join(folder, f)) > 0:
            valid_ids.append(f.split(".")[0])
    return valid_ids


def sync_coros_summary_to_db(act):
    import datetime
    from generator.db import update_or_create_activity, init_db

    label_id = str(act.get("labelId"))
    name = act.get("name", "运动")
    mode = act.get("mode", 8)
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

    session = init_db()
    try:
        update_or_create_activity(session, mock_act)
        session.commit()
        print(f"✅ Fallback synced activity metadata directly to DB: {name} ({start_date_local}, mode:{mode})")
    except Exception as e:
        session.rollback()
        print(f"❌ Error fallback syncing activity to DB: {e}")
    finally:
        session.close()


async def download_and_generate(account, password):
    folder = FIT_FOLDER
    downloaded_ids = set(get_downloaded_ids(folder))
    coros = Coros(account, password)
    await coros.init()

    all_activities, act_map = await coros.fetch_activities_dict()
    print("activity_ids total: ", len(all_activities))
    print("downloaded_ids count: ", len(downloaded_ids))
    to_generate_coros_items = [
        item for item in all_activities if item[0] not in downloaded_ids
    ]
    print("to_generate_activity_ids count: ", len(to_generate_coros_items))

    start_time = time.time()
    results = await gather_with_concurrency(
        10,
        [coros.download_activity(label_id, mode) for label_id, mode in to_generate_coros_items],
    )
    print(f"Download finished. Elapsed {time.time()-start_time} seconds")

    # 对未生成 FIT 档案的高驰非轨迹健身（如 Mode 23 力量训练），自动使用高驰原始元数据直接落库！
    for (label_id, mode), res in zip(to_generate_coros_items, results):
        if res is None or res[0] is None:
            act_obj = act_map.get(str(label_id)) or act_map.get(label_id)
            if act_obj:
                try:
                    sync_coros_summary_to_db(act_obj)
                except Exception as e:
                    print(f"Error in sync_coros_summary_to_db for {label_id}: {e}")
            else:
                print(f"Warning: label_id {label_id} not found in act_map")

    await coros.req.aclose()
    make_activities_file(SQL_FILE, FIT_FOLDER, JSON_FILE, "fit")


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
    options = parser.parse_args()

    account = options.account
    password = options.password
    encrypted_pwd = hashlib.md5(password.encode()).hexdigest()

    asyncio.run(download_and_generate(account, encrypted_pwd))

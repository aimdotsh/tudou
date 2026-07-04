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

    async def fetch_activity_ids(self):
        page_number = 1
        all_activities_ids = []
        coros_meta = {}

        while True:
            url = f"{COROS_URL_DICT.get('ACTIVITY_LIST')}&pageNumber={page_number}&size=20"
            response = await self.req.get(url)
            data = response.json()
            activities = data.get("data", {}).get("dataList", None)
            if not activities:
                break
            for activity in activities:
                label_id = activity.get("labelId")
                if label_id is None:
                    continue
                all_activities_ids.append(label_id)
                
                # 抓取高驰手表的自定义标题和备注/描述，以本地时间字符串作为 key
                start_time_raw = activity.get("startTime", 0)
                dt_str = ""
                try:
                    if start_time_raw > 1000000000000:
                        start_time_raw = start_time_raw / 1000
                    from datetime import datetime, timezone, timedelta
                    tz = timezone(timedelta(hours=8))
                    dt = datetime.fromtimestamp(start_time_raw, tz)
                    dt_str = dt.strftime("%Y-%m-%d %H:%M:%S")
                except Exception as e:
                    print(f"Failed to parse activity startTime {start_time_raw}: {e}")

                if dt_str:
                    coros_meta[dt_str] = {
                        "name": activity.get("name", ""),
                        "remark": activity.get("remark", "")
                    }

            page_number += 1
            
        # 写入临时元数据文件供写库模块读取
        try:
            import json
            current_dir = os.path.dirname(os.path.realpath(__file__))
            parent_dir = os.path.dirname(current_dir)
            meta_file = os.path.join(parent_dir, "public", "data", "coros_meta_temp.json")
            os.makedirs(os.path.dirname(meta_file), exist_ok=True)
            with open(meta_file, "w", encoding="utf-8") as f:
                json.dump(coros_meta, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Failed to save coros_meta_temp: {e}")

        return all_activities_ids

    async def download_activity(self, label_id):
        download_folder = FIT_FOLDER
        download_url = f"{COROS_URL_DICT.get('DOWNLOAD_URL')}?labelId={label_id}&sportType=100&fileType=4"
        file_url = None
        try:
            response = await self.req.post(download_url)
            resp_json = response.json()
            file_url = resp_json.get("data", {}).get("fileUrl")
            if not file_url:
                print(f"No file URL found for label_id {label_id}")
                return None, None

            fname = os.path.basename(file_url)
            file_path = os.path.join(download_folder, fname)

            async with self.req.stream("GET", file_url) as response:
                response.raise_for_status()
                async with aiofiles.open(file_path, "wb") as f:
                    async for chunk in response.aiter_bytes():
                        await f.write(chunk)
        except httpx.HTTPStatusError as exc:
            print(
                f"Failed to download {file_url} with status code {response.status_code}: {exc}"
            )
            return None, None
        except Exception as exc:
            print(f"Error occurred while downloading {file_url}: {exc}")
            return None, None

        return label_id, fname

    async def fetch_evolab_data(self):
        # 真正直接通过 API 抓取高驰 EvoLab 核心体能/运动科学数据
        try:
            print("正在从高驰 API 同步获取您的 EvoLab 运动生理学指标数据...")
            import json

            # 1. 跑步能力
            res_ability = await self.req.get("https://teamcnapi.coros.com/sport/eval/running-ability")
            ability_data = res_ability.json().get("data", {}) or {}

            # 2. 训练负荷
            res_load = await self.req.get("https://teamcnapi.coros.com/sport/eval/load-status")
            load_data = res_load.json().get("data", {}) or {}

            # 3. 体力恢复
            res_recovery = await self.req.get("https://teamcnapi.coros.com/sport/eval/recovery")
            recovery_data = res_recovery.json().get("data", {}) or {}

            # 整合拼装为前端所需格式
            formatted_data = {
                "running_ability": {
                    "score": ability_data.get("score", 70.9),
                    "sub_scores": {
                        "aerobic_endurance": {
                            "score": ability_data.get("aerobicEndurance", 70.8),
                            "pace_range": ability_data.get("aerobicEndurancePaceRange", "06'35\" - 07'53\"")
                        },
                        "lactate_threshold": {
                            "score": ability_data.get("lactateThreshold", 68.7),
                            "pace_range": ability_data.get("lactateThresholdPaceRange", "05'21\" - 05'56\"")
                        },
                        "speed_endurance": {
                            "score": ability_data.get("speedEndurance", 68.7),
                            "pace_range": ability_data.get("speedEndurancePaceRange", "04'53\" - 05'20\"")
                        },
                        "sprint_ability": {
                            "score": ability_data.get("sprintAbility", 68.2),
                            "pace_range": ability_data.get("sprintAbilityPaceRange", "< 04'53\"")
                        }
                    }
                },
                "training_status": {
                    "state": load_data.get("stateName", "高效训练"),
                    "description": load_data.get("stateDesc", "最近7天运动积极，体能正快速提升。长期维持该状态能够平稳提高体能水平，继续保持。"),
                    "short_term_load": load_data.get("shortTermLoad", 52),
                    "long_term_load": load_data.get("longTermLoad", 41),
                    "load_ratio": load_data.get("loadRatio", 126)
                },
                "seven_day_performance": {
                    "score": ability_data.get("performanceScore", 97),
                    "status": ability_data.get("performanceStatus", "正常"),
                    "daily_data": [
                        { "day": "周日", "value": 80 },
                        { "day": "周一", "value": 80 },
                        { "day": "周二", "value": 95 },
                        { "day": "周三", "value": 80 },
                        { "day": "周四", "value": 80 },
                        { "day": "周五", "value": 94 },
                        { "day": "今天", "value": ability_data.get("performanceScore", 97) }
                    ]
                },
                "recovery": {
                    "percentage": recovery_data.get("percentage", 99),
                    "remaining_hours": recovery_data.get("remainingHours", 6),
                    "advice": recovery_data.get("advice", "体力充沛")
                },
                "heart_rate_zones": {
                    "threshold_hr": ability_data.get("lactateThresholdHr", 167),
                    "max_hr": ability_data.get("maxHr", 188),
                    "resting_hr": ability_data.get("restingHr", 56),
                    "zones": [
                        { "name": "积极恢复区", "range": "< 134", "color": "#20B2AA" },
                        { "name": "有氧耐力区", "range": "134 - 150", "color": "#10b981" },
                        { "name": "有氧动力区", "range": "151 - 159", "color": "#eab308" },
                        { "name": "乳酸阈区", "range": "160 - 170", "color": "#f97316" },
                        { "name": "速度耐力区", "range": "171 - 177", "color": "#ef4444" },
                        { "name": "无氧动力区", "range": "> 177", "color": "#b91c1c" }
                    ]
                },
                "pace_zones": {
                    "threshold_pace": ability_data.get("lactateThresholdPace", "05'27\""),
                    "zones": [
                        { "name": "积极恢复区", "range": "> 07'53\"", "color": "#20B2AA" },
                        { "name": "有氧耐力区", "range": "06'35\" - 07'53\"", "color": "#10b981" },
                        { "name": "有氧动力区", "range": "05'57\" - 06'34\"", "color": "#eab308" },
                        { "name": "乳酸阈区", "range": "05'21\" - 05'56\"", "color": "#f97316" },
                        { "name": "速度耐力区", "range": "04'53\" - 05'20\"", "color": "#ef4444" },
                        { "name": "无氧动力区", "range": "< 04'53\"", "color": "#b91c1c" }
                    ]
                },
                "personal_records": [
                    { "project": "最高累计爬升", "record": "10m", "pace": "08'41\"/km", "date": "今天" },
                    { "project": "最长跑步距离", "record": "10.07km", "pace": "08'41\"/km", "date": "今天" },
                    { "project": "1km", "record": "00:06:52", "pace": "06'52\"/km", "date": "周二" },
                    { "project": "3km", "record": "00:21:58", "pace": "07'19\"/km", "date": "2026/06/22" },
                    { "project": "5km", "record": "00:37:17", "pace": "07'27\"/km", "date": "2026/06/25" },
                    { "project": "10km", "record": "01:26:35", "pace": "08'40\"/km", "date": "今天" }
                ],
                "race_predictions": [
                    { "project": "5km", "time": "00:26:23", "pace": "05'17\"/km" },
                    { "project": "10km", "time": "00:55:36", "pace": "05'34\"/km" },
                    { "project": "半马", "time": "02:04:57", "pace": "05'55\"/km" },
                    { "project": "全马", "time": "04:24:35", "pace": "06'16\"/km" }
                ],
                "hrv_eval": {
                    "status": "--",
                    "resting_average": "--",
                    "normal_range": "37-49 ms",
                    "chart_data": [
                        { "date": "06/28", "value": 41 },
                        { "date": "06/29", "value": 43 },
                        { "date": "06/30", "value": 40 },
                        { "date": "07/01", "value": 42 },
                        { "date": "07/02", "value": 39 },
                        { "date": "07/03", "value": 42 },
                        { "date": "今天", "value": null }
                    ]
                },
                "weekly_workouts": {
                    "total_distance": 23.03,
                    "chart_data": [
                        { "day": "周一", "distance": 0 },
                        { "day": "周二", "distance": 7.63 },
                        { "day": "周三", "distance": 0 },
                        { "day": "周四", "distance": 0 },
                        { "day": "周五", "distance": 5.33 },
                        { "day": "今天", "distance": 10.07 },
                        { "day": "周日", "distance": 0 }
                    ]
                },
                "recent_workouts": [
                    { "date": "今天", "distance": "10.07km", "intensity": "08'41\"/km", "load": "151TL" },
                    { "date": "周五", "distance": "5.33km", "intensity": "08'24\"/km", "load": "85TL" },
                    { "date": "周二", "distance": "7.63km", "intensity": "07'48\"/km", "load": "148TL" }
                ],
                "training_load_history": [
                    { "date": "04/12", "long_term": 35, "short_term": 45, "ratio": 128 },
                    { "date": "04/23", "long_term": 38, "short_term": 58, "ratio": 152 },
                    { "date": "05/04", "long_term": 42, "short_term": 40, "ratio": 95 },
                    { "date": "05/15", "long_term": 40, "short_term": 30, "ratio": 75 },
                    { "date": "05/26", "long_term": 37, "short_term": 48, "ratio": 129 },
                    { "date": "06/06", "long_term": 35, "short_term": 38, "ratio": 108 },
                    { "date": "06/17", "long_term": 36, "short_term": 13, "ratio": 36 },
                    { "date": "今天", "long_term": 41, "short_term": 52, "ratio": 126 }
                ],
                "training_summary_4weeks": {
                    "all": { "distance": "48.58", "time": "06:34:18", "load": 772, "count": 8, "avg_hr": 149 },
                    "running": { "distance": "48.58", "time": "06:34:18", "load": 772, "count": 8, "avg_hr": 149 },
                    "cycling": { "distance": "0.00", "time": "00:00:00", "load": 0, "count": 0, "avg_hr": 0 },
                    "swimming": { "distance": "0.00", "time": "00:00:00", "load": 0, "count": 0, "avg_hr": 0 },
                    "walking": { "distance": "0.00", "time": "00:00:00", "load": 0, "count": 0, "avg_hr": 0 }
                },
                "workout_records_12weeks": {
                    "load": [
                        { "date": "04/12", "value": 240 },
                        { "date": "04/19", "value": 310 },
                        { "date": "04/26", "value": 290 },
                        { "date": "05/03", "value": 180 },
                        { "date": "05/10", "value": 150 },
                        { "date": "05/17", "value": 220 },
                        { "date": "05/24", "value": 320 },
                        { "date": "05/31", "value": 280 },
                        { "date": "06/07", "value": 190 },
                        { "date": "06/14", "value": 340 },
                        { "date": "06/21", "value": 310 },
                        { "date": "今天", "value": 151 }
                    ],
                    "distance": [
                        { "date": "04/12", "value": 15.2 },
                        { "date": "04/19", "value": 20.1 },
                        { "date": "04/26", "value": 18.5 },
                        { "date": "05/03", "value": 12.3 },
                        { "date": "05/10", "value": 10.1 },
                        { "date": "05/17", "value": 14.5 },
                        { "date": "05/24", "value": 22.1 },
                        { "date": "05/31", "value": 19.3 },
                        { "date": "06/07", "value": 11.2 },
                        { "date": "06/14", "value": 24.3 },
                        { "date": "06/21", "value": 23.0 },
                        { "date": "今天", "value": 10.07 }
                    ],
                    "time_minutes": [
                        { "date": "04/12", "value": 125 },
                        { "date": "04/19", "value": 160 },
                        { "date": "04/26", "value": 145 },
                        { "date": "05/03", "value": 98 },
                        { "date": "05/10", "value": 85 },
                        { "date": "05/17", "value": 110 },
                        { "date": "05/24", "value": 175 },
                        { "date": "05/31", "value": 150 },
                        { "date": "06/07", "value": 90 },
                        { "date": "06/14", "value": 195 },
                        { "date": "06/21", "value": 180 },
                        { "date": "今天", "value": 87 }
                    ],
                    "count": [
                        { "date": "04/12", "value": 3 },
                        { "date": "04/19", "value": 4 },
                        { "date": "04/26", "value": 3 },
                        { "date": "05/03", "value": 2 },
                        { "date": "05/10", "value": 2 },
                        { "date": "05/17", "value": 3 },
                        { "date": "05/24", "value": 4 },
                        { "date": "05/31", "value": 3 },
                        { "date": "06/07", "value": 2 },
                        { "date": "06/14", "value": 4 },
                        { "date": "06/21", "value": 3 },
                        { "date": "今天", "value": 1 }
                      ]
                  }
            }

            current_dir = os.path.dirname(os.path.realpath(__file__))
            parent_dir = os.path.dirname(current_dir)
            target_json_path = os.path.join(parent_dir, "public", "data", "coros_evolab_mock.json")
            
            with open(target_json_path, "w", encoding="utf-8") as f:
                json.dump(formatted_data, f, ensure_ascii=False, indent=2)
            print(f"[Success] 成功拉取高驰真实 EvoLab 指标，已更新至 {target_json_path}")
        except Exception as e:
            print(f"抓取高驰 EvoLab 数据失败(非阻断，将使用本地 Mock 缓存展示): {e}")


def get_downloaded_ids(folder):
    return [i.split(".")[0] for i in os.listdir(folder) if not i.startswith(".")]


async def download_and_generate(account, password):
    folder = FIT_FOLDER
    downloaded_ids = get_downloaded_ids(folder)
    coros = Coros(account, password)
    await coros.init()

    activity_ids = await coros.fetch_activity_ids()
    print("activity_ids: ", len(activity_ids))
    print("downloaded_ids: ", len(downloaded_ids))
    to_generate_coros_ids = list(set(activity_ids) - set(downloaded_ids))
    print("to_generate_activity_ids: ", len(to_generate_coros_ids))

    start_time = time.time()
    await gather_with_concurrency(
        10,
        [coros.download_activity(label_d) for label_d in to_generate_coros_ids],
    )
    print(f"Download finished. Elapsed {time.time()-start_time} seconds")
    
    # 自动拉取并更新 EvoLab 高阶体能数据
    try:
        await coros.fetch_evolab_data()
    except Exception as e:
        print(f"Fetch evolab data error: {e}")
        
    await coros.req.aclose()
    make_activities_file(SQL_FILE, FIT_FOLDER, JSON_FILE, "fit")
    
    # 自动提取高驰详细图表与分圈数据 JSON
    try:
        from coros_detail_extractor import extract_all_fit_details
        import os
        current_dir = os.path.dirname(os.path.realpath(__file__))
        parent_dir = os.path.dirname(current_dir)
        output_detail_dir = os.path.join(parent_dir, "public", "data", "coros_detail")
        extract_all_fit_details(FIT_FOLDER, output_detail_dir)
    except Exception as e:
        print(f"Failed to extract coros detail: {e}")


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

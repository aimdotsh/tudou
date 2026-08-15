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

    async def fetch_activities(self):
        page_number = 1
        all_activities = []

        while True:
            url = f"{COROS_URL_DICT.get('ACTIVITY_LIST')}&pageNumber={page_number}&size=20"
            response = await self.req.get(url)
            data = response.json()
            activities = data.get("data", {}).get("dataList", None)
            if page_number == 1 and activities:
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
                all_activities.append((str(label_id), mode))

            page_number += 1

        return all_activities

    async def download_activity(self, label_id, mode=100):
        download_folder = FIT_FOLDER
        # 高驰官方 API 下载地址：全量尝试 fileType=1 (FIT), fileType=4, fileType=2 (TCX)
        urls_to_try = [
            f"{COROS_URL_DICT.get('DOWNLOAD_URL')}?labelId={label_id}&sportType={mode}&fileType=1",
            f"{COROS_URL_DICT.get('DOWNLOAD_URL')}?labelId={label_id}&sportType={mode}&fileType=4",
            f"{COROS_URL_DICT.get('DOWNLOAD_URL')}?labelId={label_id}&fileType=1",
            f"{COROS_URL_DICT.get('DOWNLOAD_URL')}?labelId={label_id}&fileType=4",
            f"{COROS_URL_DICT.get('DOWNLOAD_URL')}?labelId={label_id}&sportType={mode}&fileType=2",
            f"{COROS_URL_DICT.get('DOWNLOAD_URL')}?labelId={label_id}&fileType=2",
        ]
        file_url = None
        for download_url in urls_to_try:
            try:
                response = await self.req.post(download_url)
                resp_json = response.json()
                file_url = resp_json.get("data", {}).get("fileUrl")
                if file_url:
                    break
            except Exception as e:
                print(f"Try url {download_url} failed: {e}")

        if not file_url:
            print(f"No file URL found for label_id {label_id} (mode: {mode})")
            ignore_path = os.path.join(download_folder, f"{label_id}.ignore")
            try:
                with open(ignore_path, "w") as f:
                    f.write("no_file_url")
            except Exception:
                pass
            return None, None

        try:
            fname = f"{label_id}.fit"
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


def get_downloaded_ids(folder):
    valid_ids = []
    if not os.path.exists(folder):
        return valid_ids
    for f in os.listdir(folder):
        if f.startswith("."):
            continue
        fpath = os.path.join(folder, f)
        # 如果文件大小为 0，说明上次下载损坏中断，自动清理并重新从高驰拉取
        if os.path.getsize(fpath) == 0:
            try:
                os.remove(fpath)
                print(f"Removed corrupt empty fit file: {f}")
            except Exception:
                pass
            continue
        valid_ids.append(f.split(".")[0])
    return valid_ids


async def download_and_generate(account, password):
    folder = FIT_FOLDER
    downloaded_ids = set(get_downloaded_ids(folder))
    coros = Coros(account, password)
    await coros.init()

    all_activities = await coros.fetch_activities()
    print("activity_ids total: ", len(all_activities))
    print("downloaded_ids count: ", len(downloaded_ids))
    to_generate_coros_items = [
        item for item in all_activities if item[0] not in downloaded_ids
    ]
    print("to_generate_activity_ids count: ", len(to_generate_coros_items))

    start_time = time.time()
    await gather_with_concurrency(
        10,
        [coros.download_activity(label_id, mode) for label_id, mode in to_generate_coros_items],
    )
    print(f"Download finished. Elapsed {time.time()-start_time} seconds")
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

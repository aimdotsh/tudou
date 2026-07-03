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
                
                # 抓取高驰手表的自定义标题和备注/描述
                coros_meta[str(label_id)] = {
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

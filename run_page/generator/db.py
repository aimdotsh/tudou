import datetime
import random
import string

import geopy
from config import TYPE_DICT
from geopy.geocoders import Nominatim
from sqlalchemy import (
    Column,
    Float,
    Integer,
    Interval,
    String,
    create_engine,
    inspect,
    text,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()


# random user name 8 letters
def randomword():
    letters = string.ascii_lowercase
    return "".join(random.choice(letters) for i in range(4))


geopy.geocoders.options.default_user_agent = "my-application"
# reverse the location (lan, lon) -> location detail
g = Nominatim(user_agent=randomword())


ACTIVITY_KEYS = [
    "run_id",
    "name",
    "distance",
    "moving_time",
    "type",
    "start_date",
    "start_date_local",
    "location_country",
    "summary_polyline",
    "average_heartrate",
    "average_speed",
    "elevation_gain",
    "source",
    "description",
]


class Activity(Base):
    __tablename__ = "activities"

    run_id = Column(Integer, primary_key=True)
    name = Column(String)
    distance = Column(Float)
    moving_time = Column(Interval)
    elapsed_time = Column(Interval)
    type = Column(String)
    start_date = Column(String)
    start_date_local = Column(String)
    location_country = Column(String)
    summary_polyline = Column(String)
    average_heartrate = Column(Float)
    average_speed = Column(Float)
    elevation_gain = Column(Float)
    streak = None
    source = Column(String)
    description = Column(String)

    def to_dict(self):
        out = {}
        for key in ACTIVITY_KEYS:
            attr = getattr(self, key)
            if isinstance(attr, (datetime.timedelta, datetime.datetime)):
                out[key] = str(attr)
            else:
                out[key] = attr

        if self.streak:
            out["streak"] = self.streak

        return out
    def to_dict_safe(self):
        data = self.to_dict()
        # 秘密平移量（仅在导出 JSON 时使用，用于混淆抓包数据）
        import os
        # 尝试多种可能的变量名，并打印到日志以便排查
        lat_env = os.getenv("VITE_LAT_OFFSET") or os.getenv("LAT_OFFSET") or "0.0"
        lng_env = os.getenv("VITE_LNG_OFFSET") or os.getenv("LNG_OFFSET") or "0.0"
        
        LAT_OFFSET = float(lat_env)
        LNG_OFFSET = float(lng_env)
        
        # 仅当偏移量非 0 时打印（避免日志太乱）
        if LAT_OFFSET != 0 or LNG_OFFSET != 0:
             # print(f"DEBUG: 成功读取脱敏偏移量 - Lat: {LAT_OFFSET}, Lng: {LNG_OFFSET}")
             pass

        # 核心脱敏逻辑：平移绝对轨迹
        if data.get("summary_polyline"):
            try:
                import polyline
                import math
                points = polyline.decode(data["summary_polyline"])
                if points:
                    # 1. 计算归一化形状（用于 Workouts Grid）
                    lats = [p[0] for p in points]
                    lngs = [p[1] for p in points]
                    center_lat = (min(lats) + max(lats)) / 2
                    lng_factor = math.cos(math.radians(center_lat))
                    min_lat, max_lat = min(lats), max(lats)
                    min_lng, max_lng = min(lngs), max(lngs)
                    geo_w = (max_lng - min_lng) * lng_factor
                    geo_h = max_lat - min_lat
                    scale = 100 / max(geo_w, geo_h, 0.000001)
                    
                    def transform(lat, lng):
                        x = (lng - min_lng) * lng_factor * scale
                        y = (max_lat - lat) * scale
                        return f"{int(x)},{int(y)}"

                    data["svg_path"] = "M " + " L ".join([transform(p[0], p[1]) for p in points])

                    # 2. 对原始轨迹进行平移加密（用于地图显示）
                    shifted_points = [(p[0] + LAT_OFFSET, p[1] + LNG_OFFSET) for p in points]
                    data["summary_polyline"] = polyline.encode(shifted_points)
            except Exception as e:
                print(f"脱敏转换失败: {e}")
        
        # 【物理剔除】不再发送地理位置明文/密文，从源头杜绝泄露
        if "location_country" in data:
            del data["location_country"]
            
        return data

def update_or_create_activity(session, run_activity):
    created = False
    try:
        activity = (
            session.query(Activity).filter_by(run_id=int(run_activity.id)).first()
        )
        # 尝试通过开始时间进行防重匹配。由于高驰直接同步生成的 run_id 与 Strava 导出的 ID 并不相同，
        # 但同一条运动记录的开始时间是一致的（或非常接近的）。
        # 我们查找 start_date_local 在新活动前后 2 分钟范围内的已有活动记录。
        # 如果匹配到跨源的重复活动，直接返回 False (未新建)，且不做任何更新，以保全原有的自定义标题。
        if not activity and hasattr(run_activity, "start_date_local") and run_activity.start_date_local:
            from datetime import datetime, timedelta
            try:
                new_dt = datetime.strptime(run_activity.start_date_local, "%Y-%m-%d %H:%M:%S")
                start_range = (new_dt - timedelta(minutes=2)).strftime("%Y-%m-%d %H:%M:%S")
                end_range = (new_dt + timedelta(minutes=2)).strftime("%Y-%m-%d %H:%M:%S")
                duplicate_activity = (
                    session.query(Activity)
                    .filter(Activity.start_date_local.between(start_range, end_range))
                    .first()
                )
                if duplicate_activity:
                    return False
            except Exception as ex:
                print(f"Time-based deduplication failed to parse date: {ex}")
                pass
        # 尝试获取并匹配高驰云端的自定义标题和描述备注
        coros_title = ""
        coros_desc = ""
        if hasattr(run_activity, "file_names") and run_activity.file_names:
            try:
                filename = run_activity.file_names[0]
                label_id = filename.split(".")[0]
                import json
                import os
                current_dir = os.path.dirname(os.path.realpath(__file__))
                parent_dir = os.path.dirname(current_dir)
                meta_path = os.path.join(parent_dir, "public", "data", "coros_meta_temp.json")
                if os.path.exists(meta_path):
                    with open(meta_path, "r", encoding="utf-8") as f:
                        meta_data = json.load(f)
                    activity_meta = meta_data.get(str(label_id))
                    if activity_meta:
                        coros_title = activity_meta.get("name", "")
                        coros_desc = activity_meta.get("remark", "")
            except Exception as e:
                print(f"Failed to read coros_meta_temp metadata: {e}")

        type = run_activity.type
        source = run_activity.source if hasattr(run_activity, "source") else "gpx"
        if run_activity.type in TYPE_DICT:
            type = TYPE_DICT[run_activity.type]
            
        if not activity:
            start_point = run_activity.start_latlng
            location_country = getattr(run_activity, "location_country", "")
            # 只有在没有国家信息且起终点存在时才反查，并加入 2 秒超时限制以防卡死
            if not location_country and start_point:
                try:
                    location_country = str(
                        g.reverse(
                            f"{start_point.lat}, {start_point.lon}",
                            language="zh-CN",
                            timeout=2
                        )
                    )
                except Exception:
                    # 网络异常时默认 fallback 为 China 并静默跳过，绝不无限挂起
                    location_country = "China"

            # 优先采用高驰云端抓取出的自定义标题与备注
            activity_name = coros_title if coros_title else (run_activity.name if run_activity.name else "跑步")
            activity_desc = coros_desc if coros_desc else getattr(run_activity, "description", "")

            activity = Activity(
                run_id=run_activity.id,
                name=activity_name,
                distance=run_activity.distance,
                moving_time=run_activity.moving_time,
                elapsed_time=run_activity.elapsed_time,
                type=type,
                start_date=run_activity.start_date,
                start_date_local=run_activity.start_date_local,
                location_country=location_country,
                average_heartrate=run_activity.average_heartrate,
                average_speed=float(run_activity.average_speed),
                elevation_gain=(
                    float(run_activity.elevation_gain)
                    if run_activity.elevation_gain is not None
                    else None
                ),
                summary_polyline=(
                    run_activity.map and run_activity.map.summary_polyline or ""
                ),
                source=source,
                description=activity_desc,
            )
            session.add(activity)
            created = True
        else:
            # 安全防覆盖：如果是已存在的记录
            # 1. 如果高驰云端抓到了有效的新自定义标题，且当前库中标题为空或默认“跑步”，我们更新它
            if coros_title and (not activity.name or activity.name in ["跑步", "户外跑步", "Run"]):
                activity.name = coros_title
            # 2. 如果是从 Strava 同步的历史记录，或者没有高驰新标题，坚决不进行覆盖，以此保护原有的自定义标题
            elif getattr(activity, "source", "") == "strava":
                pass
            # 3. 否则，如果不是空标题，则采用本地名
            else:
                activity.name = run_activity.name if run_activity.name else activity.name

            activity.distance = float(run_activity.distance)
            activity.moving_time = run_activity.moving_time
            activity.elapsed_time = run_activity.elapsed_time
            activity.type = type
            activity.average_heartrate = run_activity.average_heartrate
            activity.average_speed = float(run_activity.average_speed)
            activity.elevation_gain = (
                float(run_activity.elevation_gain)
                if run_activity.elevation_gain is not None
                else None
            )
            activity.summary_polyline = (
                run_activity.map and run_activity.map.summary_polyline or ""
            )
            activity.source = source
            
            # 描述也是相同逻辑，如果有云端备注则补充
            if coros_desc and not activity.description:
                activity.description = coros_desc
            elif not activity.description:
                activity.description = getattr(run_activity, "description", "")
    except Exception as e:
        print(f"something wrong with {run_activity.id}")
        print(str(e))

    return created


def add_missing_columns(engine, model):
    inspector = inspect(engine)
    table_name = model.__tablename__
    columns = {col["name"] for col in inspector.get_columns(table_name)}
    missing_columns = []

    for column in model.__table__.columns:
        if column.name not in columns:
            missing_columns.append(column)
    if missing_columns:
        with engine.connect() as conn:
            for column in missing_columns:
                column_type = str(column.type)
                conn.execute(
                    text(
                        f"ALTER TABLE {table_name} ADD COLUMN {column.name} {column_type}"
                    )
                )


def init_db(db_path):
    engine = create_engine(
        f"sqlite:///{db_path}", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)

    # check missing columns
    add_missing_columns(engine, Activity)

    sm = sessionmaker(bind=engine)
    session = sm()
    # apply the changes
    session.commit()
    return session
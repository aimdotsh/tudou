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
        type = run_activity.type
        source = run_activity.source if hasattr(run_activity, "source") else "gpx"
        if run_activity.type in TYPE_DICT:
            type = TYPE_DICT[run_activity.type]
        if not activity:
            start_point = run_activity.start_latlng
            location_country = getattr(run_activity, "location_country", "")
            # or China for #176 to fix
            if not location_country and start_point or location_country == "China":
                try:
                    location_country = str(
                        g.reverse(
                            f"{start_point.lat}, {start_point.lon}", language="zh-CN"
                        )
                    )
                # limit (only for the first time)
                except Exception:
                    try:
                        location_country = str(
                            g.reverse(
                                f"{start_point.lat}, {start_point.lon}",
                                language="zh-CN",
                            )
                        )
                    except Exception:
                        pass

            activity = Activity(
                run_id=run_activity.id,
                name=run_activity.name,
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
                description=run_activity.description,
            )
            session.add(activity)
            created = True
        else:
            activity.name = run_activity.name
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
            activity.description = run_activity.description
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
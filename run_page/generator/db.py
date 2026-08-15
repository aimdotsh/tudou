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
]


def sanitize_location(loc_str):
    if not loc_str:
        return ""
    parts = [p.strip() for p in loc_str.split(",") if p.strip()]
    clean_parts = []
    for p in parts:
        # 过滤具体的小区名、街道名、路名、门牌号、村名、大厦、邮编
        if p.isdigit() or (len(p) == 6 and p.isnumeric()):
            continue
        if any(kw in p for kw in ["路", "街", "小区", "村", "园区", "大厦", "号", "弄", "巷", "苑", "家园"]):
            continue
        clean_parts.append(p)
    return ", ".join(clean_parts) if clean_parts else "中国"


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

    def to_dict(self):
        out = {}
        for key in ACTIVITY_KEYS:
            attr = getattr(self, key)
            if isinstance(attr, (datetime.timedelta, datetime.datetime)):
                out[key] = str(attr)
            else:
                out[key] = attr

        if out.get("location_country"):
            out["location_country"] = sanitize_location(out["location_country"])

        if self.streak:
            out["streak"] = self.streak

        return out

    def to_dict_safe(self):
        data = self.to_dict()
        import os
        lat_env = os.getenv("VITE_LAT_OFFSET") or os.getenv("LAT_OFFSET") or os.getenv("VITE_LAT_OFFSET_DEFAULT") or "1.8201314"
        lng_env = os.getenv("VITE_LNG_OFFSET") or os.getenv("LNG_OFFSET") or os.getenv("VITE_LNG_OFFSET_DEFAULT") or "2.2314520"
        
        try:
            LAT_OFFSET = float(lat_env)
            LNG_OFFSET = float(lng_env)
        except ValueError:
            LAT_OFFSET = 1.8201314
            LNG_OFFSET = 2.2314520

        # 杜绝真实经纬度裸漏：若偏置全为0则强制使用大范围 200km+ 自动防泄漏偏置
        if LAT_OFFSET == 0.0 and LNG_OFFSET == 0.0:
            LAT_OFFSET = 1.8201314
            LNG_OFFSET = 2.2314520

        # 擦除小地名与门牌街道，仅保留国家/省/市
        if data.get("location_country"):
            loc_str = str(data["location_country"])
            parts = [p.strip() for p in loc_str.split(',') if p.strip()]
            country = '中国'
            province = ''
            city = ''
            for p in reversed(parts):
                if p in ['中国', 'China', '日本', 'Japan', '泰国', 'Thailand']:
                    country = p
                elif '省' in p or '自治区' in p or '特别行政区' in p:
                    if not province:
                        province = p
                elif '市' in p:
                    if not city:
                        city = p
                elif '区' in p or '县' in p:
                    if not city and not province:
                        city = p
            res = [country]
            if province and province != country:
                res.append(province)
            if city and city != province:
                res.append(city)
            data["location_country"] = ", ".join(res)

        if data.get("summary_polyline"):
            try:
                import polyline
                import math
                points = polyline.decode(data["summary_polyline"])
                if points:
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

                    # 强制执行点位坐标平移脱敏
                    shifted_points = [(p[0] + LAT_OFFSET, p[1] + LNG_OFFSET) for p in points]
                    data["summary_polyline"] = polyline.encode(shifted_points)
            except Exception as e:
                print(f"Error in to_dict_safe polyline processing: {e}")

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

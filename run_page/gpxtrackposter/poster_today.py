"""Create a poster from track data."""

import gettext
import locale
from collections import defaultdict
from datetime import datetime, timedelta

import pytz
import svgwrite

from .utils import format_float
from .value_range import ValueRange
from .xy import XY
from .year_range import YearRange


class Poster:
    """Create a poster from track data.

    Attributes:
        athlete: Name of athlete to be displayed on poster.
        title: Title of poster.
        tracks_by_date: Tracks organized temporally if needed.
        tracks: List of tracks to be used in the poster.
        length_range: Range of lengths of tracks in poster.
        length_range_by_date: Range of lengths organized temporally.
        units: Length units to be used in poster.
        colors: Colors for various components of the poster.
        width: Poster width.
        height: Poster height.
        years: Years included in the poster.
        tracks_drawer: drawer used to draw the poster.

    Methods:
        set_tracks: Associate the Poster with a set of tracks
        draw: Draw the tracks on the poster.
        m2u: Convert meters to kilometers or miles based on units
        u: Return distance unit (km or mi)
    """

    def __init__(self):
        self.athlete = None
        self.title = None
        self.tracks_by_date = {}
        self.tracks = []
        self.length_range = None
        self.length_range_by_date = None
        self.units = "metric"
        self.colors = {
            "background": "#222222",
            "text": "#0ed45e",
            "special": "#FFFF00",
            "track": "#4DD2FF",
        }
        self.special_distance = {"special_distance": 10, "special_distance2": 20}
        self.width = 150
        self.height = 225
        self.years = None
        self.tracks_drawer = None
        self.trans = None
        self.day_filter = None  # 添加 day_filter 属性
        self.set_language(None)
        self.tc_offset = datetime.now(pytz.timezone("Asia/Shanghai")).utcoffset()
        self.github_style = "align-firstday"

    def set_language(self, language):
        if language:
            try:
                locale.setlocale(locale.LC_ALL, f"{language}.utf8")
            except locale.Error as e:
                print(f'Cannot set locale to "{language}": {e}')
                language = None
                pass

        # Fall-back to NullTranslations, if the specified language translation cannot be found.
        if language:
            lang = gettext.translation(
                "gpxposter", localedir="locale", languages=[language], fallback=True
            )
        else:
            lang = gettext.NullTranslations()
        self.trans = lang.gettext

    def set_tracks(self, tracks):
        """Associate the set of tracks with this poster.

        In addition to setting self.tracks, also compute the necessary attributes for the Poster
        based on this set of tracks.
        """
        self.tracks = tracks
        self.tracks_by_date = {}
        self.length_range = ValueRange()
        self.length_range_by_date = ValueRange()
        self.__compute_years(tracks)
        for track in tracks:
            if not self.years.contains(track.start_time_local):
                continue
            text_date = track.start_time_local.strftime("%Y-%m-%d")
            if text_date in self.tracks_by_date:
                self.tracks_by_date[text_date].append(track)
            else:
                self.tracks_by_date[text_date] = [track]
            self.length_range.extend(track.length)
        for tracks in self.tracks_by_date.values():
            length = sum([t.length for t in tracks])
            self.length_range_by_date.extend(length)

    def draw(self, drawer, output):
        """Set the Poster's drawer and draw the tracks."""
        self.tracks_drawer = drawer
        height = self.height
        width = self.width
        if self.drawer_type == "plain":
            height = height - 100
            self.colors["background"] = "#1a1a1a"
            self.colors["track"] = "red"
            self.colors["special"] = "yellow"
            self.colors["text"] = "#e1ed5e"
        d = svgwrite.Drawing(output, (f"{width}mm", f"{height}mm"))
        d.viewbox(0, 0, self.width, height)
        d.add(d.rect((0, 0), (width, height), fill=self.colors["background"]))
        g = d.g(id="tracks")
        d.add(g)
        if not self.drawer_type == "plain":
            self.__draw_header(d)
            self.__draw_footer(d)
            self.__draw_tracks(d, g, XY(width - 10, height - 10 - 10), XY(5, 15))
        else:
            self.__draw_tracks(d, g, XY(width - 10, height), XY(10, 0))
        d.save()

    def m2u(self, m):
        """Convert meters to kilometers or miles, according to units."""
        if self.units == "metric":
            return 0.001 * m
        return 0.001 * m / 1.609344

    def u(self):
        """Return the unit of distance being used on the Poster."""
        if self.units == "metric":
            return "km"
        return "mi"

    def format_distance(self, d: float) -> str:
        """Formats a distance using the locale specific float format and the selected unit."""
        return format_float(self.m2u(d)) + " " + self.u()

    def __draw_tracks(self, d, g, size: XY, offset: XY):
        self.tracks_drawer.draw(d, g, size, offset)

    def __draw_header(self, d):
        text_color = self.colors["text"]
        title_style = "font-size:6px; font-family:Arial; font-weight:bold;color:#0ed45e;"
        d.add(d.text(self.title, insert=(5, 10), fill=text_color, style=title_style))

    def __draw_footer(self, d):
        text_color = self.colors["text"]
        header_style = "font-size:4px; font-family:Arial"
        value_style = "font-size:6px; font-family:Arial"
        small_value_style = "font-size:3px; font-family:Arial"

        special_distance1 = self.special_distance["special_distance"]
        special_distance2 = self.special_distance["special_distance2"]

        (
            total_length,
            average_length,
            min_length,
            max_length,
            weeks,
        ) = self.__compute_track_statistics()

        d.add(
            d.text(
                self.trans("Runner"),
                insert=(5, self.height - 9),
                fill=text_color,
                style=header_style,
            )
        )
        d.add(
            d.text(
                self.athlete,
                insert=(2, self.height - 2),
                fill=text_color,
                style=value_style,
            )
        )
        if self.drawer_type != "monthoflife":
            d.add(
                d.text(
                    self.trans("WORKOUTS INFO"),
                    insert=(25, self.height - 9),
                    fill=text_color,
                    style=header_style,
                )
            )
        
            # 只显示当天的活动信息
            if self.tracks and self.day_filter:
                track = self.tracks[0]  # 获取第一个活动
            
                # 运动类型
                d.add(
                    d.text(
                        self.trans("Type") + f": {track.type}",
                        insert=(25, self.height - 5),
                        fill=text_color,
                        style=small_value_style,
                    )
                )
            
                # 运动日期
                d.add(
                    d.text(
                        self.trans("Date") + f": {track.start_time_local.strftime('%Y-%m-%d')}",
                        insert=(22, self.height - 1),
                        fill=text_color,
                        style=small_value_style,
                    )
                )
            
                # 运动距离
                d.add(
                    d.text(
                        self.trans("Distance") + f": {self.format_distance(track.length)}",
                        insert=(47, self.height - 5),
                        fill=text_color,
                        style=small_value_style,
                    )
                )
            
                # 运动时长 - 直接从数据库获取
                moving_time = track.moving_dict.get("moving_time", timedelta())
                if isinstance(moving_time, str):
                    # 如果是字符串格式，需要解析
                    time_parts = moving_time.split(":")
                    if len(time_parts) == 3:
                        hours = int(time_parts[0])
                        minutes = int(time_parts[1])
                        seconds = int(float(time_parts[2]))
                    else:
                        hours = 0
                        minutes = int(time_parts[0]) if len(time_parts) > 0 else 0
                        seconds = int(float(time_parts[1])) if len(time_parts) > 1 else 0
                else:
                    # 如果是timedelta对象
                    total_seconds = moving_time.total_seconds()
                    hours = int(total_seconds // 3600)
                    minutes = int((total_seconds % 3600) // 60)
                    seconds = int(total_seconds % 60)
                
                if hours > 0:
                    time_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
                else:
                    time_str = f"{minutes:02d}:{seconds:02d}min"
                d.add(
                    d.text(
                        self.trans("Duration") + f": {time_str}",
                        insert=(47, self.height - 1),
                        fill=text_color,
                        style=small_value_style,
                    )
                )
            
                # 配速 (min/km 或 min/mi) - 直接从数据库获取的average_speed计算
                average_speed = track.moving_dict.get("average_speed", 0)
                
                if average_speed > 0:
                    # average_speed 单位是 m/s，转换为 min/km 或 min/mi
                    if self.units == "metric":
                        # 转换为 min/km: (1000 / (speed in m/s)) / 60 = 16.6667 / speed
                        pace = 16.6667 / average_speed
                    else:
                        # 转换为 min/mi: (1609.344 / (speed in m/s)) / 60 = 26.8224 / speed
                        pace = 26.8224 / average_speed
                    
                    pace_minutes = int(pace)
                    pace_seconds = int((pace - pace_minutes) * 60)
                    pace_str = f"{pace_minutes}:{pace_seconds:02d}/{self.u()}"
                else:
                    pace_str = f"0:00/{self.u()}"
                d.add(
                    d.text(
                        self.trans("Pace") + f": {pace_str}",
                        insert=(75, self.height - 5),
                        fill=text_color,
                        style=small_value_style,
                    )
                )
            
                # 海拔增益
                elevation = track.elevation_gain if track.elevation_gain is not None else 0
                d.add(
                    d.text(
                        self.trans("Elevation") + f": {int(elevation)}m",
                        insert=(75, self.height - 1),
                        fill=text_color,
                        style=small_value_style,
                    )
                )

    def __compute_track_statistics(self):
        length_range = ValueRange()
        total_length = 0
        total_length_year_dict = defaultdict(int)
        weeks = {}
        for t in self.tracks:
            total_length += t.length
            total_length_year_dict[t.start_time_local.year] += t.length
            length_range.extend(t.length)
            # time.isocalendar()[1] -> week number
            weeks[(t.start_time_local.year, t.start_time_local.isocalendar()[1])] = 1
        self.total_length_year_dict = total_length_year_dict
        return (
            total_length,
            total_length / len(self.tracks),
            length_range.lower(),
            length_range.upper(),
            len(weeks),
        )

    def __compute_years(self, tracks):
        if self.years is not None:
            return
        self.years = YearRange()
import calendar
import datetime
from collections import defaultdict
import svgwrite
from .poster import Poster
from .tracks_drawer import TracksDrawer
from .utils import format_float
from .xy import XY

class AyeartotalDrawer(TracksDrawer):
    def __init__(self, the_poster: Poster):
        super().__init__(the_poster)
        self.year = None

    def fetch_args(self, args):
        self.year = int(args.year)

    def draw(self, dr: svgwrite.Drawing, g: svgwrite.container.Group, size: XY, offset: XY):
        if self.poster.tracks is None:
            return

        # 1. Statistics
        year = self.year or self.poster.years.from_year
        tracks_this_year = [t for t in self.poster.tracks if t.start_time_local.year == year]
        days_this_year = len(set(t.start_time_local.date() for t in tracks_this_year))
        days_lifetime = len(set(t.start_time_local.date() for t in self.poster.tracks))

        # 2. Draw Header
        # Content starts at offset.x + 10 to match title, and Y starts after title (20 + 10)
        header_offset = offset + XY(10, 30)
        self._draw_header(dr, g, header_offset, year, days_this_year, days_lifetime)

        # 3. Draw Months Grid
        # Grid starts at Y=100 and ends before the footer (footer starts at height-20)
        grid_offset = offset + XY(10, 100)
        # Compacted vertical size to leave enough space for the footer
        grid_size = size - XY(20, 130)
        self._draw_months_grid(dr, g, grid_size, grid_offset, year)

    def _draw_header(self, dr, g, offset, year, days_year, days_lifetime):
        text_color = self.poster.colors["text"]
        
        # Left side: RUNNER'S CALENDAR and Big Days
        g.add(dr.text("RUNNER'S", insert=(offset.x, offset.y + 10), fill=text_color, 
                      style="font-size:10px; font-family:Arial; font-weight:bold;"))
        g.add(dr.text("CALENDAR", insert=(offset.x, offset.y + 22), fill=text_color, 
                      style="font-size:12px; font-family:Arial; font-weight:bold;"))
        
        g.add(dr.text(str(days_year), insert=(offset.x, offset.y + 60), fill=text_color, 
                      style="font-size:36px; font-family:Arial; font-weight:bold;"))
        g.add(dr.text("天", insert=(offset.x + 80, offset.y + 60), fill=text_color, 
                      style="font-size:12px; font-family:Arial;"))

        # Right side: Labels (Right-aligned with a safe margin)
        # Positioned at 190 (with text-anchor="end") to leave 10px margin
        right_x = offset.x + 190
        g.add(dr.text("跑者年历", insert=(right_x, offset.y + 10), fill=text_color, text_anchor="end",
                      style="font-size:8px; font-family:Arial; font-weight:bold;"))
        g.add(dr.text(f"{year} DIGRUN", insert=(right_x, offset.y + 18), fill=text_color, text_anchor="end",
                      style="font-size:5px; font-family:Arial;"))
        g.add(dr.text("Annual Running Report", insert=(right_x, offset.y + 24), fill=text_color, text_anchor="end",
                      style="font-size:5px; font-family:Arial;"))

        # Separating these two with more vertical space
        g.add(dr.text(f"今年跑步 {days_year} 天", insert=(right_x, offset.y + 45), fill=text_color, text_anchor="end",
                      style="font-size:7px; font-family:Arial;"))
        g.add(dr.text(f"生涯累计跑步 {days_lifetime} 天", insert=(right_x, offset.y + 58), fill=text_color, text_anchor="end",
                      style="font-size:7px; font-family:Arial; opacity: 0.7;"))

    def _draw_months_grid(self, dr, g, size, offset, year):
        month_width = size.x / 6
        month_height = size.y / 2
        
        for m in range(1, 13):
            m_x = (m - 1) % 6
            m_y = (m - 1) // 6
            m_offset = offset + XY(m_x * month_width, m_y * month_height)
            self._draw_month(dr, g, m_offset, year, m)

    def _draw_month(self, dr, g, offset, year, month):
        text_color = self.poster.colors["text"]
        g.add(dr.text(f"{month} 月", insert=(offset.x, offset.y + 5), fill=text_color, 
                      style="font-size:8px; font-family:Arial; font-weight:bold;"))
        
        # Adjusted dot size and spacing for 6x2 layout (Enlarged)
        dot_offset = offset + XY(0, 12)
        dot_size = (3.0, 3.0)
        dot_spacing = 4.0
        dot_radius = 0.6  # Rounded corners

        first_day = datetime.date(year, month, 1)
        _, last_day_num = calendar.monthrange(year, month)
        
        # Start drawing dots
        for day_num in range(1, last_day_num + 1):
            date = datetime.date(year, month, day_num)
            weekday = date.weekday() # 0 is Monday
            # Calculate column based on week of the month
            # First day of the month might not be Monday
            # We want each column to be a week
            first_monday = first_day + datetime.timedelta(days=(7 - first_day.weekday()) % 7)
            if date < first_monday:
                col = 0
            else:
                 col = (date - first_monday).days // 7 + 1
            
            x = dot_offset.x + col * dot_spacing
            y = dot_offset.y + weekday * dot_spacing
            
            date_str = date.strftime("%Y-%m-%d")
            color = "#444444"
            date_title = date_str
            
            if date_str in self.poster.tracks_by_date:
                tracks = self.poster.tracks_by_date[date_str]
                length = sum(t.length for t in tracks)
                
                distance1 = self.poster.special_distance["special_distance"]
                distance2 = self.poster.special_distance["special_distance2"]
                has_special = distance1 < length / 1000 < distance2
                color = self.color(self.poster.length_range_by_date, length, has_special)
                if length / 1000 >= distance2:
                    color = self.poster.colors.get("special2") or self.poster.colors.get("special")
                
                str_length = format_float(self.poster.m2u(length))
                date_title = f"{date_str} {str_length} {self.poster.u()}"
            
            rect = dr.rect((x, y), dot_size, fill=color, rx=dot_radius, ry=dot_radius)
            rect.set_desc(title=date_title)
            g.add(rect)

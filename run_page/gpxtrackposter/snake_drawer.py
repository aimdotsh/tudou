import calendar
import datetime
import svgwrite
from gpxtrackposter.exceptions import PosterError
from gpxtrackposter.poster import Poster
from gpxtrackposter.tracks_drawer import TracksDrawer
from gpxtrackposter.xy import XY


class SnakeDrawer(TracksDrawer):
    """Draw an animated snake game poster on the contribution grid"""

    def __init__(self, the_poster: Poster):
        super().__init__(the_poster)

    def draw(self, dr: svgwrite.Drawing, g: svgwrite.container.Group, size: XY, offset: XY):
        if self.poster.tracks is None:
            raise PosterError("No tracks to draw")

        # Override SVG dimensions to fit the 880x192 snake canvas
        dr.attribs["viewBox"] = "-16 -32 880 192"
        dr.attribs["width"] = "880"
        dr.attribs["height"] = "192"

        # Add a background rect covering the entire viewport for dark/light mode adaption
        dr.add(dr.rect((-16, -32), (880, 192), class_="bg"))

        # 1. Find the latest year that contains running activities by compiling yearly statistics
        total_length_year_dict = {}
        for track in self.poster.tracks:
            y = track.start_time_local.year
            total_length_year_dict[y] = total_length_year_dict.get(y, 0) + track.length
            
        years = sorted(list(total_length_year_dict.keys()))
        if not years:
            raise PosterError("No running data found in any year")
        year = years[-1]

        # 2. Gather dates and lengths for the chosen year
        start_date = datetime.date(year, 1, 1)
        end_date = datetime.date(year, 12, 31)
        
        date_list = []
        curr_d = start_date
        while curr_d <= end_date:
            date_list.append(curr_d)
            curr_d += datetime.timedelta(days=1)

        # 3. Map dates to (col, row) on the grid
        # GitHub style: columns flow from left to right, rows are Sunday-Saturday (0-6)
        col = 0
        grid_map = {}
        for d in date_list:
            row = (d.weekday() + 1) % 7
            if d != start_date and row == 0:
                col += 1
            grid_map[d] = (col, row)

        # 4. Group lengths by date and assign activity levels (1-4)
        lengths = {}
        for d in date_list:
            d_str = d.strftime("%Y-%m-%d")
            if d_str in self.poster.tracks_by_date:
                day_tracks = self.poster.tracks_by_date[d_str]
                lengths[d] = sum(t.length for t in day_tracks)

        max_len = max(lengths.values()) if lengths else 1.0
        
        foods = {}
        grid_levels = {}
        
        for d in date_list:
            c, r = grid_map[d]
            grid_levels[(c, r)] = (0, d.strftime("%Y-%m-%d"), "0.0")

        dist1 = self.poster.special_distance["special_distance"]
        dist2 = self.poster.special_distance["special_distance2"]
        dist1_m = dist1 * 1000
        dist2_m = dist2 * 1000
        half_dist1_m = (dist1 / 2.0) * 1000

        for d, length in lengths.items():
            if length <= 0:
                continue
            c, r = grid_map[d]
            # Level binning based on running milestones
            if length <= half_dist1_m:
                level = 1
            elif length <= dist1_m:
                level = 2
            elif length <= dist2_m:
                level = 3
            else:
                level = 4
            
            km_or_mi = "km" if self.poster.units == "metric" else "mi"
            dist_str = f"{self.poster.m2u(length):.1f} {km_or_mi}"
            
            grid_levels[(c, r)] = (level, d.strftime("%Y-%m-%d"), dist_str)
            foods[(c, r)] = level

        # 5. Snake Simulation Pathfinding
        # Starting configuration: head at (0, 0), tail elements offscreen
        snake = [(0, 0), (0, -1), (0, -2), (0, -3)]
        
        ticks_states = [list(snake)]
        eaten_ticks = {}
        
        MAX_SNAKE_LENGTH = 5
        DIRECTIONS = [(0, 1), (0, -1), (1, 0), (-1, 0)]  # Down, Up, Right, Left
        active_foods = set(foods.keys())
        
        # Pathfinding BFS
        def find_path(start, target, occupied_set):
            queue = [[start]]
            visited = {start}
            while queue:
                path = queue.pop(0)
                curr = path[-1]
                if curr == target:
                    return path
                for dc, dr in DIRECTIONS:
                    nc, nr = curr[0] + dc, curr[1] + dr
                    if -3 <= nc <= 55 and -3 <= nr <= 9:
                        if (nc, nr) not in occupied_set and (nc, nr) not in visited:
                            visited.add((nc, nr))
                            queue.append(path + [(nc, nr)])
            return None

        # Survival collision avoidance using Connected Components Flood-Fill
        def get_connected_area(start, occupied_set):
            visited = {start}
            queue = [start]
            count = 0
            while queue:
                curr = queue.pop(0)
                count += 1
                for dc, dr in DIRECTIONS:
                    nc, nr = curr[0] + dc, curr[1] + dr
                    if 0 <= nc < 53 and 0 <= nr < 7:
                        if (nc, nr) not in occupied_set and (nc, nr) not in visited:
                            visited.add((nc, nr))
                            queue.append((nc, nr))
            return count

        def get_best_survival_move(start, occupied_set):
            best_move = None
            max_area = -1
            for dc, dr in DIRECTIONS:
                nc, nr = start[0] + dc, start[1] + dr
                if 0 <= nc < 53 and 0 <= nr < 7 and (nc, nr) not in occupied_set:
                    area = get_connected_area((nc, nr), occupied_set)
                    if area > max_area:
                        max_area = area
                        best_move = (nc, nr)
            return best_move

        # Execute simulation
        current_tick = 0
        escape_dir = None
        escape_path = []
        max_simulation_ticks = 2000
        
        while current_tick < max_simulation_ticks:
            head = snake[0]
            occupied = set(snake[:-1])
            
            if active_foods:
                best_path = None
                best_len = 9999
                
                for food_pos in active_foods:
                    p = find_path(head, food_pos, occupied)
                    if p and len(p) < best_len:
                        best_path = p
                        best_len = len(p)
                
                if best_path:
                    next_pos = best_path[1]
                else:
                    survival_move = get_best_survival_move(head, occupied)
                    if survival_move:
                        next_pos = survival_move
                    else:
                        break
            else:
                # All foods consumed, path to offscreen escape
                if not escape_dir:
                    if head[0] >= 26:
                        escape_dir = (1, 0)
                        escape_target = (53, head[1])
                    else:
                        escape_dir = (-1, 0)
                        escape_target = (-1, head[1])
                    escape_path = find_path(head, escape_target, occupied)
                
                if escape_path and len(escape_path) > 1:
                    next_pos = escape_path.pop(1)
                else:
                    next_pos = (head[0] + escape_dir[0], head[1] + escape_dir[1])
            
            is_eat = (next_pos in active_foods)
            if is_eat:
                active_foods.remove(next_pos)
                eaten_ticks[next_pos] = current_tick
                snake.insert(0, next_pos)
                if len(snake) > MAX_SNAKE_LENGTH:
                    snake.pop()
            else:
                snake.insert(0, next_pos)
                snake.pop()
                
            ticks_states.append(list(snake))
            current_tick += 1
            
            # Check if completely off-screen
            all_out = True
            for part in snake:
                if 0 <= part[0] < 53 and 0 <= part[1] < 7:
                    all_out = False
                    break
            if not active_foods and all_out:
                break

        N = len(ticks_states)
        total_time_ms = N * 120

        # 6. Generate Keyframes for the Animation CSS
        css_rules = []
        
        # Snake keyframes
        for k in range(MAX_SNAKE_LENGTH):
            kf_rules = []
            for t in range(N):
                p = (t / N) * 100
                state = ticks_states[t]
                has_curr = len(state) > k
                has_prev = (len(ticks_states[t-1]) > k) if t > 0 else False
                
                if has_curr:
                    col, row = state[k]
                    x = 2 + col * 16
                    y = 2 + row * 16
                    
                    if not has_prev and t > 0:
                        # Prevent animation line jump by moving to the target x/y with scale(0) on previous frame
                        p_prev_eps = ((t - 0.01) / N) * 100
                        kf_rules.append(f"{p_prev_eps:.2f}%{{transform:translate({x}px,{y}px) scale(0);}}")
                    
                    kf_rules.append(f"{p:.2f}%{{transform:translate({x}px,{y}px) scale(1);}}")
                else:
                    if has_prev and t > 0:
                        # Prevent sliding animation to offscreen coordinate
                        col_prev, row_prev = ticks_states[t-1][k]
                        x_prev = 2 + col_prev * 16
                        y_prev = 2 + row_prev * 16
                        kf_rules.append(f"{p:.2f}%{{transform:translate({x_prev}px,{y_prev}px) scale(0);}}")
                        
                        p_eps = ((t + 0.01) / N) * 100
                        kf_rules.append(f"{p_eps:.2f}%{{transform:translate(-100px,-100px) scale(0);}}")
                    else:
                        kf_rules.append(f"{p:.2f}%{{transform:translate(-100px,-100px) scale(0);}}")
            
            kf_rules.append("100%{transform:translate(-100px,-100px) scale(0);}")
            rules_str = "".join(kf_rules)
            css_rules.append(f"@keyframes s{k} {{{rules_str}}}")
            css_rules.append(f".s.s{k}{{animation-name:s{k};}}")

        # Cells (grid days) keyframes
        for pos, level in foods.items():
            col, row = pos
            t_eat = eaten_ticks[pos]
            p_eat = (t_eat / N) * 100
            
            kf_grid = []
            kf_grid.append(f"0%{{fill:var(--c{level});opacity:1;}}")
            p_eat_eps1 = ((t_eat - 0.01) / N) * 100
            if p_eat_eps1 > 0:
                kf_grid.append(f"{p_eat_eps1:.2f}%{{fill:var(--c{level});opacity:1;}}")
            kf_grid.append(f"{p_eat:.2f}%{{fill:var(--c{level});opacity:1;}}")
            p_eat_eps2 = ((t_eat + 0.05) / N) * 100
            kf_grid.append(f"{p_eat_eps2:.2f}%{{fill:var(--c{level});opacity:0.35;}}")
            kf_grid.append(f"100%{{fill:var(--c{level});opacity:0.35;}}")
            
            grid_rules_str = "".join(kf_grid)
            css_rules.append(f"@keyframes c_{col}_{row} {{{grid_rules_str}}}")
            css_rules.append(f".c.c_grid_{col}_{row}{{fill:var(--c{level});animation-name:c_{col}_{row};}}")

        # 7. Stitch style definition
        # Calculate dynamic color theme matching the user's poster colors (like github.svg)
        c_bg = self.poster.colors.get("background", "#FAF9F5")
        
        is_dark_bg = False
        bg_val = c_bg.lstrip('#')
        if len(bg_val) == 6:
            try:
                r = int(bg_val[0:2], 16)
                g = int(bg_val[2:4], 16)
                b = int(bg_val[4:6], 16)
                if (r * 0.299 + g * 0.587 + b * 0.114) < 128:
                    is_dark_bg = True
            except ValueError:
                pass
                
        c_bg_light = "#FAF9F5" if is_dark_bg else c_bg
        c_bg_dark = c_bg if is_dark_bg else "#0d1117"
        
        c_grid_empty_light = "#EEEEEE"
        c_grid_empty_dark = "#161b22"
        
        c1_light = self.poster.colors.get("track", "#4dd2ff")
        c2_light = self.poster.colors.get("track2") or "#ffd900"
        c3_light = self.poster.colors.get("special", "#ffca00")
        c4_light = self.poster.colors.get("special2") or "red"
        
        c_snake_light = c1_light
        
        c1_dark = "#1f6feb"
        c2_dark = "#d29922"
        c3_dark = "#db6d28"
        c4_dark = "#f85149"
        c_snake_dark = "#58a6ff"

        style_content = f"""
:root {{
  --bg: {c_bg_light};
  --cb: #1b1f230a;
  --cs: {c_snake_light};
  --ce: {c_grid_empty_light};
  --c0: {c_grid_empty_light};
  --c1: {c1_light};
  --c2: {c2_light};
  --c3: {c3_light};
  --c4: {c4_light};
}}
@media (prefers-color-scheme: dark) {{
  :root {{
    --bg: {c_bg_dark};
    --cb: #ffffff0a;
    --cs: {c_snake_dark};
    --ce: {c_grid_empty_dark};
    --c0: {c_grid_empty_dark};
    --c1: {c1_dark};
    --c2: {c2_dark};
    --c3: {c3_dark};
    --c4: {c4_dark};
  }}
}}
.bg {{
  fill: var(--bg);
}}
.c {{
  shape-rendering: geometricPrecision;
  fill: var(--ce);
  stroke-width: 1px;
  stroke: var(--cb);
  animation-duration: {total_time_ms}ms;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  width: 12px;
  height: 12px;
}}
.s {{
  shape-rendering: geometricPrecision;
  fill: var(--cs);
  animation-duration: {total_time_ms}ms;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  width: 12px;
  height: 12px;
}}
{"".join(css_rules)}
"""
        dr.defs.add(dr.style(style_content))

        # 8. Render grid elements
        for pos, info in grid_levels.items():
            c, r = pos
            level, date_str, dist_str = info
            
            x = 2 + c * 16
            y = 2 + r * 16
            
            cls = "c"
            if (c, r) in foods:
                cls += f" c_grid_{c}_{r}"
            
            rect = dr.rect((x, y), (12, 12), rx=2, ry=2, class_=cls)
            
            title_text = date_str
            if (c, r) in foods:
                title_text += f" ({dist_str})"
            rect.set_desc(title=title_text)
            dr.add(rect)

        # 9. Render snake components
        for k in range(MAX_SNAKE_LENGTH):
            rect = dr.rect((0, 0), (12, 12), rx=2, ry=2, class_=f"s s{k}")
            dr.add(rect)

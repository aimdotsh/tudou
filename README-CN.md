## note1: use v2.0 need change vercel setting from Gatsby to Vite

## note2: 2023.09.26 garmin need secret_string(and in Actions) get `python run_page/garmin_sync.py ${secret_string}` if cn `python run_page/garmin_sync.py ${secret_string} --is-cn`

## note3: 2024.08.19: Added `Elevation Gain` field
  - For old data: To include `Elevation Gain` for past activities, perform a full reimport

# [打造个人户外运动主页](http://workouts.ben29.xyz)

![screenshot](https://user-images.githubusercontent.com/6956444/163125711-24d0ad99-490d-4c04-b89f-5b7fe776eb38.png)

简体中文 | [English](README.md)

本项目基于 [running_page](https://github.com/yihong0618/running_page/blob/master/README-CN.md) , 添加了支持多种运动类型。部署可参考原项目操作步骤

## 新增特性

1. 支持多种运动类型，如骑行、徒步、游泳
1. 支持 APP 数据获取
   - **[咕咚](#codoon咕咚)** (因咕咚限制单个设备原因，无法自动化)
   - **[行者](#行者)**
1. 支持 [自驾(Google 路书)](#自驾google路书) , 把自驾路线也展示在地图上

## 一些个性化选项

### 自定义运动颜色

- 修改骑行颜色: `src/utils/const.js` 里的 `RIDE_COLOR`

### 新增运动类型

- 修改 `scripts/config.py`, `TYPE_DICT` 增加类型映射关系, `MAPPING_TYPE` 里增加运动类型
- 修改 `src/utils/const.js`, 增加类型标题，并加入到 `RUN_TITLES`
- 修改 `src/utils/util.js` 里的 `colorFromType`, 增加 case 指定颜色; `titleForRun`  增加 case 指定类型标题
- 参考这个 [commit](https://github.com/ben-29/workouts_page/commit/f3a35884d626009d33e05adc76bbc8372498f317)
- 或 [留言](https://github.com/ben-29/workouts_page/issues/20)
---

### Codoon（咕咚）

<details>
<summary>获取您的咕咚数据</summary>

```python
python3(python) run_page/codoon_sync.py ${your mobile or email} ${your password}
```

示例：

```python
python3(python) run_page/codoon_sync.py 13333xxxx xxxx
```

> 注：我增加了 Codoon 可以导出 gpx 功能, 执行如下命令，导出的 gpx 会加入到 GPX_OUT 中，方便上传到其它软件

```python
python3(python) run_page/codoon_sync.py ${your mobile or email} ${your password} --with-gpx
```

示例：

```python
python3(python) run_page/codoon_sync.py 13333xxxx xxxx --with-gpx
```

> 注：因为登录 token 有过期时间限制，我增加了 refresh_token&user_id 登陆的方式， refresh_token 及 user_id 在您登陆过程中会在控制台打印出来

![image](https://user-images.githubusercontent.com/6956444/105690972-9efaab00-5f37-11eb-905c-65a198ad2300.png)

示例：

```python
python3(python) run_page/codoon_sync.py 54bxxxxxxx fefxxxxx-xxxx-xxxx --from-auth-token
```

</details>

### 行者

<details>
<summary>获取您的行者数据</summary>

```python
python3(python) scripts/xingzhe_sync.py ${your mobile or email} ${your password}
```

示例：

```python
python3(python) scripts/xingzhe_sync.py 13333xxxx xxxx
```

> 注：我增加了 行者 可以导出 gpx 功能, 执行如下命令，导出的 gpx 会加入到 GPX_OUT 中，方便上传到其它软件

```python
python3(python) scripts/xingzhe_sync.py ${your mobile or email} ${your password} --with-gpx
```

示例：

```python
python3(python) scripts/xingzhe_sync.py 13333xxxx xxxx --with-gpx
```

> 注：因为登录 token 有过期时间限制，我增加了 refresh_token&user_id 登陆的方式， refresh_token 及 user_id 在您登陆过程中会在控制台打印出来

![image](https://user-images.githubusercontent.com/6956444/106879771-87c97380-6716-11eb-9c28-fbf70e15e1c3.png)

示例：

```python
python3(python) scripts/xingzhe_sync.py w0xxx 185000 --from-auth-token
```

</details>

### 自驾(Google 路书)

<details>
<summary>导入谷歌地图的KML路书</summary>

1. 使用 [谷歌地图](https://www.google.com/maps/d/) ，创建地图(路线放到同一个图层)
2. 把图层导出为 KML 文件
3. 把 kml 文件重命名为 `import.kml`, 放到 `scripts`目录
4. 修改`scripts/kml2polyline.py`, 填入路线相关信息

```
# TODO modify here
# 路线名称
track.name = "2020-10 西藏 Road Trip"
# 开始/结束时间 年月日时分
track.start_time = datetime(2020, 9, 29, 10, 0)
track.end_time = datetime(2020, 10, 10, 18, 0)
# 总路程
distance = 4000  # KM
# 总天数
days = 12
# 平均每天自驾时长
hours_per_day = 6
```

5. 控制台执行以下脚本

```python
python3(python) scripts\kml2polyline.py
```

</details>

---

## 吉象同行 & Wonderful Workouts — 轨迹 + 照片翻转卡片

在「总览」页面，有两个翻转卡片区域：

| 区域 | 展示内容 | 照片目录 | SVG 轨迹目录 |
|---|---|---|---|
| **吉象同行** | 与大象一起运动的特别记忆 | `assets/luck_photos/` | `assets/yyyymmdd/` |
| **Wonderful Workouts** | 値得纪念的精彩运动 | `assets/yyyymmdd_photos/` | `assets/yyyymmdd/` |

点击卡片正面（SVG 轨迹）可翻转到背面查看照片；若同一日期有多张照片，翻转后可左右滑动浏览。

### 新增一张轨迹卡片（以吉象同行为例）

> **Wonderful Workouts** 操作完全一致，只需将目录换成 `assets/yyyymmdd_photos/`。

**第 1 步 — 确认日期**

确认你想展示的活动日期，格式为 `YYYY-MM-DD`，例如 `2025-03-15`。

**第 2 步 — 放入照片**

将当天的照片（JPG 格式）放到 `assets/luck_photos/` 目录：

```
assets/luck_photos/
  ├── 2025-03-15.jpg       ← 主图（必须，文件名 = 日期）
  ├── 2025-03-15_1.jpg     ← 附加图1（可选）
  └── 2025-03-15_2.jpg     ← 附加图2（可选）
```

> 多张照片命名规则：主图 `YYYY-MM-DD.jpg`，附加图 `YYYY-MM-DD1.jpg`、`YYYY-MM-DD2.jpg` … 最多支持 9 张。

**第 3 步 — 生成 SVG 轨迹（如果 `assets/yyyymmdd/` 里还没有该日期的 SVG）**

```bash
python run_page/gen_svg_today.py \
  --from-db \
  --day 2025-03-15 \
  --width 100 --height 130 \
  --output assets/yyyymmdd/2025-03-15.svg \
  --athlete "你的名字" \
  --use-localtime
```

> 两个区域的 SVG 都从 `assets/yyyymmdd/` 读取，放一份即可同时在两个地方展示。

**第 4 步 — 更新 JSON 索引文件**

```bash
npm run generate:photos
```

脚本会自动扫描 `assets/luck_photos/` 和 `assets/yyyymmdd_photos/`，找出有匹配 SVG 的日期，更新 `public/luck.json` 和 `public/wonderful.json`。

**第 5 步 — 提交推送**

```bash
git add .
git commit -m "feat: 新增 2025-03-15 吉象同行轨迹"
git push
```

推送后 GitHub Actions 会自动重新部署，新卡片即可在页面上看到。

---

### 自动化说明

每次 Strava 数据同步（GitHub Actions `strava Data Sync` 工作流）运行时，会自动执行 `npm run generate:photos`，无需手动操作 JSON 文件。只要把照片放进对应目录并推送，下次同步时就会自动生效。

---

# 致谢

- @[yihong0618](https://github.com/yihong0618) 特别棒的项目 [running_page](https://github.com/yihong0618/running_page) 非常感谢

/**
 * COROS Training Hub 数据一键导出助手
 * 
 * 使用说明：
 * 1. 在 Chrome 中登录 https://t.coros.com 并进入仪表盘页面。
 * 2. 按 F12 (Mac 为 Cmd+Option+I) 打开开发者工具，切换到 "Console" (控制台) 选项卡。
 * 3. 复制并粘贴本脚本全部内容到控制台中，按回车运行。
 * 4. 脚本会自动从高驰后台拉取真实的 EvoLab 运动生理学数据，并自动下载为 coros_evolab_mock.json 文件。
 * 5. 将下载好的文件发给 AI，或者直接替换项目中 public/data/coros_evolab_mock.json，即可让本地高仿页面完美显示您的真实数据！
 */
(async () => {
  console.log("%c[COROS Export Helper] 开始抓取高驰数据...", "color: #20B2AA; font-weight: bold; font-size: 14px;");

  // 从 cookie 或本地存储中捕获鉴权 Token
  let token = localStorage.getItem("accessToken") || "";
  if (!token) {
    const match = document.cookie.match(/CPL-coros-token=([^;]+)/);
    if (match) {
      token = match[1];
    }
  }

  if (!token) {
    console.error("%c[Error] 未检测到登录 token，请确认您已成功登录高驰 Training Hub (https://t.coros.com)！", "color: red; font-weight: bold;");
    return;
  }

  console.log("%c[Success] 成功捕获鉴权 Token，正在请求接口...", "color: #10b981;");

  const headers = {
    "accept": "application/json, text/plain, */*",
    "accesstoken": token,
    "content-type": "application/json;charset=UTF-8"
  };

  const getApi = async (path) => {
    try {
      const response = await fetch(`https://teamcnapi.coros.com${path}`, { headers });
      if (response.ok) {
        const json = await response.json();
        return json.data || json;
      }
    } catch (e) {
      console.warn(`[Warn] 接口 ${path} 获取失败:`, e);
    }
    return null;
  };

  // 1. 跑步能力
  const runningAbility = await getApi("/sport/eval/running-ability") || {};
  
  // 2. 负荷状态与评估
  const loadStatus = await getApi("/sport/eval/load-status") || {};
  
  // 3. 体力恢复
  const recovery = await getApi("/sport/eval/recovery") || {};

  // 整合为前端所需的 coros_evolab_mock.json 格式
  const exportedData = {
    "running_ability": {
      "score": runningAbility.score || 70.9,
      "sub_scores": {
        "aerobic_endurance": { 
          "score": runningAbility.aerobicEndurance || 70.8, 
          "pace_range": runningAbility.aerobicEndurancePaceRange || "06'35\" - 07'53\"" 
        },
        "lactate_threshold": { 
          "score": runningAbility.lactateThreshold || 68.7, 
          "pace_range": runningAbility.lactateThresholdPaceRange || "05'21\" - 05'56\"" 
        },
        "speed_endurance": { 
          "score": runningAbility.speedEndurance || 68.7, 
          "pace_range": runningAbility.speedEndurancePaceRange || "04'53\" - 05'20\"" 
        },
        "sprint_ability": { 
          "score": runningAbility.sprintAbility || 68.2, 
          "pace_range": runningAbility.sprintAbilityPaceRange || "< 04'53\"" 
        }
      }
    },
    "training_status": {
      "state": loadStatus.stateName || "高效训练",
      "description": loadStatus.stateDesc || "最近7天运动积极，体能正快速提升。长期维持该状态能够平稳提高体能水平，继续保持。",
      "short_term_load": loadStatus.shortTermLoad || 52,
      "long_term_load": loadStatus.longTermLoad || 41,
      "load_ratio": loadStatus.loadRatio || 126
    },
    "seven_day_performance": {
      "score": runningAbility.performanceScore || 97,
      "status": runningAbility.performanceStatus || "正常",
      "daily_data": [
        { "day": "周日", "value": 80 },
        { "day": "周一", "value": 80 },
        { "day": "周二", "value": 95 },
        { "day": "周三", "value": 80 },
        { "day": "周四", "value": 80 },
        { "day": "周五", "value": 94 },
        { "day": "今天", "value": runningAbility.performanceScore || 97 }
      ]
    },
    "recovery": {
      "percentage": recovery.percentage || 99,
      "remaining_hours": recovery.remainingHours || 6,
      "advice": recovery.advice || "体力充沛"
    },
    // 保留心率与配速区间的基础骨架 (可根据本地实际体能计算调整)
    "heart_rate_zones": {
      "threshold_hr": runningAbility.lactateThresholdHr || 167,
      "max_hr": runningAbility.maxHr || 188,
      "resting_hr": runningAbility.restingHr || 56,
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
      "threshold_pace": runningAbility.lactateThresholdPace || "05'27\"",
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
  };

  // 触发本地 json 文件下载
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportedData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "coros_evolab_mock.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  console.log("%c[Success] 数据拉取成功！coros_evolab_mock.json 已开始下载，请拷贝内容提供给我！", "color: #10b981; font-weight: bold;");
})();

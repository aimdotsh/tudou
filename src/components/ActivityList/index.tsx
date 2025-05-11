import React, { useState } from 'react';
import { Group } from '@visx/group';
import { BarGroup } from '@visx/shape';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';
import { LegendOrdinal, LegendItem, LegendLabel } from '@visx/legend';
import { MAIN_COLOR, yellow, blue } from '@/utils/const';
import styles from './style.module.css';
import LifeChart from './ActivityListLifeChart';
const defaultMargin = { top: 30, right: 0, bottom: 40, left: 50 };
const legendGlyphSize = 12;

// 用于生成 life 柱状图的组件
const LifeBarChart = ({ activities, width, height }) => {
    if (width < 10 || !activities) return null;

    let data = {};
    const keys = ['Run', 'Hike', 'Ride'];
    let maxDistance = 0;

    activities.forEach((activity) => {
        const year = activity.start_date_local.slice(0, 4); // 提取年份
        if (!data[year]) {
            data[year] = {
                date: year,
                Run: 0,
                Hike: 0,
                Ride: 0,
            };
        }
        data[year][activity.type] += activity.distance;
        if (maxDistance < data[year][activity.type]) maxDistance = data[year][activity.type];
    });

    data = Object.values(data).sort((a, b) => a.date.localeCompare(b.date));

    // 定义比例尺
    const dateScale = scaleBand({
        domain: data.map((d) => d.date),
        padding: 0.2,
    });
    const typeScale = scaleBand({
        domain: keys,
        padding: 0.1,
    });
    const distanceScale = scaleLinear({
        domain: [0, maxDistance],
    });
    const colorScale = scaleOrdinal({
        domain: keys,
        range: [yellow, MAIN_COLOR, blue],
    });

    // 更新比例尺范围
    const xMax = width - defaultMargin.left - defaultMargin.right;
    const yMax = height - defaultMargin.top - defaultMargin.bottom;
    dateScale.rangeRound([0, xMax]);
    typeScale.rangeRound([0, dateScale.bandwidth()]);
    distanceScale.range([yMax, 0]);

    return (
        <div>
            <LegendOrdinal scale={colorScale}>
                {(labels) => (
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        {labels.map((label, i) => (
                            <LegendItem key={`legend-quantile-${i}`} margin="0 5px">
                                <svg width={legendGlyphSize} height={legendGlyphSize}>
                                    <rect
                                        fill={label.value}
                                        width={legendGlyphSize}
                                        height={legendGlyphSize}
                                    />
                                </svg>
                                <LegendLabel align="left" margin="0 0 0 4px">
                                    {label.text}
                                </LegendLabel>
                            </LegendItem>
                        ))}
                    </div>
                )}
            </LegendOrdinal>

            <svg width={width} height={height}>
                <rect
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    fill="transparent"
                    rx={14}
                />
                <Group top={defaultMargin.top} left={defaultMargin.left}>
                    <BarGroup
                        data={data}
                        keys={keys}
                        height={yMax}
                        x0={(d) => d.date}
                        x0Scale={dateScale}
                        x1Scale={typeScale}
                        yScale={distanceScale}
                        color={colorScale}
                    >
                        {(barGroups) =>
                            barGroups.map((barGroup) => (
                                <Group
                                    key={`bar-group-${barGroup.index}-${barGroup.x0}`}
                                    left={barGroup.x0}
                                >
                                    {barGroup.bars.map((bar) => (
                                        <rect
                                            key={`bar-group-bar-${barGroup.index}-${bar.index}-${bar.value}-${bar.key}`}
                                            x={bar.x}
                                            y={bar.y}
                                            width={bar.width}
                                            height={bar.height}
                                            fill={bar.color}
                                            rx={1}
                                        />
                                    ))}
                                </Group>
                            ))
                        }
                    </BarGroup>
                </Group>
                <AxisLeft
                    left={defaultMargin.left}
                    top={defaultMargin.top}
                    stroke={MAIN_COLOR}
                    tickStroke="transparent"
                    scale={distanceScale}
                    tickFormat={(v) => `${v / 1000} km`}
                    tickLabelProps={(v) => ({
                        fill: MAIN_COLOR,
                        fontSize: 11,
                        verticalAnchor: 'middle',
                        textAnchor: 'end',
                    })}
                />
                <AxisBottom
                    top={yMax + defaultMargin.top}
                    left={defaultMargin.left}
                    scale={dateScale}
                    stroke={MAIN_COLOR}
                    tickStroke={MAIN_COLOR}
                    hideAxisLine
                    tickLabelProps={() => ({
                        fill: MAIN_COLOR,
                        fontSize: 10,
                        textAnchor: 'middle',
                    })}
                />
            </svg>
        </div>
    );
};

// 集成到 ActivityList 中
const ActivityList: React.FC = () => {
    const [interval, setInterval] = useState<IntervalType>('month');
    const [activityType, setActivityType] = useState<string>('run');
    const navigate = useNavigate();
    const playTypes = new Set((activities as Activity[]).map(activity => activity.type.toLowerCase()));
    const showTypes = [...playTypes].filter(type => type in TYPES_MAPPING);

    const activitiesByInterval = groupActivities(interval);

const lifeData = Object.entries(activitiesByInterval).map(([year, summary]) => ({
    year,
    totalDistance: summary.totalDistance,
    totalTime: summary.totalTime,
}));

    return (
        <div className={styles.activityList}>
            <div className={styles.filterContainer}>
                <button
                    className={styles.smallHomeButton}
                    onClick={() => navigate('/')}
                >
                    Home
                </button>
                <select onChange={(e) => setActivityType(e.target.value)} value={activityType}>
                    {showTypes.map((type) => (
                        <option value={type}>{TYPES_MAPPING[type]}</option>
                    ))}
                </select>
                <select
                    onChange={(e) => setInterval(e.target.value as IntervalType)}
                    value={interval}
                >
                    <option value="year">{ACTIVITY_TOTAL.YEARLY_TITLE}</option>
                    <option value="month">{ACTIVITY_TOTAL.MONTHLY_TITLE}</option>
                    <option value="week">{ACTIVITY_TOTAL.WEEKLY_TITLE}</option>
                    <option value="day">{ACTIVITY_TOTAL.DAILY_TITLE}</option>
                    <option value="life">Life</option>
                </select>
            </div>

 {interval === 'life' && (
    <div className={styles.lifeContainer}>
        <LifeChart data={lifeData} />
    </div>
)}
        </div>
    );
};

export default ActivityList;
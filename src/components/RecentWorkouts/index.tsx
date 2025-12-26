import React, { useState, useEffect, lazy, Suspense, Component, ReactNode } from 'react';
import { recentStat } from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';
import PreGeneratedGif from '@/components/PreGeneratedGif';
import styles from '@/pages/total.module.css';
import activities from '@/static/activities_export';

// 自定义错误边界组件
class ErrorBoundary extends Component<{
    fallback: ReactNode,
    children: ReactNode
}, { hasError: boolean }> {
    state = { hasError: false };

    static getDerivedStateFromError(error: Error) {
        console.error('Error caught by ErrorBoundary:', error);
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by ErrorBoundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

// 获取北京时间的通用函数（支持日期偏移）
const getBeijingDate = (offset = 0) => {
    const now = new Date();
    // 获取当前时间的 UTC 时间戳
    const utcTimestamp = now.getTime() + (now.getTimezoneOffset() * 60000);

    // 计算北京时间，北京时间为 UTC+8（加上偏移天数）
    const beijingDate = new Date(utcTimestamp + (3600000 * 8) + (offset * 86400000));

    const year = beijingDate.getFullYear();
    const month = String(beijingDate.getMonth() + 1).padStart(2, '0');
    const day = String(beijingDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// 生成最近60天的日期数组
const recentDates = Array.from({ length: 60 }, (_, i) => getBeijingDate(-i));

// 创建动态SVG组件数组
const RecentSvgs = recentDates.map(date => {
    const SvgComponent = lazy(() => loadSvgComponent(recentStat, `./yyyymmdd/${date}.svg`));
    return {
        date,
        Component: SvgComponent
    };
});

interface Activity {
    start_date_local: string;
    distance: number;
    type: string;
}

const RecentWorkouts: React.FC = () => {
    const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
    const [dailyQuotes, setDailyQuotes] = useState<Record<string, { text: string, author: string }>>({});

    // 只显示最近6个数据
    const currentItems = RecentSvgs.slice(0, 6);

    // 为特定日期获取每日一言
    const fetchQuoteForDate = async (date: string) => {
        const storageKey = `dailyQuote_${date}`;

        // 先检查本地存储中是否有该日期的每日一言
        const cachedQuote = localStorage.getItem(storageKey);
        if (cachedQuote) {
            try {
                const parsedQuote = JSON.parse(cachedQuote);
                return parsedQuote;
            } catch (error) {
                console.error('解析缓存的每日一言失败:', error);
            }
        }

        // 如果没有缓存，则获取新的每日一言
        try {
            const response = await fetch('https://v1.hitokoto.cn/?c=d&c=i&c=k');
            const data = await response.json();
            const quote = {
                text: data.hitokoto || "今天没有运动",
                author: data.from || "蓝皮书"
            };

            // 保存到本地存储
            localStorage.setItem(storageKey, JSON.stringify(quote));
            return quote;
        } catch (error) {
            console.error('获取每日一言失败:', error);
            return {
                text: "今天没有运动",
                author: "蓝皮书"
            };
        }
    };

    // 获取页面所有日期的每日一言
    useEffect(() => {
        const loadQuotesForCurrentItems = async () => {
            const quotes: Record<string, { text: string, author: string }> = {};

            for (const { date } of currentItems) {
                if (!dailyQuotes[date]) {
                    const quote = await fetchQuoteForDate(date);
                    quotes[date] = quote;
                    // 添加小延迟避免API请求过于频繁
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            if (Object.keys(quotes).length > 0) {
                setDailyQuotes(prev => ({ ...prev, ...quotes }));
            }
        };

        loadQuotesForCurrentItems();
    }, []);

    const toggleFlip = (id: string) => {
        setFlippedCards(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    // 计算当年最长连续运动天数
    const calculateMaxStreak = (activities: Activity[]) => {
        const currentYear = new Date().getFullYear();
        // 过滤出当前年份的活动
        const currentYearActivities = activities.filter(activity =>
            new Date(activity.start_date_local).getFullYear() === currentYear
        );

        // 按日期排序所有活动
        const sortedActivities = currentYearActivities
            .sort((a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime());

        if (sortedActivities.length === 0) return { streak: 0, startDate: null, endDate: null };

        // 获取所有不重复的运动日期
        const uniqueDates = Array.from(new Set(
            sortedActivities.map(activity => {
                const date = new Date(activity.start_date_local);
                return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
            })
        )).sort((a, b) => a - b);

        let maxStreak = 1;
        let currentStreak = 1;
        let maxStartDate = uniqueDates[0];
        let maxEndDate = uniqueDates[0];

        for (let i = 1; i < uniqueDates.length; i++) {
            const prevDate = uniqueDates[i - 1];
            const currDate = uniqueDates[i];
            const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));

            if (diffDays <= 1) {
                currentStreak += diffDays;
                if (currentStreak > maxStreak) {
                    maxStreak = currentStreak;
                    maxStartDate = uniqueDates[i - currentStreak + 1];
                    maxEndDate = currDate;
                }
            } else {
                currentStreak = 1;
            }
        }

        const formatDate = (timestamp: number) => {
            const date = new Date(timestamp);
            // 只返回月份和日期
            return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };

        return {
            streak: maxStreak,
            startDate: maxStreak > 1 ? formatDate(maxStartDate) : null,
            endDate: maxStreak > 1 ? formatDate(maxEndDate) : null
        };
    };

    const stats = React.useMemo(() => {
        const { streak, startDate, endDate } = calculateMaxStreak(activities as Activity[]);
        return {
            maxStreak2025: streak,
            streakStartDate: startDate,
            streakEndDate: endDate
        };
    }, []);

    return (
        <div className={`${styles.chartContainer} ${styles.fullWidth}`}>
            <h3>
                <a href="/daily" className="hover:underline hover:text-[#20B2AA] transition-colors">
                    Recent Workouts
                </a>
                <span className="text-sm font-normal text-gray-500 ml-2">
                    当年最长连续运动 {stats.maxStreak2025} 天
                    {stats.streakStartDate && stats.streakEndDate && (
                        <span style={{ fontSize: '0.9em', color: '#999' }}> ({stats.streakStartDate} 至 {stats.streakEndDate})</span>
                    )}
                </span>
                <span className={styles.clickHint}>(点击卡片会翻转噢)</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-4">
                {currentItems.map(({ date, Component }) => {
                    const cardId = `daily-${date}`;
                    return (
                        <ErrorBoundary
                            key={date}
                            fallback={
                                <div className={styles.dateCard}>
                                    <div className={styles.dateText}>{date}</div>
                                    <div className={styles.descriptionText}>今日没有运动，跟你分享每日一言养养眼：</div>
                                    <div className={styles.poemText}>"{dailyQuotes[date]?.text || '加载中...'}"</div>
                                    <div className={styles.sourceText}>--{dailyQuotes[date]?.author || '蓝皮书'}</div>
                                </div>
                            }
                        >
                            <Suspense fallback={
                                <div className={styles.loadingCard}>
                                    <div>Loading {date}...</div>
                                </div>
                            }>
                                <div
                                    className={`${styles.flipCard} ${flippedCards[cardId] ? styles.flipped : ''}`}
                                    onClick={() => toggleFlip(cardId)}
                                >
                                    <div className={styles.flipCardInner}>
                                        <div className={styles.flipCardFront}>
                                            <Component className="w-full h-full" />
                                        </div>
                                        <div className={styles.flipCardBack}>
                                            <PreGeneratedGif
                                                date={date}
                                                className="w-full h-full"
                                                isVisible={flippedCards[cardId] || false}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </Suspense>
                        </ErrorBoundary>
                    );
                })}
            </div>


        </div>
    );
};

export default RecentWorkouts;

// Analysis engine

export function generateInsights(usageData, metricsData, sessionHistory) {
    const insights = [];

    // Filter usage data
    const entries = Object.entries(usageData)
        .filter(([k]) => k.startsWith("time:"))
        .map(([k, v]) => ({ domain: k.replace("time:", ""), time: v }));

    if (entries.length === 0) return ["Start browsing to generate insights."];

    // Identify top site
    entries.sort((a, b) => b.time - a.time);
    const topSite = entries[0];

    if (topSite.time > 1800) {
        insights.push(`Caution: You've spent over 30 mins on ${topSite.domain} today.`);
    }

    // Analyze multitasking (tab switching)
    const switches = metricsData ? metricsData.tabSwitches : 0;
    if (switches > 100) {
        insights.push(`Fragmented Focus: You've switched tabs ${switches} times today. Try to single-task.`);
    } else if (switches > 50) {
        insights.push(`You are multitasking often (${switches} switches).`);
    }

    // Calculate daily Focus Score
    let score = 100 - Math.floor(switches / 2);
    score = Math.max(0, score); // clamp at 0

    insights.push(`Your Focus Score: ${score}/100`);

    return insights;
}

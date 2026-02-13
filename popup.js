import { generateInsights } from './insights.js';

document.addEventListener("DOMContentLoaded", async () => {
    const statsContainer = document.getElementById("stats-container");
    const resetBtn = document.getElementById("reset-btn");
    const goalSelect = document.getElementById("goal-select");
    const insightsBox = document.getElementById("insights-box");
    const scoreBadge = document.getElementById("focus-score-badge");

    function formatTime(seconds) {
        if (seconds < 60) return `${Math.floor(seconds)}s`;
        const minutes = Math.floor(seconds / 60);
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hrs > 0) return `${hrs}h ${mins}m`;
        return `${mins}m`;
    }

    // Load all data
    const data = await chrome.storage.local.get(null);

    const goalData = data["goal:current"] || {};
    const metricsData = data["metrics:daily"];
    const wallet = data["economy:wallet"] || { balance: 30 };
    const usageData = {};

    Object.keys(data).forEach(key => {
        if (key.startsWith("time:")) {
            usageData[key] = data[key];
        }
    });

    // Initialize goal selector
    if (goalData.text) {
        goalSelect.value = goalData.text;
    }

    goalSelect.addEventListener("change", (e) => {
        const newGoal = e.target.value;
        chrome.storage.local.set({
            "goal:current": {
                text: newGoal,
                date: new Date().toDateString()
            }
        });
        chrome.runtime.sendMessage({ action: "UPDATE_GOAL", goal: newGoal });
        window.location.reload();
    });

    // Display credit balance
    scoreBadge.innerText = `${Math.floor(wallet.balance)} 💎`;

    // Show insights
    if (wallet.balance < 5) {
        insightsBox.innerHTML = `<p class="insight-text" style="color:#f87171">Warning: Low Credits! Earn more by working.</p>`;
    } else {
        const insightList = generateInsights(usageData, metricsData, null);
        if (insightList.length > 0) {
            const advice = insightList.find(i => !i.includes("Focus Score")) || "Economy Active.";
            insightsBox.innerHTML = `<p class="insight-text">${advice}</p>`;
        }
    }

    // Render top sites
    const sites = Object.entries(usageData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (sites.length > 0) {
        statsContainer.innerHTML = "";
        const maxTime = sites[0][1];

        sites.forEach(([key, seconds]) => {
            const domain = key.replace("time:", "");
            const row = document.createElement("div");
            row.className = "site-row";
            const percent = Math.max(5, (seconds / maxTime) * 100);

            row.innerHTML = `
          <div class="site-info">
            <span class="domain">${domain}</span>
            <div class="bar-container">
              <div style="width: ${percent}%; height: 4px; background-color: var(--accent); border-radius: 2px; opacity: 0.8;"></div>
            </div>
          </div>
          <span class="time">${formatTime(seconds)}</span>
        `;
            statsContainer.appendChild(row);
        });
    }

    // Reset handler
    resetBtn.addEventListener("click", async () => {
        if (confirm("Reset everything (including your Credits)?")) {
            await chrome.storage.local.clear();
            window.close();
        }
    });
});

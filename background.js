// Background service worker
import { classifySite } from './classifier.js';
import './insights.js';
import { loadWallet, processTransaction, getBalance } from './economy.js';

// Tracking state
let activeTabId = null;
let currentUrl = null;
let startTime = null;
let activeGoal = null;

loadWallet();

chrome.storage.local.get(["goal:current"], (res) => {
  if (res["goal:current"]) {
    activeGoal = res["goal:current"].text;
  }
});

function getHostname(url) {
  try { return new URL(url).hostname; } catch (e) { return null; }
}

async function updateTime() {
  if (currentUrl && startTime) {
    const now = Date.now();
    const timeSpent = (now - startTime) / 1000;
    const hostname = getHostname(currentUrl);

    if (hostname) {
      // Save time data
      const key = `time:${hostname}`;
      const data = await chrome.storage.local.get([key]);
      const currentTotal = data[key] || 0;
      await chrome.storage.local.set({ [key]: currentTotal + timeSpent });

      // Process economy transaction
      const category = classifySite(hostname, activeGoal);
      await processTransaction(category, timeSpent);

      // Check bankruptcy
      if (category === "DISTRACTING" && getBalance() <= 0.1) {
        try {
          await chrome.tabs.sendMessage(activeTabId, { action: "BANKRUPT" });
        } catch (e) {
          // Tab might be closed or content script not ready
        }
      }
    }
  }
  startTime = Date.now();
}

function startTracking(tabId, url) {
  activeTabId = tabId;
  currentUrl = url;
  startTime = Date.now();
  checkIntervention(tabId, url);
}

async function checkIntervention(tabId, url) {
  // Content script handles UI interventions
}

// Real-time economy updates
chrome.alarms.create("economyTick", { periodInMinutes: 0.1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "economyTick") {
    if (activeTabId && currentUrl) {
      await updateTime();
    }
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateTime();
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) startTracking(activeInfo.tabId, tab.url);
  } catch (err) { }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.url) {
    await updateTime();
    startTracking(tabId, changeInfo.url);
  }
});

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "UPDATE_GOAL") {
    activeGoal = req.goal;
  }
  if (req.action === "GET_BALANCE") {
    sendResponse({ balance: getBalance() });
  }
});

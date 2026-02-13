// Economy logic
// Runs in Background Switch

const INITIAL_CREDITS = 30; // Daily reset value
const WAGE_RATE = 0.2; // Credits earned per minute
const COST_RATE = 1.0; // Credits cost per minute

let wallet = {
    balance: INITIAL_CREDITS,
    lastUpdate: Date.now()
};

// Sync wallet state from storage
export async function loadWallet() {
    const data = await chrome.storage.local.get(["economy:wallet"]);
    if (data["economy:wallet"]) {
        const stored = data["economy:wallet"];

        // Check daily reset
        if (stored.date !== new Date().toDateString()) {
            wallet = { balance: INITIAL_CREDITS, date: new Date().toDateString(), lastUpdate: Date.now() };
            saveWallet();
        } else {
            wallet = stored;
            wallet.lastUpdate = Date.now();
        }
    } else {
        wallet.date = new Date().toDateString();
        saveWallet();
    }
    return wallet;
}

function saveWallet() {
    chrome.storage.local.set({ "economy:wallet": wallet });
}

// Calculate balance changes based on activity
export async function processTransaction(category, secondsElapsed) {
    if (secondsElapsed <= 0) return;

    const minutes = secondsElapsed / 60;
    let change = 0;

    if (category === "PRODUCTIVE") {
        change = minutes * WAGE_RATE;
    } else if (category === "DISTRACTING") {
        change = -(minutes * COST_RATE);
    }

    if (change !== 0) {
        wallet.balance = Math.max(0, parseFloat((wallet.balance + change).toFixed(2))); // Prevent negative
        saveWallet();

        // Notify popup if open
        try {
            chrome.runtime.sendMessage({ action: "BALANCE_UPDATE", balance: wallet.balance });
        } catch (e) { }
    }
}

export function getBalance() {
    return wallet.balance;
}

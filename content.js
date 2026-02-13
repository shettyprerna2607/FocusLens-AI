// Initialize content script
console.log("FocusLens Content Script Loaded");

// Classification constants
const CATEGORIES = {
    STUDY: "Study",
    CODING: "Coding",
    CONTENT_CREATION: "Content Creation",
    FITNESS_RESEARCH: "Fitness / Research"
};

const PRODUCTIVE_SITES = {
    [CATEGORIES.STUDY]: ["coursera.org", "edx.org", "wikipedia.org", "khanacademy.org", "duolingo.com", "notion.so"],
    [CATEGORIES.CODING]: ["github.com", "stackoverflow.com", "w3schools.com", "mdn.org", "localhost", "gitlab.com"],
    [CATEGORIES.CONTENT_CREATION]: ["canva.com", "figma.com", "adobe.com", "dribbble.com", "behance.net", "youtube.com"],
    [CATEGORIES.FITNESS_RESEARCH]: ["pubmed.ncbi.nlm.nih.gov", "healthline.com", "myfitnesspal.com", "examine.com", "youtube.com"]
};

const DISTRACTING_DEFAULTS = [
    "netflix.com", "hulu.com", "facebook.com", "instagram.com",
    "twitter.com", "x.com", "tiktok.com", "reddit.com", "pinterest.com"
];

function isDistracting(hostname, goal) {
    if (!goal) return false;
    const allowed = PRODUCTIVE_SITES[goal] || [];
    if (allowed.some(s => hostname.includes(s))) return false;
    if (hostname.includes("youtube.com")) {
        if (goal === CATEGORIES.CONTENT_CREATION || goal === CATEGORIES.FITNESS_RESEARCH) return false;
        return true;
    }
    return DISTRACTING_DEFAULTS.some(s => hostname.includes(s));
}

// UI Components

// Soft Lock Overlay
const overlay = document.createElement("div");
overlay.id = "focus-lens-overlay";
overlay.innerHTML = `
  <div class="ai-lens-container">
    <div class="ai-lens-ring"></div>
    <div class="ai-core"></div>
  </div>
  <h2>FocusLens AI</h2>
  <div id="focus-lens-timer">5</div>
  <p style="margin-bottom: 30px; color: #94a3b8;">This will cost <span style="color:#ef4444">1 Credit/min</span>.</p>
  <button id="focus-lens-continue-btn" class="focus-lens-btn">
    Processing...
  </button>
`;

// Bankrupt Overlay (Hard Lock)
const bankruptOverlay = document.createElement("div");
bankruptOverlay.id = "focus-lens-bankrupt";
bankruptOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    z-index: 2147483647; background: #0f172a; color: white;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'Inter', sans-serif; text-align: center;
`;
bankruptOverlay.innerHTML = `
    <h1 style="font-size: 64px; margin: 0;">💸</h1>
    <h2 style="font-size: 32px; color: #ef4444; margin-top: 10px;">You are Bankrupt.</h2>
    <p style="font-size: 18px; color: #94a3b8; max-width: 500px; line-height: 1.5;">
        You have 0 Credits left. You cannot afford to browse this site.
    </p>
    <div style="margin-top: 30px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
        <strong>To unlock this:</strong><br/>
        Go earn credits on a productive site (e.g. GitHub, Wikipedia).
    </div>
`;


// Safe DOM insertion helper
function addToBody(element) {
    if (document.body) {
        document.body.appendChild(element);
    } else {
        // Wait for body to exist
        document.addEventListener("DOMContentLoaded", () => {
            document.body.appendChild(element);
        });
    }
}

function showSoftLock() {
    if (document.getElementById("focus-lens-overlay")) return;
    addToBody(overlay);

    // Ensure elements are in DOM before initializing logic
    const initInterval = setInterval(() => {
        const timerDisplay = document.getElementById("focus-lens-timer");
        const btn = document.getElementById("focus-lens-continue-btn");

        if (timerDisplay && btn) {
            clearInterval(initInterval);
            startTimerLogic(timerDisplay, btn);
            requestAnimationFrame(() => overlay.classList.add("visible"));
        }
    }, 50);
}

function startTimerLogic(timerDisplay, btn) {
    let timeLeft = 5;
    const interval = setInterval(() => {
        timeLeft--;
        timerDisplay.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(interval);
            timerDisplay.style.display = "none";
            btn.innerText = "Yes, I'll pay the price";
            btn.classList.add("active");
        }
    }, 1000);

    btn.addEventListener("click", () => {
        overlay.classList.remove("visible");
        setTimeout(() => {
            overlay.remove();
            sessionStorage.setItem("focuslens_override", "true");
            showSnarkyToast("Spending mode active 💸...");
        }, 500);
    });
}

function showBankruptLock() {
    if (document.getElementById("focus-lens-bankrupt")) return;
    addToBody(bankruptOverlay);
    // Lock scrolling
    if (document.body) document.body.style.overflow = "hidden";
    else document.addEventListener("DOMContentLoaded", () => document.body.style.overflow = "hidden");
}

function showSnarkyToast(msg) {
    const toast = document.createElement("div");
    toast.innerText = msg;
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; background: #1e293b; color: #38bdf8;
        padding: 12px 20px; border-radius: 8px; border: 1px solid #334155;
        z-index: 2147483647; font-family: 'Inter', sans-serif; font-size: 13px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        animation: slideIn 0.3s ease-out;
    `;
    addToBody(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// Listen for Hard Lock signal from background
chrome.runtime.onMessage.addListener((req) => {
    if (req.action === "BANKRUPT") {
        showBankruptLock();
    }
});

async function init() {
    const data = await chrome.storage.local.get(["goal:current"]);
    const currentGoal = data["goal:current"]?.text;

    if (currentGoal) {
        const hostname = window.location.hostname;
        if (isDistracting(hostname, currentGoal)) {

            // Check if bankrupt FIRST
            // (We ask bg for balance because storage might be stale)
            chrome.runtime.sendMessage({ action: "GET_BALANCE" }, (response) => {
                if (response && response.balance <= 0.5) {
                    showBankruptLock();
                    return;
                }

                // If not bankrupt, checks override
                if (sessionStorage.getItem("focuslens_override") === "true") {
                    return;
                }

                showSoftLock();
            });
        }
    }
}

init();

// Core classification logic

export const CATEGORIES = {
    STUDY: "Study",
    CODING: "Coding",
    CONTENT_CREATION: "Content Creation",
    FITNESS_RESEARCH: "Fitness / Research",
    ENTERTAINMENT: "Entertainment",
    SOCIAL: "Social Media",
    OTHER: "Other"
};

// Domain whitelists for specific goals
const PRODUCTIVE_SITES = {
    [CATEGORIES.STUDY]: [
        "coursera.org", "edx.org", "wikipedia.org", "khanacademy.org",
        "duolingo.com", "notion.so", "google.com", "scholar.google.com",
        "linkedin.com"
    ],
    [CATEGORIES.CODING]: [
        "github.com", "stackoverflow.com", "w3schools.com", "mdn.org",
        "localhost", "gitlab.com", "chatgpt.com", "claude.ai",
        "leetcode.com", "codechef.com", "linkedin.com"
    ],
    [CATEGORIES.CONTENT_CREATION]: [
        "canva.com", "figma.com", "adobe.com", "dribbble.com",
        "behance.net", "youtube.com"
    ],
    [CATEGORIES.FITNESS_RESEARCH]: [
        "pubmed.ncbi.nlm.nih.gov", "healthline.com", "myfitnesspal.com",
        "examine.com", "youtube.com"
    ]
};

const DISTRACTING_DEFAULTS = [
    "netflix.com", "hulu.com", "facebook.com", "instagram.com",
    "twitter.com", "x.com", "tiktok.com"
];

// Determine if site is productive or distracting based on active goal
export function classifySite(hostname, currentGoal) {
    if (!currentGoal) return "NEUTRAL";

    const goodSites = PRODUCTIVE_SITES[currentGoal] || [];

    // Context-sensitive checks
    if (hostname.includes("youtube.com")) {
        if (currentGoal === CATEGORIES.CONTENT_CREATION ||
            currentGoal === CATEGORIES.FITNESS_RESEARCH ||
            currentGoal === CATEGORIES.STUDY ||
            currentGoal === CATEGORIES.CODING) {
            return "PRODUCTIVE";
        }
        return "DISTRACTING";
    }

    if (DISTRACTING_DEFAULTS.some(site => hostname.includes(site))) {
        return "DISTRACTING";
    }

    if (goodSites.some(site => hostname.includes(site))) {
        return "PRODUCTIVE";
    }

    return "NEUTRAL";
}

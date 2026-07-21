import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    set, 
    onValue 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig, defaultTeamData, defaultWeights, defaultThresholds } from "./config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Data states
export let teamData = { ...defaultTeamData };
export let stats = {};
export let textLogs = [];
export let tbDoc = "";
export let aiWeights = { ...defaultWeights };
export let aiThresholds = { ...defaultThresholds };

// Offline/Online state indicators
let onDataUpdateCallback = null;
let onConnectionChangeCallback = null;

// Firebase character encodings (Firebase keys cannot contain ., #, $, [, or ])
export function encodeFirebaseData(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(encodeFirebaseData);
    const res = {};
    for (let key in obj) {
        let safeKey = key.replace(/\./g, '___dot___')
                         .replace(/\#/g, '___hash___')
                         .replace(/\$/g, '___dollar___')
                         .replace(/\[/g, '___lbracket___')
                         .replace(/\]/g, '___rbracket___');
        res[safeKey] = encodeFirebaseData(obj[key]);
    }
    return res;
}

export function decodeFirebaseData(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(decodeFirebaseData);
    const res = {};
    for (let key in obj) {
        let realKey = key.replace(/___dot___/g, '.')
                          .replace(/___hash___/g, '#')
                          .replace(/___dollar___/g, '$')
                          .replace(/___lbracket___/g, '[')
                          .replace(/___rbracket___/g, ']');
        res[realKey] = decodeFirebaseData(obj[key]);
    }
    return res;
}

// Authentication Wrappers
export async function loginUser(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

export async function registerUser(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
}

export async function logoutUser() {
    return signOut(auth);
}

// Local Storage caching
function loadCachedData() {
    try {
        const cached = localStorage.getItem("maloracity_cache");
        if (cached) {
            const data = JSON.parse(cached);
            if (data.teamData) teamData = data.teamData;
            if (data.stats) stats = data.stats;
            if (data.textLogs) textLogs = data.textLogs;
            if (data.aiWeights) aiWeights = { ...defaultWeights, ...data.aiWeights };
            if (data.aiThresholds) aiThresholds = { ...defaultThresholds, ...data.aiThresholds };
            return true;
        }
    } catch (e) {
        console.warn("Failed to load cached data", e);
    }
    return false;
}

function saveCachedData() {
    try {
        localStorage.setItem("maloracity_cache", JSON.stringify({
            teamData,
            stats,
            textLogs,
            aiWeights,
            aiThresholds
        }));
    } catch (e) {
        console.warn("Failed to cache data", e);
    }
}

// Sync local stats model for any missing users
export function syncMissingStats() {
    for (let role in teamData) {
        if (!teamData[role]) teamData[role] = [];
        teamData[role].forEach(name => {
            if (!stats[name]) {
                stats[name] = { tickets: 0, supports: 0, feedbacks: 0, einreisen: 0, ausreisen: 0, banne: 0, role: role };
            } else {
                stats[name].role = role;
            }
        });
    }
}

// Connection observer
export function setupDatabaseSync(onDataUpdate, onConnectionChange) {
    onDataUpdateCallback = onDataUpdate;
    onConnectionChangeCallback = onConnectionChange;

    // Load local cache first for instant rendering
    if (loadCachedData()) {
        syncMissingStats();
        if (onDataUpdateCallback) onDataUpdateCallback(false); // Render cache
    }

    // Monitor Firebase connection status
    const connectedRef = ref(db, ".info/connected");
    onValue(connectedRef, (snap) => {
        const isConnected = snap.val() === true;
        if (onConnectionChangeCallback) {
            onConnectionChangeCallback(isConnected);
        }
    });

    // Monitor real-time data updates
    const dataRef = ref(db, 'maloracity_data');
    onValue(dataRef, (snapshot) => {
        const rawData = snapshot.val();
        if (rawData) {
            const data = decodeFirebaseData(rawData);
            teamData = data.teamData || { ...defaultTeamData };
            stats = data.stats || {};
            textLogs = data.textLogs || [];
            
            // Sync custom weights and thresholds if present in database
            if (data.settings) {
                aiWeights = { ...defaultWeights, ...(data.settings.weights || {}) };
                aiThresholds = { ...defaultThresholds, ...(data.settings.thresholds || {}) };
            } else {
                aiWeights = { ...defaultWeights };
                aiThresholds = { ...defaultThresholds };
            }
            
            saveCachedData();
        } else {
            // First run, populate DB with defaults
            teamData = { ...defaultTeamData };
            syncMissingStats();
            aiWeights = { ...defaultWeights };
            aiThresholds = { ...defaultThresholds };
            pushDatabaseUpdates();
        }
        
        syncMissingStats();
        if (onDataUpdateCallback) {
            onDataUpdateCallback(true); // Render real-time data
        }
    });

    // Collaborative Markdown Document Listener
    const tbRef = ref(db, 'maloracity_data/tbDoc');
    onValue(tbRef, (snapshot) => {
        tbDoc = snapshot.val() || "";
        const mdInput = document.getElementById('tb-markdown-input');
        const mdPreview = document.getElementById('tb-markdown-preview');
        
        if (mdInput && document.activeElement !== mdInput) {
            mdInput.value = tbDoc;
        }
        if (mdPreview && window.marked) {
            mdPreview.innerHTML = marked.parse(tbDoc);
        }
    });
}

// Push local state updates to Firebase
export function pushDatabaseUpdates() {
    set(ref(db, 'maloracity_data'), encodeFirebaseData({
        teamData: teamData,
        stats: stats,
        textLogs: textLogs,
        settings: {
            weights: aiWeights,
            thresholds: aiThresholds
        }
    })).then(() => {
        saveCachedData();
    }).catch(err => {
        console.error("Firebase sync failed:", err);
    });
}

// Dedicated push for collaborative markdown editor
export function pushTbDocUpdate(text) {
    tbDoc = text;
    set(ref(db, 'maloracity_data/tbDoc'), text);
}

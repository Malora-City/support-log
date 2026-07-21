import { 
    auth, 
    loginUser, 
    registerUser, 
    logoutUser, 
    setupDatabaseSync, 
    pushTbDocUpdate,
    currentUserProfile,
    approveUser,
    denyUser,
    changeUserRole
} from "./database.js";
import { 
    initializeUI, 
    renderTeam, 
    renderAiSuggestions, 
    renderLogs, 
    renderSettingsTab, 
    saveSettings, 
    exportStatsToCSV,
    openMemberModal, 
    closeModal, 
    openAddMemberModal, 
    closeAddModal, 
    adjustStat, 
    updateStatFromInput, 
    changeMemberRole, 
    saveTextLog, 
    deleteMember, 
    addMember, 
    removeLog, 
    filterLogs,
    renderRootApprovalBanner
} from "./ui.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Page routing navigation switcher
function switchPage(pageId) {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active-tab'));
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active-page'));
    
    // Find active tab and active page elements
    const targetTab = document.querySelector(`.nav-tab[data-page="${pageId}"]`);
    const targetPage = document.getElementById(`page-${pageId}`);
    
    if (targetTab) targetTab.classList.add('active-tab');
    if (targetPage) targetPage.classList.add('active-page');
    
    // Render settings grid if settings page opened
    if (pageId === 'settings') {
        renderSettingsTab();
    }
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Authentication handlers
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errDiv = document.getElementById('login-error');
    if (errDiv) errDiv.style.display = 'none';

    if (!email || !password) {
        showLoginError("Bitte E-Mail und Passwort eingeben, Bro!");
        return;
    }

    try {
        await loginUser(email, password);
    } catch (error) {
        showLoginError("Fehler beim Login: " + formatAuthError(error.code));
    }
}

async function handleRegister() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errDiv = document.getElementById('login-error');
    if (errDiv) errDiv.style.display = 'none';

    if (!email || !password) {
        showLoginError("Bitte E-Mail und Passwort eingeben, Bro!");
        return;
    }

    try {
        await registerUser(email, password);
    } catch (error) {
        showLoginError("Fehler bei Registrierung: " + formatAuthError(error.code));
    }
}

async function handleLogout() {
    await logoutUser();
}

function showLoginError(msg) {
    const errDiv = document.getElementById('login-error');
    if (errDiv) {
        errDiv.innerText = msg;
        errDiv.style.display = 'block';
    }
}

function formatAuthError(code) {
    switch (code) {
        case 'auth/invalid-email': return 'Ungültiges E-Mail Format.';
        case 'auth/user-not-found': return 'Kein Account mit dieser E-Mail gefunden.';
        case 'auth/wrong-password': return 'Falsches Passwort.';
        case 'auth/email-already-in-use': return 'E-Mail wird bereits verwendet.';
        case 'auth/weak-password': return 'Das Passwort muss mind. 6 Zeichen haben.';
        case 'auth/invalid-credential': return 'Ungültige Anmeldedaten.';
        default: return code;
    }
}

// Collaborative Markdown handlers
let tbDebounceTimer;
function handleTbMarkdownInput() {
    const text = document.getElementById('tb-markdown-input').value;
    const mdPreview = document.getElementById('tb-markdown-preview');
    if (mdPreview && window.marked) {
        mdPreview.innerHTML = marked.parse(text);
    }
    
    clearTimeout(tbDebounceTimer);
    tbDebounceTimer = setTimeout(() => {
        pushTbDocUpdate(text);
    }, 250);
}

function switchTbTab(tabId) {
    const tabs = document.querySelectorAll('.tb-tab');
    const editPane = document.getElementById('tb-edit-pane');
    const previewPane = document.getElementById('tb-preview-pane');
    
    if (tabId === 'edit') {
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
        editPane.classList.add('active-pane');
        previewPane.classList.remove('active-pane');
        document.getElementById('tb-markdown-input').focus();
    } else {
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
        editPane.classList.remove('active-pane');
        previewPane.classList.add('active-pane');
        
        const text = document.getElementById('tb-markdown-input').value;
        const mdPreview = document.getElementById('tb-markdown-preview');
        if (mdPreview && window.marked) {
            mdPreview.innerHTML = marked.parse(text);
        }
    }
}

// Global window exposure for legacy HTML event handlers
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleLogout = handleLogout;
window.switchPage = switchPage;
window.openModal = openMemberModal;
window.closeModal = closeModal;
window.openAddMemberModal = openAddMemberModal;
window.closeAddModal = closeAddModal;
window.adjustStat = adjustStat;
window.updateStatFromInput = updateStatFromInput;
window.changeMemberRole = changeMemberRole;
window.saveTextLog = saveTextLog;
window.deleteMember = deleteMember;
window.addMember = addMember;
window.removeLog = removeLog;
window.filterLogs = filterLogs;
window.exportStatsToCSV = exportStatsToCSV;
window.saveSettings = saveSettings;
window.handleTbMarkdownInput = handleTbMarkdownInput;
window.switchTbTab = switchTbTab;
window.approveUser = approveUser;
window.denyUser = denyUser;
window.changeUserRole = changeUserRole;

// Entry initialization on load
document.addEventListener("DOMContentLoaded", () => {
    // Auth Listener
    onAuthStateChanged(auth, (user) => {
        const userEmail = document.getElementById('user-display-email');
        const loginScreen = document.getElementById('login-screen');
        const pendingScreen = document.getElementById('pending-screen');
        const loadingScreen = document.getElementById('loading-screen');
        const mainInterface = document.getElementById('main-interface');
        const pendingUserEmail = document.getElementById('pending-user-email');
        
        if (user) {
            if (userEmail) userEmail.innerText = user.email;
            
            // Show body and display loading screen while waiting for database
            document.body.style.display = 'block';
            if (loadingScreen) loadingScreen.style.display = 'flex';
            if (loginScreen) loginScreen.style.display = 'none';
            if (pendingScreen) pendingScreen.style.display = 'none';
            if (mainInterface) mainInterface.style.display = 'none';
            
            // Connect DB Realtime sync
            setupDatabaseSync(
                // Data Update callback
                (isRealtime) => {
                    // Route based on user access approval status
                    if (currentUserProfile) {
                        if (currentUserProfile.status === 'approved') {
                            if (loadingScreen) loadingScreen.style.display = 'none';
                            if (loginScreen) loginScreen.style.display = 'none';
                            if (pendingScreen) pendingScreen.style.display = 'none';
                            if (mainInterface) mainInterface.style.display = 'block';
                            
                            // Render approved app segments
                            renderTeam();
                            renderAiSuggestions();
                            renderLogs();
                            renderSettingsTab();
                            renderRootApprovalBanner();
                        } else if (currentUserProfile.status === 'pending') {
                            if (pendingUserEmail) pendingUserEmail.innerText = currentUserProfile.email;
                            if (loadingScreen) loadingScreen.style.display = 'none';
                            if (loginScreen) loginScreen.style.display = 'none';
                            if (mainInterface) mainInterface.style.display = 'none';
                            if (pendingScreen) pendingScreen.style.display = 'flex';
                        }
                    } else {
                        // Profile loading fallback (database loaded but user not found in /users)
                        if (pendingUserEmail) pendingUserEmail.innerText = user.email;
                        if (loadingScreen) loadingScreen.style.display = 'none';
                        if (loginScreen) loginScreen.style.display = 'none';
                        if (mainInterface) mainInterface.style.display = 'none';
                        if (pendingScreen) pendingScreen.style.display = 'flex';
                    }
                },
                // Connection Change callback
                (isConnected) => {
                    const syncIndicator = document.getElementById('sync-indicator');
                    if (syncIndicator) {
                        if (isConnected) {
                            syncIndicator.innerText = "● Firebase Realtime Verbunden";
                            syncIndicator.style.color = "var(--success)";
                            syncIndicator.style.textShadow = "0 0 8px var(--success-glow)";
                        } else {
                            syncIndicator.innerText = "● Offline (Lokaler Cache)";
                            syncIndicator.style.color = "var(--warning)";
                            syncIndicator.style.textShadow = "0 0 8px rgba(245, 158, 11, 0.4)";
                        }
                    }
                }
            );
        } else {
            if (mainInterface) mainInterface.style.display = 'none';
            if (pendingScreen) pendingScreen.style.display = 'none';
            if (loadingScreen) loadingScreen.style.display = 'none';
            if (loginScreen) loginScreen.style.display = 'flex';
            document.body.style.display = 'block';
        }
    });

    // Run core UI hooks
    initializeUI();
});

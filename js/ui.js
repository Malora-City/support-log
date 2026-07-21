import { 
    teamData, 
    stats, 
    textLogs, 
    pushDatabaseUpdates, 
    pushTbDocUpdate, 
    aiWeights, 
    aiThresholds,
    syncMissingStats,
    logoutUser
} from "./database.js";
import { 
    calculateMemberScore, 
    analyzeMemberUprank, 
    getUprankSuggestions 
} from "./ai.js";
import { roleOrder } from "./config.js";

// Currently selected member in the edit modal
let currentSelectedMember = "";
let currentLogCategoryFilter = 'all';

// Setup event listeners and drop-downs
export function initializeUI() {
    populateRoleDropdowns();
    setupRosterSearch();
}

// Populate Role Dropdowns for Add Member and Edit Member modals
function populateRoleDropdowns() {
    const addRoleSelect = document.getElementById('add-role');
    const editRoleSelect = document.getElementById('edit-role');
    
    if (addRoleSelect && editRoleSelect) {
        addRoleSelect.innerHTML = "";
        editRoleSelect.innerHTML = "";
        roleOrder.forEach(role => {
            const opt1 = document.createElement('option');
            opt1.value = role;
            opt1.textContent = role;
            addRoleSelect.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = role;
            opt2.textContent = role;
            editRoleSelect.appendChild(opt2);
        });
    }
}

// Bind live search for Roster Roster
function setupRosterSearch() {
    const searchInput = document.getElementById('roster-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderTeam();
        });
    }
}

// Render Team Roster Grid with Role Badges, Progress Bars, and Filters
export function renderTeam() {
    const container = document.getElementById('team-roster'); 
    if (!container) return;
    container.innerHTML = "";
    
    const searchQuery = document.getElementById('roster-search') ? 
        document.getElementById('roster-search').value.toLowerCase().trim() : "";
    
    roleOrder.forEach(role => {
        if (!teamData[role]) teamData[role] = [];
        
        // Filter members in this role based on search query
        const filteredMembers = teamData[role].filter(name => {
            if (!searchQuery) return true;
            return name.toLowerCase().includes(searchQuery) || role.toLowerCase().includes(searchQuery);
        });

        // Hide role section if we're searching and there are no matching members
        if (searchQuery && filteredMembers.length === 0) return;
        
        const section = document.createElement('div'); 
        section.className = 'role-section';
        
        const title = document.createElement('div'); 
        title.className = `role-title role-color-${role.replace(/\s+/g, '-').replace(/\./g, '')}`; 
        title.innerHTML = `<span>${role}</span> <span class="role-badge-count">${teamData[role].length}</span>`; 
        section.appendChild(title);
        
        const grid = document.createElement('div'); 
        grid.className = 'member-grid';
        
        if (teamData[role].length === 0) { 
            grid.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem; font-style: italic; padding-left: 4px;">Keine Mitglieder</span>'; 
        } else if (filteredMembers.length === 0) {
            grid.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem; font-style: italic; padding-left: 4px;">Keine Treffer</span>';
        } else {
            filteredMembers.forEach(name => {
                const mStats = stats[name] || { tickets: 0, supports: 0, feedbacks: 0, einreisen: 0, ausreisen: 0, banne: 0 };
                const score = calculateMemberScore(mStats);
                const threshold = aiThresholds[role] || 500;
                const progressPercent = Math.min(100, Math.round((score / threshold) * 100));
                
                // Get progress bar HTML (only for roles with thresholds)
                let progressHTML = "";
                const isLeadership = ["Projektleitung", "Stv. Projektleitung", "Teamleitung", "Stv. Teamleitung"].includes(role);
                if (!isLeadership) {
                    const statusClass = score >= threshold ? 'progress-bar-fill-ready' : '';
                    progressHTML = `
                        <div class="member-progress-container">
                            <div class="member-progress-label">Punkte: ${score} / ${threshold}</div>
                            <div class="member-progress-bg">
                                <div class="member-progress-fill ${statusClass}" style="width: ${progressPercent}%"></div>
                            </div>
                        </div>
                    `;
                }

                const mCard = document.createElement('div'); 
                mCard.className = `member-card ${score >= threshold && !isLeadership ? 'card-ready-glow' : ''}`;
                mCard.id = `member-card-${btoa(encodeURIComponent(name)).replace(/=/g, '')}`; // Safe ID
                mCard.onclick = () => openMemberModal(name);
                mCard.innerHTML = `
                    <div class="member-name">${name}</div>
                    <div class="member-stats-preview">
                        🎫 T: ${mStats.tickets || 0} | 🛠️ S: ${mStats.supports || 0} | ⭐ F: ${mStats.feedbacks || 0}<br>
                        🛃 E: ${mStats.einreisen || 0} | 🛬 A: ${mStats.ausreisen || 0} | 🚫 B: ${mStats.banne || 0}
                    </div>
                    ${progressHTML}
                `;
                grid.appendChild(mCard);
            });
        }
        section.appendChild(grid); 
        container.appendChild(section);
    });

    if (window.lucide) {
        lucide.createIcons();
    }
}

// Render AI Uprank Suggestions in Dashboard Sidebar
export function renderAiSuggestions() {
    const aiDiv = document.getElementById('ai-suggestions'); 
    if (!aiDiv) return;
    
    const suggestions = getUprankSuggestions();
    
    if (suggestions.length === 0) { 
        aiDiv.innerHTML = `<div style="font-size:0.85rem; color:var(--text-muted); text-align:center; padding:15px; font-style: italic;">Derzeit keine Teammitglieder aktiv.</div>`; 
        return;
    }

    let html = ""; 
    suggestions.forEach(s => {
        const itemClass = s.ready ? 'ai-item ai-item-ready' : 'ai-item';
        const progressMeter = `
            <div class="ai-meter-bg">
                <div class="ai-meter-fill ${s.ready ? 'ai-meter-ready' : ''}" style="width: ${s.progressPercent}%"></div>
            </div>
        `;
        
        const detailsText = s.ready 
            ? `<div class="ai-ready-text">🚀 Bereit für Beförderung! (${s.score} / ${s.threshold})</div>`
            : `<div class="ai-progress-text">Fortschritt: ${s.score} / ${s.threshold} (${s.progressPercent}%) - Benötigt noch ${s.missingPoints} Pkt.</div>`;

        html += `
            <div class="${itemClass}" onclick="focusMemberCard('${s.name}')" style="cursor: pointer;">
                <div class="ai-header">${s.name}</div>
                <div class="ai-role-indicator">Aktuelle Rolle: <strong>${s.role}</strong></div>
                ${progressMeter}
                ${detailsText}
                <div class="ai-reason">${s.details}</div>
            </div>
        `; 
    });
    aiDiv.innerHTML = html;
}

// Highlight member card and open edit modal when clicking AI items
export function focusMemberCard(name) {
    const cardId = `member-card-${btoa(encodeURIComponent(name)).replace(/=/g, '')}`;
    const card = document.getElementById(cardId);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('highlight-animation');
        setTimeout(() => {
            card.classList.remove('highlight-animation');
            openMemberModal(name);
        }, 800);
    } else {
        openMemberModal(name);
    }
}

// Open Edit Stats Modal for a member
export function openMemberModal(name) {
    currentSelectedMember = name; 
    const nameHeader = document.getElementById('modalMemberName');
    if (nameHeader) nameHeader.innerText = name;
    
    if (!stats[name]) syncMissingStats();
    
    document.getElementById('count-tickets').value = stats[name].tickets || 0; 
    document.getElementById('count-supports').value = stats[name].supports || 0;
    document.getElementById('count-feedbacks').value = stats[name].feedbacks || 0; 
    document.getElementById('count-einreisen').value = stats[name].einreisen || 0;
    document.getElementById('count-ausreisen').value = stats[name].ausreisen || 0; 
    document.getElementById('count-banne').value = stats[name].banne || 0;
    document.getElementById('edit-role').value = stats[name].role || "Supporter"; 
    document.getElementById('modal-text-log').value = ""; 
    
    document.getElementById('memberModal').style.display = 'flex';
}

export function closeModal() { 
    document.getElementById('memberModal').style.display = 'none'; 
    renderTeam(); 
    renderAiSuggestions();
}

export function openAddMemberModal() { 
    document.getElementById('addMemberModal').style.display = 'flex'; 
}

export function closeAddModal() { 
    document.getElementById('addMemberModal').style.display = 'none'; 
}

// Adjust member stat (plus or minus buttons)
export function adjustStat(statType, val) {
    if (!currentSelectedMember) return;
    if (!stats[currentSelectedMember][statType]) stats[currentSelectedMember][statType] = 0;
    
    stats[currentSelectedMember][statType] = Math.max(0, stats[currentSelectedMember][statType] + val);
    document.getElementById(`count-${statType}`).value = stats[currentSelectedMember][statType];
    
    addLogItem(`${currentSelectedMember}: ${statType.toUpperCase()} ${val > 0 ? '+' + val : val}`, statType);
    renderTeam(); 
    renderAiSuggestions();
    pushDatabaseUpdates();
}

// Update stats when user inputs value manually in modal
export function updateStatFromInput(statType) {
    if (!currentSelectedMember) return;
    let inputVal = parseInt(document.getElementById(`count-${statType}`).value);
    if (isNaN(inputVal) || inputVal < 0) inputVal = 0;
    
    stats[currentSelectedMember][statType] = inputVal;
    addLogItem(`${currentSelectedMember}: ${statType.toUpperCase()} gesetzt auf ${inputVal}`, statType);
    renderTeam(); 
    renderAiSuggestions();
    pushDatabaseUpdates();
}

// Change Member Role in modal
export function changeMemberRole() {
    if (!currentSelectedMember) return;
    const newRole = document.getElementById('edit-role').value; 
    const oldRole = stats[currentSelectedMember].role;
    if (oldRole === newRole) return;
    
    teamData[oldRole] = teamData[oldRole].filter(n => n !== currentSelectedMember);
    if (!teamData[newRole]) teamData[newRole] = []; 
    teamData[newRole].push(currentSelectedMember);
    stats[currentSelectedMember].role = newRole;
    
    addLogItem(`🔼 BEFÖRDERUNG: ${currentSelectedMember} von ${oldRole} zu ${newRole}`, 'uprank');
    renderTeam(); 
    renderAiSuggestions();
    pushDatabaseUpdates();
}

// Save text note log in modal
export function saveTextLog() {
    if (!currentSelectedMember) return;
    const txt = document.getElementById('modal-text-log').value; 
    if (!txt.trim()) return;
    addLogItem(`📝 NOTIZ für ${currentSelectedMember}: ${txt}`, 'einreisen');
    document.getElementById('modal-text-log').value = ""; 
    renderAiSuggestions();
    pushDatabaseUpdates();
}

// Remove member from team database
export function deleteMember() {
    if (!currentSelectedMember) return;
    if (!confirm(`Möchtest du ${currentSelectedMember} wirklich löschen?`)) return;
    
    const role = stats[currentSelectedMember].role; 
    teamData[role] = teamData[role].filter(n => n !== currentSelectedMember);
    delete stats[currentSelectedMember]; 
    
    addLogItem(`❌ TEAM-KICK: ${currentSelectedMember} wurde entfernt.`, 'kick');
    closeModal(); 
    renderTeam(); 
    renderAiSuggestions();
    pushDatabaseUpdates();
}

// Add brand new member
export function addMember() {
    const name = document.getElementById('add-name').value.trim(); 
    const role = document.getElementById('add-role').value;
    if (!name) return alert("Bitte Namen eingeben!");
    if (!teamData[role]) teamData[role] = []; 
    teamData[role].push(name);
    
    stats[name] = { tickets: 0, supports: 0, feedbacks: 0, einreisen: 0, ausreisen: 0, banne: 0, role: role };
    
    addLogItem(`📥 NEUES MITGLIED: ${name} als ${role} beigetreten.`, 'uprank');
    closeAddModal(); 
    document.getElementById('add-name').value = ""; 
    renderTeam(); 
    renderAiSuggestions();
    pushDatabaseUpdates();
}

// Insert log item to list
function addLogItem(message, category) {
    const now = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    textLogs.unshift({ time: now, msg: message, id: Date.now(), cat: category });
    renderLogs();
}

// Remove log entry
export function removeLog(id) {
    // Requires filter logs
    const index = textLogs.findIndex(l => l.id === id);
    if (index !== -1) {
        textLogs.splice(index, 1);
        renderLogs();
        pushDatabaseUpdates();
    }
}

// Filter logs category
export function filterLogs(category, event) {
    currentLogCategoryFilter = category;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active-filter');
    });
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active-filter');
    }
    renderLogs();
}

// Render log records in log tab
export function renderLogs() {
    const container = document.getElementById('unified-log-list');
    if (!container) return;
    container.innerHTML = "";
    
    const searchQuery = document.getElementById('log-search') ? document.getElementById('log-search').value.toLowerCase().trim() : "";
    let displayedCount = 0;

    textLogs.forEach(l => {
        if (currentLogCategoryFilter !== 'all' && l.cat !== currentLogCategoryFilter) return;
        if (searchQuery && !l.msg.toLowerCase().includes(searchQuery) && !l.time.toLowerCase().includes(searchQuery)) return;

        displayedCount++;
        const itemClass = `log-item cat-${l.cat}`;
        
        const logItem = document.createElement('div');
        logItem.className = itemClass;
        logItem.innerHTML = `
            <span><strong>[${l.time}]</strong> ${l.msg}</span>
            <span class="log-delete" onclick="removeLog(${l.id})">&times;</span>
        `;
        container.appendChild(logItem);
    });

    if (displayedCount === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.95rem; text-align: center; padding: 40px 0; font-style: italic;">Keine passenden Einträge im Archiv gefunden.</p>';
    }
}

// Dynamic AI Thresholds and Weights Settings tab renderer
export function renderSettingsTab() {
    // Render weights sliders
    const weightsContainer = document.getElementById('settings-weights-grid');
    if (weightsContainer) {
        weightsContainer.innerHTML = "";
        for (let key in aiWeights) {
            const row = document.createElement('div');
            row.className = 'settings-row';
            row.innerHTML = `
                <label class="settings-label">${key.toUpperCase()}-Gewichtung:</label>
                <div class="settings-control-group">
                    <input type="range" class="settings-slider" id="weight-slider-${key}" min="0" max="50" value="${aiWeights[key]}" oninput="document.getElementById('weight-text-${key}').innerText = this.value">
                    <span class="settings-slider-value" id="weight-text-${key}">${aiWeights[key]}</span>
                </div>
            `;
            weightsContainer.appendChild(row);
        }
    }

    // Render thresholds inputs
    const thresholdsContainer = document.getElementById('settings-thresholds-grid');
    if (thresholdsContainer) {
        thresholdsContainer.innerHTML = "";
        for (let key in aiThresholds) {
            const row = document.createElement('div');
            row.className = 'settings-row';
            row.innerHTML = `
                <label class="settings-label">${key}:</label>
                <input type="number" class="settings-input" id="threshold-input-${btoa(encodeURIComponent(key)).replace(/=/g, '')}" value="${aiThresholds[key]}" min="1">
            `;
            thresholdsContainer.appendChild(row);
        }
    }
}

// Save thresholds and weights settings to Database
export function saveSettings() {
    // Read weights
    for (let key in aiWeights) {
        const slider = document.getElementById(`weight-slider-${key}`);
        if (slider) {
            aiWeights[key] = parseInt(slider.value) || 0;
        }
    }

    // Read thresholds
    for (let key in aiThresholds) {
        const inputId = `threshold-input-${btoa(encodeURIComponent(key)).replace(/=/g, '')}`;
        const input = document.getElementById(inputId);
        if (input) {
            aiThresholds[key] = parseInt(input.value) || 100;
        }
    }

    pushDatabaseUpdates();
    alert("System-Einstellungen erfolgreich in Firebase gespeichert!");
    renderTeam();
    renderAiSuggestions();
}

// Export data stats to CSV download
export function exportStatsToCSV() {
    let csvContent = "data:text/csv;charset=utf-8,\ufeff"; // \ufeff is BOM for excel UTF-8 compatibility
    csvContent += "Name;Rolle;Tickets;Supports;Feedbacks;Einreisen;Ausreisen;Banne;Gesamtpunkte\n";
    
    for (let role in teamData) {
        if (!teamData[role]) continue;
        teamData[role].forEach(name => {
            const u = stats[name] || { tickets: 0, supports: 0, feedbacks: 0, einreisen: 0, ausreisen: 0, banne: 0 };
            const score = calculateMemberScore(u);
            csvContent += `"${name}";"${role}";${u.tickets || 0};${u.supports || 0};${u.feedbacks || 0};${u.einreisen || 0};${u.ausreisen || 0};${u.banne || 0};${score}\n`;
        });
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `maloracity_mitglieder_statistik_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

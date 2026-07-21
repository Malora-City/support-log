import { stats, aiWeights, aiThresholds } from "./database.js";

/**
 * Calculates the score for a given member statistics object.
 * @param {Object} memberStats 
 * @returns {number} score
 */
export function calculateMemberScore(memberStats) {
    if (!memberStats) return 0;
    return (memberStats.tickets || 0) * (aiWeights.tickets || 0) +
           (memberStats.supports || 0) * (aiWeights.supports || 0) +
           (memberStats.feedbacks || 0) * (aiWeights.feedbacks || 0) +
           (memberStats.einreisen || 0) * (aiWeights.einreisen || 0) +
           (memberStats.ausreisen || 0) * (aiWeights.ausreisen || 0) +
           (memberStats.banne || 0) * (aiWeights.banne || 0);
}

/**
 * Analyzes a single member's eligibility for promotion.
 * @param {string} name - member name
 * @returns {Object|null} suggestion analysis
 */
export function analyzeMemberUprank(name) {
    const member = stats[name];
    if (!member) return null;
    
    const role = member.role || "Supporter";

    // No promotion suggestions for the top leadership levels
    if (role === "Projektleitung" || role === "Stv. Projektleitung" || role === "Teamleitung" || role === "Stv. Teamleitung") {
        return null;
    }

    const score = calculateMemberScore(member);
    const threshold = aiThresholds[role] || 500;
    const ready = score >= threshold;
    const progressPercent = Math.min(100, Math.round((score / threshold) * 100));
    const missingPoints = Math.max(0, threshold - score);

    return {
        name,
        role,
        score,
        threshold,
        ready,
        progressPercent,
        missingPoints,
        details: `🎫 ${member.tickets || 0} T | 🛠️ ${member.supports || 0} S | ⭐ ${member.feedbacks || 0} F | 🛃 ${member.einreisen || 0} E`
    };
}

/**
 * Calculates all uprank candidates and categorizes them.
 * @returns {Array} suggestions sorted by ready status and closeness to threshold
 */
export function getUprankSuggestions() {
    const list = [];
    for (let name in stats) {
        const analysis = analyzeMemberUprank(name);
        if (analysis && analysis.ready) {
            list.push(analysis);
        }
    }

    // Sort: highest score first
    return list.sort((a, b) => b.score - a.score);
}

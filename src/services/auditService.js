// Audit logging is now handled server-side.
// This file is kept for backward compatibility with components that still import it.

export async function logAction(action, userId, userName, details = {}) {
    // No-op: audit logging happens on the backend automatically
    console.debug(`[Audit] ${action} by ${userName}`, details);
}

export async function getAuditLogs(limit = 50) {
    // Could call API here if needed
    return [];
}

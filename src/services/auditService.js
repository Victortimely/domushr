// Audit logging service — writes audit events to Supabase 'audit_logs' table.
// Falls back gracefully to console if the table doesn't exist yet.

import { supabase } from '../config/supabaseClient';

/**
 * Log an auditable action to the database.
 * @param {string} action - The action type (e.g. 'LOGIN', 'CREATE_EMPLOYEE', 'DELETE_SURVEY')
 * @param {string} userId - The auth user ID performing the action
 * @param {string} userName - Display name of the user
 * @param {object} details - Additional context (key-value pairs)
 */
export async function logAction(action, userId, userName, details = {}) {
    try {
        const { error } = await supabase.from('audit_logs').insert({
            action,
            user_id: userId,
            user_name: userName,
            details: typeof details === 'object' ? details : { info: details },
            created_at: new Date().toISOString(),
        });

        if (error) {
            // Table might not exist yet — fail silently to console
            if (error.code === '42P01') {
                console.debug(`[Audit] (table missing) ${action} by ${userName}`, details);
            } else {
                console.warn('[Audit] Failed to write log:', error.message);
            }
        }
    } catch (err) {
        // Network errors or other failures — never block the main flow
        console.debug(`[Audit] ${action} by ${userName}`, details);
    }
}

/**
 * Retrieve recent audit logs.
 * @param {number} limit - Max number of logs to return
 * @returns {Array} Array of audit log entries
 */
export async function getAuditLogs(limit = 50) {
    try {
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            if (error.code === '42P01') return []; // Table doesn't exist
            console.warn('[Audit] Failed to read logs:', error.message);
            return [];
        }
        return data || [];
    } catch {
        return [];
    }
}

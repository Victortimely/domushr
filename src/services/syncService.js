import { supabase } from '../config/supabaseClient';

let syncInterval = null;

export function startAutoSync() {
    if (syncInterval) return;
    syncInterval = setInterval(async () => {
        if (navigator.onLine) {
            await syncPendingSurveys();
        }
    }, 30000);
}

export function stopAutoSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

export async function syncPendingSurveys() {
    try {
        const { data: surveys, error } = await supabase
            .from('surveys')
            .select('id')
            .eq('status', 'saved');

        if (error) throw error;
        if (!surveys || surveys.length === 0) return 0;

        let synced = 0;
        for (const survey of surveys) {
            try {
                const { error: updateError } = await supabase
                    .from('surveys')
                    .update({
                        status: 'synced',
                        synced_at: new Date().toISOString(),
                    })
                    .eq('id', survey.id);

                if (!updateError) synced++;
            } catch (err) {
                console.warn('Sync failed for survey', survey.id, err);
            }
        }
        return synced;
    } catch {
        return 0;
    }
}

export function isOnline() {
    return navigator.onLine;
}

export function onConnectionChange(callback) {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
    return () => {
        window.removeEventListener('online', () => callback(true));
        window.removeEventListener('offline', () => callback(false));
    };
}

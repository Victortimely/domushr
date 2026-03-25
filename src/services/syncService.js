import api from './api';

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
        const surveys = await api.get('/surveys?status=saved');
        let synced = 0;
        for (const survey of surveys) {
            try {
                await api.put(`/surveys/${survey.id}`, {
                    status: 'synced',
                    synced_at: new Date().toISOString(),
                });
                synced++;
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

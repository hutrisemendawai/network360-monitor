import { writable, get } from 'svelte/store';
import pb from '$lib/pb.js';
import { toast } from './toast.js';

function createMonitorsStore() {
    const { subscribe, set, update } = writable([]);

    /** @type {Map<string, number[]>} monitorId -> latency history */
    const pingHistory = writable(new Map());

    /** @type {Map<string, number>} monitorId -> consecutive losses */
    const consecutiveLosses = writable(new Map());

    let monitorsUnsubscribe = null;
    let pingLogsUnsubscribe = null;

    return {
        subscribe,
        pingHistory,
        consecutiveLosses,

        async load() {
            if (!pb.authStore.isValid) return;

            try {
                const records = await pb.collection('monitors').getFullList({
                    filter: `user = "${pb.authStore.record.id}"`,
                    sort: '-created'
                });
                set(records);
            } catch (e) {
                console.error('Failed to load monitors:', e);
            }
        },

        async subscribeRealtime() {
            // Subscribe to monitors changes
            monitorsUnsubscribe = await pb.collection('monitors').subscribe('*', (e) => {
                const userId = pb.authStore.record?.id;
                if (e.record.user !== userId) return;

                if (e.action === 'create') {
                    update(m => [e.record, ...m]);
                } else if (e.action === 'update') {
                    update(m => m.map(mon => mon.id === e.record.id ? e.record : mon));
                } else if (e.action === 'delete') {
                    update(m => m.filter(mon => mon.id !== e.record.id));
                }
            });

            // Subscribe to ping_logs changes
            pingLogsUnsubscribe = await pb.collection('ping_logs').subscribe('*', (e) => {
                if (e.action !== 'create') return;

                const log = e.record;
                const monitorId = log.monitor;

                // Update ping history
                pingHistory.update(map => {
                    const history = map.get(monitorId) || [];
                    history.push(log.latency_ms);
                    if (history.length > 60) history.shift();
                    map.set(monitorId, history);
                    return new Map(map);
                });

                // Track consecutive losses
                if (log.is_packet_loss) {
                    consecutiveLosses.update(map => {
                        const count = (map.get(monitorId) || 0) + 1;
                        map.set(monitorId, count);

                        // Check threshold from the monitor
                        const monitors = get({ subscribe });
                        const monitor = monitors.find(m => m.id === monitorId);
                        if (monitor) {
                            const thresholdPings = Math.ceil((monitor.alert_threshold_sec * 1000) / monitor.interval_ms);
                            if (count >= thresholdPings && count % thresholdPings === 0) {
                                toast.error(`🔴 ALERT: ${monitor.name} (${monitor.target_host}) — ${count} consecutive packet losses!`, 8000);
                            }
                        }

                        return new Map(map);
                    });
                } else {
                    consecutiveLosses.update(map => {
                        map.set(monitorId, 0);
                        return new Map(map);
                    });
                }

                // Dispatch custom event for individual card components
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('ping-log', { detail: log }));
                }
            });
        },

        unsubscribeRealtime() {
            if (monitorsUnsubscribe) {
                pb.collection('monitors').unsubscribe('*');
                monitorsUnsubscribe = null;
            }
            if (pingLogsUnsubscribe) {
                pb.collection('ping_logs').unsubscribe('*');
                pingLogsUnsubscribe = null;
            }
        },

        async create(data) {
            data.user = pb.authStore.record.id;
            data.status = 'stopped';
            const record = await pb.collection('monitors').create(data);
            return record;
        },

        async updateMonitor(id, data) {
            const record = await pb.collection('monitors').update(id, data);
            return record;
        },

        async deleteMonitor(id) {
            await pb.collection('monitors').delete(id);
        },

        async startMonitor(id) {
            await pb.collection('monitors').update(id, { status: 'running' });
        },

        async stopMonitor(id) {
            await pb.collection('monitors').update(id, { status: 'stopped' });
        },

        async loadHistory(monitorId, limit = 50) {
            try {
                const logs = await pb.collection('ping_logs').getList(1, limit, {
                    filter: `monitor = "${monitorId}"`,
                    sort: '-created'
                });
                const latencies = logs.items.reverse().map(l => l.latency_ms);
                pingHistory.update(map => {
                    map.set(monitorId, latencies);
                    return new Map(map);
                });
                return logs.items.reverse();
            } catch (e) {
                console.error('Failed to load ping history:', e);
                return [];
            }
        }
    };
}

export const monitors = createMonitorsStore();

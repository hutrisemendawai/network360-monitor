/**
 * Network360 Ping Worker
 * 
 * Standalone Node.js process that:
 * 1. Authenticates with PocketBase as superuser
 * 2. Reads all monitors with status "running"
 * 3. Pings each target at the configured interval
 * 4. Writes results to ping_logs collection
 * 5. Listens for real-time monitor changes (start/stop)
 * 
 * Usage: node worker.js <superuser-email> <superuser-password>
 */

import PocketBase from 'pocketbase';
import ping from 'ping';

const PB_URL = 'http://127.0.0.1:8090';

/** @type {Map<string, { timer: number, running: boolean }>} */
const activeWorkers = new Map();

let pb;

async function init() {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
        console.error('Usage: node worker.js <superuser-email> <superuser-password>');
        process.exit(1);
    }

    pb = new PocketBase(PB_URL);
    pb.autoCancellation(false);

    try {
        console.log('🔐 Authenticating with PocketBase...');
        await pb.collection('_superusers').authWithPassword(email, password);
        console.log('✅ Authenticated as superuser\n');
    } catch (err) {
        console.error('❌ Authentication failed:', err.message);
        process.exit(1);
    }

    // Load all running monitors
    try {
        const monitors = await pb.collection('monitors').getFullList({
            filter: 'status = "running"'
        });
        console.log(`📡 Found ${monitors.length} running monitor(s)\n`);

        for (const monitor of monitors) {
            startPingWorker(monitor);
        }
    } catch (err) {
        console.error('❌ Failed to load monitors:', err.message);
    }

    // Subscribe to monitor changes in real-time
    pb.collection('monitors').subscribe('*', (e) => {
        const monitor = e.record;

        if (e.action === 'update') {
            if (monitor.status === 'running' && !activeWorkers.has(monitor.id)) {
                console.log(`▶️  Monitor "${monitor.name}" started`);
                startPingWorker(monitor);
            } else if (monitor.status === 'stopped' && activeWorkers.has(monitor.id)) {
                console.log(`⏹️  Monitor "${monitor.name}" stopped`);
                stopPingWorker(monitor.id);
            } else if (monitor.status === 'running' && activeWorkers.has(monitor.id)) {
                // Settings changed — restart
                console.log(`🔄 Monitor "${monitor.name}" updated — restarting`);
                stopPingWorker(monitor.id);
                startPingWorker(monitor);
            }
        } else if (e.action === 'delete') {
            if (activeWorkers.has(monitor.id)) {
                console.log(`🗑️  Monitor "${monitor.name}" deleted — stopping`);
                stopPingWorker(monitor.id);
            }
        } else if (e.action === 'create' && monitor.status === 'running') {
            console.log(`➕ New monitor "${monitor.name}" — starting`);
            startPingWorker(monitor);
        }
    });

    console.log('👂 Listening for monitor changes...\n');
    console.log('─'.repeat(50));
}

function startPingWorker(monitor) {
    if (activeWorkers.has(monitor.id)) return;

    const state = { running: true, timer: null };
    activeWorkers.set(monitor.id, state);

    const intervalMs = Math.max(monitor.interval_ms || 3000, 500);

    console.log(`  📍 Pinging ${monitor.target_host} every ${intervalMs}ms`);

    async function doPing() {
        if (!state.running) return;

        try {
            const result = await ping.promise.probe(monitor.target_host, {
                timeout: Math.max(Math.floor(intervalMs / 1000), 2),
                min_reply: 1
            });

            const isLoss = !result.alive;
            const latency = isLoss ? 0 : parseFloat(result.time) || 0;

            // Write to PocketBase
            try {
                await pb.collection('ping_logs').create({
                    monitor: monitor.id,
                    latency_ms: latency,
                    is_packet_loss: isLoss
                });

                const symbol = isLoss ? '❌' : '✅';
                const latencyStr = isLoss ? 'TIMEOUT' : `${latency.toFixed(1)}ms`;
                process.stdout.write(`  ${symbol} ${monitor.target_host}: ${latencyStr}\r`);
            } catch (writeErr) {
                console.error(`  ⚠️  Write error for ${monitor.target_host}:`, writeErr.message);
            }
        } catch (pingErr) {
            // If ping itself fails (e.g., invalid host)
            try {
                await pb.collection('ping_logs').create({
                    monitor: monitor.id,
                    latency_ms: 0,
                    is_packet_loss: true
                });
            } catch (_) {}
            console.error(`  ⚠️  Ping error for ${monitor.target_host}:`, pingErr.message);
        }

        // Schedule next ping
        if (state.running) {
            state.timer = setTimeout(doPing, intervalMs);
        }
    }

    // Start first ping immediately
    doPing();
}

function stopPingWorker(monitorId) {
    const state = activeWorkers.get(monitorId);
    if (state) {
        state.running = false;
        if (state.timer) clearTimeout(state.timer);
        activeWorkers.delete(monitorId);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down worker...');
    for (const [id] of activeWorkers) {
        stopPingWorker(id);
    }
    pb.collection('monitors').unsubscribe('*');
    process.exit(0);
});

process.on('SIGTERM', () => {
    for (const [id] of activeWorkers) {
        stopPingWorker(id);
    }
    process.exit(0);
});

init();

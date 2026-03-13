/**
 * Network360 Ping Worker
 * 
 * Standalone Node.js process that:
 * 1. Authenticates with PocketBase as superuser
 * 2. Reads all monitors with status "running"
 * 3. Pings each target at the configured interval (with TTL and jitter)
 * 4. Writes results to ping_logs collection
 * 5. Runs periodic DPI (protocol/service detection) scans and stores results on monitor
 * 6. Listens for real-time monitor changes (start/stop)
 * 
 * Usage: node worker.js <superuser-email> <superuser-password>
 */

import PocketBase from 'pocketbase';
import { execFile } from 'child_process';
import { promisify } from 'util';
import net from 'net';
import { EventSource } from 'eventsource';

const PB_URL = 'http://127.0.0.1:8090';

// PocketBase realtime in Node requires an EventSource implementation.
global.EventSource = EventSource;

const execFileAsync = promisify(execFile);

/** @type {Map<string, { timer: ReturnType<typeof setTimeout> | null, running: boolean }>} */
const activeWorkers = new Map();

/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const dpiTimers = new Map();

/** @type {Map<string, number>} Previous latency per monitor for jitter calculation */
const previousLatencies = new Map();

/** 5-minute DPI rescan interval */
const DPI_INTERVAL_MS = 5 * 60 * 1000;

/** Known TCP services for DPI port probing */
const KNOWN_SERVICES = [
    { port: 21,    name: 'FTP' },
    { port: 22,    name: 'SSH' },
    { port: 23,    name: 'Telnet' },
    { port: 25,    name: 'SMTP' },
    { port: 53,    name: 'DNS' },
    { port: 80,    name: 'HTTP' },
    { port: 110,   name: 'POP3' },
    { port: 143,   name: 'IMAP' },
    { port: 443,   name: 'HTTPS' },
    { port: 465,   name: 'SMTPS' },
    { port: 993,   name: 'IMAPS' },
    { port: 995,   name: 'POP3S' },
    { port: 3306,  name: 'MySQL' },
    { port: 3389,  name: 'RDP' },
    { port: 5432,  name: 'PostgreSQL' },
    { port: 5900,  name: 'VNC' },
    { port: 6379,  name: 'Redis' },
    { port: 8080,  name: 'HTTP-Alt' },
    { port: 8443,  name: 'HTTPS-Alt' },
    { port: 27017, name: 'MongoDB' },
];

/** QoS classification map: class → matching service names */
const QOS_MAP = /** @type {Record<string, string[]>} */({
    'Web':           ['HTTP', 'HTTPS', 'HTTP-Alt', 'HTTPS-Alt'],
    'Email':         ['SMTP', 'SMTPS', 'IMAP', 'IMAPS', 'POP3', 'POP3S'],
    'Database':      ['MySQL', 'PostgreSQL', 'Redis', 'MongoDB'],
    'Remote Access': ['SSH', 'Telnet', 'RDP', 'VNC'],
    'File Transfer': ['FTP'],
    'DNS':           ['DNS'],
});

let pb;

// ---------------------------------------------------------------------------
// Ping with TTL extraction
// ---------------------------------------------------------------------------

/**
 * Pings a host once using the system `ping` binary and extracts latency + TTL.
 * @param {string} host
 * @param {number} timeoutSec
 * @returns {Promise<{ alive: boolean, latency: number, ttl: number | null }>}
 */
async function pingWithStats(host, timeoutSec) {
    try {
        const { stdout } = await execFileAsync(
            'ping',
            ['-c', '1', '-W', String(timeoutSec), host],
            { timeout: (timeoutSec + 3) * 1000 }
        );
        const ttlMatch = stdout.match(/ttl=(\d+)/i);
        const timeMatch = stdout.match(/time=([0-9.]+)\s*ms/i);
        const alive = !!timeMatch;
        const ttl = ttlMatch ? parseInt(ttlMatch[1], 10) : null;
        const latency = timeMatch ? parseFloat(timeMatch[1]) : 0;
        return { alive, latency, ttl };
    } catch {
        return { alive: false, latency: 0, ttl: null };
    }
}

// ---------------------------------------------------------------------------
// Jitter calculation
// ---------------------------------------------------------------------------

/**
 * Returns the absolute difference between the current latency and the previous
 * latency for the same monitor. Returns 0 on the first ping or when either
 * value is 0 (packet loss).
 * @param {string} monitorId
 * @param {number} currentLatency
 * @returns {number}
 */
function calculateJitter(monitorId, currentLatency) {
    const prev = previousLatencies.get(monitorId);
    previousLatencies.set(monitorId, currentLatency);
    if (prev === undefined || prev === 0 || currentLatency === 0) return 0;
    return Math.abs(currentLatency - prev);
}

// ---------------------------------------------------------------------------
// DPI (Deep Packet Inspection / Protocol Detection)
// ---------------------------------------------------------------------------

/**
 * Attempts a TCP connection to host:port and returns true if the port is open.
 * @param {string} host
 * @param {number} port
 * @param {number} [timeoutMs]
 * @returns {Promise<boolean>}
 */
function probePort(host, port, timeoutMs = 2000) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(timeoutMs);
        socket.connect(port, host, () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
        socket.on('error',   () => { socket.destroy(); resolve(false); });
    });
}

/**
 * Probes all KNOWN_SERVICES ports on the target host and returns detected
 * protocols, open port numbers, and a QoS classification string.
 * @param {string} host
 * @returns {Promise<{ protocols: string[], openPorts: number[], qosClass: string }>}
 */
async function runDPIScan(host) {
    const openPorts = /** @type {number[]} */([]);
    const detectedProtocols = /** @type {string[]} */([]);

    // Probe in small batches to avoid exhausting file descriptors
    const batchSize = 5;
    for (let i = 0; i < KNOWN_SERVICES.length; i += batchSize) {
        const batch = KNOWN_SERVICES.slice(i, i + batchSize);
        const results = await Promise.all(
            batch.map(async ({ port, name }) => ({
                port,
                name,
                open: await probePort(host, port)
            }))
        );
        for (const { port, name, open } of results) {
            if (open) {
                openPorts.push(port);
                detectedProtocols.push(name);
            }
        }
    }

    // Determine highest-priority QoS class
    let qosClass = detectedProtocols.length > 0 ? 'Network Service' : 'ICMP Only';
    for (const [cls, protos] of Object.entries(QOS_MAP)) {
        if (detectedProtocols.some(p => protos.includes(p))) {
            qosClass = cls;
            break;
        }
    }

    return { protocols: detectedProtocols, openPorts, qosClass };
}

/**
 * Runs a DPI scan for a monitor and saves the result back to the monitor record.
 * @param {any} monitor
 */
async function scheduleDPIScan(monitor) {
    try {
        console.log(`  🔍 DPI scan starting for ${monitor.target_host}...`);
        const { protocols, openPorts, qosClass } = await runDPIScan(monitor.target_host);
        await pb.collection('monitors').update(monitor.id, {
            dpi_protocols: JSON.stringify(protocols),
            dpi_open_ports: JSON.stringify(openPorts),
            dpi_qos_class: qosClass
        });
        const summary = protocols.length > 0
            ? `${protocols.join(', ')} [${qosClass}]`
            : `no open TCP ports found [${qosClass}]`;
        console.log(`  🔍 DPI result for ${monitor.target_host}: ${summary}`);
    } catch (err) {
        console.error(`  ⚠️  DPI error for ${monitor.target_host}:`, /** @type {Error} */(err).message);
    }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

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
        console.error('❌ Authentication failed:', /** @type {Error} */(err).message);
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
        console.error('❌ Failed to load monitors:', /** @type {Error} */(err).message);
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

// ---------------------------------------------------------------------------
// Ping worker lifecycle
// ---------------------------------------------------------------------------

/** @param {any} monitor */
function startPingWorker(monitor) {
    if (activeWorkers.has(monitor.id)) return;

    const state = { running: true, timer: null };
    activeWorkers.set(monitor.id, state);

    const intervalMs = Math.max(monitor.interval_ms || 3000, 500);

    console.log(`  📍 Pinging ${monitor.target_host} every ${intervalMs}ms`);

    async function doPing() {
        if (!state.running) return;

        try {
            const timeoutSec = Math.max(Math.floor(intervalMs / 1000), 2);
            const { alive, latency, ttl } = await pingWithStats(monitor.target_host, timeoutSec);

            const isLoss = !alive;
            const jitter = isLoss ? 0 : calculateJitter(monitor.id, latency);

            // Write to PocketBase
            try {
                await pb.collection('ping_logs').create({
                    monitor: monitor.id,
                    latency_ms: isLoss ? 0 : latency,
                    is_packet_loss: isLoss,
                    ttl: ttl ?? undefined,
                    jitter_ms: jitter
                });

                const symbol = isLoss ? '❌' : '✅';
                const latencyStr = isLoss ? 'TIMEOUT' : `${latency.toFixed(1)}ms`;
                const ttlStr = ttl !== null ? ` TTL=${ttl}` : '';
                const jitterStr = !isLoss && jitter > 0 ? ` jitter=${jitter.toFixed(1)}ms` : '';
                process.stdout.write(`  ${symbol} ${monitor.target_host}: ${latencyStr}${ttlStr}${jitterStr}\r`);
            } catch (writeErr) {
                console.error(`  ⚠️  Write error for ${monitor.target_host}:`, /** @type {Error} */(writeErr).message);
            }
        } catch (pingErr) {
            // If ping itself fails (e.g., invalid host)
            try {
                await pb.collection('ping_logs').create({
                    monitor: monitor.id,
                    latency_ms: 0,
                    is_packet_loss: true,
                    jitter_ms: 0
                });
            } catch (_) {}
            console.error(`  ⚠️  Ping error for ${monitor.target_host}:`, /** @type {Error} */(pingErr).message);
        }

        // Schedule next ping
        if (state.running) {
            state.timer = setTimeout(doPing, intervalMs);
        }
    }

    // Start first ping immediately
    doPing();

    // Start DPI scan immediately, then repeat every DPI_INTERVAL_MS
    scheduleDPIScan(monitor);
    const dpiTimer = setInterval(() => scheduleDPIScan(monitor), DPI_INTERVAL_MS);
    dpiTimers.set(monitor.id, dpiTimer);
}

/** @param {string} monitorId */
function stopPingWorker(monitorId) {
    const state = activeWorkers.get(monitorId);
    if (state) {
        state.running = false;
        if (state.timer) clearTimeout(state.timer);
        activeWorkers.delete(monitorId);
    }
    previousLatencies.delete(monitorId);

    const dpiTimer = dpiTimers.get(monitorId);
    if (dpiTimer) {
        clearInterval(dpiTimer);
        dpiTimers.delete(monitorId);
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


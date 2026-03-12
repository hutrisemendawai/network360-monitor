<script>
    import { onMount } from 'svelte';
    import PingAnimation from './PingAnimation.svelte';
    import LatencyChart from './LatencyChart.svelte';
    import { monitors } from '$lib/stores/monitors.js';
    import { toast } from '$lib/stores/toast.js';

    /** @type {{ monitor: any, onEdit?: () => void }} */
    let { monitor, onEdit = () => {} } = $props();

    let latestLatency = $state(0);
    let latestPacketLoss = $state(false);
    /** @type {number[]} */
    let chartData = $state([]);
    let loading = $state(false);
    let showChart = $state(true);
    let consecutiveLossCount = $state(0);

    // Derive status info from monitor state
    let statusInfo = $derived.by(() => {
        if (monitor.status === 'stopped') {
            return { label: 'Stopped', color: 'text-gray-400', dot: 'bg-gray-400', glow: '' };
        }
        if (latestPacketLoss || consecutiveLossCount > 0) {
            return { label: 'Down', color: 'text-red-400', dot: 'bg-red-400', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.6)]' };
        }
        if (latestLatency > 0) {
            const avgData = chartData.filter(d => d > 0);
            const avg = avgData.length > 0 ? avgData.reduce((a, b) => a + b, 0) / avgData.length : latestLatency;
            if (latestLatency > avg * 1.2) {
                return { label: 'Spike', color: 'text-amber-400', dot: 'bg-amber-400', glow: 'shadow-[0_0_8px_rgba(245,158,11,0.6)]' };
            }
        }
        return { label: 'Healthy', color: 'text-green-400', dot: 'bg-green-400', glow: 'shadow-[0_0_8px_rgba(34,197,94,0.4)]' };
    });

    let isAlerting = $derived(consecutiveLossCount >= Math.ceil((monitor.alert_threshold_sec * 1000) / monitor.interval_ms));

    /** @param {CustomEvent} e */
    function handlePingLog(e) {
        const log = e.detail;
        if (log.monitor !== monitor.id) return;

        latestLatency = log.latency_ms;
        latestPacketLoss = log.is_packet_loss;

        if (log.is_packet_loss) {
            consecutiveLossCount++;
        } else {
            consecutiveLossCount = 0;
        }

        // Update chart data
        chartData = [...chartData, log.is_packet_loss ? 0 : log.latency_ms].slice(-50);
    }

    async function toggleStatus() {
        loading = true;
        try {
            if (monitor.status === 'running') {
                await monitors.stopMonitor(monitor.id);
            } else {
                await monitors.startMonitor(monitor.id);
            }
        } catch (err) {
            toast.error(`Failed to update monitor: ${/** @type {Error} */ (err).message}`);
        } finally {
            loading = false;
        }
    }

    async function handleRestart() {
        loading = true;
        try {
            await monitors.stopMonitor(monitor.id);
            await new Promise(r => setTimeout(r, 500));
            await monitors.startMonitor(monitor.id);
            toast.success(`Monitor "${monitor.name}" restarted!`);
        } catch (err) {
            toast.error(`Failed to restart: ${/** @type {Error} */ (err).message}`);
        } finally {
            loading = false;
        }
    }

    async function handleDelete() {
        if (!confirm(`Delete monitor "${monitor.name}"?`)) return;
        try {
            await monitors.deleteMonitor(monitor.id);
            toast.success(`Monitor "${monitor.name}" deleted.`);
        } catch (err) {
            toast.error(`Failed to delete: ${/** @type {Error} */ (err).message}`);
        }
    }


    onMount(() => {
        // Load initial ping history
        monitors.loadHistory(monitor.id, 50).then((/** @type {any[]} */ logs) => {
            chartData = logs.map((/** @type {any} */ l) => l.is_packet_loss ? 0 : l.latency_ms);
            if (logs.length > 0) {
                const last = logs[logs.length - 1];
                latestLatency = last.latency_ms;
                latestPacketLoss = last.is_packet_loss;
            }
        });

        // Listen for real-time ping logs
        // @ts-ignore - CustomEvent handler
        window.addEventListener('ping-log', handlePingLog);

        return () => {
            // @ts-ignore - CustomEvent handler
            window.removeEventListener('ping-log', handlePingLog);
        };
    });
</script>

<div
    class="glass-card glass-card-hover overflow-hidden transition-all duration-300 {isAlerting ? 'animate-pulse-alert !border-red-500/60' : ''}"
>
    <!-- Header -->
    <div class="p-4 pb-3 border-b border-[var(--color-border-glass)]">
        <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
                <h3 class="text-sm font-semibold text-white truncate">{monitor.name}</h3>
                <p class="text-xs text-[var(--color-text-muted)] mt-0.5 font-mono truncate">{monitor.target_host}</p>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
                <div class="h-2 w-2 rounded-full {statusInfo.dot} {statusInfo.glow} {monitor.status === 'running' && !latestPacketLoss ? 'animate-pulse' : ''}"></div>
                <span class="text-xs font-medium {statusInfo.color}">{statusInfo.label}</span>
            </div>
        </div>

        <!-- Latency display -->
        {#if monitor.status === 'running'}
            <div class="mt-2 flex items-baseline gap-1">
                {#if latestPacketLoss}
                    <span class="text-2xl font-bold text-red-400">RTO</span>
                {:else if latestLatency > 0}
                    <span class="text-2xl font-bold {latestLatency > 100 ? 'text-amber-400' : 'text-cyan-400'}">{latestLatency.toFixed(0)}</span>
                    <span class="text-xs text-[var(--color-text-muted)]">ms</span>
                {:else}
                    <span class="text-lg text-[var(--color-text-muted)]">Waiting...</span>
                {/if}
            </div>
        {/if}
    </div>

    <!-- Ping Animation -->
    <div class="px-4 py-2 border-b border-[var(--color-border-glass)] bg-black/20">
        <PingAnimation latencyMs={latestLatency} isPacketLoss={latestPacketLoss} />
    </div>

    <!-- Chart -->
    {#if showChart && chartData.length > 2}
        <div class="px-4 py-3 h-[140px] border-b border-[var(--color-border-glass)]">
            <LatencyChart data={chartData} />
        </div>
    {/if}

    <!-- Controls -->
    <div class="p-3 flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5">
            <!-- Start / Stop -->
            <button
                onclick={toggleStatus}
                disabled={loading}
                class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer {monitor.status === 'running' ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20' : 'bg-green-500/15 text-green-400 hover:bg-green-500/25 border border-green-500/20'}"
            >
                {#if monitor.status === 'running'}
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                    Stop
                {:else}
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Start
                {/if}
            </button>

            <!-- Restart -->
            {#if monitor.status === 'running'}
                <button
                    onclick={handleRestart}
                    disabled={loading}
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/20 transition-all cursor-pointer"
                >
                    <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                    Restart
                </button>
            {/if}
        </div>

        <div class="flex items-center gap-1">
            <!-- Edit -->
            <button
                onclick={onEdit}
                class="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-cyan-400 hover:bg-cyan-500/10 transition-all cursor-pointer"
                title="Edit"
            >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>

            <!-- Toggle Chart -->
            <button
                onclick={() => showChart = !showChart}
                class="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-cyan-400 hover:bg-cyan-500/10 transition-all cursor-pointer"
                title="Toggle chart"
            >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            </button>

            <!-- Delete -->
            <button
                onclick={handleDelete}
                class="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                title="Delete"
            >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
        </div>
    </div>

    <!-- Info bar -->
    <div class="px-4 py-2 bg-black/20 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
        <span>Interval: {monitor.interval_ms}ms</span>
        <span>Alert: {monitor.alert_threshold_sec}s</span>
        <span>Pings: {chartData.length}</span>
    </div>
</div>

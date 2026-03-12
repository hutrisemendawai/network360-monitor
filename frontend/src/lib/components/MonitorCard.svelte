<script>
    import { onMount } from 'svelte';
    import PingAnimation from './PingAnimation.svelte';
    import LatencyChart from './LatencyChart.svelte';
    import { monitors } from '$lib/stores/monitors.js';
    import { toast } from '$lib/stores/toast.js';

    /** @type {{ monitor: any, showAllCharts?: boolean, showAllAnimations?: boolean, onEdit?: () => void }} */
    let { monitor, showAllCharts = true, showAllAnimations = true, onEdit = () => {} } = $props();

    let latestLatency = $state(0);
    let latestPacketLoss = $state(false);
    /** @type {number[]} */
    let chartData = $state([]);
    let loading = $state(false);
    let showChart = $state(true);
    let showAnimation = $state(true);
    let consecutiveLossCount = $state(0);
    let chartVisible = $derived(showAllCharts && showChart);
    let animationVisible = $derived(showAllAnimations && showAnimation);
    let showExportPanel = $state(false);
    let exportLoading = $state(false);
    let exportStart = $state('');
    let exportEnd = $state('');

    /** @param {'1h' | '24h' | '7d'} preset */
    function applyExportPreset(preset) {
        const now = new Date();
        const start = new Date(now);

        if (preset === '1h') start.setHours(start.getHours() - 1);
        if (preset === '24h') start.setDate(start.getDate() - 1);
        if (preset === '7d') start.setDate(start.getDate() - 7);

        exportStart = toDateTimeLocalValue(start);
        exportEnd = toDateTimeLocalValue(now);
    }

    $effect(() => {
        if (showAllCharts) {
            showChart = true;
        }
    });

    $effect(() => {
        if (showAllAnimations) {
            showAnimation = true;
        }
    });

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

    /** @param {Date} date */
    function toDateTimeLocalValue(date) {
        /** @param {number} value */
        const pad = (value) => String(value).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    /** @param {string} value */
    function toPocketBaseDate(value) {
        if (!value) return null;

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;

        return date.toISOString().replace('T', ' ').replace('Z', 'Z');
    }

    /** @param {string | number | boolean | null | undefined} value */
    function escapeCsvValue(value) {
        const stringValue = String(value ?? '');
        if (/[",\n]/.test(stringValue)) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    }

    async function handleExportCsv() {
        exportLoading = true;
        try {
            const startDate = toPocketBaseDate(exportStart);
            const endDate = toPocketBaseDate(exportEnd);

            if (!startDate || !endDate) {
                throw new Error('Please select both start and end date/time.');
            }

            if (new Date(exportStart) > new Date(exportEnd)) {
                throw new Error('Start date/time must be before end date/time.');
            }

            const logs = await monitors.loadLogsForExport(monitor.id, startDate, endDate);
            if (logs.length === 0) {
                toast.error('No ping logs found in the selected date range.');
                return;
            }

            const rows = [
                ['monitor_name', 'target_host', 'timestamp', 'latency_ms', 'is_packet_loss'],
                ...logs.map((log) => [
                    monitor.name,
                    monitor.target_host,
                    log.logged_at || log.created || log.updated || '',
                    log.latency_ms ?? 0,
                    log.is_packet_loss ? 'true' : 'false'
                ])
            ];

            const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\r\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `${monitor.name.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase()}_${exportStart.replace(/[:T]/g, '-')}_${exportEnd.replace(/[:T]/g, '-')}.csv`;
            anchor.click();
            URL.revokeObjectURL(url);

            toast.success(`Exported ${logs.length} ping logs to CSV.`);
        } catch (err) {
            toast.error(`Failed to export CSV: ${/** @type {Error} */ (err).message}`);
        } finally {
            exportLoading = false;
        }
    }


    onMount(() => {
        applyExportPreset('1h');

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
    {#if animationVisible}
        <div class="px-4 py-2 border-b border-[var(--color-border-glass)] bg-black/20">
            <PingAnimation latencyMs={latestLatency} isPacketLoss={latestPacketLoss} />
        </div>
    {/if}

    <!-- Chart -->
    {#if chartVisible}
        <div class="px-4 py-3 h-[140px] border-b border-[var(--color-border-glass)]">
            {#if chartData.length > 0}
                <LatencyChart data={chartData} />
            {:else}
                <div class="flex h-full items-center justify-center rounded-lg border border-dashed border-[var(--color-border-glass)] bg-black/10 text-center text-xs text-[var(--color-text-muted)]">
                    Waiting for ping history...
                </div>
            {/if}
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

            <!-- Toggle Animation -->
            <button
                onclick={() => showAnimation = !showAnimation}
                class="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-teal-300 hover:bg-teal-500/10 transition-all cursor-pointer"
                title="Toggle animation"
            >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h5m10 0h5M12 2v5m0 10v5"/><circle cx="12" cy="12" r="3"/></svg>
            </button>

            <!-- Export CSV -->
            <button
                onclick={() => showExportPanel = !showExportPanel}
                class="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-emerald-300 hover:bg-emerald-500/10 transition-all cursor-pointer"
                title="Export CSV"
            >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
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

    {#if showExportPanel}
        <div class="border-t border-[var(--color-border-glass)] bg-black/15 px-4 py-3">
            <div class="flex flex-col gap-3">
                <div class="flex items-center justify-between gap-3">
                    <div>
                        <p class="text-xs font-semibold text-white">Export Ping Logs</p>
                        <p class="text-[10px] text-[var(--color-text-muted)]">Choose a date/time range and download this monitor's ping history as CSV.</p>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label class="flex flex-col gap-1">
                        <span class="text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Start</span>
                        <input bind:value={exportStart} type="datetime-local" class="rounded-lg border border-[var(--color-border-glass)] bg-black/20 px-3 py-2 text-xs text-white outline-none transition-colors focus:border-cyan-500/40" />
                    </label>
                    <label class="flex flex-col gap-1">
                        <span class="text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">End</span>
                        <input bind:value={exportEnd} type="datetime-local" class="rounded-lg border border-[var(--color-border-glass)] bg-black/20 px-3 py-2 text-xs text-white outline-none transition-colors focus:border-cyan-500/40" />
                    </label>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button type="button" onclick={() => applyExportPreset('1h')} class="rounded-lg border border-[var(--color-border-glass)] bg-white/5 px-2.5 py-1 text-[10px] font-medium text-[var(--color-text-muted)] transition-colors hover:border-cyan-500/30 hover:text-cyan-300">Last 1 Hour</button>
                    <button type="button" onclick={() => applyExportPreset('24h')} class="rounded-lg border border-[var(--color-border-glass)] bg-white/5 px-2.5 py-1 text-[10px] font-medium text-[var(--color-text-muted)] transition-colors hover:border-cyan-500/30 hover:text-cyan-300">Last 24 Hours</button>
                    <button type="button" onclick={() => applyExportPreset('7d')} class="rounded-lg border border-[var(--color-border-glass)] bg-white/5 px-2.5 py-1 text-[10px] font-medium text-[var(--color-text-muted)] transition-colors hover:border-cyan-500/30 hover:text-cyan-300">Last 7 Days</button>
                </div>
                <div class="flex justify-end">
                    <button
                        onclick={handleExportCsv}
                        disabled={exportLoading}
                        class="inline-flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 transition-all hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
                        {exportLoading ? 'Exporting...' : 'Download CSV'}
                    </button>
                </div>
            </div>
        </div>
    {/if}

    <!-- Info bar -->
    <div class="px-4 py-2 bg-black/20 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
        <span>Interval: {monitor.interval_ms}ms</span>
        <span>Alert: {monitor.alert_threshold_sec}s</span>
        <span>Pings: {chartData.length}</span>
    </div>
</div>

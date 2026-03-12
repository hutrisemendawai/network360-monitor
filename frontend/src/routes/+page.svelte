<script>
    import { onMount, onDestroy } from 'svelte';
    import MonitorCard from '$lib/components/MonitorCard.svelte';
    import AddMonitorModal from '$lib/components/AddMonitorModal.svelte';
    import { monitors } from '$lib/stores/monitors.js';
    import { toast } from '$lib/stores/toast.js';

    /** @type {import('pocketbase').RecordModel[]} */
    let monitorList = $state([]);

    let showAddModal = $state(false);
    /** @type {import('pocketbase').RecordModel | null} */
    let editingMonitor = $state(null);
    let showAllCharts = $state(true);
    let showAllAnimations = $state(true);
    let showExportPanel = $state(false);
    let exportLoading = $state(false);
    let exportStart = $state('');
    let exportEnd = $state('');

    onMount(() => {
        if (typeof window !== 'undefined') {
            const savedCharts = window.localStorage.getItem('network360:show-all-charts');
            const savedAnimations = window.localStorage.getItem('network360:show-all-animations');

            if (savedCharts !== null) showAllCharts = savedCharts === 'true';
            if (savedAnimations !== null) showAllAnimations = savedAnimations === 'true';
        }

        applyExportPreset('1h');

        let unsub = () => {};

        void (async () => {
        // Subscribe to store so monitorList stays reactive
            unsub = monitors.subscribe(v => { monitorList = v; });
            await monitors.load();
            await monitors.subscribeRealtime();
        })();

        return () => {
            unsub();
        };
    });

    onDestroy(() => {
        monitors.unsubscribeRealtime();
    });

    function openAdd() {
        editingMonitor = null;
        showAddModal = true;
    }

    /** @param {import('pocketbase').RecordModel} monitor */
    function openEdit(monitor) {
        editingMonitor = monitor;
        showAddModal = true;
    }

    function closeModal() {
        showAddModal = false;
        editingMonitor = null;
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

    async function handleExportVisibleCsv() {
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

            if (!monitorList.length) {
                throw new Error('There are no visible monitors to export.');
            }

            const logs = await monitors.loadLogsForExportByMonitorIds(monitorList.map((monitor) => monitor.id), startDate, endDate);
            if (!logs.length) {
                throw new Error('No exportable ping logs found in the selected date range. Generate a few fresh pings and try again.');
            }

            const monitorMap = new Map(monitorList.map((monitor) => [monitor.id, monitor]));
            const rows = [
                ['monitor_name', 'target_host', 'timestamp', 'latency_ms', 'is_packet_loss']
            ];

            for (const log of logs) {
                const monitor = monitorMap.get(log.monitor);
                rows.push([
                    monitor?.name ?? log.monitor,
                    monitor?.target_host ?? '',
                    log.logged_at || log.created || log.updated || '',
                    log.latency_ms ?? 0,
                    log.is_packet_loss ? 'true' : 'false'
                ]);
            }

            const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\r\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `network360_visible_monitors_${exportStart.replace(/[:T]/g, '-')}_${exportEnd.replace(/[:T]/g, '-')}.csv`;
            anchor.click();
            URL.revokeObjectURL(url);

            toast.success(`Exported ${logs.length} ping logs for visible monitors.`);
            showExportPanel = false;
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to export visible monitors.');
        } finally {
            exportLoading = false;
        }
    }

    // Stats derived from monitor list
    let stats = $derived.by(() => {
        const list = monitorList || [];
        return {
            total: list.length,
            running: list.filter(m => m.status === 'running').length,
            stopped: list.filter(m => m.status === 'stopped').length
        };
    });

    $effect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('network360:show-all-charts', String(showAllCharts));
    });

    $effect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('network360:show-all-animations', String(showAllAnimations));
    });
</script>

<svelte:head>
    <title>Dashboard — Network360</title>
    <meta name="description" content="Monitor your network hosts in real-time with Network360" />
</svelte:head>

<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
    <!-- Dashboard Header -->
    <div class="mb-8">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold text-white">Dashboard</h1>
                <p class="text-sm text-[var(--color-text-muted)] mt-1">Monitor your network hosts in real-time</p>
            </div>
            <div class="flex items-center gap-2 self-stretch sm:self-auto">
                <button
                    onclick={() => showExportPanel = !showExportPanel}
                    class="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-300 transition-all cursor-pointer hover:bg-emerald-500/25"
                    title="Export all visible monitors"
                >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
                    Export Visible CSV
                </button>
                <button
                    onclick={() => showAllCharts = !showAllCharts}
                    class="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all cursor-pointer {showAllCharts ? 'border-cyan-500/30 bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25' : 'border-gray-500/20 bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'}"
                    title={showAllCharts ? 'Hide all charts' : 'Show all charts'}
                >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                    {showAllCharts ? 'Hide Charts' : 'Show Charts'}
                </button>
                <button
                    onclick={() => showAllAnimations = !showAllAnimations}
                    class="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all cursor-pointer {showAllAnimations ? 'border-teal-500/30 bg-teal-500/15 text-teal-300 hover:bg-teal-500/25' : 'border-gray-500/20 bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'}"
                    title={showAllAnimations ? 'Hide all ping animations' : 'Show all ping animations'}
                >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h5m10 0h5M12 2v5m0 10v5"/><circle cx="12" cy="12" r="3"/></svg>
                    {showAllAnimations ? 'Hide Animation' : 'Show Animation'}
                </button>
                <button onclick={openAdd} class="btn-primary flex items-center gap-2">
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14m-7-7h14"/></svg>
                    Add Monitor
                </button>
            </div>
        </div>

        <!-- Stats bar -->
        <div class="mt-3 grid grid-cols-3 gap-2">
            <div class="glass-card p-2.5 text-center">
                <p class="text-lg font-bold text-white">{stats.total}</p>
                <p class="text-[10px] text-[var(--color-text-muted)] mt-0">Total Monitors</p>
            </div>
            <div class="glass-card p-2.5 text-center">
                <p class="text-lg font-bold text-green-400">{stats.running}</p>
                <p class="text-[10px] text-[var(--color-text-muted)] mt-0">Running</p>
            </div>
            <div class="glass-card p-2.5 text-center">
                <p class="text-lg font-bold text-gray-400">{stats.stopped}</p>
                <p class="text-[10px] text-[var(--color-text-muted)] mt-0">Stopped</p>
            </div>
        </div>

        {#if showExportPanel}
            <div class="glass-card mt-3 p-3">
                <div class="flex flex-col gap-3">
                    <div>
                        <p class="text-sm font-semibold text-white">Export Visible Monitors</p>
                        <p class="text-xs text-[var(--color-text-muted)] mt-1">Download one CSV containing ping logs for all monitors currently shown on this page.</p>
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
                        <button onclick={handleExportVisibleCsv} disabled={exportLoading} class="inline-flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 transition-all hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60">
                            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
                            {exportLoading ? 'Exporting...' : 'Download CSV'}
                        </button>
                    </div>
                </div>
            </div>
        {/if}
    </div>

    <!-- Monitor grid -->
    {#if !monitorList || monitorList.length === 0}
        <div class="glass-card p-12 text-center animate-fade-in">
            <div class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 mb-4">
                <svg class="h-8 w-8 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M2 12h20"/>
                </svg>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">No monitors yet</h3>
            <p class="text-sm text-[var(--color-text-muted)] mb-6 max-w-sm mx-auto">
                Add your first monitor to start tracking network latency and availability in real-time.
            </p>
            <button onclick={openAdd} class="btn-primary inline-flex items-center gap-2">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14m-7-7h14"/></svg>
                Add Your First Monitor
            </button>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {#each monitorList as monitor (monitor.id)}
                <div class="animate-fade-in">
                    <MonitorCard {monitor} {showAllCharts} {showAllAnimations} onEdit={() => openEdit(monitor)} />
                </div>
            {/each}
        </div>
    {/if}

    <!-- Add/Edit Modal -->
    <AddMonitorModal
        show={showAddModal}
        editMonitor={editingMonitor}
        onClose={closeModal}
    />
</div>

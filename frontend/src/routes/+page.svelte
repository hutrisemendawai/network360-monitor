<script>
    import { onMount, onDestroy } from 'svelte';
    import MonitorCard from '$lib/components/MonitorCard.svelte';
    import AddMonitorModal from '$lib/components/AddMonitorModal.svelte';
    import { monitors } from '$lib/stores/monitors.js';

    let monitorList = $derived.by(() => {
        let val;
        monitors.subscribe(v => val = v)();
        return val;
    });

    let showAddModal = $state(false);
    let editingMonitor = $state(null);

    onMount(async () => {
        await monitors.load();
        await monitors.subscribeRealtime();
    });

    onDestroy(() => {
        monitors.unsubscribeRealtime();
    });

    function openAdd() {
        editingMonitor = null;
        showAddModal = true;
    }

    function openEdit(monitor) {
        editingMonitor = monitor;
        showAddModal = true;
    }

    function closeModal() {
        showAddModal = false;
        editingMonitor = null;
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
            <button onclick={openAdd} class="btn-primary flex items-center gap-2">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14m-7-7h14"/></svg>
                Add Monitor
            </button>
        </div>

        <!-- Stats bar -->
        <div class="mt-6 grid grid-cols-3 gap-3">
            <div class="glass-card p-4 text-center">
                <p class="text-2xl font-bold text-white">{stats.total}</p>
                <p class="text-xs text-[var(--color-text-muted)] mt-0.5">Total Monitors</p>
            </div>
            <div class="glass-card p-4 text-center">
                <p class="text-2xl font-bold text-green-400">{stats.running}</p>
                <p class="text-xs text-[var(--color-text-muted)] mt-0.5">Running</p>
            </div>
            <div class="glass-card p-4 text-center">
                <p class="text-2xl font-bold text-gray-400">{stats.stopped}</p>
                <p class="text-xs text-[var(--color-text-muted)] mt-0.5">Stopped</p>
            </div>
        </div>
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
                    <MonitorCard {monitor} onEdit={() => openEdit(monitor)} />
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

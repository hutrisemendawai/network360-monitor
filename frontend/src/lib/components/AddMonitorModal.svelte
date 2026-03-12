<script>
    import { monitors } from '$lib/stores/monitors.js';
    import { toast } from '$lib/stores/toast.js';

    /** @type {{ show: boolean, editMonitor?: any, onClose: () => void }} */
    let { show = false, editMonitor = null, onClose = () => {} } = $props();

    let name = $state('');
    let target_host = $state('');
    let interval_ms = $state(3000);
    let alert_threshold_sec = $state(10);
    let loading = $state(false);
    let error = $state('');

    $effect(() => {
        if (editMonitor) {
            name = editMonitor.name || '';
            target_host = editMonitor.target_host || '';
            interval_ms = editMonitor.interval_ms || 3000;
            alert_threshold_sec = editMonitor.alert_threshold_sec || 10;
        } else {
            name = '';
            target_host = '';
            interval_ms = 3000;
            alert_threshold_sec = 10;
        }
        error = '';
    });

    async function handleSubmit(e) {
        e.preventDefault();
        if (!name.trim() || !target_host.trim()) {
            error = 'Name and Target Host are required.';
            return;
        }

        loading = true;
        error = '';

        try {
            const data = {
                name: name.trim(),
                target_host: target_host.trim(),
                interval_ms: Number(interval_ms),
                alert_threshold_sec: Number(alert_threshold_sec)
            };

            if (editMonitor) {
                await monitors.updateMonitor(editMonitor.id, data);
                toast.success(`Monitor "${name}" updated!`);
            } else {
                await monitors.create(data);
                toast.success(`Monitor "${name}" created!`);
            }

            onClose();
        } catch (err) {
            error = err.message || 'Failed to save monitor.';
        } finally {
            loading = false;
        }
    }

    function handleBackdropClick(e) {
        if (e.target === e.currentTarget) onClose();
    }
</script>

{#if show}
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
    onclick={handleBackdropClick}
>
    <div class="glass-card w-full max-w-md mx-4 p-6 shadow-2xl animate-fade-in" onclick={(e) => e.stopPropagation()}>
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold text-white">
                {editMonitor ? 'Edit Monitor' : 'Add New Monitor'}
            </h2>
            <button
                onclick={onClose}
                class="text-[var(--color-text-muted)] hover:text-white transition-colors cursor-pointer"
            >
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>

        <!-- Form -->
        <form onsubmit={handleSubmit} class="space-y-4">
            <div>
                <label for="mon-name" class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Monitor Name</label>
                <input
                    id="mon-name"
                    type="text"
                    bind:value={name}
                    placeholder="e.g. Server Database Utama"
                    class="input-field"
                />
            </div>

            <div>
                <label for="mon-host" class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Target Host</label>
                <input
                    id="mon-host"
                    type="text"
                    bind:value={target_host}
                    placeholder="e.g. 1.1.1.1 or google.com"
                    class="input-field"
                />
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label for="mon-interval" class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Interval (ms)</label>
                    <input
                        id="mon-interval"
                        type="number"
                        bind:value={interval_ms}
                        min="500"
                        max="60000"
                        step="500"
                        class="input-field"
                    />
                </div>
                <div>
                    <label for="mon-threshold" class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Alert Threshold (sec)</label>
                    <input
                        id="mon-threshold"
                        type="number"
                        bind:value={alert_threshold_sec}
                        min="1"
                        max="300"
                        class="input-field"
                    />
                </div>
            </div>

            {#if error}
                <div class="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    {error}
                </div>
            {/if}

            <div class="flex gap-3 pt-2">
                <button type="button" onclick={onClose} class="btn-ghost flex-1" disabled={loading}>
                    Cancel
                </button>
                <button type="submit" class="btn-primary flex-1 flex items-center justify-center gap-2" disabled={loading}>
                    {#if loading}
                        <div class="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {/if}
                    {editMonitor ? 'Update' : 'Create'}
                </button>
            </div>
        </form>
    </div>
</div>
{/if}

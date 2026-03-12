<script>
    import { toast } from '$lib/stores/toast.js';

    /** @type {import('$lib/stores/toast.js').Toast[]} */
    let toasts = $derived.by(() => {
        /** @type {any} */
        let val;
        toast.subscribe(v => val = v)();
        return val;
    });
</script>

{#if toasts?.length > 0}
<div class="fixed top-20 right-4 z-[100] flex flex-col gap-3 w-96 max-w-[calc(100vw-2rem)]">
    {#each toasts as t (t.id)}
        <div
            class="glass-card p-4 flex items-start gap-3 shadow-2xl {t.exiting ? 'animate-slide-out-right' : 'animate-slide-in-right'} {t.type === 'success' ? 'border-green-500/50' : t.type === 'error' ? 'border-red-500/50' : t.type === 'warning' ? 'border-amber-500/50' : 'border-cyan-500/50'}"
        >
            <!-- Icon -->
            <div class="shrink-0 mt-0.5">
                {#if t.type === 'success'}
                    <div class="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center">
                        <svg class="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>
                    </div>
                {:else if t.type === 'error'}
                    <div class="h-5 w-5 rounded-full bg-red-500/20 flex items-center justify-center">
                        <svg class="h-3 w-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path d="M6 18L18 6M6 6l12 12"/></svg>
                    </div>
                {:else if t.type === 'warning'}
                    <div class="h-5 w-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <svg class="h-3 w-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path d="M12 9v4m0 4h.01"/></svg>
                    </div>
                {:else}
                    <div class="h-5 w-5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <svg class="h-3 w-3 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path d="M13 16h-1v-4h-1m1-4h.01"/></svg>
                    </div>
                {/if}
            </div>

            <!-- Message -->
            <p class="text-sm text-[var(--color-text-primary)] flex-1 leading-relaxed">{t.message}</p>

            <!-- Dismiss -->
            <button
                onclick={() => toast.dismiss(t.id)}
                class="shrink-0 text-[var(--color-text-muted)] hover:text-white transition-colors cursor-pointer"
                aria-label="Dismiss notification"
            >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        </div>
    {/each}
</div>
{/if}

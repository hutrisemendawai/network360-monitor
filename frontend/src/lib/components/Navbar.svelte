<script>
    import { auth } from '$lib/stores/auth.js';
    import { goto } from '$app/navigation';

    let authState = $derived.by(() => {
        let val;
        auth.subscribe(v => val = v)();
        return val;
    });

    function logout() {
        auth.logout();
        goto('/login');
    }
</script>

<nav class="fixed top-0 left-0 right-0 z-50 border-b border-[var(--color-border-glass)] bg-[var(--color-bg-primary)]/80 backdrop-blur-xl">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
            <!-- Brand -->
            <a href="/" class="flex items-center gap-3 group">
                <div class="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 shadow-lg shadow-cyan-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                        <path d="M2 12h20"/>
                    </svg>
                    <div class="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-400 opacity-0 blur-md transition-opacity group-hover:opacity-50"></div>
                </div>
                <span class="text-lg font-bold tracking-tight">
                    <span class="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">Network</span><span class="text-white">360</span>
                </span>
            </a>

            <!-- User -->
            {#if authState?.isLoggedIn}
                <div class="flex items-center gap-4">
                    <div class="hidden sm:flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                        <div class="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                        <span>{authState.user?.email}</span>
                    </div>
                    <button onclick={logout} class="btn-ghost text-xs">
                        <svg xmlns="http://www.w3.org/2000/svg" class="mr-1.5 inline h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Logout
                    </button>
                </div>
            {/if}
        </div>
    </div>
</nav>

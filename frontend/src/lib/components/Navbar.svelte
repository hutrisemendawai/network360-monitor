<script>
    import { goto } from '$app/navigation';
    import { auth } from '$lib/stores/auth.js';
    import logo from '$lib/../img/network360.png';

    /** @type {{ user?: any }} */
    let { user } = $props();

    function logout() {
        auth.logout();
        goto('/login');
    }
</script>

<nav class="fixed top-0 left-0 right-0 z-50 border-b border-[var(--color-border-glass)] bg-[var(--color-bg-primary)]/80 backdrop-blur-xl">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
            <!-- Brand -->
            <a href="/" class="flex items-center group">
                <img src={logo} alt="Network360" class="h-10 w-auto transition-opacity group-hover:opacity-80" />
            </a>

            <!-- User -->
            <div class="flex items-center gap-4">
                <div class="hidden sm:flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <div class="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                    <span>{user?.email ?? ''}</span>
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
        </div>
    </div>
</nav>

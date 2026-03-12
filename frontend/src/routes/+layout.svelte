<script>
    import '../app.css';
    import Navbar from '$lib/components/Navbar.svelte';
    import Toast from '$lib/components/Toast.svelte';
    import Footer from '$lib/components/Footer.svelte';
    import { auth } from '$lib/stores/auth.js';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';

    let { children } = $props();

    let mounted = $state(false);

    onMount(() => {
        auth.init();
        mounted = true;
    });

    // Auth guard
    let authState = $derived.by(() => {
        let val;
        auth.subscribe(v => val = v)();
        return val;
    });

    let currentPath = $derived.by(() => {
        let val;
        page.subscribe(v => val = v?.url?.pathname)();
        return val;
    });

    let publicPaths = ['/login', '/register'];

    $effect(() => {
        if (!mounted) return;
        if (authState?.isLoading) return;

        if (!authState?.isLoggedIn && !publicPaths.includes(currentPath)) {
            goto('/login');
        }
    });
</script>

<div class="min-h-screen flex flex-col">
    {#if authState?.isLoggedIn}
        <Navbar />
    {/if}

    <Toast />

    <main class="flex-1 {authState?.isLoggedIn ? 'pt-20' : ''}">
        {#if mounted && !authState?.isLoading}
            {@render children()}
        {:else}
            <!-- Loading state -->
            <div class="flex items-center justify-center min-h-screen">
                <div class="flex flex-col items-center gap-4">
                    <div class="h-10 w-10 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                    <span class="text-sm text-[var(--color-text-muted)]">Loading...</span>
                </div>
            </div>
        {/if}
    </main>

    {#if authState?.isLoggedIn}
        <Footer />
    {/if}
</div>

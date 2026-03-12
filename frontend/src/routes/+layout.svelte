<script>
    import '../app.css';
    import Navbar from '$lib/components/Navbar.svelte';
    import Toast from '$lib/components/Toast.svelte';
    import Footer from '$lib/components/Footer.svelte';
    import { auth } from '$lib/stores/auth.js';
    import favicon from '$lib/../img/network360.ico';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';

    let { children } = $props();

    let mounted = $state(false);

    // Use Svelte's $store auto-subscription syntax for reactivity
    // These are re-read reactively on every change
    let isLoggedIn = $state(false);
    let isLoading = $state(true);
    /** @type {any} */
    let user = $state(null);

    /** @param {any} monitor */
    function openEdit(monitor) {
        // Function body for openEdit goes here, if any.
        // The instruction only provided the signature and type annotation.
    }

    onMount(() => {
        auth.init();
        mounted = true;

        // Subscribe and track auth state reactively
        const unsub = auth.subscribe(v => {
            isLoggedIn = v.isLoggedIn;
            isLoading = v.isLoading;
            user = v.user;
        });

        return unsub;
    });

    const publicPaths = ['/login', '/register'];

    $effect(() => {
        if (!mounted) return;
        if (isLoading) return;

        const path = $page.url.pathname;
        if (!isLoggedIn && !publicPaths.includes(path)) {
            goto('/login');
        }
    });
</script>

<svelte:head>
    <link rel="icon" href={favicon} type="image/x-icon" />
</svelte:head>

<div class="min-h-screen flex flex-col">
    {#if isLoggedIn}
        <Navbar {user} />
    {/if}

    <Toast />

    <main class="flex-1 {isLoggedIn ? 'pt-20' : ''}">
        {#if mounted && !isLoading}
            {@render children()}
        {:else}
            <!-- Loading state -->
            <div class="flex items-center justify-center min-h-screen">
                <div class="flex flex-col items-center gap-4">
                    <div class="h-10 w-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                    <span class="text-sm text-[var(--color-text-muted)]">Loading...</span>
                </div>
            </div>
        {/if}
    </main>

    {#if isLoggedIn}
        <Footer />
    {/if}
</div>

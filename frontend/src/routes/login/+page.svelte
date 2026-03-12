<script>
    import { auth } from '$lib/stores/auth.js';
    import { goto } from '$app/navigation';

    let email = $state('');
    let password = $state('');
    let error = $state('');
    let loading = $state(false);

    async function handleLogin(e) {
        e.preventDefault();
        error = '';
        loading = true;

        try {
            await auth.login(email, password);
            goto('/');
        } catch (err) {
            error = err.message || 'Login failed. Check your credentials.';
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head>
    <title>Login — Network360</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
    <!-- Background effects -->
    <div class="absolute inset-0 overflow-hidden">
        <div class="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-500/8 rounded-full blur-3xl"></div>
        <div class="absolute bottom-1/4 -right-20 w-96 h-96 bg-teal-500/8 rounded-full blur-3xl"></div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/3 rounded-full blur-3xl"></div>
    </div>

    <div class="glass-card w-full max-w-md p-8 relative z-10 animate-fade-in">
        <!-- Branding -->
        <div class="text-center mb-8">
            <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 shadow-lg shadow-cyan-500/25 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    <path d="M2 12h20"/>
                </svg>
            </div>
            <h1 class="text-2xl font-bold">
                <span class="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">Network</span><span class="text-white">360</span>
            </h1>
            <p class="text-sm text-[var(--color-text-muted)] mt-2">Sign in to your monitoring dashboard</p>
        </div>

        <form onsubmit={handleLogin} class="space-y-4">
            <div>
                <label for="login-email" class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Email</label>
                <input
                    id="login-email"
                    type="email"
                    bind:value={email}
                    placeholder="you@example.com"
                    required
                    class="input-field"
                />
            </div>

            <div>
                <label for="login-password" class="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Password</label>
                <input
                    id="login-password"
                    type="password"
                    bind:value={password}
                    placeholder="••••••••"
                    required
                    class="input-field"
                />
            </div>

            {#if error}
                <div class="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    {error}
                </div>
            {/if}

            <button type="submit" class="btn-primary w-full flex items-center justify-center gap-2 py-3" disabled={loading}>
                {#if loading}
                    <div class="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                {/if}
                Sign In
            </button>
        </form>

        <p class="text-center text-sm text-[var(--color-text-muted)] mt-6">
            Don't have an account?
            <a href="/register" class="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">Create one</a>
        </p>
    </div>
</div>

<script>
    import { onMount, onDestroy } from 'svelte';
    import gsap from 'gsap';

    /** @type {{ latencyMs: number, isPacketLoss: boolean }} */
    let { latencyMs = 0, isPacketLoss = false } = $props();

    let pathLine;
    let dot;
    let pcIcon;
    let serverIcon;
    let container;
    let animTimeline;

    function animatePing() {
        if (!dot || !pathLine || !container) return;

        // Kill previous animation
        if (animTimeline) {
            animTimeline.kill();
        }

        const containerWidth = container.offsetWidth;
        const startX = 40;
        const endX = containerWidth - 40;
        const midX = (startX + endX) / 2;

        // Reset dot
        gsap.set(dot, {
            x: startX,
            opacity: 1,
            scale: 1,
            backgroundColor: '#06b6d4'
        });

        if (isPacketLoss) {
            // Packet loss animation: move to mid, shake, turn red, fade
            animTimeline = gsap.timeline();
            animTimeline
                .to(dot, {
                    x: midX,
                    duration: 0.4,
                    ease: 'power2.out'
                })
                .to(dot, {
                    backgroundColor: '#ef4444',
                    duration: 0.15
                })
                .to(dot, {
                    x: midX + 6,
                    duration: 0.04,
                    yoyo: true,
                    repeat: 7,
                    ease: 'none'
                })
                .to(dot, {
                    opacity: 0,
                    scale: 0.3,
                    duration: 0.5,
                    ease: 'power2.in'
                });

            // Flash server icon red
            gsap.to(serverIcon, {
                color: '#ef4444',
                duration: 0.3,
                yoyo: true,
                repeat: 1
            });
        } else {
            // Normal ping: speed proportional to latency
            const duration = Math.max(0.15, Math.min(latencyMs / 400, 2.5));

            animTimeline = gsap.timeline();

            // Forward trip
            animTimeline
                .to(dot, {
                    x: endX,
                    duration: duration,
                    ease: 'power1.inOut'
                })
                .to(dot, {
                    backgroundColor: latencyMs > 150 ? '#f59e0b' : '#22c55e',
                    duration: 0.1
                }, '<0.1')
                // Return trip
                .to(dot, {
                    x: startX,
                    duration: duration * 0.8,
                    ease: 'power1.inOut'
                })
                .to(dot, {
                    opacity: 0,
                    duration: 0.2
                });

            // Pulse server icon on arrival
            gsap.to(serverIcon, {
                scale: 1.15,
                duration: 0.15,
                delay: duration,
                yoyo: true,
                repeat: 1,
                ease: 'power2.out'
            });
        }
    }

    $effect(() => {
        // Re-animate whenever latencyMs or isPacketLoss changes
        if (latencyMs !== undefined || isPacketLoss !== undefined) {
            animatePing();
        }
    });

    onDestroy(() => {
        if (animTimeline) animTimeline.kill();
    });
</script>

<div bind:this={container} class="relative w-full h-16 flex items-center select-none overflow-hidden">
    <!-- PC Icon -->
    <div bind:this={pcIcon} class="relative z-10 flex flex-col items-center gap-0.5 shrink-0 w-10">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <span class="text-[9px] text-[var(--color-text-muted)] font-medium">YOU</span>
    </div>

    <!-- Path line -->
    <div class="flex-1 relative mx-2">
        <div bind:this={pathLine} class="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-500/40 via-cyan-500/20 to-teal-500/40"></div>
        <!-- Dashes -->
        <div class="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2" style="background: repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(6,182,212,0.15) 8px, rgba(6,182,212,0.15) 16px)"></div>
        <!-- Animated dot -->
        <div
            bind:this={dot}
            class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.7)]"
            style="opacity: 0;"
        ></div>
    </div>

    <!-- Server Icon -->
    <div bind:this={serverIcon} class="relative z-10 flex flex-col items-center gap-0.5 shrink-0 w-10">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-teal-400 drop-shadow-[0_0_6px_rgba(20,184,166,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
            <line x1="6" y1="6" x2="6.01" y2="6"/>
            <line x1="6" y1="18" x2="6.01" y2="18"/>
        </svg>
        <span class="text-[9px] text-[var(--color-text-muted)] font-medium">HOST</span>
    </div>
</div>

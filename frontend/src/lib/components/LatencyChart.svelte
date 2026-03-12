<script>
    import { onMount, onDestroy } from 'svelte';
    import { Chart, registerables } from 'chart.js';

    Chart.register(...registerables);

    /** @type {{ data: number[], maxPoints?: number }} */
    let { data = [], maxPoints = 50 } = $props();

    let canvas;
    let chart;

    function getMovingAverage(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    function createChart() {
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const labels = data.map((_, i) => i + 1);
        const avg = getMovingAverage(data);
        const spikeThreshold = avg * 1.2;

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Latency (ms)',
                        data: [...data],
                        borderColor: '#06b6d4',
                        backgroundColor: 'rgba(6, 182, 212, 0.08)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointHoverBackgroundColor: '#06b6d4',
                        segment: {
                            borderColor: (ctx) => {
                                const val = ctx.p1.parsed.y;
                                if (val === 0) return '#ef4444';
                                if (val > spikeThreshold) return '#f59e0b';
                                return '#06b6d4';
                            }
                        }
                    },
                    {
                        label: 'Average',
                        data: Array(data.length).fill(avg),
                        borderColor: 'rgba(34, 197, 94, 0.6)',
                        borderWidth: 1.5,
                        borderDash: [6, 4],
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'Spike Threshold',
                        data: Array(data.length).fill(spikeThreshold),
                        borderColor: 'rgba(245, 158, 11, 0.4)',
                        backgroundColor: 'rgba(245, 158, 11, 0.06)',
                        borderWidth: 1,
                        borderDash: [4, 4],
                        pointRadius: 0,
                        fill: '+1'
                    },
                    {
                        // Invisible top reference for spike band fill
                        data: Array(data.length).fill(spikeThreshold * 2),
                        borderWidth: 0,
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 300,
                    easing: 'easeOutCubic'
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        display: false,
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(100, 116, 139, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#64748b',
                            font: { size: 10, family: 'Inter' },
                            callback: (v) => v + 'ms',
                            maxTicksLimit: 5
                        },
                        border: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        borderColor: 'rgba(100, 116, 139, 0.3)',
                        borderWidth: 1,
                        titleFont: { family: 'Inter', size: 11 },
                        bodyFont: { family: 'Inter', size: 11 },
                        padding: 10,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: () => '',
                            label: (ctx) => {
                                if (ctx.datasetIndex > 0) return null;
                                const val = ctx.parsed.y;
                                return val === 0 ? '⛔ Packet Loss' : `${val.toFixed(1)} ms`;
                            }
                        },
                        filter: (item) => item.datasetIndex === 0
                    }
                }
            }
        });
    }

    function updateChart() {
        if (!chart) return;

        const labels = data.map((_, i) => i + 1);
        const avg = getMovingAverage(data.filter(d => d > 0));
        const spikeThreshold = avg * 1.2;

        chart.data.labels = labels;
        chart.data.datasets[0].data = [...data];
        chart.data.datasets[1].data = Array(data.length).fill(avg);
        chart.data.datasets[2].data = Array(data.length).fill(spikeThreshold);
        chart.data.datasets[3].data = Array(data.length).fill(spikeThreshold * 2);

        // Update segment colors based on new average
        chart.data.datasets[0].segment = {
            borderColor: (ctx) => {
                const val = ctx.p1.parsed.y;
                if (val === 0) return '#ef4444';
                if (val > spikeThreshold) return '#f59e0b';
                return '#06b6d4';
            }
        };

        chart.update('none');
    }

    $effect(() => {
        if (data && chart) {
            updateChart();
        }
    });

    onMount(() => {
        createChart();
    });

    onDestroy(() => {
        if (chart) chart.destroy();
    });
</script>

<div class="w-full h-full min-h-[120px]">
    <canvas bind:this={canvas}></canvas>
</div>

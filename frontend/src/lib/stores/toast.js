import { writable, get } from 'svelte/store';

function createToastStore() {
    const { subscribe, update } = writable([]);

    let idCounter = 0;

    return {
        subscribe,
        add(message, type = 'info', duration = 5000) {
            const id = ++idCounter;
            const toast = { id, message, type, duration, exiting: false };
            update(toasts => [...toasts, toast]);

            if (duration > 0) {
                setTimeout(() => {
                    this.dismiss(id);
                }, duration);
            }

            return id;
        },
        dismiss(id) {
            // Mark as exiting for animation
            update(toasts => toasts.map(t =>
                t.id === id ? { ...t, exiting: true } : t
            ));
            // Actually remove after animation
            setTimeout(() => {
                update(toasts => toasts.filter(t => t.id !== id));
            }, 300);
        },
        success(message, duration) {
            return this.add(message, 'success', duration);
        },
        error(message, duration) {
            return this.add(message, 'error', duration);
        },
        warning(message, duration) {
            return this.add(message, 'warning', duration);
        }
    };
}

export const toast = createToastStore();

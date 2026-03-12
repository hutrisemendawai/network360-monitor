import { writable } from 'svelte/store';

/**
 * @typedef {{ id: number, message: string, type: string, duration: number, exiting: boolean }} Toast
 */

function createToastStore() {
    /** @type {import('svelte/store').Writable<Toast[]>} */
    const { subscribe, update } = writable(/** @type {Toast[]} */ ([]));

    let idCounter = 0;

    return {
        subscribe,
        /**
         * @param {string} message
         * @param {string} [type]
         * @param {number} [duration]
         */
        add(message, type = 'info', duration = 5000) {
            const id = ++idCounter;
            /** @type {Toast} */
            const toast = { id, message, type, duration, exiting: false };
            update(toasts => [...toasts, toast]);

            if (duration > 0) {
                setTimeout(() => {
                    this.dismiss(id);
                }, duration);
            }

            return id;
        },
        /** @param {number} id */
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
        /**
         * @param {string} message
         * @param {number} [duration]
         */
        success(message, duration) {
            return this.add(message, 'success', duration);
        },
        /**
         * @param {string} message
         * @param {number} [duration]
         */
        error(message, duration) {
            return this.add(message, 'error', duration);
        },
        /**
         * @param {string} message
         * @param {number} [duration]
         */
        warning(message, duration) {
            return this.add(message, 'warning', duration);
        }
    };
}

export const toast = createToastStore();

import { writable } from 'svelte/store';
import pb from '$lib/pb.js';

function createAuthStore() {
    const { subscribe, set } = writable({
        isLoggedIn: pb.authStore.isValid,
        user: pb.authStore.record,
        isLoading: true
    });

    // Listen for authStore changes
    pb.authStore.onChange(() => {
        set({
            isLoggedIn: pb.authStore.isValid,
            user: pb.authStore.record,
            isLoading: false
        });
    });

    return {
        subscribe,
        init() {
            set({
                isLoggedIn: pb.authStore.isValid,
                user: pb.authStore.record,
                isLoading: false
            });
        },
        /**
         * @param {string} email
         * @param {string} password
         */
        async login(email, password) {
            const authData = await pb.collection('users').authWithPassword(email, password);
            return authData;
        },
        /**
         * @param {string} email
         * @param {string} password
         * @param {string} passwordConfirm
         */
        async register(email, password, passwordConfirm) {
            const user = await pb.collection('users').create({
                email,
                password,
                passwordConfirm
            });
            // Auto-login after register
            await pb.collection('users').authWithPassword(email, password);
            return user;
        },
        logout() {
            pb.authStore.clear();
        }
    };
}

export const auth = createAuthStore();

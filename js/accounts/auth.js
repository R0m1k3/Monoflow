// js/accounts/auth.js
// Authentication manager using PocketBase as the sole identity provider.
// Firebase has been fully removed. All auth (email/password) is handled by PocketBase SDK.

import { pb } from './pocketbase-client.js';

export class AuthManager {
    constructor() {
        /** @type {import('pocketbase').RecordModel | null} */
        this.user = pb.authStore.isValid ? pb.authStore.model : null;
        this.authListeners = [];

        // Subscribe to PocketBase auth store changes
        pb.authStore.onChange((token, model) => {
            this.user = model;
            this.updateUI(model);
            this.authListeners.forEach((listener) => listener(model));
        }, true); // true = trigger immediately with current state
    }

    /**
     * Register a callback to be fired on auth state changes.
     * @param {function(import('pocketbase').RecordModel | null): void} callback
     */
    onAuthStateChanged(callback) {
        this.authListeners.push(callback);
        // Trigger immediately if state is already known
        if (this.user !== undefined) {
            callback(this.user);
        }
    }

    /**
     * Sign in with email and password via PocketBase.
     * @param {string} email
     * @param {string} password
     * @returns {Promise<import('pocketbase').RecordModel>}
     */
    async signInWithEmail(email, password) {
        try {
            const authData = await pb.collection('users').authWithPassword(email, password);
            return authData.record;
        } catch (error) {
            console.error('[Auth] Email sign-in failed:', error);
            const message = this._formatError(error);
            alert(`Sign-in failed: ${message}`);
            throw error;
        }
    }

    /**
     * Create a new account and sign in.
     * @param {string} email
     * @param {string} password
     * @returns {Promise<import('pocketbase').RecordModel>}
     */
    async signUpWithEmail(email, password) {
        try {
            await pb.collection('users').create({
                email,
                password,
                passwordConfirm: password,
            });
            // Auto sign-in after successful registration
            const authData = await pb.collection('users').authWithPassword(email, password);
            return authData.record;
        } catch (error) {
            console.error('[Auth] Sign-up failed:', error);
            const message = this._formatError(error);
            alert(`Sign-up failed: ${message}`);
            throw error;
        }
    }

    /**
     * Request a password reset email via PocketBase.
     * @param {string} email
     */
    async sendPasswordReset(email) {
        try {
            await pb.collection('users').requestPasswordReset(email);
            alert(`Password reset email sent to ${email}. Check your inbox.`);
        } catch (error) {
            console.error('[Auth] Password reset failed:', error);
            const message = this._formatError(error);
            alert(`Failed to send reset email: ${message}`);
            throw error;
        }
    }

    /**
     * Sign the current user out.
     */
    async signOut() {
        pb.authStore.clear();

        if (window.__AUTH_GATE__) {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
            } catch {
                // Server endpoint may not exist in dev mode
            }
            window.location.href = '/login';
        }
    }

    /**
     * Update the account page UI based on auth state.
     * @param {import('pocketbase').RecordModel | null} user
     */
    updateUI(user) {
        const connectBtn = document.getElementById('firebase-connect-btn');
        const clearDataBtn = document.getElementById('firebase-clear-cloud-btn');
        const statusText = document.getElementById('firebase-status');
        const emailContainer = document.getElementById('email-auth-container');
        const emailToggleBtn = document.getElementById('toggle-email-auth-btn');

        if (!connectBtn) return; // UI not rendered yet

        // Auth gate active: minimal UI — status + sign out only
        if (window.__AUTH_GATE__) {
            connectBtn.textContent = 'Sign Out';
            connectBtn.classList.add('danger');
            connectBtn.onclick = () => this.signOut();
            if (clearDataBtn) clearDataBtn.style.display = 'none';
            if (emailContainer) emailContainer.style.display = 'none';
            if (emailToggleBtn) emailToggleBtn.style.display = 'none';
            if (statusText) statusText.textContent = user ? `Signed in as ${user.email}` : 'Signed in';

            const accountPage = document.getElementById('page-account');
            if (accountPage) {
                const title = accountPage.querySelector('.section-title');
                if (title) title.textContent = 'Account';
                accountPage.querySelectorAll('.account-content > p, .account-content > div').forEach((el) => {
                    if (el.id !== 'firebase-status' && el.id !== 'auth-buttons-container') {
                        el.style.display = 'none';
                    }
                });
            }

            const customDbBtn = document.getElementById('custom-db-btn');
            if (customDbBtn) {
                const pbFromEnv = !!window.__POCKETBASE_URL__;
                if (pbFromEnv) {
                    const settingItem = customDbBtn.closest('.setting-item');
                    if (settingItem) settingItem.style.display = 'none';
                }
            }

            return;
        }

        if (user) {
            connectBtn.textContent = 'Sign Out';
            connectBtn.classList.add('danger');
            connectBtn.onclick = () => this.signOut();

            if (clearDataBtn) clearDataBtn.style.display = 'block';
            if (emailContainer) emailContainer.style.display = 'none';
            if (emailToggleBtn) emailToggleBtn.style.display = 'none';

            if (statusText) statusText.textContent = `Signed in as ${user.email}`;
        } else {
            connectBtn.textContent = 'Sign In / Sign Up';
            connectBtn.classList.remove('danger');
            connectBtn.onclick = () => {
                if (emailContainer) emailContainer.style.display = 'flex';
                if (emailToggleBtn) emailToggleBtn.style.display = 'none';
            };

            if (clearDataBtn) clearDataBtn.style.display = 'none';
            if (emailToggleBtn) emailToggleBtn.style.display = 'none';

            if (statusText) statusText.textContent = 'Synchronisez votre bibliothèque sur tous vos appareils';
        }
    }

    /**
     * Extract a readable error message from a PocketBase ClientResponseError.
     * @param {unknown} error
     * @returns {string}
     */
    _formatError(error) {
        if (error && typeof error === 'object' && 'response' in error) {
            const resp = error.response;
            if (resp && resp.message) return resp.message;
        }
        if (error instanceof Error) return error.message;
        return String(error);
    }
}

export const authManager = new AuthManager();

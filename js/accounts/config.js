// js/accounts/config.js
// Simplified configuration module — Firebase has been fully removed.
// Handles PocketBase URL configuration and settings UI initialization.

import { pb, DEFAULT_POCKETBASE_URL } from './pocketbase-client.js';

const PB_STORAGE_KEY = 'musicflow-pocketbase-url';

/**
 * Persist a custom PocketBase URL to localStorage.
 * @param {string} url
 */
export function savePocketBaseUrl(url) {
    if (!url) return;
    localStorage.setItem(PB_STORAGE_KEY, url.trim());
}

/**
 * Clear the custom PocketBase URL from localStorage, reverting to default.
 */
export function clearPocketBaseUrl() {
    localStorage.removeItem(PB_STORAGE_KEY);
}

/**
 * Initialize the PocketBase URL configuration UI in the settings page.
 * Handles: display current URL, save / clear / share actions.
 */
export function initializePocketBaseSettingsUI() {
    const pbUrlInput = document.getElementById('pocketbase-url-input');
    const savePbUrlBtn = document.getElementById('save-pocketbase-url-btn');
    const clearPbUrlBtn = document.getElementById('clear-pocketbase-url-btn');
    const togglePbConfigBtn = document.getElementById('toggle-pocketbase-config-btn');
    const customPbConfigContainer = document.getElementById('custom-pocketbase-config-container');

    // Toggle visibility of the custom URL container
    if (togglePbConfigBtn && customPbConfigContainer) {
        togglePbConfigBtn.addEventListener('click', () => {
            const isVisible = customPbConfigContainer.classList.contains('visible');
            customPbConfigContainer.classList.toggle('visible', !isVisible);
            togglePbConfigBtn.textContent = isVisible ? 'Custom Configuration' : 'Hide Custom Configuration';
        });
    }

    // Populate the current saved URL
    if (pbUrlInput) {
        const current = localStorage.getItem(PB_STORAGE_KEY);
        if (current) {
            pbUrlInput.value = current;
            if (customPbConfigContainer && togglePbConfigBtn) {
                customPbConfigContainer.classList.add('visible');
                togglePbConfigBtn.textContent = 'Hide Custom Configuration';
            }
        } else {
            pbUrlInput.placeholder = DEFAULT_POCKETBASE_URL;
        }
    }

    // Save button
    if (savePbUrlBtn && pbUrlInput) {
        savePbUrlBtn.addEventListener('click', () => {
            const inputVal = pbUrlInput.value.trim();
            if (!inputVal) {
                alert('Please enter a valid PocketBase URL.');
                return;
            }
            try {
                new URL(inputVal); // Validate URL format
            } catch {
                alert('Invalid URL format. Example: https://my-pocketbase.example.com');
                return;
            }
            savePocketBaseUrl(inputVal);
            alert('PocketBase URL saved. Reloading...');
            window.location.reload();
        });
    }

    // Clear button
    if (clearPbUrlBtn) {
        clearPbUrlBtn.addEventListener('click', () => {
            if (confirm('Remove the custom PocketBase URL? The app will revert to the default instance.')) {
                clearPocketBaseUrl();
                window.location.reload();
            }
        });
    }
}

export { pb };

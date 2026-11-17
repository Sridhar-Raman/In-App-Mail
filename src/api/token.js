/**
 * Login token + API address, the same pattern as the SRI.CR appointment app: the site (Vercel) and the API (Render) live on
 * different addresses, so the token travels in an `Authorization: Bearer` header instead of a cookie.
 *
 * VITE_API_URL: the API's address, set at build time (e.g. https://sricr-mail-api.onrender.com). Empty in development,
 * where Vite proxies /api to the local server.
 */
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const KEY = 'sricr_mail_token';

// "Keep me signed in" → localStorage (survives closing the browser); otherwise sessionStorage (cleared with the tab).
export const tokenStore = {
    get: () => { try { return localStorage.getItem(KEY) || sessionStorage.getItem(KEY); } catch { return null; } },
    set: (token, remember) => {
        tokenStore.clear();
        try { (remember ? localStorage : sessionStorage).setItem(KEY, token); } catch { /* storage blocked: stay signed in until reload */ }
    },
    clear: () => { try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch { /* ignore */ } },
};

export const authHeader = () => {
    const token = tokenStore.get();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

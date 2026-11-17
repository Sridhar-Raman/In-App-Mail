import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE, authHeader, tokenStore } from '../api/token';

/**
 * Auth against the Express/MongoDB API (`/api/auth/*`). Login returns a token that is kept in the browser
 * (localStorage with "Keep me signed in", otherwise sessionStorage) and sent as `Authorization: Bearer`.
 */
const request = async (path, body) => {
    let res;
    try {
        res = await fetch(`${API_BASE}/api/auth/${path}`, {
            method: body === undefined ? 'GET' : 'POST',
            headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...authHeader() },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        throw new Error('Cannot reach the server. Please try again.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
        throw Object.assign(new Error(data.message || 'Request failed'), { status: res.status });
    return data;
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Restore the session from the stored token on first load.
    useEffect(() => {
        if (!tokenStore.get()) { setLoading(false); return; }
        request('me')
            .then((data) => setUser(data.user))
            .catch((err) => { if (err.status === 401) tokenStore.clear(); setUser(null); })
            .finally(() => setLoading(false));
    }, []);

    const signup = useCallback(async ({ fullName, email, password }) => {
        await request('signup', { fullName, email, password });
    }, []);

    const login = useCallback(async ({ email, password, remember }) => {
        const data = await request('login', { email, password, remember: !!remember });
        tokenStore.set(data.token, !!remember);
        setUser(data.user);
    }, []);

    const logout = useCallback(async () => {
        tokenStore.clear();
        setUser(null);
    }, []);

    const value = useMemo(() => ({ user, loading, login, signup, logout }), [user, loading, login, signup, logout]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

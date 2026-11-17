import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Auth against the Express/MongoDB API (`/api/auth/*`, proxied by Vite). The session lives in an httpOnly
 * cookie set by the server, so nothing sensitive is kept in JS or localStorage.
 */
const request = async (path, body) => {
    let res;
    try {
        res = await fetch(`/api/auth/${path}`, {
            method: body === undefined ? 'GET' : 'POST',
            credentials: 'include',
            headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
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

    // Restore the session from the cookie on first load.
    useEffect(() => {
        request('me')
            .then((data) => setUser(data.user))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    const signup = useCallback(async ({ fullName, email, password }) => {
        await request('signup', { fullName, email, password });
    }, []);

    const login = useCallback(async ({ email, password, remember }) => {
        const data = await request('login', { email, password, remember: !!remember });
        setUser(data.user);
    }, []);

    const logout = useCallback(async () => {
        await request('logout', {}).catch(() => {});
        setUser(null);
    }, []);

    const value = useMemo(() => ({ user, loading, login, signup, logout }), [user, loading, login, signup, logout]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Logo from './Logo';

// Same header menu as the landing page: Home, Log in, Sign up (the current page is highlighted).
const MENU = [
    { to: '/', label: 'Home', end: true },
    { to: '/login', label: 'Log in' },
    { to: '/signup', label: 'Sign up' },
];

const AuthLayout = ({ title, subtitle, children, footer }) => {
    const [open, setOpen] = useState(false);
    const { pathname } = useLocation();

    // Close the phone menu on navigation and on Escape.
    useEffect(() => { setOpen(false); }, [pathname]);
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => e.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    return (
        <div className="auth-page site">
            <header className="nav">
                <Logo tone="brand" size={50} />
                <button type="button" className="nav-toggle" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
                    </svg>
                </button>
                <nav className={`nav-menu${open ? ' open' : ''}`} aria-label="Primary">
                    <div className="nav-links">
                        {MENU.map((m) => <NavLink key={m.to} to={m.to} end={m.end}>{m.label}</NavLink>)}
                    </div>
                </nav>
            </header>

            <main className="auth-main">
                <div className="auth-card">
                    <h1>{title}</h1>
                    <p className="muted">{subtitle}</p>
                    {children}
                    <p className="auth-footer">{footer}</p>
                    <p className="auth-copy">© {new Date().getFullYear()} SRI.CR In-App Mail. All rights reserved.</p>
                </div>
            </main>
        </div>
    );
};
export default AuthLayout;

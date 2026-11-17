import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import Mailbox from '../mail/Mailbox';
import Icon from '../mail/Icon';
import '../mail/mail.css';

/** Avatar button in the top-right corner; click opens a card with the signed-in user's details and Sign out. */
const UserMenu = ({ user, onLogout }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
        const onKey = (e) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [open]);

    const initial = user.fullName.charAt(0).toUpperCase();
    return (
        <div className="um um-corner" ref={ref}>
            <button type="button" className="um-btn" aria-haspopup="true" aria-expanded={open} aria-label={`Account: ${user.fullName}`}
                title={user.fullName} onClick={() => setOpen((o) => !o)}>{initial}</button>
            {open && (
                <div className="um-card" role="dialog" aria-label="Account details">
                    <span className="um-avatar">{initial}</span>
                    <strong>{user.fullName}</strong>
                    <span className="um-email">{user.email}</span>
                    <button type="button" className="mbtn mbtn-outline um-out" onClick={onLogout}><Icon name="logout" size={18} />Sign out</button>
                </div>
            )}
        </div>
    );
};

const Home = () => {
    const { user, logout } = useAuth();
    return (
        <div className="app">
            <UserMenu user={user} onLogout={logout} />
            <Mailbox brand={<Logo tone="dark" size={44} />} />
            <footer className="app-foot">© {new Date().getFullYear()} SRI.CR In-App Mail. All rights reserved.</footer>
        </div>
    );
};
export default Home;

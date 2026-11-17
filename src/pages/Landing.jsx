import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

const MENU = [
    { id: 'home', label: 'Home' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'about', label: 'About' },
    { id: 'faq', label: 'FAQ' },
];

const FEATURES = [
    { title: 'Folders that make sense', text: 'Inbox, drafts, sent, starred and trash with live unread badges.' },
    { title: 'Threaded conversations', text: 'Follow every reply in one place, newest message always on top.' },
    { title: 'Compose with confidence', text: 'To/Cc recipients, attachments and auto-saved drafts.' },
    { title: 'Secure by design', text: 'Internal messaging that never leaves your organisation.' },
];

const STATS = [
    { value: '5', label: 'Smart folders' },
    { value: '10 MB', label: 'Per attachment' },
    { value: '100%', label: 'In-app, private' },
];

const GALLERY = [
    { title: 'Inbox', text: 'Unread badges, search and bulk actions.', img: 'inbox' },
    { title: 'Conversation thread', text: 'Collapsed history, expanded latest message.', img: 'thread' },
    { title: 'Compose', text: 'Floating, draggable composer with attachments.', img: 'compose' },
    { title: 'Starred & Trash', text: 'Pin what matters, restore what you deleted.', img: 'starred' },
    { title: 'Drafts', text: 'Pick up exactly where you left off.', img: 'drafts' },
    { title: 'Reply & Forward', text: 'Reply, Reply All and Forward in one click.', img: 'reply' },
];

const FAQS = [
    { q: 'What is SRI.CR In-App Mail?', a: 'A secure in-app mail system for your organisation: folders, threaded conversations, drafts and attachments, all inside your workspace.' },
    { q: 'Is it free to sign up?', a: 'Yes. Create an account with your name and email and you can start straight away.' },
    { q: 'Can I attach files?', a: 'Yes, up to 5 files per message, 10 MB each.' },
    { q: 'Can I recover a deleted message?', a: 'Deleted mail goes to Trash first, where you can restore it. Deleting from Trash is permanent.' },
    { q: 'Is my mail private?', a: 'Messages stay inside the application and are only visible to the people on the conversation.' },
    { q: 'I forgot my password. What now?', a: 'Password reset is not available in this demo build yet. Contact your administrator.' },
];

const Arrow = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

const BARS = [38, 78, 52, 100, 64, 90, 48];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Decorative product preview on the hero (sample numbers, not live data). */
const HeroCard = ({ name }) => {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const date = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    const tiles = [
        { n: '12', label: 'Unread', color: 'linear-gradient(135deg,#657aad,#21408e)' },
        { n: '3', label: 'Drafts', color: 'linear-gradient(135deg,#f2f5fa,#a0accb)' },
        { n: '48', label: 'Sent this week', color: 'linear-gradient(135deg,#33529f,#1a233a)' },
    ];
    return (
        <aside className="hero-card" aria-label="Mailbox preview">
            <h2>{greeting}, {name}</h2>
            <small>{date}</small>
            <div className="hc-stats">
                {tiles.map((t) => (
                    <div key={t.label} className="hc-stat">
                        <span className="hc-dot" style={{ background: t.color }} />
                        <strong>{t.n}</strong>
                        <span>{t.label}</span>
                    </div>
                ))}
            </div>
            <div className="hc-chart">
                <strong>Mail this week</strong>
                <div className="hc-bars">{BARS.map((h, i) => <i key={DAYS[i]} style={{ height: `${h}%` }} />)}</div>
                <div className="hc-days">{DAYS.map((d) => <span key={d}>{d}</span>)}</div>
            </div>
        </aside>
    );
};

const Landing = () => {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [active, setActive] = useState('home');

    // Transparent over the hero, frosted mauve once scrolled; the link of the section in view lights up (scroll-spy).
    useEffect(() => {
        const onScroll = () => {
            setScrolled(window.scrollY > 8);
            const line = window.innerHeight * 0.35;
            let current = MENU[0].id;
            for (const m of MENU) {
                const el = document.getElementById(m.id);
                if (el && el.getBoundingClientRect().top <= line)
                    current = m.id;
            }
            setActive(current);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Close the mobile menu on Escape.
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => e.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    return (
        <div className="site">
            <header className={`nav${scrolled ? ' scrolled' : ''}`}>
                <Logo tone="brand" size={50} />
                <button type="button" className="nav-toggle" aria-label="Toggle menu" aria-expanded={open}
                    onClick={() => setOpen((o) => !o)}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
                    </svg>
                </button>
                <nav className={`nav-menu${open ? ' open' : ''}`} aria-label="Primary">
                    <div className="nav-links">
                        {MENU.map((m) => (
                            <a key={m.id} href={`#${m.id}`} className={active === m.id ? 'active' : ''}
                                aria-current={active === m.id ? 'true' : undefined} onClick={() => setOpen(false)}>{m.label}</a>
                        ))}
                    </div>
                    <div className="nav-actions">
                        {user
                            ? <Link to="/home" className="btn btn-primary">Open mailbox</Link>
                            : <>
                                <Link to="/login" className="btn btn-outline">Log in</Link>
                                <Link to="/signup" className="btn btn-primary">Sign up</Link>
                            </>}
                    </div>
                </nav>
            </header>

            <main>
                <section className="hero" id="home">
                    <div>
                        <span className="hero-pill">Team mail, simplified</span>
                        <h1>Run your whole team’s mail from one calm inbox.</h1>
                        <p>SRI.CR In-App Mail brings folders, threaded conversations, drafts and attachments together, with a clean view for every colleague in your workspace.</p>
                        <div className="hero-actions">
                            {user
                                ? <Link to="/home" className="btn btn-primary btn-lg">Open mailbox <Arrow /></Link>
                                : <>
                                    <Link to="/signup" className="btn btn-primary btn-lg">Create an account <Arrow /></Link>
                                    <Link to="/login" className="btn btn-outline btn-lg">Log in</Link>
                                </>}
                        </div>
                        {!user && <p className="hero-note">New accounts are ready to use right away.</p>}
                    </div>
                    <HeroCard name={user?.fullName.split(' ')[0] || 'Alex'} />
                </section>

                <section className="features">
                    {FEATURES.map((f) => (
                        <article key={f.title} className="feature">
                            <h3>{f.title}</h3>
                            <p>{f.text}</p>
                        </article>
                    ))}
                </section>

                <section className="section alt" id="gallery">
                    <h2 className="section-title">Gallery</h2>
                    <p className="section-lead">A quick look at the screens you will use every day.</p>
                    <div className="gallery">
                        {GALLERY.map((g) => (
                            <figure key={g.title} className="shot">
                                <img className="shot-img" src={`/gallery/${g.img}.svg`} alt={`${g.title} screen`}
                                    width="1600" height="1000" loading="lazy" />
                                <figcaption>
                                    <strong>{g.title}</strong>
                                    <span>{g.text}</span>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </section>

                <section className="section" id="about">
                    <h2 className="section-title">About SRI.CR In-App Mail</h2>
                    <p className="section-lead">
                        SRI.CR In-App Mail brings the everyday email experience into your own application. Teams message each other
                        without exposing anything to outside providers, and every conversation stays organised and searchable.
                    </p>
                    <div className="about-grid">
                        <div>
                            <h3>Our mission</h3>
                            <p>Make internal communication fast, private and effortless, so people spend less time managing mail and more time on the work.</p>
                            <h3>How it works</h3>
                            <ol className="steps">
                                <li>Create your account.</li>
                                <li>Compose a message to one or more colleagues.</li>
                                <li>Track replies in threaded conversations.</li>
                            </ol>
                        </div>
                        <div className="stats">
                            {STATS.map((s) => (
                                <div key={s.label} className="stat">
                                    <strong>{s.value}</strong>
                                    <span>{s.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="section" id="faq">
                    <h2 className="section-title">Frequently asked questions</h2>
                    <div className="faq">
                        {FAQS.map((f) => (
                            <details key={f.q}>
                                <summary>{f.q}</summary>
                                <p>{f.a}</p>
                            </details>
                        ))}
                    </div>
                </section>

                <section className="cta">
                    <h2>Ready to get organised?</h2>
                    <Link to="/signup" className="btn btn-light btn-lg">Sign up now</Link>
                </section>
            </main>

            <footer className="footer">
                <nav className="footer-links">
                    {MENU.map((m) => <a key={m.id} href={`#${m.id}`}>{m.label}</a>)}
                </nav>
                © {new Date().getFullYear()} SRI.CR. All rights reserved.
            </footer>
        </div>
    );
};
export default Landing;

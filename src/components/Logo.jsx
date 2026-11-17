import { Link } from 'react-router-dom';

/**
 * Same "S" monogram badge as the SRI.CR appointment app (same SVG as public/favicon.svg), drawn with theme
 * colours: `--logo-a` is the badge, `--logo-ink` the monogram on top of it.
 */
export const LogoMark = ({ size = 40 }) => (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="SRI.CR logo">
        <rect x="4" y="4" width="112" height="112" rx="32" fill="var(--logo-a)" />
        <path d="M82 40 C76 30 62 26 52 29 C40 33 37 46 46 53 C55 60 74 62 80 72 C86 82 80 94 66 96 C54 98 42 93 36 83"
            fill="none" stroke="var(--logo-ink)" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="92" cy="92" r="9" fill="var(--logo-ink)" />
    </svg>
);

/** tone: "brand" in the site header, "light" on cards, "dark" on plum backgrounds. */
const Logo = ({ tone = 'dark', size = 40 }) => (
    <Link to="/" className={`logo logo-${tone}`} aria-label="SRI.CR In-App Mail home">
        <LogoMark size={size} />
        <span className="logo-text">
            <span className="logo-word"><b className="la">SRI</b><b className="ld">.</b><b className="lb">CR</b></span>
            <span className="logo-slogan">In-App Mail</span>
        </span>
    </Link>
);
export default Logo;

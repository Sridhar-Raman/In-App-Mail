import { useEffect, useRef, useState } from 'react';
import { fetchContacts } from './api';
import { initial } from './helpers';
import Icon from './Icon';

/** To / Cc field: picked people as capsules plus a type-ahead over registered users. */
const RecipientField = ({ label, tags, onChange, excludeIds = [], error = '', right = null }) => {
    const [term, setTerm] = useState('');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const boxRef = useRef(null);

    // Debounced lookup, as soon as there is something typed.
    useEffect(() => {
        if (!term.trim()) { setResults([]); return undefined; }
        let stale = false;
        const timer = setTimeout(() => {
            fetchContacts(term.trim())
                .then((r) => { if (!stale) { setResults(r.contacts); setActive(0); } })
                .catch(() => { if (!stale) setResults([]); });
        }, 250);
        return () => { stale = true; clearTimeout(timer); };
    }, [term]);

    useEffect(() => {
        const onDown = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    const taken = new Set([...tags.map((t) => t.id), ...excludeIds]);
    const options = results.filter((c) => !taken.has(c.id));

    const pick = (c) => {
        onChange([...tags, { id: c.id, name: c.name }]);
        setTerm('');
        setResults([]);
    };
    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, options.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
        else if (e.key === 'Enter' && options[active]) { e.preventDefault(); pick(options[active]); }
        else if (e.key === 'Backspace' && !term && tags.length) onChange(tags.slice(0, -1));
        else if (e.key === 'Escape') setOpen(false);
    };

    return (
        <div className="rf" ref={boxRef}>
            <span className="rf-label">{label}</span>
            <div className="rf-box">
                {tags.map((t) => (
                    <span key={t.id} className="chip">
                        <span className="chip-av">{initial(t.name)}</span>{t.name}
                        <button type="button" aria-label={`Remove ${t.name}`} onClick={() => onChange(tags.filter((x) => x.id !== t.id))}><Icon name="close" size={14} /></button>
                    </span>
                ))}
                <input value={term} placeholder={tags.length ? '' : 'Search recipient'} autoComplete="off"
                    onChange={(e) => { setTerm(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown} />
            </div>
            {right}
            {open && term.trim() && (
                <ul className="rf-menu" role="listbox">
                    {options.length === 0 && <li className="rf-empty">Name not found</li>}
                    {options.map((c, i) => (
                        <li key={c.id} role="option" aria-selected={i === active} className={i === active ? 'on' : ''}
                            onMouseDown={(e) => { e.preventDefault(); pick(c); }} onMouseEnter={() => setActive(i)}>
                            <span className="chip-av">{initial(c.name)}</span>
                            <span><b>{c.name}</b><small>{c.email}</small></span>
                        </li>
                    ))}
                </ul>
            )}
            {error && <span className="rf-error">{error}</span>}
        </div>
    );
};
export default RecipientField;

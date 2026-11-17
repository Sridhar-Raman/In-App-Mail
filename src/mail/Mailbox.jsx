import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCount, fetchDraft } from './api';
import { FOLDERS } from './helpers';
import { useDialogs } from './Dialogs';
import ConversationList from './ConversationList';
import Thread from './Thread';
import Compose from './Compose';
import Icon from './Icon';
import './mail.css';

/** The mailbox: folder rail (with unread / draft badges), search, conversation list or open thread, floating composer. */
const Mailbox = ({ brand = null }) => {
    const { notify } = useDialogs();
    const [folder, setFolder] = useState('INBOX');
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    const [sort, setSort] = useState('newest');
    const [threadId, setThreadId] = useState(null);
    const [composer, setComposer] = useState(null); // { key, seed }

    // Search runs at 3+ characters; clearing the box resets (legacy rule). Debounced 500 ms.
    useEffect(() => {
        const timer = setTimeout(() => { if (search.length >= 3 || search.length === 0) setDebounced(search.trim()); }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: counts = {} } = useQuery({ queryKey: ['count'], queryFn: fetchCount, refetchInterval: 30000 });

    const selectFolder = (code) => { setFolder(code); setThreadId(null); };
    const backToList = useCallback(() => setThreadId(null), []);
    const openCompose = (seed = {}) => setComposer({ key: Date.now(), seed });

    const openRow = async (row) => {
        if (folder !== 'DRAFTS') { setThreadId(row.thread); return; }
        try {
            const { draft } = await fetchDraft(row.message);
            openCompose({
                draftId: draft.id, parentId: draft.parentId, type: draft.type,
                to: draft.to, cc: draft.cc, bcc: draft.bcc, subject: draft.subject, body: draft.body, attachments: draft.attachments,
            });
        } catch (err) {
            notify(err.message, 'error');
        }
    };

    return (
        <div className="mb">
            <aside className="mb-rail">
                {brand && <div className="mb-brand">{brand}</div>}
                <button type="button" className="mb-compose" disabled={!!composer} onClick={() => openCompose()}>
                    <Icon name="compose" size={22} />Compose
                </button>
                <nav aria-label="Folders">
                    {FOLDERS.map((f) => {
                        const badge = f.countKey ? counts[f.countKey] : 0;
                        return (
                            <button key={f.code} type="button" className={`mb-folder${folder === f.code ? ' active' : ''}`}
                                aria-current={folder === f.code ? 'page' : undefined} onClick={() => selectFolder(f.code)}>
                                <Icon name={f.icon} size={22} />
                                <span>{f.label}</span>
                                {!!badge && <b className="mb-badge">{badge}</b>}
                            </button>
                        );
                    })}
                </nav>
            </aside>

            <main className="mb-main">
                {/* Always-present top row keeps the content aligned with the user icon in the page corner. */}
                <div className="mb-top">
                    {!threadId && (
                        <div className="mb-search">
                            <Icon name="search" size={22} />
                            <input type="search" placeholder="Search by name, subject or text" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search mail" />
                            {search && <button type="button" className="icon-btn" aria-label="Clear search" onClick={() => { setSearch(''); setDebounced(''); }}><Icon name="close" /></button>}
                        </div>
                    )}
                </div>
                <div className="mb-card">
                    {threadId
                        ? <Thread threadId={threadId} folder={folder} onBack={backToList} />
                        : <ConversationList folder={folder} search={debounced} sort={sort} onSort={setSort} onOpen={openRow} />}
                </div>
            </main>

            {composer && (
                <div className="cmp-dock">
                    <Compose key={composer.key} variant="panel" seed={composer.seed}
                        onClose={() => setComposer(null)} onDone={() => setComposer(null)} />
                </div>
            )}
        </div>
    );
};
export default Mailbox;

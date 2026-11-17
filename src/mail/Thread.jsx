import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { attachmentUrl, changeStatus, fetchThread } from './api';
import { ACTIONS, buildReplySeed, formatFullDate, formatSize, initial } from './helpers';
import { useDialogs } from './Dialogs';
import Compose from './Compose';
import Icon from './Icon';

const Attachments = ({ items }) => (
    <div className="th-atts">
        {items.map((a) => (
            <div key={a.id} className="th-att">
                {/^image\/(png|jpe?g|gif|webp)$/.test(a.mime) && (
                    <a href={attachmentUrl(a.id)} target="_blank" rel="noreferrer"><img src={attachmentUrl(a.id)} alt={a.name} loading="lazy" /></a>
                )}
                <a className="th-att-link" href={attachmentUrl(a.id, true)} title="Download">
                    <Icon name="file" size={16} /><span>{a.name}</span><small>{formatSize(a.size)}</small><Icon name="download" size={16} />
                </a>
            </div>
        ))}
    </div>
);

/** Conversation reader: collapsed history, expanded latest message, per-message star/trash, Reply / Reply All / Forward. */
const Thread = ({ threadId, folder, onBack }) => {
    const { user } = useAuth();
    const { confirm, notify } = useDialogs();
    const queryClient = useQueryClient();
    const isTrash = folder === 'TRASH';
    const [expanded, setExpanded] = useState(() => new Set());
    const [reply, setReply] = useState(null);
    const seeded = useRef(null);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['thread', threadId, isTrash],
        queryFn: () => fetchThread(threadId, isTrash),
    });
    const messages = data?.messages || [];

    // Opening marks the conversation read on the server — refresh badges and rows.
    useEffect(() => {
        if (data) ['list', 'count'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    }, [data, queryClient]);

    // Expand the newest message when a conversation is first shown; later toggles are kept across refetches.
    useEffect(() => {
        if (messages.length && seeded.current !== threadId) {
            seeded.current = threadId;
            setExpanded(new Set([messages[messages.length - 1].id]));
            setReply(null);
        }
    }, [messages, threadId]);

    // Everything trashed / deleted from here — nothing left to read.
    useEffect(() => { if (data && !messages.length) onBack(); }, [data, messages.length, onBack]);

    const mutation = useMutation({
        mutationFn: changeStatus,
        onSuccess: (_res, vars) => {
            ['list', 'count', 'thread'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
            if (vars.done) notify(vars.done);
        },
        onError: (err) => notify(err.message, 'error'),
    });
    const apply = async (action, ids, ask = true) => {
        if (ask && !(await confirm({ title: action.title, text: action.confirm, confirmText: 'Yes', cancelText: 'No' }))) return;
        mutation.mutate({ statusCode: action.statusCode, statusFlag: action.statusFlag, ids, done: action.done });
    };

    const toggle = (id) => setExpanded((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const last = messages[messages.length - 1];
    const allIds = messages.map((m) => m.entryId);

    if (isLoading) return <div className="cl-state">Loading…</div>;
    if (isError) return <div className="cl-state cl-error">{error.message}</div>;

    return (
        <div className="th">
            <div className="th-head">
                <button type="button" className="icon-btn" title="Back" aria-label="Back" onClick={onBack}><Icon name="back" /></button>
                <h2>{messages[0]?.subject || '(no subject)'}</h2>
                <span className="th-head-actions">
                    {isTrash && <button type="button" className="icon-btn" title={ACTIONS.RESTORE.title} aria-label={ACTIONS.RESTORE.title} onClick={() => apply(ACTIONS.RESTORE, allIds)}><Icon name="restore" /></button>}
                    <button type="button" className="icon-btn" title={isTrash ? ACTIONS.PERMTRASH.title : 'Delete conversation'} aria-label="Delete conversation"
                        onClick={() => apply(isTrash ? ACTIONS.PERMTRASH : ACTIONS.TRASH, allIds)}><Icon name={isTrash ? 'delete-forever' : 'trash'} /></button>
                </span>
            </div>

            <div className="th-list">
                {messages.map((m) => {
                    const open = expanded.has(m.id);
                    return (
                        <article key={m.id} className={`th-msg${open ? ' open' : ''}`}>
                            <header onClick={() => toggle(m.id)}>
                                <span className="avatar">{initial(m.from.name)}</span>
                                <div className="th-who">
                                    <b>{m.from.id === user.id ? `${m.from.name} (me)` : m.from.name}</b>
                                    {open
                                        ? <small>to {m.to.map((p) => (p.id === user.id ? 'me' : p.name)).join(', ') || '—'}{m.cc.length > 0 && <> · cc {m.cc.map((p) => (p.id === user.id ? 'me' : p.name)).join(', ')}</>}{m.bcc.length > 0 && <> · bcc {m.bcc.map((p) => p.name).join(', ')}</>}</small>
                                        : <small className="th-snip">{m.body.replace(/\s+/g, ' ').slice(0, 120)}</small>}
                                </div>
                                <time>{formatFullDate(m.date)}</time>
                                <span className="th-msg-actions" onClick={(e) => e.stopPropagation()}>
                                    <button type="button" className={`star${m.starred ? ' on' : ''}`} title={m.starred ? 'Remove star' : 'Star'} aria-label="Toggle star"
                                        onClick={() => apply(m.starred ? ACTIONS.UNSTAR : ACTIONS.STAR, [m.entryId], false)}><Icon name={m.starred ? 'star-fill' : 'star'} /></button>
                                    {isTrash
                                        ? <button type="button" className="icon-btn" title={ACTIONS.RESTORE.title} aria-label={ACTIONS.RESTORE.title} onClick={() => apply(ACTIONS.RESTORE, [m.entryId])}><Icon name="restore" /></button>
                                        : <button type="button" className="icon-btn" title={ACTIONS.TRASH.title} aria-label={ACTIONS.TRASH.title} onClick={() => apply(ACTIONS.TRASH, [m.entryId])}><Icon name="trash" /></button>}
                                </span>
                            </header>
                            {open && (
                                <div className="th-body">
                                    <div className="th-text">{m.body || <i>(no content)</i>}</div>
                                    {m.attachments.length > 0 && <Attachments items={m.attachments} />}
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>

            {!isTrash && last && !reply && (
                <div className="th-reply-bar">
                    <button type="button" className="mbtn mbtn-outline" onClick={() => setReply(buildReplySeed('REPLY', last, user.id))}><Icon name="reply" size={18} />Reply</button>
                    <button type="button" className="mbtn mbtn-outline" onClick={() => setReply(buildReplySeed('REPLYALL', last, user.id))}><Icon name="reply-all" size={18} />Reply all</button>
                    <button type="button" className="mbtn mbtn-outline" onClick={() => setReply(buildReplySeed('FORWD', last, user.id))}><Icon name="forward" size={18} />Forward</button>
                </div>
            )}
            {reply && (
                <Compose key={`${reply.parentId}-${reply.type}-${reply.to.length}`} variant="inline" seed={reply}
                    onClose={() => setReply(null)} onDone={() => setReply(null)} />
            )}
        </div>
    );
};
export default Thread;

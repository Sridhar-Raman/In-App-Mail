import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PAGE_SIZE, changeStatus, fetchList } from './api';
import { ACTIONS, FOLDERS, bulkActionsFor, formatListDate } from './helpers';
import { useDialogs } from './Dialogs';
import Icon from './Icon';

/** Server-paginated folder list with search/sort, per-row actions and multi-select bulk actions. */
const ConversationList = ({ folder, search, sort, onSort, onOpen }) => {
    const { confirm, notify } = useDialogs();
    const queryClient = useQueryClient();
    const [start, setStart] = useState(0);
    const [selected, setSelected] = useState(() => new Set());

    useEffect(() => { setStart(0); setSelected(new Set()); }, [folder, search, sort]);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['list', folder, start, search, sort],
        queryFn: () => fetchList({ folder, start, search, sort }),
        placeholderData: keepPreviousData,
    });
    const rows = useMemo(() => data?.rows || [], [data]);
    const total = data?.total || 0;

    // An action on the last row of a page can leave the page empty — step back.
    useEffect(() => { if (data && !rows.length && start > 0) setStart(Math.max(0, start - PAGE_SIZE)); }, [data, rows.length, start]);
    useEffect(() => { setSelected((prev) => new Set([...prev].filter((k) => rows.some((r) => r.key === k)))); }, [rows]);

    const mutation = useMutation({
        mutationFn: changeStatus,
        onSuccess: (_res, vars) => {
            ['list', 'count', 'thread'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
            setSelected(new Set());
            if (vars.done) notify(vars.done);
        },
        onError: (err) => notify(err.message, 'error'),
    });

    const apply = (action, ids, { ask = true } = {}) => async () => {
        if (!ids.length) return;
        if (ask) {
            const yes = await confirm({ title: action.title, text: action.confirm, confirmText: 'Yes', cancelText: 'No' });
            if (!yes) return;
        }
        mutation.mutate({ statusCode: action.statusCode, statusFlag: action.statusFlag, ids, done: action.done });
    };

    const selectedRows = rows.filter((r) => selected.has(r.key));
    const selectedIds = selectedRows.flatMap((r) => r.ids);
    const allSelected = rows.length > 0 && selected.size === rows.length;
    const toggle = (key) => setSelected((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

    const folderLabel = FOLDERS.find((f) => f.code === folder)?.label || '';
    const first = total ? start + 1 : 0;
    const last = Math.min(start + PAGE_SIZE, total);
    const sentView = folder === 'SENT' || folder === 'DRAFTS';

    return (
        <div className="cl">
            <div className="cl-head">
                <label className="cl-check" title="Select all">
                    <input type="checkbox" checked={allSelected} disabled={!rows.length} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.key)))} />
                </label>
                {selected.size > 0 ? (
                    <div className="cl-bulk">
                        <span className="cl-bulk-count">{selected.size} selected</span>
                        {bulkActionsFor(folder).map((code) => (
                            <button key={code} type="button" className="icon-btn" title={ACTIONS[code].title} aria-label={ACTIONS[code].title}
                                onClick={apply(ACTIONS[code], selectedIds)}><Icon name={ACTIONS[code].icon} /></button>
                        ))}
                    </div>
                ) : <span className="cl-title">{folderLabel}</span>}
                <div className="cl-tools">
                    <select value={sort} onChange={(e) => onSort(e.target.value)} aria-label="Sort order">
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                    </select>
                    <span className="cl-pager">
                        <button type="button" className="icon-btn" aria-label="Previous page" disabled={start === 0} onClick={() => setStart(Math.max(0, start - PAGE_SIZE))}><Icon name="chevron-left" /></button>
                        <span>{first} - {last} of {total}</span>
                        <button type="button" className="icon-btn" aria-label="Next page" disabled={last >= total} onClick={() => setStart(start + PAGE_SIZE)}><Icon name="chevron-right" /></button>
                    </span>
                </div>
            </div>

            {isLoading && <div className="cl-state">Loading…</div>}
            {isError && <div className="cl-state cl-error">{error.message}</div>}
            {!isLoading && !isError && rows.length === 0 && (
                <div className="cl-state">
                    <Icon name={FOLDERS.find((f) => f.code === folder).icon} size={44} />
                    <p>{search ? 'No mails match your search.' : `No mails in ${folderLabel}.`}</p>
                </div>
            )}

            <ul className="cl-rows">
                {rows.map((row) => {
                    const isDraft = folder === 'DRAFTS';
                    const names = (sentView && !isDraft ? 'To: ' : '') + row.names.join(', ');
                    return (
                        <li key={row.key} className={`cl-row${row.unread ? ' unread' : ''}${selected.has(row.key) ? ' sel' : ''}`}
                            onClick={() => onOpen(row)}>
                            <label className="cl-check" onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" checked={selected.has(row.key)} onChange={() => toggle(row.key)} aria-label="Select conversation" />
                            </label>
                            <button type="button" className={`star${row.starred ? ' on' : ''}`} title={row.starred ? 'Remove star' : 'Star'} aria-label={row.starred ? 'Remove star' : 'Star'}
                                onClick={(e) => { e.stopPropagation(); apply(row.starred ? ACTIONS.UNSTAR : ACTIONS.STAR, row.ids, { ask: false })(); }}>
                                <Icon name={row.starred ? 'star-fill' : 'star'} />
                            </button>
                            <span className="cl-names">{isDraft && <em className="draft-tag">Draft</em>}{names}</span>
                            <span className="cl-subject"><b>{row.subject || '(no subject)'}</b>{row.snippet && <span> – {row.snippet}</span>}</span>
                            {row.count > 1 && <span className="cl-count">{row.count}</span>}
                            {row.hasAttachments && <Icon name="attach" size={16} className="cl-clip" />}
                            <span className="cl-date">{formatListDate(row.date)}</span>
                            <span className="cl-actions" onClick={(e) => e.stopPropagation()}>
                                {folder !== 'DRAFTS' && (
                                    <button type="button" className="icon-btn" title={row.unread ? 'Mark as read' : 'Mark as unread'}
                                        aria-label={row.unread ? 'Mark as read' : 'Mark as unread'}
                                        onClick={apply(row.unread ? ACTIONS.READ : ACTIONS.UNREAD, row.ids, { ask: false })}><Icon name={row.unread ? 'read' : 'unread'} /></button>
                                )}
                                {folder === 'TRASH' && (
                                    <button type="button" className="icon-btn" title={ACTIONS.RESTORE.title} aria-label={ACTIONS.RESTORE.title} onClick={apply(ACTIONS.RESTORE, row.ids)}><Icon name="restore" /></button>
                                )}
                                {(() => {
                                    const a = folder === 'TRASH' || folder === 'DRAFTS' ? ACTIONS.PERMTRASH : ACTIONS.TRASH;
                                    return <button type="button" className="icon-btn" title={a.title} aria-label={a.title} onClick={apply(a, row.ids)}><Icon name={a.icon} /></button>;
                                })()}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
export default ConversationList;

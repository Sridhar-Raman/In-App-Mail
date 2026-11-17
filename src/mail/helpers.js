/** Folder rail — order, labels and icons as in the legacy in-app-mail screen. `countKey` is the badge from /mail/count. */
export const FOLDERS = [
    { code: 'INBOX', label: 'Inbox', icon: 'inbox', countKey: 'UNREAD' },
    { code: 'DRAFTS', label: 'Drafts', icon: 'drafts', countKey: 'DRAFTS' },
    { code: 'SENT', label: 'Sent', icon: 'sent' },
    { code: 'STARRED', label: 'Starred', icon: 'star' },
    { code: 'TRASH', label: 'Trash', icon: 'trash' },
];

/** Bulk / row actions: the exact { statusCode, statusFlag } sent to /mail/status plus the legacy confirmation copy. */
export const ACTIONS = {
    TRASH: { statusCode: 'TRASH', statusFlag: 'Y', icon: 'trash', title: 'Move to trash', confirm: 'Do you want to move the mail to trash?', done: 'Moved to trash' },
    RESTORE: { statusCode: 'TRASH', statusFlag: 'N', icon: 'restore', title: 'Restore from trash', confirm: 'Do you want to restore the selected mail?', done: 'Restored' },
    PERMTRASH: { statusCode: 'PERMTRASH', statusFlag: 'Y', icon: 'delete-forever', title: 'Delete permanently', confirm: 'Do you want to delete the mail permanently?', done: 'Deleted permanently' },
    STAR: { statusCode: 'STARD', statusFlag: 'Y', icon: 'star', title: 'Star', confirm: 'Do you want to star the mail?', done: 'Starred' },
    UNSTAR: { statusCode: 'STARD', statusFlag: 'N', icon: 'star-fill', title: 'Remove star', confirm: 'Do you want to unstar the mail?', done: 'Star removed' },
    READ: { statusCode: 'READ', statusFlag: 'Y', icon: 'read', title: 'Mark as read', confirm: 'Do you want to mark as read?', done: 'Marked as read' },
    UNREAD: { statusCode: 'READ', statusFlag: 'N', icon: 'unread', title: 'Mark as unread', confirm: 'Do you want to mark as unread?', done: 'Marked as unread' },
};

/** Which bulk buttons show for a folder, in order (legacy bulkActionsForFolder). */
export const bulkActionsFor = (folder) => [
    ...(folder === 'TRASH' || folder === 'DRAFTS' ? ['PERMTRASH'] : ['TRASH']),
    ...(folder === 'TRASH' ? ['RESTORE'] : []),
    'STAR', 'UNSTAR', 'READ', 'UNREAD',
];

const sameDay = (a, b) => a.toDateString() === b.toDateString();

/** List date: time today, "Nov 2" this year, dd/mm/yyyy otherwise. */
export const formatListDate = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    if (sameDay(d, now))
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (d.getFullYear() === now.getFullYear())
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return d.toLocaleDateString('en-GB');
};

export const formatFullDate = (iso) => new Date(iso).toLocaleString([], {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
});

export const formatSize = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export const initial = (name) => (name || '?').trim().charAt(0).toUpperCase();

const prefixed = (prefix, subject) => (new RegExp(`^${prefix}:`, 'i').test(subject) ? subject : `${prefix}: ${subject}`);
const quote = (text) => text.split('\n').map((l) => `> ${l}`).join('\n');
const names = (list) => list.map((p) => p.name).join(', ');
const uniqueById = (list) => [...new Map(list.map((p) => [p.id, p])).values()];

/** Compose seed for Reply / Reply All / Forward of message `m`, as `meId` (legacy composePrefill). */
export const buildReplySeed = (type, m, meId) => {
    const when = formatFullDate(m.date);
    const base = { parentId: m.id, type: type === 'FORWD' ? 'FORWD' : 'REPLY', attachments: [], to: [], cc: [] };
    if (type === 'FORWD') {
        return {
            ...base,
            subject: prefixed('Fwd', m.subject),
            attachments: m.attachments,
            body: `\n\n---------- Forwarded message ----------\nFrom: ${m.from.name}\nDate: ${when}\nSubject: ${m.subject}\nTo: ${names(m.to)}\n\n${m.body}`,
        };
    }
    const replyTo = m.from.id === meId ? m.to : [m.from];
    const to = type === 'REPLYALL' ? uniqueById([...replyTo, ...(m.from.id === meId ? [] : m.to)]) : replyTo;
    return {
        ...base,
        to: to.filter((p) => p.id !== meId),
        cc: type === 'REPLYALL' ? m.cc.filter((p) => p.id !== meId && !to.some((t) => t.id === p.id)) : [],
        subject: prefixed('Re', m.subject),
        body: `\n\nOn ${when}, ${m.from.name} wrote:\n${quote(m.body)}`,
    };
};

import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Mailbox from '../models/Mailbox.js';
import Attachment from '../models/Attachment.js';
import User from '../models/User.js';

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export class HttpError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}

export const isId = (v) => typeof v === 'string' && mongoose.isValidObjectId(v);
const uniqueIds = (arr) => [...new Set((Array.isArray(arr) ? arr : []).filter(isId))];
export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Folder rules (legacy conversation types) as Mailbox filters. */
const FOLDER_FILTER = {
    INBOX: { role: { $in: ['to', 'cc', 'bcc'] }, status: 'SENT', trashed: false },
    SENT: { role: 'sender', status: 'SENT', trashed: false },
    DRAFTS: { role: 'sender', status: 'DRAFTS', trashed: false },
    STARRED: { starred: true, status: 'SENT', trashed: false },
    TRASH: { trashed: true },
};
export const FOLDERS = Object.keys(FOLDER_FILTER);

/** Attachments this user may reference/download: ones they uploaded, or that sit on a message in their mailbox. */
export const accessibleAttachmentIds = async (userId, ids) => {
    if (!ids.length) return [];
    const owned = await Attachment.find({ _id: { $in: ids }, uploader: userId }).select('_id');
    const ok = new Set(owned.map((a) => a.id));
    const rest = ids.filter((id) => !ok.has(id));
    if (rest.length) {
        const messages = await Message.find({ attachments: { $in: rest } }).select('_id attachments');
        for (const m of messages) {
            if (await Mailbox.exists({ user: userId, message: m._id, deleted: false }))
                m.attachments.forEach((a) => ok.add(a.toString()));
        }
    }
    return ids.filter((id) => ok.has(id));
};

/**
 * Send (status SENT) or save as draft (status DRAFTS). `draftId` continues an existing draft; `parentId`
 * makes this a reply / forward inside that conversation.
 */
export const saveMessage = async (user, p) => {
    const status = p.status === 'SENT' ? 'SENT' : 'DRAFTS';
    const toIds = uniqueIds(p.to);
    const ccIds = uniqueIds(p.cc).filter((id) => !toIds.includes(id));
    const bccIds = uniqueIds(p.bcc).filter((id) => !toIds.includes(id) && !ccIds.includes(id));
    if (status === 'SENT' && !toIds.length && !ccIds.length && !bccIds.length)
        throw new HttpError(400, 'To input is required.');

    const people = await User.find({ _id: { $in: [...toIds, ...ccIds, ...bccIds] } });
    const byId = new Map(people.map((u) => [u.id, u]));
    if (byId.size !== toIds.length + ccIds.length + bccIds.length)
        throw new HttpError(400, 'One or more recipients do not exist.');
    const recipients = [
        ...toIds.map((id) => ({ user: id, name: byId.get(id).fullName, cc: false })),
        ...ccIds.map((id) => ({ user: id, name: byId.get(id).fullName, cc: true })),
        ...bccIds.map((id) => ({ user: id, name: byId.get(id).fullName, bcc: true })),
    ];

    const wanted = uniqueIds(p.attachments);
    if (wanted.length > MAX_ATTACHMENTS)
        throw new HttpError(400, `You can attach up to ${MAX_ATTACHMENTS} files.`);
    const attachments = await accessibleAttachmentIds(user.id, wanted);
    if (attachments.length !== wanted.length)
        throw new HttpError(400, 'An attachment is not available.');

    let message;
    if (p.draftId) {
        if (!isId(p.draftId)) throw new HttpError(404, 'Draft not found');
        message = await Message.findOne({ _id: p.draftId, author: user.id, status: 'DRAFTS' });
        if (!message) throw new HttpError(404, 'Draft not found');
    } else {
        message = new Message({ author: user.id, authorName: user.fullName });
        let parent = null;
        if (p.parentId) {
            if (!isId(p.parentId)) throw new HttpError(404, 'Original message not found');
            parent = await Message.findOne({ _id: p.parentId, status: 'SENT' });
            if (!parent || !(await Mailbox.exists({ user: user.id, message: parent._id, deleted: false })))
                throw new HttpError(404, 'Original message not found');
        }
        message.thread = parent ? parent.thread : message._id;
        message.parent = parent ? parent._id : null;
        message.type = parent ? (p.type === 'FORWD' ? 'FORWD' : 'REPLY') : 'ORGINL';
    }

    message.status = status;
    message.subject = String(p.subject || '').trim().slice(0, 200);
    message.body = String(p.body || '').slice(0, 50000);
    message.recipients = recipients;
    message.attachments = attachments;
    message.authorName = user.fullName;
    message.date = new Date();
    await message.save();

    // Bcc names appear only on the sender's own copy — never in a recipient's list text or search.
    const forEntry = (names) => ({
        toNames: names,
        search: [message.subject, message.authorName, ...names, message.body.slice(0, 2000)].join(' ').toLowerCase(),
    });
    const base = {
        message: message._id,
        thread: message.thread,
        status,
        date: message.date,
        subject: message.subject,
        authorName: message.authorName,
        snippet: message.body.replace(/\s+/g, ' ').trim().slice(0, 140),
        hasAttachments: attachments.length > 0,
    };
    const entries = [{ ...base, ...forEntry(recipients.map((r) => r.name)), user: user._id, role: 'sender', read: true }];
    if (status === 'SENT') {
        const visible = forEntry(recipients.filter((r) => !r.bcc).map((r) => r.name));
        recipients.forEach((r) => entries.push({ ...base, ...visible, user: r.user, role: r.bcc ? 'bcc' : r.cc ? 'cc' : 'to', read: false }));
    }

    await Mailbox.deleteMany({ message: message._id });
    await Mailbox.insertMany(entries);
    return message;
};

/** Read the message back from the database: it must exist with its sender copy (Sent / Drafts) and every recipient copy (Inbox). */
export const isStored = async (message) => {
    const stored = await Message.findOne({ _id: message._id, status: message.status }).select('recipients');
    if (!stored) return false;
    const expected = 1 + (message.status === 'SENT' ? stored.recipients.length : 0);
    const copies = await Mailbox.countDocuments({ message: message._id, deleted: false });
    const senderCopy = await Mailbox.exists({ message: message._id, user: message.author, role: 'sender' });
    return copies === expected && !!senderCopy;
};

/** Paginated conversation list for a folder (one row per conversation; drafts one row per draft). */
export const listFolder = async (user, { folder, start, length, search, sort }) => {
    const match = { user: user._id, deleted: false, ...FOLDER_FILTER[folder] };
    if (search)
        match.search = { $regex: escapeRegex(search.toLowerCase()) };

    const [result] = await Mailbox.aggregate([
        { $match: match },
        { $sort: { date: -1 } },
        {
            $group: {
                _id: folder === 'DRAFTS' ? '$message' : '$thread',
                ids: { $push: '$_id' },
                count: { $sum: 1 },
                unread: { $max: { $cond: [{ $eq: ['$read', false] }, 1, 0] } },
                starred: { $max: { $cond: ['$starred', 1, 0] } },
                trashed: { $max: { $cond: ['$trashed', 1, 0] } },
                hasAttachments: { $max: { $cond: ['$hasAttachments', 1, 0] } },
                date: { $first: '$date' },
                thread: { $first: '$thread' },
                message: { $first: '$message' },
                subject: { $last: '$subject' },
                snippet: { $first: '$snippet' },
                authors: { $push: '$authorName' },
                toNames: { $push: '$toNames' },
            },
        },
        { $sort: { date: sort === 'oldest' ? 1 : -1 } },
        { $facet: { rows: [{ $skip: start }, { $limit: length }], total: [{ $count: 'n' }] } },
    ]);

    const rows = result.rows.map((r) => {
        const sentView = folder === 'SENT' || folder === 'DRAFTS';
        const names = sentView
            ? [...new Set(r.toNames.flat())]
            : [...new Set(r.authors.map((a) => (a === user.fullName ? 'me' : a)))];
        return {
            key: r._id.toString(),
            ids: r.ids.map(String),
            thread: r.thread.toString(),
            message: r.message.toString(),
            names: sentView && !names.length ? ['(no recipients)'] : names,
            subject: r.subject,
            snippet: r.snippet,
            count: r.count,
            unread: !!r.unread,
            starred: !!r.starred,
            trashed: !!r.trashed,
            hasAttachments: !!r.hasAttachments,
            date: r.date,
        };
    });
    return { rows, total: result.total[0]?.n || 0 };
};

export const folderCounts = async (user) => {
    const base = { user: user._id, deleted: false };
    const [unread, drafts] = await Promise.all([
        Mailbox.distinct('thread', { ...base, ...FOLDER_FILTER.INBOX, read: false }),
        Mailbox.countDocuments({ ...base, ...FOLDER_FILTER.DRAFTS }),
    ]);
    return { UNREAD: unread.length, DRAFTS: drafts };
};

/** Full conversation for the thread reader; marks what it returns as read. */
export const getThread = async (user, threadId, isTrash) => {
    const entries = await Mailbox.find({
        user: user._id, thread: threadId, deleted: false, status: 'SENT', trashed: isTrash,
    }).sort({ date: 1 });
    if (!entries.length) return [];
    const messages = await Message.find({ _id: { $in: entries.map((e) => e.message) } })
        .populate({ path: 'attachments', select: 'name mime size' });
    const byId = new Map(messages.map((m) => [m.id, m]));

    await Mailbox.updateMany({ _id: { $in: entries.filter((e) => !e.read).map((e) => e._id) } }, { read: true });

    return entries.map((e) => {
        const m = byId.get(e.message.toString());
        const person = (r) => ({ id: r.user.toString(), name: r.name });
        return {
            id: m.id,
            entryId: e.id,
            from: { id: m.author.toString(), name: m.authorName },
            to: m.recipients.filter((r) => !r.cc && !r.bcc).map(person),
            cc: m.recipients.filter((r) => r.cc).map(person),
            // Bcc is visible only to the sender.
            bcc: m.author.toString() === user.id ? m.recipients.filter((r) => r.bcc).map(person) : [],
            subject: m.subject,
            body: m.body,
            date: m.date,
            starred: e.starred,
            trashed: e.trashed,
            mine: m.author.toString() === user.id,
            attachments: m.attachments.map((a) => ({ id: a.id, name: a.name, mime: a.mime, size: a.size })),
        };
    });
};

export const getDraft = async (user, id) => {
    if (!isId(id)) throw new HttpError(404, 'Draft not found');
    const m = await Message.findOne({ _id: id, author: user.id, status: 'DRAFTS' })
        .populate({ path: 'attachments', select: 'name mime size' });
    if (!m) throw new HttpError(404, 'Draft not found');
    const person = (r) => ({ id: r.user.toString(), name: r.name });
    return {
        id: m.id, parentId: m.parent?.toString() || null, type: m.type, subject: m.subject, body: m.body,
        to: m.recipients.filter((r) => !r.cc && !r.bcc).map(person),
        cc: m.recipients.filter((r) => r.cc).map(person),
        bcc: m.recipients.filter((r) => r.bcc).map(person),
        attachments: m.attachments.map((a) => ({ id: a.id, name: a.name, mime: a.mime, size: a.size })),
    };
};

/** Drop a message (and attachments nothing else uses) once every copy of it has been deleted. */
const cleanAttachments = async (ids) => {
    for (const attId of ids) {
        if (!(await Message.exists({ attachments: attId })))
            await Attachment.findByIdAndDelete(attId);
    }
};

/** Drop a message (and attachments nothing else uses) once every copy of it has been deleted. */
const removeIfOrphaned = async (messageId) => {
    if (await Mailbox.exists({ message: messageId, deleted: false })) return;
    const message = await Message.findByIdAndDelete(messageId);
    await Mailbox.deleteMany({ message: messageId });
    await cleanAttachments(message?.attachments || []);
};

/** READ / STARD / TRASH / PERMTRASH on the caller's own mailbox rows. */
export const changeStatus = async (user, { statusCode, statusFlag, ids }) => {
    const on = statusFlag !== 'N';
    const rowIds = uniqueIds(ids);
    if (!rowIds.length) return 0;
    const filter = { _id: { $in: rowIds }, user: user._id, deleted: false };

    if (statusCode === 'READ') return (await Mailbox.updateMany(filter, { read: on })).modifiedCount;
    if (statusCode === 'STARD') return (await Mailbox.updateMany(filter, { starred: on })).modifiedCount;
    if (statusCode === 'TRASH') return (await Mailbox.updateMany(filter, { trashed: on })).modifiedCount;
    if (statusCode === 'PERMTRASH') {
        const rows = await Mailbox.find(filter).select('message');
        await Mailbox.updateMany(filter, { deleted: true });
        for (const messageId of new Set(rows.map((r) => r.message.toString()))) {
            // A draft only the author can see is removed outright.
            const draft = await Message.findOneAndDelete({ _id: messageId, author: user._id, status: 'DRAFTS' });
            if (draft) {
                await Mailbox.deleteMany({ message: messageId });
                await cleanAttachments(draft.attachments);
            } else {
                await removeIfOrphaned(messageId);
            }
        }
        return rows.length;
    }
    throw new HttpError(400, 'Unknown status code');
};

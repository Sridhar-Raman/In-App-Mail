import { Router } from 'express';
import multer from 'multer';
import User from '../models/User.js';
import Attachment from '../models/Attachment.js';
import { requireAuth } from '../middleware/auth.js';
import {
    FOLDERS, HttpError, MAX_ATTACHMENT_BYTES, accessibleAttachmentIds, changeStatus, escapeRegex, folderCounts,
    getDraft, getThread, isId, isStored, listFolder, saveMessage,
} from '../services/mail.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 } });

router.use(requireAuth, async (req, res, next) => {
    req.user = await User.findById(req.userId);
    if (!req.user)
        return res.status(401).json({ message: 'Not signed in' });
    next();
});

router.get('/count', async (req, res) => res.json(await folderCounts(req.user)));

router.get('/list', async (req, res) => {
    const folder = String(req.query.folder || 'INBOX').toUpperCase();
    if (!FOLDERS.includes(folder))
        throw new HttpError(400, 'Unknown folder');
    const start = Math.max(0, parseInt(req.query.start, 10) || 0);
    const length = Math.min(100, Math.max(1, parseInt(req.query.length, 10) || 25));
    const search = String(req.query.search || '').trim().slice(0, 100);
    res.json(await listFolder(req.user, { folder, start, length, search, sort: req.query.sort }));
});

router.get('/thread/:id', async (req, res) => {
    if (!isId(req.params.id))
        throw new HttpError(404, 'Conversation not found');
    res.json({ messages: await getThread(req.user, req.params.id, req.query.trash === 'Y') });
});

router.get('/drafts/:id', async (req, res) => res.json({ draft: await getDraft(req.user, req.params.id) }));

router.get('/contacts', async (req, res) => {
    const term = String(req.query.search || '').trim().slice(0, 50);
    const rx = new RegExp(escapeRegex(term), 'i');
    const users = await User.find({ _id: { $ne: req.user._id }, ...(term ? { $or: [{ fullName: rx }, { email: rx }] } : {}) })
        .sort({ fullName: 1 }).limit(20);
    res.json({ contacts: users.map((u) => ({ id: u.id, name: u.fullName, email: u.email })) });
});

/** Send (`status: 'SENT'`) or save a draft (`status: 'DRAFTS'`). */
router.post('/messages', async (req, res) => {
    const message = await saveMessage(req.user, req.body || {});
    res.status(201).json({ id: message.id, thread: message.thread.toString(), status: message.status, verified: await isStored(message) });
});

router.post('/status', async (req, res) => {
    const { statusCode, statusFlag, ids } = req.body || {};
    res.json({ status: 'success', changed: await changeStatus(req.user, { statusCode, statusFlag, ids }) });
});

router.post('/attachments', upload.single('file'), async (req, res) => {
    if (!req.file)
        throw new HttpError(400, 'No file received');
    const name = Buffer.from(req.file.originalname, 'latin1').toString('utf8').slice(0, 200);
    const attachment = await Attachment.create({
        uploader: req.user._id, name, mime: req.file.mimetype, size: req.file.size, data: req.file.buffer,
    });
    res.status(201).json({ attachment: { id: attachment.id, name, mime: attachment.mime, size: attachment.size } });
});

// Only types a browser cannot run as a page are shown inline; everything else downloads.
const INLINE = /^(image\/(png|jpe?g|gif|webp)|application\/pdf)$/;

router.get('/attachments/:id', async (req, res) => {
    if (!isId(req.params.id) || !(await accessibleAttachmentIds(req.user.id, [req.params.id])).length)
        throw new HttpError(404, 'Attachment not found');
    const a = await Attachment.findById(req.params.id).select('+data');
    if (!a)
        throw new HttpError(404, 'Attachment not found');
    const inline = INLINE.test(a.mime) && req.query.download !== '1';
    res.set({
        'Content-Type': inline ? a.mime : 'application/octet-stream',
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(a.name)}`,
        'Content-Length': a.size,
        'Cache-Control': 'private, max-age=3600',
    });
    res.send(a.data);
});

export default router;

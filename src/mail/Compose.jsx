import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { MAX_FILES, MAX_FILE_MB, attachmentUrl, saveMessage, uploadAttachment } from './api';
import { formatSize } from './helpers';
import { useDialogs } from './Dialogs';
import RecipientField from './RecipientField';
import Icon from './Icon';

/**
 * Composer for a new mail, a reply / reply all / forward, or an existing draft.
 * `seed` = { draftId?, parentId?, type?, to, cc, subject, body, attachments }.
 * variant "panel" floats bottom-right (minimisable); "inline" sits under a thread.
 */
const Compose = ({ variant = 'panel', seed = {}, onClose, onDone }) => {
    const { user } = useAuth();
    const { confirm, notify } = useDialogs();
    const queryClient = useQueryClient();
    const fileRef = useRef(null);

    const [to, setTo] = useState(seed.to || []);
    const [cc, setCc] = useState(seed.cc || []);
    const [bcc, setBcc] = useState(seed.bcc || []);
    const [showCc, setShowCc] = useState((seed.cc || []).length > 0);
    const [showBcc, setShowBcc] = useState((seed.bcc || []).length > 0);
    const [subject, setSubject] = useState(seed.subject || '');
    const [body, setBody] = useState(seed.body || '');
    const [files, setFiles] = useState(seed.attachments || []);
    const [uploading, setUploading] = useState(0);
    const [toError, setToError] = useState('');
    const [minimized, setMinimized] = useState(false);
    const [maximized, setMaximized] = useState(false);
    const [draftId, setDraftId] = useState(seed.draftId || null);

    const dirty = to.length || cc.length || bcc.length || subject.trim() || body.trim() || files.length;

    const save = useMutation({
        mutationFn: (status) => saveMessage({
            status, draftId, parentId: seed.parentId, type: seed.type,
            to: to.map((p) => p.id), cc: cc.map((p) => p.id), bcc: bcc.map((p) => p.id), subject, body, attachments: files.map((f) => f.id),
        }),
        onSuccess: (res, status) => {
            ['list', 'count', 'thread'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
            // The server reads the mail back from the database; if it is not there, say so and keep the composer open.
            if (!res.verified) {
                notify(status === 'SENT'
                    ? 'The mail is not available in Sent. It was not saved to the database — please try sending again.'
                    : 'The draft is not available in Drafts. It was not saved — please try again.', 'error');
                return;
            }
            notify(status === 'SENT' ? 'Message sent' : 'Draft saved');
            onDone?.(status);
        },
        onError: (err) => notify(err.message, 'error'),
    });

    const send = async () => {
        if (!to.length && !cc.length && !bcc.length) { setToError('To input is required.'); return; }
        setToError('');
        if (!subject.trim()) {
            const yes = await confirm({ title: 'Send without subject?', text: 'This message has no subject.', confirmText: 'Send anyway', cancelText: 'Cancel' });
            if (!yes) return;
        }
        save.mutate('SENT');
    };

    const close = async () => {
        if (save.isPending) return;
        if (!dirty) { onClose?.(); return; }
        const choice = await confirm({
            title: 'Save as draft?', text: 'This message has not been sent.', confirmText: 'Save draft', denyText: 'Discard',
        });
        if (choice === true) save.mutate('DRAFTS');
        else if (choice === false) onClose?.();
    };

    const addFiles = async (list) => {
        const picked = [...list];
        if (files.length + uploading + picked.length > MAX_FILES) { notify(`You can attach up to ${MAX_FILES} files.`, 'error'); return; }
        const tooBig = picked.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
        if (tooBig) { notify(`${tooBig.name} is larger than ${MAX_FILE_MB} MB.`, 'error'); return; }
        setUploading((n) => n + picked.length);
        for (const file of picked) {
            try {
                const { attachment } = await uploadAttachment(file);
                setFiles((prev) => [...prev, attachment]);
            } catch (err) {
                notify(err.message, 'error');
            } finally {
                setUploading((n) => n - 1);
            }
        }
    };

    const busy = save.isPending || uploading > 0;
    const title = seed.parentId ? (seed.type === 'FORWD' ? 'Forward' : 'Reply') : 'New message';
    const me = user.id;

    return (
        <section className={`cmp cmp-${variant}${minimized ? ' min' : ''}${maximized && !minimized ? ' max' : ''}`} aria-label={title}>
            <header className="cmp-head">
                <strong>{title}</strong>
                <span className="cmp-head-actions">
                    {variant === 'panel' && (
                        <>
                            <button type="button" aria-label={minimized ? 'Expand' : 'Minimise'} title={minimized ? 'Expand' : 'Minimise'} onClick={() => setMinimized((v) => !v)}>
                                <Icon name={minimized ? 'expand' : 'minimize'} size={18} />
                            </button>
                            <button type="button" aria-label={maximized ? 'Exit full screen' : 'Full screen'} title={maximized ? 'Exit full screen' : 'Full screen'}
                                onClick={() => { setMaximized((v) => !v); setMinimized(false); }}>
                                <Icon name={maximized ? 'maximize-exit' : 'maximize'} size={18} />
                            </button>
                        </>
                    )}
                    <button type="button" aria-label="Close" title="Close" onClick={close}><Icon name="close" size={18} /></button>
                </span>
            </header>
            {!minimized && (
                <div className="cmp-body">
                    <div className="rf">
                        <span className="rf-label">From</span>
                        <div className="rf-box"><span className="chip"><span className="chip-av">{user.fullName.charAt(0).toUpperCase()}</span>{user.fullName}</span></div>
                    </div>
                    <RecipientField label="To" tags={to} onChange={(t) => { setTo(t); setToError(''); }} excludeIds={[me, ...cc.map((p) => p.id), ...bcc.map((p) => p.id)]} error={toError}
                        right={(
                            <span className="rf-toggles">
                                {!showCc && <button type="button" onClick={() => setShowCc(true)}>Cc</button>}
                                {!showBcc && <button type="button" onClick={() => setShowBcc(true)}>Bcc</button>}
                            </span>
                        )} />
                    {showCc && <RecipientField label="Cc" tags={cc} onChange={setCc} excludeIds={[me, ...to.map((p) => p.id), ...bcc.map((p) => p.id)]} />}
                    {showBcc && <RecipientField label="Bcc" tags={bcc} onChange={setBcc} excludeIds={[me, ...to.map((p) => p.id), ...cc.map((p) => p.id)]} />}
                    <input className="cmp-subject" placeholder="Subject" value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} />
                    <textarea className="cmp-text" placeholder="Write your message…" value={body} onChange={(e) => setBody(e.target.value)} />
                    {(files.length > 0 || uploading > 0) && (
                        <ul className="cmp-files">
                            {files.map((f) => (
                                <li key={f.id}>
                                    <Icon name="file" size={16} /><a href={attachmentUrl(f.id)} target="_blank" rel="noreferrer">{f.name}</a><small>{formatSize(f.size)}</small>
                                    <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((x) => x.id !== f.id))}><Icon name="close" size={14} /></button>
                                </li>
                            ))}
                            {uploading > 0 && <li className="uploading">Uploading {uploading} file{uploading > 1 ? 's' : ''}…</li>}
                        </ul>
                    )}
                    <footer className="cmp-foot">
                        <button type="button" className="mbtn mbtn-primary" disabled={busy} onClick={send}>{save.isPending && save.variables === 'SENT' ? 'Sending…' : 'Send'}</button>
                        <button type="button" className="mbtn mbtn-outline" disabled={busy || !dirty} onClick={() => save.mutate('DRAFTS')}>
                            {save.isPending && save.variables === 'DRAFTS' ? 'Saving…' : 'Save draft'}
                        </button>
                        <input ref={fileRef} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                        <button type="button" className="icon-btn" title={`Attach files (up to ${MAX_FILES}, ${MAX_FILE_MB} MB each)`} aria-label="Attach files"
                            disabled={files.length >= MAX_FILES} onClick={() => fileRef.current.click()}><Icon name="attach" /></button>
                    </footer>
                </div>
            )}
        </section>
    );
};
export default Compose;

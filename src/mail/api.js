import { API_BASE, authHeader, tokenStore } from '../api/token';

/** An expired / invalid token anywhere sends the user back to the login page. */
const signedOut = () => {
    tokenStore.clear();
    window.location.assign('/login');
};

/** Thin fetch wrapper for /api/mail. Throws Error(message) with the server's message on failure. */
export const api = async (path, { method = 'GET', body, form } = {}) => {
    let res;
    try {
        res = await fetch(`${API_BASE}/api/mail${path}`, {
            method,
            headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...authHeader() },
            body: form || (body ? JSON.stringify(body) : undefined),
        });
    } catch {
        throw new Error('Cannot reach the server. Please try again.');
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) signedOut();
    if (!res.ok)
        throw Object.assign(new Error(data.message || 'Request failed'), { status: res.status });
    return data;
};

export const PAGE_SIZE = 25;
export const MAX_FILES = 5;
export const MAX_FILE_MB = 5;

export const fetchList = ({ folder, start, search, sort }) =>
    api(`/list?${new URLSearchParams({ folder, start, length: PAGE_SIZE, search, sort })}`);
export const fetchCount = () => api('/count');
export const fetchThread = (id, trash) => api(`/thread/${id}?trash=${trash ? 'Y' : 'N'}`);
export const fetchDraft = (id) => api(`/drafts/${id}`);
export const fetchContacts = (search) => api(`/contacts?search=${encodeURIComponent(search)}`);
export const saveMessage = (payload) => api('/messages', { method: 'POST', body: payload });
export const changeStatus = (payload) => api('/status', { method: 'POST', body: payload });
export const uploadAttachment = (file) => {
    const form = new FormData();
    form.append('file', file);
    return api('/attachments', { method: 'POST', form });
};

// Attachments need the login token, so plain links and <img src> cannot fetch them:
// download the bytes with the Authorization header, then use a temporary blob URL.
export const fetchAttachmentBlob = async (id, download = false) => {
    let res;
    try {
        res = await fetch(`${API_BASE}/api/mail/attachments/${id}${download ? '?download=1' : ''}`, { headers: authHeader() });
    } catch {
        throw new Error('Cannot reach the server. Please try again.');
    }
    if (res.status === 401) signedOut();
    if (!res.ok) throw new Error('Attachment not available');
    return res.blob();
};

const revokeLater = (url) => setTimeout(() => URL.revokeObjectURL(url), 60000);

/** Open an attachment in a new tab (images and PDFs show inline, anything else downloads). */
export const openAttachment = async (id) => {
    // Opened now, inside the click, so the pop-up blocker allows it; pointed at the file once it has downloaded.
    const win = window.open('about:blank', '_blank');
    try {
        const url = URL.createObjectURL(await fetchAttachmentBlob(id));
        if (win) win.location.href = url;
        else window.location.assign(url);
        revokeLater(url);
    } catch (err) {
        win?.close();
        throw err;
    }
};

/** Save an attachment to disk under its own file name. */
export const downloadAttachment = async (id, name) => {
    const url = URL.createObjectURL(await fetchAttachmentBlob(id, true));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    revokeLater(url);
};

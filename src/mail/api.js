/** Thin fetch wrapper for /api/mail. Throws Error(message) with the server's message on failure. */
export const api = async (path, { method = 'GET', body, form } = {}) => {
    let res;
    try {
        res = await fetch(`/api/mail${path}`, {
            method,
            credentials: 'include',
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: form || (body ? JSON.stringify(body) : undefined),
        });
    } catch {
        throw new Error('Cannot reach the server. Please try again.');
    }
    const data = await res.json().catch(() => ({}));
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
export const attachmentUrl = (id, download = false) => `/api/mail/attachments/${id}${download ? '?download=1' : ''}`;

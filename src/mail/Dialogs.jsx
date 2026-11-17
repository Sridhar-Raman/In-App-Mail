import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/**
 * confirm({ title, text, confirmText, cancelText }) → Promise<true | false | null>
 *   true = confirm button, false = secondary button (when `cancelText` is given as a real choice via `denyText`),
 *   null = dismissed. notify(message, 'success' | 'error') shows a toast.
 */
const DialogContext = createContext(null);
export const useDialogs = () => useContext(DialogContext);

export const DialogProvider = ({ children }) => {
    const [dialog, setDialog] = useState(null);
    const [toasts, setToasts] = useState([]);
    const nextId = useRef(1);

    const confirm = useCallback((options) => new Promise((resolve) => setDialog({ ...options, resolve })), []);
    const close = (value) => { dialog?.resolve(value); setDialog(null); };

    const notify = useCallback((message, type = 'success') => {
        const id = nextId.current++;
        setToasts((t) => [...t, { id, message, type }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
    }, []);

    useEffect(() => {
        if (!dialog) return undefined;
        const onKey = (e) => e.key === 'Escape' && (dialog.resolve(null), setDialog(null));
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [dialog]);

    const value = useMemo(() => ({ confirm, notify }), [confirm, notify]);
    return (
        <DialogContext.Provider value={value}>
            {children}
            {dialog && (
                <div className="dlg-backdrop" onMouseDown={() => close(null)}>
                    <div className="dlg" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" onMouseDown={(e) => e.stopPropagation()}>
                        <h3 id="dlg-title">{dialog.title}</h3>
                        {dialog.text && <p>{dialog.text}</p>}
                        <div className="dlg-actions">
                            <button type="button" className="mbtn mbtn-ghost" autoFocus={!dialog.denyText} onClick={() => close(dialog.denyText ? false : null)}>
                                {dialog.denyText || dialog.cancelText || 'No'}
                            </button>
                            <button type="button" className="mbtn mbtn-primary" autoFocus onClick={() => close(true)}>{dialog.confirmText || 'Yes'}</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="toasts" aria-live="polite">
                {toasts.map((t) => <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>)}
            </div>
        </DialogContext.Provider>
    );
};

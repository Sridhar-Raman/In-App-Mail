import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { DialogProvider } from './mail/Dialogs';
import './index.css';
import './theme.css';

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 5000 } },
});

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <DialogProvider>
                        <App />
                    </DialogProvider>
                </AuthProvider>
            </QueryClientProvider>
        </BrowserRouter>
    </StrictMode>,
);

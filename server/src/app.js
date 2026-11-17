import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import mailRoutes from './routes/mail.js';

const app = express();

// Behind Render's load balancer: trust the first proxy so req.ip (rate limits) and secure cookies are right.
if (process.env.TRUST_PROXY)
    app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

// The API is called from the website on another address (Vercel), so its responses must be readable cross-origin.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// CLIENT_ORIGIN lists the website address(es), comma-separated, e.g. https://sricr-mail.vercel.app,https://mail.sricr.com
const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
app.use(cors({ origin: origins, maxAge: 600 }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/mail', mailRoutes);

app.use('/api', (_req, res) => res.status(404).json({ message: 'Not found' }));

// Production: serve the built website (`npm run build` → ../dist) and let the React router handle every other path.
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');
const indexFile = path.join(dist, 'index.html');
if (fs.existsSync(indexFile)) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/(api|assets)(\/|$)).*/, (_req, res) => {
        res.set('Cache-Control', 'no-cache');
        res.sendFile(indexFile);
    });
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    if (err.code === 'LIMIT_FILE_SIZE')
        return res.status(413).json({ message: 'Each file can be up to 5 MB.' });
    if (err.status)
        return res.status(err.status).json({ message: err.message });
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
});

export default app;

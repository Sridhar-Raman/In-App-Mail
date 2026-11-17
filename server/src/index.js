import mongoose from 'mongoose';
import app from './app.js';

const PORT = Number(process.env.PORT) || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set. Copy server/.env.example to server/.env and set it.');
    process.exit(1);
}

try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000, dbName: process.env.MONGODB_DB || 'sricr_inapp_mail' });
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
} catch (err) {
    console.error(`Could not connect to MongoDB at ${MONGODB_URI}\n${err.message}`);
    process.exit(1);
}

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));

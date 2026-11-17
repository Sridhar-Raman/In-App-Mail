import mongoose from 'mongoose';
import User from './models/User.js';
import Mailbox from './models/Mailbox.js';
import { saveMessage } from './services/mail.js';

/** Demo account for local development only. Run with: npm run seed (from the project root).
 *  Set SEED_NAME / SEED_EMAIL / SEED_PASSWORD in server/.env to seed your own account (that file is never committed). */
export const DEMO_USER = {
    fullName: process.env.SEED_NAME || 'Demo User',
    email: process.env.SEED_EMAIL || 'demo@sricr.test',
    password: process.env.SEED_PASSWORD || 'Demo1234',
};

/** Sample colleagues so there is someone to mail. Dev only — same password for all. */
export const CONTACTS = [
    { fullName: 'Priya Raman', email: 'priya@sricr.test' },
    { fullName: 'Daniel Ortiz', email: 'daniel@sricr.test' },
    { fullName: 'Meera Nair', email: 'meera@sricr.test' },
];
export const CONTACT_PASSWORD = 'Contact123';

await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000, dbName: process.env.MONGODB_DB || 'sricr_inapp_mail' });

const upsert = async ({ fullName, email }, password) => User.findOneAndUpdate(
    { email },
    { fullName, email, passwordHash: await User.hashPassword(password) },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
);

const me = await upsert(DEMO_USER, DEMO_USER.password);
const [priya, daniel, meera] = await Promise.all(CONTACTS.map((c) => upsert(c, CONTACT_PASSWORD)));
console.log(`Users ready in "${mongoose.connection.name}": ${DEMO_USER.email}, ${CONTACTS.map((c) => c.email).join(', ')}`);

// Sample mail only into an empty mailbox, so re-running never duplicates it.
if (!(await Mailbox.exists({ user: me._id }))) {
    const first = await saveMessage(priya, {
        status: 'SENT', to: [me.id], cc: [daniel.id], subject: 'Q4 planning review',
        body: 'Hi,\n\nAttaching the revised roadmap for tomorrow\'s review. Please share feedback by end of day.\n\nThanks,\nPriya',
    });
    await saveMessage(daniel, {
        status: 'SENT', to: [priya.id, me.id], parentId: first.id, subject: 'Re: Q4 planning review',
        body: 'Can we move the review to Wednesday?',
    });
    await saveMessage(priya, {
        status: 'SENT', to: [daniel.id, me.id], parentId: first.id, subject: 'Re: Q4 planning review',
        body: 'Wednesday works for me.',
    });
    await saveMessage(meera, {
        status: 'SENT', to: [me.id], subject: 'Onboarding checklist',
        body: 'The onboarding checklist is ready. Let me know if anything is missing.',
    });
    await saveMessage(daniel, {
        status: 'SENT', to: [me.id], subject: 'Lab results ready',
        body: 'Please review before the 3 PM huddle.',
    });
    await saveMessage(me, {
        status: 'SENT', to: [meera.id], subject: 'Re: Onboarding checklist',
        body: 'Looks good, thanks Meera.',
    });
    await saveMessage(me, { status: 'DRAFTS', to: [daniel.id], subject: 'Follow-up on lab results', body: 'Hi Daniel, quick note on' });
    console.log('Sample mail added.');
}
await mongoose.disconnect();

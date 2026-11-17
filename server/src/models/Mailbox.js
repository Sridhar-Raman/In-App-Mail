import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * One user's copy of a message (the legacy "distribution" row): who it belongs to and that user's own
 * read / starred / trashed / deleted flags. List fields are denormalised so folder lists need no joins.
 */
const mailboxSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
    thread: { type: Schema.Types.ObjectId, required: true },
    role: { type: String, enum: ['sender', 'to', 'cc', 'bcc'], required: true },
    status: { type: String, enum: ['SENT', 'DRAFTS'], required: true },
    date: { type: Date, required: true },
    read: { type: Boolean, default: false },
    starred: { type: Boolean, default: false },
    trashed: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    subject: { type: String, default: '' },
    authorName: { type: String, default: '' },
    toNames: [String],
    snippet: { type: String, default: '' },
    hasAttachments: { type: Boolean, default: false },
    search: { type: String, default: '' },
});

mailboxSchema.index({ user: 1, deleted: 1, status: 1, date: -1 });
mailboxSchema.index({ user: 1, thread: 1 });
mailboxSchema.index({ message: 1 });

export default mongoose.model('Mailbox', mailboxSchema);

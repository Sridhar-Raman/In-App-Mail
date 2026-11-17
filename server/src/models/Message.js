import mongoose from 'mongoose';

const { Schema } = mongoose;

const recipientSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    cc: { type: Boolean, default: false },
    bcc: { type: Boolean, default: false },
}, { _id: false });

/** One mail (original, reply or forward). `thread` is the _id of the first message of the conversation. */
const messageSchema = new Schema({
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    thread: { type: Schema.Types.ObjectId, required: true, index: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
    type: { type: String, enum: ['ORGINL', 'REPLY', 'FORWD'], default: 'ORGINL' },
    status: { type: String, enum: ['SENT', 'DRAFTS'], required: true },
    subject: { type: String, default: '', maxlength: 200 },
    body: { type: String, default: '', maxlength: 50000 },
    recipients: [recipientSchema],
    attachments: [{ type: Schema.Types.ObjectId, ref: 'Attachment' }],
    date: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Message', messageSchema);

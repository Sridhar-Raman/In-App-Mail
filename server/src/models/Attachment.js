import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    mime: { type: String, default: 'application/octet-stream' },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true, select: false },
}, { timestamps: true });

export default mongoose.model('Attachment', attachmentSchema);

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
}, { timestamps: true });

userSchema.methods.verifyPassword = function verifyPassword(plain) {
    return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, 12);

/** Public shape returned to the client — never includes the hash. */
userSchema.methods.toPublic = function toPublic() {
    return { id: this._id.toString(), fullName: this.fullName, email: this.email };
};

export default mongoose.model('User', userSchema);

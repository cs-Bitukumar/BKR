import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
	username: { type: String, required: true, trim: true, minlength: 3, maxlength: 32 },
	email: { type: String, required: true, unique: true, trim: true, lowercase: true },
	phone: { type: String, trim: true, default: '' },
	profileImage: { type: String, trim: true, default: '' },
	password: { type: String, required: true, minlength: 8 },
	role: { type: String, enum: ['user', 'admin'], default: 'user' },
	balance: { type: Number, default: 0 },
	createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function () {
	if (!this.isModified('password')) return;
	const salt = await bcrypt.genSalt(10);
	this.password = await bcrypt.hash(this.password, salt);
	// next();
});

userSchema.methods.comparePassword = function (candidate) {
	return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;

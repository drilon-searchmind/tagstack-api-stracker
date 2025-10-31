import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from '../lib/mongoose.js';

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function (email) {
                return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
            },
            message: 'Please enter a valid email'
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username cannot exceed 30 characters']
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date,
        default: null
    },
    profileImage: {
        type: String,
        default: null
    },
    preferences: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});


userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const hashedPassword = await bcrypt.hash(this.password, 12);
        this.password = hashedPassword;
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.statics.findByEmail = async function (email) {
    await connectDB();
    return await this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.createUser = async function (userData) {
    await connectDB();
    const user = new this(userData);
    return await user.save();
};

userSchema.statics.updateLastLogin = async function (userId) {
    await connectDB();
    return await this.findByIdAndUpdate(
        userId,
        { lastLogin: new Date() },
        { new: true }
    );
};

userSchema.statics.getAllUsers = async function () {
    await connectDB();
    return await this.find({}).select('-password');
};

userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

userSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) {
        delete ret.password;
        return ret;
    }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  fullName: string;
  username: string;
  email: string;
  password?: string;
  avatar?: string;
  coverImage?: string;
  bio?: string;
  website?: string;
  location?: string;
  isVerified: boolean;
  role: 'USER' | 'ADMIN';
  refreshToken?: string;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  savedPosts: mongoose.Types.ObjectId[];
  blockedUsers: mongoose.Types.ObjectId[];
  mutedUsers: mongoose.Types.ObjectId[];
  restrictedUsers: mongoose.Types.ObjectId[];
  followersCount: number;
  followingCount: number;
  postsCount: number;
  phone?: string;
  gender?: string;
  isPrivate: boolean;
  followRequests: mongoose.Types.ObjectId[];
  preferences: {
    pushNotifications: boolean;
    emailNotifications: boolean;
    likeNotifications: boolean;
    followNotifications: boolean;
    commentNotifications: boolean;
  };
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, select: false },
    avatar: {
      type: String,
      default: '',
    },
    bio: {
      type: String, default: '' },
    website: { type: String, default: '' },
    location: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
    refreshToken: { type: String, select: false },
    emailVerificationToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    savedPosts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    mutedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    restrictedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },
    phone: { type: String, default: '' },
    gender: { type: String, default: '' },
    isPrivate: { type: Boolean, default: false },

    followRequests: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    preferences: {
      pushNotifications: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
      likeNotifications: { type: Boolean, default: true },
      followNotifications: { type: Boolean, default: true },
      commentNotifications: { type: Boolean, default: true },
    },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);

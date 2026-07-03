import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';
import { IPost } from './Post';

export interface ICollection extends Document {
  user: mongoose.Types.ObjectId | IUser;
  name: string;
  coverImage?: string;
  posts: mongoose.Types.ObjectId[] | IPost[];
  createdAt: Date;
  updatedAt: Date;
}

const collectionSchema = new Schema<ICollection>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    coverImage: { type: String },
    posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
  },
  { timestamps: true }
);

collectionSchema.index({ user: 1, name: 1 }, { unique: true });

export const Collection = mongoose.model<ICollection>('Collection', collectionSchema);

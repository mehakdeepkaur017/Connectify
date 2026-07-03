import mongoose, { Schema, Document } from 'mongoose';

export interface IHashtag extends Document {
  name: string;
  postCount: number;
  posts: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const hashtagSchema = new Schema<IHashtag>(
  {
    name: { type: String, required: true, unique: true, trim: true, lowercase: true },
    postCount: { type: Number, default: 0 },
    posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
  },
  { timestamps: true }
);
hashtagSchema.index({ postCount: -1 });

export const Hashtag = mongoose.model<IHashtag>('Hashtag', hashtagSchema);

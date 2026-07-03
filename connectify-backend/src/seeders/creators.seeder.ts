import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import { User } from '../models/User';
import { Post } from '../models/Post';
import { Story } from '../models/Story';

const creators = [
  { username: 'connectify_official', fullName: 'Connectify', bio: 'The official Connectify account. Connect, Share, Inspire.', avatar: 'https://i.pravatar.cc/150?u=connectify' },
  { username: 'naturedaily', fullName: 'Nature Daily', bio: 'Daily dose of nature and wildlife.', avatar: 'https://i.pravatar.cc/150?u=naturedaily' },
  { username: 'techverse', fullName: 'TechVerse', bio: 'Exploring the future of technology.', avatar: 'https://i.pravatar.cc/150?u=techverse' },
  { username: 'fooddiaries', fullName: 'Food Diaries', bio: 'Culinary adventures around the globe.', avatar: 'https://i.pravatar.cc/150?u=fooddiaries' },
  { username: 'campusbuzz', fullName: 'Campus Buzz', bio: 'Student life, events, and gossips.', avatar: 'https://i.pravatar.cc/150?u=campusbuzz' },
  { username: 'travelindia', fullName: 'Travel India', bio: 'Incredible India through my lens.', avatar: 'https://i.pravatar.cc/150?u=travelindia' },
  { username: 'codinglife', fullName: 'Coding Life', bio: 'Code, coffee, sleep, repeat.', avatar: 'https://i.pravatar.cc/150?u=codinglife' },
  { username: 'photographyhub', fullName: 'Photography Hub', bio: 'Capturing moments.', avatar: 'https://i.pravatar.cc/150?u=photographyhub' },
  { username: 'fitzone', fullName: 'Fit Zone', bio: 'Health and fitness tips.', avatar: 'https://i.pravatar.cc/150?u=fitzone' },
  { username: 'wanderlust', fullName: 'Wanderlust', bio: 'Not all those who wander are lost.', avatar: 'https://i.pravatar.cc/150?u=wanderlust' }
];

const postImages = [
  'https://picsum.photos/seed/1/800/800',
  'https://picsum.photos/seed/2/800/800',
  'https://picsum.photos/seed/3/800/800',
  'https://picsum.photos/seed/4/800/800',
  'https://picsum.photos/seed/5/800/800',
  'https://picsum.photos/seed/6/800/800',
];

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      console.error('MONGO_URI is not defined in the environment variables');
      process.exit(1);
    }
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedCreators = async () => {
  await connectDB();
  
  const isReset = process.argv.includes('--reset');

  try {
    const creatorUsernames = creators.map(c => c.username);

    if (isReset) {
      console.log('Resetting seeded creators...');
      const usersToDelete = await User.find({ username: { $in: creatorUsernames } });
      const userIds = usersToDelete.map(u => u._id);
      
      await Post.deleteMany({ author: { $in: userIds } });
      await Story.deleteMany({ author: { $in: userIds } });
      await User.deleteMany({ _id: { $in: userIds } });
      console.log('Reset complete.');
      process.exit(0);
    }

    console.log('Seeding creator accounts...');
    
    const createdUsers = [];
    const password = await bcrypt.hash('Creator@123', 12);

    // 1. Create Users
    for (const creator of creators) {
      let user = await User.findOne({ username: creator.username });
      if (!user) {
        user = await User.create({
          ...creator,
          email: `${creator.username}@connectify.local`,
          password,
          isPrivate: false,
          followers: [],
          following: []
        });
        console.log(`Created user: ${creator.username}`);
      } else {
        console.log(`User already exists: ${creator.username}`);
      }
      createdUsers.push(user);
    }

    // 2. Create Posts and Stories
    for (const user of createdUsers) {
      const postsCount = await Post.countDocuments({ author: user._id });
      if (postsCount < 10) {
        console.log(`Creating posts for ${user.username}...`);
        for (let i = 0; i < 15; i++) {
          await Post.create({
            author: user._id,
            images: [postImages[Math.floor(Math.random() * postImages.length)]],
            caption: `Amazing day! #${user.username} #explore #trending`,
            likes: [],
            commentsCount: 0,
            hashtags: [user.username, 'explore', 'trending'],
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000))
          });
        }
      }
      
      const storiesCount = await Story.countDocuments({ author: user._id });
      if (storiesCount === 0) {
        // Create 1 active story for some users
        if (Math.random() > 0.5) {
          await Story.create({
            author: user._id,
            mediaUrl: postImages[Math.floor(Math.random() * postImages.length)],
            mediaType: 'image',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          });
        }
      }
    }

    // 3. Cross-follow and Cross-like (Basic Engagement)
    console.log('Generating engagement...');
    const allPosts = await Post.find({ author: { $in: createdUsers.map(u => u._id) } });
    
    for (const user of createdUsers) {
      // Follow other creators
      const othersToFollow = createdUsers.filter(u => u._id.toString() !== user._id.toString());
      for (const other of othersToFollow) {
        if (!user.following.includes(other._id as any)) {
          user.following.push(other._id as any);
        }
        if (!other.followers.includes(user._id as any)) {
          other.followers.push(user._id as any);
          await other.save();
        }
      }
      await user.save();

      // Like random posts
      for (let i = 0; i < 20; i++) {
        const randomPost = allPosts[Math.floor(Math.random() * allPosts.length)];
        if (!randomPost.likes.includes(user._id as any)) {
          randomPost.likes.push(user._id as any);
          await randomPost.save();
        }
      }
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
};

seedCreators();

import mongoose from 'mongoose';
import { Message } from './src/models/Message';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log('Connected to DB');
  
  const conversationId = '6a46a9167e333a164a03a47a';
  
  const mediaMessages = await Message.find({
    conversationId,
    messageType: { $in: ['image', 'video'] }
  }).lean();
  
  console.log('Found media messages:', mediaMessages.length);
  if (mediaMessages.length > 0) {
    console.log('First one:', mediaMessages[0]);
  }
  
  mongoose.disconnect();
}

run();

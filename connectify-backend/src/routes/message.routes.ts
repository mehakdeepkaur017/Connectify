import { Router } from 'express';
import { authenticate as protect } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/upload.middleware';
import {
  getConversations,
  getConversationMessages,
  createConversation,
  sendMessage,
  editMessage,
  deleteMessage,
  markSeen,
  reactToMessage,
  deleteConversation,
  clearChat,
  muteConversation,
  searchMessages,
  getConversationMedia,
  forwardMessage,
  acceptMessageRequest
} from '../controllers/message.controller';

const router = Router();

router.use(protect);

router.route('/conversations')
  .get(getConversations)
  .post(createConversation);

router.route('/conversations/:conversationId/seen')
  .patch(markSeen);

router.route('/conversations/:conversationId/search')
  .get(searchMessages);

router.route('/conversations/:conversationId/media')
  .get(getConversationMedia);

router.route('/conversations/:conversationId/clear')
  .post(clearChat);

router.route('/conversations/:conversationId/mute')
  .post(muteConversation);

router.route('/conversations/:conversationId/accept')
  .post(acceptMessageRequest);

router.route('/conversations/:conversationId')
  .get(getConversationMessages)
  .delete(deleteConversation);

// Note: For sendMessage we upload up to 10 images
router.route('/conversations/:conversationId/messages')
  .post(upload.array('images', 10), sendMessage);

router.route('/:id')
  .patch(editMessage)
  .delete(deleteMessage);

router.route('/:id/react')
  .post(reactToMessage);

router.route('/:id/forward')
  .post(forwardMessage);

export default router;

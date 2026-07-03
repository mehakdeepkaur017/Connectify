import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { 
  getNotifications,
  markNotificationsRead,
  deleteNotification
} from '../controllers/notification.controller';

const router = Router();

router.use(authenticate);

router.route('/')
  .get(getNotifications)
  .patch(markNotificationsRead);

router.route('/:id')
  .delete(deleteNotification);

export default router;

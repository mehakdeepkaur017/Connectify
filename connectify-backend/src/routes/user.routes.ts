import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/upload.middleware';
import {
  getMe,
  updateMe,
  getUserByUsername,
  followUser,
  unfollowUser,
  acceptFollowRequest,
  rejectFollowRequest,
  removeFollower,
  getUserFollowers,
  getUserFollowing,
  getUserPosts,
  getUserTaggedPosts,
  getSavedPosts,
  searchUsers,
  checkUsername,
  toggleBlockUser,
  toggleRestrictUser,
  toggleMuteUser,
  getBlockedUsers,
  getRestrictedUsers,
  getMutedUsers,
  deleteAccount,
  getArchivedPosts,
  getArchivedStories,
  getSuggestedUsers,
} from '../controllers/user.controller';

const router = Router();

// Protect all user routes
router.use(authenticate);

router.get('/me', getMe);
router.patch(
  '/me',
  upload.single('avatar'),
  updateMe
);
router.get('/me/suggested', getSuggestedUsers);
router.get('/me/saved', getSavedPosts);
router.get('/check-username', checkUsername);
router.delete('/me', deleteAccount);

router.get('/search', searchUsers);

// Settings list pages
router.get('/settings/blocked', getBlockedUsers);
router.get('/settings/restricted', getRestrictedUsers);
router.get('/settings/muted', getMutedUsers);
router.get('/me/archived-posts', getArchivedPosts);
router.get('/me/archived-stories', getArchivedStories);

router.get('/:username', getUserByUsername);

router.post('/:id/follow', followUser);
router.post('/:id/unfollow', unfollowUser);
router.post('/:id/accept', acceptFollowRequest);
router.post('/:id/reject', rejectFollowRequest);
router.post('/:id/remove-follower', removeFollower);

router.post('/:id/block', toggleBlockUser);
router.post('/:id/restrict', toggleRestrictUser);
router.post('/:id/mute', toggleMuteUser);

router.get('/:id/followers', getUserFollowers);
router.get('/:id/following', getUserFollowing);
router.get('/:id/posts', getUserPosts);
router.get('/:id/tagged', getUserTaggedPosts);

export default router;

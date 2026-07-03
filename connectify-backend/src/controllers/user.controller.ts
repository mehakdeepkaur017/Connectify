import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Post } from '../models/Post';
import { Story } from '../models/Story';
import { Notification } from '../models/Notification';
import { AppError } from '../utils/AppError';
import { ApiResponse } from '../utils/ApiResponse';
import { createNotification } from '../services/notification.service';
import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation';
import { uploadToCloudinary } from '../config/cloudinary';

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?._id)
      .populate('followers following', 'username fullName avatar')
      .populate('followRequests', 'username fullName avatar');
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    res.status(200).json(new ApiResponse(true, 'User profile fetched successfully', user));
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fullName, username, bio, website, location, phone, gender, isPrivate } = req.body;

    const updateData: any = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (username !== undefined) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;
    if (website !== undefined) updateData.website = website;
    if (location !== undefined) updateData.location = location;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (isPrivate !== undefined) {
      updateData.isPrivate = typeof isPrivate === 'string' ? isPrivate === 'true' : isPrivate;
    }
    if (req.body.preferences) {
      updateData.preferences = req.body.preferences;
    }

    // Handle uploaded files
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'connectify/profiles');
      updateData.avatar = uploadResult.secure_url;
    }

    // Validate username uniqueness if it is changing
    if (username && username.toLowerCase() !== req.user?.username?.toLowerCase()) {
      const existingUser = await User.findOne({ username: username.toLowerCase().trim() });
      if (existingUser) {
        return next(new AppError('Username is already taken', 400));
      }
    }

    const updatedUser = await User.findByIdAndUpdate(req.user?._id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return next(new AppError('User not found', 404));
    }

    // Instagram behaviour: switching from private to public auto-accepts all pending requests
    if (updateData.isPrivate === false && updatedUser.followRequests.length > 0) {
      const pendingRequestIds = [...updatedUser.followRequests];
      
      // Add all requesters as followers and update their following
      await Promise.all(pendingRequestIds.map(async (requesterId) => {
        await User.findByIdAndUpdate(requesterId, {
          $addToSet: { following: updatedUser._id },
          $inc: { followingCount: 1 }
        });
      }));

      // Add all requesters to current user's followers and clear requests
      await User.findByIdAndUpdate(updatedUser._id, {
        $addToSet: { followers: { $each: pendingRequestIds } },
        $inc: { followersCount: pendingRequestIds.length },
        $set: { followRequests: [] }
      });

      // Emit socket events to all accepted users
      const { getSocketService } = await import('../services/socket.service');
      const socketService = getSocketService();
      if (socketService) {
        pendingRequestIds.forEach((requesterId) => {
          socketService.emitToUser(requesterId.toString(), 'followRequestAccepted', {
            userId: updatedUser._id.toString()
          });
        });
      }
    }

    // Re-fetch the user to get updated data after potential auto-accept
    const freshUser = await User.findById(req.user?._id)
      .populate('followers following', 'username fullName avatar')
      .populate('followRequests', 'username fullName avatar');

    res.status(200).json(new ApiResponse(true, 'Profile updated successfully', freshUser));
  } catch (error) {
    next(error);
  }
};

export const getSuggestedUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = await User.findById(req.user?._id);
    if (!currentUser) return next(new AppError('User not found', 404));

    // Exclude self and already following
    const excludedIds = [...currentUser.following, currentUser._id];

    const suggestedUsers = await User.find({
      _id: { $nin: excludedIds },
      isPrivate: false // Only suggest public accounts
    })
      .limit(10)
      .select('username fullName avatar bio followers')
      .lean();

    // Sort in code by followers length
    suggestedUsers.sort((a, b) => b.followers.length - a.followers.length);

    res.status(200).json(new ApiResponse(true, 'Suggested users retrieved', suggestedUsers));
  } catch (error) {
    next(error);
  }
};

export const checkUsername = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const username = req.query.username as string;
    if (!username) {
      return res.status(400).json(new ApiResponse(false, 'Username is required'));
    }
    const searchUsername = username.toLowerCase().trim();
    const existingUser = await User.findOne({ username: searchUsername });
    const isAvailable = !existingUser || existingUser._id.toString() === req.user?._id?.toString();
    res.status(200).json(new ApiResponse(true, 'Checked', { available: isAvailable }));
  } catch (error) {
    next(error);
  }
};

export const getUserByUsername = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username } = req.params;
    const searchUsername = (username as string).toLowerCase().trim();
    const user = await User.findOne({ username: searchUsername }).populate('followers following', 'username fullName avatar');
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const currentUserId = req.user?._id?.toString();

    // Prevent access if current user is blocked by target user
    if (currentUserId && user.blockedUsers?.includes(currentUserId as any)) {
      return next(new AppError('User not found', 404));
    }

    const isRequested = currentUserId ? user.followRequests?.some((id: any) => id.toString() === currentUserId) : false;

    // Convert to plain object so we can add properties
    const userObj = user.toObject();
    (userObj as any).isRequested = isRequested;

    res.status(200).json(new ApiResponse(true, 'User fetched successfully', userObj));
  } catch (error) {
    next(error);
  }
};

export const followUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user!._id;

    if (targetUserId === currentUserId.toString()) {
      return next(new AppError('You cannot follow yourself', 400));
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return next(new AppError('User to follow not found', 404));
    }

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return next(new AppError('Current user not found', 404));
    }

    // Prevent blocked users from interacting
    if (targetUser.blockedUsers.includes(currentUserId as any) || currentUser.blockedUsers.includes(targetUser._id as any)) {
      return next(new AppError('Action not allowed', 403));
    }

    // Prevent duplicate follow
    if (currentUser.following.includes(targetUser._id as any)) {
      return next(new AppError('You are already following this user', 400));
    }

    if (targetUser.isPrivate) {
      // Check if it's already requested, then it's a cancellation
      if (targetUser.followRequests.includes(currentUser._id as any)) {
        await User.findByIdAndUpdate(targetUserId, {
          $pull: { followRequests: currentUser._id }
        });
        const { getSocketService } = await import('../services/socket.service');
        const socketService = getSocketService();
        if (socketService) {
          socketService.emitToUser(targetUserId.toString(), 'requestCancelled', { userId: currentUserId.toString() });
        }
        return res.status(200).json(new ApiResponse(true, 'Follow request cancelled', { status: 'follow' }));
      }

      await User.findByIdAndUpdate(targetUserId, {
        $addToSet: { followRequests: currentUser._id }
      });

      await createNotification({
        recipient: targetUserId.toString(),
        sender: currentUserId.toString(),
        type: 'follow_request'
      });

      const { getSocketService } = await import('../services/socket.service');
      const socketService = getSocketService();
      if (socketService) {
        socketService.emitToUser(targetUserId.toString(), 'followRequestReceived', {
          user: { _id: currentUser._id, username: currentUser.username, avatar: currentUser.avatar, fullName: currentUser.fullName }
        });
      }

      return res.status(200).json(new ApiResponse(true, 'Follow request sent', { status: 'requested' }));
    }

    // Use atomic operators to update both users
    await Promise.all([
      User.findByIdAndUpdate(currentUserId, {
        $addToSet: { following: targetUser._id },
        $inc: { followingCount: 1 }
      }),
      User.findByIdAndUpdate(targetUserId, {
        $addToSet: { followers: currentUser._id },
        $inc: { followersCount: 1 }
      })
    ]);

    // Send notification
    if (currentUserId) {
      await createNotification({
        recipient: targetUserId.toString(),
        sender: currentUserId.toString(),
        type: 'follow'
      });
    }

    res.status(200).json(new ApiResponse(true, 'User followed successfully', { status: 'following' }));
  } catch (error) {
    next(error);
  }
};

export const unfollowUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?._id;

    if (!currentUserId) return next(new AppError('Unauthorized', 401));

    if (id === currentUserId.toString()) {
      return next(new AppError('You cannot unfollow yourself', 400));
    }

    const userToUnfollow = await User.findById(id);
    const currentUser = await User.findById(currentUserId);

    if (!userToUnfollow || !currentUser) {
      return next(new AppError('User not found', 404));
    }

    // Check if they are just cancelling a request
    if (userToUnfollow.followRequests.includes(currentUserId as any)) {
      userToUnfollow.followRequests = userToUnfollow.followRequests.filter(uid => uid.toString() !== currentUserId.toString());
      await userToUnfollow.save();

      // Clean up the follow_request notification
      await Notification.deleteMany({
        recipient: id,
        sender: currentUserId,
        type: 'follow_request'
      });

      const { getSocketService } = await import('../services/socket.service');
      const socketService = getSocketService();
      if (socketService) {
        socketService.emitToUser(id as string, 'requestCancelled', { userId: currentUserId.toString() });
      }

      return res.status(200).json(new ApiResponse(true, 'Follow request cancelled', { status: 'follow' }));
    }

    if (!currentUser.following.includes(id as any)) {
      return next(new AppError('You are not following this user', 400));
    }

    // Remove from following array
    currentUser.following = currentUser.following.filter(
      (userId) => userId.toString() !== id
    );
    currentUser.followingCount -= 1;

    // Remove from followers array
    userToUnfollow.followers = userToUnfollow.followers.filter(
      (userId) => userId.toString() !== currentUserId.toString()
    );
    userToUnfollow.followersCount -= 1;

    await Promise.all([currentUser.save(), userToUnfollow.save()]);

    // Clean up the follow notification if they unfollow
    await Notification.deleteMany({
      recipient: id,
      sender: currentUserId,
      type: 'follow'
    });

    res.status(200).json(new ApiResponse(true, 'User unfollowed successfully'));
  } catch (error) {
    next(error);
  }
};

export const acceptFollowRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!._id;

    const currentUser = await User.findById(currentUserId);
    const requestingUser = await User.findById(id);

    if (!currentUser || !requestingUser) return next(new AppError('User not found', 404));

    if (!currentUser.followRequests.includes(id as any)) {
      // If no follow request is found, it was already processed.
      // Clean up any stale notifications and return success to update the UI.
      await Notification.deleteMany({
        recipient: currentUserId,
        sender: id,
        type: 'follow_request'
      });
      return res.status(200).json(new ApiResponse(true, 'Follow request was already processed'));
    }

    // Remove request and add to followers
    currentUser.followRequests = currentUser.followRequests.filter(uid => uid.toString() !== id);
    currentUser.followers.push(id as any);
    currentUser.followersCount += 1;

    requestingUser.following.push(currentUserId as any);
    requestingUser.followingCount += 1;

    await Promise.all([currentUser.save(), requestingUser.save()]);

    await createNotification({
      recipient: id as string,
      sender: currentUserId.toString(),
      type: 'follow_accept' // notifying them we accepted their request
    });

    // Transform the follow request notification into a follow notification
    await Notification.updateMany({
      recipient: currentUserId,
      sender: id,
      type: 'follow_request'
    }, {
      $set: { type: 'follow' }
    });

    const { getSocketService } = await import('../services/socket.service');
    const socketService = getSocketService();
    if (socketService) {
      socketService.emitToUser(currentUserId.toString(), 'followRequestAccepted', { userId: id });
      socketService.emitToUser(id as string, 'followRequestAccepted', { userId: currentUserId.toString() });
    }

    res.status(200).json(new ApiResponse(true, 'Follow request accepted'));
  } catch (error) {
    next(error);
  }
};

export const rejectFollowRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?._id;

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) return next(new AppError('User not found', 404));

    if (!currentUser.followRequests.includes(id as any)) {
      // If no follow request is found, it was already processed.
      await Notification.deleteMany({
        recipient: currentUserId,
        sender: id,
        type: 'follow_request'
      });
      return res.status(200).json(new ApiResponse(true, 'Follow request was already processed'));
    }

    currentUser.followRequests = currentUser.followRequests.filter(uid => uid.toString() !== id);
    await currentUser.save();

    // Delete the follow request notification
    await Notification.deleteMany({
      recipient: currentUserId,
      sender: id,
      type: 'follow_request'
    });

    const { getSocketService } = await import('../services/socket.service');
    const socketService = getSocketService();
    if (socketService) {
      socketService.emitToUser(currentUserId!.toString(), 'followRequestDeleted', { userId: id });
    }

    res.status(200).json(new ApiResponse(true, 'Follow request rejected'));
  } catch (error) {
    next(error);
  }
};

export const removeFollower = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?._id;

    const currentUser = await User.findById(currentUserId);
    const followerUser = await User.findById(id);

    if (!currentUser || !followerUser) return next(new AppError('User not found', 404));

    if (!currentUser.followers.includes(id as any)) {
      return next(new AppError('This user is not following you', 400));
    }

    currentUser.followers = currentUser.followers.filter(uid => uid.toString() !== id);
    currentUser.followersCount -= 1;

    followerUser.following = followerUser.following.filter(uid => uid.toString() !== currentUserId?.toString());
    followerUser.followingCount -= 1;

    await Promise.all([currentUser.save(), followerUser.save()]);

    const { getSocketService } = await import('../services/socket.service');
    const socketService = getSocketService();
    if (socketService) {
      socketService.emitToUser(id as string, 'followRemoved', { userId: currentUserId!.toString() });
    }

    res.status(200).json(new ApiResponse(true, 'Follower removed'));
  } catch (error) {
    next(error);
  }
};

export const toggleBlockUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?._id;
    if (!currentUserId) return next(new AppError('Unauthorized', 401));
    if (id === currentUserId.toString()) return next(new AppError('Cannot block yourself', 400));

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) return next(new AppError('User not found', 404));

    const isBlocked = currentUser.blockedUsers.includes(id as any);
    if (isBlocked) {
      currentUser.blockedUsers = currentUser.blockedUsers.filter(uid => uid.toString() !== id);
    } else {
      currentUser.blockedUsers.push(id as any);
      // Also automatically unfollow both ways and clear follow requests
      currentUser.following = currentUser.following.filter(uid => uid.toString() !== id);
      currentUser.followers = currentUser.followers.filter(uid => uid.toString() !== id);
      currentUser.followRequests = currentUser.followRequests.filter(uid => uid.toString() !== id);
    }
    
    // Recalculate counts
    currentUser.followingCount = currentUser.following.length;
    currentUser.followersCount = currentUser.followers.length;
    await currentUser.save();
    
    // Unfollow from the other user's side if blocking
    if (!isBlocked) {
      const otherUser = await User.findById(id);
      if (otherUser) {
        otherUser.following = otherUser.following.filter(uid => uid.toString() !== currentUserId.toString());
        otherUser.followers = otherUser.followers.filter(uid => uid.toString() !== currentUserId.toString());
        otherUser.followRequests = otherUser.followRequests.filter(uid => uid.toString() !== currentUserId.toString());
        otherUser.followingCount = otherUser.following.length;
        otherUser.followersCount = otherUser.followers.length;
        await otherUser.save();
      }
    }

    res.status(200).json(new ApiResponse(true, isBlocked ? 'User unblocked' : 'User blocked'));
  } catch (error) {
    next(error);
  }
};

export const toggleRestrictUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?._id;
    if (!currentUserId) return next(new AppError('Unauthorized', 401));

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) return next(new AppError('User not found', 404));

    const isRestricted = currentUser.restrictedUsers.includes(id as any);
    const targetObjectId = new mongoose.Types.ObjectId(id as string);

    if (isRestricted) {
      currentUser.restrictedUsers = currentUser.restrictedUsers.filter(uid => uid.toString() !== id);
      
      // If unrestricted, move conversation back to primary inbox
      await Conversation.findOneAndUpdate(
        { participants: { $all: [currentUserId, targetObjectId] } },
        { $pull: { isRequestFor: currentUserId } }
      );
    } else {
      currentUser.restrictedUsers.push(id as any);
      
      // If restricted, move conversation to message requests
      await Conversation.findOneAndUpdate(
        { participants: { $all: [currentUserId, targetObjectId] } },
        { $addToSet: { isRequestFor: currentUserId } }
      );
    }
    await currentUser.save();

    res.status(200).json(new ApiResponse(true, isRestricted ? 'User unrestricted' : 'User restricted'));
  } catch (error) {
    next(error);
  }
};

export const toggleMuteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?._id;
    if (!currentUserId) return next(new AppError('Unauthorized', 401));

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) return next(new AppError('User not found', 404));

    const isMuted = currentUser.mutedUsers.includes(id as any);
    if (isMuted) {
      currentUser.mutedUsers = currentUser.mutedUsers.filter(uid => uid.toString() !== id);
    } else {
      currentUser.mutedUsers.push(id as any);
    }
    await currentUser.save();

    res.status(200).json(new ApiResponse(true, isMuted ? 'User unmuted' : 'User muted'));
  } catch (error) {
    next(error);
  }
};

export const getUserFollowers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id).populate('followers', 'username fullName avatar bio');
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    const currentUserId = req.user?._id?.toString();

    // Check block logic
    if (currentUserId) {
      if (user.blockedUsers?.includes(currentUserId as any)) {
        return next(new AppError('User not found', 404));
      }
      const currentUser = await User.findById(currentUserId);
      if (currentUser?.blockedUsers?.includes(user._id as any)) {
        return res.status(200).json(new ApiResponse(true, 'Followers fetched successfully', []));
      }
    }

    if (user.isPrivate && user._id.toString() !== currentUserId) {
      if (!currentUserId || !user.followers.some((f: any) => f._id.toString() === currentUserId)) {
        return next(new AppError('This account is private', 403));
      }
    }
    res.status(200).json(new ApiResponse(true, 'Followers fetched successfully', user.followers));
  } catch (error) {
    next(error);
  }
};

export const getUserFollowing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id).populate('following', 'username fullName avatar bio');
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    const currentUserId = req.user?._id?.toString();

    // Check block logic
    if (currentUserId) {
      if (user.blockedUsers?.includes(currentUserId as any)) {
        return next(new AppError('User not found', 404));
      }
      const currentUser = await User.findById(currentUserId);
      if (currentUser?.blockedUsers?.includes(user._id as any)) {
        return res.status(200).json(new ApiResponse(true, 'Following fetched successfully', []));
      }
    }

    if (user.isPrivate && user._id.toString() !== currentUserId) {
      if (!currentUserId || !user.followers.some((f: any) => f._id.toString() === currentUserId)) {
        return next(new AppError('This account is private', 403));
      }
    }
    res.status(200).json(new ApiResponse(true, 'Following fetched successfully', user.following));
  } catch (error) {
    next(error);
  }
};

export const getUserPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return next(new AppError('User not found', 404));

    const currentUserId = req.user?._id?.toString();

    // Check block logic
    if (currentUserId) {
      if (targetUser.blockedUsers?.includes(currentUserId as any)) {
        return next(new AppError('User not found', 404));
      }
      const currentUser = await User.findById(currentUserId);
      if (currentUser?.blockedUsers?.includes(targetUser._id as any)) {
        return res.status(200).json(new ApiResponse(true, 'User posts fetched successfully', { posts: [] }));
      }
    }

    // Check privacy
    if (targetUser.isPrivate && targetUser._id.toString() !== currentUserId) {
      if (!currentUserId || !targetUser.followers.includes(currentUserId as any)) {
        return res.status(200).json(new ApiResponse(true, 'User posts fetched successfully', { posts: [] }));
      }
    }

    const posts = await (Post.find({ author: req.params.id, isArchived: { $ne: true } }) as any)
      .populate('author', 'username fullName avatar')
      .populate({ path: 'taggedUsers', select: 'username fullName avatar' })
      .populate({ path: 'mentions.user', select: 'username fullName avatar' })
      .sort({ createdAt: -1 })
      .lean();
    
    const postsWithMeta = posts.map((post: any) => {
      return {
        ...post,
        isLiked: currentUserId ? post.likes.some((id: any) => id.toString() === currentUserId) : false,
        isSaved: currentUserId ? post.savedBy.some((id: any) => id.toString() === currentUserId) : false,
        likesCount: post.likes.length,
      };
    });

    res.status(200).json(new ApiResponse(true, 'User posts fetched successfully', { posts: postsWithMeta }));
  } catch (error) {
    next(error);
  }
};

export const getUserTaggedPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return next(new AppError('User not found', 404));

    const currentUserId = req.user?._id?.toString();

    // Check block logic
    if (currentUserId) {
      if (targetUser.blockedUsers?.includes(currentUserId as any)) {
        return next(new AppError('User not found', 404));
      }
      const currentUser = await User.findById(currentUserId);
      if (currentUser?.blockedUsers?.includes(targetUser._id as any)) {
        return res.status(200).json(new ApiResponse(true, 'User tagged posts fetched successfully', { posts: [] }));
      }
    }

    // Check privacy
    if (targetUser.isPrivate && targetUser._id.toString() !== currentUserId) {
      if (!currentUserId || !targetUser.followers.includes(currentUserId as any)) {
        return res.status(200).json(new ApiResponse(true, 'User tagged posts fetched successfully', { posts: [] }));
      }
    }

    const posts = await (Post.find({ taggedUsers: req.params.id as any, isArchived: { $ne: true } }) as any)
      .populate('author', 'username fullName avatar')
      .populate({ path: 'taggedUsers', select: 'username fullName avatar' })
      .populate({ path: 'mentions.user', select: 'username fullName avatar' })
      .sort({ createdAt: -1 })
      .lean();
    
    const postsWithMeta = posts.map((post: any) => {
      return {
        ...post,
        isLiked: currentUserId ? post.likes.some((id: any) => id.toString() === currentUserId) : false,
        isSaved: currentUserId ? post.savedBy.some((id: any) => id.toString() === currentUserId) : false,
        likesCount: post.likes.length,
      };
    });

    res.status(200).json(new ApiResponse(true, 'User tagged posts fetched successfully', { posts: postsWithMeta }));
  } catch (error) {
    next(error);
  }
};

export const getSavedPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const posts = await (Post.find({ savedBy: req.user?._id }) as any)
      .populate('author', 'username fullName avatar')
      .populate({ path: 'taggedUsers', select: 'username fullName avatar' })
      .populate({ path: 'mentions.user', select: 'username fullName avatar' })
      .sort({ createdAt: -1 })
      .lean();

    const currentUserId = req.user?._id?.toString();

    const postsWithMeta = posts.map((post: any) => {
      return {
        ...post,
        isLiked: currentUserId ? post.likes.some((id: any) => id.toString() === currentUserId) : false,
        isSaved: currentUserId ? post.savedBy.some((id: any) => id.toString() === currentUserId) : false,
        likesCount: post.likes.length,
      };
    });

    res.status(200).json(new ApiResponse(true, 'Saved posts fetched successfully', { posts: postsWithMeta }));
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(200).json(new ApiResponse(true, 'No query provided', []));
    }

    const regex = new RegExp(q, 'i'); // Case-insensitive search
    
    // 1. Search Users
    const users = await User.find({
      $or: [{ username: regex }, { fullName: regex }, { bio: regex }]
    })
      .select('username fullName avatar bio isVerified')
      .limit(10)
      .lean();

    // 2. Search Hashtags
    const { Hashtag } = await import('../models/Hashtag');
    const hashtags = await Hashtag.find({ name: regex })
      .select('name postCount')
      .sort({ postCount: -1 })
      .limit(10)
      .lean();

    // 3. Search Places
    const { Post } = await import('../models/Post');
    const postsWithLocation = await Post.aggregate([
      { $match: { location: regex, isArchived: { $ne: true } } },
      { $group: { _id: '$location', postCount: { $sum: 1 } } },
      { $sort: { postCount: -1 } },
      { $limit: 10 }
    ]);
    const places = postsWithLocation.map(p => ({ name: p._id, postCount: p.postCount }));

    res.status(200).json(new ApiResponse(true, 'Search successful', {
      users,
      hashtags,
      places
    }));
  } catch (error) {
    next(error);
  }
};

export const blockUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = req.params.id;
    await User.findByIdAndUpdate(req.user?._id, {
      $addToSet: { blockedUsers: targetId },
      $pull: { following: targetId, followers: targetId }
    });
    // Also remove mutual follows for the other user
    await User.findByIdAndUpdate(targetId, {
      $pull: { following: req.user?._id, followers: req.user?._id }
    });
    res.status(200).json(new ApiResponse(true, 'User blocked successfully'));
  } catch (error) {
    next(error);
  }
};

export const unblockUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = req.params.id;
    await User.findByIdAndUpdate(req.user?._id, {
      $pull: { blockedUsers: targetId }
    });
    res.status(200).json(new ApiResponse(true, 'User unblocked successfully'));
  } catch (error) {
    next(error);
  }
};

export const getBlockedUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?._id).populate('blockedUsers', 'username fullName avatar isVerified');
    res.status(200).json(new ApiResponse(true, 'Blocked users fetched', user?.blockedUsers || []));
  } catch (error) {
    next(error);
  }
};

export const restrictUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await User.findByIdAndUpdate(req.user?._id, { $addToSet: { restrictedUsers: req.params.id } });
    res.status(200).json(new ApiResponse(true, 'User restricted successfully'));
  } catch (error) {
    next(error);
  }
};

export const unrestrictUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await User.findByIdAndUpdate(req.user?._id, { $pull: { restrictedUsers: req.params.id } });
    res.status(200).json(new ApiResponse(true, 'User unrestricted successfully'));
  } catch (error) {
    next(error);
  }
};

export const getRestrictedUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?._id).populate('restrictedUsers', 'username fullName avatar isVerified');
    res.status(200).json(new ApiResponse(true, 'Restricted users fetched', user?.restrictedUsers || []));
  } catch (error) {
    next(error);
  }
};

export const muteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await User.findByIdAndUpdate(req.user?._id, { $addToSet: { mutedUsers: req.params.id } });
    res.status(200).json(new ApiResponse(true, 'User muted successfully'));
  } catch (error) {
    next(error);
  }
};

export const unmuteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await User.findByIdAndUpdate(req.user?._id, { $pull: { mutedUsers: req.params.id } });
    res.status(200).json(new ApiResponse(true, 'User unmuted successfully'));
  } catch (error) {
    next(error);
  }
};

export const getMutedUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?._id).populate('mutedUsers', 'username fullName avatar isVerified');
    res.status(200).json(new ApiResponse(true, 'Muted users fetched', user?.mutedUsers || []));
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    if (!userId) return next(new AppError('Unauthorized', 401));

    // Get models to avoid circular dependencies if any
    const { Post } = await import('../models/Post');
    const { Comment } = await import('../models/Comment');
    const { Story } = await import('../models/Story');
    const { Notification } = await import('../models/Notification');
    const { Conversation } = await import('../models/Conversation');
    const { Message } = await import('../models/Message');

    // 1. Delete all user posts (this won't trigger pre-remove hooks for comments automatically if we use deleteMany, 
    // but we will delete comments separately below anyway).
    await Post.deleteMany({ author: userId });

    // 2. Delete all user comments
    await Comment.deleteMany({ user: userId });

    // 3. Delete all user stories
    await Story.deleteMany({ user: userId });

    // 4. Delete notifications sent to or from the user
    await Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] });

    // 5. Messages & Conversations
    // We can just remove messages sent by the user, or remove the user from conversations.
    // For a true "Instagram clone", when a user deletes their account, their messages might remain as "Instagrammer", 
    // but the prompt explicitly said: "Cascade delete ALL user data: posts, comments, stories, likes, notifications, conversations, messages, follow relationships."
    await Message.deleteMany({ sender: userId });
    
    // For conversations, delete conversations where user is the ONLY participant, 
    // or simply delete all conversations involving the user to fully wipe them.
    await Conversation.deleteMany({ participants: userId });

    // 6. Follow relationships & Arrays
    // Remove the user from other users' followers, following, blocked, restricted, muted, followRequests
    await User.updateMany(
      {},
      {
        $pull: {
          followers: userId,
          following: userId,
          blockedUsers: userId,
          restrictedUsers: userId,
          mutedUsers: userId,
          followRequests: userId
        }
      }
    );

    // 7. Remove likes and saves from posts
    await Post.updateMany({}, { $pull: { likes: userId, savedBy: userId } });

    // 8. Remove likes from comments
    await Comment.updateMany({}, { $pull: { likes: userId } });
    
    // 9. Remove viewers from stories
    await Story.updateMany({}, { $pull: { viewers: userId } });

    // Finally, delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json(new ApiResponse(true, 'Account deleted successfully'));
  } catch (error) {
    next(error);
  }
};

export const getArchivedPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user?._id;
    if (!currentUserId) return next(new AppError('Unauthorized', 401));

    const posts = await (Post.find({ author: currentUserId, isArchived: true }) as any)
      .populate('author', 'username fullName avatar')
      .populate({ path: 'taggedUsers', select: 'username fullName avatar' })
      .populate({ path: 'mentions.user', select: 'username fullName avatar' })
      .sort({ createdAt: -1 })
      .lean();
    
    const postsWithMeta = posts.map((post: any) => {
      return {
        ...post,
        likesCount: post.likes?.length || 0,
        commentsCount: post.comments?.length || 0,
        isLiked: post.likes?.some((l: any) => l.toString() === currentUserId.toString()) || false,
        isSaved: post.savedBy?.some((s: any) => s.toString() === currentUserId.toString()) || false,
      };
    });

    res.status(200).json(new ApiResponse(true, 'Archived posts fetched successfully', { posts: postsWithMeta }));
  } catch (error) {
    next(error);
  }
};

export const getArchivedStories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUserId = req.user?._id;
    if (!currentUserId) return next(new AppError('Unauthorized', 401));

    const stories = await (Story.find({
      author: currentUserId,
      $or: [
        { isArchived: true },
        { expiresAt: { $lt: new Date() } }
      ]
    }) as any)
      .populate('author', 'username fullName avatar')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(new ApiResponse(true, 'Archived stories fetched successfully', stories));
  } catch (error) {
    next(error);
  }
};

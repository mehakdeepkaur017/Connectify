import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getUserByUsername, 
  updateMe, 
  followUser, 
  unfollowUser, 
  getUserPosts, 
  getSavedPosts, 
  getUserFollowers, 
  getUserFollowing,
  searchUsers,
  acceptFollowRequest,
  rejectFollowRequest,
  getUserTaggedPosts,
  removeFollower
} from '@/lib/api/users.api';
import { toast } from 'sonner';

export const useSearchUsers = (query: string) => {
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: () => searchUsers(query),
    enabled: query.length > 1,
  });
};

export const useProfile = (username: string) => {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: () => getUserByUsername(username),
    retry: 1,
  });
};

export const useProfilePosts = (userId: string) => {
  return useQuery({
    queryKey: ['posts', 'user', userId],
    queryFn: () => getUserPosts(userId),
    enabled: !!userId,
  });
};

export const useSavedPosts = () => {
  return useQuery({
    queryKey: ['posts', 'saved'],
    queryFn: () => getSavedPosts(),
  });
};

export const useTaggedPosts = (userId: string) => {
  return useQuery({
    queryKey: ['posts', 'tagged', userId],
    queryFn: () => getUserTaggedPosts(userId),
    enabled: !!userId,
  });
};

export const useFollowers = (userId: string) => {
  return useQuery({
    queryKey: ['followers', userId],
    queryFn: () => getUserFollowers(userId),
    enabled: !!userId,
  });
};

export const useFollowing = (userId: string) => {
  return useQuery({
    queryKey: ['following', userId],
    queryFn: () => getUserFollowing(userId),
    enabled: !!userId,
  });
};

export const useUpdateProfile = (onSuccessCallback?: (data: unknown) => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => updateMe(data),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['me'], updatedUser);
      // Aggressive cache invalidation for avatar sync
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      
      if (onSuccessCallback) {
        onSuccessCallback(updatedUser);
      }
      
      toast.success('Profile updated successfully');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    },
  });
};

export const useFollowMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => followUser(userId),
    onSuccess: (response, userId) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['followers', userId] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      const status = response?.data?.status;
      if (status === 'requested') {
        toast.success('Follow request sent');
      } else if (status === 'follow') {
        toast.success('Follow request cancelled');
      } else {
        toast.success('Followed successfully');
      }
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Failed to follow user');
    }
  });
};

export const useUnfollowMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => unfollowUser(userId),
    onSuccess: (response, userId) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['followers', userId] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      const status = response?.data?.status;
      if (status === 'follow') {
        toast.success('Follow request cancelled');
      } else {
        toast.success('Unfollowed successfully');
      }
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Failed to unfollow user');
    }
  });
};

export const useAcceptFollowRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => acceptFollowRequest(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Failed to accept request');
    }
  });
};

export const useRejectFollowRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => rejectFollowRequest(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Failed to reject request');
    }
  });
};

export const useRemoveFollowerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeFollower(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      toast.success('Follower removed');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Failed to remove follower');
    }
  });
};


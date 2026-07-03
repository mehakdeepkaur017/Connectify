import React from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/lib/api/users.api';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth.context';
import { useFollowMutation, useUnfollowMutation } from '@/hooks/use-profile';
import { EditProfileModal } from './edit-profile-modal';
import { FollowModal } from './follow-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Link as LinkIcon, Calendar, Settings, Share } from 'lucide-react';
import { format } from 'date-fns';
import { cn, getImageUrl } from '@/lib/utils';
import { motion } from 'framer-motion';
import { SharePostModal } from '../feed/share-post-modal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { blockUser, restrictUser } from '@/lib/api/users.api';
import { useMutation } from '@tanstack/react-query';

interface ProfileHeaderProps {
  profile: UserProfile;
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const { user, updateUser } = useAuth();
  const followMutation = useFollowMutation();
  const unfollowMutation = useUnfollowMutation();
  const router = useRouter();

  const isRestricted = user?.restrictedUsers?.includes(profile._id);
  const isBlocked = user?.blockedUsers?.includes(profile._id);

  const blockMutation = useMutation({
    mutationFn: () => blockUser(profile._id),
    onSuccess: () => {
      if (!user) return;
      const newBlockedUsers = isBlocked 
        ? user.blockedUsers?.filter(id => id !== profile._id) || []
        : [...(user.blockedUsers || []), profile._id];
      updateUser({ blockedUsers: newBlockedUsers });
    }
  });

  const restrictMutation = useMutation({
    mutationFn: () => restrictUser(profile._id),
    onSuccess: () => {
      if (!user) return;
      const newRestrictedUsers = isRestricted 
        ? user.restrictedUsers?.filter(id => id !== profile._id) || []
        : [...(user.restrictedUsers || []), profile._id];
      updateUser({ restrictedUsers: newRestrictedUsers });
    }
  });

  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [followModalConfig, setFollowModalConfig] = React.useState<{ isOpen: boolean, type: 'followers' | 'following' }>({
    isOpen: false,
    type: 'followers',
  });

  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);

  const isOwnProfile = user?.username === profile.username;
  const isFollowing = user?.following?.includes(profile._id as string) || profile.followers?.some((f: unknown) => (f as { _id: string })._id === user?._id);
  const isRequested = profile.isRequested;
  const isApprovedToView = isOwnProfile || !profile.isPrivate || isFollowing;

  const handleFollowToggle = () => {
    if (isFollowing || isRequested) {
      unfollowMutation.mutate(profile._id);
    } else {
      followMutation.mutate(profile._id);
    }
  };

  return (
    <div className="w-full flex flex-col items-center bg-background border-b border-border">
      {/* Profile Info Container */}
      <div className="w-full max-w-[935px] px-4 sm:px-8 py-8 md:py-10 flex flex-col md:flex-row gap-6 md:gap-20">
        {/* Avatar */}
        <div className="flex-shrink-0 flex justify-center md:justify-end md:w-[30%]">
          <Avatar className="w-24 h-24 md:w-[150px] md:h-[150px]">
            <AvatarImage src={getImageUrl(profile.avatar) || undefined} className="object-cover" />
            <AvatarFallback className="text-4xl font-light">{profile.fullName.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>

        {/* Details */}
        <div className="flex-1 flex flex-col md:w-[70%] text-sm md:text-base">
          {/* Top Row: Username & Gear */}
          <div className="flex items-center gap-4 mb-3">
            <h1 className="text-xl md:text-xl font-medium text-foreground truncate">
              {profile.username}
            </h1>
            
            {isOwnProfile && (
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => router.push('/settings/edit-profile')}>
                <Settings className="w-5 h-5" />
              </Button>
            )}

            {!isOwnProfile && (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 rounded-full">
                  <MoreHorizontal className="w-5 h-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-red-500 cursor-pointer" onClick={() => restrictMutation.mutate()}>
                    {isRestricted ? 'Unrestrict' : 'Restrict'}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-500 cursor-pointer" onClick={() => blockMutation.mutate()}>
                    {isBlocked ? 'Unblock' : 'Block'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Full Name */}
          <div className="font-semibold text-foreground mb-1">
            {profile.fullName}
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-6 mb-3 text-sm">
            <div className="flex gap-1.5 items-center">
              <motion.span 
                key={profile.postsCount}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-semibold text-foreground"
              >
                {profile.postsCount}
              </motion.span>
              <span className="text-foreground">posts</span>
            </div>
            <div 
              className={cn("flex gap-1.5 items-center transition-opacity", isApprovedToView ? "cursor-pointer hover:opacity-80" : "cursor-default")}
              onClick={() => isApprovedToView && setFollowModalConfig({ isOpen: true, type: 'followers' })}
            >
              <motion.span 
                key={profile.followersCount}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-semibold text-foreground"
              >
                {profile.followersCount}
              </motion.span>
              <span className="text-foreground">followers</span>
            </div>
            <div 
              className={cn("flex gap-1.5 items-center transition-opacity", isApprovedToView ? "cursor-pointer hover:opacity-80" : "cursor-default")}
              onClick={() => isApprovedToView && setFollowModalConfig({ isOpen: true, type: 'following' })}
            >
              <motion.span 
                key={profile.followingCount}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-semibold text-foreground"
              >
                {profile.followingCount}
              </motion.span>
              <span className="text-foreground">following</span>
            </div>
          </div>

          {/* Bio Section */}
          <div className="flex flex-col text-sm text-foreground space-y-1 mb-6">
            {profile.bio && <p className="whitespace-pre-wrap leading-tight">{profile.bio}</p>}
            
            <div className="flex flex-col gap-1 mt-1">
              {profile.location && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs">{profile.location}</span>
                </div>
              )}
              {profile.website && (
                <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-900 dark:text-[#E0F1FF] font-semibold hover:underline">
                  <LinkIcon className="w-4 h-4" />
                  <span className="text-xs truncate max-w-[200px]">{profile.website.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
              {profile.createdAt && (
                <div className="flex items-center gap-1 text-muted-foreground mt-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">Joined {format(new Date(profile.createdAt), 'MMMM yyyy')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-2 max-w-[500px]">
            {isOwnProfile ? (
              <>
                <Button variant="secondary" className="flex-1 font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 h-9" onClick={() => setIsEditModalOpen(true)}>
                  Edit profile
                </Button>
                <Button variant="secondary" className="flex-1 font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 h-9" onClick={() => router.push('/archive')}>
                  View archive
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant={isFollowing || isRequested ? "secondary" : "default"} 
                  className={cn("flex-1 font-semibold rounded-lg h-9 transition-all", (isFollowing || isRequested) ? "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground" : "")}
                  onClick={handleFollowToggle}
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                >
                  {isFollowing ? 'Following' : isRequested ? 'Requested' : 'Follow'}
                </Button>
                <Button 
                  variant="secondary" 
                  className="flex-1 font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 h-9"
                  onClick={() => router.push(`/messages?userId=${profile._id}`)}
                >
                  Message
                </Button>
                <Button variant="secondary" size="icon" className="h-9 w-9 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg flex-shrink-0" onClick={() => setIsShareModalOpen(true)}>
                  <Share className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {isOwnProfile && (
        <EditProfileModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          profile={profile} 
        />
      )}

      <FollowModal 
        isOpen={followModalConfig.isOpen}
        onClose={() => setFollowModalConfig(prev => ({ ...prev, isOpen: false }))}
        userId={profile._id}
        type={followModalConfig.type}
      />

      <SharePostModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        profileId={profile._id}
      />
    </div>
  );
}

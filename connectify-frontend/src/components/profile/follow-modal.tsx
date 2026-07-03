import React from 'react';
import { useFollowers, useFollowing, useFollowMutation, useUnfollowMutation, useRemoveFollowerMutation } from '@/hooks/use-profile';
import { useAuth } from '@/contexts/auth.context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { getImageUrl } from '@/lib/utils';

interface FollowModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
}

export function FollowModal({ isOpen, onClose, userId, type }: FollowModalProps) {
  const { data: followers, isLoading: isLoadingFollowers } = useFollowers(isOpen && type === 'followers' ? userId : '');
  const { data: following, isLoading: isLoadingFollowing } = useFollowing(isOpen && type === 'following' ? userId : '');
  const { user } = useAuth();
  
  const followMutation = useFollowMutation();
  const unfollowMutation = useUnfollowMutation();
  const removeFollowerMutation = useRemoveFollowerMutation();
  
  const isOwner = user?._id === userId;
  
  const [search, setSearch] = React.useState('');

  const users = type === 'followers' ? followers : following;
  const isLoading = type === 'followers' ? isLoadingFollowers : isLoadingFollowing;

  const filteredUsers = React.useMemo(() => {
    if (!users) return [];
    return users.filter(u => 
      u.username?.toLowerCase().includes(search.toLowerCase()) || 
      u.fullName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="text-center text-lg capitalize">{type}</DialogTitle>
        </DialogHeader>

        <div className="p-4 border-b border-border bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search" 
              className="pl-9 bg-card border-none h-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <span className="text-muted-foreground">Loading...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <span className="text-muted-foreground">No users found.</span>
            </div>
          ) : (
            filteredUsers.map(u => {
              const isCurrentUser = user?._id === u._id;
              // Optimistic UI state could be derived from user context
              const isFollowing = user?.following?.includes(u._id as string);
              
              return (
                <div key={u._id} className="flex items-center justify-between">
                  <Link href={`/profile/${u.username}`} className="flex items-center gap-3 group/user" onClick={onClose}>
                    <Avatar className="w-11 h-11 border border-border">
                      <AvatarImage src={getImageUrl(u.avatar) || undefined} className="object-cover" />
                      <AvatarFallback>{u.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{u.username}</span>
                      <span className="text-muted-foreground text-xs">{u.fullName}</span>
                    </div>
                  </Link>

                  {!isCurrentUser && (
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant={isFollowing ? 'outline' : 'default'}
                        onClick={() => {
                          if (isFollowing) {
                            unfollowMutation.mutate(u._id as string);
                          } else {
                            followMutation.mutate(u._id as string);
                          }
                        }}
                        disabled={followMutation.isPending || unfollowMutation.isPending}
                        className="h-8 rounded-lg px-4"
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </Button>
                      
                      {isOwner && type === 'followers' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFollowerMutation.mutate(u._id as string)}
                          disabled={removeFollowerMutation.isPending}
                          className="h-8 rounded-lg px-4 bg-muted/50"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

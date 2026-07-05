'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSuggestedUsers } from '@/lib/api/users.api';
import { useFollowMutation } from '@/hooks/use-profile';
import { getImageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function SuggestedUsers() {
  const queryClient = useQueryClient();

  const { data: suggestedUsers, isLoading } = useQuery({
    queryKey: ['suggestedUsers'],
    queryFn: getSuggestedUsers,
  });

  const followMutation = useFollowMutation();

  if (isLoading || !suggestedUsers || suggestedUsers.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-4 mb-8">
      <div className="flex items-center justify-between px-4 sm:px-0 mb-4">
        <h3 className="font-semibold text-foreground">Suggested for you</h3>
      </div>
      
      <div className="w-full overflow-x-auto no-scrollbar flex space-x-4 px-4 sm:px-0 pb-4">
        {suggestedUsers.map((user) => (
          <div 
            key={user._id} 
            className="flex flex-col items-center justify-center p-4 min-w-[160px] max-w-[160px] bg-card border border-border rounded-xl shadow-sm shrink-0"
          >
            <Link href={`/profile/${user.username}`} className="flex flex-col items-center">
              <img 
                src={getImageUrl(user.avatar) || 'https://i.pravatar.cc/150'} 
                alt={user.username} 
                className="w-16 h-16 rounded-full object-cover mb-3 border border-border"
              />
              <span className="font-semibold text-sm truncate w-full text-center hover:underline">
                {user.username}
              </span>
              <span className="text-xs text-muted-foreground truncate w-full text-center mt-1">
                {user.fullName || 'Suggested'}
              </span>
            </Link>
            
            <Button
              className="w-full mt-4 h-8"
              size="sm"
              onClick={() => followMutation.mutate(user._id as string)}
              disabled={followMutation.isPending}
            >
              Follow
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

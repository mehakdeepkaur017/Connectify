'use client';
import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getImageUrl } from '@/lib/utils';
import Link from 'next/link';

export default function MutedUsersPage() {
  const queryClient = useQueryClient();
  const { data: mutedUsers, isLoading } = useQuery({
    queryKey: ['mutedUsers'],
    queryFn: async () => {
      const res = await api.get('/users/settings/muted');
      return res.data.data;
    }
  });

  const unmuteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/users/${userId}/unmute`);
      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mutedUsers'] });
    }
  });

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Muted Accounts</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Mute accounts to hide their posts and stories from your feed without unfollowing them.
      </p>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : mutedUsers?.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground">You haven&apos;t muted anyone.</div>
      ) : (
        <div className="space-y-4">
          {mutedUsers?.map((user: { _id: string, username: string, fullName: string, avatar: string }) => (
            <div key={user._id} className="flex items-center justify-between p-4 rounded-xl border border-border">
              <Link href={`/profile/${user.username}`} className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={getImageUrl(user.avatar) || undefined} />
                  <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-sm">{user.username}</div>
                  <div className="text-xs text-muted-foreground">{user.fullName}</div>
                </div>
              </Link>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => unmuteMutation.mutate(user._id)}
                disabled={unmuteMutation.isPending}
              >
                Unmute
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

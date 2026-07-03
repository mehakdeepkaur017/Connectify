'use client';
import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getImageUrl } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth.context';

export default function BlockedUsersPage() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: blockedUsers, isLoading } = useQuery({
    queryKey: ['blockedUsers'],
    queryFn: async () => {
      const res = await api.get('/users/settings/blocked');
      return res.data.data;
    }
  });

  const unblockMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/users/${userId}/block`);
      return userId;
    },
    onSuccess: (userId) => {
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
      if (user) {
        updateUser({
          blockedUsers: user.blockedUsers?.filter(id => id !== userId) || []
        });
      }
    }
  });

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Blocked Users</h1>
      <p className="text-sm text-muted-foreground mb-8">
        You can block people to restrict them from interacting with your profile. They won&apos;t be able to find your profile, posts or story on Connectify.
      </p>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : blockedUsers?.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground">You haven&apos;t blocked anyone.</div>
      ) : (
        <div className="space-y-4">
          {blockedUsers?.map((user: { _id: string, username: string, fullName: string, avatar: string }) => (
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
                onClick={() => unblockMutation.mutate(user._id)}
                disabled={unblockMutation.isPending}
              >
                Unblock
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

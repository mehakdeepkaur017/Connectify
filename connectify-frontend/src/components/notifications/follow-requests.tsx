'use client';

import React from 'react';
import { useAuth } from '@/contexts/auth.context';
import { useAcceptFollowRequestMutation, useRejectFollowRequestMutation } from '@/hooks/use-profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getImageUrl } from '@/lib/utils';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus } from 'lucide-react';

export function FollowRequestsBanner() {
  const { user } = useAuth();
  const requests = user?.followRequests || [];

  if (requests.length === 0) return null;

  return (
    <Link href="/notifications/requests" className="block">
      <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 via-purple-500 to-blue-500 p-[2px]">
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-foreground" />
            </div>
          </div>
          {requests.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {requests.length}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Follow Requests</p>
          <p className="text-xs text-muted-foreground truncate">
            {requests.length === 1 
              ? `${requests[0].username} wants to follow you`
              : `${requests[0].username} + ${requests.length - 1} other${requests.length > 2 ? 's' : ''}`
            }
          </p>
        </div>
      </div>
    </Link>
  );
}

export function FollowRequestsList() {
  const { user } = useAuth();
  const acceptMutation = useAcceptFollowRequestMutation();
  const rejectMutation = useRejectFollowRequestMutation();
  const [removedIds, setRemovedIds] = React.useState<Set<string>>(new Set());

  const requests = (user?.followRequests || []).filter(r => !removedIds.has(r._id));

  const handleAccept = (userId: string) => {
    acceptMutation.mutate(userId, {
      onSuccess: () => {
        setRemovedIds(prev => new Set(prev).add(userId));
      }
    });
  };

  const handleReject = (userId: string) => {
    rejectMutation.mutate(userId, {
      onSuccess: () => {
        setRemovedIds(prev => new Set(prev).add(userId));
      }
    });
  };

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-16 h-16 border-2 border-muted-foreground rounded-full flex items-center justify-center mb-4">
          <UserPlus className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">No Follow Requests</h2>
        <p className="mt-2 text-sm">When people ask to follow you, you&apos;ll see their requests here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <AnimatePresence mode="popLayout">
        {requests.map((request) => (
          <motion.div
            key={request._id}
            layout
            initial={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
          >
            <Link href={`/profile/${request.username}`} className="shrink-0">
              <Avatar className="w-12 h-12">
                <AvatarImage src={getImageUrl(request.avatar) || undefined} className="object-cover" />
                <AvatarFallback className="text-lg font-light">
                  {request.fullName?.charAt(0) || request.username?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
            </Link>

            <div className="flex-1 min-w-0">
              <Link href={`/profile/${request.username}`} className="hover:underline">
                <p className="text-sm font-semibold text-foreground truncate">{request.username}</p>
              </Link>
              <p className="text-xs text-muted-foreground truncate">{request.fullName}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                className="h-8 px-5 rounded-lg font-semibold text-sm"
                onClick={() => handleAccept(request._id)}
                disabled={acceptMutation.isPending}
              >
                Confirm
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 px-5 rounded-lg font-semibold text-sm"
                onClick={() => handleReject(request._id)}
                disabled={rejectMutation.isPending}
              >
                Delete
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from './use-messages';

/**
 * Hook for realtime follow system events.
 * Listens for socket events related to follow requests and
 * invalidates the appropriate React Query caches.
 */
export const useFollowEvents = () => {
  const socket = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleFollowRequestReceived = () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    const handleFollowRequestAccepted = () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    };

    const handleFollowRequestDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    const handleFollowRemoved = () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    };

    const handleRequestCancelled = () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('followRequestReceived', handleFollowRequestReceived);
    socket.on('followRequestAccepted', handleFollowRequestAccepted);
    socket.on('followRequestDeleted', handleFollowRequestDeleted);
    socket.on('followRemoved', handleFollowRemoved);
    socket.on('requestCancelled', handleRequestCancelled);

    return () => {
      socket.off('followRequestReceived', handleFollowRequestReceived);
      socket.off('followRequestAccepted', handleFollowRequestAccepted);
      socket.off('followRequestDeleted', handleFollowRequestDeleted);
      socket.off('followRemoved', handleFollowRemoved);
      socket.off('requestCancelled', handleRequestCancelled);
    };
  }, [socket, queryClient]);
};

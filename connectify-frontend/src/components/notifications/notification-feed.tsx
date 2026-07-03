import * as React from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markNotificationsRead, deleteNotification, Notification } from '@/lib/api/notifications.api';
import { useInView } from 'react-intersection-observer';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Heart, MessageCircle, UserPlus, AtSign, Bookmark, UserCheck, X } from 'lucide-react';
import { getImageUrl, formatInstagramDate, cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FollowRequestsBanner } from './follow-requests';

interface NotificationGroup {
  _id: string;
  type: string;
  senders: any[];
  post?: any;
  comment?: any;
  isRead: boolean;
  createdAt: string;
  isInitialUnread: boolean;
}

export function NotificationFeed() {
  const { ref, inView } = useInView();
  const queryClient = useQueryClient();
  const [initialUnreadIds] = React.useState<Set<string>>(() => new Set());
  const [hasMarkedRead, setHasMarkedRead] = React.useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) => getNotifications({ pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    }
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => {
      // Only invalidate the badge so the feed doesn't re-render and lose its highlighted backgrounds
      queryClient.invalidateQueries({ queryKey: ['notifications', 'badge'] });
    }
  });

  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  React.useEffect(() => {
    if (status === 'success' && data) {
      let foundUnread = false;
      data.pages.forEach(page => {
        page.notifications.forEach(n => {
          if (!n.isRead && !hasMarkedRead) {
            initialUnreadIds.add(n._id);
            foundUnread = true;
          }
        });
      });

      if (foundUnread && !hasMarkedRead) {
        setHasMarkedRead(true);
        markReadMutation.mutate();
      }
    }
  }, [status, data, hasMarkedRead, initialUnreadIds, markReadMutation]);

  if (status === 'pending') {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const notifications = data?.pages.flatMap(page => page.notifications) || [];

  if (status === 'success' && notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-foreground">
        <div className="w-[90px] h-[90px] border-[1.5px] border-foreground rounded-full flex items-center justify-center mb-6">
          <Heart className="w-10 h-10 text-foreground" />
        </div>
        <h2 className="text-3xl font-bold">Activity On Your Posts</h2>
        <p className="mt-4 text-[14px] text-center max-w-[350px] text-muted-foreground">When someone likes or comments on one of your posts, you&apos;ll see it here.</p>
      </div>
    );
  }

  const groupNotifications = (notifs: Notification[]) => {
    const today: NotificationGroup[] = [];
    const thisWeek: NotificationGroup[] = [];
    const earlier: NotificationGroup[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const groupedMap = new Map<string, NotificationGroup>();

    notifs.forEach(notif => {
      // Group likes for the same post
      let groupKey = notif._id; 
      if (notif.type === 'like' && notif.post) {
        groupKey = `like_post_${notif.post._id}`;
      }
      
      const isInitialUnread = initialUnreadIds.has(notif._id) || (!hasMarkedRead && !notif.isRead);

      if (groupedMap.has(groupKey)) {
        const group = groupedMap.get(groupKey)!;
        if (!group.senders.find(s => s._id === notif.sender._id)) {
          group.senders.push(notif.sender);
        }
      } else {
        const newGroup: NotificationGroup = {
          _id: notif._id,
          type: notif.type,
          senders: [notif.sender],
          post: notif.post,
          comment: notif.comment,
          isRead: notif.isRead,
          createdAt: notif.createdAt,
          isInitialUnread: isInitialUnread
        };
        groupedMap.set(groupKey, newGroup);
        
        const date = new Date(notif.createdAt);
        if (date >= todayStart) {
          today.push(newGroup);
        } else if (date >= weekStart) {
          thisWeek.push(newGroup);
        } else {
          earlier.push(newGroup);
        }
      }
    });

    return { today, thisWeek, earlier };
  };

  const { today, thisWeek, earlier } = groupNotifications(notifications);

  return (
    <div className="flex flex-col">
      <FollowRequestsBanner />
      {today.length > 0 && (
        <div className="mb-4">
          <h2 className="px-4 py-2 font-bold text-base">Today</h2>
          {today.map(group => <NotificationItem key={group._id} group={group} queryClient={queryClient} />)}
        </div>
      )}
      {thisWeek.length > 0 && (
        <div className="mb-4">
          <h2 className="px-4 py-2 font-bold text-base">This Week</h2>
          {thisWeek.map(group => <NotificationItem key={group._id} group={group} queryClient={queryClient} />)}
        </div>
      )}
      {earlier.length > 0 && (
        <div className="mb-4">
          <h2 className="px-4 py-2 font-bold text-base">Earlier</h2>
          {earlier.map(group => <NotificationItem key={group._id} group={group} queryClient={queryClient} />)}
        </div>
      )}
      
      <div ref={ref} className="flex justify-center py-6">
        {isFetchingNextPage && <LoadingSpinner />}
      </div>
    </div>
  );
}

function NotificationItem({ group, queryClient }: { group: NotificationGroup, queryClient: any }) {
  const router = useRouter();

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 fill-red-500 text-red-500" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'reply': return <MessageCircle className="w-4 h-4 text-blue-400" />;
      case 'follow': return <UserPlus className="w-4 h-4 text-primary" />;
      case 'follow_request': return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'follow_accept': return <UserCheck className="w-4 h-4 text-green-500" />;
      case 'mention': return <AtSign className="w-4 h-4 text-orange-500" />;
      case 'save': return <Bookmark className="w-4 h-4 text-yellow-500" />;
      case 'story_like': return <Heart className="w-4 h-4 fill-red-500 text-red-500" />;
      case 'story_reply': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'message_request': return <MessageCircle className="w-4 h-4 text-purple-500" />;
      default: return null;
    }
  };

  const renderSenders = () => {
    const count = group.senders.length;
    const first = group.senders[0];
    
    if (count === 1) {
      return (
        <Link href={`/profile/${first.username}`} className="font-semibold hover:underline mr-1">
          {first.username}
        </Link>
      );
    }
    
    if (count === 2) {
      return (
        <span>
          <Link href={`/profile/${first.username}`} className="font-semibold hover:underline">{first.username}</Link>
          {' and '}
          <Link href={`/profile/${group.senders[1].username}`} className="font-semibold hover:underline mr-1">{group.senders[1].username}</Link>
        </span>
      );
    }
    
    return (
      <span>
        <Link href={`/profile/${first.username}`} className="font-semibold hover:underline">{first.username}</Link>
        {` and ${count - 1} others `}
      </span>
    );
  };

  const getMessage = (group: NotificationGroup) => {
    switch (group.type) {
      case 'like': return 'liked your post.';
      case 'comment': return `commented: "${group.comment?.text || ''}"`;
      case 'reply': return `replied to your comment: "${group.comment?.text || ''}"`;
      case 'follow': return 'started following you.';
      case 'follow_request': return 'requested to follow you.';
      case 'follow_accept': return 'accepted your follow request.';
      case 'mention': return 'mentioned you.';
      case 'save': return 'saved your post.';
      case 'story_like': return 'liked your story.';
      case 'story_reply': return 'replied to your story.';
      case 'message_request': return 'sent you a message request.';
      default: return 'interacted with you.';
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('button')) {
      return;
    }
    
    switch (group.type) {
      case 'like':
      case 'mention':
      case 'comment':
      case 'reply':
        if (group.post?._id) router.push(`/post/${group.post._id}`);
        break;
      case 'follow':
      case 'follow_accept':
      case 'follow_request':
        router.push(`/profile/${group.senders[0].username}`);
        break;
      case 'story_like':
      case 'story_reply':
      case 'message_request':
        router.push('/messages');
        break;
    }
  };

  return (
    <div 
      onClick={handleRowClick}
      className={cn(
        "group flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer",
        group.isInitialUnread ? "bg-muted/20" : ""
      )}
    >
      <div className="relative">
        <Link href={`/profile/${group.senders[0].username}`}>
          <img 
            src={getImageUrl(group.senders[0].avatar) || undefined} 
            alt={group.senders[0].username}
            className="w-12 h-12 rounded-full object-cover border border-border"
          />
        </Link>
        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm border border-border">
          {getIcon(group.type)}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm">
          {renderSenders()}
          <span className="text-muted-foreground">{getMessage(group)}</span>
          <span className="text-muted-foreground/70 ml-2 text-xs">{formatInstagramDate(group.createdAt)}</span>
        </p>
      </div>

      {group.post && group.post.images && group.post.images.length > 0 && (
        <Link href={`/post/${group.post._id}`} className="shrink-0">
          <img 
            src={getImageUrl(group.post.images[0])} 
            alt="Post"
            className="w-12 h-12 rounded object-cover border border-border"
          />
        </Link>
      )}

      {group.type === 'follow_request' && (
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={async () => {
              try {
                const { api } = await import('@/lib/axios');
                await api.post(`/users/${group.senders[0]._id}/accept`);
                queryClient.invalidateQueries({ queryKey: ['notifications'] });
              } catch (e) {}
            }}
            className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-1.5 rounded-lg"
          >
            Confirm
          </button>
          <button 
            onClick={async () => {
              try {
                const { api } = await import('@/lib/axios');
                await api.post(`/users/${group.senders[0]._id}/reject`);
                queryClient.invalidateQueries({ queryKey: ['notifications'] });
              } catch (e) {}
            }}
            className="bg-muted text-foreground text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-muted/80 transition-colors"
          >
            Delete
          </button>
        </div>
      )}

      {group.type === 'follow' && (
        <button className="bg-muted text-foreground text-sm font-semibold px-4 py-1.5 rounded-lg shrink-0 hover:bg-muted/80 transition-colors">
          Following
        </button>
      )}

      <button 
        onClick={async (e) => {
          e.stopPropagation();
          try {
            await deleteNotification(group._id);
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          } catch (error) {
            console.error('Failed to delete notification', error);
          }
        }}
        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-muted rounded-full transition-all shrink-0"
        title="Delete notification"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}

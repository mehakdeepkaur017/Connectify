'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, getImageUrl } from '@/lib/utils';
import {
  Home,
  Compass,
  Search,
  Bell,
  MessageSquare,
  User,
  PlusSquare,
  Settings,
  LogOut,
  X,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { UserSearch } from '@/components/sidebar/user-search';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CreatePostModal } from '@/components/feed/create-post-modal';
import { CreateStoryModal } from '@/components/feed/create-story-modal';
import { useSocket, useConversations } from '@/hooks/use-messages';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getNotifications, Notification } from '@/lib/api/notifications.api';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { RefreshCcw } from 'lucide-react';



export function LeftSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = React.useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = React.useState(false);

  // Close search when route changes
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSearchOpen(false);
  }, [pathname]);

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const queryClient = useQueryClient();
  const socket = useSocket();

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'badge'],
    queryFn: () => getNotifications({ pageParam: 1 }),
    enabled: !!user,
  });

  const unreadCount = notificationsData?.unreadCount || 0;

  const { data: conversationsData } = useConversations();
  const unreadMessagesCount = React.useMemo(() => {
    if (!conversationsData || !user) return 0;
    return conversationsData.pages.reduce((acc, page) => {
      return acc + page.conversations.reduce((sum, conv) => sum + (conv.unreadCount?.[user._id] || 0), 0);
    }, 0);
  }, [conversationsData, user]);

  React.useEffect(() => {
    if (!socket || !user) return;

    const handleNewNotification = (notification: Notification) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      let message = 'New notification';
      if (notification.type === 'like') message = `${notification.sender.username} liked your post`;
      if (notification.type === 'comment') message = `${notification.sender.username} commented on your post`;
      if (notification.type === 'follow') message = `${notification.sender.username} started following you`;
      if (notification.type === 'follow_request') message = `${notification.sender.username} requested to follow you`;
      if (notification.type === 'follow_accept') message = `${notification.sender.username} accepted your follow request`;
      if (notification.type === 'story_like') message = `${notification.sender.username} liked your story`;
      
      toast(message, {
        icon: '🔔',
        action: {
          label: 'View',
          onClick: () => window.location.href = '/notifications'
        }
      });
    };

    socket.on('newNotification', handleNewNotification);

    return () => {
      socket.off('newNotification', handleNewNotification);
    };
  }, [socket, user, queryClient]);

  const NAV_ITEMS = [
    { icon: Home, label: 'Home', href: '/home' },
    { icon: Search, label: 'Search', action: () => setIsSearchOpen(true) },
    { icon: Compass, label: 'Explore', href: '/explore' },
    { icon: MessageSquare, label: 'Messages', href: '/messages' },
    { icon: Bell, label: 'Notifications', href: '/notifications' },
    { icon: PlusSquare, label: 'Create', href: '#' },
    { icon: User, label: 'Profile', href: user ? `/profile/${user.username}` : '/login' },
  ];

  return (
    <>
      <aside className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 border-r border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 transition-all duration-300",
        isSearchOpen ? "w-[80px]" : "w-[80px] xl:w-[280px]"
      )}>
        <div className="p-4 xl:p-6 flex-1 flex flex-col gap-2 relative">
          {/* Logo */}
          <Link href="/home" className={cn("mb-8 flex justify-center", !isSearchOpen ? "xl:justify-start" : "")}>
            <span className={cn(
              "text-2xl font-bold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent transition-all duration-300",
              isSearchOpen ? "hidden" : "hidden xl:block"
            )}>
              Connectify
            </span>
            <div className={cn(
              "w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-white font-bold text-xl",
              (!isSearchOpen && "xl:hidden")
            )}>
              C
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex-1 flex flex-col gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive = (item.href && pathname === item.href) || 
                               (item.label === 'Profile' && pathname.startsWith(`/profile/${user?.username}`)) ||
                               (item.label === 'Search' && isSearchOpen);
              const Icon = item.icon;

              const content = (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div className={cn("relative z-10 flex items-center gap-4", !isSearchOpen && "xl:w-full")}>
                    {item.label === 'Profile' && user ? (
                      <img
                        src={getImageUrl(user.avatar) || undefined}
                        alt="Profile"
                        className={cn("w-6 h-6 rounded-full object-cover transition-transform duration-300", isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "group-hover:scale-110")}
                      />
                    ) : (
                      <div className="relative">
                        <Icon
                          className={cn(
                            'w-6 h-6 transition-transform duration-300 group-hover:scale-110',
                            isActive && 'fill-primary/20 text-primary'
                          )}
                        />
                        {item.label === 'Notifications' && unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold border border-background">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </div>
                        )}
                        {item.label === 'Messages' && unreadMessagesCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold border border-background">
                            {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                          </div>
                        )}
                      </div>
                    )}
                    <span className={cn(
                      'text-base font-medium transition-all duration-300 whitespace-nowrap', 
                      isActive && 'font-semibold text-primary',
                      isSearchOpen ? "hidden" : "hidden xl:block"
                    )}>
                      {item.label}
                    </span>
                  </div>
                </>
              );

              if (item.label === 'Create') {
                return (
                  <DropdownMenu key={item.label}>
                    <DropdownMenuTrigger
                      className={cn(
                        'group flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 relative text-muted-foreground hover:bg-primary/10 hover:text-primary',
                        isSearchOpen && "justify-center"
                      )}
                    >
                      {content}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="right" className="w-56 p-2 rounded-xl" sideOffset={10}>
                      <DropdownMenuItem className="p-3 cursor-pointer text-base rounded-lg font-semibold" onClick={() => setIsCreatePostOpen(true)}>
                        <ImageIcon className="w-5 h-5 mr-3" /> Post
                      </DropdownMenuItem>
                      <DropdownMenuItem className="p-3 cursor-pointer text-base rounded-lg font-semibold" onClick={() => setIsCreateStoryOpen(true)}>
                        <Video className="w-5 h-5 mr-3" /> Story
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }

              return item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 relative',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary',
                    isSearchOpen && "justify-center"
                  )}
                >
                  {content}
                </Link>
              ) : (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={cn(
                    'group flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 relative',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary',
                    isSearchOpen && "justify-center"
                  )}
                >
                  {content}
                </button>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="mt-auto flex flex-col gap-2">
            <Link
              href="/settings/edit-profile"
              className={cn(
                "group flex items-center gap-4 px-3 py-3 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300",
                isSearchOpen && "justify-center"
              )}
            >
              <Settings className="w-6 h-6 transition-transform duration-300 group-hover:rotate-45" />
              <span className={cn("text-base font-medium transition-all duration-300", isSearchOpen ? "hidden" : "hidden xl:block")}>Settings</span>
            </Link>

            <button
              onClick={logout}
              className={cn(
                "group flex items-center gap-4 px-3 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-300",
                isSearchOpen && "justify-center"
              )}
            >
              <LogOut className="w-6 h-6" />
              <span className={cn("text-base font-medium transition-all duration-300", isSearchOpen ? "hidden" : "hidden xl:block")}>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Slide-out Search Panel */}
      <AnimatePresence>
        {isSearchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSearchOpen(false)}
              className="fixed inset-0 bg-black/20 z-40 md:left-[80px]"
            />
            <motion.div
              initial={{ x: '-100%', borderTopRightRadius: '24px', borderBottomRightRadius: '24px' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 bottom-0 left-[80px] w-[350px] bg-background border-r border-border shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              <div className="p-6 pb-2 border-b border-border/50">
                <h2 className="text-2xl font-bold mb-6">Search</h2>
                <UserSearch onResultClick={() => setIsSearchOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {isCreatePostOpen && (
        <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} />
      )}
      {isCreateStoryOpen && (
        <CreateStoryModal isOpen={isCreateStoryOpen} onClose={() => setIsCreateStoryOpen(false)} />
      )}

    </>
  );
}

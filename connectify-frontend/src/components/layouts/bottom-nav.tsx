'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn, getImageUrl } from '@/lib/utils';
import {
  Home,
  Search,
  PlusSquare,
  MessageSquare,
  User,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CreatePostModal } from '@/components/feed/create-post-modal';
import { CreateStoryModal } from '@/components/feed/create-story-modal';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isCreatePostOpen, setIsCreatePostOpen] = React.useState(false);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = React.useState(false);

  const NAV_ITEMS = [
    { icon: Home, label: 'Home', href: '/home' },
    { icon: Search, label: 'Search', href: '/explore' },
    { icon: PlusSquare, label: 'Create', href: '#' },
    { icon: MessageSquare, label: 'Messages', href: '/messages' },
    { icon: User, label: 'Profile', href: user ? `/profile/${user.username}` : '/login' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 w-full border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.label === 'Profile' && pathname.startsWith(`/profile/${user?.username}`));
          const Icon = item.icon;

          if (item.label === 'Create') {
            return (
              <DropdownMenu key={item.label}>
                <DropdownMenuTrigger className="relative p-3 rounded-xl flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground">
                  <Icon className="w-6 h-6 relative z-10 transition-transform duration-300" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" side="top" className="w-48 p-2 rounded-xl mb-4">
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

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'relative p-3 rounded-xl flex items-center justify-center transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              {item.label === 'Profile' && user ? (
                <img
                  src={getImageUrl(user.avatar) || undefined}
                  alt="Profile"
                  className={cn("w-6 h-6 rounded-full object-cover transition-transform duration-300 relative z-10", isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "")}
                />
              ) : (
                <Icon
                  className={cn(
                    'w-6 h-6 relative z-10 transition-transform duration-300',
                    isActive && 'fill-primary/20 scale-110'
                  )}
                />
              )}
            </Link>
          );
        })}
      </div>

      {isCreatePostOpen && (
        <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} />
      )}
      {isCreateStoryOpen && (
        <CreateStoryModal isOpen={isCreateStoryOpen} onClose={() => setIsCreateStoryOpen(false)} />
      )}
    </nav>
  );
}

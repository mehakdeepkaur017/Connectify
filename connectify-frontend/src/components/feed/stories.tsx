'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/auth.context';
import { Plus } from 'lucide-react';
import { cn, getImageUrl } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getStoryFeed } from '@/lib/api/stories.api';
import { StoryViewer } from './story-viewer';
import { CreateStoryModal } from './create-story-modal';

export function Stories() {
  const { user } = useAuth();
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [startIndex, setStartIndex] = React.useState(0);
  
  const { data: storyGroups, isLoading } = useQuery({
    queryKey: ['stories'],
    queryFn: getStoryFeed
  });

  const handleStoryClick = (index: number) => {
    setStartIndex(index);
    setViewerOpen(true);
  };
  
  const ownStoryGroupIndex = storyGroups?.findIndex(g => g.author._id === user?._id) ?? -1;
  const hasOwnStory = ownStoryGroupIndex !== -1;
  
  return (
    <>
      <div className="w-full bg-background border-b border-border/40 py-4 mb-4">
        <div className="flex gap-4 overflow-x-auto px-4 no-scrollbar">
          
          {/* Current User Story / Add Story */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-1 min-w-[72px] cursor-pointer group"
            onClick={() => {
              if (hasOwnStory) {
                handleStoryClick(ownStoryGroupIndex);
              } else {
                setCreateOpen(true);
              }
            }}
          >
            <div className={cn(
              "relative w-16 h-16 rounded-full p-[2px] transition-transform",
              hasOwnStory ? "bg-gradient-to-tr from-yellow-400 via-red-500 to-fuchsia-600" : "border border-border p-0.5"
            )}>
              <div className="w-full h-full rounded-full border-2 border-background overflow-hidden bg-background">
                <img
                  src={getImageUrl(user?.avatar) || undefined}
                  alt="Your Story"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateOpen(true);
                }}
                className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full border-2 border-background flex items-center justify-center hover:scale-110 transition-transform"
              >
                <Plus className="w-3 h-3 text-white dark:text-black" />
              </button>
            </div>
            <span className="text-xs text-muted-foreground truncate w-16 text-center">Your Story</span>
          </motion.div>

          {/* Real Stories */}
          {!isLoading && storyGroups?.map((group, index) => {
            if (group.author._id === user?._id) return null; // Already rendered as 'Your Story'
            
            return (
              <motion.div
                key={group.author._id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleStoryClick(index)}
                className="flex flex-col items-center gap-1 min-w-[72px] cursor-pointer group"
              >
              <div className={cn(
                "w-16 h-16 rounded-full p-[2px] transition-transform",
                !group.hasUnviewed 
                  ? "bg-border" 
                  : "bg-gradient-to-tr from-yellow-400 via-red-500 to-fuchsia-600"
              )}>
                <div className="w-full h-full rounded-full border-2 border-background overflow-hidden bg-background">
                  <img
                    src={getImageUrl(group.author.avatar) || undefined}
                    alt={group.author.username}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              </div>
              <span className={cn(
                "text-xs truncate w-16 text-center",
                !group.hasUnviewed ? "text-muted-foreground" : "text-foreground font-medium"
              )}>
                {group.author.username}
              </span>
            </motion.div>
            );
          })}

          {!isLoading && (!storyGroups || storyGroups.length <= 1) && user?.following?.length === 0 && (
            <div className="flex items-center h-16 ml-4 text-sm text-muted-foreground italic">
              Follow people to see their stories here.
            </div>
          )}

        </div>
      </div>

      {storyGroups && (
        <StoryViewer 
          storyGroups={storyGroups}
          initialGroupIndex={startIndex}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
        />
      )}

      <CreateStoryModal 
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </>
  );
}

export function StoriesSkeleton() {
  return (
    <div className="w-full bg-background border-b border-border/40 py-4 mb-4 flex gap-4 px-4 overflow-hidden">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex flex-col items-center gap-1 min-w-[72px]">
          <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
          <div className="w-12 h-3 bg-muted rounded-full animate-pulse mt-1" />
        </div>
      ))}
    </div>
  );
}

'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getArchivedPosts } from '@/lib/api/posts.api';
import { getArchivedStories } from '@/lib/api/stories.api';
import { getImageUrl } from '@/lib/utils';
import Link from 'next/link';
import { LayoutGrid, Clock, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { StoryViewer } from '@/components/feed/story-viewer';
import { cn } from '@/lib/utils';

export default function ArchivePage() {
  const [activeTab, setActiveTab] = React.useState<'stories' | 'posts'>('stories');
  
  const { data: postsData, isLoading: loadingPosts } = useQuery({
    queryKey: ['archived-posts'],
    queryFn: () => getArchivedPosts(1, 50),
  });

  const { data: storiesData, isLoading: loadingStories } = useQuery({
    queryKey: ['archived-stories'],
    queryFn: getArchivedStories,
  });

  const posts = postsData?.posts || [];
  const stories = storiesData || [];

  const [selectedStoryIndex, setSelectedStoryIndex] = React.useState<number | null>(null);

  // Group stories into a standard format for StoryViewer
  const storyGroup = stories.length > 0 ? {
    author: stories[0].author, // We know they're all by the current user
    hasUnviewed: false,
    stories: stories
  } : null;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-8">
        <Clock className="w-8 h-8" />
        <h1 className="text-2xl font-bold">Archive</h1>
      </div>

      <div className="w-full">
        <div className="w-full grid grid-cols-2 mb-8 bg-transparent border-b">
          <button 
            onClick={() => setActiveTab('stories')}
            className={cn(
              "flex items-center justify-center gap-2 font-semibold tracking-wide pb-4 transition-all border-b-2",
              activeTab === 'stories' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-primary"
            )}
          >
            <PlayCircle className="w-4 h-4" />
            STORIES ARCHIVE
          </button>
          <button 
            onClick={() => setActiveTab('posts')}
            className={cn(
              "flex items-center justify-center gap-2 font-semibold tracking-wide pb-4 transition-all border-b-2",
              activeTab === 'posts' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-primary"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            POSTS ARCHIVE
          </button>
        </div>

        {activeTab === 'stories' && (
          <div className="mt-0">
          {loadingStories ? (
            <div className="grid grid-cols-3 gap-1 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="aspect-[9/16] bg-muted animate-pulse" />
              ))}
            </div>
          ) : stories.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-full border-2 border-muted flex items-center justify-center mb-6">
                <PlayCircle className="w-12 h-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No Archived Stories</h2>
              <p className="text-muted-foreground max-w-sm">
                Stories you archive will appear here. Only you can see them.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-6">
              {stories.map((story: any, index: number) => (
                <motion.div 
                  key={story._id}
                  whileHover={{ scale: 0.98 }}
                  className="aspect-[9/16] bg-muted relative group overflow-hidden cursor-pointer rounded-lg"
                  onClick={() => setSelectedStoryIndex(index)}
                >
                  {story.mediaType === 'video' ? (
                    <video src={getImageUrl(story.mediaUrl)} className="w-full h-full object-cover" />
                  ) : story.mediaType === 'image' ? (
                    <img src={getImageUrl(story.mediaUrl)} alt="Story" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500 text-white p-4 text-center">
                      <p className="font-semibold break-words w-full truncate">{story.text}</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute top-2 right-2 text-white text-xs font-bold bg-black/40 px-2 py-1 rounded">
                    {new Date(story.createdAt).toLocaleDateString()}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="mt-0">
          {loadingPosts ? (
            <div className="grid grid-cols-3 gap-1 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="aspect-square bg-muted animate-pulse" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-full border-2 border-muted flex items-center justify-center mb-6">
                <LayoutGrid className="w-12 h-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No Archived Posts</h2>
              <p className="text-muted-foreground max-w-sm">
                Posts you archive will appear here. Only you can see them.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-6">
              {posts.map((post: any) => (
                <Link key={post._id} href={`/post/${post._id}`}>
                  <motion.div 
                    whileHover={{ scale: 0.98 }}
                    className="aspect-square bg-muted relative group overflow-hidden"
                  >
                    <img 
                      src={getImageUrl(post.images[0])} 
                      alt="Post thumbnail" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-6 text-white font-bold">
                        <span className="flex items-center gap-2">
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                          {post.likesCount}
                        </span>
                        <span className="flex items-center gap-2">
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          {post.commentsCount}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
          </div>
        )}
      </div>

      {storyGroup && selectedStoryIndex !== null && (
        <StoryViewer
          isOpen={selectedStoryIndex !== null}
          onClose={() => setSelectedStoryIndex(null)}
          storyGroups={[storyGroup]}
          initialGroupIndex={0}
          initialStoryIndex={selectedStoryIndex}
        />
      )}
    </div>
  );
}

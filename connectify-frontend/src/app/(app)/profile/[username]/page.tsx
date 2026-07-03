'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layouts/app-layout';
import { ProtectedRoute } from '@/components/shared/route-guards';
import { ProfileHeader } from '@/components/profile/profile-header';
import { ProfileGrid } from '@/components/profile/profile-grid';
import { useProfile, useProfilePosts, useSavedPosts, useTaggedPosts } from '@/hooks/use-profile';
import { useAuth } from '@/contexts/auth.context';
import { Grid, Bookmark, Tag, Folder, ArrowLeft } from 'lucide-react';
import { cn, getImageUrl } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getCollections, getCollectionById, Collection } from '@/lib/api/collections.api';

export default function ProfilePage() {
  const { username } = useParams() as { username: string };
  const { user } = useAuth();
  
  const { data: profile, isLoading: isProfileLoading, error } = useProfile(username);
  
  const [activeTab, setActiveTab] = React.useState<'posts' | 'saved' | 'tagged'>('posts');
  const [selectedCollectionId, setSelectedCollectionId] = React.useState<string | 'all' | null>(null);
  
  const { data: postsData, isLoading: isPostsLoading } = useProfilePosts(profile?._id || '');
  const { data: savedPostsData, isLoading: isSavedLoading } = useSavedPosts();
  const { data: taggedPostsData, isLoading: isTaggedLoading } = useTaggedPosts(profile?._id || '');
  
  const isOwnProfile = user?.username === username;
  
  const { data: collections, isLoading: isCollectionsLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: getCollections,
    enabled: isOwnProfile && activeTab === 'saved' && selectedCollectionId === null,
  });

  const { data: selectedCollection, isLoading: isCollectionLoading } = useQuery({
    queryKey: ['collection', selectedCollectionId],
    queryFn: () => getCollectionById(selectedCollectionId as string),
    enabled: !!selectedCollectionId && selectedCollectionId !== 'all',
  });

  const isPrivate = profile?.isPrivate;
  const isFollowing = user?.following?.includes(profile?._id as string) || profile?.followers?.some((f: any) => f._id === user?._id);
  const isApprovedToView = isOwnProfile || !isPrivate || isFollowing;

  if (isProfileLoading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="w-full flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (error || !profile) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="w-full flex justify-center py-20 text-muted-foreground text-lg">
            User not found.
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const posts = postsData?.posts || [];
  const savedPosts = savedPostsData?.posts || [];
  const taggedPosts = taggedPostsData?.posts || [];

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="flex flex-col w-full min-h-screen bg-background">
          <ProfileHeader profile={profile} />

          <div className="w-full max-w-[935px] mx-auto px-4 sm:px-0">
            {isApprovedToView ? (
              <>
                <div className="flex justify-center border-t border-border mt-8 md:mt-0">
                  <div className="flex gap-12 sm:gap-[60px]">
                    <button 
                      onClick={() => setActiveTab('posts')}
                      className={cn(
                        "flex items-center gap-1.5 h-[52px] text-[12px] font-semibold tracking-[1px] uppercase border-t border-transparent transition-colors",
                        activeTab === 'posts' ? "border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Posts</span>
                    </button>
                    
                    {isOwnProfile && (
                      <button 
                        onClick={() => setActiveTab('saved')}
                        className={cn(
                          "flex items-center gap-1.5 h-[52px] text-[12px] font-semibold tracking-[1px] uppercase border-t border-transparent transition-colors",
                          activeTab === 'saved' ? "border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Saved</span>
                      </button>
                    )}

                    <button 
                      onClick={() => setActiveTab('tagged')}
                      className={cn(
                        "flex items-center gap-1.5 h-[52px] text-[12px] font-semibold tracking-[1px] uppercase border-t border-transparent transition-colors",
                        activeTab === 'tagged' ? "border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Tagged</span>
                    </button>
                  </div>
                </div>

                <div className="mt-2 pb-20">
                  {activeTab === 'posts' && <ProfileGrid posts={posts} isLoading={isPostsLoading} />}
                  
                  {activeTab === 'saved' && isOwnProfile && (
                    <div className="w-full">
                      {selectedCollectionId ? (
                        <div>
                          <div className="flex items-center mb-6">
                            <button 
                              onClick={() => setSelectedCollectionId(null)}
                              className="mr-4 hover:bg-muted p-2 rounded-full transition-colors"
                            >
                              <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h2 className="text-xl font-bold">
                              {selectedCollectionId === 'all' ? 'All Posts' : selectedCollection?.name}
                            </h2>
                          </div>
                          <ProfileGrid 
                            posts={selectedCollectionId === 'all' ? savedPosts : (selectedCollection?.posts as any) || []} 
                            isLoading={selectedCollectionId === 'all' ? isSavedLoading : isCollectionLoading} 
                            emptyIcon={<Bookmark className="w-10 h-10 text-foreground" />}
                            emptyTitle="Save"
                            emptyDescription="Save photos and videos that you want to see again. No one is notified, and only you can see what you've saved."
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                          <div 
                            onClick={() => setSelectedCollectionId('all')}
                            className="cursor-pointer group"
                          >
                            <div className="aspect-square bg-muted rounded-xl flex items-center justify-center border border-border overflow-hidden mb-2 relative group-hover:opacity-90 transition-opacity">
                              {savedPosts.length > 0 && savedPosts[0].images?.length > 0 ? (
                                <img src={getImageUrl(savedPosts[0].images[0])} className="w-full h-full object-cover" alt="All Posts" />
                              ) : (
                                <Grid className="w-8 h-8 text-muted-foreground" />
                              )}
                              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                            </div>
                            <h3 className="font-semibold text-sm">All Posts</h3>
                          </div>
                          
                          {isCollectionsLoading ? (
                            [1, 2, 3].map(i => (
                              <div key={i} className="animate-pulse">
                                <div className="aspect-square bg-muted rounded-xl mb-2" />
                                <div className="h-4 bg-muted rounded w-2/3" />
                              </div>
                            ))
                          ) : (
                            collections?.map((collection: Collection) => (
                              <div 
                                key={collection._id}
                                onClick={() => setSelectedCollectionId(collection._id)}
                                className="cursor-pointer group"
                              >
                                <div className="aspect-square bg-muted rounded-xl flex items-center justify-center border border-border overflow-hidden mb-2 relative group-hover:opacity-90 transition-opacity">
                                  {collection.coverImage ? (
                                    <img src={getImageUrl(collection.coverImage)} className="w-full h-full object-cover" alt={collection.name} />
                                  ) : (
                                    <Folder className="w-8 h-8 text-muted-foreground" />
                                  )}
                                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                                </div>
                                <h3 className="font-semibold text-sm truncate">{collection.name}</h3>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {activeTab === 'tagged' && (
                    <div className="w-full">
                      <ProfileGrid 
                        posts={taggedPosts} 
                        isLoading={isTaggedLoading}
                        emptyIcon={<Tag className="w-10 h-10 text-foreground" />}
                        emptyTitle="Photos of you"
                        emptyDescription="When people tag you in photos, they'll appear here."
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 mt-8 border-t border-border">
                <div className="w-16 h-16 border-2 border-foreground rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl font-light">🔒</span>
                </div>
                <h2 className="text-[14px] font-semibold text-foreground">This account is private</h2>
                <p className="text-[14px] text-foreground mt-2">Follow to see their photos and videos.</p>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

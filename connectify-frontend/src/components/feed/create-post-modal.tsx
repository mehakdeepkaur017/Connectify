'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPost } from '@/lib/api/posts.api';
import { Button } from '@/components/ui/button';
import { ImageUploader } from './image-uploader';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { X, ArrowLeft, Tag, Search } from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { getImageUrl } from '@/lib/utils';
import { useSearchUsers } from '@/hooks/use-profile';

const postSchema = z.object({
  caption: z.string().max(2200, 'Caption is too long').optional(),
});

type PostValues = z.infer<typeof postSchema>;

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const [images, setImages] = React.useState<File[]>([]);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeView, setActiveView] = React.useState<'create' | 'tag'>('create');
  const [taggedUsers, setTaggedUsers] = React.useState<any[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = React.useState('');
  
  const { data: searchResults, isLoading: isSearchLoading } = useSearchUsers(tagSearchQuery);

  const [mentionQuery, setMentionQuery] = React.useState('');
  const [showMentionAutocomplete, setShowMentionAutocomplete] = React.useState(false);
  const { data: mentionResults } = useSearchUsers(mentionQuery);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const form = useForm<PostValues>({
    resolver: zodResolver(postSchema),
    defaultValues: { caption: '' },
  });

  const mutation = useMutation({
    mutationFn: async (data: { formData: FormData }) => {
      return createPost(data.formData);
    },
    onSuccess: () => {
      toast.success('Post created successfully!');
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      form.reset();
      setImages([]);
      setTaggedUsers([]);
      setActiveView('create');
      onClose();
    },
    onError: () => {
      toast.error('Failed to create post. Please try again.');
    },
  });

  const onSubmit = (data: PostValues) => {
    if (images.length === 0) {
      toast.error('Please select at least one image.');
      return;
    }

    const formData = new FormData();
    formData.append('caption', data.caption || '');
    images.forEach((img) => formData.append('images', img));
    
    if (taggedUsers.length > 0) {
      formData.append('taggedUsers', JSON.stringify(taggedUsers.map(u => u._id)));
    }

    mutation.mutate({ formData });
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // Find the word currently being typed
    const words = val.slice(0, cursorPos).split(/\s/);
    const lastWord = words[words.length - 1];
    
    if (lastWord.startsWith('@') && lastWord.length > 1) {
      setMentionQuery(lastWord.slice(1));
      setShowMentionAutocomplete(true);
    } else {
      setShowMentionAutocomplete(false);
    }
  };

  const handleMentionSelect = (username: string) => {
    const val = form.getValues('caption') || '';
    const cursorPos = textareaRef.current?.selectionStart || 0;
    
    const words = val.slice(0, cursorPos).split(/\s/);
    const lastWord = words[words.length - 1];
    
    if (lastWord.startsWith('@')) {
      const beforeMention = val.slice(0, cursorPos - lastWord.length);
      const afterMention = val.slice(cursorPos);
      const newValue = `${beforeMention}@${username} ${afterMention}`;
      
      form.setValue('caption', newValue);
      setShowMentionAutocomplete(false);
      
      // Try to restore focus
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = beforeMention.length + username.length + 2;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    }
  };

  const toggleUserTag = (tagUser: any) => {
    if (taggedUsers.some(u => u._id === tagUser._id)) {
      setTaggedUsers(taggedUsers.filter(u => u._id !== tagUser._id));
    } else {
      setTaggedUsers([...taggedUsers, tagUser]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          {activeView === 'tag' ? (
            <button type="button" onClick={() => setActiveView('create')} className="p-1 rounded-full hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <h2 className="text-base font-semibold">Create new post</h2>
          )}
          
          {activeView === 'tag' ? (
            <h2 className="text-base font-semibold">Tag people</h2>
          ) : null}

          {activeView === 'tag' ? (
            <button type="button" onClick={() => setActiveView('create')} className="text-primary font-semibold hover:text-primary/80 transition-colors">
              Done
            </button>
          ) : (
            <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {activeView === 'create' ? (
          <>
            {/* Body */}
            <div className="overflow-y-auto p-4 flex-1">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src={getImageUrl(user?.avatar)} 
                  alt="Avatar" 
                  className="w-10 h-10 rounded-full object-cover" 
                />
                <span className="font-semibold">{user?.username}</span>
              </div>

              <form id="create-post-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 relative">
                <textarea
                  {...form.register('caption')}
                  ref={(e) => {
                    form.register('caption').ref(e);
                    // @ts-ignore
                    textareaRef.current = e;
                  }}
                  onChange={(e) => {
                    form.register('caption').onChange(e);
                    handleCaptionChange(e);
                  }}
                  placeholder="Write a caption..."
                  className="w-full bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground min-h-[100px]"
                  maxLength={2200}
                />
                
                {showMentionAutocomplete && mentionResults?.users && mentionResults.users.length > 0 && (
                  <div className="absolute top-[100px] left-0 w-full max-h-[200px] overflow-y-auto bg-card border border-border rounded-xl shadow-lg z-10">
                    {mentionResults.users.map((u: any) => (
                      <div 
                        key={u._id}
                        className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => handleMentionSelect(u.username)}
                      >
                        <img src={getImageUrl(u.avatar)} className="w-8 h-8 rounded-full object-cover" />
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{u.username}</span>
                          <span className="text-xs text-muted-foreground">{u.fullName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <ImageUploader images={images} onImagesChange={setImages} />
                
                <button
                  type="button"
                  onClick={() => setActiveView('tag')}
                  className="flex items-center justify-between w-full py-3 border-y border-border group mt-4"
                >
                  <span className="text-foreground font-medium">Tag people</span>
                  <div className="flex items-center gap-2">
                    {taggedUsers.length > 0 && (
                      <span className="text-muted-foreground text-sm">{taggedUsers.length} people</span>
                    )}
                    <Tag className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
                  </div>
                </button>
              </form>
            </div>

            {/* Footer */}
            <div className="p-4 flex justify-end border-t border-border">
              <Button 
                type="submit" 
                form="create-post-form" 
                disabled={mutation.isPending || images.length === 0}
                className="w-full sm:w-auto"
              >
                {mutation.isPending ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Share Post
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden min-h-[400px]">
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  placeholder="Search for a user..."
                  className="w-full bg-muted text-foreground rounded-xl pl-10 pr-4 py-2 outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                />
              </div>
              
              {taggedUsers.length > 0 && (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {taggedUsers.map(u => (
                    <div key={u._id} className="flex flex-col items-center gap-1 shrink-0">
                      <div className="relative group cursor-pointer" onClick={() => toggleUserTag(u)}>
                        <img src={getImageUrl(u.avatar)} className="w-12 h-12 rounded-full object-cover border border-border" />
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <span className="text-xs text-foreground max-w-[60px] truncate">{u.username}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="overflow-y-auto flex-1 p-2">
              {isSearchLoading ? (
                <div className="flex justify-center p-8">
                  <LoadingSpinner size="default" />
                </div>
              ) : searchResults?.users && searchResults.users.length > 0 ? (
                searchResults.users.map((u: any) => {
                  const isSelected = taggedUsers.some(t => t._id === u._id);
                  return (
                    <div 
                      key={u._id}
                      onClick={() => toggleUserTag(u)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-muted cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img src={getImageUrl(u.avatar)} className="w-10 h-10 rounded-full object-cover" />
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{u.username}</span>
                          <span className="text-xs text-muted-foreground">{u.fullName}</span>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                        {isSelected && <div className="w-2 h-2 bg-primary-foreground rounded-full" />}
                      </div>
                    </div>
                  );
                })
              ) : tagSearchQuery.length > 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  No users found
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground text-sm">
                  Search for users to tag them in your post.
                </div>
              )}
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}

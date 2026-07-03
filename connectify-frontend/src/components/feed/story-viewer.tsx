import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Story, StoryGroup, markStoryViewed, deleteStory, archiveStory, likeStory, replyToStory } from '@/lib/api/stories.api';
import { X, ChevronLeft, ChevronRight, Trash2, Archive, Heart, Send } from 'lucide-react';
import { cn, getImageUrl } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth.context';
import { toast } from 'sonner';
import { SharePostModal } from './share-post-modal';

interface StoryViewerProps {
  storyGroups: StoryGroup[];
  initialGroupIndex: number;
  isOpen: boolean;
  onClose: () => void;
  initialStoryIndex?: number;
}

export function StoryViewer({ storyGroups, initialGroupIndex, isOpen, onClose, initialStoryIndex = 0 }: StoryViewerProps) {
  const [groupIndex, setGroupIndex] = React.useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = React.useState(initialStoryIndex);
  const [isPaused, setIsPaused] = React.useState(false);
  const [replyText, setReplyText] = React.useState('');
  const [duration, setDuration] = React.useState(5000);
  const [isViewersOpen, setIsViewersOpen] = React.useState(false);
  const [viewers, setViewers] = React.useState<any[]>([]);
  // A counter that increments on every story change, used as a key to force remounts
  const [storyKey, setStoryKey] = React.useState(0);
  const [isShareOpen, setIsShareOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Use refs for values that the timer callback needs, to avoid stale closures
  const groupIndexRef = React.useRef(groupIndex);
  const storyIndexRef = React.useRef(storyIndex);
  const storyGroupsRef = React.useRef(storyGroups);
  groupIndexRef.current = groupIndex;
  storyIndexRef.current = storyIndex;
  storyGroupsRef.current = storyGroups;

  // ── Reset all state synchronously when the viewer opens ──
  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setGroupIndex(initialGroupIndex);
      setStoryIndex(0);
      setIsPaused(false);
      setDuration(5000);
      setIsViewersOpen(false);
      setViewers([]);
      setStoryKey(k => k + 1);
    }
  }

  const currentGroup = storyGroups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  // Reset duration to 5s when switching to a non-video story
  React.useEffect(() => {
    if (currentStory?.mediaType !== 'video') {
      setDuration(5000);
    }
  }, [currentStory?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const viewMutation = useMutation({
    mutationFn: (storyId: string) => markStoryViewed(storyId),
    onMutate: (storyId) => {
      // Optimistically update the viewers count in cache IMMEDIATELY
      queryClient.setQueryData(['stories'], (old: any) => {
        if (!old) return old;
        return old.map((g: any) => {
          let hasUnviewedStory = false;
          const updatedStories = g.stories.map((s: any) => {
            if (s._id === storyId && !s.viewers?.includes(user?._id)) {
              return {
                ...s,
                isViewed: true,
                viewers: [...(s.viewers || []), user?._id]
              };
            }
            if (!s.isViewed && s._id !== storyId) {
              hasUnviewedStory = true;
            }
            return s;
          });
          return {
            ...g,
            stories: updatedStories,
            hasUnviewed: hasUnviewedStory
          };
        });
      });
    }
  });

  const handleClose = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['stories'] });
    onClose();
  }, [onClose, queryClient]);
  const handleCloseRef = React.useRef(handleClose);
  handleCloseRef.current = handleClose;

  // ── Navigation using refs so callbacks are always fresh ──
  const nextStory = React.useCallback(() => {
    const gi = groupIndexRef.current;
    const si = storyIndexRef.current;
    const groups = storyGroupsRef.current;
    const group = groups[gi];
    if (!group) return;

    if (si < group.stories.length - 1) {
      setStoryIndex(si + 1);
    } else if (gi < groups.length - 1) {
      setGroupIndex(gi + 1);
      setStoryIndex(0);
    } else {
      handleCloseRef.current();
    }
    setStoryKey(k => k + 1);
    setIsPaused(false);
    setDuration(5000);
  }, []); // stable — never changes, uses refs internally

  const prevStory = React.useCallback(() => {
    const gi = groupIndexRef.current;
    const si = storyIndexRef.current;
    const groups = storyGroupsRef.current;

    if (si > 0) {
      setStoryIndex(si - 1);
    } else if (gi > 0) {
      const prevGroup = groups[gi - 1];
      setGroupIndex(gi - 1);
      setStoryIndex(prevGroup.stories.length - 1);
    }
    setStoryKey(k => k + 1);
    setIsPaused(false);
    setDuration(5000);
  }, []); // stable — never changes, uses refs internally

  // ── Mutations ──
  const deleteMutation = useMutation({
    mutationFn: (storyId: string) => deleteStory(storyId),
    onSuccess: () => {
      toast.success('Story deleted');
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      onClose();
    }
  });

  const archiveMutation = useMutation({
    mutationFn: (storyId: string) => archiveStory(storyId),
    onSuccess: () => {
      toast.success('Story archived');
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      onClose();
    }
  });

  const likeMutation = useMutation({
    mutationFn: (storyId: string) => likeStory(storyId),
    onMutate: async (storyId) => {
      await queryClient.cancelQueries({ queryKey: ['stories'] });
      const previous = queryClient.getQueryData(['stories']);
      queryClient.setQueryData(['stories'], (old: any) => {
        if (!old) return old;
        return old.map((g: any) => ({
          ...g,
          stories: g.stories.map((s: any) => {
            if (s._id === storyId) {
              const hasLiked = s.likes?.includes(user?._id);
              return {
                ...s,
                likes: hasLiked
                  ? s.likes.filter((id: string) => id !== user?._id)
                  : [...(s.likes || []), user?._id]
              };
            }
            return s;
          })
        }));
      });
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['stories'], context.previous);
      }
    },
    // Don't invalidate while the viewer is open — it causes reordering/stuck bugs
  });

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    try {
      await replyToStory(currentStory._id, replyText);
      toast.success(`Replied to ${currentGroup?.author.username}`);
      setReplyText('');
    } catch (error) {
      toast.error('Failed to reply to story');
    }
    setIsPaused(false);
  };

  const handleQuickReaction = async (emoji: string) => {
    try {
      await replyToStory(currentStory._id, undefined, emoji);
      toast.success('Sent quick reaction');
    } catch (error) {
      toast.error('Failed to send reaction');
    }
  };

  // ── Keyboard navigation ──
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (isViewersOpen) return;

      if (e.key === 'ArrowRight') nextStory();
      if (e.key === 'ArrowLeft') prevStory();
      if (e.key === 'Escape') handleClose();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPaused(p => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, nextStory, prevStory, handleClose, isViewersOpen]);

  // ── Auto-advance timer (images only — videos use onEnded) ──
  React.useEffect(() => {
    if (!isOpen || !currentStory || isPaused || isViewersOpen) return;

    // Mark as viewed
    if (!currentStory.isViewed && currentStory.author._id !== user?._id) {
      viewMutation.mutate(currentStory._id);
    }

    if (currentStory.mediaType === 'video') return;

    const timer = setTimeout(() => {
      nextStory();
    }, duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, storyKey, isPaused, isViewersOpen, duration]);

  const loadViewers = async () => {
    setIsPaused(true);
    setIsViewersOpen(true);
    try {
      const { api } = await import('@/lib/axios');
      const res = await api.get(`/stories/${currentStory._id}/viewers`);
      setViewers(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen || !currentStory) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur-sm"
      >
        {/* Close button */}
        <button onClick={handleClose} className="absolute top-4 right-4 text-white hover:text-white/80 z-50">
          <X className="w-8 h-8" />
        </button>

        {/* ← Previous arrow (outside card, Instagram Web style) */}
        <button
          onClick={(e) => { e.stopPropagation(); prevStory(); }}
          className="absolute left-4 md:left-[calc(50%-260px)] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 items-center justify-center text-white hover:bg-white/40 hidden md:flex z-50 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* → Next arrow (outside card, Instagram Web style) */}
        <button
          onClick={(e) => { e.stopPropagation(); nextStory(); }}
          className="absolute right-4 md:right-[calc(50%-260px)] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 items-center justify-center text-white hover:bg-white/40 hidden md:flex z-50 transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Story card */}
        <div className="relative w-full max-w-[400px] h-[80vh] md:h-[90vh] bg-black rounded-lg overflow-hidden flex flex-col mx-auto shadow-2xl">
          {/* Progress Bars */}
          <div className="absolute top-0 inset-x-0 p-2 flex gap-1 z-20">
            {currentGroup.stories.map((s, i) => (
              <div key={s._id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                {i < storyIndex ? (
                  // Completed bars — instant fill
                  <div className="h-full w-full bg-white" />
                ) : i === storyIndex ? (
                  // Active bar — animate from 0 to 100%
                  <motion.div
                    key={storyKey}
                    className="h-full bg-white"
                    initial={{ width: '0%' }}
                    animate={{ width: isPaused ? undefined : '100%' }}
                    transition={isPaused ? { duration: 0 } : { duration: duration / 1000, ease: 'linear' }}
                    style={isPaused ? {} : undefined}
                  />
                ) : (
                  // Future bars — empty
                  <div className="h-full w-0 bg-white" />
                )}
              </div>
            ))}
          </div>

          {/* Header (avatar, username, actions) */}
          <div className="absolute top-4 inset-x-0 p-4 flex items-center justify-between z-30">
            <div className="flex items-center gap-2">
              <img
                src={getImageUrl(currentGroup.author.avatar) || undefined}
                alt={currentGroup.author.username}
                className="w-8 h-8 rounded-full border border-white/50"
              />
              <span className="text-white font-semibold text-sm shadow-sm">{currentGroup.author.username}</span>
            </div>
            {user?._id === currentGroup.author._id && (
              <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
                <button
                  onClick={(e) => { e.stopPropagation(); archiveMutation.mutate(currentStory._id); }}
                  className="text-white hover:text-white/80 transition"
                  title="Archive Story"
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(currentStory._id); }}
                  className="text-red-400 hover:text-red-300 transition"
                  title="Delete Story"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Story media with tap zones */}
          <StoryMediaContainer
            key={storyKey}
            currentStory={currentStory}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            onPrev={prevStory}
            onNext={nextStory}
            setDuration={setDuration}
          />

          {/* Footer controls (Reply & Like) */}
          <div className="absolute bottom-0 inset-x-0 p-4 flex gap-3 z-30 bg-gradient-to-t from-black/80 to-transparent">
            {user?._id !== currentGroup.author._id && (
              <>
                <form onSubmit={handleReply} className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={`Reply to ${currentGroup.author.username}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onFocus={() => setIsPaused(true)}
                    onBlur={() => setIsPaused(false)}
                    className="w-full bg-transparent border border-white/40 rounded-full px-4 py-2.5 text-white text-sm placeholder:text-white/70 focus:outline-none focus:border-white transition-colors"
                  />
                  {replyText && (
                    <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-white font-semibold text-sm">
                      Send
                    </button>
                  )}
                </form>
                <button
                  onClick={() => likeMutation.mutate(currentStory._id)}
                  className="w-10 h-10 flex items-center justify-center text-white shrink-0"
                >
                  <Heart className={cn("w-7 h-7 transition-colors", currentStory.likes?.includes(user?._id as string) ? "fill-red-500 text-red-500" : "hover:text-white/70")} />
                </button>
                <button
                  onClick={() => { setIsPaused(true); setIsShareOpen(true); }}
                  className="w-10 h-10 flex items-center justify-center text-white shrink-0 hover:text-white/70"
                >
                  <Send className="w-6 h-6" />
                </button>
              </>
            )}

            {user?._id === currentGroup.author._id && (
              <div className="flex w-full justify-between items-center px-2 py-1">
                <div
                  onClick={loadViewers}
                  className="flex items-center gap-2 cursor-pointer text-white hover:text-white/80 transition-colors bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md"
                >
                  <span className="text-sm font-semibold">{currentStory.viewers?.length || 0} {(currentStory.viewers?.length || 0) === 1 ? 'view' : 'views'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setIsPaused(true); setIsShareOpen(true); }}
                    className="flex items-center justify-center text-white hover:text-white/80 bg-black/40 p-2 rounded-full backdrop-blur-md transition-colors"
                    title="Share Story"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-1 text-white bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
                    <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                    <span className="text-sm font-semibold">{currentStory.likes?.length || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Viewers panel */}
          <AnimatePresence>
            {isViewersOpen && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-x-0 bottom-0 bg-background h-[60%] rounded-t-3xl z-50 flex flex-col overflow-hidden border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
              >
                <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10">
                  <h3 className="font-semibold text-lg">Views</h3>
                  <button onClick={() => { setIsViewersOpen(false); setIsPaused(false); }} className="p-2 hover:bg-muted rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {viewers.length === 0 ? (
                    <div className="text-center text-muted-foreground mt-10">No views yet</div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {viewers.map((viewer: any) => (
                        <div key={viewer._id} className="flex items-center gap-3">
                          <img src={getImageUrl(viewer.avatar) || undefined} className="w-12 h-12 rounded-full object-cover border border-border" alt={viewer.username} />
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">{viewer.username}</span>
                            {viewer.fullName && <span className="text-muted-foreground text-xs">{viewer.fullName}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Share Story Modal */}
        <SharePostModal
          isOpen={isShareOpen}
          onClose={() => { setIsShareOpen(false); setIsPaused(false); }}
          storyId={currentStory._id}
        />
      </motion.div>
    </AnimatePresence>
  );
}

// ── StoryMediaContainer ──
// Handles: media rendering, tap-to-navigate zones, long-press-to-pause

interface StoryMediaContainerProps {
  currentStory: Story & { isViewed?: boolean };
  isPaused: boolean;
  setIsPaused: (v: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
  setDuration: (d: number) => void;
}

function StoryMediaContainer({ currentStory, isPaused, setIsPaused, onPrev, onNext, setDuration }: StoryMediaContainerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const pointerDownTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = React.useRef(false);
  const wasLongPressRef = React.useRef(false);

  // Sync video play/pause with isPaused state
  React.useEffect(() => {
    if (!videoRef.current) return;
    if (isPaused) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [isPaused]);

  const handlePointerDown = () => {
    isLongPressRef.current = false;
    wasLongPressRef.current = false;
    pointerDownTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      wasLongPressRef.current = true;
      setIsPaused(true);
    }, 200);
  };

  const handlePointerUp = () => {
    if (pointerDownTimerRef.current) {
      clearTimeout(pointerDownTimerRef.current);
      pointerDownTimerRef.current = null;
    }

    if (isLongPressRef.current) {
      setIsPaused(false);
      isLongPressRef.current = false;
    }
  };

  const handlePointerLeave = () => {
    if (pointerDownTimerRef.current) {
      clearTimeout(pointerDownTimerRef.current);
      pointerDownTimerRef.current = null;
    }
    if (isLongPressRef.current) {
      setIsPaused(false);
      isLongPressRef.current = false;
    }
  };

  return (
    <>
      {/* Combined media + navigation + pause container */}
      <div
        className="w-full h-full relative select-none z-10"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        {/* Invisible Tap Zones — left half = prev, right half = next */}
        <div
          className="absolute inset-y-0 left-0 w-1/2 z-20 cursor-pointer"
          onClick={() => {
            if (wasLongPressRef.current) { wasLongPressRef.current = false; return; }
            onPrev();
          }}
        />
        <div
          className="absolute inset-y-0 right-0 w-1/2 z-20 cursor-pointer"
          onClick={() => {
            if (wasLongPressRef.current) { wasLongPressRef.current = false; return; }
            onNext();
          }}
        />

        {currentStory.mediaType === 'image' && currentStory.mediaUrl ? (
          <img
            src={getImageUrl(currentStory.mediaUrl)}
            alt="Story"
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
        ) : currentStory.mediaType === 'video' && currentStory.mediaUrl ? (
          <video
            ref={videoRef}
            src={getImageUrl(currentStory.mediaUrl)}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover pointer-events-none"
            onLoadedMetadata={(e) => {
              const vid = e.target as HTMLVideoElement;
              setDuration(vid.duration * 1000);
            }}
            onEnded={onNext}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-8 text-center pointer-events-none" />
        )}

        {/* Render Metadata Layers (Text) */}
        {currentStory.metadata?.layers && currentStory.metadata.layers.map((layer: any) => (
          <div
            key={layer.id}
            className="absolute text-center whitespace-pre-wrap break-words pointer-events-none"
            style={{
              left: typeof layer.x === 'number' ? `calc(50% + ${layer.x}px)` : '50%',
              top: typeof layer.y === 'number' ? `calc(50% + ${layer.y}px)` : '50%',
              transform: `translate(-50%, -50%) scale(${layer.scale || 1})`,
              color: layer.color || '#fff',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}
          >
            <span className="text-3xl font-bold font-sans">{layer.text}</span>
          </div>
        ))}
      </div>
    </>
  );
}

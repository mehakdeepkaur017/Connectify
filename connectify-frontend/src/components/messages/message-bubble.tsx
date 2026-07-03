import * as React from 'react';
import { Message } from '@/lib/api/messages.api';
import { getImageUrl, formatInstagramDate } from '@/lib/utils';
import { useAuth } from '@/contexts/auth.context';
import { cn } from '@/lib/utils';
import { MoreHorizontal, Reply, Trash2, Copy, Edit2, PlaySquare, Play, Pause, Forward, Headphones } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteMessage, reactToMessage } from '@/lib/api/messages.api';
import Link from 'next/link';

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
  otherUserId?: string;
  isOptimistic?: boolean;
  onReply?: (msg: Message) => void;
  onEdit?: (msg: Message) => void;
  isLatest?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

export function MessageBubble({ message, showAvatar = true, otherUserId, isOptimistic, onReply, onEdit, isLatest, isFirstInGroup = true, isLastInGroup = true }: MessageBubbleProps) {
  const { user } = useAuth();
  const [showOptions, setShowOptions] = React.useState(false);
  const [fullscreenImage, setFullscreenImage] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

  const reactMutation = useMutation({
    mutationFn: (emoji: string) => reactToMessage(message._id, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', message.conversationId] });
      setShowOptions(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, type }: { id: string, type: 'me' | 'everyone' }) => deleteMessage(id, type),
    onSuccess: (_, variables) => {
      if (variables.type === 'me') {
        queryClient.setQueryData(['messages', message.conversationId], (oldData: unknown) => {
          if (!oldData) return oldData;
          const data = oldData as { pages: { messages: Message[] }[] };
          return {
            ...data,
            pages: data.pages.map(page => ({
              ...page,
              messages: page.messages.filter(m => m._id !== message._id)
            }))
          };
        });
      }
    }
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
  };

  if (!user) return null;

  const isMe = typeof message.sender !== 'string' && message.sender._id === user._id;
  const senderUser = typeof message.sender !== 'string' ? message.sender : null;

  return (
    <div 
      className={cn(
        "flex w-full group relative",
        isLastInGroup ? "mb-2" : "mb-0.5",
        isMe ? "justify-end" : "justify-start"
      )}
      onMouseEnter={() => setShowOptions(true)}
      onMouseLeave={() => setShowOptions(false)}
    >
      {!isMe && (
        <div className="shrink-0 flex items-end mr-2 w-6 sm:w-8">
          {showAvatar && (
            <img 
              src={getImageUrl(senderUser?.avatar) || undefined} 
              alt={senderUser?.username}
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border border-border"
            />
          )}
        </div>
      )}

      {isMe && showOptions && (
        <div className="flex items-center mr-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity gap-1">
          <div className="flex items-center gap-1 bg-background border border-border rounded-full px-2 py-1 shadow-sm">
            {['❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
              <button 
                key={emoji}
                onClick={() => reactMutation.mutate(emoji)}
                className="hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 hover:bg-muted rounded-full outline-none flex items-center justify-center">
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onReply?.(message)}>
                <Reply className="w-4 h-4 mr-2" /> Reply
              </DropdownMenuItem>
              {message.messageType === 'text' && (
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-2" /> Copy
                </DropdownMenuItem>
              )}
              {message.messageType === 'text' && onEdit && (
                <DropdownMenuItem onClick={() => onEdit(message)}>
                  <Edit2 className="w-4 h-4 mr-2" /> Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => {}}>
                <Forward className="w-4 h-4 mr-2" /> Forward
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => deleteMutation.mutate({ id: message._id, type: 'me' })}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete for me
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => deleteMutation.mutate({ id: message._id, type: 'everyone' })}
                className="text-red-500 focus:text-red-500"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Unsend
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setFullscreenImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors p-2"
            onClick={(e) => { e.stopPropagation(); setFullscreenImage(null); }}
          >
            <Trash2 className="w-6 h-6 hidden" />
            <span className="text-2xl font-bold">&times;</span>
          </button>
          <img 
            src={fullscreenImage} 
            alt="Fullscreen view" 
            className="max-w-full max-h-full object-contain select-none rounded-md" 
          />
        </div>
      )}

      <div className={cn(
        "max-w-[70%] flex flex-col relative",
        isMe ? "items-end" : "items-start",
        (message as any).reactions?.length > 0 ? "mb-3" : ""
      )}>
        {message.repliedTo && typeof message.repliedTo !== 'string' && (
          <div className={cn("text-xs text-muted-foreground mb-1 max-w-full truncate opacity-70", isMe ? "text-right" : "text-left")}>
            Replying to {message.repliedTo.text || 'attachment'}
          </div>
        )}
        {message.messageType === 'text' && (
          <div 
            className={cn(
              "px-4 py-2 text-[15px] whitespace-pre-wrap break-words max-w-[85%]",
              isMe ? "bg-blue-500 text-white" : "bg-muted text-foreground",
              isMe 
                ? cn("rounded-l-2xl", isFirstInGroup ? "rounded-tr-2xl" : "rounded-tr-[4px]", isLastInGroup ? "rounded-br-2xl" : "rounded-br-[4px]")
                : cn("rounded-r-2xl", isFirstInGroup ? "rounded-tl-2xl" : "rounded-tl-[4px]", isLastInGroup ? "rounded-bl-2xl" : "rounded-bl-[4px]")
            )}
          >
            {message.text}
          </div>
        )}

        {message.messageType === 'story_reply' && message.text && (
          <div className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
            <div className={cn("text-xs text-muted-foreground italic mb-1", isMe ? "text-right" : "text-left")}>
              Replied to {isMe ? 'their' : 'your'} story
            </div>
            {message.storyId && typeof message.storyId !== 'string' && (
              <div className="relative rounded-lg overflow-hidden border border-border/50 max-w-[150px] mb-1 opacity-90 cursor-pointer">
                {(message.storyId as any).mediaType === 'video' ? (
                  <video src={getImageUrl((message.storyId as any).mediaUrl)} className="w-full object-cover aspect-[9/16]" />
                ) : (message.storyId as any).mediaUrl ? (
                  <img src={getImageUrl((message.storyId as any).mediaUrl)} className="w-full object-cover aspect-[9/16]" onClick={() => setFullscreenImage(getImageUrl((message.storyId as any).mediaUrl))} />
                ) : (
                  <div className="w-full aspect-[9/16] bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center p-2">
                    <span className="text-white text-xs font-medium text-center truncate">{(message.storyId as any).text || 'Text Story'}</span>
                  </div>
                )}
              </div>
            )}
            <div 
              className={cn(
                "px-4 py-2 text-[15px] whitespace-pre-wrap break-words max-w-full",
                isMe ? "bg-blue-500 text-white" : "bg-muted text-foreground",
                isMe 
                  ? cn("rounded-l-2xl", isFirstInGroup ? "rounded-tr-2xl" : "rounded-tr-[4px]", isLastInGroup ? "rounded-br-2xl" : "rounded-br-[4px]")
                  : cn("rounded-r-2xl", isFirstInGroup ? "rounded-tl-2xl" : "rounded-tl-[4px]", isLastInGroup ? "rounded-bl-2xl" : "rounded-bl-[4px]")
              )}
            >
              {message.text}
            </div>
          </div>
        )}

        {(message.messageType === 'story_share' || (message.messageType === 'story_reply' && !message.text)) && (
          <div className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
            <div className={cn("text-xs text-muted-foreground italic mb-1", isMe ? "text-right" : "text-left")}>
              {isMe 
                ? `You shared ${(message.storyId as any)?.author?.username || 'a'}${!(message.storyId as any)?.author?.username ? '' : "'s"} story`
                : `Shared ${(message.storyId as any)?.author?.username || 'a'}${!(message.storyId as any)?.author?.username ? '' : "'s"} story`}
            </div>
            {message.storyId && typeof message.storyId !== 'string' && (
              <div className="relative rounded-lg overflow-hidden border border-border/50 max-w-[150px] mb-1 opacity-90 cursor-pointer">
                {(message.storyId as any).mediaType === 'video' ? (
                  <video src={getImageUrl((message.storyId as any).mediaUrl)} className="w-full object-cover aspect-[9/16]" />
                ) : (message.storyId as any).mediaUrl ? (
                  <img src={getImageUrl((message.storyId as any).mediaUrl)} className="w-full object-cover aspect-[9/16]" onClick={() => setFullscreenImage(getImageUrl((message.storyId as any).mediaUrl))} />
                ) : (
                  <div className="w-full aspect-[9/16] bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center p-2">
                    <span className="text-white text-xs font-medium text-center truncate">{(message.storyId as any).text || 'Text Story'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {message.messageType === 'image' && (
          <div className={cn("grid gap-1", message.images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
            {message.images.map((img, i) => (
              <img 
                key={i} 
                src={getImageUrl(img)} 
                alt="Sent image" 
                onClick={() => setFullscreenImage(getImageUrl(img))}
                className="max-w-[200px] md:max-w-[250px] rounded-2xl object-cover cursor-pointer hover:opacity-90 border border-border/50 transition-opacity"
              />
            ))}
          </div>
        )}

        {message.messageType === 'video' && message.videoUrl && (
          <div className="relative rounded-2xl overflow-hidden border border-border/50 max-w-[250px]">
            <video src={getImageUrl(message.videoUrl)} controls className="w-full object-cover rounded-2xl" />
          </div>
        )}

        {message.messageType === 'voice' && message.voiceUrl && (
          <div className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-2xl",
            isMe ? "bg-blue-500 text-white" : "bg-muted text-foreground"
          )}>
            <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Play className="w-4 h-4 fill-current" />
            </button>
            <div className="w-[100px] h-1 bg-white/30 rounded-full overflow-hidden">
              <div className="w-0 h-full bg-current rounded-full" />
            </div>
            <span className="text-xs font-medium">0:00</span>
          </div>
        )}

        {message.messageType === 'gif' && message.gifUrl && (
          <img src={message.gifUrl} alt="GIF" className="max-w-[200px] rounded-2xl object-cover" />
        )}

        {(message.messageType === 'post_share' && message.postId) || (message.messageType === 'reel_share' && message.reelId) ? (
          <div className="flex flex-col max-w-[250px] bg-background border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 p-3 border-b border-border">
              <img 
                src={getImageUrl((message.postId || message.reelId).author?.avatar) || undefined} 
                alt="Author" 
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="font-semibold text-sm">{(message.postId || message.reelId).author?.username}</span>
            </div>
            {message.messageType === 'post_share' && message.postId?.images?.length > 0 && (
              <img 
                src={getImageUrl(message.postId.images[0])} 
                alt="Post preview" 
                className="w-full aspect-square object-cover"
              />
            )}
            {message.messageType === 'reel_share' && message.reelId?.videoUrl && (
              <video 
                src={getImageUrl(message.reelId.videoUrl)} 
                className="w-full aspect-[9/16] object-cover"
              />
            )}
            <div className="p-3 bg-muted/30">
              <p className="text-sm line-clamp-2 text-foreground">
                <span className="font-semibold mr-1">{(message.postId || message.reelId).author?.username}</span>
                {(message.postId || message.reelId).caption}
              </p>
              <Link href={message.postId ? `/post/${message.postId._id}` : (message.reelId ? `/post/${message.reelId._id}` : '#')} className="text-blue-500 text-xs font-semibold mt-2 inline-block hover:underline">
                View {message.postId ? 'Post' : 'Reel'}
              </Link>
            </div>
          </div>
        ) : null}

        {message.messageType === 'profile_share' && message.sharedProfileId && (
          <div className="flex flex-col max-w-[250px] min-w-[200px] bg-background border border-border rounded-2xl overflow-hidden items-center p-4">
            <img 
              src={getImageUrl(message.sharedProfileId.avatar) || undefined} 
              alt="Shared Profile" 
              className="w-20 h-20 rounded-full object-cover mb-2"
            />
            <span className="font-bold text-base">{message.sharedProfileId.fullName || message.sharedProfileId.username}</span>
            <span className="text-muted-foreground text-sm mb-4">@{message.sharedProfileId.username}</span>
            <Link 
              href={`/profile/${message.sharedProfileId.username}`} 
              className="w-full text-center bg-primary text-primary-foreground text-sm font-semibold py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              View Profile
            </Link>
          </div>
        )}

        {/* Small metadata like edited and status */}
        <div className={cn("flex items-center gap-2 mt-0.5 mx-1", isMe ? "justify-end" : "justify-start")}>
          {message.isEdited && (
            <span className="text-[10px] text-muted-foreground">Edited</span>
          )}
          {isMe && isLatest && (
            <span className="text-[10px] text-muted-foreground font-medium">
              {isOptimistic ? 'Sending...' : (
                message.seenBy?.includes(otherUserId || '') ? 'Seen' : 
                message.status === 'delivered' ? 'Delivered' : 'Sent'
              )}
            </span>
          )}
        </div>

        {/* Reactions */}
        {(message as any).reactions && (message as any).reactions.length > 0 && (
          <div className={cn(
            "absolute -bottom-3 flex bg-background border border-border rounded-full px-1.5 py-0.5 shadow-sm text-xs",
            isMe ? "right-2" : "left-2"
          )}>
            {(message as any).reactions.slice(0, 3).map((r: any, i: number) => (
              <span key={i}>{r.emoji}</span>
            ))}
            {(message as any).reactions.length > 3 && (
              <span className="ml-1 text-[10px] font-medium">+{(message as any).reactions.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {!isMe && showOptions && (
        <div className="flex items-center ml-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1 hover:bg-muted rounded-full outline-none flex items-center justify-center">
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onReply?.(message)}>
                <Reply className="w-4 h-4 mr-2" /> Reply
              </DropdownMenuItem>
              {message.messageType === 'text' && (
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-2" /> Copy
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {}}>
                <Forward className="w-4 h-4 mr-2" /> Forward
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => deleteMutation.mutate({ id: message._id, type: 'me' })}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete for me
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex items-center gap-1 bg-background border border-border rounded-full px-2 py-1 shadow-sm">
            {['❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
              <button 
                key={emoji}
                onClick={() => reactMutation.mutate(emoji)}
                className="hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

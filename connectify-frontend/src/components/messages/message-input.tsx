import * as React from 'react';
import { Image as ImageIcon, Send, SmilePlus, X, Paperclip, Smile, Mic, Heart } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendMessage, editMessage as editMessageAPI, Message, Conversation } from '@/lib/api/messages.api';
import { useAuth } from '@/contexts/auth.context';
import { useSocket } from '@/hooks/use-messages';
import EmojiPicker, { Theme } from 'emoji-picker-react';

interface MessageInputProps {
  conversationId: string;
  replyTo?: Message | null;
  editMessage?: Message | null;
  onClearReply?: () => void;
  onClearEdit?: () => void;
}

export function MessageInput({ conversationId, replyTo, editMessage, onClearReply, onClearEdit }: MessageInputProps) {
  const [text, setText] = React.useState('');
  const [showEmoji, setShowEmoji] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const socket = useSocket();
  const typingTimeoutRef = React.useRef<NodeJS.Timeout>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  
  React.useEffect(() => {
    if (editMessage) {
      setText(editMessage.text);
    }
  }, [editMessage]);

  React.useEffect(() => {
    if (textareaRef.current) {
      if (!text) {
        textareaRef.current.style.height = 'auto';
      } else {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 96)}px`;
      }
    }
  }, [text]);

  const editMutation = useMutation({
    mutationFn: (newText: string) => editMessageAPI(editMessage!._id, newText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      onClearEdit?.();
      setText('');
    }
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => sendMessage(conversationId, data),
    onMutate: async (data: FormData) => {
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });
      const previousMessages = queryClient.getQueryData(['messages', conversationId]);
      
      const textVal = data.get('text') as string;
      const images = data.getAll('images') as File[];
      const tempId = 'temp-' + Date.now().toString();
      
      const tempMessage = {
        _id: tempId,
        conversationId,
        sender: { _id: user?._id, username: user?.username, avatar: user?.avatar },
        text: textVal || '',
        images: images.map(file => URL.createObjectURL(file)),
        messageType: images.length > 0 ? 'image' : 'text',
        seenBy: [user?._id],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      queryClient.setQueryData(['messages', conversationId], (oldData: unknown) => {
        if (!oldData) return oldData;
        const data = oldData as { pages: { messages: Message[] }[] };
        const firstPage = data.pages[0];
        return {
          ...data,
          pages: [
            {
              ...firstPage,
              messages: [tempMessage, ...firstPage.messages],
            },
            ...data.pages.slice(1),
          ],
        };
      });
      
      setText('');
      return { previousMessages, tempId };
    },
    onError: (err, newTodo, context: unknown) => {
      const ctx = context as { previousMessages: unknown, tempId: string };
      if (ctx?.previousMessages) {
        queryClient.setQueryData(['messages', conversationId], ctx.previousMessages);
      }
    },
    onSuccess: (newMessage, variables, context: unknown) => {
      const ctx = context as { previousMessages: unknown, tempId: string };
      queryClient.setQueryData(['messages', conversationId], (oldData: unknown) => {
        if (!oldData) return oldData;
        const data = oldData as { pages: { messages: Message[] }[] };
        
        // Check if the message was already added by socket
        const alreadyExists = data.pages.some(page => page.messages.some(m => m._id === newMessage._id));

        return {
          ...data,
          pages: data.pages.map(page => ({
            ...page,
            messages: alreadyExists 
              ? page.messages.filter(m => m._id !== ctx?.tempId) // Remove temp if real already exists
              : page.messages.map(m => m._id === ctx?.tempId ? newMessage : m) // Replace temp with real
          }))
        };
      });
    }
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() && !mutation.isPending) return;

    const formData = new FormData();
    formData.append('text', text);
    if (replyTo) {
      formData.append('repliedTo', replyTo._id);
    }
    
    mutation.mutate(formData);
    onClearReply?.();
    
    // Stop typing
    if (socket && user) {
      const convs = queryClient.getQueryData(['conversations']) as { pages: { conversations: Conversation[] }[] };
      let receiverId = null;
      if (convs) {
        for (const page of convs.pages) {
          const c = page.conversations.find((c) => c._id === conversationId);
          if (c) {
            const receiver = c.participants.find((p: { _id?: string }) => typeof p !== 'string' && p._id !== user._id);
            if (receiver && typeof receiver !== 'string') receiverId = receiver._id;
            break;
          }
        }
      }
      if (receiverId) {
        socket.emit('stopTyping', { conversationId, receiverId });
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    
    // Auto-expand textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`; // max-h-24 is 96px

    // Emit typing event
    if (socket && user) {
      const convs = queryClient.getQueryData(['conversations']) as { pages: { conversations: Conversation[] }[] };
      let receiverId = null;
      if (convs) {
        for (const page of convs.pages) {
          const c = page.conversations.find((c) => c._id === conversationId);
          if (c) {
            const receiver = c.participants.find((p: { _id?: string }) => typeof p !== 'string' && p._id !== user._id);
            if (receiver && typeof receiver !== 'string') receiverId = receiver._id;
            break;
          }
        }
      }
      if (receiverId) {
        socket.emit('typing', { conversationId, receiverId });
        
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('stopTyping', { conversationId, receiverId });
        }, 3000);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editMessage) {
        if (!text.trim()) return;
        editMutation.mutate(text);
      } else {
        handleSubmit();
      }
    }
    if (e.key === 'Escape') {
      setShowEmoji(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
      }
      mutation.mutate(formData);
    }
  };

  return (
    <div className="p-4 bg-background relative flex flex-col gap-2">
      {replyTo && (
        <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-2 border border-border">
          <div className="flex flex-col">
            <span className="text-xs font-semibold">Replying to {typeof replyTo.sender !== 'string' ? replyTo.sender.username : 'User'}</span>
            <span className="text-sm text-muted-foreground line-clamp-1">{replyTo.text || 'Attachment'}</span>
          </div>
          <button onClick={onClearReply} className="p-1 rounded-full hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {editMessage && (
        <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-2 border border-border text-primary">
          <div className="flex flex-col">
            <span className="text-xs font-semibold">Editing Message</span>
          </div>
          <button onClick={() => { onClearEdit?.(); setText(''); }} className="p-1 rounded-full hover:bg-muted text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {showEmoji && (
        <div className="absolute bottom-16 left-4 z-50">
          <EmojiPicker 
            onEmojiClick={(emoji) => setText(prev => prev + emoji.emoji)}
            theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT}
            width={300}
            height={400}
          />
        </div>
      )}
      <form 
        onSubmit={handleSubmit}
        className="flex items-end gap-2 border border-border rounded-full px-4 py-2 bg-background focus-within:border-muted-foreground transition-colors"
      >
        <button 
          type="button"
          onClick={() => setShowEmoji(!showEmoji)}
          className="p-1.5 shrink-0 text-foreground hover:text-muted-foreground"
        >
          <Smile className="w-6 h-6" />
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          autoFocus
          className="flex-1 bg-transparent resize-none max-h-24 py-1.5 outline-none text-[15px] placeholder:text-muted-foreground scrollbar-hide min-h-[32px] overflow-hidden"
          rows={1}
          disabled={mutation.isPending}
          style={{ height: 'auto' }}
        />

        {!text.trim() ? (
          <div className="flex items-center gap-1">
            <button 
              type="button"
              className="p-1.5 shrink-0 text-foreground hover:text-muted-foreground hidden sm:block"
            >
              <Mic className="w-6 h-6" />
            </button>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 shrink-0 text-foreground hover:text-muted-foreground"
            >
              <ImageIcon className="w-6 h-6" />
            </button>
            <button 
              type="button"
              onClick={() => mutation.mutate(new FormData())} // Could be configured to just send a heart
              className="p-1.5 shrink-0 text-foreground hover:text-muted-foreground"
            >
              <Heart className="w-6 h-6" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple 
              accept="image/*,video/*"
              onChange={handleImageUpload}
            />
          </div>
        ) : (
          <button 
            type="submit"
            onClick={(e) => {
              if (editMessage) {
                e.preventDefault();
                editMutation.mutate(text);
              }
            }}
            disabled={mutation.isPending || editMutation.isPending}
            className="p-1.5 shrink-0 text-primary font-semibold hover:text-primary/80 disabled:opacity-50"
          >
            {editMessage ? 'Save' : 'Send'}
          </button>
        )}
      </form>
    </div>
  );
}

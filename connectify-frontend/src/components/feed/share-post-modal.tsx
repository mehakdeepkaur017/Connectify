import * as React from 'react';
import { X, Search } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth.context';
import { getImageUrl, cn } from '@/lib/utils';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getUserFollowing, getUserFollowers } from '@/lib/api/users.api';
import { createConversation, sendMessage } from '@/lib/api/messages.api';
import { toast } from 'sonner';
import { LoadingSpinner } from '../ui/loading-spinner';

interface SharePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  profileId?: string;
  storyId?: string;
}

export function SharePostModal({ isOpen, onClose, postId, profileId, storyId }: SharePostModalProps) {
  const { user } = useAuth();
  const [query, setQuery] = React.useState('');
  const [selectedUsers, setSelectedUsers] = React.useState<string[]>([]);
  const [isSending, setIsSending] = React.useState(false);

  // Fetch both following and followers to build a contact list
  const { data: following, isLoading: loadingFollowing } = useQuery({
    queryKey: ['following', user?._id],
    queryFn: () => getUserFollowing(user!._id),
    enabled: isOpen && !!user,
  });

  const { data: followers, isLoading: loadingFollowers } = useQuery({
    queryKey: ['followers', user?._id],
    queryFn: () => getUserFollowers(user!._id),
    enabled: isOpen && !!user,
  });

  // Combine and deduplicate
  const contacts = React.useMemo(() => {
    if (!following && !followers) return [];
    const map = new Map();
    [...(following || []), ...(followers || [])].forEach((u) => {
      if (!map.has(u._id)) {
        map.set(u._id, u);
      }
    });
    return Array.from(map.values());
  }, [following, followers]);

  const filteredContacts = contacts.filter((c) =>
    c.username?.toLowerCase().includes(query.toLowerCase()) ||
    c.fullName?.toLowerCase().includes(query.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedUsers(prev => [...prev, userId]);
    }
  };

  const handleSend = async () => {
    if (selectedUsers.length === 0) return;
    setIsSending(true);

    try {
      // For each selected user, ensure a conversation exists, then send the post or profile
      for (const userId of selectedUsers) {
        const conv = await createConversation(userId);
        const formData = new FormData();
        if (postId) formData.append('postId', postId);
        if (profileId) formData.append('sharedProfileId', profileId);
        if (storyId) formData.append('storyId', storyId);
        await sendMessage(conv._id, formData);
      }
      toast.success(`Sent to ${selectedUsers.length} user(s)`);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to send post');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden rounded-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold text-lg flex-1 text-center">Share</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <span className="font-semibold text-sm">To:</span>
            {selectedUsers.length > 0 && (
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {selectedUsers.map(id => {
                  const u = contacts.find(c => c._id === id);
                  return (
                    <span key={id} className="bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap">
                      {u?.username}
                    </span>
                  );
                })}
              </div>
            )}
            <input 
              placeholder={selectedUsers.length === 0 ? "Search..." : ""}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm flex-1 min-w-[100px]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[300px] min-h-[300px] p-2">
          {loadingFollowing || loadingFollowers ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 text-sm">No users found</div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredContacts.map(contact => {
                const isSelected = selectedUsers.includes(contact._id!);
                return (
                  <div 
                    key={contact._id} 
                    onClick={() => toggleUser(contact._id!)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={getImageUrl(contact.avatar) || undefined} 
                        alt={contact.username} 
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{contact.fullName || contact.username}</span>
                        <span className="text-muted-foreground text-xs">{contact.username}</span>
                      </div>
                    </div>
                    <div className={cn(
                      "w-6 h-6 rounded-full border flex items-center justify-center transition-colors",
                      isSelected ? "bg-primary border-primary" : "border-border"
                    )}>
                      {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border">
          <Button 
            className="w-full font-semibold rounded-lg" 
            disabled={selectedUsers.length === 0 || isSending}
            onClick={handleSend}
          >
            {isSending ? <LoadingSpinner size="sm" /> : 'Send'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

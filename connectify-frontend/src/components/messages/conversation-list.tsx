import * as React from 'react';
import { Edit } from 'lucide-react';
import { useConversations } from '@/hooks/use-messages';
import { ConversationItem } from './conversation-item';
import { LoadingSpinner } from '../ui/loading-spinner';
import { Conversation } from '@/lib/api/messages.api';
import { useAuth } from '@/contexts/auth.context';

import { cn } from '@/lib/utils';

interface ConversationListProps {
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewMessage: () => void;
}

export function ConversationList({ activeConversationId, onSelectConversation, onNewMessage }: ConversationListProps) {
  const [activeTab, setActiveTab] = React.useState<'active' | 'request'>('active');
  const { data, isLoading } = useConversations(activeTab);
  const { user } = useAuth();
  
  const username = user?.username || 'Messages';

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-[60px] md:h-[75px] shrink-0 border-b border-border flex items-center justify-between px-4 lg:px-6">
        <h2 className="font-bold text-lg hidden md:block">{username}</h2>
        <h2 className="font-bold text-lg md:hidden">Messages</h2>
        <button onClick={onNewMessage} className="hover:opacity-70">
          <Edit className="w-6 h-6" />
        </button>
      </div>

      {/* List Header */}
      <div className="px-4 lg:px-6 py-2 flex items-center justify-between mt-2 border-b border-border pb-3 mb-2">
        <button 
          onClick={() => setActiveTab('active')}
          className={cn(
            "font-bold text-base transition-colors",
            activeTab === 'active' ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Messages
        </button>
        <button 
          onClick={() => setActiveTab('request')}
          className={cn(
            "text-sm font-semibold transition-colors",
            activeTab === 'request' ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Requests
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <LoadingSpinner />
          </div>
        ) : data?.pages[0].conversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {activeTab === 'active' ? 'No conversations yet.' : 'No message requests.'}
          </div>
        ) : (
          data?.pages.map((page, i) => (
            <React.Fragment key={i}>
              {page.conversations.map((conv: Conversation) => (
                <ConversationItem 
                  key={conv._id}
                  conversation={conv}
                  isActive={conv._id === activeConversationId}
                  onClick={() => onSelectConversation(conv._id)}
                />
              ))}
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
}

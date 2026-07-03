'use client';

import * as React from 'react';
import { ProtectedRoute } from '@/components/shared/route-guards';
import { AppLayout } from '@/components/layouts/app-layout';
import { ConversationList } from '@/components/messages/conversation-list';
import { ChatWindow } from '@/components/messages/chat-window';
import { EmptyChat } from '@/components/messages/empty-chat';
import { Conversation } from '@/lib/api/messages.api';
import { NewMessageDialog } from '@/components/messages/new-message-dialog';
import { useConversations } from '@/hooks/use-messages';
import { createConversation } from '@/lib/api/messages.api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

import { useSearchParams, useRouter, useParams } from 'next/navigation';

function MessagesContent() {
  const params = useParams();
  const activeConversationId = params.id ? params.id[0] : undefined;

  const [isNewMessageOpen, setIsNewMessageOpen] = React.useState(false);
  const { data: activeData } = useConversations('active');
  const { data: requestData } = useConversations('request');
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const searchParams = useSearchParams();
  const router = useRouter();

  const createMutation = useMutation({
    mutationFn: (userId: string) => createConversation(userId),
    onSuccess: async (conversation) => {
      queryClient.setQueryData(['conversation', conversation._id], conversation);
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.push(`/messages/${conversation._id}`);
      setIsNewMessageOpen(false);
    }
  });

  React.useEffect(() => {
    const userId = searchParams.get('userId');
    if (userId) {
      createMutation.mutate(userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const activeConversation = React.useMemo(() => {
    if (!activeConversationId) return null;
    
    if (activeData) {
      for (const page of activeData.pages) {
        const conv = page.conversations.find((c: Conversation) => c._id === activeConversationId);
        if (conv) return conv;
      }
    }

    if (requestData) {
      for (const page of requestData.pages) {
        const conv = page.conversations.find((c: Conversation) => c._id === activeConversationId);
        if (conv) return conv;
      }
    }

    const singleData = queryClient.getQueryData(['conversation', activeConversationId]) as Conversation;
    if (singleData) return singleData;

    return null;
  }, [activeData, requestData, activeConversationId, queryClient]);

  return (
    <ProtectedRoute>
      <AppLayout fullWidth hideRightSidebar>
        <div className="w-full h-[calc(100vh-64px)] md:h-screen flex bg-background">
          
          {/* Main Container */}
          <div className="w-full h-full flex overflow-hidden bg-background">
            
            {/* Left Panel (List) */}
            <div className={cn(
              "h-full w-full md:w-[350px] shrink-0 border-r border-border",
              isMobile && activeConversationId ? "hidden" : "block"
            )}>
              <ConversationList 
                activeConversationId={activeConversationId}
                onSelectConversation={(id) => router.push(`/messages/${id}`)}
                onNewMessage={() => setIsNewMessageOpen(true)}
              />
            </div>

            {/* Right Panel (Chat) */}
            <div className={cn(
              "h-full flex-1 relative bg-background",
              isMobile && !activeConversationId ? "hidden" : "flex flex-col"
            )}>
              {activeConversation ? (
                <ChatWindow 
                  conversation={activeConversation} 
                  onBack={() => router.push('/messages')}
                />
              ) : (
                <EmptyChat onNewMessage={() => setIsNewMessageOpen(true)} />
              )}
            </div>

          </div>

        </div>

        <NewMessageDialog 
          isOpen={isNewMessageOpen}
          onClose={() => setIsNewMessageOpen(false)}
          onSelectUser={(userId) => createMutation.mutate(userId)}
          isPending={createMutation.isPending}
        />
      </AppLayout>
    </ProtectedRoute>
  );
}

export default function MessagesPage() {
  return (
    <React.Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <MessagesContent />
    </React.Suspense>
  );
}

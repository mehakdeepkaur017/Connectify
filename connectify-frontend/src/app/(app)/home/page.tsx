'use client';

import * as React from 'react';
import { AppLayout } from '@/components/layouts/app-layout';
import { Stories } from '@/components/feed/stories';
import { FeedList } from '@/components/feed/feed-list';
import { CreatePostModal } from '@/components/feed/create-post-modal';
import { ProtectedRoute } from '@/components/shared/route-guards';
import { Button } from '@/components/ui/button';
import { PlusSquare } from 'lucide-react';

export default function HomeFeedPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="flex flex-col w-full h-full relative">
          <Stories />
          
          <div className="w-full max-w-[470px] mx-auto px-4 sm:px-0 py-4">
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full rounded-2xl h-12 border border-border bg-card hover:bg-muted text-foreground flex items-center justify-start px-4 shadow-sm"
              variant="outline"
            >
              <PlusSquare className="w-5 h-5 mr-3 text-muted-foreground" />
              <span className="text-muted-foreground font-normal">What&apos;s on your mind?</span>
            </Button>
          </div>

          <FeedList />
        </div>
      </AppLayout>

      <CreatePostModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </ProtectedRoute>
  );
}

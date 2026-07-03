'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

export function SuggestedUsers() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-muted-foreground">Suggested for you</h3>
      </div>
      <div className="text-sm text-muted-foreground p-2 text-center">
        Suggestions will appear here soon.
      </div>
    </div>
  );
}

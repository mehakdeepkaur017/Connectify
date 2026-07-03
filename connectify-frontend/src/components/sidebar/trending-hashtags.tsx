'use client';

import * as React from 'react';

export function TrendingHashtags() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-muted-foreground">Trending</h3>
      </div>
      <div className="text-sm text-muted-foreground p-2 text-center">
        Trends will appear here soon.
      </div>
    </div>
  );
}

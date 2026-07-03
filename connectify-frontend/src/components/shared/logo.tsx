import * as React from 'react';
import { Hexagon } from 'lucide-react';

export const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 font-bold text-xl tracking-tight ${className || ''}`}>
      <div className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white p-1.5 rounded-xl shadow-lg shadow-indigo-500/20">
        <Hexagon className="w-5 h-5 fill-current" />
      </div>
      <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
        Connectify
      </span>
    </div>
  );
};

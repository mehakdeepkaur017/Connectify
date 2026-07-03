import * as React from 'react';
import { MessageSquare, Send } from 'lucide-react';

export function EmptyChat({ onNewMessage }: { onNewMessage: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className="w-24 h-24 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
        <Send className="w-10 h-10 ml-1" />
      </div>
      <h2 className="text-xl font-bold mb-2">Your messages</h2>
      <p className="text-muted-foreground text-sm mb-6 font-medium">Send private photos and messages to a friend or group.</p>
      <button 
        onClick={onNewMessage}
        className="bg-blue-500 text-white font-semibold px-4 py-1.5 rounded-lg text-sm hover:bg-blue-600 transition-colors"
      >
        Send message
      </button>
    </div>
  );
}

import React from 'react';
import { useSearchUsers } from '@/hooks/use-profile';
import { Input } from '@/components/ui/input';
import { Search, X, BadgeCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getImageUrl } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

interface DMSearchProps {
  onSelectUser: (id: string) => void;
}

export function DMSearch({ onSelectUser }: DMSearchProps) {
  const [inputValue, setInputValue] = React.useState('');
  const query = useDebounce(inputValue, 300);
  const { data: searchResults, isLoading } = useSearchUsers(query);
  
  const users = searchResults?.users || [];

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-4">
        <Input 
          placeholder="Search..." 
          className="pl-10 bg-muted/50 border-none h-10 rounded-lg focus-visible:ring-1 focus-visible:ring-primary/50 text-sm"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          autoFocus
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        {inputValue && (
          <button 
            onClick={() => setInputValue('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar -mx-2 px-2">
        {query.length > 0 ? (
          isLoading ? (
            <div className="flex flex-col gap-3 mt-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <div className="w-12 h-12 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length > 0 ? (
            <div className="flex flex-col gap-1">
              {users.map((u) => (
                <button 
                  key={u._id}
                  onClick={() => onSelectUser(u._id!)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors w-full text-left"
                >
                  <Avatar className="w-12 h-12 shrink-0">
                    <AvatarImage src={getImageUrl(u.avatar) || undefined} className="object-cover" />
                    <AvatarFallback>{u.fullName?.charAt(0) || u.username?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-sm truncate flex items-center gap-1">
                      {u.username}
                      {u.isVerified && <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />}
                    </span>
                    <span className="text-muted-foreground text-sm truncate">{u.fullName} {u.bio ? `• ${u.bio}` : ''}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground mt-4">No account found.</div>
          )
        ) : (
          <div className="text-center text-sm text-muted-foreground mt-4">Search for an account.</div>
        )}
      </div>
    </div>
  );
}

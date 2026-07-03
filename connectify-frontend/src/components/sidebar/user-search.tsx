import React from 'react';
import { useSearchUsers } from '@/hooks/use-profile';
import { Input } from '@/components/ui/input';
import { Search, X, BadgeCheck, Hash, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { UserProfile } from '@/lib/api/users.api';
import { getImageUrl, cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function UserSearch({ onResultClick, preventNavigation = false }: { onResultClick?: (username?: string, id?: string) => void, preventNavigation?: boolean }) {
  const [query, setQuery] = React.useState('');
  const { data: searchResults, isLoading } = useSearchUsers(query);
  const [activeTab, setActiveTab] = React.useState<'top' | 'accounts' | 'tags' | 'places'>('top');
  const [recentSearches, setRecentSearches] = React.useState<any[]>([]);

  React.useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const addRecentSearch = (item: any) => {
    // Determine unique id for tags and places if they don't have _id
    const id = item._id || item.name;
    const itemWithId = { ...item, _id: id };
    const updated = [itemWithId, ...recentSearches.filter((s: any) => s._id !== id)].slice(0, 15);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const removeRecentSearch = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = recentSearches.filter((s: any) => s._id !== id);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };
  
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };
  
  const router = useRouter();

  const users = searchResults?.users || [];
  const hashtags = searchResults?.hashtags || [];
  const places = searchResults?.places || [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (onResultClick) onResultClick();
    }
  };

  const renderUsers = () => {
    if (users.length === 0) return <div className="text-center text-sm text-muted-foreground mt-4">No accounts found.</div>;
    return (
      <div className="flex flex-col gap-1">
        {users.map((u) => (
          <Link 
            key={u._id} 
            href={`/profile/${u.username}`} 
            onClick={(e) => {
              addRecentSearch({ type: 'account', ...u });
              if (onResultClick) {
                if (preventNavigation) {
                  e.preventDefault();
                }
                onResultClick(u.username, u._id);
              }
            }}
            className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <Avatar className="w-12 h-12 shrink-0">
              <AvatarImage src={getImageUrl(u.avatar) || undefined} className="object-cover" />
              <AvatarFallback>{u.fullName?.charAt(0) || u.username?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm truncate flex items-center gap-1">
                {u.username}
                {u.isVerified && <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />}
              </span>
              <span className="text-muted-foreground text-sm truncate">{u.fullName} {u.bio ? `• ${u.bio}` : ''}</span>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  const renderTags = () => {
    if (hashtags.length === 0) return <div className="text-center text-sm text-muted-foreground mt-4">No tags found.</div>;
    return (
      <div className="flex flex-col gap-1">
        {hashtags.map((tag) => (
          <Link 
            key={tag.name} 
            href={`/explore/tags/${tag.name}`} 
            onClick={(e) => {
              addRecentSearch({ type: 'tag', ...tag });
              if (onResultClick) {
                if (preventNavigation) {
                  e.preventDefault();
                }
                onResultClick();
              }
            }}
            className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center bg-background shrink-0">
              <Hash className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm truncate">#{tag.name}</span>
              <span className="text-muted-foreground text-sm truncate">{tag.postCount.toLocaleString()} posts</span>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  const renderPlaces = () => {
    if (places.length === 0) return <div className="text-center text-sm text-muted-foreground mt-4">No places found.</div>;
    return (
      <div className="flex flex-col gap-1">
        {places.map((place) => (
          <div 
            key={place.name} 
            onClick={() => {
              addRecentSearch({ type: 'place', ...place });
              if (onResultClick) onResultClick();
            }}
            className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center bg-background shrink-0">
              <MapPin className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm truncate">{place.name}</span>
              <span className="text-muted-foreground text-sm truncate">{place.postCount.toLocaleString()} posts</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTop = () => {
    return (
      <div className="flex flex-col gap-4">
        {users.length > 0 && renderUsers()}
        {hashtags.length > 0 && renderTags()}
        {places.length > 0 && renderPlaces()}
        {users.length === 0 && hashtags.length === 0 && places.length === 0 && (
          <div className="text-center text-sm text-muted-foreground mt-4">No results found.</div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-4">
        <Input 
          placeholder="Search..." 
          className="pl-10 bg-muted/50 border-none h-10 rounded-lg focus-visible:ring-1 focus-visible:ring-primary/50 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        {query && (
          <button 
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>



      <div className="flex-1 overflow-y-auto no-scrollbar -mx-6 px-6 pb-20">
        {query.length > 1 ? (
          isLoading ? (
            <div className="flex flex-col gap-3 mt-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-2 -mx-2">
                  <div className="w-12 h-12 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {activeTab === 'top' && renderTop()}
              {activeTab === 'accounts' && renderUsers()}
              {activeTab === 'tags' && renderTags()}
              {activeTab === 'places' && renderPlaces()}
            </>
          )
        ) : (
          recentSearches.length > 0 ? (
            <div className="flex-1 flex flex-col mt-4">
              <div className="flex justify-between items-center px-4 py-2 border-b border-border mb-2">
                <h3 className="font-semibold text-sm">Recent</h3>
                <button onClick={clearRecentSearches} className="text-blue-500 text-sm font-semibold hover:text-foreground">Clear all</button>
              </div>
              <div className="flex flex-col gap-1 px-4">
                {recentSearches.map((s) => (
                  <Link 
                    key={s._id} 
                    href={s.type === 'account' ? `/profile/${s.username}` : (s.type === 'tag' ? `/explore/tags/${s.name}` : '#')}
                    onClick={(e) => {
                      if (onResultClick) {
                        if (preventNavigation) {
                          e.preventDefault();
                        }
                        if (s.type === 'account') onResultClick(s.username, s._id);
                        else onResultClick();
                      }
                    }}
                    className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors group relative"
                  >
                    {s.type === 'account' ? (
                      <Avatar className="w-12 h-12 shrink-0">
                        <AvatarImage src={getImageUrl(s.avatar) || undefined} className="object-cover" />
                        <AvatarFallback>{s.fullName?.charAt(0) || s.username?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ) : s.type === 'tag' ? (
                      <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center bg-background shrink-0">
                        <Hash className="w-5 h-5 text-foreground" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center bg-background shrink-0">
                        <MapPin className="w-5 h-5 text-foreground" />
                      </div>
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-sm truncate flex items-center gap-1">
                        {s.type === 'account' ? s.username : s.type === 'tag' ? `#${s.name}` : s.name}
                        {s.type === 'account' && s.isVerified && <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />}
                      </span>
                      <span className="text-muted-foreground text-sm truncate">
                        {s.type === 'account' ? `${s.fullName} ${s.bio ? `• ${s.bio}` : ''}` : `${s.postCount?.toLocaleString()} posts`}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => removeRecentSearch(s._id, e)}
                      className="opacity-0 group-hover:opacity-100 p-2 hover:bg-muted rounded-full transition-all text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground mt-4">Search for users, tags, or places.</div>
          )
        )}
      </div>
    </div>
  );
}

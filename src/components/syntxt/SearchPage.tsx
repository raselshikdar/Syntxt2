'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PostCard } from './PostCard';
import { User, Post } from './types';

interface SearchPageProps {
  currentUserId?: string;
  onUserClick: (handle: string) => void;
  onLike: (postId: string) => void;
  onBookmark: (postId: string) => void;
  onRepost: (postId: string) => void;
  onBack: () => void;
}

export function SearchPage({
  currentUserId,
  onUserClick,
  onLike,
  onBookmark,
  onRepost,
  onBack,
}: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setUsers([]);
      setPosts([]);
      return;
    }

    setIsSearching(true);
    try {
      const [usersRes, postsRes] = await Promise.all([
        fetch(`/api/users?search=${encodeURIComponent(searchQuery)}&currentUserId=${currentUserId || ''}`),
        fetch(`/api/posts?search=${encodeURIComponent(searchQuery)}&userId=${currentUserId || ''}`),
      ]);
      const usersData = await usersRes.json();
      const postsData = await postsRes.json();
      setUsers(Array.isArray(usersData) ? usersData : []);
      setPosts(Array.isArray(postsData) ? postsData : []);
    } catch (error) {
      console.error('Search error:', error);
    }
    setIsSearching(false);
  }, [currentUserId]);

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set new debounce
    debounceRef.current = setTimeout(() => {
      performSearch(newQuery);
    }, 300);
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const showNoResults = query.length >= 2 && !isSearching && users.length === 0 && posts.length === 0;
  const showPlaceholder = query.length < 2;
  const showResults = query.length >= 2 && !isSearching && (users.length > 0 || posts.length > 0);

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="flex items-center gap-2 -mx-4 px-4 h-14 border-b border-border sticky top-0 bg-background z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="btn-bounce h-8 w-8"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search users and posts..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="pt-4">
        {isSearching ? (
          <div className="text-center py-8 text-muted-foreground">
            <span className="animate-pulse">Searching...</span>
          </div>
        ) : showPlaceholder ? (
          <div className="text-center py-8 text-muted-foreground">
            Type at least 2 characters to search
          </div>
        ) : showNoResults ? (
          <div className="text-center py-8 text-muted-foreground">
            No results found for &quot;{query}&quot;
          </div>
        ) : showResults ? (
          <>
            {/* Users */}
            {users.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Users</h3>
                <div className="space-y-2">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => onUserClick(user.handle)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-foreground transition-colors text-left"
                    >
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.handle} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {(user.displayName || user.handle).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{user.displayName || user.handle}</p>
                        <p className="text-xs text-muted-foreground">@{user.handle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Posts */}
            {posts.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Posts</h3>
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={currentUserId}
                      onUserClick={onUserClick}
                      onLike={onLike}
                      onBookmark={onBookmark}
                      onRepost={onRepost}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PostCard } from './PostCard';
import { User, Post } from './types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  onUserClick: (handle: string) => void;
  onLike: (postId: string) => void;
  onBookmark: (postId: string) => void;
  onRepost: (postId: string) => void;
}

export function SearchModal({
  isOpen,
  onClose,
  currentUserId,
  onUserClick,
  onLike,
  onBookmark,
  onRepost,
}: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setQuery('');
    setUsers([]);
    setPosts([]);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    
    if (query.length < 2) {
      // Reset results when query is too short
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [usersRes, postsRes] = await Promise.all([
          fetch(`/api/users?search=${encodeURIComponent(query)}&currentUserId=${currentUserId || ''}`),
          fetch(`/api/posts?search=${encodeURIComponent(query)}&userId=${currentUserId || ''}`),
        ]);
        const usersData = await usersRes.json();
        const postsData = await postsRes.json();
        setUsers(Array.isArray(usersData) ? usersData : []);
        setPosts(Array.isArray(postsData) ? postsData : []);
      } catch (error) {
        console.error('Search error:', error);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, currentUserId, isOpen]);

  // Compute whether to show results
  const showNoResults = query.length >= 2 && !isSearching && users.length === 0 && posts.length === 0;
  const showPlaceholder = query.length < 2;
  const showResults = query.length >= 2 && !isSearching && (users.length > 0 || posts.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden bg-card border-border p-0 gap-0">
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users and posts..."
              className="border-0 focus-visible:ring-0 bg-transparent px-0"
            />
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 btn-bounce">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[calc(85vh-60px)] p-4">
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
                        onClick={() => {
                          onUserClick(user.handle);
                          handleClose();
                        }}
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
                        onUserClick={(handle) => {
                          onUserClick(handle);
                          handleClose();
                        }}
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
      </DialogContent>
    </Dialog>
  );
}

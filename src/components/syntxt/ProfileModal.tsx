'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, UserMinus, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostCard } from './PostCard';
import { User, Post } from './types';
import { toast } from '@/hooks/use-toast';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userHandle: string;
  currentUserId?: string;
  onUserClick: (handle: string) => void;
  onLike: (postId: string) => void;
  onBookmark: (postId: string) => void;
  onRepost: (postId: string) => void;
  onFollow: (userId: string) => void;
  onUnfollow: (userId: string) => void;
  onEditProfile?: () => void;
}

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  users: User[];
  currentUserId?: string;
  onUserClick: (handle: string) => void;
}

function UserListModal({ isOpen, onClose, title, users, currentUserId, onUserClick }: UserListModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[70vh] overflow-hidden bg-card border-border p-0 gap-0">
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 btn-bounce">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[calc(70vh-60px)] p-4">
          {users.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No users</p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    onUserClick(user.handle);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProfileModal({
  isOpen,
  onClose,
  userHandle,
  currentUserId,
  onUserClick,
  onLike,
  onBookmark,
  onRepost,
  onFollow,
  onUnfollow,
  onEditProfile,
}: ProfileModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signals');
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  useEffect(() => {
    if (!isOpen || !userHandle) return;
    
    let isMounted = true;
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch user info
        const userRes = await fetch(`/api/users?handle=${userHandle}&currentUserId=${currentUserId || ''}`);
        const userData = await userRes.json();
        
        if (!isMounted) return;
        
        if (userData.error) {
          setUser(null);
          setPosts([]);
          setIsLoading(false);
          return;
        }
        
        setUser(userData);

        // Fetch user posts
        const postsRes = await fetch(`/api/posts?authorId=${userData.id}&userId=${currentUserId || ''}`);
        const postsData = await postsRes.json();
        if (isMounted) setPosts(postsData);

        // Fetch saved posts
        const savedRes = await fetch(`/api/bookmark?userId=${currentUserId || ''}`);
        const savedData = await savedRes.json();
        if (isMounted) setSavedPosts(savedData.posts || []);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
      if (isMounted) setIsLoading(false);
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [isOpen, userHandle, currentUserId]);

  const fetchFollowers = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/follow?userId=${user.id}&type=followers`);
      const data = await res.json();
      setFollowers(data.users || []);
    } catch (error) {
      console.error('Error fetching followers:', error);
    }
  };

  const fetchFollowing = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/follow?userId=${user.id}&type=following`);
      const data = await res.json();
      setFollowing(data.users || []);
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  };

  const handleFollow = async () => {
    if (!user || !currentUserId || isFollowLoading) return;
    
    setIsFollowLoading(true);
    try {
      if (user.isFollowing) {
        await fetch(`/api/follow?followerId=${currentUserId}&followingId=${user.id}`, {
          method: 'DELETE',
        });
        setUser(prev => prev ? { ...prev, isFollowing: false, followersCount: prev.followersCount - 1 } : null);
        onUnfollow(user.id);
        toast({ title: 'Unfollowed' });
      } else {
        await fetch('/api/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ followerId: currentUserId, followingId: user.id }),
        });
        setUser(prev => prev ? { ...prev, isFollowing: true, followersCount: prev.followersCount + 1 } : null);
        onFollow(user.id);
        toast({ title: 'Following' });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({ title: 'Error', variant: 'destructive' });
    }
    setIsFollowLoading(false);
  };

  const isOwnProfile = currentUserId === user?.id;
  const displayName = user?.displayName || user?.handle;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden bg-card border-border p-0 gap-0">
          <DialogHeader className="p-0">
            <div className="relative">
              {/* Banner */}
              <div className="h-32 bg-gradient-to-r from-muted to-muted/50 relative">
                {user?.banner && (
                  <img 
                    src={user.banner} 
                    alt="Banner" 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              
              {/* Avatar and actions */}
              <div className="absolute -bottom-12 left-4 right-4 flex items-end justify-between">
                <div className="flex items-end gap-4">
                  {user?.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={displayName}
                      className="w-24 h-24 rounded-full border-4 border-card object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full border-4 border-card bg-muted flex items-center justify-center text-2xl font-bold">
                      {displayName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mb-2">
                  {isOwnProfile ? (
                    <Button
                      onClick={onEditProfile}
                      variant="outline"
                      className="btn-bounce flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Profile
                    </Button>
                  ) : currentUserId && (
                    <Button
                      onClick={handleFollow}
                      disabled={isFollowLoading}
                      variant={user?.isFollowing ? 'outline' : 'default'}
                      className="btn-bounce flex items-center gap-2"
                    >
                      {user?.isFollowing ? (
                        <>
                          <UserMinus className="w-4 h-4" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Follow
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="absolute top-2 right-2 h-8 w-8 btn-bounce bg-background/50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[calc(85vh-160px)]">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <span className="animate-pulse">Loading...</span>
              </div>
            ) : !user ? (
              <div className="p-8 text-center text-muted-foreground">
                User not found
              </div>
            ) : (
              <>
                {/* Profile info */}
                <div className="px-4 pt-14 pb-4 border-b border-border">
                  <h2 className="text-xl font-bold">{displayName}</h2>
                  <p className="text-sm text-muted-foreground">@{user.handle}</p>
                  {user.bio && (
                    <p className="text-sm text-foreground mt-2">{user.bio}</p>
                  )}
                  
                  {/* Stats */}
                  <div className="flex items-center gap-6 mt-4">
                    <button
                      onClick={() => {
                        fetchFollowers();
                        setShowFollowers(true);
                      }}
                      className="text-sm hover:underline"
                    >
                      <span className="font-bold">{user.followersCount}</span>
                      <span className="text-muted-foreground ml-1">Followers</span>
                    </button>
                    <button
                      onClick={() => {
                        fetchFollowing();
                        setShowFollowing(true);
                      }}
                      className="text-sm hover:underline"
                    >
                      <span className="font-bold">{user.followingCount}</span>
                      <span className="text-muted-foreground ml-1">Following</span>
                    </button>
                    <div className="text-sm">
                      <span className="font-bold">{posts.length}</span>
                      <span className="text-muted-foreground ml-1">Signals</span>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                {isOwnProfile ? (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full border-b border-border rounded-none h-12">
                      <TabsTrigger value="signals" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground">
                        Signals
                      </TabsTrigger>
                      <TabsTrigger value="saved" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground">
                        Saved
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="signals" className="p-4 mt-0">
                      {posts.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          No signals yet
                        </div>
                      ) : (
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
                      )}
                    </TabsContent>
                    <TabsContent value="saved" className="p-4 mt-0">
                      {savedPosts.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          No saved posts yet
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {savedPosts.map((post) => (
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
                      )}
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">Signals</h3>
                    {posts.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        No signals yet
                      </div>
                    ) : (
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
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Followers Modal */}
      <UserListModal
        isOpen={showFollowers}
        onClose={() => setShowFollowers(false)}
        title="Followers"
        users={followers}
        currentUserId={currentUserId}
        onUserClick={onUserClick}
      />

      {/* Following Modal */}
      <UserListModal
        isOpen={showFollowing}
        onClose={() => setShowFollowing(false)}
        title="Following"
        users={following}
        currentUserId={currentUserId}
        onUserClick={onUserClick}
      />
    </>
  );
}

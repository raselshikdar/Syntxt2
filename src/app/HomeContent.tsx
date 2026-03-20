'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import {
  Header,
  FeedSwitcher,
  PostCard,
  ComposeModal,
  ProfilePage,
  FloatingActionButton,
  BottomNav,
  SettingsPage,
  SearchPage,
  NotificationsPage,
  MessagesPage,
  ReportModal,
  AdminPanel,
  WelcomePage,
  SignInPage,
  SignUpPage,
  PostDetailsPage,
  CommentComposer,
  RepostModal,
  ScrollToTop,
  Post,
  User,
  LinkPreview,
} from '@/components/syntxt';

// Standard spacing constant (matches pt-3)
const STANDARD_SPACING = 'pt-3';

// Default user for demo purposes
const DEFAULT_USER_HANDLE = 'neo';
const GUEST_SESSION_KEY = 'syntxt_guest_mode';

// Cache keys
const CACHE_KEYS = {
  posts: 'syntxt_cache_posts',
  postsTime: 'syntxt_cache_posts_time',
  currentUser: 'syntxt_cache_user',
  exploreFeed: 'syntxt_cache_explore',
  followingFeed: 'syntxt_cache_following',
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

// Helper to get cache
function getCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem(key);
    const timeKey = `${key}_time`;
    const cachedTime = sessionStorage.getItem(timeKey);
    
    if (cached && cachedTime) {
      const age = Date.now() - parseInt(cachedTime, 10);
      if (age < CACHE_DURATION) {
        return JSON.parse(cached) as T;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// Helper to set cache
function setCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
    sessionStorage.setItem(`${key}_time`, Date.now().toString());
  } catch {
    // Ignore storage errors
  }
}

// Helper to clear specific cache
function clearCache(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(key);
    sessionStorage.removeItem(`${key}_time`);
  } catch {
    // Ignore
  }
}

// Get initial cached posts synchronously
function getInitialCachedPosts(feed: 'explore' | 'following'): Post[] {
  const cacheKey = feed === 'explore' ? CACHE_KEYS.exploreFeed : CACHE_KEYS.followingFeed;
  return getCache<Post[]>(cacheKey) || [];
}

export default function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // Get current view from URL
  const currentView = searchParams.get('view') || 'home';
  const authView = searchParams.get('auth');
  const profileHandle = searchParams.get('handle');
  const postId = searchParams.get('postId');
  const isGuestMode = searchParams.get('guest') === 'true';
  
  // User state
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  
  // Posts state with caching
  const [activeFeed, setActiveFeed] = useState<'explore' | 'following'>('explore');
  const [posts, setPosts] = useState<Post[]>(() => getInitialCachedPosts('explore'));
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(() => posts.length > 0);
  
  // Track if we need to fetch
  const lastFetchRef = useRef<{ feed: string; userId: string } | null>(null);
  
  // Navigation state for scroll
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const prevViewRef = useRef<string>(currentView);
  
  // Modal states
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isRepostOpen, setIsRepostOpen] = useState(false);
  
  // Selected post for modals
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  
  // Report state
  const [reportPostId, setReportPostId] = useState<string>('');
  const [reportUserId, setReportUserId] = useState<string>('');
  
  // Badge counts
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [hasViewedNotifications, setHasViewedNotifications] = useState(false);
  const [hasViewedMessages, setHasViewedMessages] = useState(false);
  
  const [isPublishing, setIsPublishing] = useState(false);

  // Scroll to top on view change
  useEffect(() => {
    if (prevViewRef.current !== currentView) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      prevViewRef.current = currentView;
    }
  }, [currentView]);

  // Navigation helper
  const navigateTo = useCallback((view: string, params?: Record<string, string>) => {
    const urlParams = new URLSearchParams(searchParams.toString());
    
    if (view === 'home') {
      urlParams.delete('view');
      urlParams.delete('handle');
      urlParams.delete('postId');
    } else if (view === 'post') {
      urlParams.set('view', 'post');
    } else {
      urlParams.set('view', view);
      urlParams.delete('postId');
    }
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          urlParams.set(key, value);
        } else {
          urlParams.delete(key);
        }
      });
    }
    
    const queryString = urlParams.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }, [router, searchParams, pathname]);

  // Clear auth params
  const clearAuthParameters = useCallback(() => {
    const urlParams = new URLSearchParams(searchParams.toString());
    urlParams.delete('auth');
    const queryString = urlParams.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }, [router, searchParams, pathname]);

  // Initialize user
  useEffect(() => {
    const init = async () => {
      // Check if user is in guest mode
      const storedGuestMode = sessionStorage.getItem(GUEST_SESSION_KEY);
      if (storedGuestMode === 'true' || isGuestMode) {
        sessionStorage.setItem(GUEST_SESSION_KEY, 'true');
        setIsAuthenticated(true);
        setIsGuest(true);
        setIsInitialized(true);
        return;
      }

      // Try to restore user from cache first
      const cachedUser = getCache<User>(CACHE_KEYS.currentUser);
      if (cachedUser?.id) {
        setCurrentUserId(cachedUser.id);
        setCurrentUser(cachedUser);
        setIsAuthenticated(true);
        setIsInitialized(true);
        return;
      }

      try {
        // Get or create current user
        const userRes = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle: DEFAULT_USER_HANDLE }),
        });
        const userData = await userRes.json();
        
        if (userData.id) {
          setCurrentUserId(userData.id);
          setCurrentUser(userData);
          setIsAuthenticated(true);
          setCache(CACHE_KEYS.currentUser, userData);
        }
      } catch (error) {
        console.error('Init error:', error);
        toast({
          title: 'Error',
          description: 'Failed to initialize app',
          variant: 'destructive',
        });
      }
      setIsInitialized(true);
    };
    
    init();
  }, [isGuestMode]);

  // Fetch posts with smart caching
  const fetchPosts = useCallback(async (feed: 'explore' | 'following', userId: string, skipCache = false) => {
    const fetchKey = { feed, userId };
    
    if (!skipCache && lastFetchRef.current && 
        lastFetchRef.current.feed === feed && 
        lastFetchRef.current.userId === userId) {
      return;
    }
    
    if (!skipCache) {
      const cacheKey = feed === 'explore' ? CACHE_KEYS.exploreFeed : CACHE_KEYS.followingFeed;
      const cachedPosts = getCache<Post[]>(cacheKey);
      if (cachedPosts && cachedPosts.length > 0) {
        setPosts(cachedPosts);
        setHasLoadedOnce(true);
        lastFetchRef.current = fetchKey;
        return;
      }
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/posts?feed=${feed}&userId=${userId || ''}&limit=30`);
      const data = await res.json();
      const postsArray = Array.isArray(data) ? data : [];
      setPosts(postsArray);
      const cacheKey = feed === 'explore' ? CACHE_KEYS.exploreFeed : CACHE_KEYS.followingFeed;
      setCache(cacheKey, postsArray);
      setHasLoadedOnce(true);
      lastFetchRef.current = fetchKey;
    } catch (error) {
      console.error('Fetch posts error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load posts',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  }, []);

  // Effect to fetch posts when dependencies change
  useEffect(() => {
    if (!isInitialized || currentView !== 'home') return;
    
    let isMounted = true;
    
    const loadPosts = async () => {
      const feed = activeFeed;
      const userId = currentUserId;
      const fetchKey = { feed, userId };
      
      if (lastFetchRef.current && 
          lastFetchRef.current.feed === feed && 
          lastFetchRef.current.userId === userId) {
        return;
      }
      
      const cacheKey = feed === 'explore' ? CACHE_KEYS.exploreFeed : CACHE_KEYS.followingFeed;
      const cachedPosts = getCache<Post[]>(cacheKey);
      if (cachedPosts && cachedPosts.length > 0) {
        if (isMounted) {
          setPosts(cachedPosts);
          setHasLoadedOnce(true);
        }
        lastFetchRef.current = fetchKey;
        return;
      }
      
      if (isMounted) setIsLoading(true);
      try {
        const res = await fetch(`/api/posts?feed=${feed}&userId=${userId || ''}&limit=30`);
        const data = await res.json();
        const postsArray = Array.isArray(data) ? data : [];
        if (isMounted) {
          setPosts(postsArray);
          setCache(cacheKey, postsArray);
          setHasLoadedOnce(true);
        }
        lastFetchRef.current = fetchKey;
      } catch (error) {
        console.error('Fetch posts error:', error);
      }
      if (isMounted) setIsLoading(false);
    };
    
    loadPosts();
    
    return () => {
      isMounted = false;
    };
  }, [activeFeed, currentUserId, isInitialized, currentView]);

  // Fetch badge counts
  useEffect(() => {
    if (!currentUserId || !isAuthenticated || isGuest) return;
    
    const fetchBadges = async () => {
      try {
        const [notifRes, msgRes] = await Promise.all([
          fetch(`/api/notifications?userId=${currentUserId}&countOnly=true`),
          fetch(`/api/messages?userId=${currentUserId}&countOnly=true`),
        ]);
        const notifData = await notifRes.json();
        const msgData = await msgRes.json();
        
        if (!hasViewedNotifications) {
          setUnreadNotifications(notifData.count || 0);
        }
        if (!hasViewedMessages) {
          setUnreadMessages(msgData.count || 0);
        }
      } catch (error) {
        console.error('Error fetching badges:', error);
      }
    };
    
    fetchBadges();
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  }, [currentUserId, isAuthenticated, isGuest, hasViewedNotifications, hasViewedMessages]);

  // Handle scroll for header visibility
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      
      if (scrollY > lastScrollY.current && scrollY > 50) {
        setIsHeaderVisible(false);
      } else if (scrollY < lastScrollY.current) {
        setIsHeaderVisible(true);
      }
      
      lastScrollY.current = scrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle tab change from bottom nav
  const handleTabChange = (tab: string) => {
    if (tab === 'home') {
      navigateTo('home');
    } else {
      navigateTo(tab);
    }
  };

  // Handle user click to open profile
  const handleUserClick = (handle: string) => {
    navigateTo('profile', { handle });
  };

  // Handle post click to open post details
  const handlePostClick = (postId: string) => {
    navigateTo('post', { postId });
  };

  // Handle like - INSTANT OPTIMISTIC UPDATE
  const handleLike = async (postId: string) => {
    if (!currentUserId) return;
    
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const newIsLiked = !post.isLiked;
    const newLikesCount = newIsLiked ? post.likesCount + 1 : Math.max(0, post.likesCount - 1);
    
    // INSTANT: Update UI immediately
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, isLiked: newIsLiked, likesCount: newLikesCount } 
        : p
    ));
    
    // Update cache
    const cacheKey = activeFeed === 'explore' ? CACHE_KEYS.exploreFeed : CACHE_KEYS.followingFeed;
    const currentPosts = posts.map(p => 
      p.id === postId 
        ? { ...p, isLiked: newIsLiked, likesCount: newLikesCount } 
        : p
    );
    setCache(cacheKey, currentPosts);

    // THEN: Sync with server
    try {
      if (post.isLiked) {
        await fetch(`/api/like?postId=${postId}&userId=${currentUserId}`, {
          method: 'DELETE',
        });
      } else {
        await fetch('/api/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, userId: currentUserId }),
        });
      }
    } catch (error) {
      // Revert on error
      console.error('Like error:', error);
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, isLiked: post.isLiked, likesCount: post.likesCount } 
          : p
      ));
    }
  };

  // Handle bookmark - INSTANT OPTIMISTIC UPDATE
  const handleBookmark = async (postId: string) => {
    if (!currentUserId) return;
    
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const newIsBookmarked = !post.isBookmarked;
    
    // INSTANT: Update UI immediately
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, isBookmarked: newIsBookmarked } : p
    ));
    
    // Update cache
    const cacheKey = activeFeed === 'explore' ? CACHE_KEYS.exploreFeed : CACHE_KEYS.followingFeed;
    const currentPosts = posts.map(p => 
      p.id === postId ? { ...p, isBookmarked: newIsBookmarked } : p
    );
    setCache(cacheKey, currentPosts);
    
    toast({ title: newIsBookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks' });

    // THEN: Sync with server
    try {
      if (post.isBookmarked) {
        await fetch(`/api/bookmark?postId=${postId}&userId=${currentUserId}`, {
          method: 'DELETE',
        });
      } else {
        await fetch('/api/bookmark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, userId: currentUserId }),
        });
      }
    } catch (error) {
      console.error('Bookmark error:', error);
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, isBookmarked: post.isBookmarked } : p
      ));
    }
  };

  // Handle repost - opens repost modal
  const handleRepost = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      setSelectedPost(post);
      setIsRepostOpen(true);
    }
  };

  // Handle repost callback from modal - INSTANT OPTIMISTIC UPDATE
  const handleRepostCallback = (postId: string, isReposted: boolean) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { 
          ...p, 
          isReposted, 
          repostsCount: isReposted ? p.repostsCount + 1 : Math.max(0, p.repostsCount - 1),
        };
      }
      return p;
    }));
    
    // Clear cache to force refresh on next load
    clearCache(CACHE_KEYS.exploreFeed);
    clearCache(CACHE_KEYS.followingFeed);
    
    setIsRepostOpen(false);
    setSelectedPost(null);
  };

  // Handle quote post callback
  const handleQuotePost = async (postId: string, quoteContent: string) => {
    if (!currentUserId) return;
    
    try {
      const res = await fetch('/api/repost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          postId, 
          userId: currentUserId,
          isQuote: true,
          quoteContent,
        }),
      });
      const data = await res.json();
      
      if (data.post) {
        setPosts(prev => [data.post, ...prev]);
        const cacheKey = activeFeed === 'explore' ? CACHE_KEYS.exploreFeed : CACHE_KEYS.followingFeed;
        const cachedPosts = getCache<Post[]>(cacheKey) || [];
        setCache(cacheKey, [data.post, ...cachedPosts]);
      }
      
      setIsRepostOpen(false);
      setSelectedPost(null);
    } catch (error) {
      console.error('Quote post error:', error);
    }
  };

  // Handle comment - opens comment modal
  const handleComment = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      setSelectedPost(post);
      setIsCommentOpen(true);
    }
  };

  // Handle comment submit
  const handleCommentSubmit = async (postId: string, content: string, imageUrl?: string) => {
    if (!currentUserId) return;
    
    try {
      const res = await fetch(`/api/posts/${postId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          authorId: currentUserId,
          imageUrl,
        }),
      });
      
      if (res.ok) {
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, repliesCount: (p.repliesCount || 0) + 1 } 
            : p
        ));
      }
    } catch (error) {
      console.error('Comment error:', error);
      throw error;
    }
  };

  // Handle report
  const handleReport = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      setReportPostId(postId);
      setReportUserId(post.author.id);
      setIsReportOpen(true);
    }
  };

  // Handle delete post
  const handleDeletePost = async (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    
    const cacheKey = activeFeed === 'explore' ? CACHE_KEYS.exploreFeed : CACHE_KEYS.followingFeed;
    const cachedPosts = getCache<Post[]>(cacheKey) || [];
    setCache(cacheKey, cachedPosts.filter(p => p.id !== postId));
    
    toast({ title: 'Post deleted' });
    
    try {
      await fetch(`/api/posts?postId=${postId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'Error deleting post', variant: 'destructive' });
    }
  };

  // Handle publish new post
  const handlePublish = async (content: string, imageUrl?: string, linkPreview?: LinkPreview) => {
    if (!currentUserId) return;
    
    setIsPublishing(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content, 
          authorId: currentUserId,
          imageUrl,
          linkUrl: linkPreview?.url,
          linkTitle: linkPreview?.title,
          linkDesc: linkPreview?.description,
          linkImage: linkPreview?.image,
        }),
      });
      const newPost = await res.json();
      
      setPosts(prev => [newPost, ...prev]);
      
      const cacheKey = activeFeed === 'explore' ? CACHE_KEYS.exploreFeed : CACHE_KEYS.followingFeed;
      const cachedPosts = getCache<Post[]>(cacheKey) || [];
      setCache(cacheKey, [newPost, ...cachedPosts]);
      
      setIsComposeOpen(false);
      toast({ title: 'Post published!' });
    } catch (error) {
      console.error('Publish error:', error);
      toast({
        title: 'Error',
        description: 'Failed to publish post',
        variant: 'destructive',
      });
    }
    setIsPublishing(false);
  };

  // Handle follow/unfollow callbacks
  const handleFollow = (_userId: string) => {};
  const handleUnfollow = (_userId: string) => {};

  // Handle user update from settings
  const handleUserUpdate = (user: User) => {
    setCurrentUser(user);
    setCache(CACHE_KEYS.currentUser, user);
  };

  // Handle notification read
  const handleNotificationRead = () => {
    setUnreadNotifications(prev => Math.max(0, prev - 1));
  };

  // Handle message read
  const handleMessageRead = () => {
    setUnreadMessages(prev => Math.max(0, prev - 1));
  };

  // Handle notifications viewed
  const handleNotificationsViewed = () => {
    setHasViewedNotifications(true);
    setUnreadNotifications(0);
  };

  // Handle messages viewed
  const handleMessagesViewed = () => {
    setHasViewedMessages(true);
    setUnreadMessages(0);
  };

  // Handle guest mode entry
  const handleEnterAsGuest = () => {
    sessionStorage.setItem(GUEST_SESSION_KEY, 'true');
    window.location.reload();
  };

  // Handle sign in success
  const handleSignInSuccess = (userData?: { id: string; handle: string; displayName?: string | null; avatar?: string | null; email?: string | null; role?: string; isVerified?: boolean }) => {
    sessionStorage.removeItem(GUEST_SESSION_KEY);
    clearCache(CACHE_KEYS.currentUser);
    clearCache(CACHE_KEYS.exploreFeed);
    clearCache(CACHE_KEYS.followingFeed);
    
    if (userData) {
      setCurrentUserId(userData.id);
      setCurrentUser({
        id: userData.id,
        handle: userData.handle,
        displayName: userData.displayName || null,
        avatar: userData.avatar || null,
        email: userData.email || null,
        role: (userData.role as 'USER' | 'MODERATOR' | 'ADMIN') || 'USER',
        isVerified: userData.isVerified || false,
        createdAt: new Date().toISOString(),
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        bio: null,
        banner: null,
      });
      setCache(CACHE_KEYS.currentUser, userData);
    }
    
    setIsAuthenticated(true);
    setIsGuest(false);
    clearAuthParameters();
  };

  // Handle sign up success
  const handleSignUpSuccess = (userData?: { id: string; handle: string; displayName?: string | null; avatar?: string | null; email?: string | null; role?: string; isVerified?: boolean }) => {
    sessionStorage.removeItem(GUEST_SESSION_KEY);
    clearCache(CACHE_KEYS.currentUser);
    clearCache(CACHE_KEYS.exploreFeed);
    clearCache(CACHE_KEYS.followingFeed);
    
    if (userData) {
      setCurrentUserId(userData.id);
      setCurrentUser({
        id: userData.id,
        handle: userData.handle,
        displayName: userData.displayName || null,
        avatar: userData.avatar || null,
        email: userData.email || null,
        role: (userData.role as 'USER' | 'MODERATOR' | 'ADMIN') || 'USER',
        isVerified: userData.isVerified || false,
        createdAt: new Date().toISOString(),
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        bio: null,
        banner: null,
      });
      setCache(CACHE_KEYS.currentUser, userData);
    }
    
    setIsAuthenticated(true);
    setIsGuest(false);
    clearAuthParameters();
  };

  // Handle logout
  const handleLogout = () => {
    sessionStorage.removeItem(GUEST_SESSION_KEY);
    clearCache(CACHE_KEYS.currentUser);
    clearCache(CACHE_KEYS.exploreFeed);
    clearCache(CACHE_KEYS.followingFeed);
    setIsAuthenticated(false);
    setIsGuest(false);
    setCurrentUserId('');
    setCurrentUser(null);
    navigateTo('home');
    toast({ title: 'Logged out successfully' });
  };

  // Check if user can access admin panel
  const canAccessAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'MODERATOR';

  // Loading state
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-pulse text-lg font-medium">Loading syntxt_</div>
        </div>
      </div>
    );
  }

  // Auth pages for guests who want to sign in/sign up
  if (isGuest && authView === 'signin') {
    return (
      <SignInPage 
        onBack={() => {
          sessionStorage.setItem(GUEST_SESSION_KEY, 'true');
          clearAuthParameters();
        }}
        onSignInSuccess={handleSignInSuccess}
      />
    );
  }
  
  if (isGuest && authView === 'signup') {
    return (
      <SignUpPage 
        onBack={() => {
          sessionStorage.setItem(GUEST_SESSION_KEY, 'true');
          clearAuthParameters();
        }}
        onSignUpSuccess={handleSignUpSuccess}
      />
    );
  }

  // Auth pages for non-authenticated users
  if (!isAuthenticated) {
    if (authView === 'signin') {
      return (
        <SignInPage 
          onBack={clearAuthParameters}
          onSignInSuccess={handleSignInSuccess}
        />
      );
    }
    
    if (authView === 'signup') {
      return (
        <SignUpPage 
          onBack={clearAuthParameters}
          onSignUpSuccess={handleSignUpSuccess}
        />
      );
    }
    
    // Welcome page (default for non-authenticated)
    if (!authView || authView === 'welcome') {
      return (
        <WelcomePage
          onSignIn={() => {
            const urlParams = new URLSearchParams(searchParams.toString());
            urlParams.set('auth', 'signin');
            router.push(`${pathname}?${urlParams.toString()}`);
          }}
          onSignUp={() => {
            const urlParams = new URLSearchParams(searchParams.toString());
            urlParams.set('auth', 'signup');
            router.push(`${pathname}?${urlParams.toString()}`);
          }}
          onExploreAsGuest={handleEnterAsGuest}
        />
      );
    }
  }

  // Render page based on current view
  const renderPage = () => {
    switch (currentView) {
      case 'profile':
        return (
          <ProfilePage
            userHandle={profileHandle || currentUser?.handle || ''}
            currentUserId={currentUserId}
            onUserClick={handleUserClick}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onRepost={handleRepost}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
            onBack={() => navigateTo('home')}
            onEditProfile={() => navigateTo('settings')}
          />
        );
      
      case 'post':
        return (
          <PostDetailsPage
            postId={postId || ''}
            currentUserId={currentUserId}
            currentUserHandle={currentUser?.handle}
            currentUserDisplayName={currentUser?.displayName}
            currentUserAvatar={currentUser?.avatar}
            onBack={() => navigateTo('home')}
            onUserClick={handleUserClick}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onRepost={handleRepost}
          />
        );
      
      case 'search':
        return (
          <SearchPage
            currentUserId={currentUserId}
            onUserClick={handleUserClick}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onRepost={handleRepost}
            onBack={() => navigateTo('home')}
          />
        );
      
      case 'messages':
        return (
          <MessagesPage
            currentUserId={currentUserId}
            onUserClick={handleUserClick}
            onMessageRead={handleMessageRead}
            onViewed={handleMessagesViewed}
            onBack={() => navigateTo('home')}
          />
        );
      
      case 'notifications':
        return (
          <NotificationsPage
            currentUserId={currentUserId}
            onUserClick={handleUserClick}
            onNotificationRead={handleNotificationRead}
            onViewed={handleNotificationsViewed}
            onBack={() => navigateTo('home')}
          />
        );
      
      case 'settings':
        return (
          <SettingsPage
            currentUser={currentUser}
            onUserUpdate={handleUserUpdate}
            onBack={() => navigateTo('home')}
            onLogout={handleLogout}
          />
        );
      
      default:
        // Home page
        return (
          <>
            {/* Feed Switcher */}
            <FeedSwitcher 
              activeFeed={activeFeed}
              onFeedChange={setActiveFeed}
            />

            {/* Posts */}
            {isLoading && !hasLoadedOnce ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className="border border-border rounded-md p-4 animate-pulse"
                  >
                    <div className="h-4 bg-muted rounded w-24 mb-3" />
                    <div className="h-4 bg-muted rounded w-full mb-2" />
                    <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                    <div className="h-8 bg-muted rounded w-full" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-muted-foreground">
                  {activeFeed === 'following' 
                    ? 'No posts from people you follow yet. Try exploring!'
                    : 'No posts yet. Be the first to share something!'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.slice(0, 30).map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={currentUserId}
                    onUserClick={handleUserClick}
                    onLike={handleLike}
                    onBookmark={handleBookmark}
                    onRepost={handleRepost}
                    onDelete={handleDeletePost}
                    onReport={handleReport}
                    onComment={handleComment}
                    onPostClick={handlePostClick}
                  />
                ))}
              </div>
            )}
          </>
        );
    }
  };

  // Hide floating compose button on messages page
  const showFloatingCompose = currentView !== 'messages' && !isGuest;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header - only shown on home page */}
      {currentView === 'home' && (
        <div className={`sticky top-0 z-40 transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
          <Header 
            currentUserHandle={currentUser?.handle || ''}
            onUserClick={() => {
              if (currentUser?.handle) {
                handleUserClick(currentUser.handle);
              }
            }}
          />
        </div>
      )}

      {/* Main Content - scrollable with consistent spacing */}
      <main 
        ref={mainContentRef}
        className={`flex-1 container max-w-2xl mx-auto px-4 pb-20 ${STANDARD_SPACING}`}
      >
        {renderPage()}
      </main>

      {/* Scroll to top button - only on home page */}
      {currentView === 'home' && <ScrollToTop />}

      {/* Floating Action Button - hidden on messages page and for guests */}
      {showFloatingCompose && (
        <FloatingActionButton onClick={() => setIsComposeOpen(true)} />
      )}

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={currentView}
        onTabChange={handleTabChange}
        unreadMessages={unreadMessages}
        unreadNotifications={unreadNotifications}
        isGuest={isGuest}
        onSignIn={() => {
          const urlParams = new URLSearchParams(searchParams.toString());
          urlParams.set('auth', 'signin');
          router.push(`${pathname}?${urlParams.toString()}`);
        }}
        onSignUp={() => {
          const urlParams = new URLSearchParams(searchParams.toString());
          urlParams.set('auth', 'signup');
          router.push(`${pathname}?${urlParams.toString()}`);
        }}
      />

      {/* Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onPublish={handlePublish}
        isPublishing={isPublishing}
      />

      {/* Comment Composer Modal */}
      <CommentComposer
        isOpen={isCommentOpen}
        onClose={() => {
          setIsCommentOpen(false);
          setSelectedPost(null);
        }}
        post={selectedPost}
        currentUserId={currentUserId}
        onComment={handleCommentSubmit}
      />

      {/* Repost Modal */}
      <RepostModal
        isOpen={isRepostOpen}
        onClose={() => {
          setIsRepostOpen(false);
          setSelectedPost(null);
        }}
        post={selectedPost}
        currentUserId={currentUserId}
        onRepost={handleRepostCallback}
        onQuotePost={handleQuotePost}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        postId={reportPostId}
        reportedUserId={reportUserId}
        currentUserId={currentUserId}
      />

      {/* Admin Panel */}
      {canAccessAdmin && (
        <AdminPanel
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Heart, Repeat2, Bookmark, MoreHorizontal, Globe, Copy, Share2, Flag, Trash2, Image as ImageIcon, Loader2, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Post, Reply } from './types';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ImageLightbox } from './ImageLightbox';
import { convertImage, validateImageFile, formatFileSize, supportsAvif } from '@/lib/imageUtils';
import { renderTextWithEntities } from '@/lib/linkUtils';
import { RepostModal } from './RepostModal';

interface PostDetailsPageProps {
  postId: string;
  currentUserId?: string;
  currentUserHandle?: string;
  currentUserDisplayName?: string | null;
  currentUserAvatar?: string | null;
  onBack: () => void;
  onUserClick: (handle: string) => void;
  onLike: (postId: string) => void;
  onBookmark: (postId: string) => void;
  onRepost: (postId: string) => void;
}

// Extended Reply type with nested replies (max 2 levels)
interface NestedReply extends Reply {
  replies?: NestedReply[];
  likesCount?: number;
  isLiked?: boolean;
  // For replies to other replies, show who it's replying to
  replyToAuthor?: {
    id: string;
    handle: string;
    displayName: string | null;
  };
}

function formatTimeAgo(dateString: string): string {
  if (!dateString) return 'now';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'now';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    hour: '2-digit',
    minute: '2-digit',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// Comment Item Component (Level 1 - direct reply to post)
function CommentItem({ 
  reply, 
  currentUserId,
  onUserClick,
  onReplyTo,
  onLikeReply,
}: { 
  reply: NestedReply; 
  currentUserId?: string;
  onUserClick: (handle: string) => void;
  onReplyTo: (reply: NestedReply) => void;
  onLikeReply: (replyId: string) => void;
}) {
  const [showReplies, setShowReplies] = useState(true);
  // Defensive check for missing author
  const author = reply.author || { id: 'unknown', handle: 'unknown', displayName: 'Unknown User', avatar: null };
  const displayName = author.displayName || author.handle;
  const hasReplies = reply.replies && reply.replies.length > 0;

  return (
    <div className="flex gap-2">
      {/* Avatar */}
      <button
        onClick={() => onUserClick(author.handle)}
        className="shrink-0 self-start"
      >
        {author.avatar ? (
          <img 
            src={author.avatar} 
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-medium text-xs">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      <div className="flex-1 min-w-0">
        {/* Header - all on same line */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => onUserClick(author.handle)}
            className="font-medium text-sm hover:underline"
          >
            {displayName}
          </button>
          <span className="text-xs text-muted-foreground">@{author.handle}</span>
          <span className="text-muted-foreground text-xs">·</span>
          <span className="text-xs text-muted-foreground">
            {formatTimeAgo(reply.createdAt)}
          </span>
        </div>

        {/* Content */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words mt-1">
          {renderTextWithEntities(reply.content, onUserClick)}
        </div>

        {/* Image */}
        {reply.imageUrl && (
          <div className="mt-2 rounded-lg overflow-hidden">
            <img
              src={reply.imageUrl}
              alt="Reply image"
              className="max-h-48 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 mt-2">
          {/* Like */}
          <button
            onClick={() => onLikeReply(reply.id)}
            className={cn(
              "flex items-center gap-1 text-xs transition-colors",
              reply.isLiked 
                ? 'text-red-500' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Heart className={cn("w-3.5 h-3.5", reply.isLiked && 'fill-current')} />
            {reply.likesCount && reply.likesCount > 0 && (
              <span>{reply.likesCount}</span>
            )}
          </button>

          {/* Reply button */}
          <button
            onClick={() => onReplyTo(reply)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Reply</span>
          </button>

          {/* Show/Hide replies toggle */}
          {hasReplies && (
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showReplies ? 'Hide' : `Show ${reply.replies?.length}`} {reply.replies?.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>

        {/* Replies (Level 2 - all flattened under comment) */}
        {showReplies && hasReplies && (
          <div className="mt-3 space-y-3 border-l border-border/50 pl-3">
            {reply.replies?.map((nestedReply, index) => (
              <ReplyItemFlat
                key={nestedReply.id || `nested-reply-${index}-${reply.id}`}
                reply={nestedReply}
                currentUserId={currentUserId}
                onUserClick={onUserClick}
                onReplyTo={onReplyTo}
                onLikeReply={onLikeReply}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Reply Item (Level 2 - flattened, no deeper nesting)
function ReplyItemFlat({ 
  reply, 
  currentUserId,
  onUserClick,
  onReplyTo,
  onLikeReply,
}: { 
  reply: NestedReply; 
  currentUserId?: string;
  onUserClick: (handle: string) => void;
  onReplyTo: (reply: NestedReply) => void;
  onLikeReply: (replyId: string) => void;
}) {
  // Defensive check for missing author
  const author = reply.author || { id: 'unknown', handle: 'unknown', displayName: 'Unknown User', avatar: null };
  const displayName = author.displayName || author.handle;
  const replyToHandle = reply.replyToAuthor?.handle;

  return (
    <div className="flex gap-2">
      {/* Avatar */}
      <button
        onClick={() => onUserClick(author.handle)}
        className="shrink-0 self-start"
      >
        {author.avatar ? (
          <img 
            src={author.avatar} 
            alt={displayName}
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-medium text-[10px]">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      <div className="flex-1 min-w-0">
        {/* Header - all on same line */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => onUserClick(author.handle)}
            className="font-medium text-sm hover:underline"
          >
            {displayName}
          </button>
          <span className="text-xs text-muted-foreground">@{author.handle}</span>
          <span className="text-muted-foreground text-xs">·</span>
          <span className="text-xs text-muted-foreground">
            {formatTimeAgo(reply.createdAt)}
          </span>
        </div>

        {/* Content with "Replying to" indicator */}
        {replyToHandle && (
          <div className="text-xs text-muted-foreground mt-0.5">
            Replying to <button onClick={() => onUserClick(replyToHandle)} className="text-primary hover:underline">@{replyToHandle}</button>
          </div>
        )}
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words mt-0.5">
          {renderTextWithEntities(reply.content, onUserClick)}
        </div>

        {/* Image */}
        {reply.imageUrl && (
          <div className="mt-2 rounded-lg overflow-hidden">
            <img
              src={reply.imageUrl}
              alt="Reply image"
              className="max-h-48 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 mt-2">
          {/* Like */}
          <button
            onClick={() => onLikeReply(reply.id)}
            className={cn(
              "flex items-center gap-1 text-xs transition-colors",
              reply.isLiked 
                ? 'text-red-500' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Heart className={cn("w-3.5 h-3.5", reply.isLiked && 'fill-current')} />
            {reply.likesCount && reply.likesCount > 0 && (
              <span>{reply.likesCount}</span>
            )}
          </button>

          {/* Reply button */}
          <button
            onClick={() => onReplyTo(reply)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Reply</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function PostDetailsPage({
  postId,
  currentUserId,
  currentUserHandle,
  currentUserDisplayName,
  currentUserAvatar,
  onBack,
  onUserClick,
  onLike,
  onBookmark,
  onRepost,
}: PostDetailsPageProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<NestedReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<NestedReply | null>(null);
  const [isRepostOpen, setIsRepostOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Optimistic like state
  const [optimisticLike, setOptimisticLike] = useState<{ isLiked: boolean; likesCount: number } | null>(null);
  const [optimisticBookmark, setOptimisticBookmark] = useState<boolean | null>(null);
  const [optimisticRepost, setOptimisticRepost] = useState<{ isReposted: boolean; repostsCount: number } | null>(null);

  // Fetch post and replies
  const fetchPost = useCallback(async () => {
    if (!postId) {
      setError('No post ID provided');
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/posts/${postId}?userId=${currentUserId || ''}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        if (res.status === 404) {
          setError('Post not found');
        } else {
          setError('Failed to load post');
        }
        setPost(null);
        setReplies([]);
        return;
      }

      const data = await res.json();

      if (!data || !data.author) {
        setError('Invalid post data');
        setPost(null);
        setReplies([]);
        return;
      }

      setPost(data);
      setReplies(data.replies || []);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('Fetch post error:', err);
      setError('Failed to load post');
      setPost(null);
      setReplies([]);
    } finally {
      setIsLoading(false);
    }
  }, [postId, currentUserId]);

  useEffect(() => {
    fetchPost();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPost]);

  // Focus reply input when replying to a comment
  useEffect(() => {
    if (replyingTo && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [replyingTo]);

  // Image handling
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({ title: validation.error, variant: 'destructive' });
      return;
    }

    setIsConverting(true);
    try {
      const result = await convertImage(file, { maxSizeKB: 50 });
      setReplyImage(result.dataUrl);
      setReplyImagePreview(result.dataUrl);
      toast({
        title: 'Image ready',
        description: `Converted to ${result.format.toUpperCase()} (${formatFileSize(result.convertedSize)})`,
      });
    } catch (error) {
      console.error('Image conversion error:', error);
      toast({ title: 'Failed to process image', variant: 'destructive' });
    }
    setIsConverting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = () => {
    setReplyImage(null);
    setReplyImagePreview(null);
  };

  // Submit reply
  const handleSubmitReply = async () => {
    if (!post || !currentUserId || (!replyContent.trim() && !replyImage)) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent.trim(),
          authorId: currentUserId,
          imageUrl: replyImage,
          parentReplyId: replyingTo?.id,
        }),
      });
      const newReply = await res.json();

      if (replyingTo) {
        // Find the root comment (first level reply)
        const findRootComment = (replies: NestedReply[], targetId: string): NestedReply | null => {
          for (const r of replies) {
            if (r.id === targetId) return r; // Found directly in top level
            if (r.replies) {
              for (const nested of r.replies) {
                if (nested.id === targetId) return r; // Found in nested, return parent root
              }
            }
          }
          return null;
        };

        const rootComment = findRootComment(replies, replyingTo.id);
        
        if (rootComment && rootComment.id === replyingTo.id) {
          // Replying directly to a root comment - add to its replies
          setReplies(prev => prev.map(r => {
            if (r.id === rootComment.id) {
              return {
                ...r,
                replies: [...(r.replies || []), newReply],
              };
            }
            return r;
          }));
        } else if (rootComment) {
          // Replying to a nested reply - add to root comment's replies with replyToAuthor
          const replyWithAuthor = {
            ...newReply,
            replyToAuthor: replyingTo.author,
          };
          setReplies(prev => prev.map(r => {
            if (r.id === rootComment.id) {
              return {
                ...r,
                replies: [...(r.replies || []), replyWithAuthor],
              };
            }
            return r;
          }));
        }
        toast({ title: `Replied to @${replyingTo.author?.handle || 'unknown'}` });
      } else {
        // Add as top-level reply (comment)
        setReplies(prev => [...prev, newReply]);
        toast({ title: 'Reply posted!' });
      }

      setReplyContent('');
      setReplyImage(null);
      setReplyImagePreview(null);
      setReplyingTo(null);
    } catch (error) {
      console.error('Reply error:', error);
      toast({ title: 'Failed to post reply', variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  // Like reply
  const handleLikeReply = async (replyId: string) => {
    if (!currentUserId) return;

    // Optimistic update for flattened structure
    const updateReplyLike = (replies: NestedReply[]): NestedReply[] => {
      return replies.map(r => {
        // Check top-level comment
        if (r.id === replyId) {
          const newIsLiked = !r.isLiked;
          return {
            ...r,
            isLiked: newIsLiked,
            likesCount: (r.likesCount || 0) + (newIsLiked ? 1 : -1),
          };
        }
        // Check nested replies
        if (r.replies) {
          return {
            ...r,
            replies: r.replies.map(nested => {
              if (nested.id === replyId) {
                const newIsLiked = !nested.isLiked;
                return {
                  ...nested,
                  isLiked: newIsLiked,
                  likesCount: (nested.likesCount || 0) + (newIsLiked ? 1 : -1),
                };
              }
              return nested;
            }),
          };
        }
        return r;
      });
    };
    setReplies(prev => updateReplyLike(prev));

    // Sync with server
    try {
      await fetch('/api/replies/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyId, userId: currentUserId }),
      });
    } catch (error) {
      console.error('Like reply error:', error);
    }
  };

  // Reply to a reply
  const handleReplyTo = (reply: NestedReply) => {
    setReplyingTo(reply);
    const handle = reply.author?.handle || 'unknown';
    setReplyContent(`@${handle} `);
  };

  // Cancel reply to
  const cancelReplyTo = () => {
    setReplyingTo(null);
    setReplyContent('');
  };

  // Translation
  const handleTranslate = async () => {
    if (!post) return;
    if (translatedContent) {
      setTranslatedContent(null);
      return;
    }

    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, content: post.content }),
      });
      const data = await res.json();
      if (data.translation) setTranslatedContent(data.translation);
    } catch {
      toast({ title: 'Translation failed', variant: 'destructive' });
    }
    setIsTranslating(false);
    setIsMenuOpen(false);
  };

  // Other actions
  const handleCopyText = () => {
    if (post) {
      navigator.clipboard.writeText(post.content);
      toast({ title: 'Copied to clipboard' });
    }
    setIsMenuOpen(false);
  };

  const handleShareLink = () => {
    const url = `${window.location.origin}?postId=${postId}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied to clipboard' });
    setIsMenuOpen(false);
  };

  const handleDelete = async () => {
    if (!post) return;
    try {
      await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      toast({ title: 'Post deleted' });
      onBack();
    } catch {
      toast({ title: 'Error deleting post', variant: 'destructive' });
    }
    setIsMenuOpen(false);
  };

  // Optimistic handlers
  const handleLikeClick = () => {
    if (!post) return;
    const newIsLiked = !post.isLiked;
    const newLikesCount = newIsLiked ? post.likesCount + 1 : Math.max(0, post.likesCount - 1);
    setOptimisticLike({ isLiked: newIsLiked, likesCount: newLikesCount });
    onLike(post.id);
    setTimeout(() => setOptimisticLike(null), 1000);
  };

  const handleBookmarkClick = () => {
    if (!post) return;
    setOptimisticBookmark(!post.isBookmarked);
    onBookmark(post.id);
    setTimeout(() => setOptimisticBookmark(null), 1000);
  };

  const handleRepostClick = () => {
    if (!post) return;
    setIsRepostOpen(true);
  };

  // Handle repost callback from modal
  const handleRepostCallback = (postId: string, isReposted: boolean) => {
    if (!post) return;
    const newRepostsCount = isReposted ? post.repostsCount + 1 : Math.max(0, post.repostsCount - 1);
    setPost(prev => prev ? { ...prev, isReposted, repostsCount: newRepostsCount } : null);
    onRepost(postId);
  };

  // Handle quote post callback
  const handleQuotePostCallback = (postId: string, quoteContent: string) => {
    // Refresh the post to show the new quote
    fetchPost();
    toast({ title: 'Quote posted!' });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="pb-4">
        <div className="flex items-center gap-2 -mx-4 px-4 h-14 border-b border-border sticky top-0 bg-background z-10">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">Post</h1>
        </div>
        <div className="pt-4 text-center text-muted-foreground">
          <span className="animate-pulse">Loading...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !post) {
    return (
      <div className="pb-4">
        <div className="flex items-center gap-2 -mx-4 px-4 h-14 border-b border-border sticky top-0 bg-background z-10">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">Post</h1>
        </div>
        <div className="pt-4 text-center text-muted-foreground">
          {error || 'Post not found'}
        </div>
      </div>
    );
  }

  const author = post.author;
  const displayName = author?.displayName || author?.handle || 'Unknown';
  const isOwnPost = currentUserId === author?.id;
  const charLimit = 300;
  const remaining = charLimit - replyContent.length;

  const displayIsLiked = optimisticLike?.isLiked ?? post.isLiked;
  const displayLikesCount = optimisticLike?.likesCount ?? post.likesCount;
  const displayIsBookmarked = optimisticBookmark ?? post.isBookmarked;
  const displayIsReposted = optimisticRepost?.isReposted ?? post.isReposted;
  const displayRepostsCount = optimisticRepost?.repostsCount ?? post.repostsCount;

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="flex items-center gap-2 -mx-4 px-4 h-14 border-b border-border sticky top-0 bg-background z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-8 w-8 btn-bounce"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold">Post</h1>
      </div>

      {/* Content with proper spacing from header */}
      <div className="pt-4">
        {/* Main Post */}
        <article className="border-b border-border pb-4 mb-4">
          {/* Author info */}
          <div className="flex items-start justify-between mb-3">
            <button
              onClick={() => author?.handle && onUserClick(author.handle)}
              className="flex items-center gap-3 group"
            >
              {author?.avatar ? (
                <img 
                  src={author.avatar} 
                  alt={displayName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-medium">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col items-start">
                <span className="text-base font-medium text-foreground group-hover:underline">
                  {displayName}
                </span>
                <span className="text-sm text-muted-foreground">@{author?.handle || 'unknown'}</span>
              </div>
            </button>

            {/* 3-dot menu */}
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleTranslate} disabled={isTranslating}>
                  <Globe className="w-4 h-4 mr-2" />
                  {translatedContent ? 'Show original' : isTranslating ? 'Translating...' : 'Translate'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyText}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy text
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareLink}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isOwnPost && (
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete post
                  </DropdownMenuItem>
                )}
                {!isOwnPost && (
                  <DropdownMenuItem className="text-destructive">
                    <Flag className="w-4 h-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content */}
          <div className="text-lg leading-relaxed whitespace-pre-wrap break-words mb-4">
            {renderTextWithEntities(translatedContent || post.content, onUserClick)}
            {translatedContent && (
              <div className="mt-2 text-sm text-muted-foreground">— Translated</div>
            )}
          </div>

          {/* Quoted Post - for quote posts */}
          {post.isQuotePost && post.quotedPost && (
            <div 
              className="border border-border rounded-lg p-3 bg-muted/30 mb-4 hover:bg-muted/50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                // Navigate to quoted post
                window.location.href = `?postId=${post.quotedPost!.id}`;
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                {post.quotedPost.author.avatar ? (
                  <img 
                    src={post.quotedPost.author.avatar} 
                    alt={post.quotedPost.author.displayName || post.quotedPost.author.handle}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                    {(post.quotedPost.author.displayName || post.quotedPost.author.handle).charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium">{post.quotedPost.author.displayName || post.quotedPost.author.handle}</span>
                <span className="text-xs text-muted-foreground">@{post.quotedPost.author.handle}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-4">{post.quotedPost.content}</p>
              {post.quotedPost.imageUrl && (
                <img 
                  src={post.quotedPost.imageUrl} 
                  alt="Quoted post image"
                  className="mt-2 rounded-md max-h-32 object-cover"
                />
              )}
            </div>
          )}

          {/* Image */}
          {post.imageUrl && !post.isQuotePost && (
            <div 
              className="rounded-lg overflow-hidden mb-4 cursor-pointer"
              onClick={() => setLightboxImage(post.imageUrl!)}
            >
              <img
                src={post.imageUrl}
                alt={post.imageAlt || 'Post image'}
                className="w-full max-h-[400px] object-cover hover:opacity-90 transition-opacity"
              />
            </div>
          )}

          {/* Link preview */}
          {post.linkUrl && post.linkTitle && (
            <a
              href={post.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block border border-border rounded-lg overflow-hidden hover:border-foreground transition-colors mb-4"
            >
              {post.linkImage && (
                <img 
                  src={post.linkImage} 
                  alt={post.linkTitle}
                  className="w-full h-32 object-cover"
                />
              )}
              <div className="p-3">
                <p className="text-sm font-medium line-clamp-1">{post.linkTitle}</p>
                {post.linkDesc && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{post.linkDesc}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {new URL(post.linkUrl).hostname}
                </p>
              </div>
            </a>
          )}

          {/* Timestamp */}
          <div className="text-sm text-muted-foreground mb-4">
            {formatFullDate(post.createdAt)}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 py-3 border-y border-border text-sm">
            <div>
              <span className="font-bold">{displayRepostsCount}</span>
              <span className="text-muted-foreground ml-1">Reposts</span>
            </div>
            <div>
              <span className="font-bold">{displayLikesCount}</span>
              <span className="text-muted-foreground ml-1">Likes</span>
            </div>
            <div>
              <span className="font-bold">{replies.length}</span>
              <span className="text-muted-foreground ml-1">Replies</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-around py-3 border-b border-border">
            <button
              onClick={handleLikeClick}
              className={cn(
                'flex items-center gap-1.5 p-2 rounded-full transition-colors btn-bounce',
                displayIsLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
              )}
            >
              <Heart className={cn('w-5 h-5', displayIsLiked && 'fill-current')} />
            </button>
            <button
              onClick={handleRepostClick}
              className={cn(
                'flex items-center gap-1.5 p-2 rounded-full transition-colors btn-bounce',
                displayIsReposted ? 'text-green-500' : 'text-muted-foreground hover:text-green-500'
              )}
            >
              <Repeat2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleBookmarkClick}
              className={cn(
                'flex items-center gap-1.5 p-2 rounded-full transition-colors btn-bounce',
                displayIsBookmarked ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500'
              )}
            >
              <Bookmark className={cn('w-5 h-5', displayIsBookmarked && 'fill-current')} />
            </button>
          </div>
        </article>

        {/* Reply composer */}
        {currentUserId && (
          <div className="border-b border-border pb-4 mb-4">
            {/* Replying to indicator */}
            {replyingTo && (
              <div className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-md mb-3">
                <span className="text-sm text-muted-foreground">
                  Replying to <span className="text-foreground font-medium">@{replyingTo.author?.handle || 'unknown'}</span>
                </span>
                <button
                  onClick={cancelReplyTo}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <div className="flex-1">
                <Textarea
                  ref={replyInputRef}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={replyingTo ? `Reply to @${replyingTo.author?.handle || 'unknown'}...` : "Post your reply..."}
                  className="min-h-[80px] resize-none"
                  maxLength={charLimit}
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isConverting || !!replyImage}
                      className="h-8 w-8 btn-bounce"
                    >
                      {isConverting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ImageIcon className="w-4 h-4" />
                      )}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {supportsAvif() ? 'AVIF' : 'WebP'} • max 50KB
                    </span>
                  </div>
                  <span className={cn(
                    "text-xs",
                    remaining < 20 && remaining >= 0 && "text-amber-500",
                    remaining < 0 && "text-destructive"
                  )}>
                    {remaining}
                  </span>
                </div>

                {replyImagePreview && (
                  <div className="relative mt-3 rounded-lg overflow-hidden border border-border">
                    <img
                      src={replyImagePreview}
                      alt="Preview"
                      className="w-full max-h-32 object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={removeImage}
                      className="absolute top-2 right-2 h-6 w-6 bg-black/50 hover:bg-black/70 text-white btn-bounce"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <Button
              onClick={handleSubmitReply}
              disabled={isSubmitting || (!replyContent.trim() && !replyImage) || replyContent.length > charLimit}
              className="w-full mt-3 btn-bounce"
            >
              {isSubmitting ? 'Posting...' : replyingTo ? 'Reply' : 'Reply'}
            </Button>
          </div>
        )}

        {/* Replies list */}
        {replies.length > 0 ? (
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">Replies</h3>
            {replies.map((reply, index) => (
              <CommentItem
                key={reply.id || `reply-${index}`}
                reply={reply}
                currentUserId={currentUserId}
                onUserClick={onUserClick}
                onReplyTo={handleReplyTo}
                onLikeReply={handleLikeReply}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No replies yet. Be the first to reply!
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        src={lightboxImage || ''}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      {/* Repost Modal */}
      <RepostModal
        isOpen={isRepostOpen}
        onClose={() => setIsRepostOpen(false)}
        post={post}
        currentUserId={currentUserId}
        onRepost={handleRepostCallback}
        onQuotePost={handleQuotePostCallback}
      />
    </div>
  );
}

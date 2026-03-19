'use client';

import { useState } from 'react';
import { X, Repeat2, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Post } from './types';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface RepostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  currentUserId?: string;
  onRepost: (postId: string, isReposted: boolean, repostedBy?: { id: string; handle: string; displayName?: string | null; avatar?: string | null }) => void;
  onQuotePost: (postId: string, quoteContent: string) => void;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RepostModal({
  isOpen,
  onClose,
  post,
  currentUserId,
  onRepost,
  onQuotePost,
}: RepostModalProps) {
  const [mode, setMode] = useState<'choose' | 'quote'>('choose');
  const [quoteContent, setQuoteContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDirectRepost = async () => {
    if (!post || !currentUserId) return;
    
    setIsLoading(true);
    try {
      if (post.isReposted) {
        await fetch(`/api/repost?postId=${post.id}&userId=${currentUserId}`, {
          method: 'DELETE',
        });
        onRepost(post.id, false);
        toast({ title: 'Repost removed' });
      } else {
        const res = await fetch('/api/repost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: post.id, userId: currentUserId }),
        });
        const data = await res.json();
        
        // Pass repostedBy info to update the feed
        onRepost(post.id, true, {
          id: currentUserId,
          handle: '', // Will be filled by parent component
          displayName: null,
          avatar: null,
        });
        toast({ title: 'Reposted!' });
      }
      onClose();
      setMode('choose');
    } catch (error) {
      console.error('Repost error:', error);
      toast({ title: 'Error', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleQuotePost = async () => {
    if (!post || !currentUserId || !quoteContent.trim()) return;
    
    setIsLoading(true);
    try {
      await fetch('/api/repost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          postId: post.id, 
          userId: currentUserId,
          isQuote: true,
          quoteContent: quoteContent.trim(),
        }),
      });
      onQuotePost(post.id, quoteContent.trim());
      toast({ title: 'Quote posted!' });
      onClose();
      setMode('choose');
      setQuoteContent('');
    } catch (error) {
      console.error('Quote post error:', error);
      toast({ title: 'Error', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleClose = () => {
    onClose();
    setMode('choose');
    setQuoteContent('');
  };

  if (!post) return null;

  const displayName = post.author.displayName || post.author.handle;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border p-0 gap-0" showCloseButton={false}>
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {mode === 'choose' ? 'Repost' : 'Quote Post'}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 btn-bounce">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {mode === 'choose' ? (
          <div className="p-4 space-y-2">
            <button
              onClick={handleDirectRepost}
              disabled={isLoading}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:border-foreground transition-colors text-left",
                post.isReposted && "opacity-50"
              )}
            >
              <div className="p-2 rounded-full bg-green-500/10 text-green-500">
                <Repeat2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-sm">
                  {post.isReposted ? 'Undo Repost' : 'Repost'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {post.isReposted ? 'Remove this post from your profile' : 'Share this post to your profile'}
                </p>
              </div>
            </button>

            <button
              onClick={() => setMode('quote')}
              disabled={isLoading}
              className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:border-foreground transition-colors text-left"
            >
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Quote className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-sm">Quote</p>
                <p className="text-xs text-muted-foreground">
                  Add your comment to this post
                </p>
              </div>
            </button>
          </div>
        ) : (
          <div className="p-4">
            {/* Quote content input */}
            <Textarea
              value={quoteContent}
              onChange={(e) => setQuoteContent(e.target.value)}
              placeholder="Add your thoughts..."
              className="min-h-[100px] mb-4"
              maxLength={300}
            />
            <div className="text-xs text-muted-foreground text-right mb-4">
              {quoteContent.length}/300
            </div>

            {/* Quoted post preview */}
            <div className="border border-border rounded-lg p-3 bg-muted/30 mb-4">
              <div className="flex items-center gap-2 mb-2">
                {post.author.avatar ? (
                  <img 
                    src={post.author.avatar} 
                    alt={displayName}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium">{displayName}</span>
                <span className="text-xs text-muted-foreground">@{post.author.handle}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(post.createdAt)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3">{post.content}</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setMode('choose')}
                className="flex-1 btn-bounce"
              >
                Back
              </Button>
              <Button
                onClick={handleQuotePost}
                disabled={isLoading || !quoteContent.trim()}
                className="flex-1 btn-bounce"
              >
                {isLoading ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

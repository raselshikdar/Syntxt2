'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Heart, Repeat2, UserPlus, MessageCircle, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Notification } from './types';
import { cn } from '@/lib/utils';

interface NotificationsPageProps {
  currentUserId?: string;
  onUserClick: (handle: string) => void;
  onNotificationRead: () => void;
  onViewed: () => void;
  onBack: () => void;
}

const notificationIcons = {
  like: Heart,
  repost: Repeat2,
  follow: UserPlus,
  reply: MessageCircle,
  mention: AtSign,
};

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

export function NotificationsPage({
  currentUserId,
  onUserClick,
  onNotificationRead,
  onViewed,
  onBack,
}: NotificationsPageProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasViewedRef = useRef(false);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/notifications?userId=${currentUserId}`);
        const data = await res.json();
        setNotifications(data.notifications || []);
        // Mark as viewed only once
        if (!hasViewedRef.current) {
          hasViewedRef.current = true;
          onViewed();
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
      setIsLoading(false);
    };

    fetchNotifications();
  }, [currentUserId]); // Removed onViewed from dependency array

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await fetch(`/api/notifications?id=${notification.id}`, {
        method: 'PATCH',
      });
      setNotifications(prev =>
        prev.map(n => (n.id === notification.id ? { ...n, read: true } : n))
      );
      onNotificationRead();
    }

    // Navigate based on type
    if (notification.type === 'follow') {
      // Open user profile
      onUserClick(notification.relatedId || '');
    }
  };

  return (
    <div className="pb-4">
      {/* Header with same height as global header */}
      <div className="flex items-center gap-2 -mx-4 px-4 h-14 border-b border-border sticky top-0 bg-background z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="btn-bounce h-8 w-8"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold">Notifications</h1>
      </div>
      
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          <span className="animate-pulse">Loading...</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No notifications yet
        </div>
      ) : (
        <div className="divide-y divide-border -mx-4">
          {notifications.map((notification) => {
            const Icon = notificationIcons[notification.type] || Heart;
            return (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  'w-full flex items-start gap-3 p-4 text-left hover:bg-muted transition-colors',
                  !notification.read && 'bg-muted/50'
                )}
              >
                <div className={cn(
                  'p-2 rounded-full',
                  notification.type === 'like' && 'bg-red-500/10 text-red-500',
                  notification.type === 'repost' && 'bg-green-500/10 text-green-500',
                  notification.type === 'follow' && 'bg-blue-500/10 text-blue-500',
                  notification.type === 'reply' && 'bg-purple-500/10 text-purple-500',
                  notification.type === 'mention' && 'bg-amber-500/10 text-amber-500',
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{notification.title}</p>
                  {notification.content && (
                    <p className="text-sm text-muted-foreground truncate">{notification.content}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTimeAgo(notification.createdAt)}
                  </p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

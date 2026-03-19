'use client';

import { useState, useEffect } from 'react';
import { X, Heart, Repeat2, UserPlus, MessageCircle, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Notification } from './types';
import { cn } from '@/lib/utils';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  onUserClick: (handle: string) => void;
  onNotificationRead: () => void;
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

export function NotificationsModal({
  isOpen,
  onClose,
  currentUserId,
  onUserClick,
  onNotificationRead,
}: NotificationsModalProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/notifications?userId=${currentUserId}`);
        const data = await res.json();
        setNotifications(data.notifications || []);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
      setIsLoading(false);
    };

    fetchNotifications();
  }, [isOpen, currentUserId]);

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
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden bg-card border-border p-0 gap-0">
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Notifications</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 btn-bounce">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[calc(85vh-60px)]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <span className="animate-pulse">Loading...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-border">
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
      </DialogContent>
    </Dialog>
  );
}

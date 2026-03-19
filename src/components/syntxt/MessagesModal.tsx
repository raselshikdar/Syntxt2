'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, ArrowLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Message, User as UserType } from './types';
import { cn } from '@/lib/utils';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  onUserClick: (handle: string) => void;
  onMessageRead: () => void;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 86400) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffInSeconds < 604800) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function MessagesModal({
  isOpen,
  onClose,
  currentUserId,
  onUserClick,
  onMessageRead,
}: MessagesModalProps) {
  const [conversations, setConversations] = useState<(UserType & { lastMessage?: Message; unread: number })[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    const fetchConversations = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/messages?userId=${currentUserId}`);
        const data = await res.json();
        setConversations(data.conversations || []);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      }
      setIsLoading(false);
    };

    fetchConversations();
  }, [isOpen, currentUserId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (!selectedUser || !currentUserId) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?userId=${currentUserId}&otherUserId=${selectedUser.id}`);
        const data = await res.json();
        setMessages(data.messages || []);
        
        // Mark as read
        await fetch('/api/messages/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId, otherUserId: selectedUser.id }),
        });
        onMessageRead();
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [selectedUser, currentUserId, onMessageRead]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !currentUserId) return;

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: currentUserId,
      receiverId: selectedUser.id,
      content: newMessage.trim(),
      read: false,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUserId,
          receiverId: selectedUser.id,
          content: tempMessage.content,
        }),
      });
      const data = await res.json();
      
      // Replace temp message with real one
      setMessages(prev =>
        prev.map(m => (m.id === tempMessage.id ? data.message : m))
      );
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleBack = () => {
    setSelectedUser(null);
    setMessages([]);
    // Refresh conversations
    if (currentUserId) {
      fetch(`/api/messages?userId=${currentUserId}`)
        .then(res => res.json())
        .then(data => setConversations(data.conversations || []));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden bg-card border-border p-0 gap-0">
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedUser && (
                <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 btn-bounce">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <DialogTitle className="text-lg font-semibold">
                {selectedUser ? selectedUser.displayName || selectedUser.handle : 'Messages'}
              </DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 btn-bounce">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        {selectedUser ? (
          // Chat view
          <>
            <div className="overflow-y-auto flex-1 p-4 h-[400px]">
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      message.senderId === currentUserId ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[70%] px-3 py-2 rounded-lg text-sm',
                        message.senderId === currentUserId
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {message.content}
                      <div className={cn(
                        'text-xs mt-1',
                        message.senderId === currentUserId
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      )}>
                        {formatTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
            
            {/* Message input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()} className="btn-bounce">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          // Conversations list
          <div className="overflow-y-auto max-h-[calc(85vh-60px)]">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <span className="animate-pulse">Loading...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No messages yet
              </div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted transition-colors"
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.handle} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{user.displayName || user.handle}</p>
                        {user.lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatTime(user.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      {user.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">{user.lastMessage.content}</p>
                      )}
                    </div>
                    {user.unread > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        {user.unread}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

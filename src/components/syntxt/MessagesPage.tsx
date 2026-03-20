'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, User, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Message, User as UserType } from './types';
import { cn } from '@/lib/utils';

interface MessagesPageProps {
  currentUserId?: string;
  onUserClick: (handle: string) => void;
  onMessageRead: () => void;
  onViewed: () => void;
  onBack: () => void;
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

interface ConversationUser {
  id: string;
  handle: string;
  displayName?: string | null;
  avatar?: string | null;
}

interface Conversation {
  user: ConversationUser;
  lastMessage?: Message;
  unread: number;
}

export function MessagesPage({
  currentUserId,
  onUserClick,
  onMessageRead,
  onViewed,
  onBack,
}: MessagesPageProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<ConversationUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // New message modal state
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserType[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchConversations = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/messages?userId=${currentUserId}`);
        const data = await res.json();
        setConversations(data.conversations || []);
        // Mark as viewed
        onViewed();
      } catch (error) {
        console.error('Error fetching conversations:', error);
      }
      setIsLoading(false);
    };

    fetchConversations();
  }, [currentUserId, onViewed]);

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

  // Search users when query changes
  useEffect(() => {
    if (searchQuery.length < 2) {
      return;
    }

    let isCancelled = false;
    
    const searchUsers = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(searchQuery)}&currentUserId=${currentUserId || ''}`);
        const data = await res.json();
        if (!isCancelled) {
          setSearchResults(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Search error:', error);
      }
      if (!isCancelled) {
        setIsSearching(false);
      }
    };

    const timeout = setTimeout(searchUsers, 300);
    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [searchQuery, currentUserId]);

  // Reset search when modal closes
  const handleCloseNewMessage = () => {
    setShowNewMessage(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Focus search input when modal opens
  useEffect(() => {
    if (showNewMessage && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showNewMessage]);

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

  const handleSelectUser = (user: UserType) => {
    setSelectedUser({
      id: user.id,
      handle: user.handle,
      displayName: user.displayName,
      avatar: user.avatar,
    });
    setShowNewMessage(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Chat view
  if (selectedUser) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] -mx-4">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="btn-bounce h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <button
            onClick={() => {
              handleBack();
              onUserClick(selectedUser.handle);
            }}
            className="flex items-center gap-2"
          >
            {selectedUser.avatar ? (
              <img src={selectedUser.avatar} alt={selectedUser.handle} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                {(selectedUser.displayName || selectedUser.handle).charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-medium">{selectedUser.displayName || selectedUser.handle}</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
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
        
        {/* Input */}
        <div className="p-4 border-t border-border bg-background">
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
      </div>
    );
  }

  // Conversations list
  return (
    <div className="pb-4 relative">
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
        <h1 className="text-lg font-semibold">Messages</h1>
      </div>
      
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          <span className="animate-pulse">Loading...</span>
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="mb-2">No messages yet</p>
          <p className="text-sm">Tap the + button to start a conversation</p>
        </div>
      ) : (
        <div className="divide-y divide-border -mx-4">
          {conversations.map((conversation) => (
            <button
              key={conversation.user.id}
              onClick={() => setSelectedUser(conversation.user)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted transition-colors"
            >
              {conversation.user.avatar ? (
                <img src={conversation.user.avatar} alt={conversation.user.handle} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{conversation.user.displayName || conversation.user.handle}</p>
                  {conversation.lastMessage && (
                    <span className="text-xs text-muted-foreground">
                      {formatTime(conversation.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                {conversation.lastMessage && (
                  <p className="text-sm text-muted-foreground truncate">{conversation.lastMessage.content}</p>
                )}
              </div>
              {conversation.unread > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  {conversation.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Floating Action Button - New Message */}
      <button
        onClick={() => setShowNewMessage(true)}
        className="fixed right-4 bottom-20 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-30"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* New Message Modal */}
      {showNewMessage && (
        <div className="fixed inset-0 z-50 bg-background">
          {/* Modal Header */}
          <div className="flex items-center gap-2 h-14 border-b border-border px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseNewMessage}
              className="btn-bounce h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
            <h1 className="text-lg font-semibold">New Message</h1>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto">
            {searchQuery.length < 2 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Type at least 2 characters to search</p>
              </div>
            ) : isSearching ? (
              <div className="text-center py-8 text-muted-foreground">
                <span className="animate-pulse">Searching...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No users found</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted transition-colors"
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.handle} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {(user.displayName || user.handle).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{user.displayName || user.handle}</p>
                      <p className="text-xs text-muted-foreground">@{user.handle}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { Home, Search, MessageCircle, Bell, Settings, LogIn, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadMessages: number;
  unreadNotifications: number;
  isGuest?: boolean;
  onSignIn?: () => void;
  onSignUp?: () => void;
}

export function BottomNav({ 
  activeTab, 
  onTabChange, 
  unreadMessages, 
  unreadNotifications,
  isGuest = false,
  onSignIn,
  onSignUp,
}: BottomNavProps) {
  // Guest navigation - only show Home, Search, Sign In, Sign Up
  const guestTabs = [
    { id: 'home', icon: Home, label: 'Home', badge: 0 },
    { id: 'search', icon: Search, label: 'Search', badge: 0 },
    { id: 'signin', icon: LogIn, label: 'Sign In', badge: 0, isAuth: true },
    { id: 'signup', icon: UserPlus, label: 'Sign Up', badge: 0, isAuth: true },
  ];

  // Full navigation for authenticated users
  const authTabs = [
    { id: 'home', icon: Home, label: 'Home', badge: 0 },
    { id: 'search', icon: Search, label: 'Search', badge: 0 },
    { id: 'messages', icon: MessageCircle, label: 'Messages', badge: unreadMessages },
    { id: 'notifications', icon: Bell, label: 'Notifications', badge: unreadNotifications },
    { id: 'settings', icon: Settings, label: 'Settings', badge: 0 },
  ];

  const tabs = isGuest ? guestTabs : authTabs;

  const handleTabClick = (tab: { id: string; isAuth?: boolean }) => {
    if (tab.isAuth) {
      if (tab.id === 'signin' && onSignIn) {
        onSignIn();
      } else if (tab.id === 'signup' && onSignUp) {
        onSignUp();
      }
    } else {
      onTabChange(tab.id);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-2xl mx-auto px-4 h-14 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          // Only show badge if count is greater than 0
          const showBadge = tab.badge > 0;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={cn(
                'relative flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 btn-bounce',
                isActive && !tab.isAuth
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
                tab.isAuth && 'text-primary hover:text-primary/80'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && !tab.isAuth && 'stroke-[2.5px]')} />
              {showBadge && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-500 text-white flex items-center justify-center">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
              <span className="sr-only">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

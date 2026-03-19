'use client';

import { useState, useRef } from 'react';
import { ArrowLeft, User, Bell, Moon, Sun, HelpCircle, MessageSquare, Upload, X, Loader2, Camera, Shield, ChevronRight, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from 'next-themes';
import { toast } from '@/hooks/use-toast';
import { User as UserType } from './types';
import { convertImage, validateImageFile, formatFileSize, supportsAvif } from '@/lib/imageUtils';
import { VerificationSettings } from './VerificationSettings';
import { cn } from '@/lib/utils';

interface SettingsPageProps {
  currentUser: UserType | null;
  onUserUpdate: (user: UserType) => void;
  onBack: () => void;
  onLogout?: () => void;
}

type SettingsSection = 'main' | 'profile' | 'appearance' | 'notifications' | 'verification' | 'support';

export function SettingsPage({ currentUser, onUserUpdate, onBack, onLogout }: SettingsPageProps) {
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<SettingsSection>('main');
  
  // Profile form
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [banner, setBanner] = useState(currentUser?.banner || '');
  const [isSaving, setIsSaving] = useState(false);
  
  // Image upload states
  const [isConvertingAvatar, setIsConvertingAvatar] = useState(false);
  const [isConvertingBanner, setIsConvertingBanner] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Support form
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Handle avatar image upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({ title: validation.error, variant: 'destructive' });
      return;
    }

    setIsConvertingAvatar(true);
    try {
      const result = await convertImage(file, { maxSizeKB: 50, maxWidth: 400, maxHeight: 400 });
      setAvatar(result.dataUrl);
      toast({
        title: 'Avatar ready',
        description: `Converted to ${result.format.toUpperCase()} (${formatFileSize(result.convertedSize)})`,
      });
    } catch {
      toast({ title: 'Failed to process image', variant: 'destructive' });
    }
    setIsConvertingAvatar(false);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  // Handle banner image upload
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({ title: validation.error, variant: 'destructive' });
      return;
    }

    setIsConvertingBanner(true);
    try {
      const result = await convertImage(file, { maxSizeKB: 50, maxWidth: 1200, maxHeight: 400 });
      setBanner(result.dataUrl);
      toast({
        title: 'Banner ready',
        description: `Converted to ${result.format.toUpperCase()} (${formatFileSize(result.convertedSize)})`,
      });
    } catch {
      toast({ title: 'Failed to process image', variant: 'destructive' });
    }
    setIsConvertingBanner(false);
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  const removeAvatar = () => {
    setAvatar('');
  };

  const removeBanner = () => {
    setBanner('');
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    
    setIsSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentUser.id,
          displayName,
          bio,
          avatar,
          banner,
        }),
      });
      const data = await res.json();
      
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      } else {
        onUserUpdate(data);
        toast({ title: 'Profile updated!' });
      }
    } catch {
      toast({ title: 'Error saving profile', variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const handleSendSupport = async () => {
    if (!supportSubject || !supportMessage || !currentUser) return;
    
    setIsSending(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          subject: supportSubject,
          message: supportMessage,
        }),
      });
      const data = await res.json();
      
      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      } else {
        toast({ title: 'Message sent! We\'ll get back to you soon.' });
        setSupportSubject('');
        setSupportMessage('');
      }
    } catch {
      toast({ title: 'Error sending message', variant: 'destructive' });
    }
    setIsSending(false);
  };

  // Settings menu items
  const settingsItems = [
    { id: 'profile' as const, icon: User, label: 'Profile', description: 'Update your profile information' },
    { id: 'appearance' as const, icon: theme === 'dark' ? Moon : Sun, label: 'Appearance', description: 'Customize the app theme' },
    { id: 'notifications' as const, icon: Bell, label: 'Notifications', description: 'Manage notification preferences' },
    { id: 'verification' as const, icon: Shield, label: 'Verification', description: 'Verify your account' },
    { id: 'support' as const, icon: HelpCircle, label: 'Support', description: 'Get help and contact us' },
  ];

  // Render main settings menu
  const renderMainMenu = () => (
    <div className="space-y-1">
      {settingsItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveSection(item.id)}
          className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors text-left group"
        >
          <div className="p-2.5 rounded-full bg-muted text-foreground">
            <item.icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium">{item.label}</p>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      ))}
      
      {/* Logout Button */}
      {onLogout && (
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-destructive/10 transition-colors text-left group mt-4"
        >
          <div className="p-2.5 rounded-full bg-destructive/10 text-destructive">
            <LogOut className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-destructive">Log Out</p>
            <p className="text-sm text-muted-foreground">Sign out of your account</p>
          </div>
        </button>
      )}
    </div>
  );

  // Render profile section
  const renderProfile = () => (
    <div className="space-y-6">
      <div className="text-xs text-muted-foreground mb-4">
        @handle cannot be changed
      </div>

      {/* Banner */}
      <div className="space-y-2">
        <Label>Banner</Label>
        <div className="relative">
          {banner ? (
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img 
                src={banner} 
                alt="Banner" 
                className="w-full h-24 object-cover"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={removeBanner}
                className="absolute top-2 right-2 h-6 w-6 bg-black/50 hover:bg-black/70 text-white btn-bounce"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => bannerInputRef.current?.click()}
              disabled={isConvertingBanner}
              className="w-full h-24 rounded-lg border-2 border-dashed border-border hover:border-foreground transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground"
            >
              {isConvertingBanner ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  <span className="text-xs">Add banner</span>
                </>
              )}
            </button>
          )}
        </div>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          onChange={handleBannerUpload}
          className="hidden"
        />
        <p className="text-xs text-muted-foreground">
          {supportsAvif() ? 'AVIF' : 'WebP'} • max 50KB
        </p>
      </div>

      {/* Avatar */}
      <div className="space-y-2">
        <Label>Avatar</Label>
        <div className="flex items-center gap-4">
          {avatar ? (
            <div className="relative">
              <img 
                src={avatar} 
                alt="Avatar" 
                className="w-16 h-16 rounded-full object-cover border-2 border-border"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={removeAvatar}
                className="absolute -top-1 -right-1 h-5 w-5 bg-destructive hover:bg-destructive/80 text-white btn-bounce"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={isConvertingAvatar}
              className="w-16 h-16 rounded-full border-2 border-dashed border-border hover:border-foreground transition-colors flex flex-col items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {isConvertingAvatar ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
            </button>
          )}
          <div className="flex-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isConvertingAvatar}
              className="btn-bounce"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          className="hidden"
        />
        <p className="text-xs text-muted-foreground">
          {supportsAvif() ? 'AVIF' : 'WebP'} • max 50KB
        </p>
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="displayName">Display Name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your display name"
          maxLength={50}
          key={`name-${currentUser?.id}`}
        />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about yourself..."
          maxLength={160}
          rows={3}
          key={`bio-${currentUser?.id}`}
        />
        <div className="text-xs text-muted-foreground text-right">
          {bio.length}/160
        </div>
      </div>

      {/* Username (read-only) */}
      <div className="space-y-2">
        <Label>Username</Label>
        <div className="text-sm text-muted-foreground flex items-center gap-1">
          @{currentUser?.handle}
        </div>
      </div>

      <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full btn-bounce">
        {isSaving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );

  // Render appearance section
  const renderAppearance = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-lg border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-muted">
            {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </div>
          <div>
            <p className="font-medium">Dark Mode</p>
            <p className="text-sm text-muted-foreground">Toggle dark mode theme</p>
          </div>
        </div>
        <Switch
          checked={theme === 'dark'}
          onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
        />
      </div>
    </div>
  );

  // Render notifications section
  const renderNotifications = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-lg border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-muted">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium">Push Notifications</p>
            <p className="text-sm text-muted-foreground">Receive notifications for likes, replies, and follows</p>
          </div>
        </div>
        <Switch defaultChecked />
      </div>
      <div className="flex items-center justify-between p-4 rounded-lg border border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-muted">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium">Email Notifications</p>
            <p className="text-sm text-muted-foreground">Receive email updates</p>
          </div>
        </div>
        <Switch />
      </div>
    </div>
  );

  // Render verification section
  const renderVerification = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-full bg-primary/10 text-primary">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <p className="font-medium">Account Verification</p>
          <p className="text-sm text-muted-foreground">Verify your identity to get a verified badge</p>
        </div>
      </div>
      <VerificationSettings
        currentUser={currentUser}
        onBack={onBack}
      />
    </div>
  );

  // Render support section
  const renderSupport = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-full bg-muted">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <p className="font-medium">Contact Support</p>
          <p className="text-sm text-muted-foreground">Get help with any issues</p>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          value={supportSubject}
          onChange={(e) => setSupportSubject(e.target.value)}
          placeholder="What's this about?"
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          value={supportMessage}
          onChange={(e) => setSupportMessage(e.target.value)}
          placeholder="Describe your issue or question..."
          rows={5}
        />
      </div>

      <Button 
        onClick={handleSendSupport} 
        disabled={isSending || !supportSubject || !supportMessage} 
        className="w-full btn-bounce"
      >
        {isSending ? 'Sending...' : 'Send Message'}
      </Button>
    </div>
  );

  // Get section title
  const getSectionTitle = () => {
    switch (activeSection) {
      case 'profile': return 'Profile';
      case 'appearance': return 'Appearance';
      case 'notifications': return 'Notifications';
      case 'verification': return 'Verification';
      case 'support': return 'Support';
      default: return 'Settings';
    }
  };

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'profile': return renderProfile();
      case 'appearance': return renderAppearance();
      case 'notifications': return renderNotifications();
      case 'verification': return renderVerification();
      case 'support': return renderSupport();
      default: return renderMainMenu();
    }
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="flex items-center gap-2 -mx-4 px-4 h-14 border-b border-border sticky top-0 bg-background z-10">
        {activeSection !== 'main' ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveSection('main')}
            className="btn-bounce h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="btn-bounce h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <h1 className="text-lg font-semibold">{getSectionTitle()}</h1>
      </div>

      <div className="pt-4">
        {renderContent()}
      </div>
    </div>
  );
}

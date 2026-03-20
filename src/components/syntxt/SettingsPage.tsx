'use client';

import { useState, useRef } from 'react';
import { ArrowLeft, User, Bell, Moon, Sun, HelpCircle, MessageSquare, Upload, X, Loader2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from 'next-themes';
import { toast } from '@/hooks/use-toast';
import { User as UserType } from './types';
import { convertImage, validateImageFile, formatFileSize, supportsAvif } from '@/lib/imageUtils';

interface SettingsPageProps {
  currentUser: UserType | null;
  onUserUpdate: (user: UserType) => void;
  onBack: () => void;
}

export function SettingsPage({ currentUser, onUserUpdate, onBack }: SettingsPageProps) {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  
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
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full border-b border-border rounded-none h-12 bg-transparent justify-start px-0 overflow-x-auto">
          <TabsTrigger value="profile" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent shrink-0">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent shrink-0">
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent shrink-0">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="support" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent shrink-0">
            <HelpCircle className="w-4 h-4" />
            Support
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-0 space-y-6">
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
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="mt-0 space-y-4">
            <div className="flex items-center justify-between py-4 border-b border-border">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">Toggle dark mode theme</p>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-0 space-y-4">
            <div className="flex items-center justify-between py-4 border-b border-border">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Receive notifications for likes, replies, and follows</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between py-4 border-b border-border">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive email updates</p>
              </div>
              <Switch />
            </div>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="mt-0 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h3 className="font-medium">Contact Support</h3>
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
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

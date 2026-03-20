'use client';

import { useState } from 'react';
import { X, User, Bell, Moon, Sun, HelpCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from 'next-themes';
import { toast } from '@/hooks/use-toast';
import { User as UserType } from './types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType | null;
  onUserUpdate: (user: UserType) => void;
}

export function SettingsModal({ isOpen, onClose, currentUser, onUserUpdate }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile form - initialize from currentUser
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [banner, setBanner] = useState(currentUser?.banner || '');
  const [isSaving, setIsSaving] = useState(false);

  // Support form
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Update form when currentUser changes
  const handleOpenChange = (open: boolean) => {
    if (open && currentUser) {
      setDisplayName(currentUser.displayName || '');
      setBio(currentUser.bio || '');
      setAvatar(currentUser.avatar || '');
      setBanner(currentUser.banner || '');
    }
    if (!open) {
      onClose();
    }
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
    } catch (error) {
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
    } catch (error) {
      toast({ title: 'Error sending message', variant: 'destructive' });
    }
    setIsSending(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden bg-card border-border p-0 gap-0">
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Settings</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 btn-bounce">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full border-b border-border rounded-none h-12 bg-transparent justify-start px-2 overflow-x-auto">
            <TabsTrigger value="profile" className="gap-2 rounded-none data-[state=active]:bg-muted shrink-0">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2 rounded-none data-[state=active]:bg-muted shrink-0">
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              Appearance
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 rounded-none data-[state=active]:bg-muted shrink-0">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-2 rounded-none data-[state=active]:bg-muted shrink-0">
              <HelpCircle className="w-4 h-4" />
              Support
            </TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto max-h-[calc(85vh-120px)]">
            {/* Profile Tab */}
            <TabsContent value="profile" className="p-4 mt-0 space-y-4">
              <div className="text-xs text-muted-foreground mb-4">
                @handle cannot be changed
              </div>

              {/* Avatar */}
              <div className="space-y-2">
                <Label>Avatar URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="flex-1"
                  />
                  {avatar && (
                    <img src={avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                  )}
                </div>
              </div>

              {/* Banner */}
              <div className="space-y-2">
                <Label>Banner URL</Label>
                <div className="flex flex-col gap-2">
                  <Input
                    value={banner}
                    onChange={(e) => setBanner(e.target.value)}
                    placeholder="https://example.com/banner.jpg"
                  />
                  {banner && (
                    <img src={banner} alt="Banner" className="w-full h-20 rounded-md object-cover" />
                  )}
                </div>
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
            <TabsContent value="appearance" className="p-4 mt-0 space-y-4">
              <div className="flex items-center justify-between">
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
            <TabsContent value="notifications" className="p-4 mt-0 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive notifications for likes, replies, and follows</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive email updates</p>
                </div>
                <Switch />
              </div>
            </TabsContent>

            {/* Support Tab */}
            <TabsContent value="support" className="p-4 mt-0 space-y-4">
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
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { X, Users, FileText, Flag, MessageSquare, Shield, Ban, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { User, Post, Report, SupportTicket } from './types';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

export function AdminPanel({ isOpen, onClose, currentUser }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const isAdmin = currentUser?.role === 'ADMIN';
  const isModerator = currentUser?.role === 'MODERATOR' || isAdmin;

  useEffect(() => {
    if (!isOpen || !isModerator) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [usersRes, reportsRes, ticketsRes, postsRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/admin/reports'),
          fetch('/api/admin/tickets'),
          fetch('/api/admin/posts'),
        ]);
        const usersData = await usersRes.json();
        const reportsData = await reportsRes.json();
        const ticketsData = await ticketsRes.json();
        const postsData = await postsRes.json();
        setUsers(usersData.users || []);
        setReports(reportsData.reports || []);
        setTickets(ticketsData.tickets || []);
        setPosts(postsData.posts || []);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [isOpen, isModerator]);

  const handleBanUser = async (userId: string, ban: boolean) => {
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isBanned: ban }),
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: ban } : u));
      toast({ title: ban ? 'User banned' : 'User unbanned' });
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleUpdateReport = async (reportId: string, status: string, notes?: string) => {
    try {
      await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status, notes }),
      });
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: status as Report['status'] } : r));
      toast({ title: 'Report updated' });
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await fetch(`/api/admin/posts?postId=${postId}`, { method: 'DELETE' });
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast({ title: 'Post deleted' });
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleUpdateTicket = async (ticketId: string, status: string, response?: string) => {
    try {
      await fetch('/api/admin/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, status, response }),
      });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: status as SupportTicket['status'] } : t));
      toast({ title: 'Ticket updated' });
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const pendingReports = reports.filter(r => r.status === 'pending');
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
  const bannedUsers = users.filter(u => u.isBanned);

  if (!isModerator) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <div className="text-center py-8">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold">Access Denied</h2>
            <p className="text-sm text-muted-foreground mt-2">
              You don&apos;t have permission to access this panel.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden bg-card border-border p-0 gap-0">
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <DialogTitle className="text-lg font-semibold">
                {isAdmin ? 'Admin' : 'Moderator'} Panel
              </DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 btn-bounce">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full border-b border-border rounded-none h-12 bg-transparent justify-start px-2">
            <TabsTrigger value="overview" className="gap-2 rounded-none data-[state=active]:bg-muted">
              <Eye className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 rounded-none data-[state=active]:bg-muted">
              <Flag className="w-4 h-4" />
              Reports
              {pendingReports.length > 0 && (
                <Badge variant="destructive" className="ml-1">{pendingReports.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2 rounded-none data-[state=active]:bg-muted">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-2 rounded-none data-[state=active]:bg-muted">
              <FileText className="w-4 h-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-2 rounded-none data-[state=active]:bg-muted">
              <MessageSquare className="w-4 h-4" />
              Support
              {openTickets.length > 0 && (
                <Badge variant="secondary" className="ml-1">{openTickets.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <span className="animate-pulse">Loading...</span>
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 rounded-lg border border-border">
                      <p className="text-2xl font-bold">{users.length}</p>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <p className="text-2xl font-bold">{posts.length}</p>
                      <p className="text-sm text-muted-foreground">Total Posts</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <p className="text-2xl font-bold text-amber-500">{pendingReports.length}</p>
                      <p className="text-sm text-muted-foreground">Pending Reports</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border">
                      <p className="text-2xl font-bold text-red-500">{bannedUsers.length}</p>
                      <p className="text-sm text-muted-foreground">Banned Users</p>
                    </div>
                  </div>

                  {pendingReports.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3">Recent Reports</h3>
                      <div className="space-y-2">
                        {pendingReports.slice(0, 5).map((report) => (
                          <div key={report.id} className="p-3 rounded-lg border border-border">
                            <p className="text-sm">{report.reason}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(report.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Reports Tab */}
                <TabsContent value="reports" className="mt-0">
                  <div className="space-y-3">
                    {reports.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No reports</p>
                    ) : (
                      reports.map((report) => (
                        <div key={report.id} className="p-4 rounded-lg border border-border">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium">{report.reason}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Reported by @{report.reporter?.handle} • {new Date(report.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={
                              report.status === 'pending' ? 'secondary' :
                              report.status === 'resolved' ? 'default' :
                              report.status === 'dismissed' ? 'outline' : 'secondary'
                            }>
                              {report.status}
                            </Badge>
                          </div>
                          {report.status === 'pending' && (
                            <div className="flex gap-2 mt-3">
                              <Button size="sm" variant="destructive" onClick={() => handleUpdateReport(report.id, 'resolved')}>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Resolve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleUpdateReport(report.id, 'dismissed')}>
                                <XCircle className="w-4 h-4 mr-1" />
                                Dismiss
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users" className="mt-0">
                  <div className="space-y-2">
                    {users.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No users</p>
                    ) : (
                      users.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              {(user.displayName || user.handle).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{user.displayName || user.handle}</p>
                              <p className="text-xs text-muted-foreground">@{user.handle}</p>
                            </div>
                            {user.isBanned && <Badge variant="destructive">Banned</Badge>}
                            <Badge variant={user.role === 'ADMIN' ? 'default' : user.role === 'MODERATOR' ? 'secondary' : 'outline'}>
                              {user.role}
                            </Badge>
                          </div>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant={user.isBanned ? 'outline' : 'destructive'}
                              onClick={() => handleBanUser(user.id, !user.isBanned)}
                            >
                              {user.isBanned ? <CheckCircle className="w-4 h-4 mr-1" /> : <Ban className="w-4 h-4 mr-1" />}
                              {user.isBanned ? 'Unban' : 'Ban'}
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* Posts Tab */}
                <TabsContent value="posts" className="mt-0">
                  <div className="space-y-3">
                    {posts.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No posts</p>
                    ) : (
                      posts.map((post) => (
                        <div key={post.id} className="p-4 rounded-lg border border-border">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">
                                @{post.author.handle} • {new Date(post.createdAt).toLocaleDateString()}
                              </p>
                              <p className="text-sm">{post.content}</p>
                            </div>
                            {isAdmin && (
                              <Button size="sm" variant="destructive" onClick={() => handleDeletePost(post.id)}>
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* Support Tab */}
                <TabsContent value="support" className="mt-0">
                  <div className="space-y-3">
                    {tickets.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No support tickets</p>
                    ) : (
                      tickets.map((ticket) => (
                        <div key={ticket.id} className="p-4 rounded-lg border border-border">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-sm">{ticket.subject}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                @{ticket.user?.handle} • {new Date(ticket.createdAt).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-muted-foreground mt-2">{ticket.message}</p>
                            </div>
                            <Badge variant={
                              ticket.status === 'open' ? 'destructive' :
                              ticket.status === 'resolved' ? 'default' : 'secondary'
                            }>
                              {ticket.status}
                            </Badge>
                          </div>
                          {ticket.status !== 'closed' && (
                            <div className="flex gap-2 mt-3">
                              <Button size="sm" variant="outline" onClick={() => handleUpdateTicket(ticket.id, 'in_progress')}>
                                Take
                              </Button>
                              <Button size="sm" onClick={() => handleUpdateTicket(ticket.id, 'resolved')}>
                                Resolve
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

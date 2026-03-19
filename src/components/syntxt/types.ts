export interface User {
  id: string;
  handle: string;
  email?: string | null;
  displayName?: string | null;
  bio?: string | null;
  avatar?: string | null;
  banner?: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  isBanned?: boolean;
  isVerified?: boolean;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  postsCount?: number;
  isFollowing?: boolean;
}

export interface Post {
  id: string;
  content: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  linkUrl?: string | null;
  linkTitle?: string | null;
  linkDesc?: string | null;
  linkImage?: string | null;
  parentPostId?: string | null;
  createdAt: string;
  isDeleted?: boolean;
  isQuotePost?: boolean;
  quoteContent?: string | null;
  quoteAuthor?: {
    id: string;
    handle: string;
    displayName?: string | null;
    avatar?: string | null;
  } | null;
  quotedPost?: {
    id: string;
    content: string;
    imageUrl?: string | null;
    author: {
      id: string;
      handle: string;
      displayName?: string | null;
      avatar?: string | null;
    };
    createdAt: string;
  } | null;
  author: {
    id: string;
    handle: string;
    displayName?: string | null;
    avatar?: string | null;
  };
  likesCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  isReposted: boolean;
  repostsCount: number;
  repliesCount?: number;
  hashtags?: string[];
  replies?: Reply[];
  // For reposts in feed
  repostedBy?: {
    id: string;
    handle: string;
    displayName?: string | null;
    avatar?: string | null;
  } | null;
  repostedAt?: string | null;
}

export interface Reply {
  id: string;
  content: string;
  imageUrl?: string | null;
  postId: string;
  authorId: string;
  parentReplyId?: string | null;
  createdAt: string;
  author: {
    id: string;
    handle: string;
    displayName?: string | null;
    avatar?: string | null;
  };
  replies?: Reply[];
  likesCount?: number;
  isLiked?: boolean;
}

export interface Notification {
  id: string;
  type: 'like' | 'repost' | 'follow' | 'reply' | 'mention';
  title: string;
  content?: string | null;
  read: boolean;
  relatedId?: string | null;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
  sender?: User;
  receiver?: User;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedId: string;
  postId?: string | null;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  notes?: string | null;
  createdAt: string;
  reporter?: User;
  reported?: User;
  post?: Post;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  response?: string | null;
  createdAt: string;
  user?: User;
}

export interface LinkPreview {
  url: string;
  title: string;
  description?: string;
  image?: string;
}

export interface Hashtag {
  name: string;
  count: number;
}

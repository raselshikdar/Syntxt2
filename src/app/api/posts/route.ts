import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET all posts (explore feed) or posts from followed users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const feed = searchParams.get('feed'); // 'explore' or 'following'
    const authorId = searchParams.get('authorId'); // for profile page
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '30', 10); // Default 30 posts

    // Common include for posts
    const postInclude = {
      author: {
        select: { id: true, handle: true, displayName: true, avatar: true },
      },
      likes: { select: { userId: true } },
      bookmarks: userId ? { where: { userId } } : false,
      reposts: { select: { userId: true, createdAt: true } },
      replies: { select: { id: true } },
      quotePost: {
        select: { content: true },
      },
      parentPost: {
        include: {
          author: {
            select: { id: true, handle: true, displayName: true, avatar: true },
          },
        },
      },
    };

    // Helper function to fetch reposts and merge with posts
    const fetchUserReposts = async (userIdParam: string, postsList: typeof postInclude extends (infer T)[] ? T[] : unknown[]) => {
      const userReposts = await db.repost.findMany({
        where: { userId: userIdParam },
        include: {
          post: {
            include: postInclude,
          },
          user: {
            select: { id: true, handle: true, displayName: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      for (const repost of userReposts) {
        const existingIndex = (postsList as unknown[]).findIndex((p: unknown) => {
          const post = p as { id: string };
          return post.id === repost.post.id;
        });
        if (existingIndex === -1) {
          // Post not in list, add it with repost metadata
          const postWithMeta = repost.post as unknown as Record<string, unknown>;
          postWithMeta.repostedBy = repost.user;
          postWithMeta.repostedAt = repost.createdAt;
          (postsList as unknown[]).push(postWithMeta);
        }
      }

      return postsList;
    };

    // Search posts
    if (search) {
      const posts = await db.post.findMany({
        where: {
          content: { contains: search },
        },
        include: postInclude,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return NextResponse.json(posts.map(post => ({
        id: post.id,
        content: post.content,
        imageUrl: post.imageUrl,
        createdAt: post.createdAt,
        author: post.author,
        likesCount: post.likes.length,
        isLiked: userId ? post.likes.some(l => l.userId === userId) : false,
        isBookmarked: userId ? (post.bookmarks as { userId: string }[]).length > 0 : false,
        isReposted: userId ? post.reposts.some(r => r.userId === userId) : false,
        repostsCount: post.reposts.length,
        repliesCount: post.replies.length,
        isQuotePost: !!post.quotePost,
        quoteContent: post.quotePost?.content,
        quotedPost: post.parentPost ? {
          id: post.parentPost.id,
          content: post.parentPost.content,
          imageUrl: post.parentPost.imageUrl,
          author: post.parentPost.author,
          createdAt: post.parentPost.createdAt,
        } : null,
      })));
    }

    let posts;

    if (authorId) {
      // Get posts by specific author (profile page)
      // This includes both original posts AND reposts made by this user
      posts = await db.post.findMany({
        where: { authorId },
        include: postInclude,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      // Also get reposts made by this user
      const userReposts = await db.repost.findMany({
        where: { userId: authorId },
        include: {
          post: {
            include: postInclude,
          },
          user: {
            select: { id: true, handle: true, displayName: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      // Add reposted posts with repost metadata
      for (const repost of userReposts) {
        const existingIndex = posts.findIndex(p => p.id === repost.post.id);
        if (existingIndex === -1) {
          const postWithMeta = repost.post as unknown as Record<string, unknown>;
          postWithMeta.repostedBy = repost.user;
          postWithMeta.repostedAt = repost.createdAt;
          posts.push(postWithMeta as typeof posts[0]);
        }
      }

      // Sort by most recent
      posts.sort((a, b) => {
        const aTime = new Date((a as unknown as Record<string, unknown>).repostedAt || a.createdAt).getTime();
        const bTime = new Date((b as unknown as Record<string, unknown>).repostedAt || b.createdAt).getTime();
        return bTime - aTime;
      });

      posts = posts.slice(0, limit);
    } else if (feed === 'following' && userId) {
      // Get posts from followed users AND reposts from followed users
      const following = await db.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      
      const followingIds = following.map(f => f.followingId);
      
      // Always include current user's own posts and reposts
      const allUserIds = [...followingIds, userId];
      
      // Get original posts from followed users and self
      posts = await db.post.findMany({
        where: { authorId: { in: allUserIds } },
        include: postInclude,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      // Get reposts from followed users and self
      const reposts = await db.repost.findMany({
        where: { userId: { in: allUserIds } },
        include: {
          post: {
            include: postInclude,
          },
          user: {
            select: { id: true, handle: true, displayName: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      // Add reposted posts with repost info
      for (const repost of reposts) {
        const existingIndex = posts.findIndex(p => p.id === repost.post.id);
        if (existingIndex === -1) {
          const postWithMeta = repost.post as unknown as Record<string, unknown>;
          postWithMeta.repostedBy = repost.user;
          postWithMeta.repostedAt = repost.createdAt;
          posts.push(postWithMeta as typeof posts[0]);
        }
      }

      // Sort by most recent (post creation or repost time)
      posts.sort((a, b) => {
        const aTime = new Date((a as unknown as Record<string, unknown>).repostedAt || a.createdAt).getTime();
        const bTime = new Date((b as unknown as Record<string, unknown>).repostedAt || b.createdAt).getTime();
        return bTime - aTime;
      });

      posts = posts.slice(0, limit);
    } else {
      // Explore feed - all posts
      posts = await db.post.findMany({
        include: postInclude,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      // Also include user's own reposts in explore feed
      if (userId) {
        posts = await fetchUserReposts(userId, posts) as typeof posts;

        // Sort by most recent (post creation or repost time)
        posts.sort((a, b) => {
          const aTime = new Date((a as unknown as Record<string, unknown>).repostedAt || a.createdAt).getTime();
          const bTime = new Date((b as unknown as Record<string, unknown>).repostedAt || b.createdAt).getTime();
          return bTime - aTime;
        });

        posts = posts.slice(0, limit);
      }
    }

    // Transform posts to include counts and user-specific states
    const transformedPosts = posts.map(post => {
      const p = post as unknown as Record<string, unknown>;
      return {
        id: post.id,
        content: post.content,
        imageUrl: post.imageUrl,
        createdAt: post.createdAt,
        author: post.author,
        likesCount: post.likes.length,
        isLiked: userId ? post.likes.some(l => l.userId === userId) : false,
        isBookmarked: userId ? (post.bookmarks as { userId: string }[]).length > 0 : false,
        isReposted: userId ? post.reposts.some(r => r.userId === userId) : false,
        repostsCount: post.reposts.length,
        repliesCount: post.replies.length,
        isQuotePost: !!post.quotePost,
        quoteContent: post.quotePost?.content,
        quotedPost: post.parentPost ? {
          id: post.parentPost.id,
          content: post.parentPost.content,
          imageUrl: post.parentPost.imageUrl,
          author: post.parentPost.author,
          createdAt: post.parentPost.createdAt,
        } : null,
        repostedBy: p.repostedBy || null,
        repostedAt: p.repostedAt || null,
      };
    });

    return NextResponse.json(transformedPosts);
  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// POST - Create a new post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, authorId } = body;

    if (!content || content.length > 300) {
      return NextResponse.json({ error: 'Content must be 1-300 characters' }, { status: 400 });
    }

    if (!authorId) {
      return NextResponse.json({ error: 'Author ID is required' }, { status: 400 });
    }

    const post = await db.post.create({
      data: {
        content,
        authorId,
      },
      include: {
        author: {
          select: { id: true, handle: true, displayName: true, avatar: true },
        },
      },
    });

    return NextResponse.json({
      id: post.id,
      content: post.content,
      createdAt: post.createdAt,
      author: post.author,
      likesCount: 0,
      isLiked: false,
      isBookmarked: false,
      isReposted: false,
      repostsCount: 0,
      repliesCount: 0,
    });
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

// DELETE - Delete a post
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    await db.post.delete({
      where: { id: postId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}

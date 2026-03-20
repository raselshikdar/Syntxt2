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

    // Search posts
    if (search) {
      const posts = await db.post.findMany({
        where: {
          content: { contains: search },
        },
        include: {
          author: {
            select: { id: true, handle: true, displayName: true, avatar: true },
          },
          likes: { select: { userId: true } },
          bookmarks: userId ? { where: { userId } } : false,
          reposts: { select: { userId: true } },
          replies: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      return NextResponse.json(posts.map(post => ({
        id: post.id,
        content: post.content,
        createdAt: post.createdAt,
        author: post.author,
        likesCount: post.likes.length,
        isLiked: userId ? post.likes.some(l => l.userId === userId) : false,
        isBookmarked: userId ? (post.bookmarks as { userId: string }[]).length > 0 : false,
        isReposted: userId ? post.reposts.some(r => r.userId === userId) : false,
        repostsCount: post.reposts.length,
        repliesCount: post.replies.length,
      })));
    }

    let posts;

    if (authorId) {
      // Get posts by specific author (profile page)
      posts = await db.post.findMany({
        where: { authorId },
        include: {
          author: {
            select: { id: true, handle: true, displayName: true, avatar: true },
          },
          likes: { select: { userId: true } },
          bookmarks: userId ? { where: { userId } } : false,
          reposts: { select: { userId: true } },
          replies: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (feed === 'following' && userId) {
      // Get posts from followed users
      const following = await db.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      
      const followingIds = following.map(f => f.followingId);
      
      if (followingIds.length === 0) {
        return NextResponse.json([]);
      }
      
      posts = await db.post.findMany({
        where: { authorId: { in: followingIds } },
        include: {
          author: {
            select: { id: true, handle: true, displayName: true, avatar: true },
          },
          likes: { select: { userId: true } },
          bookmarks: userId ? { where: { userId } } : false,
          reposts: { select: { userId: true } },
          replies: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Explore feed - all posts
      posts = await db.post.findMany({
        include: {
          author: {
            select: { id: true, handle: true, displayName: true, avatar: true },
          },
          likes: { select: { userId: true } },
          bookmarks: userId ? { where: { userId } } : false,
          reposts: { select: { userId: true } },
          replies: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Transform posts to include counts and user-specific states
    const transformedPosts = posts.map(post => ({
      id: post.id,
      content: post.content,
      createdAt: post.createdAt,
      author: post.author,
      likesCount: post.likes.length,
      isLiked: userId ? post.likes.some(l => l.userId === userId) : false,
      isBookmarked: userId ? (post.bookmarks as { userId: string }[]).length > 0 : false,
      isReposted: userId ? post.reposts.some(r => r.userId === userId) : false,
      repostsCount: post.reposts.length,
      repliesCount: post.replies.length,
    }));

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

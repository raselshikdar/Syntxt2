import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST - Create a reply to a post or another reply
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const body = await request.json();
    const { content, authorId, imageUrl, parentReplyId } = body;

    if (!content && !imageUrl) {
      return NextResponse.json({ error: 'Content or image is required' }, { status: 400 });
    }

    if (content && content.length > 300) {
      return NextResponse.json({ error: 'Content must be 300 characters or less' }, { status: 400 });
    }

    if (!authorId) {
      return NextResponse.json({ error: 'Author ID is required' }, { status: 400 });
    }

    // Check if post exists
    const post = await db.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // If replying to another reply, check if parent reply exists
    if (parentReplyId) {
      const parentReply = await db.reply.findUnique({
        where: { id: parentReplyId },
      });
      if (!parentReply) {
        return NextResponse.json({ error: 'Parent reply not found' }, { status: 404 });
      }
    }

    // Create the reply
    const reply = await db.reply.create({
      data: {
        content: content || '',
        imageUrl: imageUrl || null,
        postId,
        authorId,
        parentReplyId: parentReplyId || null,
      },
      include: {
        author: {
          select: { id: true, handle: true, displayName: true, avatar: true },
        },
      },
    });

    // Return the reply with additional fields for the frontend
    return NextResponse.json({
      ...reply,
      createdAt: reply.createdAt.toISOString(),
      replies: [],
      likesCount: 0,
      isLiked: false,
    });
  } catch (error) {
    console.error('Create reply error:', error);
    return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
  }
}

// GET - Get all replies for a post (with nested structure)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Get all replies for the post
    const replies = await db.reply.findMany({
      where: { postId },
      include: {
        author: {
          select: { id: true, handle: true, displayName: true, avatar: true },
        },
        likes: userId ? {
          where: { userId }
        } : false,
        _count: {
          select: { likes: true }
        }
      },
      orderBy: { createdAt: 'asc' },
    });

    // Transform replies and build nested structure
    const transformReply = (reply: typeof replies[0]) => ({
      id: reply.id,
      content: reply.content,
      imageUrl: reply.imageUrl,
      postId: reply.postId,
      authorId: reply.authorId,
      parentReplyId: reply.parentReplyId,
      createdAt: reply.createdAt.toISOString(),
      author: reply.author,
      likesCount: reply._count.likes,
      isLiked: userId ? reply.likes.length > 0 : false,
      replies: [] as any[],
    });

    // Build nested tree structure
    const replyMap = new Map<string, any>();
    const rootReplies: any[] = [];

    // First pass: create map of all replies
    replies.forEach(reply => {
      const transformed = transformReply(reply);
      replyMap.set(reply.id, transformed);
    });

    // Second pass: build tree
    replies.forEach(reply => {
      const transformed = replyMap.get(reply.id)!;
      if (reply.parentReplyId) {
        const parent = replyMap.get(reply.parentReplyId);
        if (parent) {
          parent.replies.push(transformed);
        }
      } else {
        rootReplies.push(transformed);
      }
    });

    return NextResponse.json(rootReplies);
  } catch (error) {
    console.error('Get replies error:', error);
    return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST - Create a reply to a post
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      where: { id },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // If parentReplyId is provided, verify it exists and belongs to the same post
    if (parentReplyId) {
      const parentReply = await db.reply.findUnique({
        where: { id: parentReplyId },
      });
      
      if (!parentReply || parentReply.postId !== id) {
        return NextResponse.json({ error: 'Parent reply not found or does not belong to this post' }, { status: 400 });
      }
    }

    // Create the reply
    const reply = await db.reply.create({
      data: {
        content: content || '',
        postId: id,
        authorId,
        parentReplyId: parentReplyId || null,
      },
      include: {
        author: {
          select: { id: true, handle: true, displayName: true, avatar: true },
        },
      },
    });

    return NextResponse.json({
      id: reply.id,
      content: reply.content,
      postId: reply.postId,
      authorId: reply.authorId,
      parentReplyId: reply.parentReplyId,
      createdAt: reply.createdAt.toISOString(),
      author: reply.author,
    });
  } catch (error) {
    console.error('Create reply error:', error);
    return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET conversations or messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const otherUserId = searchParams.get('otherUserId');
    const countOnly = searchParams.get('countOnly');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // If countOnly is true, just return the unread count
    if (countOnly === 'true') {
      const count = await db.message.count({
        where: { receiverId: userId, read: false },
      });
      return NextResponse.json({ count });
    }

    if (otherUserId) {
      // Get messages between two users
      const messages = await db.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, handle: true, displayName: true, avatar: true } },
          receiver: { select: { id: true, handle: true, displayName: true, avatar: true } },
        },
      });
      return NextResponse.json({ messages });
    }

    // Get conversations (list of users with last message)
    const sentMessages = await db.message.findMany({
      where: { senderId: userId },
      include: {
        receiver: { select: { id: true, handle: true, displayName: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const receivedMessages = await db.message.findMany({
      where: { receiverId: userId },
      include: {
        sender: { select: { id: true, handle: true, displayName: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Create a map of conversations
    const conversationsMap = new Map<string, {
      user: { id: string; handle: string; displayName?: string | null; avatar?: string | null };
      lastMessage: typeof sentMessages[0];
      unread: number;
    }>();

    sentMessages.forEach((msg) => {
      const key = msg.receiverId;
      if (!conversationsMap.has(key)) {
        conversationsMap.set(key, {
          user: msg.receiver,
          lastMessage: msg,
          unread: 0,
        });
      }
    });

    receivedMessages.forEach((msg) => {
      const key = msg.senderId;
      const existing = conversationsMap.get(key);
      if (existing) {
        if (new Date(msg.createdAt) > new Date(existing.lastMessage.createdAt)) {
          existing.lastMessage = msg;
        }
        if (!msg.read) {
          existing.unread++;
        }
      } else {
        conversationsMap.set(key, {
          user: msg.sender,
          lastMessage: msg,
          unread: msg.read ? 0 : 1,
        });
      }
    });

    const conversations = Array.from(conversationsMap.values())
      .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST - Send a message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { senderId, receiverId, content } = body;

    if (!senderId || !receiverId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const message = await db.message.create({
      data: { senderId, receiverId, content },
      include: {
        sender: { select: { id: true, handle: true, displayName: true, avatar: true } },
        receiver: { select: { id: true, handle: true, displayName: true, avatar: true } },
      },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

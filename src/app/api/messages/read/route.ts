import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST - Mark messages as read
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, otherUserId } = body;

    if (!userId || !otherUserId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await db.message.updateMany({
      where: {
        receiverId: userId,
        senderId: otherUserId,
        read: false,
      },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark messages read error:', error);
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
  }
}

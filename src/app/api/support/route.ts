import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST - Create support ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subject, message } = body;

    if (!userId || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const ticket = await db.supportTicket.create({
      data: { userId, subject, message },
    });

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error('Create support ticket error:', error);
    return NextResponse.json({ error: 'Failed to create support ticket' }, { status: 500 });
  }
}

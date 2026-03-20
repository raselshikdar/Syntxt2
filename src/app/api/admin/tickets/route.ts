import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET all support tickets
export async function GET() {
  try {
    const tickets = await db.supportTicket.findMany({
      include: {
        user: { select: { id: true, handle: true, displayName: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Get tickets error:', error);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

// PATCH - Update ticket
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, status, response } = body;

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (response) updateData.response = response;

    const ticket = await db.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Update ticket error:', error);
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}

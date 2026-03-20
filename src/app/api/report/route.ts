import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST - Create a report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reporterId, reportedId, postId, reason } = body;

    if (!reporterId || !reportedId || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const report = await db.report.create({
      data: { reporterId, reportedId, postId, reason },
    });

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('Create report error:', error);
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}

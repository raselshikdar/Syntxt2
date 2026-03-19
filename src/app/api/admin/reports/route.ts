import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET all reports
export async function GET() {
  try {
    const reports = await db.report.findMany({
      include: {
        reporter: { select: { id: true, handle: true, displayName: true } },
        reported: { select: { id: true, handle: true, displayName: true } },
        post: { select: { id: true, content: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

// PATCH - Update report status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId, status, notes } = body;

    if (!reportId || !status) {
      return NextResponse.json({ error: 'Report ID and status are required' }, { status: 400 });
    }

    const report = await db.report.update({
      where: { id: reportId },
      data: { status, notes },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('Update report error:', error);
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET - Get existing verification request
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const verificationRequest = await db.verificationRequest.findUnique({
      where: { userId },
    });

    return NextResponse.json({ request: verificationRequest });
  } catch (error) {
    console.error('Get verification error:', error);
    return NextResponse.json({ error: 'Failed to fetch verification request' }, { status: 500 });
  }
}

// POST - Create new verification request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, documentType, documentFrontUrl, documentBackUrl, description } = body;

    if (!userId || !documentType || !documentFrontUrl) {
      return NextResponse.json({ 
        error: 'User ID, document type, and front image are required' 
      }, { status: 400 });
    }

    // Check if user already has a pending or approved request
    const existing = await db.verificationRequest.findUnique({
      where: { userId },
    });

    if (existing) {
      if (existing.status === 'APPROVED') {
        return NextResponse.json({ 
          error: 'You are already verified' 
        }, { status: 400 });
      }
      if (existing.status === 'PENDING' || existing.status === 'IN_REVIEW') {
        return NextResponse.json({ 
          error: 'You already have a pending verification request' 
        }, { status: 400 });
      }
      // If rejected, allow reapplication by deleting old request
      await db.verificationRequest.delete({
        where: { userId },
      });
    }

    // Create verification request
    const verificationRequest = await db.verificationRequest.create({
      data: {
        userId,
        documentType,
        documentFrontUrl,
        documentBackUrl,
        description,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ request: verificationRequest });
  } catch (error) {
    console.error('Create verification error:', error);
    return NextResponse.json({ error: 'Failed to create verification request' }, { status: 500 });
  }
}

// PATCH - Update verification status (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, status, reviewerId, reviewerNotes } = body;

    if (!requestId || !status || !reviewerId) {
      return NextResponse.json({ 
        error: 'Request ID, status, and reviewer ID are required' 
      }, { status: 400 });
    }

    // Check if reviewer is admin or moderator
    const reviewer = await db.user.findUnique({
      where: { id: reviewerId },
    });

    if (!reviewer || (reviewer.role !== 'ADMIN' && reviewer.role !== 'MODERATOR')) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 403 });
    }

    // Update verification request
    const verificationRequest = await db.verificationRequest.update({
      where: { id: requestId },
      data: {
        status,
        reviewerId,
        reviewerNotes,
        reviewedAt: new Date(),
      },
    });

    // If approved, update user's isVerified status
    if (status === 'APPROVED') {
      await db.user.update({
        where: { id: verificationRequest.userId },
        data: { isVerified: true },
      });
    }

    return NextResponse.json({ request: verificationRequest });
  } catch (error) {
    console.error('Update verification error:', error);
    return NextResponse.json({ error: 'Failed to update verification request' }, { status: 500 });
  }
}

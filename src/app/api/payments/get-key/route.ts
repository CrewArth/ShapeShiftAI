import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('[API] Error getting Razorpay key:', error);
    return NextResponse.json(
      { error: 'Failed to get Razorpay key' },
      { status: 500 }
    );
  }
} 
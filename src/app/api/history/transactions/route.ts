import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import UserCredits from '@/models/UserCredits';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Fetch user credits document which contains transactions
    const doc = await UserCredits.findOne({ userId });
    if (!doc) {
      return NextResponse.json({ transactions: [] });
    }

    // Convert to plain object and sort transactions
    const userCredits = doc.toObject();
    const transactions = userCredits.transactions || [];
    transactions.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction history' },
      { status: 500 }
    );
  }
} 
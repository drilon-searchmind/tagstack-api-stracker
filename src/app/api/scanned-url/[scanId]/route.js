import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongoose';
import ScannedUrl from '@/models/ScannedUrl';
import Customer from '@/models/Customer';

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get('customerId');
        const { scanId } = await params;

        if (!scanId) {
            return NextResponse.json({ error: 'Scan ID is required' }, { status: 400 });
        }

        if (!customerId) {
            return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
        }

        // Verify customer belongs to user
        const customer = await Customer.findOne({
            _id: customerId,
            userId: session.user.id
        });

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found or access denied' }, { status: 404 });
        }

        // Fetch the specific scan
        const scan = await ScannedUrl.findOne({
            _id: scanId,
            customerId: customerId,
            userId: session.user.id
        }).lean();

        if (!scan) {
            return NextResponse.json({ error: 'Scan not found or access denied' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            scan
        });

    } catch (error) {
        console.error('Error fetching scan:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
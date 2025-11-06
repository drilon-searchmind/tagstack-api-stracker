import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongoose';
import AiAnalysis from '@/models/AiAnalysis';

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get('customerId');
        const scanId = searchParams.get('scanId');
        const { analysisId } = await params;

        if (!analysisId) {
            return NextResponse.json({ error: 'Analysis ID is required' }, { status: 400 });
        }

        // Fetch the specific AI analysis with populated references
        const analysis = await AiAnalysis.findOne({
            _id: analysisId,
            userId: session.user.id
        })
        .populate('scannedUrlId')
        .populate('customerId', 'name url')
        .lean();

        if (!analysis) {
            return NextResponse.json({ error: 'AI analysis not found or access denied' }, { status: 404 });
        }

        // Additional security check if customerId and scanId are provided
        if (customerId && analysis.customerId._id.toString() !== customerId) {
            return NextResponse.json({ error: 'Customer ID mismatch' }, { status: 403 });
        }

        if (scanId && analysis.scannedUrlId._id.toString() !== scanId) {
            return NextResponse.json({ error: 'Scan ID mismatch' }, { status: 403 });
        }

        return NextResponse.json({
            success: true,
            analysis: analysis
        });

    } catch (error) {
        console.error('Error fetching AI analysis:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
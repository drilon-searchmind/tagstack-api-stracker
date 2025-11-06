import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongoose';
import ScannedUrl from '@/models/ScannedUrl';
import Customer from '@/models/Customer';
import AiAnalysis from '@/models/AiAnalysis';

// GET: Fetch scan history with analysis data in a single call
export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Await params before accessing its properties (Next.js 15+ requirement)
        const resolvedParams = await params;
        const customerId = resolvedParams.customerId;

        if (!customerId) {
            return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
        }

        await connectDB();

        // Verify customer belongs to user
        const customer = await Customer.findOne({
            _id: customerId,
            userId: session.user.id
        });

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found or access denied' }, { status: 404 });
        }

        // Fetch scans and analyses in parallel (no limit)
        const [scans, analyses] = await Promise.all([
            // Fetch all scans
            ScannedUrl.find({
                customerId: customerId,
                userId: session.user.id
            })
            .sort({ scanDate: -1 })
            .lean(),

            // Fetch all analyses for this customer's scans
            AiAnalysis.find({
                customerId: customerId,
                userId: session.user.id
            })
            .select('scannedUrlId analysisStatus analysisDate _id')
            .lean()
        ]);

        // Create a map of scanId -> analysis for quick lookup
        const analysisMap = {};
        analyses.forEach(analysis => {
            analysisMap[analysis.scannedUrlId.toString()] = analysis;
        });

        // Combine scan data with analysis info
        const scansWithAnalysis = scans.map(scan => ({
            ...scan,
            analysis: analysisMap[scan._id.toString()] || null
        }));

        return NextResponse.json({
            success: true,
            scans: scansWithAnalysis,
            total: scans.length
        });

    } catch (error) {
        console.error('Error fetching scan history with analysis:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
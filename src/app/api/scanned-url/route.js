import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import ScannedUrl from '@/models/ScannedUrl';
import Customer from '@/models/Customer';
import connectDB from '@/lib/mongoose';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || !session.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const requestBody = await request.json();
        const { customerId, requestedUrl, gtmScan, containers, containerScans, scanDuration } = requestBody;

        console.log('=== DEBUG: API received data ===');
        console.log('Full request body:', JSON.stringify(requestBody, null, 2));
        console.log('customerId:', customerId);
        console.log('requestedUrl:', requestedUrl);
        console.log('containers:', containers);
        console.log('containers type:', typeof containers);
        console.log('containers isArray:', Array.isArray(containers));
        console.log('containerScans:', containerScans);
        console.log('containerScans type:', typeof containerScans);
        console.log('containerScans isArray:', Array.isArray(containerScans));
        console.log('=== END API DEBUG ===');

        if (!customerId || !requestedUrl || !gtmScan) {
            return NextResponse.json(
                { error: 'Customer ID, requested URL, and GTM scan data are required' },
                { status: 400 }
            );
        }

        await connectDB();

        const customer = await Customer.findOne({
            _id: customerId,
            userId: session.user.id
        });

        if (!customer) {
            return NextResponse.json(
                { error: 'Customer not found or access denied' },
                { status: 404 }
            );
        }

        const scanData = {
            userId: session.user.id,
            customerId,
            requestedUrl,
            gtmScan,
            containers: containers || [],
            containerScans: containerScans || [],
            scanDuration: scanDuration || 0
        };

        console.log('=== DEBUG: About to save to MongoDB ===');
        console.log('scanData:', JSON.stringify(scanData, null, 2));
        console.log('scanData.containers type:', typeof scanData.containers);
        console.log('scanData.containers isArray:', Array.isArray(scanData.containers));
        console.log('=== END MONGODB DEBUG ===');

        try {
            const scannedUrl = await ScannedUrl.createScan(scanData);
            await scannedUrl.updateCustomerRecord();

            return NextResponse.json({
                message: 'Scan saved successfully',
                scan: scannedUrl
            });
        } catch (mongoError) {
            console.error('=== MONGODB SAVE ERROR ===');
            console.error('Error details:', mongoError);
            console.error('Error name:', mongoError.name);
            console.error('Error message:', mongoError.message);
            if (mongoError.errors) {
                console.error('Validation errors:', JSON.stringify(mongoError.errors, null, 2));
            }
            console.error('=== END MONGODB ERROR ===');
            throw mongoError; // Re-throw to be caught by outer try-catch
        }

    } catch (error) {
        console.error('Error saving scan:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || !session.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get('customerId');
        const limit = parseInt(searchParams.get('limit') || '10');

        await connectDB();

        let scans;
        if (customerId) {
            const customer = await Customer.findOne({
                _id: customerId,
                userId: session.user.id
            });

            if (!customer) {
                return NextResponse.json(
                    { error: 'Customer not found or access denied' },
                    { status: 404 }
                );
            }

            scans = await ScannedUrl.findByCustomerId(customerId, limit);
        } else {
            scans = await ScannedUrl.findByUserId(session.user.id, limit);
        }

        return NextResponse.json({ scans });

    } catch (error) {
        console.error('Error fetching scans:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
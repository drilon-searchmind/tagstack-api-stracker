import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
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

        const { name, url } = await request.json();

        if (!name || !url) {
            return NextResponse.json(
                { error: 'Name and URL are required' },
                { status: 400 }
            );
        }

        await connectDB();

        const existingCustomer = await Customer.findOne({
            userId: session.user.id,
            $or: [
                { name: { $regex: new RegExp(`^${name}$`, 'i') } },
                { url: url }
            ]
        });

        if (existingCustomer) {
            return NextResponse.json(
                { error: 'Customer with this name or URL already exists' },
                { status: 409 }
            );
        }

        const customer = await Customer.createCustomer({
            userId: session.user.id,
            name,
            url
        });

        return NextResponse.json({
            message: 'Customer added successfully',
            customer
        });

    } catch (error) {
        console.error('Error adding customer:', error);
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

        await connectDB();
        const customers = await Customer.findByUserId(session.user.id);

        return NextResponse.json({ customers });

    } catch (error) {
        console.error('Error fetching customers:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
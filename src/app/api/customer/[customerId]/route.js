import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Customer from '@/models/Customer';
import connectDB from '@/lib/mongoose';

export async function GET(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || !session.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { customerId } = await params;

        await connectDB();
        
        const customer = await Customer.findOne({
            _id: customerId,
            userId: session.user.id
        });

        if (!customer) {
            return NextResponse.json(
                { error: 'Customer not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ customer });

    } catch (error) {
        console.error('Error fetching customer:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || !session.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { customerId } = await params;
        const updates = await request.json();
        
        await connectDB();
        
        const customer = await Customer.findOneAndUpdate(
            {
                _id: customerId,
                userId: session.user.id
            },
            updates,
            { new: true }
        );

        if (!customer) {
            return NextResponse.json(
                { error: 'Customer not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ 
            message: 'Customer updated successfully',
            customer 
        });

    } catch (error) {
        console.error('Error updating customer:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || !session.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { customerId } = await params;

        await connectDB();
        
        const customer = await Customer.findOneAndDelete({
            _id: customerId,
            userId: session.user.id
        });

        if (!customer) {
            return NextResponse.json(
                { error: 'Customer not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ 
            message: 'Customer deleted successfully' 
        });

    } catch (error) {
        console.error('Error deleting customer:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
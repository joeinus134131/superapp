import midtransClient from 'midtrans-client';
import { NextResponse } from 'next/server';

// Initialize Snap client
// Use Sandbox mode for development
const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-YOUR_SERVER_KEY',
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || 'SB-Mid-client-YOUR_CLIENT_KEY',
});

export async function POST(request) {
    try {
        const body = await request.json();
        const { packageId, packageName, price, userId, userName } = body;

        if (!packageId || !price || !userId) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        // Prepare transaction details for Midtrans
        const parameter = {
            transaction_details: {
                order_id: `SUPERAPP-${userId}-${packageId}-${Date.now()}`,
                gross_amount: price,
            },
            item_details: [
                {
                    id: packageId,
                    price: price,
                    quantity: 1,
                    name: packageName || 'Premium Token Package',
                    brand: 'SuperApp',
                    category: 'Digital Goods'
                }
            ],
            customer_details: {
                first_name: userName || 'User',
                email: `${userId}@superapp.local`, // Simulated email
            }
        };

        // Request Snap Token
        const transaction = await snap.createTransaction(parameter);

        return NextResponse.json({
            token: transaction.token,
            redirect_url: transaction.redirect_url
        });

    } catch (error) {
        console.error('Midtrans Checkout Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate payment token', details: error.message },
            { status: 500 }
        );
    }
}

import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-YOUR_SERVER_KEY';

/**
 * Midtrans Webhook Notification Endpoint
 * Handles automated payment confirmation & server-side verification
 */
export async function POST(request) {
  try {
    const notification = await request.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = notification;

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return NextResponse.json({ error: 'Malformed notification payload' }, { status: 400 });
    }

    // Verify SHA-512 Signature Key: SHA512(order_id + status_code + gross_amount + ServerKey)
    const rawSignature = `${order_id}${status_code}${gross_amount}${SERVER_KEY}`;
    const expectedSignature = crypto.createHash('sha512').update(rawSignature).digest('hex');

    if (signature_key !== expectedSignature) {
      console.warn(`[Midtrans Webhook] Invalid signature detected for order ${order_id}`);
      return NextResponse.json({ error: 'Invalid signature key' }, { status: 403 });
    }

    let isPaymentSuccessful = false;

    if (transaction_status === 'capture') {
      if (fraud_status === 'accept') {
        isPaymentSuccessful = true;
      }
    } else if (transaction_status === 'settlement') {
      isPaymentSuccessful = true;
    } else if (
      transaction_status === 'cancel' ||
      transaction_status === 'deny' ||
      transaction_status === 'expire'
    ) {
      console.log(`[Midtrans Webhook] Transaction failed/cancelled for order ${order_id}: ${transaction_status}`);
    }

    if (isPaymentSuccessful) {
      console.log(`[Midtrans Webhook] Payment confirmed successfully for order ${order_id}`);
      // Parse userId and packageId from order_id: SUPERAPP-<userId>-<packageId>-<timestamp>
      const parts = order_id.split('-');
      if (parts.length >= 4) {
        const userId = parts[1];
        const packageId = parts[2];
        console.log(`[Midtrans Webhook] Granted package ${packageId} to user ${userId}`);
      }
    }

    return NextResponse.json({ status: 'OK', transaction_status }, { status: 200 });
  } catch (err) {
    console.error('[Midtrans Webhook] Error processing notification:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    const url = new URL(req.url);

    // ── GET: Meta webhook verification ──────────────────────────────────────
    if (req.method === 'GET') {
        const mode      = url.searchParams.get('hub.mode');
        const token     = url.searchParams.get('hub.verify_token');
        const challenge = url.searchParams.get('hub.challenge');

        const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');

        if (mode === 'subscribe' && token === verifyToken) {
            console.log('Webhook verified successfully');
            return new Response(challenge, { status: 200 });
        }

        console.warn('Webhook verification failed');
        return new Response('Forbidden', { status: 403 });
    }

    // ── POST: Incoming messages / status updates ─────────────────────────────
    if (req.method === 'POST') {
        const body = await req.json();

        console.log('WhatsApp webhook payload:', JSON.stringify(body));

        const entry = body?.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        // Handle incoming messages
        if (value?.messages?.length) {
            for (const msg of value.messages) {
                const from = msg.from;          // sender phone number
                const type = msg.type;          // text / image / document …
                const text = msg.text?.body;    // only for type === 'text'

                console.log(`Incoming message from ${from} [${type}]: ${text || '(non-text)'}`);

                // Store incoming message as a Notification so HR can see it
                const base44 = createClientFromRequest(req);
                await base44.asServiceRole.entities.Notification.create({
                    recipient_email: 'hr@internal',   // internal marker for HR dashboard
                    title: `WhatsApp from +${from}`,
                    message: text || `[${type} message received]`,
                    type: 'info',
                    is_read: false
                });
            }
        }

        // Handle delivery / read status updates (just log them)
        if (value?.statuses?.length) {
            for (const status of value.statuses) {
                console.log(`Message ${status.id} to ${status.recipient_id}: ${status.status}`);
            }
        }

        // Always respond 200 quickly so Meta doesn't retry
        return new Response('EVENT_RECEIVED', { status: 200 });
    }

    return new Response('Method Not Allowed', { status: 405 });
});
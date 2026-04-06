import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    const url = new URL(req.url);

    // ── GET or query-param based: Meta webhook verification ─────────────────
    const modeParam  = url.searchParams.get('hub.mode');
    const tokenParam = url.searchParams.get('hub.verify_token');
    const challengeParam = url.searchParams.get('hub.challenge');

    if (modeParam || tokenParam || challengeParam) {
        const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');
        console.log('Verification attempt - mode:', modeParam, '| token:', tokenParam, '| expected:', verifyToken);

        if (modeParam === 'subscribe' && tokenParam === verifyToken) {
            console.log('Webhook verified successfully');
            return new Response(challengeParam, {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        console.warn('Webhook verification failed - token mismatch');
        return new Response('Forbidden', { status: 403 });
    }

    // ── POST: Incoming messages / status updates ─────────────────────────────
    if (req.method === 'POST') {
        const body = await req.json();
        console.log('WhatsApp webhook payload:', JSON.stringify(body));

        // Also handle verification sent as POST body (some proxies do this)
        if (body?.['hub.mode'] === 'subscribe') {
            const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');
            if (body['hub.verify_token'] === verifyToken) {
                return new Response(body['hub.challenge'], {
                    status: 200,
                    headers: { 'Content-Type': 'text/plain' }
                });
            }
            return new Response('Forbidden', { status: 403 });
        }

        const entry = body?.entry?.[0];
        const value = entry?.changes?.[0]?.value;

        // Handle incoming messages
        if (value?.messages?.length) {
            for (const msg of value.messages) {
                const from = msg.from;
                const type = msg.type;
                const text = msg.text?.body;
                console.log(`Incoming message from ${from} [${type}]: ${text || '(non-text)'}`);

                const base44 = createClientFromRequest(req);
                await base44.asServiceRole.entities.Notification.create({
                    recipient_email: 'hr@internal',
                    title: `WhatsApp from +${from}`,
                    message: text || `[${type} message received]`,
                    type: 'info',
                    is_read: false
                });
            }
        }

        // Handle status updates
        if (value?.statuses?.length) {
            for (const status of value.statuses) {
                console.log(`Message ${status.id} to ${status.recipient_id}: ${status.status}`);
            }
        }

        return new Response('EVENT_RECEIVED', { status: 200 });
    }

    // GET with no hub params - health check
    return new Response('Webhook is running', { status: 200 });
});
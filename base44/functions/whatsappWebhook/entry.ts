import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const VERIFY_TOKEN = 'Saber@2025';

Deno.serve(async (req) => {
    const url = new URL(req.url);

    // Extract hub params from query string (Meta sends GET with query params)
    let mode      = url.searchParams.get('hub.mode');
    let token     = url.searchParams.get('hub.verify_token');
    let challenge = url.searchParams.get('hub.challenge');

    // If not in query params, try request body (some proxies convert GET → POST)
    if (!mode && req.method === 'POST') {
        let body = {};
        try {
            const text = await req.text();
            // Try JSON
            try { body = JSON.parse(text); } catch (_) {
                // Try URL-encoded
                const params = new URLSearchParams(text);
                body = Object.fromEntries(params.entries());
            }

            // Check if it's a verification request in body
            if (body['hub.mode'] || body.hub_mode) {
                mode      = body['hub.mode']      || body.hub_mode;
                token     = body['hub.verify_token'] || body.hub_verify_token;
                challenge = body['hub.challenge']  || body.hub_challenge;
            } else {
                // It's a real POST webhook event
                console.log('WhatsApp POST webhook:', JSON.stringify(body));

                // Fire-and-forget message storage
                (async () => {
                    try {
                        const value = body?.entry?.[0]?.changes?.[0]?.value;
                        if (value?.messages?.length) {
                            const base44 = createClientFromRequest(req);
                            for (const msg of value.messages) {
                                const from = msg.from;
                                const text = msg.text?.body || `[${msg.type}]`;
                                console.log(`Message from +${from}: ${text}`);
                                await base44.asServiceRole.entities.Notification.create({
                                    recipient_email: 'hr@internal',
                                    title: `WhatsApp from +${from}`,
                                    message: text,
                                    type: 'info',
                                    is_read: false
                                });
                            }
                        }
                        if (value?.statuses?.length) {
                            for (const s of value.statuses) {
                                console.log(`Status: msg ${s.id} → ${s.status}`);
                            }
                        }
                    } catch (e) {
                        console.error('Webhook processing error:', e.message);
                    }
                })();

                return new Response('EVENT_RECEIVED', { status: 200 });
            }
        } catch (e) {
            console.error('Body parse error:', e.message);
        }
    }

    // Handle verification (works for GET or proxied POST)
    if (mode === 'subscribe') {
        console.log(`Verification attempt — token received: "${token}", expected: "${VERIFY_TOKEN}"`);
        if (token === VERIFY_TOKEN) {
            console.log('Webhook verified ✓ returning challenge:', challenge);
            return new Response(challenge, {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            });
        }
        console.warn('Token mismatch — returning 403');
        return new Response('Forbidden', { status: 403 });
    }

    // GET health check / no params
    return new Response('Webhook active', { status: 200 });
});
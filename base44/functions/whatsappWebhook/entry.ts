import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    const url = new URL(req.url);

    // ── GET: Meta webhook verification ──────────────────────────────────────
    if (req.method === 'GET') {
        const mode      = url.searchParams.get('hub.mode');
        const token     = url.searchParams.get('hub.verify_token');
        const challenge = url.searchParams.get('hub.challenge');

        console.log(`Verification request → mode: ${mode}, token: ${token}, challenge: ${challenge}`);

        if (mode === 'subscribe' && token === 'Saber@2025') {
            console.log('Webhook verified ✓');
            return new Response(challenge, {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        console.warn(`Verification failed — token received: "${token}"`);
        return new Response('Forbidden', { status: 403 });
    }

    // ── POST: Incoming WhatsApp messages ────────────────────────────────────
    if (req.method === 'POST') {
        // Respond immediately (within 2 seconds) — process async in background
        const bodyText = await req.text();
        console.log('WhatsApp POST payload:', bodyText);

        // Fire and forget — don't await so response is instant
        (async () => {
            try {
                const body = JSON.parse(bodyText);
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
                        console.log(`Status update: msg ${s.id} → ${s.status}`);
                    }
                }
            } catch (e) {
                console.error('Error processing webhook payload:', e.message);
            }
        })();

        return new Response('EVENT_RECEIVED', { status: 200 });
    }

    return new Response('OK', { status: 200 });
});
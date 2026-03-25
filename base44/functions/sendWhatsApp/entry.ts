import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { phone, message, type = 'text', media_url, filename } = await req.json();

        if (!phone || !message) {
            return Response.json({ error: 'Phone number and message are required' }, { status: 400 });
        }

        const instanceId = Deno.env.get("WHATSAPP_INSTANCE_ID");
        const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

        if (!instanceId || !accessToken) {
            return Response.json({ error: 'WhatsApp credentials not configured' }, { status: 500 });
        }

        // Format phone number - remove any non-digits and ensure country code
        let formattedPhone = phone.replace(/\D/g, '');
        // If starts with 0, assume Indian number and add 91
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '91' + formattedPhone.substring(1);
        }
        // If doesn't have country code (less than 12 digits), add 91
        if (formattedPhone.length === 10) {
            formattedPhone = '91' + formattedPhone;
        }

        const payload = {
            number: formattedPhone,
            type: type,
            message: message,
            instance_id: instanceId,
            access_token: accessToken
        };

        // Add media URL if sending media
        if (type === 'media' && media_url) {
            payload.media_url = media_url;
            if (filename) {
                payload.filename = filename;
            }
        }

        const response = await fetch('https://web.saasyto.com/api/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            return Response.json({ error: 'Failed to send WhatsApp message', details: result }, { status: 500 });
        }

        return Response.json({ success: true, result });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
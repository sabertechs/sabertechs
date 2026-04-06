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

        const accessToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
        const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");

        if (!accessToken || !phoneNumberId) {
            return Response.json({ error: 'Meta WhatsApp credentials not configured' }, { status: 500 });
        }

        // Format phone number - remove any non-digits and ensure country code
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '91' + formattedPhone.substring(1);
        }
        if (formattedPhone.length === 10) {
            formattedPhone = '91' + formattedPhone;
        }

        // Build Meta Cloud API payload
        let payload;
        if (type === 'media' && media_url) {
            // Determine media type from URL
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(media_url);
            const isPdf = /\.pdf$/i.test(media_url);
            const mediaType = isImage ? 'image' : isPdf ? 'document' : 'document';
            payload = {
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: mediaType,
                [mediaType]: {
                    link: media_url,
                    ...(message ? { caption: message } : {}),
                    ...(filename && !isImage ? { filename } : {})
                }
            };
        } else {
            payload = {
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: 'text',
                text: { body: message }
            };
        }

        const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
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
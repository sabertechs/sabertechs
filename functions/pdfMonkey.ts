import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const PDFMONKEY_API_KEY = Deno.env.get("PDFMONKEY_API_KEY");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, templateId, payload, documentId } = await req.json();

    const headers = {
      'Authorization': `Bearer ${PDFMONKEY_API_KEY}`,
      'Content-Type': 'application/json'
    };

    // Generate a new PDF document
    if (action === 'generate') {
      const response = await fetch('https://api.pdfmonkey.io/api/v1/documents', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          document: {
            document_template_id: templateId,
            payload: payload,
            status: 'pending'
          }
        })
      });

      const data = await response.json();
      return Response.json(data);
    }

    // Check document status and get download URL
    if (action === 'status') {
      const response = await fetch(`https://api.pdfmonkey.io/api/v1/documents/${documentId}`, {
        method: 'GET',
        headers
      });

      const data = await response.json();
      return Response.json(data);
    }

    // List available templates
    if (action === 'templates') {
      const response = await fetch('https://api.pdfmonkey.io/api/v1/document_templates', {
        method: 'GET',
        headers
      });

      const data = await response.json();
      return Response.json(data);
    }

    // Delete a document
    if (action === 'delete') {
      const response = await fetch(`https://api.pdfmonkey.io/api/v1/documents/${documentId}`, {
        method: 'DELETE',
        headers
      });

      if (response.status === 204) {
        return Response.json({ success: true });
      }
      const data = await response.json();
      return Response.json(data);
    }

    return Response.json({ error: 'Invalid action. Use: generate, status, templates, or delete' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const pdfUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/10f8eff81_cityandstatelist.pdf";
    
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Extract ALL cities and their corresponding states from the attached PDF document. 
      Return a complete JSON array where each object has exactly two fields: "city" and "state".
      Make sure to extract EVERY SINGLE city-state pair from the document.
      Fix any spacing issues (e.g., "AhmedabadGujarat" should be "Ahmedabad" and "Gujarat").
      Return ONLY the JSON array, nothing else.`,
      file_urls: [pdfUrl],
      response_json_schema: {
        type: "object",
        properties: {
          cities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                city: { type: "string" },
                state: { type: "string" }
              }
            }
          }
        }
      }
    });
    
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
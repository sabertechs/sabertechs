import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { expenseId, description, amount, date, receiptUrl, employeeEmail } = await req.json();

    // Fetch all expenses for duplicate detection
    const allExpenses = await base44.entities.Expense.filter({ 
      employee_email: employeeEmail 
    });

    // Prepare AI prompt for comprehensive analysis
    const prompt = `Analyze this expense claim and provide fraud detection insights:

Expense Details:
- Description: ${description || 'No description'}
- Amount: ₹${amount}
- Date: ${date}
- Receipt: ${receiptUrl ? 'Attached' : 'Not attached'}

Recent expenses from same employee (last 5):
${allExpenses.slice(0, 5).map(e => `- ${e.expense_type}: ₹${e.amount} on ${e.date}`).join('\n')}

Tasks:
1. Suggest the most appropriate category: travel, meals, accommodation, supplies, communication, or other
2. Provide a confidence score (0-100)
3. Fraud risk score (0-100, where 100 is highest risk)
4. List any fraud indicators (unusual amount, duplicate pattern, suspicious timing, etc.)
5. Check if this might be a duplicate of recent expenses

Return ONLY a JSON object with this structure:
{
  "suggested_category": "category_name",
  "confidence": 85,
  "fraud_score": 15,
  "fraud_indicators": ["reason1", "reason2"],
  "is_likely_duplicate": false,
  "similar_expense_index": null,
  "analysis_notes": "brief analysis"
}`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          suggested_category: { type: "string" },
          confidence: { type: "number" },
          fraud_score: { type: "number" },
          fraud_indicators: { type: "array", items: { type: "string" } },
          is_likely_duplicate: { type: "boolean" },
          similar_expense_index: { type: "number" },
          analysis_notes: { type: "string" }
        }
      }
    });

    // Update expense with AI analysis
    if (expenseId) {
      await base44.entities.Expense.update(expenseId, {
        ai_category: aiResponse.suggested_category,
        ai_confidence: aiResponse.confidence,
        fraud_score: aiResponse.fraud_score,
        fraud_reasons: aiResponse.fraud_indicators,
        duplicate_check: {
          is_duplicate: aiResponse.is_likely_duplicate,
          similar_expense_id: aiResponse.similar_expense_index !== null 
            ? allExpenses[aiResponse.similar_expense_index]?.id 
            : null
        }
      });
    }

    return Response.json({
      success: true,
      analysis: aiResponse
    });

  } catch (error) {
    console.error('Expense analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
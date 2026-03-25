import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeEmail, department, timeframe } = await req.json();

    // Fetch expenses based on parameters
    const query = employeeEmail 
      ? { employee_email: employeeEmail }
      : department 
        ? { department: department }
        : {};

    const expenses = await base44.entities.Expense.filter(query);

    // Calculate statistics
    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const avgAmount = totalAmount / totalExpenses || 0;
    
    const categoryBreakdown = expenses.reduce((acc, e) => {
      acc[e.expense_type] = (acc[e.expense_type] || 0) + e.amount;
      return acc;
    }, {});

    const monthlyTrend = expenses.reduce((acc, e) => {
      const month = e.date?.substring(0, 7) || 'unknown';
      acc[month] = (acc[month] || 0) + e.amount;
      return acc;
    }, {});

    const highRiskExpenses = expenses.filter(e => (e.fraud_score || 0) > 60).length;
    const duplicateCount = expenses.filter(e => e.duplicate_check?.is_duplicate).length;

    // Generate AI insights
    const prompt = `Analyze this expense data and provide actionable insights:

Total Expenses: ${totalExpenses}
Total Amount: ₹${totalAmount.toLocaleString()}
Average: ₹${avgAmount.toFixed(2)}

Category Breakdown:
${Object.entries(categoryBreakdown).map(([cat, amt]) => `- ${cat}: ₹${amt.toLocaleString()}`).join('\n')}

Monthly Trend:
${Object.entries(monthlyTrend).map(([month, amt]) => `- ${month}: ₹${amt.toLocaleString()}`).join('\n')}

High-Risk Expenses: ${highRiskExpenses}
Potential Duplicates: ${duplicateCount}

Provide:
1. Key spending insights and patterns
2. Budget adherence analysis
3. Recommendations for cost optimization
4. Fraud risk assessment
5. Top 3 actionable recommendations

Return as JSON with structure:
{
  "key_insights": ["insight1", "insight2", "insight3"],
  "budget_status": "under_budget/on_track/over_budget",
  "risk_level": "low/medium/high",
  "recommendations": ["rec1", "rec2", "rec3"],
  "savings_potential": "estimated amount or percentage"
}`;

    const aiInsights = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      response_json_schema: {
        type: "object",
        properties: {
          key_insights: { type: "array", items: { type: "string" } },
          budget_status: { type: "string" },
          risk_level: { type: "string" },
          recommendations: { type: "array", items: { type: "string" } },
          savings_potential: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      statistics: {
        total_expenses: totalExpenses,
        total_amount: totalAmount,
        average_amount: avgAmount,
        category_breakdown: categoryBreakdown,
        monthly_trend: monthlyTrend,
        high_risk_count: highRiskExpenses,
        duplicate_count: duplicateCount
      },
      insights: aiInsights
    });

  } catch (error) {
    console.error('Insights generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
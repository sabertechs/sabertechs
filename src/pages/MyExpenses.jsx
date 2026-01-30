import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Receipt, Upload, Loader2, CheckCircle, XCircle, Clock, Sparkles, AlertTriangle, TrendingUp, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function MyExpenses() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [showInsights, setShowInsights] = useState(false);
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [formData, setFormData] = useState({
    expense_type: "",
    amount: "",
    date: format(new Date(), 'yyyy-MM-dd'),
    description: "",
    receipt_url: ""
  });

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      const employees = await base44.entities.Employee.filter({ email: userData.email });
      if (employees.length > 0) setEmployee(employees[0]);
    };
    fetchUser();
  }, []);

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', user?.email],
    queryFn: () => base44.entities.Expense.filter({ employee_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const expense = await base44.entities.Expense.create(data);
      
      // Run AI analysis in background
      try {
        await base44.functions.invoke('analyzeExpense', {
          expenseId: expense.id,
          description: data.description,
          amount: data.amount,
          date: data.date,
          receiptUrl: data.receipt_url,
          employeeEmail: data.employee_email
        });
      } catch (err) {
        console.error('AI analysis failed:', err);
      }
      
      return expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      setShowAddDialog(false);
      resetForm();
      setAiAnalysis(null);
      toast({
        title: "Success",
        description: "Expense submitted and being analyzed by AI"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      expense_type: "",
      amount: "",
      date: format(new Date(), 'yyyy-MM-dd'),
      description: "",
      receipt_url: ""
    });
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, receipt_url: file_url }));
    setUploading(false);
  };

  const handleAIAnalyze = async () => {
    if (!formData.description && !formData.receipt_url) {
      toast({
        title: "Info",
        description: "Add a description or receipt for better AI analysis",
        variant: "default"
      });
      return;
    }

    setAnalyzing(true);
    try {
      const result = await base44.functions.invoke('analyzeExpense', {
        expenseId: null,
        description: formData.description,
        amount: formData.amount,
        date: formData.date,
        receiptUrl: formData.receipt_url,
        employeeEmail: user.email
      });
      
      setAiAnalysis(result.data.analysis);
      
      // Auto-suggest category if confidence is high
      if (result.data.analysis.confidence > 70 && !formData.expense_type) {
        setFormData(prev => ({ ...prev, expense_type: result.data.analysis.suggested_category }));
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      toast({
        title: "Error",
        description: "AI analysis failed. You can still submit the expense.",
        variant: "destructive"
      });
    }
    setAnalyzing(false);
  };

  const loadInsights = async () => {
    setLoadingInsights(true);
    try {
      const result = await base44.functions.invoke('generateExpenseInsights', {
        employeeEmail: user.email,
        timeframe: 'all'
      });
      setInsights(result.data);
    } catch (err) {
      console.error('Insights error:', err);
    }
    setLoadingInsights(false);
  };

  const handleSubmit = () => {
    createMutation.mutate({
      ...formData,
      amount: parseFloat(formData.amount),
      employee_email: user.email,
      employee_name: user.full_name,
      department: employee?.department || "",
      status: "pending"
    });
  };

  const stats = {
    total: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    pending: expenses.filter(e => e.status === 'pending').length,
    approved: expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0),
    rejected: expenses.filter(e => e.status === 'rejected').length
  };

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700'
  };

  const statusIcons = {
    pending: Clock,
    approved: CheckCircle,
    rejected: XCircle
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">My Expenses</h2>
          <p className="text-slate-500">Submit and track your expense claims</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setShowInsights(true); loadInsights(); }} variant="outline">
            <TrendingUp className="w-4 h-4 mr-2" />
            AI Insights
          </Button>
          <Button onClick={() => { resetForm(); setShowAddDialog(true); }} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Submit Expense
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 rounded-xl">
                <Receipt className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">₹{stats.total.toLocaleString()}</p>
                <p className="text-sm text-slate-500">Total Claimed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.pending}</p>
                <p className="text-sm text-slate-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">₹{stats.approved.toLocaleString()}</p>
                <p className="text-sm text-slate-500">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-xl">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.rejected}</p>
                <p className="text-sm text-slate-500">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Expense History</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-800">No Expenses</h3>
              <p className="text-slate-500 mt-1 mb-4">Submit your first expense claim</p>
              <Button onClick={() => setShowAddDialog(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Submit Expense
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense) => {
                const StatusIcon = statusIcons[expense.status];
                return (
                  <div key={expense.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-3 rounded-xl ${statusColors[expense.status]}`}>
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-800 capitalize">{expense.expense_type?.replace('_', ' ')}</p>
                          {expense.ai_category && expense.ai_category !== expense.expense_type && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                              <Brain className="w-3 h-3 mr-1" />
                              AI: {expense.ai_category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{format(new Date(expense.date), 'MMM d, yyyy')}</p>
                        {expense.description && (
                          <p className="text-sm text-slate-400 mt-1">{expense.description}</p>
                        )}
                        {(expense.fraud_score > 60 || expense.duplicate_check?.is_duplicate) && (
                          <div className="flex items-center gap-2 mt-2">
                            {expense.fraud_score > 60 && (
                              <Badge className="bg-orange-100 text-orange-700 text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Risk: {expense.fraud_score}%
                              </Badge>
                            )}
                            {expense.duplicate_check?.is_duplicate && (
                              <Badge className="bg-red-100 text-red-700 text-xs">
                                Possible Duplicate
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-800">₹{expense.amount?.toLocaleString()}</p>
                      <Badge className={statusColors[expense.status]}>
                        {expense.status}
                      </Badge>
                      {expense.rejection_reason && (
                        <p className="text-xs text-red-500 mt-1">{expense.rejection_reason}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Insights Dialog */}
      <Dialog open={showInsights} onOpenChange={setShowInsights}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI-Powered Expense Insights
            </DialogTitle>
          </DialogHeader>
          {loadingInsights ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : insights ? (
            <div className="space-y-6">
              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-0 bg-indigo-50">
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold text-indigo-700">₹{insights.statistics.total_amount.toLocaleString()}</p>
                    <p className="text-sm text-indigo-600">Total Expenses</p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-green-50">
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold text-green-700">₹{insights.statistics.average_amount.toFixed(0)}</p>
                    <p className="text-sm text-green-600">Average Amount</p>
                  </CardContent>
                </Card>
              </div>

              {/* Key Insights */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-3">Key Insights</h3>
                <div className="space-y-2">
                  {insights.insights.key_insights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                      <Brain className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-700">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Budget Status */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm text-slate-500">Budget Status</p>
                  <p className="font-semibold text-slate-800 capitalize">{insights.insights.budget_status.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Risk Level</p>
                  <Badge className={
                    insights.insights.risk_level === 'low' ? 'bg-green-100 text-green-700' :
                    insights.insights.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }>
                    {insights.insights.risk_level}
                  </Badge>
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-3">Recommendations</h3>
                <div className="space-y-2">
                  {insights.insights.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-700">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Savings Potential */}
              {insights.insights.savings_potential && (
                <Card className="border-0 bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                  <CardContent className="pt-4">
                    <p className="text-sm opacity-90">Potential Savings</p>
                    <p className="text-2xl font-bold mt-1">{insights.insights.savings_potential}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Add Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Submit Expense
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-Powered
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Expense Type *</Label>
              <Select value={formData.expense_type} onValueChange={(v) => setFormData({ ...formData, expense_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="meals">Meals</SelectItem>
                  <SelectItem value="accommodation">Accommodation</SelectItem>
                  <SelectItem value="supplies">Supplies</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the expense"
                rows={3}
              />
            </div>

            {/* AI Analysis Section */}
            {(formData.description || formData.receipt_url || formData.amount) && (
              <div className="border-t pt-4">
                <Button 
                  type="button"
                  onClick={handleAIAnalyze} 
                  disabled={analyzing}
                  variant="outline"
                  className="w-full border-purple-200 hover:bg-purple-50"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </Button>

                {aiAnalysis && (
                  <div className="mt-4 p-4 bg-purple-50 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-purple-900">AI Analysis</p>
                      <Badge className="bg-purple-200 text-purple-900">
                        {aiAnalysis.confidence}% confidence
                      </Badge>
                    </div>
                    
                    {aiAnalysis.suggested_category && (
                      <div>
                        <p className="text-xs text-purple-700">Suggested Category</p>
                        <p className="text-sm font-medium text-purple-900 capitalize">{aiAnalysis.suggested_category}</p>
                      </div>
                    )}

                    {aiAnalysis.fraud_score > 30 && (
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-orange-700" />
                          <p className="text-sm font-medium text-orange-900">Risk Score: {aiAnalysis.fraud_score}%</p>
                        </div>
                        {aiAnalysis.fraud_indicators?.length > 0 && (
                          <ul className="text-xs text-orange-800 space-y-1">
                            {aiAnalysis.fraud_indicators.map((ind, idx) => (
                              <li key={idx}>• {ind}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {aiAnalysis.is_likely_duplicate && (
                      <div className="p-3 bg-red-100 rounded-lg">
                        <p className="text-sm font-medium text-red-900">⚠️ Possible duplicate detected</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Receipt</Label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-indigo-400 transition-colors">
                {formData.receipt_url ? (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span>Receipt uploaded</span>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                    />
                    {uploading ? (
                      <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                        <span className="text-slate-500 text-sm">Click to upload receipt</span>
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.expense_type || !formData.amount || createMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
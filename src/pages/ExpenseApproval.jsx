import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, Filter, CheckCircle, XCircle, Eye, Receipt, ExternalLink, Brain, AlertTriangle, Sparkles, TrendingUp } from "lucide-react";
import { getExpenseStatusEmail } from "@/components/email/EmailTemplate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ExpenseApproval() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      const emps = await base44.entities.Employee.filter({ email: userData.email });
      if (emps.length > 0) setEmployee(emps[0]);
    };
    fetchUser();
  }, []);

  const { data: allExpenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-created_date'),
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['allEmployees'],
    queryFn: () => base44.entities.Employee.list(),
  });

  // Filter expenses based on reporting relationship
  const expenses = useMemo(() => {
    if (!user || !employee) return allExpenses;

    // HR and admin see all expenses
    if (employee.role === 'hr' || user.role === 'admin') {
      return allExpenses;
    }

    // Managers and department heads see expenses from their reportees
    if (employee.role === 'manager' || employee.role === 'department_head') {
      return allExpenses.filter(expense => {
        const reportee = allEmployees.find(emp => emp.email === expense.employee_email);
        return reportee?.reporting_to === user.email;
      });
    }

    return [];
  }, [allExpenses, allEmployees, user, employee]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: async (_, { id, data }) => {
      queryClient.invalidateQueries(['expenses']);
      
      // Create in-app notification and send email
      const expense = expenses.find(e => e.id === id);
      if (expense) {
        const subject = data.status === 'approved' 
          ? 'Expense Approved' 
          : 'Expense Rejected';
        const body = data.status === 'approved'
          ? `Your expense claim of ₹${expense.amount} for ${expense.expense_type} has been approved.`
          : `Your expense claim of ₹${expense.amount} for ${expense.expense_type} has been rejected. Reason: ${data.rejection_reason}`;

        await base44.entities.Notification.create({
          recipient_email: expense.employee_email,
          title: subject,
          message: body,
          type: data.status === 'approved' ? 'success' : 'alert'
        });

        // Send professional email
        const emailBody = getExpenseStatusEmail({
          recipientName: expense.employee_name,
          expenseType: expense.expense_type,
          amount: expense.amount,
          status: data.status,
          remarks: data.rejection_reason || null
        });
        
        await base44.integrations.Core.SendEmail({
          to: expense.employee_email,
          subject: subject,
          body: emailBody
        });
      }
      
      setSelectedExpense(null);
      setShowRejectDialog(false);
      setRejectReason("");
    }
  });

  const handleApprove = (expense) => {
    updateMutation.mutate({
      id: expense.id,
      data: {
        status: 'approved',
        approved_by: user.email,
        approval_date: format(new Date(), 'yyyy-MM-dd')
      }
    });
  };

  const handleReject = () => {
    updateMutation.mutate({
      id: selectedExpense.id,
      data: {
        status: 'rejected',
        approved_by: user.email,
        approval_date: format(new Date(), 'yyyy-MM-dd'),
        rejection_reason: rejectReason
      }
    });
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
                         exp.expense_type?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || exp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const loadInsights = async () => {
    setLoadingInsights(true);
    try {
      const result = await base44.functions.invoke('generateExpenseInsights', {
        timeframe: 'all'
      });
      setInsights(result.data);
    } catch (err) {
      console.error('Insights error:', err);
    }
    setLoadingInsights(false);
  };

  const stats = {
    pending: expenses.filter(e => e.status === 'pending').length,
    approved: expenses.filter(e => e.status === 'approved').length,
    rejected: expenses.filter(e => e.status === 'rejected').length,
    totalPending: expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + (e.amount || 0), 0),
    highRisk: expenses.filter(e => (e.fraud_score || 0) > 60).length
  };

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Expense Approvals</h2>
          <p className="text-slate-500">Review and approve employee expense claims</p>
        </div>
        <Button onClick={() => { setShowInsights(true); loadInsights(); }} variant="outline">
          <TrendingUp className="w-4 h-4 mr-2" />
          AI Insights
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-amber-700">{stats.pending}</p>
            <p className="text-sm text-amber-600">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-green-700">{stats.approved}</p>
            <p className="text-sm text-green-600">Approved</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-red-50">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-red-700">{stats.rejected}</p>
            <p className="text-sm text-red-600">Rejected</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-indigo-50">
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-indigo-700">₹{stats.totalPending.toLocaleString()}</p>
            <p className="text-sm text-indigo-600">Pending Amount</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-700" />
              <p className="text-3xl font-bold text-orange-700">{stats.highRisk}</p>
            </div>
            <p className="text-sm text-orange-600">High Risk (AI)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search by employee or type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expense List */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Employee</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Type</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Date</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Amount</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-800">{expense.employee_name}</p>
                        <p className="text-sm text-slate-500 capitalize">{expense.department}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="capitalize text-slate-600">{expense.expense_type?.replace('_', ' ')}</span>
                        {expense.ai_category && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                            <Brain className="w-3 h-3 mr-1" />
                            {expense.ai_confidence}%
                          </Badge>
                        )}
                        {(expense.fraud_score > 60 || expense.duplicate_check?.is_duplicate) && (
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{format(new Date(expense.date), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">₹{expense.amount?.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <Badge className={statusColors[expense.status]}>
                        {expense.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {expense.receipt_url && (
                          <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                        {expense.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApprove(expense)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => { setSelectedExpense(expense); setShowRejectDialog(true); }}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights Dialog */}
      <Dialog open={showInsights} onOpenChange={setShowInsights}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Company-Wide Expense Insights
            </DialogTitle>
          </DialogHeader>
          {loadingInsights ? (
            <div className="flex items-center justify-center py-12">
              <Brain className="w-8 h-8 animate-pulse text-indigo-600" />
            </div>
          ) : insights ? (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-0 bg-indigo-50">
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold text-indigo-700">₹{insights.statistics.total_amount.toLocaleString()}</p>
                    <p className="text-sm text-indigo-600">Total Expenses</p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-orange-50">
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold text-orange-700">{insights.statistics.high_risk_count}</p>
                    <p className="text-sm text-orange-600">High Risk</p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-red-50">
                  <CardContent className="pt-4">
                    <p className="text-2xl font-bold text-red-700">{insights.statistics.duplicate_count}</p>
                    <p className="text-sm text-red-600">Duplicates</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-3">AI Insights</h3>
                <div className="space-y-2">
                  {insights.insights.key_insights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                      <Brain className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-700">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="border-0 bg-slate-50">
                  <CardContent className="pt-4">
                    <p className="text-sm text-slate-500">Budget Status</p>
                    <p className="text-lg font-semibold text-slate-800 capitalize mt-1">
                      {insights.insights.budget_status.replace('_', ' ')}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-slate-50">
                  <CardContent className="pt-4">
                    <p className="text-sm text-slate-500">Risk Level</p>
                    <Badge className={`mt-1 ${
                      insights.insights.risk_level === 'low' ? 'bg-green-100 text-green-700' :
                      insights.insights.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {insights.insights.risk_level}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

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
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-600">
              Are you sure you want to reject this expense claim of ₹{selectedExpense?.amount?.toLocaleString()}?
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for rejection</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter the reason for rejection"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
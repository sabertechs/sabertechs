import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, Filter, CheckCircle, XCircle, Eye, Receipt, ExternalLink } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: async (_, { id, data }) => {
      queryClient.invalidateQueries(['expenses']);
      
      // Create in-app notification
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

  const stats = {
    pending: expenses.filter(e => e.status === 'pending').length,
    approved: expenses.filter(e => e.status === 'approved').length,
    rejected: expenses.filter(e => e.status === 'rejected').length,
    totalPending: expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + (e.amount || 0), 0)
  };

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700'
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Expense Approvals</h2>
        <p className="text-slate-500">Review and approve employee expense claims</p>
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
                    <td className="px-6 py-4 capitalize text-slate-600">{expense.expense_type?.replace('_', ' ')}</td>
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
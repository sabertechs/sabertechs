import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Receipt, Upload, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      setShowAddDialog(false);
      resetForm();
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
        <Button onClick={() => { resetForm(); setShowAddDialog(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Submit Expense
        </Button>
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
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${statusColors[expense.status]}`}>
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 capitalize">{expense.expense_type?.replace('_', ' ')}</p>
                        <p className="text-sm text-slate-500">{format(new Date(expense.date), 'MMM d, yyyy')}</p>
                        {expense.description && (
                          <p className="text-sm text-slate-400 mt-1">{expense.description}</p>
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

      {/* Add Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Expense</DialogTitle>
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
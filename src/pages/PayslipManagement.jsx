import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Search, Download, Send, Edit, Trash2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function PayslipManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [formData, setFormData] = useState({
    employee_email: "",
    month: MONTHS[new Date().getMonth()],
    year: new Date().getFullYear(),
    basic_salary: "",
    hra: "",
    da: "",
    other_allowances: "",
    pf_deduction: "",
    tax_deduction: "",
    other_deductions: "",
    payment_status: "pending"
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.filter({ status: 'active' }),
  });

  const { data: payslips = [] } = useQuery({
    queryKey: ['payslips'],
    queryFn: () => base44.entities.Payslip.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Payslip.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['payslips']);
      setShowCreateDialog(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Payslip.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['payslips']);
      setShowCreateDialog(false);
      setSelectedPayslip(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Payslip.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['payslips'])
  });

  const resetForm = () => {
    setFormData({
      employee_email: "",
      month: MONTHS[new Date().getMonth()],
      year: new Date().getFullYear(),
      basic_salary: "",
      hra: "",
      da: "",
      other_allowances: "",
      pf_deduction: "",
      tax_deduction: "",
      other_deductions: "",
      payment_status: "pending"
    });
  };

  const handleEmployeeSelect = (email) => {
    const emp = employees.find(e => e.email === email);
    if (emp?.salary) {
      const basic = emp.salary * 0.5;
      const hra = emp.salary * 0.2;
      const da = emp.salary * 0.15;
      const other = emp.salary * 0.15;
      setFormData({
        ...formData,
        employee_email: email,
        basic_salary: basic,
        hra: hra,
        da: da,
        other_allowances: other,
        pf_deduction: basic * 0.12,
        tax_deduction: emp.salary > 50000 ? emp.salary * 0.1 : 0
      });
    } else {
      setFormData({ ...formData, employee_email: email });
    }
  };

  const calculateTotals = () => {
    const gross = (parseFloat(formData.basic_salary) || 0) + 
                  (parseFloat(formData.hra) || 0) + 
                  (parseFloat(formData.da) || 0) + 
                  (parseFloat(formData.other_allowances) || 0);
    const deductions = (parseFloat(formData.pf_deduction) || 0) + 
                       (parseFloat(formData.tax_deduction) || 0) + 
                       (parseFloat(formData.other_deductions) || 0);
    return { gross, deductions, net: gross - deductions };
  };

  const handleCreate = () => {
    const emp = employees.find(e => e.email === formData.employee_email);
    const totals = calculateTotals();
    createMutation.mutate({
      ...formData,
      employee_id: emp?.employee_id,
      employee_name: emp?.full_name,
      basic_salary: parseFloat(formData.basic_salary) || 0,
      hra: parseFloat(formData.hra) || 0,
      da: parseFloat(formData.da) || 0,
      other_allowances: parseFloat(formData.other_allowances) || 0,
      pf_deduction: parseFloat(formData.pf_deduction) || 0,
      tax_deduction: parseFloat(formData.tax_deduction) || 0,
      other_deductions: parseFloat(formData.other_deductions) || 0,
      gross_salary: totals.gross,
      net_salary: totals.net
    });
  };

  const handleEdit = (payslip) => {
    setSelectedPayslip(payslip);
    setFormData({
      employee_email: payslip.employee_email,
      month: payslip.month,
      year: payslip.year,
      basic_salary: payslip.basic_salary || "",
      hra: payslip.hra || "",
      da: payslip.da || "",
      other_allowances: payslip.other_allowances || "",
      pf_deduction: payslip.pf_deduction || "",
      tax_deduction: payslip.tax_deduction || "",
      other_deductions: payslip.other_deductions || "",
      payment_status: payslip.payment_status
    });
    setShowCreateDialog(true);
  };

  const sendPayslipNotification = async (payslip) => {
    await base44.entities.Notification.create({
      recipient_email: payslip.employee_email,
      title: 'Payslip Available',
      message: `Your payslip for ${payslip.month} ${payslip.year} is now available. Gross: ₹${payslip.gross_salary?.toLocaleString()}, Net: ₹${payslip.net_salary?.toLocaleString()}`,
      type: 'info'
    });
  };

  const filteredPayslips = payslips.filter(p => {
    const matchesSearch = p.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
                         p.employee_email?.toLowerCase().includes(search.toLowerCase());
    const matchesMonth = monthFilter === "all" || p.month === monthFilter;
    return matchesSearch && matchesMonth;
  });

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Payslip Management</h2>
          <p className="text-slate-500">Generate and manage employee payslips</p>
        </div>
        <Button onClick={() => { resetForm(); setSelectedPayslip(null); setShowCreateDialog(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Generate Payslip
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {MONTHS.map(month => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payslips List */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Employee</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Period</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Gross</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Net</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayslips.map((payslip) => (
                  <tr key={payslip.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-800">{payslip.employee_name}</p>
                        <p className="text-sm text-slate-500">{payslip.employee_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{payslip.month} {payslip.year}</td>
                    <td className="px-6 py-4 text-slate-800">₹{payslip.gross_salary?.toLocaleString()}</td>
                    <td className="px-6 py-4 font-semibold text-indigo-600">₹{payslip.net_salary?.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <Badge className={payslip.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                        {payslip.payment_status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => sendPayslipNotification(payslip)}>
                          <Send className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(payslip)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(payslip.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPayslip ? 'Edit Payslip' : 'Generate Payslip'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={formData.employee_email} onValueChange={handleEmployeeSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.email} value={emp.email}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={formData.month} onValueChange={(v) => setFormData({ ...formData, month: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(month => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-4">
              <h4 className="font-semibold text-green-800 mb-3">Earnings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Basic Salary</Label>
                  <Input
                    type="number"
                    value={formData.basic_salary}
                    onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>HRA</Label>
                  <Input
                    type="number"
                    value={formData.hra}
                    onChange={(e) => setFormData({ ...formData, hra: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>DA</Label>
                  <Input
                    type="number"
                    value={formData.da}
                    onChange={(e) => setFormData({ ...formData, da: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Other Allowances</Label>
                  <Input
                    type="number"
                    value={formData.other_allowances}
                    onChange={(e) => setFormData({ ...formData, other_allowances: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-xl p-4">
              <h4 className="font-semibold text-red-800 mb-3">Deductions</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>PF</Label>
                  <Input
                    type="number"
                    value={formData.pf_deduction}
                    onChange={(e) => setFormData({ ...formData, pf_deduction: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax</Label>
                  <Input
                    type="number"
                    value={formData.tax_deduction}
                    onChange={(e) => setFormData({ ...formData, tax_deduction: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Other</Label>
                  <Input
                    type="number"
                    value={formData.other_deductions}
                    onChange={(e) => setFormData({ ...formData, other_deductions: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 rounded-xl p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-slate-500">Gross</p>
                  <p className="text-xl font-bold text-green-600">₹{totals.gross.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Deductions</p>
                  <p className="text-xl font-bold text-red-600">₹{totals.deductions.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Net</p>
                  <p className="text-xl font-bold text-indigo-600">₹{totals.net.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={formData.payment_status} onValueChange={(v) => setFormData({ ...formData, payment_status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleCreate}
              disabled={!formData.employee_email}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {selectedPayslip ? 'Update' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
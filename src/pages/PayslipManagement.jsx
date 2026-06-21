import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Search, Download, Send, Edit, Trash2, FileText, Zap, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
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
  const [generatingBulk, setGeneratingBulk] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkMonth, setBulkMonth] = useState(new Date().getMonth() + 1);
  const [bulkYear, setBulkYear] = useState(new Date().getFullYear());
  const [bulkResults, setBulkResults] = useState(null);
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
    queryFn: async () => {
      const allEmployees = await base44.entities.Employee.filter({ status: 'active' });
      // Only show permanent employees in payslip generation
      return allEmployees.filter(emp => emp.role !== 'freelancer' && emp.employment_type === 'permanent');
    },
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

  const generateBulkPayslips = async () => {
    setGeneratingBulk(true);
    try {
      const response = await base44.functions.invoke('generateMonthlyPayslips', {
        month: bulkMonth,
        year: bulkYear
      });

      if (response.data.success) {
        setBulkResults(response.data);
        queryClient.invalidateQueries(['payslips']);
        toast.success(`Generated ${response.data.summary.generated} payslips`);
      } else {
        toast.error('Failed to generate payslips');
      }
    } catch (error) {
      console.error('Bulk generation error:', error);
      toast.error('Failed to generate payslips');
    }
    setGeneratingBulk(false);
  };

  const downloadPayrollData = () => {
    if (filteredPayslips.length === 0) {
      toast.error('No payslips to download');
      return;
    }

    // Create CSV content
    const headers = ['Employee ID', 'Employee Name', 'Email', 'Month', 'Year', 'Basic Salary', 'HRA', 'DA', 'Other Allowances', 'Gross Salary', 'PF Deduction', 'Tax Deduction', 'Other Deductions', 'Total Deductions', 'Net Salary', 'Payment Status'];
    
    const rows = filteredPayslips.map(p => [
      p.employee_id || '',
      p.employee_name || '',
      p.employee_email || '',
      p.month || '',
      p.year || '',
      p.basic_salary || 0,
      p.hra || 0,
      p.da || 0,
      p.other_allowances || 0,
      p.gross_salary || 0,
      p.pf_deduction || 0,
      p.tax_deduction || 0,
      p.other_deductions || 0,
      ((p.pf_deduction || 0) + (p.tax_deduction || 0) + (p.other_deductions || 0)),
      p.net_salary || 0,
      p.payment_status || 'pending'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payroll_${monthFilter !== 'all' ? monthFilter : 'all'}_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Payroll data downloaded');
  };

  const downloadPayslipPDF = (payslip) => {
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthName = monthNames[parseInt(payslip.month, 10) - 1] || payslip.month;
    const { employee_name, employee_email, employee_id, year,
      basic_salary = 0, hra = 0, da = 0, other_allowances = 0,
      gross_salary = 0, pf_deduction = 0, tax_deduction = 0, other_deductions = 0,
      net_salary = 0, payment_status = 'pending' } = payslip;
    const totalDeductions = pf_deduction + tax_deduction + other_deductions;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = 210; const margin = 15; const col1 = margin; const col2 = pageW / 2 + 5;
    let y = 0;

    doc.setFillColor(79, 70, 229); doc.rect(0, 0, pageW, 38, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('SALARY SLIP', pageW / 2, 16, { align: 'center' });
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text(`${monthName} ${year}`, pageW / 2, 25, { align: 'center' });
    doc.setFontSize(9); doc.text('SaberTechs', pageW / 2, 33, { align: 'center' });

    y = 46;
    doc.setFillColor(245, 247, 250); doc.roundedRect(margin, y, pageW - margin * 2, 30, 3, 3, 'F');
    doc.setTextColor(30, 30, 30); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Employee Details', col1 + 4, y + 8);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(`Name: ${employee_name || '-'}`, col1 + 4, y + 16);
    doc.text(`Email: ${employee_email}`, col1 + 4, y + 22);
    if (employee_id) doc.text(`Employee ID: ${employee_id}`, col2, y + 16);
    doc.text(`Pay Period: ${monthName} ${year}`, col2, y + 22);

    y = 84;
    doc.setFillColor(79, 70, 229); doc.rect(margin, y, pageW - margin * 2, 8, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('EARNINGS', col1 + 4, y + 5.5);
    doc.text('Amount (₹)', pageW - margin - 4, y + 5.5, { align: 'right' });

    y += 10; doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    [['Basic Salary', basic_salary], ['House Rent Allowance (HRA)', hra], ['Dearness Allowance (DA)', da], ['Other Allowances', other_allowances]].forEach(([label, amount], i) => {
      if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(margin, y - 4, pageW - margin * 2, 8, 'F'); }
      doc.text(label, col1 + 4, y + 0.5);
      doc.text(`₹ ${Number(amount).toLocaleString('en-IN')}`, pageW - margin - 4, y + 0.5, { align: 'right' });
      y += 8;
    });

    doc.setFillColor(224, 231, 255); doc.rect(margin, y, pageW - margin * 2, 9, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(55, 48, 163);
    doc.text('Gross Salary', col1 + 4, y + 6);
    doc.text(`₹ ${Number(gross_salary).toLocaleString('en-IN')}`, pageW - margin - 4, y + 6, { align: 'right' });

    y += 16;
    doc.setFillColor(220, 38, 38); doc.rect(margin, y, pageW - margin * 2, 8, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('DEDUCTIONS', col1 + 4, y + 5.5);
    doc.text('Amount (₹)', pageW - margin - 4, y + 5.5, { align: 'right' });

    y += 10; doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    [['Provident Fund (PF)', pf_deduction], ['Tax Deduction (TDS + PT)', tax_deduction], ['ESI / Other Deductions', other_deductions]].forEach(([label, amount], i) => {
      if (i % 2 === 0) { doc.setFillColor(255, 249, 249); doc.rect(margin, y - 4, pageW - margin * 2, 8, 'F'); }
      doc.text(label, col1 + 4, y + 0.5);
      doc.text(`₹ ${Number(amount).toLocaleString('en-IN')}`, pageW - margin - 4, y + 0.5, { align: 'right' });
      y += 8;
    });

    doc.setFillColor(254, 226, 226); doc.rect(margin, y, pageW - margin * 2, 9, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(153, 27, 27);
    doc.text('Total Deductions', col1 + 4, y + 6);
    doc.text(`₹ ${Number(totalDeductions).toLocaleString('en-IN')}`, pageW - margin - 4, y + 6, { align: 'right' });

    y += 16;
    doc.setFillColor(22, 163, 74); doc.rect(margin, y, pageW - margin * 2, 14, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('NET PAY', col1 + 6, y + 9);
    doc.text(`₹ ${Number(net_salary).toLocaleString('en-IN')}`, pageW - margin - 4, y + 9, { align: 'right' });

    y += 22;
    doc.setFontSize(8); doc.setTextColor(120, 120, 120); doc.setFont('helvetica', 'italic');
    doc.text('This is a system-generated payslip and does not require a signature.', pageW / 2, y, { align: 'center' });

    doc.save(`Payslip_${employee_name?.replace(/\s+/g, '_')}_${monthName}_${year}.pdf`);
  };

  const sendPayslipNotification = async (payslip) => {
    // Check if notification already sent for this payslip period to avoid duplicates
    const existing = await base44.entities.Notification.filter({
      recipient_email: payslip.employee_email,
      title: 'Payslip Available',
    });
    const alreadySent = existing.some(n => n.message?.includes(`${payslip.month} ${payslip.year}`));
    if (alreadySent) {
      toast.info('Notification already sent for this payslip');
      return;
    }

    // Send in-app notification only (email/PDF is handled by the automation on payslip create)
    await base44.entities.Notification.create({
      recipient_email: payslip.employee_email,
      title: 'Payslip Available',
      message: `Your payslip for ${payslip.month} ${payslip.year} is now available. Gross: ₹${payslip.gross_salary?.toLocaleString()}, Net: ₹${payslip.net_salary?.toLocaleString()}`,
      type: 'info'
    });

    toast.success(`Notification sent to ${payslip.employee_name}`);
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
        <div className="flex gap-2">
          <Button onClick={downloadPayrollData} variant="outline" className="border-green-600 text-green-700 hover:bg-green-50">
            <Download className="w-4 h-4 mr-2" />
            Download Payroll
          </Button>
          <Button onClick={() => setShowBulkDialog(true)} className="bg-green-600 hover:bg-green-700">
            <Zap className="w-4 h-4 mr-2" />
            Auto Generate (Month)
          </Button>
          <Button onClick={() => { resetForm(); setSelectedPayslip(null); setShowCreateDialog(true); }} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Manual Generate
          </Button>
        </div>
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
                      <Button size="sm" variant="outline" title="Download Payslip PDF" onClick={() => downloadPayslipPDF(payslip)}>
                        <Download className="w-4 h-4 text-indigo-600" />
                      </Button>
                      <Button size="sm" variant="outline" title="Send Notification" onClick={() => sendPayslipNotification(payslip)}>
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

      {/* Bulk Generate Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-600" />
              Auto Generate Monthly Payslips
            </DialogTitle>
          </DialogHeader>
          
          {!bulkResults ? (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold mb-2">Auto-generation will:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Generate payslips for all active permanent employees</li>
                      <li>Calculate salary based on attendance and leaves</li>
                      <li>Pro-rate salary for working days vs total days</li>
                      <li><strong>Skip employees with incomplete attendance</strong></li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select value={bulkMonth.toString()} onValueChange={(v) => setBulkMonth(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month, idx) => (
                        <SelectItem key={month} value={(idx + 1).toString()}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={bulkYear}
                    onChange={(e) => setBulkYear(parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-6 text-center">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-700">{bulkResults.summary.generated}</p>
                    <p className="text-sm text-green-600">Generated</p>
                  </CardContent>
                </Card>
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-6 text-center">
                    <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-amber-700">{bulkResults.summary.incomplete_attendance}</p>
                    <p className="text-sm text-amber-600">Incomplete Attendance</p>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6 text-center">
                    <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-700">{bulkResults.summary.failed}</p>
                    <p className="text-sm text-red-600">Failed</p>
                  </CardContent>
                </Card>
              </div>

              {/* Incomplete Attendance Details */}
              {bulkResults.details.incomplete_attendance.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-amber-700">Employees with Incomplete Attendance:</h4>
                  <div className="max-h-48 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-amber-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-amber-700">Employee</th>
                          <th className="text-right px-3 py-2 text-amber-700">Marked</th>
                          <th className="text-right px-3 py-2 text-amber-700">Missing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkResults.details.incomplete_attendance.map((emp, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-3 py-2">{emp.employee_name}</td>
                            <td className="text-right px-3 py-2">{emp.marked_days}/{emp.total_days}</td>
                            <td className="text-right px-3 py-2 text-red-600">{emp.missing_days} days</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Failed Details */}
              {bulkResults.details.failed.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-red-700">Failed:</h4>
                  <div className="max-h-32 overflow-y-auto border rounded-lg">
                    {bulkResults.details.failed.map((emp, idx) => (
                      <div key={idx} className="px-3 py-2 text-sm border-b">
                        <span className="font-medium">{emp.employee_name}</span>: {emp.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowBulkDialog(false);
                setBulkResults(null);
              }}
            >
              Close
            </Button>
            {!bulkResults && (
              <Button 
                onClick={generateBulkPayslips}
                disabled={generatingBulk}
                className="bg-green-600 hover:bg-green-700"
              >
                {generatingBulk ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Generate Payslips
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
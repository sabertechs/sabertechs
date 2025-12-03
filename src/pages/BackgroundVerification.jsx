import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, CheckCircle, XCircle, Download, FileText, Loader2, Eye, ShieldCheck } from "lucide-react";
import { getBGVStatusEmail } from "@/components/email/EmailTemplate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function BackgroundVerification() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, action: '' });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setSelectedEmployees([]);
    }
  });

  const handleApprove = async (employeeIds) => {
    const total = employeeIds.length;
    if (total > 1) {
      setBulkProcessing(true);
      setBulkProgress({ current: 0, total, action: 'Approving' });
    }
    
    for (let i = 0; i < employeeIds.length; i++) {
      const id = employeeIds[i];
      await base44.entities.Employee.update(id, { 
        bg_verification_status: 'approved',
        status: 'active'
      });
      
      const emp = employees.find(e => e.id === id);
      if (emp) {
        await base44.entities.Notification.create({
          recipient_email: emp.email,
          title: 'Background Verification Approved',
          message: 'Your background verification has been completed and approved. You are now an active employee.',
          type: 'success'
        });
      }
      
      if (total > 1) {
        setBulkProgress({ current: i + 1, total, action: 'Approving' });
      }
    }
    
    setBulkProcessing(false);
    setBulkProgress({ current: 0, total: 0, action: '' });
    queryClient.invalidateQueries(['employees']);
    setSelectedEmployees([]);
  };

  const handleReject = async (employeeIds) => {
    const total = employeeIds.length;
    if (total > 1) {
      setBulkProcessing(true);
      setBulkProgress({ current: 0, total, action: 'Rejecting' });
    }
    
    for (let i = 0; i < employeeIds.length; i++) {
      const id = employeeIds[i];
      await base44.entities.Employee.update(id, { bg_verification_status: 'rejected' });
      
      const emp = employees.find(e => e.id === id);
      if (emp) {
        await base44.entities.Notification.create({
          recipient_email: emp.email,
          title: 'Background Verification Update',
          message: 'Your background verification could not be approved. Please contact HR for more details.',
          type: 'alert'
        });
      }
      
      if (total > 1) {
        setBulkProgress({ current: i + 1, total, action: 'Rejecting' });
      }
    }
    
    setBulkProcessing(false);
    setBulkProgress({ current: 0, total: 0, action: '' });
    queryClient.invalidateQueries(['employees']);
    setSelectedEmployees([]);
  };

  const generateVerificationPDF = async (employee) => {
    setGeneratingPdf(true);
    
    const htmlContent = `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #333; }
          .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
          .section { margin: 20px 0; }
          .section-title { font-size: 16px; font-weight: bold; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
          .field { display: flex; margin: 8px 0; }
          .label { width: 150px; font-weight: bold; color: #555; }
          .value { flex: 1; color: #333; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          .stamp { margin-top: 30px; padding: 15px; border: 2px solid green; display: inline-block; }
          .approved { color: green; font-weight: bold; font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">BACKGROUND VERIFICATION CERTIFICATE</div>
          <div class="subtitle">Employee Verification Document</div>
        </div>
        
        <div class="section">
          <div class="section-title">Personal Information</div>
          <div class="field"><span class="label">Name:</span><span class="value">${employee.full_name || 'N/A'}</span></div>
          <div class="field"><span class="label">Father's Name:</span><span class="value">${employee.father_name || 'N/A'}</span></div>
          <div class="field"><span class="label">Date of Birth:</span><span class="value">${employee.date_of_birth ? format(new Date(employee.date_of_birth), 'dd/MM/yyyy') : 'N/A'}</span></div>
          <div class="field"><span class="label">Gender:</span><span class="value">${employee.gender ? employee.gender.charAt(0).toUpperCase() + employee.gender.slice(1) : 'N/A'}</span></div>
        </div>
        
        <div class="section">
          <div class="section-title">Identity Documents</div>
          <div class="field"><span class="label">Aadhaar Number:</span><span class="value">${employee.aadhaar_number || 'N/A'}</span></div>
          <div class="field"><span class="label">PAN Number:</span><span class="value">${employee.pan_number || 'N/A'}</span></div>
        </div>
        
        <div class="section">
          <div class="section-title">Address</div>
          <div class="field"><span class="label">Address:</span><span class="value">${employee.address || 'N/A'}</span></div>
          <div class="field"><span class="label">City:</span><span class="value">${employee.city || 'N/A'}</span></div>
          <div class="field"><span class="label">State:</span><span class="value">${employee.state || 'N/A'}</span></div>
          <div class="field"><span class="label">Pincode:</span><span class="value">${employee.pincode || 'N/A'}</span></div>
        </div>
        
        <div class="section">
          <div class="section-title">Employment Details</div>
          <div class="field"><span class="label">Employee ID:</span><span class="value">${employee.employee_id || 'N/A'}</span></div>
          <div class="field"><span class="label">Department:</span><span class="value">${employee.department ? employee.department.charAt(0).toUpperCase() + employee.department.slice(1) : 'N/A'}</span></div>
          <div class="field"><span class="label">Designation:</span><span class="value">${employee.designation || 'N/A'}</span></div>
          <div class="field"><span class="label">Date of Joining:</span><span class="value">${employee.date_of_joining ? format(new Date(employee.date_of_joining), 'dd/MM/yyyy') : 'N/A'}</span></div>
        </div>
        
        <div style="text-align: center; margin-top: 40px;">
          <div class="stamp">
            <span class="approved">✓ VERIFIED & APPROVED</span>
            <div style="margin-top: 10px; font-size: 12px;">Date: ${format(new Date(), 'dd/MM/yyyy')}</div>
          </div>
        </div>
        
        <div class="footer">
          <p>This is a computer-generated document.</p>
          <p>Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
        </div>
      </body>
      </html>
    `;
    
    // Create a blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BGV_${employee.full_name?.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setGeneratingPdf(false);
  };

  const toggleSelect = (id) => {
    setSelectedEmployees(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const pendingEmployees = filteredEmployees.filter(e => e.bg_verification_status === 'pending');
    if (selectedEmployees.length === pendingEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(pendingEmployees.map(e => e.id));
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                         emp.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || emp.bg_verification_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    pending: employees.filter(e => e.bg_verification_status === 'pending').length,
    approved: employees.filter(e => e.bg_verification_status === 'approved').length,
    rejected: employees.filter(e => e.bg_verification_status === 'rejected').length
  };

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Background Verification</h2>
          <p className="text-slate-500">Verify and approve employee backgrounds</p>
        </div>
        {selectedEmployees.length > 0 && !bulkProcessing && (
          <div className="flex gap-2">
            <Button 
              onClick={() => handleApprove(selectedEmployees)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve Selected ({selectedEmployees.length})
            </Button>
            <Button 
              variant="destructive"
              onClick={() => handleReject(selectedEmployees)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        )}
      </div>

      {/* Bulk Processing Progress */}
      {bulkProcessing && (
        <Card className="border-0 shadow-sm border-l-4 border-l-indigo-500">
          <CardContent className="py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                  <span className="font-medium text-slate-800">
                    {bulkProgress.action} BGV...
                  </span>
                </div>
                <span className="text-sm font-semibold text-indigo-600">
                  {bulkProgress.current} / {bulkProgress.total}
                </span>
              </div>
              <Progress 
                value={(bulkProgress.current / bulkProgress.total) * 100} 
                className="h-2"
              />
              <p className="text-xs text-slate-500">
                Please wait while processing. Do not close this page.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
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
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search employees..."
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

      {/* Employee List */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-4">
                    <Checkbox 
                      checked={selectedEmployees.length === filteredEmployees.filter(e => e.bg_verification_status === 'pending').length && filteredEmployees.filter(e => e.bg_verification_status === 'pending').length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Employee</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Aadhaar</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">PAN</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Documents</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      {emp.bg_verification_status === 'pending' && (
                        <Checkbox 
                          checked={selectedEmployees.includes(emp.id)}
                          onCheckedChange={() => toggleSelect(emp.id)}
                        />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {emp.profile_photo ? (
                          <img src={emp.profile_photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {emp.full_name?.[0] || 'E'}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-800">{emp.full_name}</p>
                          <p className="text-sm text-slate-500">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{emp.aadhaar_number || '-'}</td>
                    <td className="px-6 py-4 text-slate-600">{emp.pan_number || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {emp.aadhaar_document && (
                          <a href={emp.aadhaar_document} target="_blank" rel="noopener noreferrer">
                            <Badge variant="outline" className="cursor-pointer">Aadhaar</Badge>
                          </a>
                        )}
                        {emp.pan_document && (
                          <a href={emp.pan_document} target="_blank" rel="noopener noreferrer">
                            <Badge variant="outline" className="cursor-pointer">PAN</Badge>
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={statusColors[emp.bg_verification_status]}>
                        {emp.bg_verification_status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setSelectedEmployee(emp); setShowDetailsDialog(true); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {emp.bg_verification_status === 'approved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateVerificationPDF(emp)}
                            disabled={generatingPdf}
                          >
                            {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          </Button>
                        )}
                        {emp.bg_verification_status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApprove([emp.id])}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject([emp.id])}
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

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Background Verification Details
            </DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                {selectedEmployee.profile_photo ? (
                  <img src={selectedEmployee.profile_photo} alt="" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                    {selectedEmployee.full_name?.[0] || 'E'}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedEmployee.full_name}</h3>
                  <p className="text-slate-500">{selectedEmployee.email}</p>
                  <Badge className={statusColors[selectedEmployee.bg_verification_status] + ' mt-2'}>
                    {selectedEmployee.bg_verification_status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Father's Name</p>
                  <p className="font-medium text-slate-800">{selectedEmployee.father_name || '-'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Date of Birth</p>
                  <p className="font-medium text-slate-800">
                    {selectedEmployee.date_of_birth ? format(new Date(selectedEmployee.date_of_birth), 'MMM d, yyyy') : '-'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Aadhaar Number</p>
                  <p className="font-medium text-slate-800">{selectedEmployee.aadhaar_number || '-'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">PAN Number</p>
                  <p className="font-medium text-slate-800">{selectedEmployee.pan_number || '-'}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500 mb-1">Address</p>
                <p className="font-medium text-slate-800">
                  {selectedEmployee.address ? 
                    `${selectedEmployee.address}, ${selectedEmployee.city || ''}, ${selectedEmployee.state || ''} - ${selectedEmployee.pincode || ''}` 
                    : '-'}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">Uploaded Documents</p>
                <div className="flex flex-wrap gap-2">
                  {selectedEmployee.aadhaar_document && (
                    <a href={selectedEmployee.aadhaar_document} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline">
                        <FileText className="w-4 h-4 mr-2" /> Aadhaar Document
                      </Button>
                    </a>
                  )}
                  {selectedEmployee.pan_document && (
                    <a href={selectedEmployee.pan_document} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline">
                        <FileText className="w-4 h-4 mr-2" /> PAN Document
                      </Button>
                    </a>
                  )}
                  {selectedEmployee.education_certificates?.map((cert, idx) => (
                    <a key={idx} href={cert} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline">
                        <FileText className="w-4 h-4 mr-2" /> Certificate {idx + 1}
                      </Button>
                    </a>
                  ))}
                </div>
              </div>

              {selectedEmployee.bg_verification_status === 'approved' && (
                <Button 
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => generateVerificationPDF(selectedEmployee)}
                  disabled={generatingPdf}
                >
                  {generatingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Download Verification Certificate
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
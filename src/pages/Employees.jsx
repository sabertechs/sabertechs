import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  FileText,
  ShieldCheck,
  Loader2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

export default function Employees() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bgvFilter, setBgvFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    father_name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    date_of_joining: "",
    salary: "",
    status: "active",
    role: "employee"
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date'),
  });

  const { data: offerLetters = [] } = useQuery({
    queryKey: ['offerLetters'],
    queryFn: () => base44.entities.OfferLetter.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setShowAddDialog(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['employees']);
      setShowAddDialog(false);
      setSelectedEmployee(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['employees'])
  });

  const resetForm = () => {
    setFormData({
      full_name: "",
      father_name: "",
      email: "",
      phone: "",
      department: "",
      designation: "",
      date_of_joining: "",
      salary: "",
      status: "active",
      role: "employee"
    });
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      full_name: employee.full_name || "",
      father_name: employee.father_name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      department: employee.department || "",
      designation: employee.designation || "",
      date_of_joining: employee.date_of_joining || "",
      salary: employee.salary || "",
      status: employee.status || "active",
      role: employee.role || "employee"
    });
    setShowAddDialog(true);
  };

  const handleSubmit = () => {
    if (selectedEmployee) {
      updateMutation.mutate({ id: selectedEmployee.id, data: formData });
    } else {
      createMutation.mutate({ ...formData, bg_verification_status: "pending" });
    }
  };

  const getOfferLetter = (email) => offerLetters.find(ol => ol.employee_email === email);

  const generateOfferLetterPDF = (emp) => {
    const offerLetter = getOfferLetter(emp.email);
    const fileName = `OfferLetter_${emp.full_name?.replace(/\s+/g, '_')}_${emp.phone || 'NA'}.html`;
    const headerImg = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/9fddeba2e_image001.jpg";
    const footerImg = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/ab1b508e1_image002.jpg";
    
    const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Appointment Letter - ${emp.full_name}</title>
  <style>
    @page { margin: 0; }
    body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 0; font-size: 12pt; line-height: 1.5; }
    .header { width: 100%; text-align: center; }
    .header img { width: 100%; max-height: 120px; object-fit: contain; }
    .footer { width: 100%; position: fixed; bottom: 0; text-align: center; }
    .footer img { width: 100%; max-height: 80px; object-fit: contain; }
    .content { padding: 20px 60px; min-height: calc(100vh - 250px); }
    .date { text-align: right; margin-bottom: 20px; }
    .subject { text-align: center; font-weight: bold; text-decoration: underline; margin: 20px 0; }
    .salutation { margin: 20px 0; }
    p { text-align: justify; margin: 10px 0; }
    .terms { margin: 20px 0; }
    .terms ol { margin-left: 20px; }
    .terms li { margin: 8px 0; text-align: justify; }
    .signature { margin-top: 40px; }
    .employee-name { font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <img src="${headerImg}" alt="Company Header" />
  </div>
  
  <div class="content">
    <p class="date">Date: ${format(new Date(), 'MMMM d, yyyy')}</p>
    
    <p class="subject">APPOINTMENT LETTER</p>
    
    <p class="salutation">Dear <span class="employee-name">${emp.full_name}</span>,</p>
    
    <p>With reference to your application and subsequent interview, we are pleased to appoint you as <strong>${emp.designation || offerLetter?.designation || 'Employee'}</strong> in our organization with effect from <strong>${emp.date_of_joining ? format(new Date(emp.date_of_joining), 'MMMM d, yyyy') : 'the date of joining'}</strong>.</p>
    
    <p>Your appointment is subject to the following terms and conditions:</p>
    
    <div class="terms">
      <ol>
        <li><strong>Designation:</strong> You will be designated as ${emp.designation || offerLetter?.designation || 'Employee'} in the ${emp.department || offerLetter?.department || 'Company'}.</li>
        <li><strong>Salary:</strong> Your gross salary will be ₹${(emp.salary || offerLetter?.salary || 0).toLocaleString()} per month. The salary structure and other benefits will be as per company policy.</li>
        <li><strong>Probation Period:</strong> You will be on probation for a period of six months from the date of joining. During this period, either party can terminate the employment by giving 15 days' notice or salary in lieu thereof.</li>
        <li><strong>Working Hours:</strong> You will be required to work as per the company's standard working hours and follow all rules and regulations of the company.</li>
        <li><strong>Confidentiality:</strong> You shall maintain strict confidentiality regarding all company matters, trade secrets, and proprietary information both during and after your employment.</li>
        <li><strong>Notice Period:</strong> After confirmation, either party may terminate the employment by giving one month's notice or salary in lieu thereof.</li>
        <li><strong>Other Terms:</strong> You will be governed by all other terms and conditions as applicable to employees of your grade as per company policy from time to time.</li>
      </ol>
    </div>
    
    <p>We are confident that you will contribute positively to the growth of the organization. Please sign the duplicate copy of this letter as a token of your acceptance of the above terms and conditions.</p>
    
    <p>We welcome you to our organization and wish you a successful career with us.</p>
    
    <div class="signature">
      <p>Yours sincerely,</p>
      <p><strong>For Saber Technologies Pvt. Ltd.</strong></p>
      <br/><br/>
      <p>Authorized Signatory</p>
    </div>
  </div>
  
  <div class="footer">
    <img src="${footerImg}" alt="Company Footer" />
  </div>
</body>
</html>`;
    
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateBGVPDF = (emp) => {
    const fileName = `BGV_${emp.full_name?.replace(/\s+/g, '_')}_${emp.phone || 'NA'}.html`;
    
    const content = `
<!DOCTYPE html>
<html>
<head>
  <title>Background Verification - ${emp.full_name}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #4F46E5; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #4F46E5; }
    .title { font-size: 20px; margin-top: 20px; }
    .status { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 20px 0; }
    .status.approved { background: #dcfce7; color: #166534; }
    .status.pending { background: #fef3c7; color: #92400e; }
    .status.rejected { background: #fee2e2; color: #991b1b; }
    .details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; margin: 10px 0; }
    .detail-label { font-weight: bold; width: 200px; }
    .section { margin: 30px 0; }
    .section-title { font-size: 16px; font-weight: bold; color: #4F46E5; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 15px; }
    .signature { margin-top: 60px; }
    .date { color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">HRMS Portal</div>
    <div class="title">BACKGROUND VERIFICATION CERTIFICATE</div>
  </div>
  
  <p class="date">Date: ${format(new Date(), 'MMMM d, yyyy')}</p>
  
  <div class="status ${emp.bg_verification_status || 'pending'}">
    Status: ${(emp.bg_verification_status || 'pending').toUpperCase()}
  </div>
  
  <div class="section">
    <div class="section-title">Personal Information</div>
    <div class="details">
      <div class="detail-row">
        <span class="detail-label">Full Name:</span>
        <span>${emp.full_name}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Father's Name:</span>
        <span>${emp.father_name || 'N/A'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Email:</span>
        <span>${emp.email}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Phone:</span>
        <span>${emp.phone || 'N/A'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date of Birth:</span>
        <span>${emp.date_of_birth ? format(new Date(emp.date_of_birth), 'MMMM d, yyyy') : 'N/A'}</span>
      </div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Identity Documents</div>
    <div class="details">
      <div class="detail-row">
        <span class="detail-label">Aadhaar Number:</span>
        <span>${emp.aadhaar_number || 'N/A'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">PAN Number:</span>
        <span>${emp.pan_number || 'N/A'}</span>
      </div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Address Information</div>
    <div class="details">
      <div class="detail-row">
        <span class="detail-label">Address:</span>
        <span>${emp.address || 'N/A'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">City:</span>
        <span>${emp.city || 'N/A'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">State:</span>
        <span>${emp.state || 'N/A'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Pincode:</span>
        <span>${emp.pincode || 'N/A'}</span>
      </div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Employment Details</div>
    <div class="details">
      <div class="detail-row">
        <span class="detail-label">Department:</span>
        <span>${emp.department || 'N/A'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Designation:</span>
        <span>${emp.designation || 'N/A'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date of Joining:</span>
        <span>${emp.date_of_joining ? format(new Date(emp.date_of_joining), 'MMMM d, yyyy') : 'N/A'}</span>
      </div>
    </div>
  </div>
  
  <div class="signature">
    <p>Verified By,</p>
    <p><strong>HR Department</strong></p>
    <p>HRMS Portal</p>
  </div>
</body>
</html>`;
    
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadBulkZip = async () => {
    if (selectedEmployees.length === 0) return;
    
    setDownloading(true);
    
    // Since we can't use JSZip, we'll download files sequentially
    for (const empId of selectedEmployees) {
      const emp = employees.find(e => e.id === empId);
      if (emp) {
        generateOfferLetterPDF(emp);
        await new Promise(resolve => setTimeout(resolve, 500));
        generateBGVPDF(emp);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setDownloading(false);
    setSelectedEmployees([]);
  };

  const toggleSelectEmployee = (empId) => {
    setSelectedEmployees(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(e => e.id));
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                         emp.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || emp.status === statusFilter;
    const matchesBgv = bgvFilter === "all" || emp.bg_verification_status === bgvFilter;
    const matchesDept = departmentFilter === "all" || emp.department === departmentFilter;
    return matchesSearch && matchesStatus && matchesBgv && matchesDept;
  });

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  const bgvStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Employees</h2>
          <p className="text-slate-500">Manage your organization's employees</p>
        </div>
        <div className="flex gap-2">
          {selectedEmployees.length > 0 && (
            <Button 
              onClick={downloadBulkZip} 
              disabled={downloading}
              variant="outline"
              className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download Selected ({selectedEmployees.length})
            </Button>
          )}
          <Button onClick={() => { resetForm(); setSelectedEmployee(null); setShowAddDialog(true); }} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
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
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bgvFilter} onValueChange={setBgvFilter}>
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="BGV Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All BGV</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept} className="capitalize">{dept}</SelectItem>
                ))}
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
                  <th className="text-left px-4 py-4">
                    <Checkbox 
                      checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Employee</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Department</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">BGV Status</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Joined</th>
                  <th className="text-right px-4 py-4 text-sm font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <Checkbox 
                        checked={selectedEmployees.includes(emp.id)}
                        onCheckedChange={() => toggleSelectEmployee(emp.id)}
                      />
                    </td>
                    <td className="px-4 py-4">
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
                    <td className="px-4 py-4 capitalize text-slate-600">{emp.department || '-'}</td>
                    <td className="px-4 py-4">
                      <Badge className={
                        emp.status === 'active' ? 'bg-green-100 text-green-700' :
                        emp.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }>
                        {emp.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {bgvStatusIcon(emp.bg_verification_status)}
                        <Badge className={
                          emp.bg_verification_status === 'approved' ? 'bg-green-100 text-green-700' :
                          emp.bg_verification_status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }>
                          {emp.bg_verification_status || 'pending'}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {emp.date_of_joining ? format(new Date(emp.date_of_joining), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedEmployee(emp); setShowViewDialog(true); }}>
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(emp)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => generateOfferLetterPDF(emp)}>
                            <FileText className="w-4 h-4 mr-2" /> Download Offer Letter
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generateBGVPDF(emp)}>
                            <ShieldCheck className="w-4 h-4 mr-2" /> Download BGV
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => deleteMutation.mutate(emp.id)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Father's Name</Label>
              <Input
                value={formData.father_name}
                onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="hr">Human Resources</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date of Joining</Label>
              <Input
                type="date"
                value={formData.date_of_joining}
                onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Salary</Label>
              <Input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="department_head">Department Head</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700">
              {selectedEmployee ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {selectedEmployee.profile_photo ? (
                  <img src={selectedEmployee.profile_photo} alt="" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                    {selectedEmployee.full_name?.[0] || 'E'}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-800">{selectedEmployee.full_name}</h3>
                  <p className="text-slate-500">{selectedEmployee.designation}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className={
                      selectedEmployee.status === 'active' ? 'bg-green-100 text-green-700' :
                      'bg-amber-100 text-amber-700'
                    }>
                      {selectedEmployee.status}
                    </Badge>
                    <Badge className={
                      selectedEmployee.bg_verification_status === 'approved' ? 'bg-green-100 text-green-700' :
                      selectedEmployee.bg_verification_status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }>
                      BGV: {selectedEmployee.bg_verification_status || 'pending'}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => generateOfferLetterPDF(selectedEmployee)}>
                    <Download className="w-4 h-4 mr-1" /> Offer Letter
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => generateBGVPDF(selectedEmployee)}>
                    <Download className="w-4 h-4 mr-1" /> BGV
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-medium">{selectedEmployee.email}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Phone</p>
                  <p className="font-medium">{selectedEmployee.phone}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Department</p>
                  <p className="font-medium capitalize">{selectedEmployee.department || '-'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Father's Name</p>
                  <p className="font-medium">{selectedEmployee.father_name || '-'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Aadhaar</p>
                  <p className="font-medium">{selectedEmployee.aadhaar_number || '-'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">PAN</p>
                  <p className="font-medium">{selectedEmployee.pan_number || '-'}</p>
                </div>
                <div className="col-span-2 p-4 bg-slate-50 rounded-xl">
                  <p className="text-sm text-slate-500">Address</p>
                  <p className="font-medium">
                    {selectedEmployee.address ? 
                      `${selectedEmployee.address}, ${selectedEmployee.locality || ''}, ${selectedEmployee.city || ''}, ${selectedEmployee.state || ''} - ${selectedEmployee.pincode || ''}` 
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
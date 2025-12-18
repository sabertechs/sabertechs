import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
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
  Loader2,
  ArrowUpDown,
  FileSpreadsheet,
  UserCheck,
  UserX,
  FolderDown,
  ChevronLeft,
  ChevronRight,
  Archive,
  CreditCard,
  User,
  MapPin,
  Briefcase,
  MessageCircle
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SendWhatsAppDialog from "@/components/whatsapp/SendWhatsAppDialog";

export default function Freelancers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bgvFilter, setBgvFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [joiningDateFrom, setJoiningDateFrom] = useState("");
  const [joiningDateTo, setJoiningDateTo] = useState("");
  const [sortField, setSortField] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showBulkActionDialog, setShowBulkActionDialog] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [whatsAppEmployee, setWhatsAppEmployee] = useState(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const employeesPerPage = 40;
  const [formData, setFormData] = useState({
    full_name: "",
    father_name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    employment_type: "contractual",
    date_of_joining: format(new Date(), 'yyyy-MM-dd'),
    status: "active",
    role: "employee"
  });

  // Build server-side query
  const buildQuery = useCallback(() => {
    const query = { employment_type: 'contractual' };
    
    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (statusFilter !== "all") query.status = statusFilter;
    if (bgvFilter !== "all") query.bg_verification_status = bgvFilter;
    if (departmentFilter !== "all") query.department = departmentFilter;
    if (designationFilter !== "all") query.designation = designationFilter;
    if (joiningDateFrom) query.date_of_joining = { $gte: joiningDateFrom };
    if (joiningDateTo) {
      query.date_of_joining = { ...query.date_of_joining, $lte: joiningDateTo };
    }
    
    return query;
  }, [search, statusFilter, bgvFilter, departmentFilter, designationFilter, joiningDateFrom, joiningDateTo]);

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['freelancers', currentPage, sortField, sortOrder, buildQuery()],
    queryFn: async () => {
      const sortStr = sortOrder === 'desc' ? `-${sortField}` : sortField;
      return await base44.entities.Employee.filter(buildQuery(), sortStr, employeesPerPage * 3);
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: offerLetters = [] } = useQuery({
    queryKey: ['offerLetters'],
    queryFn: () => base44.entities.OfferLetter.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
    staleTime: 10 * 60 * 1000,
  });

  const settingsDepartments = useMemo(() => {
    const setting = appSettings.find(s => s.setting_key === 'departments');
    return setting?.setting_value || [];
  }, [appSettings]);

  const settingsDesignations = useMemo(() => {
    const setting = appSettings.find(s => s.setting_key === 'designations');
    return setting?.setting_value || [];
  }, [appSettings]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowAddDialog(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowAddDialog(false);
      setSelectedEmployee(null);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] })
  });

  const resetForm = () => {
    setFormData({
      full_name: "",
      father_name: "",
      email: "",
      phone: "",
      department: "",
      designation: "",
      employment_type: "contractual",
      date_of_joining: format(new Date(), 'yyyy-MM-dd'),
      status: "active",
      role: "employee"
    });
  };

  const handleEdit = (employee) => {
    setShowViewDialog(false);
    setSelectedEmployee(employee);
    setFormData({
      full_name: employee.full_name || "",
      father_name: employee.father_name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      department: employee.department || "",
      designation: employee.designation || "",
      employment_type: employee.employment_type || "contractual",
      date_of_joining: employee.date_of_joining || format(new Date(), 'yyyy-MM-dd'),
      status: employee.status || "active",
      role: employee.role || "employee"
    });
    setShowAddDialog(true);
  };

  const handleSubmit = () => {
    if (selectedEmployee) {
      updateMutation.mutate({ id: selectedEmployee.id, data: formData });
    } else {
      createMutation.mutate({ ...formData, employment_type: "contractual", bg_verification_status: "pending" });
    }
  };

  const getOfferLetter = useCallback((email) => offerLetters.find(ol => ol.employee_email === email), [offerLetters]);

  // Generate PDF using PDFMonkey
  const generatePDFWithMonkey = async (emp, docType) => {
    const empKey = `${emp.id}-${docType}`;
    setGeneratingPdf(prev => ({ ...prev, [empKey]: true }));
    
    try {
      const offerLetter = getOfferLetter(emp.email);
      
      // Fallback to HTML generation
      if (docType === 'offer') {
        generateOfferLetterHTML(emp, true);
      } else {
        generateBGVHTML(emp, true);
      }
      
      toast.success(`${docType === 'offer' ? 'Offer Letter' : 'BGV Report'} ready for download`);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPdf(prev => ({ ...prev, [empKey]: false }));
    }
  };

  const generateOfferLetterHTML = (emp, standalone = true) => {
    const offerLetter = getOfferLetter(emp.email);
    const headerImg = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/ab1b508e1_image002.jpg";
    const footerImg = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/9fddeba2e_image001.jpg";
    
    const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Appointment Letter - ${emp.full_name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap" rel="stylesheet">
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
    .digital-signature {
      position: fixed;
      bottom: 100px;
      right: 60px;
      text-align: right;
      font-family: 'Dancing Script', cursive;
      font-size: 17pt;
      color: #1a365d;
    }
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
    
    <p>With reference to your application and subsequent interview, we are pleased to appoint you as <strong>${emp.designation || offerLetter?.designation || 'Employee'}</strong> in our organization with effect from <strong>${emp.date_of_joining && !isNaN(new Date(emp.date_of_joining).getTime()) ? format(new Date(emp.date_of_joining), 'MMMM d, yyyy') : 'the date of joining'}</strong>.</p>
    
    <p>Your appointment is subject to the following terms and conditions:</p>
    
    <div class="terms">
      <ol>
        <li><strong>Designation:</strong> You will be designated as ${emp.designation || offerLetter?.designation || 'Employee'} in the ${emp.department || offerLetter?.department || 'Company'}.</li>
        <li><strong>Working Hours:</strong> You will be required to work as per the company's standard working hours and follow all rules and regulations of the company.</li>
        <li><strong>Confidentiality:</strong> You shall maintain strict confidentiality regarding all company matters, trade secrets, and proprietary information both during and after your employment.</li>
        <li><strong>Other Terms:</strong> You will be governed by all other terms and conditions as applicable to contractual employees of your grade as per company policy from time to time.</li>
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
  
  <div class="digital-signature">
    ${emp.full_name}
  </div>
</body>
</html>`;
    
    if (standalone) {
      const newWindow = window.open('', '_blank');
      newWindow.document.write(content);
      newWindow.document.close();
      newWindow.onload = () => {
        newWindow.print();
      };
    }
    return content;
  };

  const generateOfferLetterPDF = (emp) => {
    generatePDFWithMonkey(emp, 'offer');
  };

  const generateBGVHTML = (emp, standalone = true) => {
    const logoImg = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/ab1b508e1_image002.jpg";
    const verificationDate = format(new Date(), 'dd-MM-yyyy');
    const verificationTime = format(new Date(), 'hh:mm a');
    
    const calculateAge = (dob) => {
      if (!dob) return 'N/A';
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    };

    const age = calculateAge(emp.date_of_birth);
    const ageBand = age !== 'N/A' ? `${Math.floor(age/10)*10}-${Math.floor(age/10)*10 + 10}` : 'N/A';
    const maskedAadhaar = emp.aadhaar_number ? 'XXXXXXXX' + emp.aadhaar_number.slice(-4) : 'N/A';
    const genderShort = emp.gender === 'male' ? 'M' : emp.gender === 'female' ? 'F' : 'O';
    const fullAddress = [emp.address, emp.locality, emp.city, emp.state, emp.pincode].filter(Boolean).join(', ') || 'N/A';
    const bgvStatus = emp.bg_verification_status === 'approved' ? 'Success' : emp.bg_verification_status === 'rejected' ? 'Failed' : 'Pending';
    const statusColor = emp.bg_verification_status === 'approved' ? '#7cb342' : emp.bg_verification_status === 'rejected' ? '#e53935' : '#ffa000';
    
    const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Background Verification - ${emp.full_name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
    .page { width: 210mm; min-height: 297mm; padding: 0; margin: 0 auto; background: white; page-break-after: always; position: relative; }
    .page:last-child { page-break-after: auto; }
    .digital-signature {
      position: absolute;
      bottom: 30px;
      right: 30px;
      text-align: right;
      font-family: 'Dancing Script', cursive;
      font-size: 17pt;
      color: #1a365d;
    }
    .logo-header { text-align: center; padding: 15px 0; }
    .logo-header img { height: 60px; }
    .title-bar { background: #f57c00; color: white; text-align: center; padding: 15px; font-size: 20px; font-weight: bold; letter-spacing: 1px; }
    .profile-section { display: flex; padding: 20px 30px; border: 1px solid #e0e0e0; margin: 20px 30px; border-radius: 8px; }
    .profile-photo { width: 120px; height: 140px; background: #e0e0e0; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 30px; overflow: hidden; }
    .profile-photo img { width: 100%; height: 100%; object-fit: cover; }
    .profile-info { flex: 1; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .info-item { margin: 5px 0; }
    .info-label { color: #666; font-size: 11px; }
    .info-value { font-weight: bold; font-size: 13px; }
    .name-section { margin-top: 15px; }
    .emp-name { font-size: 18px; font-weight: bold; }
    .emp-id { color: #666; font-size: 11px; margin-top: 3px; }
    .status-bar { display: flex; justify-content: space-around; padding: 15px 30px; background: #f5f5f5; margin: 0 30px; border-radius: 8px; }
    .status-item { text-align: center; }
    .status-label { color: #666; font-size: 11px; }
    .status-value { font-size: 16px; font-weight: bold; margin-top: 5px; }
    .verification-table { margin: 20px 30px; border-collapse: collapse; width: calc(100% - 60px); }
    .verification-table th, .verification-table td { border: 1px solid #e0e0e0; padding: 12px 15px; text-align: left; }
    .verification-table th { background: #f5f5f5; font-weight: bold; color: #333; }
    .verification-table td.success { color: #7cb342; font-weight: bold; }
    .verification-table td.pending { color: #ffa000; font-weight: bold; }
    .verification-table td.failed { color: #e53935; font-weight: bold; }
    
    .report-title { background: #8bc34a; color: white; text-align: center; padding: 15px; font-size: 18px; font-weight: bold; }
    .section-title { background: #f5f5f5; padding: 10px 15px; font-weight: bold; margin: 20px 30px 0; border-left: 4px solid #f57c00; }
    .data-table { margin: 0 30px 20px; border-collapse: collapse; width: calc(100% - 60px); }
    .data-table td { border: 1px solid #e0e0e0; padding: 12px 15px; }
    .data-table td:first-child { background: #fafafa; font-weight: bold; width: 40%; }
    .result-row { background: #8bc34a !important; }
    .result-row td { color: white !important; font-weight: bold !important; }
    .result-row td:first-child { background: #8bc34a !important; }
  </style>
</head>
<body>
  <div class="page">
    <div class="logo-header">
      <img src="${logoImg}" alt="Saber Technologies" />
    </div>
    
    <div class="title-bar">VERIFICATIONS SUMMARY</div>
    
    <div class="profile-section">
      <div class="profile-photo">
        ${emp.profile_photo ? `<img src="${emp.profile_photo}" alt="Profile" />` : `<span style="color:#999;font-size:40px;">${emp.full_name?.[0] || 'E'}</span>`}
      </div>
      <div class="profile-info">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Staff ID</div>
            <div class="info-value">${emp.employee_id || emp.id || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date of Birth</div>
            <div class="info-value">${emp.date_of_birth && !isNaN(new Date(emp.date_of_birth).getTime()) ? format(new Date(emp.date_of_birth), 'dd-MM-yyyy') : 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Father's/Guardian's name</div>
            <div class="info-value">${emp.father_name || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Current Address</div>
            <div class="info-value">${fullAddress}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Permanent Address</div>
            <div class="info-value">${fullAddress}</div>
          </div>
        </div>
        <div class="name-section">
          <div class="emp-name">${emp.full_name}</div>
          <div class="emp-id">Individual ID ${emp.employee_id || emp.id || 'N/A'}</div>
        </div>
      </div>
    </div>
    
    <div class="status-bar">
      <div class="status-item">
        <div class="status-label">Overall Status</div>
        <div class="status-value" style="color: ${statusColor}">${bgvStatus}</div>
      </div>
      <div class="status-item">
        <div class="status-label">Initiation Date</div>
        <div class="status-value">${verificationDate}</div>
      </div>
    </div>
    
    <table class="verification-table">
      <thead>
        <tr>
          <th>Verifications</th>
          <th>Created Date</th>
          <th>Updated Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Aadhaar Verification</td>
          <td>${verificationDate}</td>
          <td>${verificationDate}</td>
          <td class="${emp.bg_verification_status === 'approved' ? 'success' : emp.bg_verification_status === 'rejected' ? 'failed' : 'pending'}">${bgvStatus}</td>
        </tr>
        <tr>
          <td>PAN Card Verification</td>
          <td>${verificationDate}</td>
          <td>${verificationDate}</td>
          <td class="${emp.bg_verification_status === 'approved' ? 'success' : emp.bg_verification_status === 'rejected' ? 'failed' : 'pending'}">${bgvStatus}</td>
        </tr>
      </tbody>
    </table>
    <div class="digital-signature">${emp.full_name}</div>
  </div>
  
  <div class="page">
    <div class="logo-header">
      <img src="${logoImg}" alt="Saber Technologies" />
    </div>
    
    <div class="report-title">AADHAAR VERIFICATION REPORT</div>
    
    <div class="section-title">GIVEN INFORMATION</div>
    <table class="data-table">
      <tr><td>AADHAAR NUMBER</td><td>${emp.aadhaar_number || 'N/A'}</td></tr>
      <tr><td>LOCATION</td><td>${emp.state || 'N/A'}</td></tr>
      <tr><td>GENDER</td><td>${emp.gender ? emp.gender.charAt(0).toUpperCase() + emp.gender.slice(1) : 'N/A'}</td></tr>
      <tr><td>AGE</td><td>${age}</td></tr>
    </table>
    
    <div class="section-title">VERIFIED INFORMATION*</div>
    <table class="data-table">
      <tr><td>AADHAAR NUMBER</td><td>${maskedAadhaar}</td></tr>
      <tr><td>GENDER</td><td>${genderShort}</td></tr>
      <tr><td>STATE</td><td>${emp.state || 'N/A'}</td></tr>
      <tr><td>AGE BAND</td><td>${ageBand}</td></tr>
    </table>
    
    <table class="data-table">
      <tr class="result-row"><td>RESULT</td><td>${bgvStatus}</td></tr>
      <tr><td>DATE OF VERIFICATION</td><td>${verificationDate}</td></tr>
      <tr><td>TIME OF VERIFICATION</td><td>${verificationTime}</td></tr>
    </table>
    <div class="digital-signature">${emp.full_name}</div>
  </div>
  
  <div class="page">
    <div class="logo-header">
      <img src="${logoImg}" alt="Saber Technologies" />
    </div>
    
    <div class="report-title">PAN CARD VERIFICATION REPORT</div>
    
    <div class="section-title">GIVEN INFORMATION</div>
    <table class="data-table">
      <tr><td>NAME ON PAN CARD</td><td>${emp.full_name}</td></tr>
      <tr><td>PAN NUMBER</td><td>${emp.pan_number || 'N/A'}</td></tr>
      <tr><td>DATE OF BIRTH</td><td>${emp.date_of_birth && !isNaN(new Date(emp.date_of_birth).getTime()) ? format(new Date(emp.date_of_birth), 'dd-MM-yyyy') : 'N/A'}</td></tr>
    </table>
    
    <div class="section-title">VERIFIED INFORMATION*</div>
    <table class="data-table">
      <tr><td>PAN NUMBER</td><td>${emp.pan_number || 'N/A'}</td></tr>
      <tr><td>NAME</td><td>${emp.full_name?.toUpperCase()}</td></tr>
      <tr><td>CATEGORY</td><td>Individual</td></tr>
    </table>
    
    <table class="data-table">
      <tr class="result-row"><td>RESULT</td><td>${bgvStatus}</td></tr>
      <tr><td>DATE OF VERIFICATION</td><td>${verificationDate}</td></tr>
      <tr><td>TIME OF VERIFICATION</td><td>${verificationTime}</td></tr>
    </table>
    <div class="digital-signature">${emp.full_name}</div>
  </div>
</body>
</html>`;
    
    if (standalone) {
      const newWindow = window.open('', '_blank');
      newWindow.document.write(content);
      newWindow.document.close();
      newWindow.onload = () => {
        newWindow.print();
      };
    }
    return content;
  };

  const generateBGVPDF = (emp) => {
    generatePDFWithMonkey(emp, 'bgv');
  };

  const generatePolicyAgreement = (emp) => {
    const policyImages = [
      'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/26ed80578_Screenshot2025-11-28at14140PM.png',
      'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/fca4f55f8_2.png',
      'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/be4a967d7_3.png',
      'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/9b90d22fd_4.png',
      'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/da075ad19_5.png',
      'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/a6348a5ee_6.png'
    ];
    
    const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Policy Agreement - ${emp.full_name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    @media print {
      .no-print { display: none !important; }
      .page { page-break-after: always; }
      .page:last-child { page-break-after: auto; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #f5f5f5; }
    .instructions {
      background: #f0f4f8;
      padding: 20px;
      margin: 20px;
      border-radius: 8px;
      border-left: 4px solid #4f46e5;
    }
    .instructions h2 { color: #1e293b; margin-bottom: 10px; }
    .instructions p { color: #64748b; margin: 5px 0; }
    .print-btn {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 15px;
    }
    .print-btn:hover { background: #4338ca; }
    .page {
      width: 210mm;
      min-height: 297mm;
      background: white;
      margin: 20px auto;
      position: relative;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .page img {
      width: 100%;
      height: auto;
      display: block;
    }
    .signature-block {
      position: absolute;
      bottom: 30px;
      right: 40px;
      text-align: right;
    }
    .signature-name {
      font-family: 'Dancing Script', cursive;
      font-size: 17pt;
      color: #1a365d;
    }
  </style>
</head>
<body>
  <div class="instructions no-print">
    <h2>📋 Policy Agreement for: ${emp.full_name}</h2>
    <p>This document contains the Policy for Proctor/Assessors with employee signature.</p>
    <p>Click the button below to print or save as PDF.</p>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
  
  ${policyImages.map((img, index) => `
  <div class="page">
    <img src="${img}" alt="Policy Page ${index + 1}" />
    <div class="signature-block">
      <div class="signature-name">${emp.full_name}</div>
    </div>
  </div>
  `).join('')}
</body>
</html>`;
    
    const newWindow = window.open('', '_blank');
    newWindow.document.write(content);
    newWindow.document.close();
  };

  const downloadAllDocsAsZip = async (emp) => {
    const empKey = `${emp.id}-zip`;
    setGeneratingPdf(prev => ({ ...prev, [empKey]: true }));
    
    try {
      const response = await base44.functions.invoke('generateEmployeeZip', { employeeId: emp.id });
      
      const base64 = response.data.zipBase64;
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/zip' });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.data.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('ZIP file downloaded successfully');
    } catch (error) {
      console.error('ZIP download error:', error);
      toast.error('Failed to generate ZIP. Opening documents individually...');
      generateOfferLetterHTML(emp, true);
      setTimeout(() => generateBGVHTML(emp, true), 500);
      setTimeout(() => generatePolicyAgreement(emp), 1000);
    } finally {
      setGeneratingPdf(prev => ({ ...prev, [empKey]: false }));
    }
  };

  const downloadBulkZip = async () => {
    if (selectedEmployees.length === 0) return;
    
    setDownloading(true);
    
    const selectedEmps = await base44.entities.Employee.filter({ 
      id: { $in: selectedEmployees } 
    });
    
    for (const emp of selectedEmps) {
      generateOfferLetterHTML(emp, true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      generateBGVHTML(emp, true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      generatePolicyAgreement(emp);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    toast.success(`Downloaded documents for ${selectedEmployees.length} freelancer(s)`);
    setDownloading(false);
    setSelectedEmployees([]);
  };

  const toggleSelectEmployee = (empId) => {
    setSelectedEmployees(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.length === paginatedEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(paginatedEmployees.map(e => e.id));
    }
  };

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * employeesPerPage;
    const end = start + employeesPerPage;
    return employees.slice(start, end);
  }, [employees, currentPage, employeesPerPage]);

  const totalPages = Math.ceil(employees.length / employeesPerPage);
  
  const { data: allEmployeesForFilters = [] } = useQuery({
    queryKey: ['employees-filters'],
    queryFn: () => base44.entities.Employee.list(),
    staleTime: 10 * 60 * 1000,
  });

  const departments = useMemo(() => [...new Set(allEmployeesForFilters.filter(e => e.employment_type === 'contractual').map(e => e.department).filter(Boolean))], [allEmployeesForFilters]);
  const designations = useMemo(() => [...new Set(allEmployeesForFilters.filter(e => e.employment_type === 'contractual').map(e => e.designation).filter(Boolean))], [allEmployeesForFilters]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, bgvFilter, departmentFilter, designationFilter, joiningDateFrom, joiningDateTo]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedEmployees.length === 0) return;
    
    for (const empId of selectedEmployees) {
      await base44.entities.Employee.update(empId, { status: bulkStatus });
    }
    
    queryClient.invalidateQueries(['employees']);
    setSelectedEmployees([]);
    setShowBulkActionDialog(false);
    setBulkStatus("");
  };

  const exportToCSV = async () => {
    const headers = [
      "Full Name", "Father Name", "Email", "Phone", "Date of Birth", "Gender",
      "Address", "Locality", "City", "State", "Pincode",
      "Aadhaar Number", "PAN Number", "Department", "Designation",
      "Date of Joining", "Role", "Status", "BGV Status"
    ];
    
    let dataToExport;
    if (selectedEmployees.length > 0) {
      dataToExport = await base44.entities.Employee.filter({ 
        id: { $in: selectedEmployees } 
      });
    } else {
      dataToExport = await base44.entities.Employee.filter(buildQuery());
    }
    
    const rows = dataToExport.map(emp => [
      emp.full_name || '',
      emp.father_name || '',
      emp.email || '',
      emp.phone || '',
      emp.date_of_birth || '',
      emp.gender || '',
      emp.address || '',
      emp.locality || '',
      emp.city || '',
      emp.state || '',
      emp.pincode || '',
      emp.aadhaar_number || '',
      emp.pan_number || '',
      emp.department || '',
      emp.designation || '',
      emp.date_of_joining || '',
      emp.role || '',
      emp.status || '',
      emp.bg_verification_status || ''
    ].map(val => `"${val}"`).join(','));
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `freelancers_export_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setBgvFilter("all");
    setDepartmentFilter("all");
    setDesignationFilter("all");
    setJoiningDateFrom("");
    setJoiningDateTo("");
    setSortField("created_date");
    setSortOrder("desc");
  };

  const bgvStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Freelancers</h2>
          <p className="text-slate-500">Manage contractual employees</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={exportToCSV}
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export All
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowDeleteAllDialog(true)}
            className="border-red-600 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All
          </Button>
          <Button onClick={() => { resetForm(); setSelectedEmployee(null); setShowAddDialog(true); }} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Freelancer
          </Button>
        </div>
      </div>

      {/* Filters - same as Employees but without employment type filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search freelancers..."
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
          
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={designationFilter} onValueChange={setDesignationFilter}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Designation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Designations</SelectItem>
                {designations.map(des => (
                  <SelectItem key={des} value={des}>{des}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-500 whitespace-nowrap">Joining:</Label>
              <Input
                type="date"
                value={joiningDateFrom}
                onChange={(e) => setJoiningDateFrom(e.target.value)}
                className="w-36"
                placeholder="From"
              />
              <span className="text-slate-400">to</span>
              <Input
                type="date"
                value={joiningDateTo}
                onChange={(e) => setJoiningDateTo(e.target.value)}
                className="w-36"
                placeholder="To"
              />
            </div>
            <Select value={`${sortField}-${sortOrder}`} onValueChange={(v) => {
              const [field, order] = v.split('-');
              setSortField(field);
              setSortOrder(order);
            }}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_date-desc">Newest First</SelectItem>
                <SelectItem value="created_date-asc">Oldest First</SelectItem>
                <SelectItem value="full_name-asc">Name A-Z</SelectItem>
                <SelectItem value="full_name-desc">Name Z-A</SelectItem>
                <SelectItem value="date_of_joining-desc">Joining (Latest)</SelectItem>
                <SelectItem value="date_of_joining-asc">Joining (Earliest)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedEmployees.length > 0 && (
        <Card className="border-0 shadow-sm bg-purple-50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-purple-700 font-medium">
                {selectedEmployees.length} freelancer(s) selected
              </span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowBulkActionDialog(true)}
                  className="border-purple-300 text-purple-700 hover:bg-purple-100"
                >
                  <UserCheck className="w-4 h-4 mr-1" />
                  Update Status
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={exportToCSV}
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-1" />
                  Export CSV
                </Button>
                <Button 
                  onClick={downloadBulkZip} 
                  disabled={downloading}
                  size="sm"
                  variant="outline"
                  className="border-purple-300 text-purple-700 hover:bg-purple-100"
                >
                  {downloading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                  Download Docs
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setSelectedEmployees([])}
                  className="text-slate-500"
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee List - Similar to Employees page */}
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
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500 cursor-pointer hover:text-purple-600" onClick={() => handleSort('full_name')}>
                    <div className="flex items-center gap-1">
                      Freelancer
                      {sortField === 'full_name' && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Department</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Designation</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">BGV Status</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500 cursor-pointer hover:text-purple-600" onClick={() => handleSort('date_of_joining')}>
                    <div className="flex items-center gap-1">
                      Joined
                      {sortField === 'date_of_joining' && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </th>
                  <th className="text-right px-4 py-4 text-sm font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEmployees.map((emp) => (
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
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                            {emp.full_name?.[0] || 'F'}
                          </div>
                        )}
                        <div>
                          <button 
                            onClick={() => { setSelectedEmployee(emp); setShowViewDialog(true); }}
                            className="font-medium text-slate-800 hover:text-purple-600 hover:underline text-left"
                          >
                            {emp.full_name}
                          </button>
                          <p className="text-sm text-slate-500">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 capitalize text-slate-600">{emp.department || '-'}</td>
                    <td className="px-4 py-4 text-slate-600">{emp.designation || '-'}</td>
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
                      {emp.date_of_joining && !isNaN(new Date(emp.date_of_joining).getTime()) ? format(new Date(emp.date_of_joining), 'MMM d, yyyy') : '-'}
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
                          <DropdownMenuItem onClick={() => { setWhatsAppEmployee(emp); setShowWhatsAppDialog(true); }}>
                            <MessageCircle className="w-4 h-4 mr-2 text-green-600" /> Send WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => generateOfferLetterPDF(emp)} disabled={generatingPdf[`${emp.id}-offer`]}>
                            {generatingPdf[`${emp.id}-offer`] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                            Download Offer Letter
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generateBGVPDF(emp)} disabled={generatingPdf[`${emp.id}-bgv`]}>
                            {generatingPdf[`${emp.id}-bgv`] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                            Download BGV Report
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generatePolicyAgreement(emp)}>
                            <FileText className="w-4 h-4 mr-2" />
                            Policy Agreement
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadAllDocsAsZip(emp)} disabled={generatingPdf[`${emp.id}-zip`]}>
                            {generatingPdf[`${emp.id}-zip`] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Archive className="w-4 h-4 mr-2" />}
                            Download All (ZIP)
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
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-slate-100">
              <p className="text-sm text-slate-500">
                Showing {((currentPage - 1) * employeesPerPage) + 1} to {Math.min(currentPage * employeesPerPage, employees.length)} of {employees.length}+ freelancers
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={currentPage === page ? "bg-purple-600 hover:bg-purple-700" : ""}
                        >
                          {page}
                        </Button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="px-1 text-slate-400">...</span>;
                    }
                    return null;
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmployee ? 'Edit Freelancer' : 'Add New Freelancer'}</DialogTitle>
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
                  {settingsDepartments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id} className="capitalize">{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Select value={formData.designation} onValueChange={(v) => setFormData({ ...formData, designation: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {settingsDesignations.map(des => (
                    <SelectItem key={des.id} value={des.id}>{des.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700">
              {selectedEmployee ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Update Dialog */}
      <Dialog open={showBulkActionDialog} onOpenChange={setShowBulkActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Freelancer Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-slate-600">
              Update status for {selectedEmployees.length} selected freelancer(s)
            </p>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkActionDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleBulkStatusUpdate} 
              disabled={!bulkStatus}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog - Full Details */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Freelancer Details</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic"><User className="w-4 h-4 mr-2" />Basic</TabsTrigger>
                <TabsTrigger value="personal"><CreditCard className="w-4 h-4 mr-2" />Personal</TabsTrigger>
                <TabsTrigger value="address"><MapPin className="w-4 h-4 mr-2" />Address</TabsTrigger>
                <TabsTrigger value="documents"><FileText className="w-4 h-4 mr-2" />Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b">
                  {selectedEmployee.profile_photo ? (
                    <img src={selectedEmployee.profile_photo} alt="" className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                      {selectedEmployee.full_name?.[0] || 'F'}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800">{selectedEmployee.full_name}</h3>
                    <p className="text-slate-500">{selectedEmployee.designation} • {selectedEmployee.department}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge className="bg-purple-100 text-purple-700">Contractual</Badge>
                      <Badge className={
                        selectedEmployee.status === 'active' ? 'bg-green-100 text-green-700' :
                        'bg-amber-100 text-amber-700'
                      }>
                        {selectedEmployee.status}
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(selectedEmployee)}>
                    <Edit className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadAllDocsAsZip(selectedEmployee)} disabled={generatingPdf[`${selectedEmployee.id}-zip`]} className="bg-purple-50 border-purple-300 text-purple-700">
                    {generatingPdf[`${selectedEmployee.id}-zip`] ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Archive className="w-4 h-4 mr-1" />}
                    Download All
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500">Full Name</p>
                    <p className="font-medium">{selectedEmployee.full_name}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500">Father's Name</p>
                    <p className="font-medium">{selectedEmployee.father_name || '-'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="font-medium">{selectedEmployee.email}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500">Phone</p>
                    <p className="font-medium">{selectedEmployee.phone}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500">Date of Joining</p>
                    <p className="font-medium">{selectedEmployee.date_of_joining && !isNaN(new Date(selectedEmployee.date_of_joining).getTime()) ? format(new Date(selectedEmployee.date_of_joining), 'MMM d, yyyy') : '-'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500">BGV Status</p>
                    <Badge className={
                      selectedEmployee.bg_verification_status === 'approved' ? 'bg-green-100 text-green-700' :
                      selectedEmployee.bg_verification_status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }>
                      {selectedEmployee.bg_verification_status || 'pending'}
                    </Badge>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500">Date of Birth</p>
                    <p className="font-medium">{selectedEmployee.date_of_birth && !isNaN(new Date(selectedEmployee.date_of_birth).getTime()) ? format(new Date(selectedEmployee.date_of_birth), 'MMM d, yyyy') : '-'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500">Gender</p>
                    <p className="font-medium capitalize">{selectedEmployee.gender || '-'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500">Aadhaar Number</p>
                    <p className="font-medium">{selectedEmployee.aadhaar_number || '-'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500">PAN Number</p>
                    <p className="font-medium">{selectedEmployee.pan_number || '-'}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="address" className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500">Address</p>
                    <p className="font-medium">{selectedEmployee.address || '-'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500">Locality</p>
                      <p className="font-medium">{selectedEmployee.locality || '-'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500">City</p>
                      <p className="font-medium">{selectedEmployee.city || '-'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500">State</p>
                      <p className="font-medium">{selectedEmployee.state || '-'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500">Pincode</p>
                      <p className="font-medium">{selectedEmployee.pincode || '-'}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500 mb-2">Profile Photo</p>
                    {selectedEmployee.profile_photo ? (
                      <a href={selectedEmployee.profile_photo} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-600 hover:underline">
                        <FileText className="w-4 h-4" />
                        View Photo
                      </a>
                    ) : (
                      <p className="text-slate-400">Not uploaded</p>
                    )}
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500 mb-2">Aadhaar Document</p>
                    {selectedEmployee.aadhaar_document ? (
                      <a href={selectedEmployee.aadhaar_document} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-600 hover:underline">
                        <FileText className="w-4 h-4" />
                        View Document
                      </a>
                    ) : (
                      <p className="text-slate-400">Not uploaded</p>
                    )}
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500 mb-2">PAN Document</p>
                    {selectedEmployee.pan_document ? (
                      <a href={selectedEmployee.pan_document} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-600 hover:underline">
                        <FileText className="w-4 h-4" />
                        View Document
                      </a>
                    ) : (
                      <p className="text-slate-400">Not uploaded</p>
                    )}
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500 mb-2">Education Certificates</p>
                    {selectedEmployee.education_certificates && selectedEmployee.education_certificates.length > 0 ? (
                      <div className="space-y-2">
                        {selectedEmployee.education_certificates.map((cert, idx) => (
                          <a key={idx} href={cert} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-600 hover:underline">
                            <FileText className="w-4 h-4" />
                            Certificate {idx + 1}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400">No certificates uploaded</p>
                    )}
                  </div>

                  {/* Download Buttons */}
                  <div className="mt-6 pt-4 border-t">
                    <p className="text-sm text-slate-500 mb-3">Generate Documents</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => generateOfferLetterPDF(selectedEmployee)} disabled={generatingPdf[`${selectedEmployee.id}-offer`]}>
                        {generatingPdf[`${selectedEmployee.id}-offer`] ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                        Offer Letter
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => generateBGVPDF(selectedEmployee)} disabled={generatingPdf[`${selectedEmployee.id}-bgv`]}>
                        {generatingPdf[`${selectedEmployee.id}-bgv`] ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                        BGV Report
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => generatePolicyAgreement(selectedEmployee)}>
                        <FileText className="w-4 h-4 mr-1" />
                        Policy Agreement
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* WhatsApp Dialog */}
      <SendWhatsAppDialog 
        open={showWhatsAppDialog} 
        onClose={() => { setShowWhatsAppDialog(false); setWhatsAppEmployee(null); }}
        employee={whatsAppEmployee}
      />

      {/* Delete All Dialog */}
      <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete All Freelancers</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              Are you sure you want to delete <strong>all {employees.length} freelancers</strong>? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteAllDialog(false)}>Cancel</Button>
            <Button 
              onClick={async () => {
                setDeletingAll(true);
                for (const emp of employees) {
                  await base44.entities.Employee.delete(emp.id);
                }
                queryClient.invalidateQueries(['employees']);
                setDeletingAll(false);
                setShowDeleteAllDialog(false);
                toast.success('All freelancers deleted');
              }}
              disabled={deletingAll}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
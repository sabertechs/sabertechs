import React, { useState } from "react";
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
  FolderDown
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

  // Generate PDF using PDFMonkey
  const generatePDFWithMonkey = async (emp, docType) => {
    const empKey = `${emp.id}-${docType}`;
    setGeneratingPdf(prev => ({ ...prev, [empKey]: true }));
    
    try {
      const offerLetter = getOfferLetter(emp.email);
      const folderName = emp.email?.replace('@', '_at_').replace(/\./g, '_');
      
      // Prepare payload based on document type
      let payload;
      if (docType === 'offer') {
        payload = {
          employee_name: emp.full_name,
          designation: emp.designation || offerLetter?.designation || 'Employee',
          department: emp.department || offerLetter?.department || 'Company',
          date_of_joining: emp.date_of_joining && !isNaN(new Date(emp.date_of_joining).getTime()) 
            ? format(new Date(emp.date_of_joining), 'MMMM d, yyyy') 
            : 'the date of joining',
          salary: (emp.salary || offerLetter?.salary || 0).toLocaleString(),
          current_date: format(new Date(), 'MMMM d, yyyy'),
        };
      } else {
        // BGV Report
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
        
        payload = {
          employee_name: emp.full_name,
          employee_id: emp.employee_id || emp.id,
          phone: emp.phone || 'N/A',
          date_of_birth: emp.date_of_birth && !isNaN(new Date(emp.date_of_birth).getTime()) 
            ? format(new Date(emp.date_of_birth), 'dd-MM-yyyy') 
            : 'N/A',
          father_name: emp.father_name || 'N/A',
          address: [emp.address, emp.locality, emp.city, emp.state, emp.pincode].filter(Boolean).join(', ') || 'N/A',
          aadhaar_number: emp.aadhaar_number || 'N/A',
          pan_number: emp.pan_number || 'N/A',
          gender: emp.gender ? emp.gender.charAt(0).toUpperCase() + emp.gender.slice(1) : 'N/A',
          age: age,
          state: emp.state || 'N/A',
          bgv_status: emp.bg_verification_status === 'approved' ? 'Success' : emp.bg_verification_status === 'rejected' ? 'Failed' : 'Pending',
          verification_date: format(new Date(), 'dd-MM-yyyy'),
          verification_time: format(new Date(), 'hh:mm a'),
          profile_photo: emp.profile_photo || '',
        };
      }

      // For now, fall back to HTML generation since PDFMonkey requires template setup
      // Once templates are created in PDFMonkey dashboard, uncomment below:
      /*
      const response = await base44.functions.invoke('pdfMonkey', {
        action: 'generate',
        templateId: docType === 'offer' ? 'YOUR_OFFER_TEMPLATE_ID' : 'YOUR_BGV_TEMPLATE_ID',
        payload: payload
      });
      
      if (response.data?.document?.download_url) {
        window.open(response.data.document.download_url, '_blank');
      }
      */
      
      // Fallback to current HTML generation
      if (docType === 'offer') {
        generateOfferLetterHTML(emp, true);
      } else {
        generateBGVHTML(emp, true);
      }
      
      toast.success(`${docType === 'offer' ? 'Offer Letter' : 'BGV Report'} ready for download`);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF. Using fallback method.');
      // Fallback to HTML generation
      if (docType === 'offer') {
        generateOfferLetterHTML(emp, true);
      } else {
        generateBGVHTML(emp, true);
      }
    } finally {
      setGeneratingPdf(prev => ({ ...prev, [empKey]: false }));
    }
  };

  const generateOfferLetterHTML = (emp, standalone = true) => {
    const offerLetter = getOfferLetter(emp.email);
    const folderName = emp.email?.replace('@', '_at_').replace('.', '_');
    const fileName = standalone ? `${folderName}/Offer_Letter.pdf` : `Offer_Letter_${folderName}.pdf`;
    const headerImg = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/ab1b508e1_image002.jpg";
    const footerImg = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/9fddeba2e_image001.jpg";
    
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
    
    <p>With reference to your application and subsequent interview, we are pleased to appoint you as <strong>${emp.designation || offerLetter?.designation || 'Employee'}</strong> in our organization with effect from <strong>${emp.date_of_joining && !isNaN(new Date(emp.date_of_joining).getTime()) ? format(new Date(emp.date_of_joining), 'MMMM d, yyyy') : 'the date of joining'}</strong>.</p>
    
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
    
    if (standalone) {
      // Open in new window for PDF printing
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
    const folderName = emp.email?.replace('@', '_at_').replace('.', '_');
    const fileName = standalone ? `${folderName}/BGV_Report.pdf` : `BGV_Report_${folderName}.pdf`;
    const logoImg = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/ab1b508e1_image002.jpg";
    const verificationDate = format(new Date(), 'dd-MM-yyyy');
    const verificationTime = format(new Date(), 'hh:mm a');
    
    // Calculate age from DOB
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
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
    .page { width: 210mm; min-height: 297mm; padding: 0; margin: 0 auto; background: white; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
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
    .status-success { color: #7cb342; }
    .status-pending { color: #ffa000; }
    .status-failed { color: #e53935; }
    .verification-table { margin: 20px 30px; border-collapse: collapse; width: calc(100% - 60px); }
    .verification-table th, .verification-table td { border: 1px solid #e0e0e0; padding: 12px 15px; text-align: left; }
    .verification-table th { background: #f5f5f5; font-weight: bold; color: #333; }
    .verification-table td.success { color: #7cb342; font-weight: bold; }
    .verification-table td.pending { color: #ffa000; font-weight: bold; }
    .verification-table td.failed { color: #e53935; font-weight: bold; }
    
    /* Page 2 & 3 Styles */
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
  <!-- PAGE 1: VERIFICATIONS SUMMARY -->
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
            <div class="info-label">Mobile</div>
            <div class="info-value">${emp.phone || 'N/A'}</div>
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
          <div class="emp-id">Community/Sub-Community</div>
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
  </div>
  
  <!-- PAGE 2: AADHAAR VERIFICATION REPORT -->
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
  </div>
  
  <!-- PAGE 3: PAN CARD VERIFICATION REPORT -->
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
  </div>
</body>
</html>`;
    
    if (standalone) {
      // Open in new window for PDF printing
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

  const downloadBothDocuments = async (emp) => {
    const empKey = `${emp.id}-all`;
    setGeneratingPdf(prev => ({ ...prev, [empKey]: true }));
    
    try {
      // Generate combined HTML with both documents for printing as PDF
      const folderName = emp.email?.replace('@', '_at_').replace(/\./g, '_');
      const offerContent = generateOfferLetterHTML(emp, false);
      const bgvContent = generateBGVHTML(emp, false);
      
      const combinedContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Documents - ${emp.full_name}</title>
  <style>
    @media print {
      .page-break { page-break-before: always; }
      .no-print { display: none; }
    }
    body { margin: 0; padding: 0; }
    .document-section { margin-bottom: 20px; }
    .instructions { padding: 20px; background: #f5f5f5; margin: 20px; border-radius: 8px; font-family: Arial, sans-serif; }
    .instructions h2 { color: #333; }
    .instructions p { color: #666; }
    .instructions ol { color: #333; }
  </style>
</head>
<body>
  <div class="instructions no-print">
    <h2>📁 Documents for: ${emp.full_name} (${emp.email})</h2>
    <p>To save as PDF files, create a folder named "<strong>${folderName}</strong>" and save the documents inside:</p>
    <ol>
      <li>Press <strong>Ctrl+P</strong> (or Cmd+P on Mac)</li>
      <li>Select <strong>"Save as PDF"</strong> as the destination</li>
      <li>Save as: <strong>Offer_Letter.pdf</strong> and <strong>BGV_Report.pdf</strong></li>
    </ol>
    <p>This document contains: <strong>Offer Letter</strong> and <strong>BGV Report</strong></p>
    <hr style="margin-top: 20px;">
  </div>
  
  <!-- Offer Letter -->
  <div class="document-section">
    ${offerContent.replace('<!DOCTYPE html>', '').replace('<html>', '').replace('</html>', '').replace(/<head>[\s\S]*?<\/head>/, '')}
  </div>
  
  <div class="page-break"></div>
  
  <!-- BGV Report -->
  <div class="document-section">
    ${bgvContent.replace('<!DOCTYPE html>', '').replace('<html>', '').replace('</html>', '').replace(/<head>[\s\S]*?<\/head>/, '')}
  </div>
</body>
</html>`;
      
      const newWindow = window.open('', '_blank');
      newWindow.document.write(combinedContent);
      newWindow.document.close();
      
      toast.success('Documents ready - save as PDF in folder: ' + folderName);
    } finally {
      setGeneratingPdf(prev => ({ ...prev, [empKey]: false }));
    }
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
    const matchesDesignation = designationFilter === "all" || emp.designation === designationFilter;
    
    let matchesJoiningDate = true;
    if (joiningDateFrom && emp.date_of_joining) {
      matchesJoiningDate = matchesJoiningDate && emp.date_of_joining >= joiningDateFrom;
    }
    if (joiningDateTo && emp.date_of_joining) {
      matchesJoiningDate = matchesJoiningDate && emp.date_of_joining <= joiningDateTo;
    }
    
    return matchesSearch && matchesStatus && matchesBgv && matchesDept && matchesDesignation && matchesJoiningDate;
  }).sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';
    
    if (sortField === 'salary') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];
  const designations = [...new Set(employees.map(e => e.designation).filter(Boolean))];

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

  const exportToCSV = () => {
    const headers = [
      "Full Name", "Father Name", "Email", "Phone", "Date of Birth", "Gender",
      "Address", "Locality", "City", "State", "Pincode",
      "Aadhaar Number", "PAN Number", "Department", "Designation",
      "Date of Joining", "Salary", "Role", "Status", "BGV Status"
    ];
    
    const dataToExport = selectedEmployees.length > 0 
      ? filteredEmployees.filter(emp => selectedEmployees.includes(emp.id))
      : filteredEmployees;
    
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
      emp.salary || '',
      emp.role || '',
      emp.status || '',
      emp.bg_verification_status || ''
    ].map(val => `"${val}"`).join(','));
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_export_${format(new Date(), 'yyyyMMdd')}.csv`;
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Employees</h2>
          <p className="text-slate-500">Manage your organization's employees</p>
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
          <Button onClick={() => { resetForm(); setSelectedEmployee(null); setShowAddDialog(true); }} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6 space-y-4">
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
                <SelectItem value="salary-desc">Salary (High-Low)</SelectItem>
                <SelectItem value="salary-asc">Salary (Low-High)</SelectItem>
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
        <Card className="border-0 shadow-sm bg-indigo-50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-indigo-700 font-medium">
                {selectedEmployees.length} employee(s) selected
              </span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowBulkActionDialog(true)}
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-100"
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
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-100"
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
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('full_name')}>
                    <div className="flex items-center gap-1">
                      Employee
                      {sortField === 'full_name' && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Department</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Designation</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">BGV Status</th>
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('date_of_joining')}>
                    <div className="flex items-center gap-1">
                      Joined
                      {sortField === 'date_of_joining' && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </th>
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
                          <DropdownMenuSeparator />
                                                          <DropdownMenuItem onClick={() => downloadBothDocuments(emp)} disabled={generatingPdf[`${emp.id}-all`]}>
                                                            {generatingPdf[`${emp.id}-all`] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FolderDown className="w-4 h-4 mr-2" />}
                                                            Download All Documents
                                                          </DropdownMenuItem>
                                                          <DropdownMenuItem onClick={() => window.open('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/529a74eee_PolicyforProctor.html', '_blank')}>
                                                                                            <FileText className="w-4 h-4 mr-2" />
                                                                                            Policy Agreement
                                                                                          </DropdownMenuItem>
                                                          <DropdownMenuItem onClick={() => generateOfferLetterPDF(emp)} disabled={generatingPdf[`${emp.id}-offer`]}>
                                                            {generatingPdf[`${emp.id}-offer`] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                                                            Download Offer Letter
                                                          </DropdownMenuItem>
                                                          <DropdownMenuItem onClick={() => generateBGVPDF(emp)} disabled={generatingPdf[`${emp.id}-bgv`]}>
                                                            {generatingPdf[`${emp.id}-bgv`] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                                                            Download BGV Report
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
                  <SelectItem value="proctor_online">Proctor Online</SelectItem>
                  <SelectItem value="proctor_cbt">Proctor CBT</SelectItem>
                  <SelectItem value="team_leader">Team Leader</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="cce">C.C.E</SelectItem>
                  <SelectItem value="wfm">WFM</SelectItem>
                  <SelectItem value="hr_manager">HR Manager</SelectItem>
                  <SelectItem value="hr_associate">HR Associate</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="quality_analyst">Quality Analyst</SelectItem>
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

      {/* Bulk Status Update Dialog */}
      <Dialog open={showBulkActionDialog} onOpenChange={setShowBulkActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Employee Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-slate-600">
              Update status for {selectedEmployees.length} selected employee(s)
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
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Update Status
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
                  <Button size="sm" variant="outline" onClick={() => downloadBothDocuments(selectedEmployee)} disabled={generatingPdf[`${selectedEmployee.id}-all`]}>
                    {generatingPdf[`${selectedEmployee.id}-all`] ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FolderDown className="w-4 h-4 mr-1" />}
                    All Docs
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.open('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6925679300b99789588899b7/529a74eee_PolicyforProctor.html', '_blank')}>
                                            <Download className="w-4 h-4 mr-1" />
                                            Policy
                                          </Button>
                  <Button size="sm" variant="outline" onClick={() => generateOfferLetterPDF(selectedEmployee)} disabled={generatingPdf[`${selectedEmployee.id}-offer`]}>
                    {generatingPdf[`${selectedEmployee.id}-offer`] ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                    Offer Letter
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => generateBGVPDF(selectedEmployee)} disabled={generatingPdf[`${selectedEmployee.id}-bgv`]}>
                    {generatingPdf[`${selectedEmployee.id}-bgv`] ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                    BGV
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
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
  MessageCircle,
  Mail
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
import SalaryComponentsForm from "@/components/salary/SalaryComponentsForm";
import SalaryBreakdown from "@/components/salary/SalaryBreakdown";
import DocumentReviewDialog from "@/components/employees/DocumentReviewDialog";

export default function Employees() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bgvFilter, setBgvFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState("all");
  const [joiningDateFrom, setJoiningDateFrom] = useState("");
  const [joiningDateTo, setJoiningDateTo] = useState("");
  const [sortField, setSortField] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showBulkActionDialog, setShowBulkActionDialog] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [downloading, setDownloading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
          const [whatsAppEmployee, setWhatsAppEmployee] = useState(null);
          const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
          const [deletingAll, setDeletingAll] = useState(false);
  const [showDocReviewDialog, setShowDocReviewDialog] = useState(false);
  const [docReviewEmployee, setDocReviewEmployee] = useState(null);
  const employeesPerPage = 40;
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteData, setInviteData] = useState({
    full_name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    date_of_joining: "",
    salary: ""
  });
  const [sendingInvite, setSendingInvite] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    father_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    address: "",
    locality: "",
    city: "",
    state: "",
    pincode: "",
    aadhaar_number: "",
    pan_number: "",
    department: "",
    designation: "",
    employment_type: "permanent",
    contract_end_date: "",
    date_of_joining: "",
    salary: "",
    salary_components: {},
    deductions: {},
    reporting_to: "",
    status: "active",
    role: "employee",
    bank_name: "",
    bank_account_number: "",
    bank_ifsc: "",
    bank_branch: "",
    account_holder_name: ""
  });

  // Fetch only permanent employees
  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date'),
    staleTime: 5 * 60 * 1000,
  });

  const employees = useMemo(() => allEmployees.filter(emp => emp.employment_type === 'permanent'), [allEmployees]);

  const { data: invites = [] } = useQuery({
    queryKey: ['employeeInvites'],
    queryFn: () => base44.entities.EmployeeInvite.list('-invite_sent_date'),
    staleTime: 2 * 60 * 1000,
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
    onSuccess: (newEmployee) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowAddDialog(false);
      resetForm();
      setValidationErrors({});
      toast.success(`✅ Employee "${newEmployee.full_name}" added successfully with ID: ${newEmployee.employee_id}`, {
        duration: 4000
      });
    },
    onError: (error) => {
      toast.error(`Failed to add employee: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: (updatedEmployee) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowAddDialog(false);
      setSelectedEmployee(null);
      resetForm();
      setValidationErrors({});
      toast.success(`✅ Employee "${updatedEmployee.full_name}" updated successfully`, {
        duration: 4000
      });
    },
    onError: (error) => {
      toast.error(`Failed to update employee: ${error.message}`);
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
      date_of_birth: "",
      gender: "",
      address: "",
      locality: "",
      city: "",
      state: "",
      pincode: "",
      aadhaar_number: "",
      pan_number: "",
      department: "",
      designation: "",
      employment_type: "permanent",
      contract_end_date: "",
      date_of_joining: "",
      salary: "",
      salary_components: {},
      deductions: {},
      reporting_to: "",
      status: "active",
      role: "employee",
      bank_name: "",
      bank_account_number: "",
      bank_ifsc: "",
      bank_branch: "",
      account_holder_name: ""
    });
  };

  const handleEdit = (employee) => {
    setShowViewDialog(false); // Close view dialog first
    setSelectedEmployee(employee);
    setFormData({
      full_name: employee.full_name || "",
      father_name: employee.father_name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      date_of_birth: employee.date_of_birth || "",
      gender: employee.gender || "",
      address: employee.address || "",
      locality: employee.locality || "",
      city: employee.city || "",
      state: employee.state || "",
      pincode: employee.pincode || "",
      aadhaar_number: employee.aadhaar_number || "",
      pan_number: employee.pan_number || "",
      department: employee.department || "",
      designation: employee.designation || "",
      employment_type: employee.employment_type || "permanent",
      contract_end_date: employee.contract_end_date || "",
      date_of_joining: employee.date_of_joining || "",
      salary: employee.salary || "",
      salary_components: employee.salary_components || {},
      deductions: employee.deductions || {},
      reporting_to: employee.reporting_to || "",
      status: employee.status || "active",
      role: employee.role || "employee",
      bank_name: employee.bank_name || "",
      bank_account_number: employee.bank_account_number || "",
      bank_ifsc: employee.bank_ifsc || "",
      bank_branch: employee.bank_branch || "",
      account_holder_name: employee.account_holder_name || ""
    });
    setShowAddDialog(true);
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.full_name?.trim()) {
      errors.full_name = "Full name is required";
    }
    
    if (!formData.email?.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }
    
    if (!formData.phone?.trim()) {
      errors.phone = "Phone number is required";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    // Validate form first
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly');
      return;
    }

    // Check for duplicate email and phone
    if (!selectedEmployee) {
      try {
        const existingByEmail = await base44.entities.Employee.filter({ email: formData.email.trim().toLowerCase() });
        if (existingByEmail.length > 0) {
          setValidationErrors(prev => ({ ...prev, email: 'An employee with this email already exists' }));
          toast.error('An employee with this email already exists');
          return;
        }
        
        const existingByPhone = await base44.entities.Employee.filter({ phone: formData.phone.trim() });
        if (existingByPhone.length > 0) {
          setValidationErrors(prev => ({ ...prev, phone: 'An employee with this phone number already exists' }));
          toast.error('An employee with this phone number already exists');
          return;
        }
      } catch (error) {
        console.error('Duplicate check error:', error);
        toast.error('Failed to validate employee data');
        return;
      }
      
      // Generate employee ID - find highest existing ID and increment
      const maxId = employees.reduce((max, emp) => {
        if (emp.employee_id && emp.employee_id.startsWith('66')) {
          const num = parseInt(emp.employee_id);
          return num > max ? num : max;
        }
        return max;
      }, 66000);
      
      const newEmployeeId = String(maxId + 1);
      createMutation.mutate({ ...formData, employee_id: newEmployeeId, bg_verification_status: "pending" });
    } else {
      updateMutation.mutate({ id: selectedEmployee.id, data: formData });
    }
  };

  const sendInvite = async (employee) => {
    setSendingInvite(employee.id);
    try {
      await base44.functions.invoke('sendEmployeeInvite', {
        employee_name: employee.full_name,
        employee_email: employee.email
      });
      toast.success(`Invitation sent to ${employee.full_name}`);
    } catch (error) {
      toast.error('Failed to send invitation');
    }
    setSendingInvite(null);
  };

  const handleApproveDocument = async (docKey) => {
    try {
      const currentStatus = docReviewEmployee.document_review_status || {};
      await base44.entities.Employee.update(docReviewEmployee.id, {
        document_review_status: {
          ...currentStatus,
          [docKey]: 'approved'
        }
      });
      queryClient.invalidateQueries(['employees']);
      toast.success('Document approved');
    } catch (error) {
      toast.error('Failed to approve document');
    }
  };

  const handleRejectDocument = async (docKey, reason) => {
    try {
      const currentStatus = docReviewEmployee.document_review_status || {};
      const currentReasons = docReviewEmployee.document_rejection_reasons || {};
      
      await base44.entities.Employee.update(docReviewEmployee.id, {
        document_review_status: {
          ...currentStatus,
          [docKey]: 'rejected'
        },
        document_rejection_reasons: {
          ...currentReasons,
          [docKey]: reason
        },
        status: 'pending'
      });

      // Get all rejected documents with reasons
      const rejectedDocs = {
        ...currentReasons,
        [docKey]: reason
      };

      // Filter only rejected documents
      const rejectedOnly = {};
      Object.keys(rejectedDocs).forEach(key => {
        const status = { ...currentStatus, [docKey]: 'rejected' };
        if (status[key] === 'rejected') {
          rejectedOnly[key] = rejectedDocs[key];
        }
      });

      // Send notification email
      await base44.functions.invoke('sendDocumentRejection', {
        employee_name: docReviewEmployee.full_name,
        employee_email: docReviewEmployee.email,
        rejected_documents: rejectedOnly
      });

      queryClient.invalidateQueries(['employees']);
      toast.success('Document rejected and employee notified');
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error('Failed to reject document');
    }
  };

  const handleSendInvite = async () => {
    if (!inviteData.full_name || !inviteData.email) {
      toast.error('Name and email are required');
      return;
    }

    setSendingInvite(true);
    try {
      const user = await base44.auth.me();
      
      // Check for duplicates
      try {
        const existingByEmail = await base44.entities.Employee.filter({ email: inviteData.email.trim().toLowerCase() });
        if (existingByEmail.length > 0) {
          toast.error('An employee with this email already exists');
          setSendingInvite(false);
          return;
        }
        
        if (inviteData.phone) {
          const existingByPhone = await base44.entities.Employee.filter({ phone: inviteData.phone.trim() });
          if (existingByPhone.length > 0) {
            toast.error('An employee with this phone number already exists');
            setSendingInvite(false);
            return;
          }
        }
      } catch (dupError) {
        console.error('Duplicate check error:', dupError);
        toast.error('Failed to validate employee data');
        setSendingInvite(false);
        return;
      }
      
      // Generate employee ID
      const maxId = employees.reduce((max, emp) => {
        if (emp.employee_id && emp.employee_id.startsWith('66')) {
          const num = parseInt(emp.employee_id);
          return num > max ? num : max;
        }
        return max;
      }, 66000);
      
      const newEmployeeId = String(maxId + 1);
      
      // Create employee record with pending status
      await base44.entities.Employee.create({
        ...inviteData,
        employee_id: newEmployeeId,
        employment_type: "permanent",
        status: "pending",
        role: "employee",
        bg_verification_status: "pending"
      });

      // Track the invitation
      await base44.entities.EmployeeInvite.create({
        ...inviteData,
        invited_by: user.email,
        invite_status: "sent",
        invite_sent_date: new Date().toISOString()
      });

      // Send invitation email
      const emailResult = await base44.functions.invoke('sendEmployeeInvite', {
        employee_name: inviteData.full_name,
        employee_email: inviteData.email
      });

      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowInviteDialog(false);
      setInviteData({
        full_name: "",
        email: "",
        phone: "",
        department: "",
        designation: "",
        date_of_joining: "",
        salary: ""
      });
      toast.success(`Invitation email sent to ${inviteData.email}`);
    } catch (error) {
      toast.error('Failed to send invitation: ' + error.message);
      console.error(error);
    } finally {
      setSendingInvite(false);
    }
  };

  const getOfferLetter = useCallback((email) => offerLetters.find(ol => ol.employee_email === email), [offerLetters]);

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
  
  <div class="digital-signature">
    ${emp.full_name}
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
    <div class="digital-signature">${emp.full_name}</div>
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
    <div class="digital-signature">${emp.full_name}</div>
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
    <div class="digital-signature">${emp.full_name}</div>
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
      
      // Convert base64 to blob
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
      // Fallback to individual documents
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
    
    // Download all 3 documents for each selected employee
    for (const empId of selectedEmployees) {
      const emp = employees.find(e => e.id === empId);
      if (emp) {
        // Generate Offer Letter
        generateOfferLetterHTML(emp, true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate BGV Report
        generateBGVHTML(emp, true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate Policy Agreement
        generatePolicyAgreement(emp);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    toast.success(`Downloaded documents for ${selectedEmployees.length} employee(s)`);
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

  const filteredEmployees = useMemo(() => {
    const searchLower = search.toLowerCase();
    return employees.filter(emp => {
      const matchesSearch = emp.full_name?.toLowerCase().includes(searchLower) ||
                                 emp.email?.toLowerCase().includes(searchLower) ||
                                 emp.phone?.includes(search);
      const matchesStatus = statusFilter === "all" || emp.status === statusFilter;
      const matchesBgv = bgvFilter === "all" || emp.bg_verification_status === bgvFilter;
      const matchesDept = departmentFilter === "all" || emp.department === departmentFilter;
      const matchesDesignation = designationFilter === "all" || emp.designation === designationFilter;
      const matchesEmploymentType = employmentTypeFilter === "all" || emp.employment_type === employmentTypeFilter;
      
      let matchesJoiningDate = true;
      if (joiningDateFrom && emp.date_of_joining) {
        matchesJoiningDate = matchesJoiningDate && emp.date_of_joining >= joiningDateFrom;
      }
      if (joiningDateTo && emp.date_of_joining) {
        matchesJoiningDate = matchesJoiningDate && emp.date_of_joining <= joiningDateTo;
      }
      
      return matchesSearch && matchesStatus && matchesBgv && matchesDept && matchesDesignation && matchesEmploymentType && matchesJoiningDate;
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
  }, [employees, search, statusFilter, bgvFilter, departmentFilter, designationFilter, employmentTypeFilter, joiningDateFrom, joiningDateTo, sortField, sortOrder]);

  const departments = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean))], [employees]);
  const designations = useMemo(() => [...new Set(employees.map(e => e.designation).filter(Boolean))], [employees]);

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * employeesPerPage,
    currentPage * employeesPerPage
  );

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, bgvFilter, departmentFilter, designationFilter, employmentTypeFilter, joiningDateFrom, joiningDateTo]);

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
      "Date of Joining", "Salary", "Role", "Status", "BGV Status"
    ];
    
    let dataToExport;
    if (selectedEmployees.length > 0) {
      dataToExport = employees.filter(emp => selectedEmployees.includes(emp.id));
    } else {
      dataToExport = filteredEmployees;
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
    setEmploymentTypeFilter("all");
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
          <p className="text-slate-500">
            Manage your organization's employees
            {invites.filter(inv => inv.invite_status === 'sent').length > 0 && (
              <span className="ml-2 text-indigo-600 font-medium">
                • {invites.filter(inv => inv.invite_status === 'sent').length} pending invite(s)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline"
                className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
              >
                <Mail className="w-4 h-4 mr-2" />
                Invitations
                {invites.filter(inv => inv.invite_status === 'sent').length > 0 && (
                  <Badge className="ml-2 bg-indigo-600 text-white">
                    {invites.filter(inv => inv.invite_status === 'sent').length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-2">
                <h4 className="font-semibold text-sm mb-2">Sent Invitations</h4>
                {invites.filter(inv => inv.invite_status === 'sent').length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">No pending invitations</p>
                ) : (
                  <div className="max-h-80 overflow-y-auto space-y-2">
                    {invites.filter(inv => inv.invite_status === 'sent').map((invite) => (
                      <div key={invite.id} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{invite.full_name}</p>
                            <p className="text-xs text-slate-500 truncate">{invite.email}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              Sent {format(new Date(invite.invite_sent_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <Badge className="bg-amber-100 text-amber-700 text-xs">Pending</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowInviteDialog(true)} className="cursor-pointer">
                <Mail className="w-4 h-4 mr-2" />
                Send New Invite
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            <Select value={employmentTypeFilter} onValueChange={setEmploymentTypeFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Emp. Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="permanent">Permanent</SelectItem>
                <SelectItem value="contractual">Contractual</SelectItem>
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
                      checked={selectedEmployees.length === paginatedEmployees.length && paginatedEmployees.length > 0}
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
                  <th className="text-left px-4 py-4 text-sm font-medium text-slate-500">Type</th>
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
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {emp.full_name?.[0] || 'E'}
                          </div>
                        )}
                        <div>
                          <button 
                            onClick={() => { setSelectedEmployee(emp); setShowViewDialog(true); }}
                            className="font-medium text-slate-800 hover:text-indigo-600 hover:underline text-left"
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
                        emp.employment_type === 'contractual' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }>
                        {emp.employment_type === 'contractual' ? 'Contract' : 'Permanent'}
                      </Badge>
                    </td>
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
                          <DropdownMenuItem onClick={() => sendInvite(emp)} disabled={sendingInvite === emp.id}>
                            {sendingInvite === emp.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                            Resend Invite
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setWhatsAppEmployee(emp); setShowWhatsAppDialog(true); }}>
                            <MessageCircle className="w-4 h-4 mr-2 text-green-600" /> Send WhatsApp
                          </DropdownMenuItem>
                          {(emp.aadhaar_document || emp.pan_document || emp.profile_photo) && (
                            <DropdownMenuItem onClick={() => { setDocReviewEmployee(emp); setShowDocReviewDialog(true); }}>
                              <ShieldCheck className="w-4 h-4 mr-2 text-indigo-600" /> Review Documents
                            </DropdownMenuItem>
                          )}
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
                Showing {((currentPage - 1) * employeesPerPage) + 1} to {Math.min(currentPage * employeesPerPage, employees.length)} of {employees.length}+ employees
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
                    // Show first page, last page, current page, and pages around current
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
                          className={currentPage === page ? "bg-indigo-600 hover:bg-indigo-700" : ""}
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
            <DialogTitle>{selectedEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
          </DialogHeader>
          
          {Object.keys(validationErrors).length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-800 mb-2">⚠️ Please fix the following errors:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                    {Object.entries(validationErrors).map(([field, error]) => (
                      <li key={field}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => {
                  setFormData({ ...formData, full_name: e.target.value });
                  if (validationErrors.full_name) {
                    setValidationErrors(prev => ({ ...prev, full_name: undefined }));
                  }
                }}
                className={validationErrors.full_name ? "border-red-500" : ""}
              />
              {validationErrors.full_name && (
                <p className="text-red-500 text-xs">{validationErrors.full_name}</p>
              )}
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
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (validationErrors.email) {
                    setValidationErrors(prev => ({ ...prev, email: undefined }));
                  }
                }}
                className={validationErrors.email ? "border-red-500" : ""}
              />
              {validationErrors.email && (
                <p className="text-red-500 text-xs">{validationErrors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (validationErrors.phone) {
                    setValidationErrors(prev => ({ ...prev, phone: undefined }));
                  }
                }}
                className={validationErrors.phone ? "border-red-500" : ""}
              />
              {validationErrors.phone && (
                <p className="text-red-500 text-xs">{validationErrors.phone}</p>
              )}
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
              <Label>Employment Type</Label>
              <Select value={formData.employment_type} onValueChange={(v) => setFormData({ ...formData, employment_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="contractual">Contractual</SelectItem>
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
              <Label>Reporting Manager</Label>
              <Select value={formData.reporting_to} onValueChange={(v) => setFormData({ ...formData, reporting_to: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {employees.filter(emp => 
                    (emp.role === 'hr' || emp.role === 'manager' || emp.role === 'department_head') &&
                    emp.id !== selectedEmployee?.id
                  ).map(manager => (
                    <SelectItem key={manager.id} value={manager.email}>
                      {manager.full_name} ({manager.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            
            {/* Personal Details */}
            <div className="col-span-2">
              <h3 className="font-semibold text-slate-700 mb-3 mt-4">Personal Details</h3>
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Aadhaar Number</Label>
              <Input
                value={formData.aadhaar_number}
                onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value })}
                placeholder="XXXX XXXX XXXX"
              />
            </div>
            <div className="space-y-2">
              <Label>PAN Number</Label>
              <Input
                value={formData.pan_number}
                onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                placeholder="ABCDE1234F"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address"
              />
            </div>
            <div className="space-y-2">
              <Label>Locality</Label>
              <Input
                value={formData.locality}
                onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                placeholder="Area/Locality"
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Pincode</Label>
              <Input
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="110001"
              />
            </div>
            
            {/* Banking Details */}
            <div className="col-span-2">
              <h3 className="font-semibold text-slate-700 mb-3 mt-4">Banking Details</h3>
            </div>
            <div className="space-y-2">
              <Label>Account Holder Name</Label>
              <Input
                value={formData.account_holder_name}
                onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input
                value={formData.bank_account_number}
                onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>IFSC Code</Label>
              <Input
                value={formData.bank_ifsc}
                onChange={(e) => setFormData({ ...formData, bank_ifsc: e.target.value.toUpperCase() })}
                placeholder="SBIN0001234"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Branch</Label>
              <Input
                value={formData.bank_branch}
                onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); setValidationErrors({}); }}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {selectedEmployee ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                selectedEmployee ? 'Update Employee' : 'Create Employee'
              )}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4 pb-4 border-b">
                {selectedEmployee.profile_photo ? (
                  <img src={selectedEmployee.profile_photo} alt="" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                    {selectedEmployee.full_name?.[0] || 'E'}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-800">{selectedEmployee.full_name}</h3>
                  <p className="text-slate-500">{selectedEmployee.designation} • {selectedEmployee.department}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge className={selectedEmployee.employment_type === 'contractual' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                      {selectedEmployee.employment_type === 'contractual' ? 'Contractual' : 'Permanent'}
                    </Badge>
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
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(selectedEmployee)}>
                    <Edit className="w-4 h-4 mr-1" /> Edit
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="personal" className="flex items-center gap-1">
                    <User className="w-4 h-4" /> Personal
                  </TabsTrigger>
                  <TabsTrigger value="employment" className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" /> Employment
                  </TabsTrigger>
                  <TabsTrigger value="salary" className="flex items-center gap-1">
                    <CreditCard className="w-4 h-4" /> Salary
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="flex items-center gap-1">
                    <FileText className="w-4 h-4" /> Documents
                  </TabsTrigger>
                  <TabsTrigger value="banking" className="flex items-center gap-1">
                    <CreditCard className="w-4 h-4" /> Banking
                  </TabsTrigger>
                </TabsList>

                {/* Personal Tab */}
                <TabsContent value="personal" className="mt-4">
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
                      <p className="text-sm text-slate-500">Date of Birth</p>
                      <p className="font-medium">{selectedEmployee.date_of_birth && !isNaN(new Date(selectedEmployee.date_of_birth).getTime()) ? format(new Date(selectedEmployee.date_of_birth), 'MMM d, yyyy') : '-'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500">Gender</p>
                      <p className="font-medium capitalize">{selectedEmployee.gender || '-'}</p>
                    </div>
                    <div className="col-span-2 p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Address</p>
                      <p className="font-medium">
                        {selectedEmployee.address ? 
                          `${selectedEmployee.address}, ${selectedEmployee.locality || ''}, ${selectedEmployee.city || ''}, ${selectedEmployee.state || ''} - ${selectedEmployee.pincode || ''}` 
                          : '-'}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* Salary Tab */}
                <TabsContent value="salary" className="mt-4">
                  <div className="space-y-6">
                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                      <p className="text-sm text-blue-700">
                        💡 <strong>Tip:</strong> Update salary components below and click "Save Salary Structure" to apply changes.
                      </p>
                    </div>
                    <SalaryComponentsForm 
                      employee={selectedEmployee}
                      onSave={async (salaryData) => {
                        try {
                          await base44.entities.Employee.update(selectedEmployee.id, salaryData);
                          queryClient.invalidateQueries(['employees']);
                          toast.success(`✅ Salary structure updated for ${selectedEmployee.full_name}`, {
                            duration: 4000
                          });
                          // Update selectedEmployee to reflect changes
                          setSelectedEmployee(prev => ({ ...prev, ...salaryData }));
                        } catch (error) {
                          toast.error('Failed to update salary structure');
                        }
                      }}
                    />
                    <SalaryBreakdown employee={selectedEmployee} />
                  </div>
                </TabsContent>

                {/* Employment Tab */}
                <TabsContent value="employment" className="mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500">Employee ID</p>
                      <p className="font-medium">{selectedEmployee.employee_id || selectedEmployee.id}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500">Department</p>
                      <p className="font-medium capitalize">{selectedEmployee.department || '-'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500">Designation</p>
                      <p className="font-medium">{selectedEmployee.designation || '-'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500">Role</p>
                      <p className="font-medium capitalize">{selectedEmployee.role || 'employee'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500">Employment Type</p>
                      <div className="flex items-center gap-2">
                        <Badge className={selectedEmployee.employment_type === 'contractual' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                          {selectedEmployee.employment_type === 'contractual' ? 'Contractual' : 'Permanent'}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500">Date of Joining</p>
                      <p className="font-medium">{selectedEmployee.date_of_joining && !isNaN(new Date(selectedEmployee.date_of_joining).getTime()) ? format(new Date(selectedEmployee.date_of_joining), 'MMM d, yyyy') : '-'}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500">Salary</p>
                      <p className="font-medium">₹{selectedEmployee.salary?.toLocaleString() || '-'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500">Reporting To</p>
                      <p className="font-medium">{selectedEmployee.reporting_to || '-'}</p>
                    </div>
                  </div>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="mt-4">
                  {selectedEmployee.status === 'pending' && (selectedEmployee.aadhaar_document || selectedEmployee.pan_document) && (
                    <Card className="border-red-200 bg-red-50 mb-4">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-red-800 mb-2">Document Review</h4>
                            <p className="text-sm text-red-700 mb-3">If documents are unclear or incorrect, you can reject them and notify the employee.</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-700 hover:bg-red-100"
                              onClick={() => {
                                const reason = prompt('Enter rejection reason (will be sent to employee):');
                                if (reason) {
                                  rejectDocuments(selectedEmployee, reason);
                                  setShowViewDialog(false);
                                }
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject Documents
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500">Aadhaar Number</p>
                      <p className="font-medium">{selectedEmployee.aadhaar_number || '-'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500">PAN Number</p>
                      <p className="font-medium">{selectedEmployee.pan_number || '-'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500">Aadhaar Document</p>
                      {selectedEmployee.aadhaar_document ? (
                        <a href={selectedEmployee.aadhaar_document} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">View Document</a>
                      ) : <p className="text-slate-400 text-sm">Not uploaded</p>}
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500">PAN Document</p>
                      {selectedEmployee.pan_document ? (
                        <a href={selectedEmployee.pan_document} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm">View Document</a>
                      ) : <p className="text-slate-400 text-sm">Not uploaded</p>}
                    </div>
                    <div className="col-span-2 p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-500 mb-2">Education Certificates</p>
                      {selectedEmployee.education_certificates?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedEmployee.education_certificates.map((cert, idx) => (
                            <a key={idx} href={cert} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-sm bg-indigo-50 px-3 py-1 rounded-full">
                              Certificate {idx + 1}
                            </a>
                          ))}
                        </div>
                      ) : <p className="text-slate-400 text-sm">Not uploaded</p>}
                    </div>
                  </div>


                </TabsContent>

                {/* Banking Tab */}
                <TabsContent value="banking" className="mt-4">
                  {selectedEmployee.bank_account_number ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-sm text-slate-500">Account Holder Name</p>
                        <p className="font-medium">{selectedEmployee.account_holder_name || '-'}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-sm text-slate-500">Bank Name</p>
                        <p className="font-medium">{selectedEmployee.bank_name || '-'}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-sm text-slate-500">Account Number</p>
                        <p className="font-medium font-mono">{selectedEmployee.bank_account_number || '-'}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-sm text-slate-500">IFSC Code</p>
                        <p className="font-medium font-mono">{selectedEmployee.bank_ifsc || '-'}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl">
                        <p className="text-sm text-slate-500">Branch</p>
                        <p className="font-medium">{selectedEmployee.bank_branch || '-'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                      <p>No banking details available</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
                </Dialog>

                {/* WhatsApp Dialog */}
                                      <SendWhatsAppDialog 
                                        open={showWhatsAppDialog} 
                                        onClose={() => { setShowWhatsAppDialog(false); setWhatsAppEmployee(null); }}
                                        employee={whatsAppEmployee}
                                      />

                            {/* Invite Employee Dialog */}
                            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Invite Permanent Employee</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                                    <p className="text-sm text-blue-700">
                                      <strong>Note:</strong> An invitation email will be sent to the employee with instructions to complete their registration and onboarding.
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Full Name *</Label>
                                      <Input
                                        value={inviteData.full_name}
                                        onChange={(e) => setInviteData({ ...inviteData, full_name: e.target.value })}
                                        placeholder="Employee full name"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Email *</Label>
                                      <Input
                                        type="email"
                                        value={inviteData.email}
                                        onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                                        placeholder="official@email.com"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Phone</Label>
                                      <Input
                                        value={inviteData.phone}
                                        onChange={(e) => setInviteData({ ...inviteData, phone: e.target.value })}
                                        placeholder="+91 XXXXX XXXXX"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Department</Label>
                                      <Select value={inviteData.department} onValueChange={(v) => setInviteData({ ...inviteData, department: v })}>
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
                                      <Select value={inviteData.designation} onValueChange={(v) => setInviteData({ ...inviteData, designation: v })}>
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
                                        value={inviteData.date_of_joining}
                                        onChange={(e) => setInviteData({ ...inviteData, date_of_joining: e.target.value })}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Salary</Label>
                                      <Input
                                        type="number"
                                        value={inviteData.salary}
                                        onChange={(e) => setInviteData({ ...inviteData, salary: parseFloat(e.target.value) })}
                                        placeholder="Monthly salary"
                                      />
                                    </div>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
                                  <Button 
                                    onClick={handleSendInvite} 
                                    disabled={sendingInvite}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                  >
                                    {sendingInvite ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Sending...
                                      </>
                                    ) : (
                                      <>
                                        <Mail className="w-4 h-4 mr-2" />
                                        Send Invitation
                                      </>
                                    )}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            {/* Document Review Dialog */}
                            <DocumentReviewDialog
                              open={showDocReviewDialog}
                              onClose={() => { setShowDocReviewDialog(false); setDocReviewEmployee(null); }}
                              employee={docReviewEmployee}
                              onApprove={handleApproveDocument}
                              onReject={handleRejectDocument}
                            />

                            {/* Delete All Confirmation Dialog */}
                            <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle className="text-red-600">Delete All Employees</DialogTitle>
                                </DialogHeader>
                                <div className="py-4">
                                  <p className="text-slate-600">
                                    Are you sure you want to delete <strong>all {employees.length} employees</strong>? This action cannot be undone.
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
                                      toast.success('All employees deleted');
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
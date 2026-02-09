import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, Upload, CheckCircle, Loader2, User, FileText, AlertCircle, CreditCard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import CityAutocomplete from "@/components/forms/CityAutocomplete";
import { INDIAN_STATES } from "@/components/data/indiaData";

const InputWithError = ({ label, field, value, onChange, error, type = "text", placeholder, ...props }) => (
  <div className="space-y-2">
    <Label>{label} *</Label>
    <Input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={error ? "border-red-500" : ""}
      {...props}
    />
    {error && (
      <p className="text-red-500 text-xs flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> {error}
      </p>
    )}
  </div>
);

export default function Registration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [errors, setErrors] = useState({});
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    father_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    work_type: "both",
    // Current Address
    address: "",
    locality: "",
    city: "",
    state: "",
    pincode: "",
    // Documents
    aadhaar_number: "",
    pan_number: "",
    aadhaar_document: "",
    pan_document: "",
    education_certificates: [],
    profile_photo: "",
    // Bank Details
    bank_name: "",
    bank_account_number: "",
    bank_ifsc: "",
    bank_branch: "",
    account_holder_name: ""
  });

  useEffect(() => {
    let isMounted = true;
    let redirecting = false;
    
    const checkExistingEmployee = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          base44.auth.redirectToLogin(window.location.href);
          return;
        }
        
        const userData = await base44.auth.me();
        
        // Check if user is admin - admins don't need registration
        if (userData.role === 'admin') {
          redirecting = true;
          window.location.replace(createPageUrl("HRDashboard"));
          return;
        }
        
        // OPTIMIZED: Query by email directly instead of fetching all employees
        const userEmail = userData.email.toLowerCase().trim();
        const employees = await base44.entities.Employee.filter({ 
          email: userEmail 
        });
        
        if (employees.length > 0) {
          const emp = employees[0];
          redirecting = true;
          
          // Employee exists - redirect based on role
          if (emp.role === 'hr' || emp.role === 'manager') {
            window.location.replace(createPageUrl("HRDashboard"));
          } else if (emp.role === 'department_head') {
            window.location.replace(createPageUrl("DeptHeadDashboard"));
          } else {
            window.location.replace(createPageUrl("EmployeeDashboard"));
          }
          return;
        }
        
        // No employee record - show registration form
        if (isMounted && !redirecting) {
          setFormData(prev => ({ 
            ...prev, 
            email: userData.email, 
            full_name: userData.full_name || "" 
          }));
          setInitialLoading(false);
        }
      } catch (error) {
        console.error("Error checking employee:", error);
        if (isMounted && !redirecting) {
          // Don't block registration on error - show form
          setInitialLoading(false);
        }
      }
    };
    
    checkExistingEmployee();
    return () => { isMounted = false; };
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleFileUpload = async (file, field) => {
    setUploadingDoc(field);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (field === "education_certificates") {
        setFormData(prev => ({
          ...prev,
          education_certificates: [...prev.education_certificates, file_url]
        }));
      } else {
        setFormData(prev => ({ ...prev, [field]: file_url }));
      }
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: null }));
      }
    } catch (err) {
      console.error("Upload error:", err);
    }
    setUploadingDoc(null);
  };

  const handleMultipleFileUpload = async (files, field) => {
    setUploadingDoc(field);
    try {
      const uploadPromises = Array.from(files).map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const fileUrls = results.map(r => r.file_url);
      
      setFormData(prev => ({
        ...prev,
        education_certificates: [...prev.education_certificates, ...fileUrls]
      }));
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: null }));
      }
    } catch (err) {
      console.error("Upload error:", err);
    }
    setUploadingDoc(null);
  };

  const validateStep1 = async () => {
    const newErrors = {};
    if (!formData.full_name.trim()) newErrors.full_name = "Full name is required";
    if (!formData.father_name.trim()) newErrors.father_name = "Father's name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.date_of_birth) newErrors.date_of_birth = "Date of birth is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.work_type) newErrors.work_type = "Work type is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.locality.trim()) newErrors.locality = "Locality is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.state.trim()) newErrors.state = "State is required";
    if (!formData.pincode.trim()) newErrors.pincode = "Pincode is required";
    
    // Check for duplicate email and phone if no basic errors
    if (!newErrors.email && !newErrors.phone) {
      setCheckingDuplicate(true);
      try {
        // OPTIMIZED: Run both checks in parallel with retry logic
        const [existingByEmail, existingByPhone] = await Promise.all([
          base44.entities.Employee.filter({ email: formData.email.trim().toLowerCase() })
            .catch(err => {
              console.error("Email check failed:", err);
              return []; // Fail gracefully
            }),
          base44.entities.Employee.filter({ phone: formData.phone.trim() })
            .catch(err => {
              console.error("Phone check failed:", err);
              return []; // Fail gracefully
            })
        ]);

        if (existingByEmail.length > 0) {
          navigate(createPageUrl("EmployeeDashboard"));
          setCheckingDuplicate(false);
          return false;
        }

        if (existingByPhone.length > 0) {
          newErrors.phone = "An employee with this phone number already exists";
        }
      } catch (error) {
        console.error("Duplicate check error:", error);
        // Don't block registration on network error
      }
      setCheckingDuplicate(false);
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    // Aadhaar validation - 12 digits
    if (!formData.aadhaar_number.trim()) {
      newErrors.aadhaar_number = "Aadhaar number is required";
    } else if (!/^\d{12}$/.test(formData.aadhaar_number.replace(/\s/g, ''))) {
      newErrors.aadhaar_number = "Aadhaar must be exactly 12 digits";
    }
    
    // PAN validation - 10 characters
    if (!formData.pan_number.trim()) {
      newErrors.pan_number = "PAN number is required";
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number.toUpperCase())) {
      newErrors.pan_number = "PAN must be 10 characters (e.g., ABCDE1234F)";
    }
    
    if (!formData.aadhaar_document) newErrors.aadhaar_document = "Aadhaar document is required";
    if (!formData.pan_document) newErrors.pan_document = "PAN document is required";
    if (formData.education_certificates.length === 0) newErrors.education_certificates = "At least one education certificate is required";
    if (!formData.profile_photo) newErrors.profile_photo = "Profile photo is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    
    if (!formData.bank_name.trim()) newErrors.bank_name = "Bank name is required";
    if (!formData.bank_account_number.trim()) {
      newErrors.bank_account_number = "Account number is required";
    } else if (!/^\d{9,18}$/.test(formData.bank_account_number.replace(/\s/g, ''))) {
      newErrors.bank_account_number = "Enter a valid account number (9-18 digits)";
    }
    if (!formData.bank_ifsc.trim()) {
      newErrors.bank_ifsc = "IFSC code is required";
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bank_ifsc.toUpperCase())) {
      newErrors.bank_ifsc = "Enter a valid IFSC code (e.g., SBIN0001234)";
    }
    if (!formData.account_holder_name.trim()) newErrors.account_holder_name = "Account holder name is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (step === 1) {
      const isValid = await validateStep1();
      if (isValid) {
        setStep(2);
      }
    } else if (step === 2) {
      if (validateStep2()) {
        setStep(3);
      }
    }
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    
    setLoading(true);
    try {
      const userData = await base44.auth.me();
      const userEmail = userData.email.toLowerCase().trim();
      
      // OPTIMIZED: Query by email instead of fetching all
      const existingEmployees = await base44.entities.Employee.filter({ 
        email: userEmail 
      });
      
      // Get max ID efficiently with server-side sorting
      const recentEmployees = await base44.entities.Employee.list('-employee_id', 1);
      let newEmployeeId = "66001";
      
      if (recentEmployees.length > 0 && recentEmployees[0].employee_id) {
        const lastId = parseInt(recentEmployees[0].employee_id);
        if (!isNaN(lastId)) {
          newEmployeeId = String(lastId + 1);
        }
      }
      
      const employeeData = {
        ...formData,
        email: formData.email.toLowerCase().trim(),
        pan_number: formData.pan_number.toUpperCase(),
        aadhaar_number: formData.aadhaar_number.replace(/\s/g, ''),
        bank_ifsc: formData.bank_ifsc.toUpperCase(),
        bg_verification_status: "pending"
      };
      
      if (existingEmployees.length > 0) {
        // Update existing record - keep their original employment_type and role
        const existing = existingEmployees[0];
        await base44.entities.Employee.update(existing.id, {
          ...employeeData,
          employee_id: existing.employee_id || newEmployeeId,
          employment_type: existing.employment_type || "contractual",
          role: existing.role || "freelancer",
          status: "active"
        });
        
        // Redirect based on their role
        if (existing.role === 'hr' || existing.role === 'manager') {
          navigate(createPageUrl("HRDashboard"));
        } else if (existing.role === 'department_head') {
          navigate(createPageUrl("DeptHeadDashboard"));
        } else if (existing.role === 'freelancer') {
          navigate(createPageUrl("FreelancerDashboard"));
        } else {
          navigate(createPageUrl("EmployeeDashboard"));
        }
      } else {
        // Create new freelancer
        await base44.entities.Employee.create({
          ...employeeData,
          employee_id: newEmployeeId,
          employment_type: "contractual",
          status: "pending",
          role: "freelancer"
        });
        navigate(createPageUrl("FreelancerDashboard"));
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, title: "Personal Info", icon: User },
    { num: 2, title: "Documents", icon: FileText },
    { num: 3, title: "Bank Details", icon: CreditCard }
  ];

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-500">Checking your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Building2 className="w-10 h-10 text-indigo-600" />
            <h1 className="text-3xl font-bold text-slate-800">HRMS</h1>
          </div>
          <h2 className="text-2xl font-semibold text-slate-700">Complete Registration</h2>
          <p className="text-slate-500 mt-2">Complete your profile to get started</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {steps.map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                step === s.num 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                  : step > s.num 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-slate-100 text-slate-400'
              }`}>
                {step > s.num ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <s.icon className="w-5 h-5" />
                )}
                <span className="font-medium hidden sm:inline">{s.title}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-12 h-1 rounded ${step > s.num ? 'bg-green-400' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-8">
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-slate-800">Personal Information</h3>
                  <p className="text-slate-500">Enter your basic details</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputWithError label="Full Name" field="full_name" value={formData.full_name} onChange={(e) => handleChange("full_name", e.target.value)} error={errors.full_name} placeholder="Enter your full name" />
                  <InputWithError label="Father's Name" field="father_name" value={formData.father_name} onChange={(e) => handleChange("father_name", e.target.value)} error={errors.father_name} placeholder="Enter father's name" />
                  <InputWithError label="Email" field="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} error={errors.email} type="email" placeholder="your.email@company.com" />
                  <InputWithError label="Phone" field="phone" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} error={errors.phone} placeholder="+91 XXXXX XXXXX" />
                  <InputWithError label="Date of Birth" field="date_of_birth" value={formData.date_of_birth} onChange={(e) => handleChange("date_of_birth", e.target.value)} error={errors.date_of_birth} type="date" />
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <Select value={formData.gender} onValueChange={(v) => handleChange("gender", v)}>
                      <SelectTrigger className={errors.gender ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.gender}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Work Type *</Label>
                    <Select value={formData.work_type} onValueChange={(v) => handleChange("work_type", v)}>
                      <SelectTrigger className={errors.work_type ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select work type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="center_based">Center Based</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.work_type && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.work_type}
                      </p>
                    )}
                  </div>
                </div>

                {/* Current Address Section */}
                <div className="border-t pt-6 mt-6">
                  <h4 className="font-semibold text-slate-700 mb-4">Current Address</h4>
                  
                  <div className="space-y-2 mb-4">
                    <Label>Address *</Label>
                    <Textarea
                      value={formData.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      placeholder="Enter your complete address"
                      rows={3}
                      className={errors.address ? "border-red-500" : ""}
                    />
                    {errors.address && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.address}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputWithError label="Locality" field="locality" value={formData.locality} onChange={(e) => handleChange("locality", e.target.value)} error={errors.locality} placeholder="Locality / Area" />
                    
                    <div className="space-y-2">
                      <Label>State *</Label>
                      <Select value={formData.state} onValueChange={(v) => handleChange("state", v)}>
                        <SelectTrigger className={errors.state ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDIAN_STATES.map(state => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.state && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.state}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>City *</Label>
                      <CityAutocomplete
                        value={formData.city}
                        onChange={(v) => handleChange("city", v)}
                        placeholder="Start typing city name..."
                        error={errors.city}
                      />
                      {errors.city && (
                        <p className="text-red-500 text-xs flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {errors.city}
                        </p>
                      )}
                    </div>
                    
                    <InputWithError label="Pincode" field="pincode" value={formData.pincode} onChange={(e) => handleChange("pincode", e.target.value)} error={errors.pincode} placeholder="XXXXXX" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Documents */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-slate-800">Document Upload</h3>
                  <p className="text-slate-500">Upload required documents</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Aadhaar Number * (12 digits)</Label>
                    <Input
                      value={formData.aadhaar_number}
                      onChange={(e) => handleChange("aadhaar_number", e.target.value.replace(/\D/g, '').slice(0, 12))}
                      placeholder="XXXX XXXX XXXX"
                      className={errors.aadhaar_number ? "border-red-500" : ""}
                      maxLength={12}
                    />
                    {errors.aadhaar_number && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.aadhaar_number}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>PAN Number * (10 characters)</Label>
                    <Input
                      value={formData.pan_number}
                      onChange={(e) => handleChange("pan_number", e.target.value.toUpperCase().slice(0, 10))}
                      placeholder="ABCDE1234F"
                      className={errors.pan_number ? "border-red-500" : ""}
                      maxLength={10}
                    />
                    {errors.pan_number && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.pan_number}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Aadhaar Document *</Label>
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center hover:border-indigo-400 transition-colors ${
                      errors.aadhaar_document ? 'border-red-500' : 'border-slate-200'
                    }`}>
                      {formData.aadhaar_document ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-5 h-5" />
                            <span>Uploaded</span>
                          </div>
                          <Button 
                            type="button"
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleChange("aadhaar_document", "")}
                          >
                            <X className="w-4 h-4 mr-1" /> Remove
                          </Button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], "aadhaar_document")}
                          />
                          {uploadingDoc === "aadhaar_document" ? (
                            <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                              <span className="text-slate-500">Click to upload</span>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                    {errors.aadhaar_document && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.aadhaar_document}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>PAN Document *</Label>
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center hover:border-indigo-400 transition-colors ${
                      errors.pan_document ? 'border-red-500' : 'border-slate-200'
                    }`}>
                      {formData.pan_document ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-5 h-5" />
                            <span>Uploaded</span>
                          </div>
                          <Button 
                            type="button"
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleChange("pan_document", "")}
                          >
                            <X className="w-4 h-4 mr-1" /> Remove
                          </Button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], "pan_document")}
                          />
                          {uploadingDoc === "pan_document" ? (
                            <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                              <span className="text-slate-500">Click to upload</span>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                    {errors.pan_document && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.pan_document}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Education Certificates * (Maximum 2 files)</Label>
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center hover:border-indigo-400 transition-colors ${
                    errors.education_certificates ? 'border-red-500' : 'border-slate-200'
                  }`}>
                    {formData.education_certificates.length < 2 ? (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          multiple
                          onChange={(e) => {
                            if (e.target.files.length > 0) {
                              const remainingSlots = 2 - formData.education_certificates.length;
                              const filesToUpload = Array.from(e.target.files).slice(0, remainingSlots);
                              handleMultipleFileUpload(filesToUpload, "education_certificates");
                            }
                          }}
                        />
                        {uploadingDoc === "education_certificates" ? (
                          <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                            <span className="text-slate-500">Click to upload (Max 2 files)</span>
                            <p className="text-xs text-slate-400 mt-1">
                              {formData.education_certificates.length}/2 uploaded
                            </p>
                          </>
                        )}
                      </label>
                    ) : (
                      <div className="text-green-600">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                        <span>Maximum files uploaded (2/2)</span>
                      </div>
                    )}
                    {formData.education_certificates.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="flex flex-wrap gap-2 justify-center">
                          {formData.education_certificates.map((cert, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg">
                              <span className="text-sm">Certificate {idx + 1}</span>
                              <Button 
                                type="button"
                                size="sm" 
                                variant="ghost" 
                                className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  const newCerts = formData.education_certificates.filter((_, i) => i !== idx);
                                  handleChange("education_certificates", newCerts);
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {errors.education_certificates && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.education_certificates}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Profile Photo *</Label>
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center hover:border-indigo-400 transition-colors ${
                    errors.profile_photo ? 'border-red-500' : 'border-slate-200'
                  }`}>
                    {formData.profile_photo ? (
                      <div className="flex flex-col items-center gap-2">
                        <img src={formData.profile_photo} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
                        <span className="text-green-600">Uploaded</span>
                        <Button 
                          type="button"
                          size="sm" 
                          variant="outline" 
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleChange("profile_photo", "")}
                        >
                          <X className="w-4 h-4 mr-1" /> Remove
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept=".jpg,.jpeg,.png"
                          onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], "profile_photo")}
                        />
                        {uploadingDoc === "profile_photo" ? (
                          <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                            <span className="text-slate-500">Click to upload photo</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                  {errors.profile_photo && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errors.profile_photo}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Bank Details */}
                            {step === 3 && (
                              <div className="space-y-6">
                                <div className="text-center mb-6">
                                  <h3 className="text-xl font-semibold text-slate-800">Bank Details</h3>
                                  <p className="text-slate-500">Enter your bank account information for salary credit</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <InputWithError 
                                    label="Account Holder Name" 
                                    field="account_holder_name" 
                                    value={formData.account_holder_name} 
                                    onChange={(e) => handleChange("account_holder_name", e.target.value)} 
                                    error={errors.account_holder_name} 
                                    placeholder="Name as per bank account" 
                                  />
                                  <InputWithError 
                                    label="Bank Name" 
                                    field="bank_name" 
                                    value={formData.bank_name} 
                                    onChange={(e) => handleChange("bank_name", e.target.value)} 
                                    error={errors.bank_name} 
                                    placeholder="e.g., State Bank of India" 
                                  />
                                  <InputWithError 
                                    label="Account Number" 
                                    field="bank_account_number" 
                                    value={formData.bank_account_number} 
                                    onChange={(e) => handleChange("bank_account_number", e.target.value.replace(/\D/g, ''))} 
                                    error={errors.bank_account_number} 
                                    placeholder="Enter account number" 
                                  />
                                  <InputWithError 
                                    label="IFSC Code" 
                                    field="bank_ifsc" 
                                    value={formData.bank_ifsc} 
                                    onChange={(e) => handleChange("bank_ifsc", e.target.value.toUpperCase().slice(0, 11))} 
                                    error={errors.bank_ifsc} 
                                    placeholder="e.g., SBIN0001234" 
                                    maxLength={11}
                                  />
                                  <InputWithError 
                                    label="Branch Name (Optional)" 
                                    field="bank_branch" 
                                    value={formData.bank_branch} 
                                    onChange={(e) => handleChange("bank_branch", e.target.value)} 
                                    error={errors.bank_branch} 
                                    placeholder="Branch name" 
                                  />
                                </div>

                                <div className="bg-blue-50 rounded-xl p-4 mt-4">
                                  <p className="text-sm text-blue-700">
                                    <strong>Note:</strong> Please ensure your bank details are accurate. Salary will be credited to this account.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex justify-between mt-10 pt-6 border-t border-slate-100">
                              <Button
                                variant="outline"
                                onClick={() => setStep(step - 1)}
                                disabled={step === 1}
                                className="px-8"
                              >
                                Previous
                              </Button>

                              {step < 3 ? (
                                <Button
                                  onClick={handleNext}
                                  disabled={checkingDuplicate}
                                  className="px-8 bg-indigo-600 hover:bg-indigo-700"
                                >
                                  {checkingDuplicate ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Checking...
                                    </>
                                  ) : (
                                    "Next"
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  onClick={handleSubmit}
                                  disabled={loading}
                                  className="px-8 bg-indigo-600 hover:bg-indigo-700"
                                >
                                  {loading ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Submitting...
                                    </>
                                  ) : (
                                    "Complete Registration"
                                  )}
                                </Button>
                              )}
                            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}